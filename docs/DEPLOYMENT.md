# 배포 매뉴얼 (DEPLOYMENT)

번개가입(SupaSignup) 코드를 스테이징·프로덕션에 안전하게 배포하는 표준 절차.

핵심 원칙:
- **스테이징은 항상 프로덕션 미러로 유지** — 작업 전 main HEAD 동기화
- **프로덕션 직접 개발 금지** — 모든 변경은 스테이징 검증 후
- **마이그레이션 추적 정합성** — 모든 SQL은 `wrangler d1 migrations apply`로 적용 (수동 SQL 금지)
- **모든 배포는 롤백 가능 상태 유지** — `deploy.sh`가 이전 version-id 자동 캡처

---

## 환경 구성

| 구분 | 스테이징 | 프로덕션 |
|---|---|---|
| Worker | `bg-api-dev` | `bg-api` |
| 도메인 | bg-dev.suparain.kr | bg.suparain.kr |
| D1 | `bg-dev` (`d420b951-c93b-4449-8f8c-f86c9f99a2cc`) | `bg-production` (`254438d7-b1b1-45a1-afe1-2c766aba252b`) |
| KV | `d3bc6faec4274bd3bacca408d4bf4277` | `fe38c181822b4729850b53ab839339b5` |
| R2 | `bg-inquiry-attachments-dev` | `bg-inquiry-attachments` |
| Queue | `bg-briefing-queue-dev` | `bg-briefing-queue` |
| Cron | `[]` (계정 한도) | `0 * * * *` (시간마다) |
| 카페24 앱 | 별도 등록 (CAFE24_CLIENT_ID 분리) | 정식 앱 (CAFE24_CLIENT_ID 분리) |

**격리 보장**: `wrangler.toml`의 `[env.dev.*]` 블록이 모든 binding을 환경별로 분리. 코드는 환경 모름 (`env.DB`로만 접근).

---

## 표준 배포 흐름

### 1. 사전 점검

```bash
git status                      # 워킹 트리 깨끗한지
git log --oneline -5            # 최근 commit 확인
./scripts/deploy.sh check       # D1 스키마·마이그레이션·secrets 정합성
```

**`./scripts/deploy.sh check`**가 read-only로 다음 검증:
- 양쪽 환경 마이그레이션 적용 상태
- 양쪽 D1 테이블 목록 일치
- `docs/schema.sql`과 실제 DB 일치
- 양쪽 secrets 목록 일치

이상 발견 시 *반드시* 정정 후 배포.

### 2. CHANGELOG 갱신

배포할 변경사항을 `docs/CHANGELOG.md` `[Unreleased]` 섹션에 기록.
- 운영자 가시 변화는 `docs/PUBLIC_CHANGELOG.md`에도 (운영자 친화 톤)
- 양쪽 다 commit에 포함

### 3. 스테이징 배포

```bash
./scripts/deploy.sh staging
```

자동 수행:
1. 스테이징 마이그레이션 적용 (`wrangler d1 migrations apply bg-dev --env dev --remote`)
2. **이전 version-id 캡처 + 롤백 명령 박스 출력**
3. 빌드 메타데이터 생성 (`build-meta.mjs` + `build-changelog.mjs`)
4. `wrangler deploy --env dev` (commit hash·시각·버전 `--var` 주입)
5. **배포 후 90초 health check** (30초 간격 3회)

### 4. 스테이징 검증

다음 항목 확인 (최소):
- `https://bg-dev.suparain.kr/version` JSON 응답 정상 + commit hash가 의도한 값
- `https://bg-dev.suparain.kr/health` `status: ok`
- 영향 받는 페이지 직접 브라우저 확인 (운영자 / 어드민 양쪽)
- 마이그레이션 추가된 경우: 새 테이블·컬럼이 D1에 정상 반영됐는지 (`./scripts/deploy.sh check`)
- 결제·OAuth 같은 외부 통합이 영향 받는 변경이면: 카페24 dev 앱으로 실제 흐름 테스트

**위젯(`/widget/buttons.js`) 변경이 포함된 경우 추가 점검** — 카페24 ScriptTag URL의 `vs` 파라미터 고정 + endpoint 캐시 결합으로 새 코드가 모바일에 도달 못 하는 함정 있음. 모바일에서 `?bg_debug=1` URL로 접속 + USB inspect 콘솔에서 `[번개가입]` 로그 확인 + Network 탭 "Disable cache" 토글로 강제 fresh 검증 필수. 상세: [widget-staging-to-prod-traps.md](widget-staging-to-prod-traps.md).

검증 OK시 다음 단계. **반드시 검증 후** 프로덕션 배포.

### 5. 프로덕션 배포

```bash
./scripts/deploy.sh production
```

자동 수행:
1. 배포 전 스키마 비교 (불일치 시 중단)
2. **사용자 확인 게이트 (yes/no)** ← 직접 입력 권장
3. D1 백업 시도 (wrangler 4.x에서 deprecated, warn만)
4. 프로덕션 마이그레이션 적용
5. 스키마 재비교
6. **사용자 확인 게이트 (yes/no)** ← 직접 입력 권장
7. 이전 version-id 캡처 + 롤백 명령 박스
8. 빌드 메타데이터 생성
9. `wrangler deploy` (commit hash·시각·버전 주입)
10. 90초 health check

자동 yes 우회:
```bash
printf "yes\nyes\n" | ./scripts/deploy.sh production
```
*비추* — 안전 게이트 약화. 의식적 진행이 필요한 단계임.

### 6. 프로덕션 검증

- `https://bg.suparain.kr/version` 응답에 새 commit hash
- 운영자 시각 + 어드민 시각 양쪽 확인
- audit_logs / webhook_events에 새 에러 row가 없는지 (배포 후 5~30분 모니터링)

---

## `deploy.sh` 모드 요약

| 모드 | 동작 | 위험도 |
|---|---|---|
| `check` | 조회만 (마이그레이션 list / 스키마 비교 / secrets list) | 🟢 변경 0 |
| `staging` | 스테이징 마이그레이션 적용 + Worker 배포 + 90초 health check | 🟡 스테이징 변경 |
| `production` | 스키마 비교 + 백업 + 마이그레이션 + Worker 배포 + 90초 health check (확인 게이트 2회) | 🔴 프로덕션 변경 |
| `full` | check → staging → 검증 대기 → production (확인 게이트 4회) | 🔴 양쪽 변경 |

---

## 마이그레이션 작성 규칙

새 마이그레이션 SQL 파일을 만들 때 반드시 지킬 것:

1. **`IF NOT EXISTS` / `IF NOT COLUMN EXISTS` 가드** — 재실행 안전성
2. **`DROP TABLE` / `RENAME` 같은 파괴적 명령 회피** — 불가피하면 별도 백업 + 별도 commit
3. **`docs/schema.sql` 동시 갱신** — SSOT 원칙
4. **마이그레이션 적용은 `wrangler d1 migrations apply`로만** — 수동 SQL 실행 금지 (`d1_migrations` 메타 추적이 어긋남)
5. 마이그레이션 적용 후 양쪽 환경 `./scripts/deploy.sh check`로 정합성 재확인

---

## 트러블슈팅

### `wrangler d1 backup create` 실패
`Unknown arguments: backup, create` — wrangler 4.x에서 d1 backup API 제거됨.

대안:
- `wrangler d1 export <name> --remote --output backup.sql`
- D1 Time Travel: `wrangler d1 time-travel info <name>` (최근 30일 PITR)
- 정기 백업 cron 자동화 (별도 task)

### `wrangler deploy` "Multiple environments" 경고
`[WARNING] no target environment was specified` — 프로덕션 배포 시 발생. 기능적 정상 (env.DB=bg-production 확인 가능). 향후 `--env=""` 명시 추가 거리.

### 마이그레이션이 "Migrations to be applied"로 보이는데 테이블은 이미 있음
`d1_migrations` 추적 메타데이터 누락. 데이터 변경 없이 메타만 보강:

```sql
INSERT OR IGNORE INTO d1_migrations (id, name, applied_at) VALUES
  (NN, '00NN_xxx.sql', '2026-MM-DD HH:MM:SS');
```

양쪽 환경 모두 동일하게.

### 배포 후 health check 실패
```
✘ [N/3] https://bg.suparain.kr/health 응답 실패
```
deploy.sh가 자동 출력하는 롤백 명령 즉시 실행:
```bash
npx wrangler rollback <이전 version-id>
```
자세한 절차는 `docs/ROLLBACK.md` 참조.

---

## 관련 문서

- `docs/ROLLBACK.md` — 사고 발생 시 롤백 절차
- `docs/CHANGELOG.md` — 개발자용 변경 이력
- `docs/PUBLIC_CHANGELOG.md` — 운영자용 변경 안내
- `docs/schema.sql` — D1 스키마 SSOT
- `scripts/deploy.sh` — 배포 자동화 스크립트
