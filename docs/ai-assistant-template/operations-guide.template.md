# {{서비스명}} AI 자동 문의 답변 — 운영 가이드 (템플릿)

> **대상**: {{운영사}} 운영자가 일상 운영하며 참고하는 문서
> **개발자용 플레이북은 `reference/auto-inquiry-reply-playbook.md` 참조**

버전: v1.0 ({{YYYY-MM-DD}})
연관 프롬프트 버전: {{PROMPT_VERSION}}

---

## 1. 자동답변 토글 On/Off 절차

### 현재 상태 확인
- 관리자 페이지 `/{{관리자경로}}/inquiries` 하단의 **AI 자동답변 (전역)** 카드에서 ON/OFF 확인
- 상태 요약: `pending N건 / auto_replied M건` 이 토글 박스 하단에 표시

### 켤 때
1. 토글 클릭 → confirm 대화 → 승인
2. **충분한 테스트 후에만** 켤 것
3. `PUT /api/{{관리자경로}}/settings/auto-reply` 호출 + 감사 로그 기록

### 끌 때
- 토글 다시 클릭 (확인 없이 즉시 OFF)
- 이후 들어오는 문의는 모두 `pending` 유지

### 변경 이력 확인
`audit_logs` 테이블에서 `action='toggle_global_auto_reply'` 로 검색

---

## 2. 뱃지 해석표

관리자 문의 관리 페이지 목록에서 각 문의 옆에 표시되는 뱃지.

| 뱃지 | 조건 | 의미 | 처리 우선순위 |
|---|---|---|:---:|
| 🔴 **AI 답변 미검수** | `status='auto_replied'` + `admin_read_at=NULL` | AI가 자동 발송한 답변을 {{운영사}} 관리자가 아직 검수 안 함 | **최우선** |
| 🟠 미확인 | `status='replied'` + `admin_read_at=NULL` | 수동 답변인데 관리자가 아직 확인 안 함 (다른 사람이 답변한 경우) | 높음 |
| 👁 쇼핑몰 미열람 / 고객 미열람 | `reply`존재 + `customer_read_at=NULL` | 답변이 달렸는데 고객이 아직 안 봤음 | 낮음 (재알림 검토) |
| (없음) | 전부 확인 완료 | 정상 완료 상태 | — |

우선순위 규칙: **상위 조건이 매칭되면 하위 뱃지는 무시**. 예) auto_replied + admin 미검수 → 🔴 만 표시.

---

## 3. 실패 이력 해석 (`ai_auto_reply_failures`)

문의 상세 모달의 "AI 자동답변 실패 이력" 섹션.

| reason 코드 | 의미 | 재시도 | 운영 조치 |
|---|---|:---:|---|
| `ai_error` | AI 모델 호출 실패·타임아웃 | ✅ 1회 자동 | 반복 시 Cloudflare AI 상태 확인 |
| `validation_failed` | 생성 답변이 금지 토큰·길이·서명 규칙 위반 | ✅ 1회 자동 | `detail` 필드의 실패 사유 확인, 빈도 높으면 프롬프트·validateReply 튜닝 |
| `held_for_review` | 리스크 키워드 포함 → 자동 발송 중단 | ❌ | 의도된 동작. 해당 문의는 수동 답변 |
| `inquiry_not_found` | 문의가 이미 처리됐거나 삭제됨 | ❌ | 정상 동작 |
| `shop_not_found` | 쇼핑몰 조회 실패 | ❌ | DB 정합성 확인 |
| `unexpected_error` | 예상치 못한 예외 | ❌ | Cloudflare Worker 로그 확인 |

---

## 4. "AI 답변 미검수" 문의 검수 플로우

하루 1~2회 관리자 목록 열어서 **🔴 AI 답변 미검수** 뱃지 있는 문의를 검수:

1. 목록에서 🔴 뱃지 클릭 → 모달 열림
2. 기존 답변(초록색 박스, 마크다운 렌더) 읽기
3. 답변 하단의 **🤖 AI 자동 답변** 디스클레이머 확인 (고객에게도 같은 문구 보임)
4. 답변에 이상 있음 → "답변 수정" 버튼 → 수정 후 "답변 수정 저장"
   - 이 경우 `status` 가 `auto_replied` → `replied` 로 다운그레이드 (운영자 수정본으로 간주)
5. 답변이 적절하면 → 모달 닫기 (자동으로 `admin_read_at` 기록 → 뱃지 사라짐)

---

## 5. 수동 답변 초안 생성 팁

토글 OFF 상태에서 운영자가 수동으로 답변할 때:

1. 문의 클릭 → 답변 textarea 옆 **⚡ AI 답변 초안 생성** 버튼
2. 확인 대화 → 30~60초 대기 (첫 호출은 더 오래 걸릴 수 있음)
3. textarea에 초안 자동 삽입 → 검토·수정 → "답변 등록"
4. 일일 한도 **20회** (KV: `rl:reply-draft:YYYY-MM-DD`). 초과 시 429 + 자정(UTC) 리셋

**팁**:
- 기존 textarea에 내용이 있으면 "덮어쓰기" confirm 대화가 뜸
- 초안이 이상하면 문의 내용을 좀 더 구체화해 달라고 고객에게 회신하거나 직접 수정

---

## 6. 문제 상황별 조치

### 상황 A — 자동답변 토글 켰는데 계속 `pending` 상태
체크:
1. `app_settings.ai_auto_reply_global = '1'` 확인 (SELECT)
2. Cloudflare Worker 실시간 로그 (`npx wrangler tail`) 에 `[auto-reply]` 라인 있는지
3. 실패 이력 섹션에 `ai_error` 가 많으면 → 다음 상황 B

### 상황 B — `ai_error` 빈발
- Cloudflare Workers AI 상태 페이지 확인
- 모델 fallback 동작 여부 확인 (`@cf/{{primary}}` → `@cf/{{fallback}}`)
- CPU/지연 한도 초과라면 프롬프트 크기 축소 검토

### 상황 C — 고객이 답변 못 봤다 문의 (👁 쇼핑몰 미열람 오래됨)
- 대시보드 접속 여부 확인
- 필요 시 이메일/카톡 등 별도 채널로 알림

### 상황 D — AI 답변에 "타사 쇼핑몰 서비스" 등 잘못된 정보
- `kb-public.md` 에 해당 정보 부재 or 잘못됨
- 수정 → `npm run build:ai-context` 재빌드 → 배포
- PROMPT_VERSION 증가

### 상황 E — 비용 급증
- Cloudflare 대시보드 > Workers & Pages > AI > Usage 에서 일별 neurons 확인
- 월 예상 비용 대비 초과 중이면 원인 조사 (Bot 공격·중복 호출·프롬프트 늘어남 등)

---

## 7. 월 비용 모니터링

| 지표 | 조회 위치 | 정상 범위 ({{서비스}} 기준) |
|---|---|---|
| 일별 neurons 사용 | CF > Workers & Pages > AI > Usage | TODO — 벤치 기준 |
| 월 누적 비용 | CF > Billing > Current usage | TODO — 예상치 |
| 자동답변 호출 수 | `SELECT COUNT(*) FROM inquiries WHERE status='auto_replied' ...` | TODO |
| 실패 비율 | `SELECT COUNT(*) FROM ai_auto_reply_failures WHERE created_at >= ...` | 전체 호출의 5% 미만 |

---

## 8. 프롬프트 버전 관리

### 언제 버전 올리나
- `kb-public.md` 내용 변경 (기능 추가/제거)
- `validateReply` / `shouldHoldForReview` 키워드 변경
- 답변 톤 조정
- 모델 교체 (Kimi K2.5 → K2.6 등)

### 절차
1. `workers/api/src/routes/ai.ts` 의 `PROMPT_VERSION = 'v1.x-YYYY-MM-DD'` 수정
2. `prompt-kimi-reply.md` 의 "버전" 헤더 업데이트
3. `npm run build:ai-context` (KB 변경이 있으면)
4. 스테이징 배포 → 5건 회귀 테스트
5. 프로덕션 배포
6. 버전별 품질 차이는 `ai_prompt_version` 컬럼으로 주간 분석

---

## 9. 빠른 참조 표

| 작업 | 경로 |
|---|---|
| 자동답변 토글 | `/{{관리자경로}}/inquiries` 하단 카드 |
| 실패 이력 | 문의 상세 모달 하단 |
| 벤치 실행 | `node scripts/bench-via-local-worker.mjs` |
| KB 재빌드 | `npm run build:ai-context` |
| Worker 로그 | `npx wrangler tail` |
| 모델 확인 | `workers/api/src/routes/ai.ts` `AI_MODEL` 상수 |
