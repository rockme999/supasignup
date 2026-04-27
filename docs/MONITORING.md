# 번개가입 운영 모니터링 가이드

> 배포 직후·사고 의심·정기 점검 시 어떤 쿼리를 어떤 순서로 실행할지 정리한 실무 가이드.
> 모든 스크립트는 `scripts/monitoring/` 에 위치하며 wrangler D1 원격 쿼리를 사용한다.

---

## 목차

1. [환경 준비](#1-환경-준비)
2. [배포 직후 체크리스트](#2-배포-직후-체크리스트)
3. [사고 의심 시 대응 순서](#3-사고-의심-시-대응-순서)
4. [정기 점검](#4-정기-점검)
5. [스크립트 레퍼런스](#5-스크립트-레퍼런스)
6. [/health 엔드포인트](#6-health-엔드포인트)
7. [임계 수치 가이드](#7-임계-수치-가이드)
8. [수동 D1 쿼리 예시](#8-수동-d1-쿼리-예시)

---

## 1. 환경 준비

모든 스크립트는 `workers/api` 디렉토리를 기준으로 `npx wrangler d1 execute` 를 호출한다.
실행 전 wrangler 인증이 되어 있어야 한다.

```bash
# wrangler 인증 확인
cd workers/api
npx wrangler whoami

# 인증 필요 시
npx wrangler login
```

스크립트 실행 위치는 어디서나 가능하다 (내부적으로 `cd "$(dirname "$0")/../../workers/api"` 처리됨).

```bash
# 예: 프로젝트 루트에서 실행
./scripts/monitoring/recent-errors.sh
./scripts/monitoring/recent-errors.sh 3 staging
```

---

## 2. 배포 직후 체크리스트

배포 완료 후 **5~30분** 이내에 아래 순서로 확인한다.
`deploy.sh` 의 헬스체크(90초)가 통과했더라도 DB 레벨 이상은 별도 확인이 필요하다.

### 2-1. 헬스 엔드포인트 직접 확인 (배포 즉시)

```bash
# 프로덕션
curl -s https://bg.suparain.kr/health | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{ const j=JSON.parse(d); console.log(JSON.stringify(j,null,2)); });
"

# 스테이징
curl -s https://bg-dev.suparain.kr/health | node -e "
  let d=''; process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{ const j=JSON.parse(d); console.log(JSON.stringify(j,null,2)); });
"
```

정상 응답 예시:
```json
{
  "ok": true,
  "env": "production",
  "commit": "b2c3bb6",
  "checks": {
    "db":  { "ok": true, "ms": 3 },
    "kv":  { "ok": true, "ms": 12 },
    "r2":  { "ok": true, "ms": 45 }
  },
  "checked_at": "2026-04-27T09:55:32Z"
}
```

- `ok: false` 이거나 HTTP 503 이면 즉시 롤백 검토
- `checks.db.ms` 가 500ms 이상이면 D1 슬로우 쿼리 의심
- `checks.r2.ms` 가 2000ms 이상이면 R2 네트워크 이상 의심

### 2-2. 배포 직후 에러 모니터링 (배포 후 5~15분)

```bash
# 최근 1시간 에러 (배포 시점 포함)
./scripts/monitoring/recent-errors.sh 1

# 웹훅 실패 확인
./scripts/monitoring/webhook-failures.sh 1
```

### 2-3. 트래픽 정상 확인 (배포 후 10~30분)

```bash
# 최근 1시간 트래픽 (배포 전후 트래픽이 정상인지)
./scripts/monitoring/latest-events.sh 1
```

- `oauth_start` 가 배포 전과 비슷하면 정상
- `signup_complete` 전환율이 50% 이상이면 정상
- 이벤트가 완전히 없으면 트래픽 자체가 없는 시간대일 수 있음 (자정 전후)

### 2-4. 마이그레이션 동반 배포 시 추가 확인

```bash
# shop 상태 변경 이상 없는지
./scripts/monitoring/shop-state-changes.sh 2
```

---

## 3. 사고 의심 시 대응 순서

사용자 신고, Cloudflare 알림, 또는 이상한 느낌이 들 때 아래 순서로 진행한다.

### Step 1: 헬스 상태 즉시 확인

```bash
curl -fs https://bg.suparain.kr/health && echo "OK" || echo "FAIL (503 or unreachable)"
```

HTTP 503이거나 `ok: false` 이면 → **즉시 롤백** 후 원인 분석.
롤백 방법은 `docs/ROLLBACK.md` 참고.

### Step 2: 에러 범위 파악

```bash
# 최근 3시간 에러 집중 확인
./scripts/monitoring/recent-errors.sh 3

# 웹훅 관련 사고인지 확인
./scripts/monitoring/webhook-failures.sh 3
```

- `audit_logs` 에러가 급증했으면 → 특정 기능 이상
- `webhook_events.action = 'auth_failed'` 급증 → API 키 변경 또는 카페24 사양 변경
- `webhook_events.action = 'error'` 급증 → 웹훅 처리 로직 버그

### Step 3: 영향 범위 확인

```bash
# 어느 쇼핑몰이 영향받는지
./scripts/monitoring/shop-state-changes.sh 6

# 트래픽이 급감했는지
./scripts/monitoring/latest-events.sh 3
```

### Step 4: AI 관련 사고 가능성

```bash
# AI 장애 또는 quota 초과 확인
./scripts/monitoring/ai-failures.sh 6
```

- `ai_error` 가 집중되면 Cloudflare Workers AI 대시보드 확인
- `validation_failed` 가 많으면 응답 파싱 로직 이상

### Step 5: wrangler 실시간 로그

```bash
cd workers/api

# 프로덕션 실시간 로그
npx wrangler tail

# 스테이징
npx wrangler tail --env dev
```

---

## 4. 정기 점검

### 일간 점검 (매일 아침)

```bash
# 어제 하루 에러
./scripts/monitoring/recent-errors.sh 24

# 어제 웹훅 실패
./scripts/monitoring/webhook-failures.sh 24

# 어제 AI 실패
./scripts/monitoring/ai-failures.sh 24

# 어제 트래픽 요약
./scripts/monitoring/latest-events.sh 24
```

### 주간 점검 (월요일)

```bash
# 지난 7일 shop 변동 (신규/탈퇴/업그레이드)
./scripts/monitoring/shop-state-changes.sh 168

# 지난 7일 AI 실패 패턴
./scripts/monitoring/ai-failures.sh 168

# 지난 7일 웹훅 실패
./scripts/monitoring/webhook-failures.sh 168
```

주간 점검에서 확인할 사항:
- 탈퇴 수가 신규 등록 수보다 많으면 이탈 원인 분석
- `ai_error` 실패율이 5% 이상이면 AI 서비스 안정성 검토
- `auth_failed` 웹훅이 꾸준히 발생하면 HMAC 키 점검

---

## 5. 스크립트 레퍼런스

### recent-errors.sh — audit_logs 에러 조회

```
Usage: ./recent-errors.sh [hours=1] [env=production]
```

| 인자 | 기본값 | 설명 |
|------|--------|------|
| hours | 1 | 최근 N시간 |
| env | production | `production` 또는 `staging` |

출력:
- 에러 카운트 (5건 이상이면 경고)
- 최신 10건 (action, actor_id, detail 포함)

조회 대상: `audit_logs.action LIKE '%error%'` 또는 `LIKE '%fail%'`, `detail LIKE '%error%'`

```bash
./scripts/monitoring/recent-errors.sh          # 최근 1시간, production
./scripts/monitoring/recent-errors.sh 6        # 최근 6시간, production
./scripts/monitoring/recent-errors.sh 3 staging  # 최근 3시간, staging
```

---

### webhook-failures.sh — webhook_events 실패 조회

```
Usage: ./webhook-failures.sh [hours=1] [env=production]
```

출력:
- `auth_failed` / `invalid_json` / `error` 카운트 (3건 이상이면 경고)
- `shop_not_found` 는 별도 표시 (이미 탈퇴한 쇼핑몰의 웹훅은 정상)
- 실패 최신 10건

```bash
./scripts/monitoring/webhook-failures.sh          # 최근 1시간
./scripts/monitoring/webhook-failures.sh 24       # 최근 24시간
./scripts/monitoring/webhook-failures.sh 12 staging
```

---

### shop-state-changes.sh — shops 변경 추적

```
Usage: ./shop-state-changes.sh [hours=24] [env=production]
```

출력:
- 최근 업데이트된 shop 목록 (plan, deleted_at 포함)
- 탈퇴(deleted_at 변경) 건수
- plan 분포 (전체 현황)
- 신규 등록 shops

```bash
./scripts/monitoring/shop-state-changes.sh           # 최근 24시간
./scripts/monitoring/shop-state-changes.sh 6         # 최근 6시간
./scripts/monitoring/shop-state-changes.sh 168       # 최근 7일
```

---

### ai-failures.sh — AI 자동답변 실패 조회

```
Usage: ./ai-failures.sh [hours=24] [env=production]
```

출력:
- reason별 실패 카운트
  - `inquiry_not_found`: 문의 조회 실패 (데이터 정합성 이상)
  - `shop_not_found`: 쇼핑몰 조회 실패
  - `ai_error`: AI 서비스 장애 또는 quota 초과 (3건 이상이면 경고)
  - `validation_failed`: AI 응답 파싱/검증 실패
  - `held_for_review`: 자동답변 보류 (정상 케이스)
  - `unexpected_error`: 예상 밖 오류
- `ai_error` 최신 5건 (detail 포함)

```bash
./scripts/monitoring/ai-failures.sh           # 최근 24시간
./scripts/monitoring/ai-failures.sh 48        # 최근 48시간
```

---

### latest-events.sh — funnel_events 트래픽 조회

```
Usage: ./latest-events.sh [hours=1] [env=production]
```

출력:
- event_type별 카운트 (13종)
- 핵심 전환 지표: `oauth_start` → `signup_complete` 전환율
  - 전환율 50% 미만이면 경고 (단, 건수 10건 이상일 때만 의미 있음)
- shop별 상위 5개 트래픽 (트래픽 집중 감지)

event_type 13종:
- `page_view`: 위젯 페이지 진입
- `oauth_start`: OAuth 인증 시작
- `signup_complete`: 가입/로그인 완료
- `banner_show` / `banner_click`: 미니배너 노출/클릭
- `popup_show` / `popup_close` / `popup_signup`: 이탈 팝업
- `escalation_show` / `escalation_click`: 에스컬레이션 배너
- `kakao_channel_show` / `kakao_channel_click`: 카카오 채널
- (그 외 신규 추가 가능)

```bash
./scripts/monitoring/latest-events.sh          # 최근 1시간
./scripts/monitoring/latest-events.sh 3        # 최근 3시간
./scripts/monitoring/latest-events.sh 24       # 하루 요약
```

---

## 6. /health 엔드포인트

`https://bg.suparain.kr/health` (프로덕션) / `https://bg-dev.suparain.kr/health` (스테이징)

### 응답 형식

```json
{
  "ok": true,
  "env": "production",
  "commit": "b2c3bb6",
  "checks": {
    "db":  { "ok": true, "ms": 3 },
    "kv":  { "ok": true, "ms": 12 },
    "r2":  { "ok": true, "ms": 45 }
  },
  "checked_at": "2026-04-27T09:55:32Z"
}
```

### 체크 항목

| 항목 | 방법 | 실패 조건 |
|------|------|----------|
| `db` | `SELECT 1` | 쿼리 오류 또는 5초 타임아웃 |
| `kv` | `KV.get('__healthcheck')` | 오류 또는 5초 타임아웃 (값 null은 OK) |
| `r2` | `R2.head('__healthcheck')` | 오류 또는 5초 타임아웃 (객체 없음 404는 OK) |

### HTTP 상태 코드

- **200**: 모든 체크 통과
- **503**: 한 개 이상 실패

`deploy.sh` 의 헬스체크 폴링은 `curl -fsS` 로 200/non-200만 판단하므로 503 반환 시 자동으로 실패 감지된다.

### commit 값 우선순위

배포 시 `wrangler --var COMMIT_SHA:xxx` 로 주입된 값을 우선 사용하고,
`unknown` 이거나 없으면 `src/data/build-info.ts` 의 `BUILD_COMMIT_SHA` 를 fallback으로 사용한다.
로컬 `wrangler dev` 환경에서는 `'unknown'` 또는 마지막 빌드 시의 해시가 표시된다.

---

## 7. 임계 수치 가이드

### 즉시 대응 (사고 수준)

| 지표 | 임계값 | 의심 원인 |
|------|--------|----------|
| `/health` HTTP 503 | 1회라도 | DB/KV/R2 중 하나 이상 장애 |
| `audit_logs` 에러 | 시간당 10건 이상 | 특정 기능 버그 또는 DB 이상 |
| `webhook_events.auth_failed` | 시간당 5건 이상 | API 키 변경 또는 플랫폼 사양 변경 |
| `ai_auto_reply_failures.ai_error` | 시간당 3건 이상 | AI 서비스 장애 또는 quota 초과 |
| `signup_complete` 전환율 | 30% 이하 (10건+ 기준) | OAuth 흐름 이상 |

### 주의 관찰 (이상 징후)

| 지표 | 임계값 | 의심 원인 |
|------|--------|----------|
| `audit_logs` 에러 | 시간당 5건 이상 | 특정 사용자 또는 기능 이상 |
| `webhook_events.auth_failed` | 시간당 3건 이상 | 특정 쇼핑몰 키 변경 |
| `signup_complete` 전환율 | 50% 이하 (10건+ 기준) | 프로바이더 일부 이상 |
| shops 탈퇴 | 하루 3개 이상 | UX 이슈 또는 서비스 문제 |
| `/health checks.db.ms` | 500ms 이상 | D1 슬로우 쿼리 |

### 정상 범위 참고

- `shop_not_found` 웹훅: 건수와 무관하게 정상 (이미 탈퇴한 쇼핑몰의 플랫폼 웹훅)
- `ai_auto_reply_failures.held_for_review`: 정상 (리뷰 보류 정책에 의한 것)
- 자정~오전 6시 사이 트래픽 급감: 정상 (쇼핑몰 야간 트래픽 특성)

---

## 8. 수동 D1 쿼리 예시

스크립트로 커버되지 않는 경우 직접 쿼리할 수 있다.

```bash
cd workers/api

# 프로덕션 직접 쿼리
npx wrangler d1 execute bg-production --remote --command "SELECT ..."

# 스테이징 직접 쿼리
npx wrangler d1 execute bg-dev --env dev --remote --command "SELECT ..."
```

### 자주 쓰는 쿼리 모음

```sql
-- 특정 쇼핑몰의 최근 로그인 이력
SELECT * FROM login_stats
WHERE shop_id = 'SHOP_ID'
ORDER BY created_at DESC
LIMIT 20;

-- 특정 문의의 AI 답변 실패 이력
SELECT * FROM ai_auto_reply_failures
WHERE inquiry_id = 'INQUIRY_ID'
ORDER BY created_at DESC;

-- 특정 기간 신규 가입자 수
SELECT DATE(created_at) AS date, COUNT(*) AS count
FROM login_stats
WHERE action = 'signup'
  AND created_at >= datetime('now', '-7 days')
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- 프로바이더별 가입 분포
SELECT provider, COUNT(*) AS count
FROM login_stats
WHERE action = 'signup'
  AND created_at >= datetime('now', '-30 days')
GROUP BY provider
ORDER BY count DESC;

-- 특정 mall_id 웹훅 이력
SELECT event_no, action, auth_valid, note, created_at
FROM webhook_events
WHERE mall_id = 'MALL_ID'
ORDER BY created_at DESC
LIMIT 20;

-- AI 자동답변 성공률 (최근 7일)
SELECT
  COUNT(*) AS total,
  SUM(CASE WHEN status = 'auto_replied' THEN 1 ELSE 0 END) AS auto_replied,
  ROUND(SUM(CASE WHEN status = 'auto_replied' THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) AS rate
FROM inquiries
WHERE created_at >= datetime('now', '-7 days');

-- 현재 활성 Plus 구독 목록
SELECT s.shop_id, s.mall_id, s.plan, sub.expires_at
FROM shops s
JOIN subscriptions sub ON sub.shop_id = s.shop_id
WHERE s.plan = 'plus'
  AND sub.status = 'active'
  AND s.deleted_at IS NULL
ORDER BY sub.expires_at ASC;
```

---

*최초 작성: 2026-04-27*
*관련 문서: docs/DEPLOYMENT.md, docs/ROLLBACK.md*
