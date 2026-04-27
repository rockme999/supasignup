# 롤백 / 사고 대응 매뉴얼 (ROLLBACK)

번개가입(SupaSignup)에서 배포 후 사고 발생 시 즉시 복구하는 표준 절차.

핵심 원칙:
- **30초 안에 결정** — 사고 의심 시 망설이지 말고 롤백. 사후 분석은 그 다음.
- **코드 롤백은 안전** — Cloudflare Workers는 이전 version으로 즉시 복귀 가능 (DB 데이터 영향 0).
- **DB 변경이 포함된 사고는 별도 처리** — 코드 롤백만으론 해결 안 됨.
- **모든 사고는 commit + audit_logs / webhook_events에 자동 기록** — 사후 분석용.

---

## 1. 사고 감지 신호

### 즉시 롤백 트리거 (Tier 1)

다음 중 하나라도 발생 시 *즉시* 코드 롤백:
- `deploy.sh` health check 90초 폴링 중 실패 출력 (빨간 박스 + 롤백 명령)
- `https://bg.suparain.kr/health` 5xx 응답 (수동 확인)
- 운영자 / 고객으로부터 "갑자기 로그인 안 됨" / "위젯 안 뜸" 보고
- audit_logs에 ERROR 레벨 row가 분 단위로 급증
- webhook_events에 `auth_failed` 또는 `error` action이 비정상 빈도

### 분석 후 결정 (Tier 2)

다음은 일단 모니터링 + 원인 파악 후 결정:
- 가입률 급감 (마케팅 이슈일 수 있음)
- 특정 소셜 프로바이더만 실패 (외부 OAuth 서비스 장애 가능)
- AI 브리핑 생성 실패 (Cloudflare AI 일시 장애)

---

## 2. 즉시 코드 롤백 (Tier 1)

### 명령 실행

`deploy.sh`가 배포 직전에 출력한 박스에서 *이전 version-id*를 복사:

```
  ────────────────────────────────────────────────────────────
  사고 시 즉시 복구 명령:
    npx wrangler rollback <version-id> [--env dev]
  ────────────────────────────────────────────────────────────
```

명령 실행:
```bash
# 프로덕션
npx wrangler rollback <version-id>

# 스테이징
npx wrangler rollback <version-id> --env dev
```

소요 시간: **30초 이내**. Cloudflare Workers는 이전 version 활성화가 즉시.

### 박스를 못 봤다면

`wrangler deployments list`로 최근 배포 목록 확인 후 *문제 직전* version-id 사용:
```bash
npx wrangler deployments list           # 프로덕션
npx wrangler deployments list --env dev # 스테이징
```

각 배포 entry의 `Version(s):` 줄에 UUID 표기. 시간순 정렬, 최신이 *마지막*.

### 검증

롤백 직후:
```bash
curl -s https://bg.suparain.kr/version
```
- `commit` 필드가 *문제 없던 이전 commit*인지 확인
- `built_at` 시각이 이전 배포 시각인지 확인

`/health` 응답 + 운영 페이지 직접 확인.

---

## 3. DB 영향 시 처리

코드 롤백만으로 *해결되지 않는* 경우:
- 마이그레이션이 적용된 후 DB 스키마가 *새 코드에만* 호환
- 데이터 무결성 손상 (대량 UPDATE / DELETE 같은 파괴적 변경)

### 3-1. 마이그레이션 자체가 문제

**상황**: 새 마이그레이션이 D1에 적용된 후 사고. 코드는 롤백했지만 DB는 *새 스키마*.

**옵션 A — 호환되면 그대로 유지**:
- 새 컬럼이 추가만 됐고 NOT NULL이 아니면, 옛 코드도 정상 동작 (그냥 안 쓰면 됨)
- 마이그레이션이 idempotent하면 다음 배포 시 충돌 없음

**옵션 B — 역방향 마이그레이션 작성**:
- 새 마이그레이션 파일을 만들어 *이전 상태로 되돌리는 SQL*
- 예: `0028_revert_0027.sql`
- `IF NOT EXISTS` 가드 + `docs/schema.sql` 동기 갱신
- 검증 후 양쪽 환경 적용

**옵션 C — D1 Time Travel (최근 30일 한정)**:
```bash
npx wrangler d1 time-travel info bg-production
npx wrangler d1 time-travel restore bg-production --bookmark=<bookmark-id>
```
*매우 강력*하지만 *모든 DB 변경 손실*. 신중히. 사용 전 export로 현재 상태 백업.

### 3-2. 데이터 무결성 손상

**상황**: 코드 버그로 잘못된 UPDATE / DELETE가 광범위 적용됨 (예: 4/22 웹훅 사고로 shop 5곳이 free 다운그레이드된 케이스).

**복구 절차**:

1. **즉시 코드 롤백** (위 2번)
2. **영향 범위 측정** — webhook_events / audit_logs에서 잘못된 변경 row 식별
   ```sql
   SELECT * FROM webhook_events
   WHERE created_at BETWEEN '<사고 시작>' AND '<롤백 시각>'
     AND action IN ('plan_downgraded', 'soft_deleted', ...);
   ```
3. **변경 전 상태 추정** — 백업 / Time Travel / audit_logs로 원래 값 복구
4. **수동 SQL로 복구**:
   ```sql
   UPDATE shops SET plan = 'plus' WHERE shop_id IN (...);
   UPDATE shops SET deleted_at = NULL WHERE shop_id IN (...);
   ```
5. 영향받은 운영자에게 안내 (아래 5번)
6. 사후 분석 + 동일 사고 방지 마이그레이션 / 코드 패치

### 3-3. R2 / KV 영향

R2 / KV는 D1 같은 Time Travel 없음. 정기 백업 필요.
- KV는 휘발성 캐시 위주라 보통 영향 작음 (캐시 무효화로 처리)
- R2 (문의 첨부 등)는 손실 시 사용자 안내 필요

---

## 4. 사후 분석

### 4-1. 자동 기록된 데이터

- **audit_logs** — admin 액션 / 데이터 변경
- **webhook_events** — 모든 카페24 웹훅 (PII redact 처리됨)
- **Cloudflare 콘솔 Analytics** — 요청 수 / 5xx 비율 / latency
- **wrangler tail** — 실시간 로그 (배포 직후 N분간)

### 4-2. 분석 쿼리 예시

```sql
-- 사고 시간대 webhook event_no 분포
SELECT event_no, action, COUNT(*) AS cnt
FROM webhook_events
WHERE created_at BETWEEN '<시작>' AND '<종료>'
GROUP BY event_no, action
ORDER BY cnt DESC;

-- 사고 시간대 audit_logs ERROR
SELECT actor, action, target_type, target_id, created_at, details
FROM audit_logs
WHERE created_at BETWEEN '<시작>' AND '<종료>'
  AND action LIKE '%error%'
ORDER BY created_at;

-- 영향받은 shop 식별
SELECT shop_id, mall_id, plan, deleted_at, updated_at
FROM shops
WHERE updated_at BETWEEN '<시작>' AND '<종료>';
```

### 4-3. 회고 문서화

- `docs/CHANGELOG.md`의 다음 fix commit 본문에 사고 요약 + 대응 내용 기록
- 메모리에 저장 (`feedback_*` 또는 `project_*` 메모리)
- 책방 KB에 troubleshooting 카테고리로 등록 (`kb.sh add troubleshooting`)
- *원인은 자세히, 디테일은 외부 노출 X* (PUBLIC_CHANGELOG에는 "안정성 개선" 정도로만)

---

## 5. 운영자 커뮤니케이션

사고가 *고객에게 가시*했을 경우:

### 즉시 (사고 발생 ~ 30분)
- 1:1 문의 게시판 모니터링 강화 (운영자 보고 가능)
- 카페24 앱스토어 페이지에 점검 안내 (선택)

### 복구 후 24시간 내
- 영향받은 운영자(쇼핑몰)에게 1:1 알림:
  - 무슨 일이 있었나 (운영자 친화 언어)
  - 영향 범위 (어떤 데이터가 어떻게)
  - 복구된 상태 / 자동 복구된 항목
  - 운영자가 확인할 사항
  - 향후 방지 약속

### 차주 PUBLIC_CHANGELOG 갱신
- "🔒 보안 강화" 또는 "🚀 안정성 개선" 정도로 묶음
- 사고 디테일·원인 코드는 노출 X (공격자 단서 차단)

---

## 6. 예방

이 매뉴얼이 *덜 쓰이도록* 하는 인프라:

- **deploy.sh check** — 매 배포 전 의무 (스키마·마이그레이션·secrets 정합성)
- **deploy.sh의 자동 health check** — 배포 후 90초 폴링
- **/version 엔드포인트** — 어느 commit이 돌고 있는지 1초 검증
- **CHANGELOG 갱신 의무** — 변경사항 추적
- **마이그레이션 IF NOT EXISTS 가드** — 재실행 안전성
- **단계적 배포** — 스테이징 검증 후 프로덕션. 절대 직접 프로덕션 X
- **commit 단위 분리** — 사고 시 *어느 commit 때문*인지 git bisect로 추적

---

## 관련 문서

- `docs/DEPLOYMENT.md` — 표준 배포 절차
- `docs/CHANGELOG.md` — 개발자용 변경 이력 (사고 대응 commit 기록)
- `docs/schema.sql` — D1 스키마 SSOT
- `scripts/deploy.sh` — 배포 자동화 + 롤백 자비
