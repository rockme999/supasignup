# AI 자동 문의 답변 시스템 — 프로젝트 적용 템플릿

> **원본**: 번개가입 (SupaSignup) 프로덕션 적용 v2.0 (2026-04)
> **대상**: 카페24 앱 또는 Cloudflare Workers 기반 SaaS (vudrop, veripack-multi 등)
> **복사해서 쓰시면 됩니다**. 이 `ai-assistant-template/` 폴더를 target 프로젝트의 `docs/` 아래로 통째로 옮긴 뒤 **`ai-assistant/` 로 이름 변경**하고 이 README 지침대로 진행.

---

## 🎯 이 템플릿으로 얻는 것

- 고객 문의에 **Kimi K2.5(또는 다른 LLM)** 가 자동 답변 생성·발송
- 월 $10~15 수준의 저렴한 비용 (번개가입 실측 600건/월 기준 ~16,400원)
- 환각 방지 4중 가드레일 — 잘못된 답변은 자동으로 보류되어 운영자 수동 처리
- 실패 이력 DB 기록 + 1회 재시도
- 고객·관리자 양쪽 조회 추적 (미열람 뱃지)
- 이미지 첨부 지원 (R2)
- 운영자 UI 전체

---

## 📂 파일 구성

```
ai-assistant/
├── README.md                          ← 본 안내 (그대로 유지)
│
├── reference/
│   └── auto-inquiry-reply-playbook.md ← 🔷 범용 플레이북 (그대로 사용)
│                                         Phase 0~11 전체 단계 + 코드 스니펫 포함
│
├── kb-public.template.md              ← 🔶 프로젝트 KB 템플릿 (반드시 작성)
├── prompt-kimi-reply.template.md      ← 🔶 프롬프트 조립 템플릿 (구조 유지 + 내용 채움)
├── operations-guide.template.md       ← 🔶 운영 가이드 템플릿 (운영자용)
├── doc-audit-report.template.md       ← 🟥 3-way 감사 빈 양식
├── benchmarks.template.md             ← 🟥 실측 빈 양식
│
└── code-snippets/                     ← 🔷 바로 복사 가능한 코드
    ├── migrations/
    │   ├── NNNN_ai_auto_reply.sql              (shops.auto_reply_inquiries + inquiries 재생성)
    │   ├── NNNN_inquiry_attachments.sql        (inquiries.attachments)
    │   ├── NNNN_app_settings.sql               (싱글톤 키-밸류)
    │   ├── NNNN_ai_auto_reply_failures.sql     (실패 로그)
    │   └── NNNN_inquiry_read_at.sql            (조회 시각)
    ├── utils/
    │   └── markdown.ts                  (🔷 완전 범용 — 그대로 사용)
    ├── routes/
    │   └── inquiry-attachments.ts       (🔷 Phase 2 첨부 라우트, 거의 범용)
    └── scripts/
        ├── build-ai-context.mjs         (KB/FAQ → ai-context/*.ts 자동 생성)
        └── bench-via-local-worker.mjs   (캐시·비용 실측 — endpoint만 수정)
```

### 🟦 색상 표시 규칙

- 🔷 **범용** — 그대로 복사해서 사용
- 🔶 **템플릿** — 구조는 유지, 내용을 프로젝트에 맞게 작성
- 🟥 **프로젝트 전용** — 각 프로젝트에서 실행 후 작성 (시작은 빈 양식)

---

## 🚀 Bootstrap 순서 (권장 순)

### 0. 폴더 배치 (5분)

```bash
# 복사
cp -r docs/ai-assistant-template ./docs/ai-assistant

# template 접미사 제거 (선택 — 그대로 둬도 OK)
cd docs/ai-assistant
mv kb-public.template.md        kb-public.md
mv prompt-kimi-reply.template.md prompt-kimi-reply.md
mv operations-guide.template.md operations-guide.md
mv doc-audit-report.template.md doc-audit-report.md
mv benchmarks.template.md       benchmarks.md
```

### 1. KB 정제 (Phase 0) — 0.5~1일

플레이북 **Phase 0** 을 먼저 읽고 이 프로젝트의 공개 KB 를 `kb-public.md` 에 작성. 3-way 교차검증 결과는 `doc-audit-report.md` 에.

- 프로바이더 수·기능·요금제·정책 등 **운영자가 고객에게 안내할 수 있는 수준의 사실**만 기입
- 민감정보(내부 테이블명·시크릿·스키마) **절대 금지**

### 2. 프롬프트 작성 (Phase 1) — 0.5일

`prompt-kimi-reply.md` 의 구조를 유지하면서 서비스 톤·답변 규칙을 정리.

### 3. DB 마이그레이션 (Phase 2·4·5·6·9) — 0.5일

`code-snippets/migrations/NNNN_*.sql` 5개를 **target 프로젝트의 마이그레이션 번호 규칙**에 맞춰 이름 변경 후 적용.

예: 기존 최대가 0013이면 → `0014_ai_auto_reply.sql`, `0015_inquiry_attachments.sql` ...

**순서 중요**: 0021→0022→...→0025 (번호만 바뀌고 순서는 유지).

### 4. 핵심 코드 이식 — 1~2일

플레이북 Phase 1~11 각 섹션을 보면서 `workers/api/src/routes/` 에 코드 추가.

- `routes/ai.ts` — callAI, draftInquiryReply, validateReply, shouldHoldForReview, autoReplyInquiry, logAutoReplyFailure (플레이북 본문에 전체 코드 포함)
- `routes/admin.ts` — 6~7개 관리자 엔드포인트
- `routes/dashboard.ts` — POST /inquiries 에 ctx.waitUntil 트리거
- `routes/inquiry-attachments.ts` — 🔷 **거의 범용이라 그대로 복사**. `c.env.INQUIRY_ATTACHMENTS` R2 binding 이름만 맞추면 끝
- `utils/markdown.ts` — 🔷 **완전 범용, 그대로 복사**

### 5. UI 이식 — 0.5~1일

플레이북 Phase 6 (미열람 뱃지), Phase 8 (디스클레이머), Phase 11 (Danger Zone) 각 섹션의 JSX를 target 프로젝트의 관리자 페이지에 이식.

### 6. ai-context 빌드 (Phase 2) — 10분

`scripts/build-ai-context.mjs` 복사 후 `package.json` 에 스크립트 추가:
```json
"scripts": { "build:ai-context": "node scripts/build-ai-context.mjs" }
```

실행하면 `docs/ai-assistant/*.md` 를 `workers/api/src/ai-context/*.ts` 로 번들. 이후 KB 수정 때마다 재실행.

### 7. 실측 (Phase 7) — 30분

`scripts/bench-via-local-worker.mjs` 복사 → wrangler dev 로 임시 bench 엔드포인트 띄우고 10회 호출 → `benchmarks.md` 에 기록.

자세한 절차는 플레이북 "비용·레이턴시 벤치마크" 섹션 참조.

### 8. 운영 가이드 작성 (Phase 3·4·5·6) — 0.5일

`operations-guide.md` 를 target 프로젝트 운영 환경에 맞춰 작성. 번개가입 원본 사례를 참고로 플레이스홀더를 채우면 됨.

### 9. 스테이징 → 프로덕션 배포

- 스테이징 D1 마이그레이션 → Worker 배포 → 테스트 문의 작성 → auto_replied 확인
- 가드레일 동작 검증 (환각 유도 질문으로 pending 유지 확인)
- 실패 로그 DB 확인
- OK면 프로덕션 D1 마이그레이션 + 배포
- **전역 토글은 한참 OFF 로 유지**. 운영자가 수동 초안 생성 검증 충분히 한 뒤 ON

---

## 🗄 책방(KB) 참조

번개가입 경험에서 추출한 재사용 tip/snippet 들. `kb.sh` 로 검색 가능.

| ID | 종류 | 제목 |
|---|---|---|
| #523 | reference | Cloudflare Workers AI + Kimi K2.5 플레이북 (v2.0) |
| #524 | tip | Kimi K2.5 prompt caching 비용 최적화 |
| #525 | tip | LLM 환각 방지 4중 가드레일 |
| #536 | tip | `ctx.waitUntil` 로 AI 호출을 HTTP 응답과 분리 |
| #537 | tip | SQLite CHECK 제약 변경 불가 — 테이블 재생성 패턴 |
| #538 | tip | Stripe-style Danger Zone UI |
| #539 | snippet | Workers용 경량 마크다운 파서 |
| #540 | tip | LLM 실패 로그 + 1회 재시도 (reason enum) |
| #541 | tip | 고객·관리자 양쪽 미조회 뱃지 3단계 우선순위 |

검색:
```bash
~/.claude/knowledge_base/kb.sh search "auto-reply"
~/.claude/knowledge_base/kb.sh get 523
```

---

## 🔗 원본 구현 참조

번개가입 프로덕션 파일 경로 (이 템플릿의 "어디서 왔나" 참조용):

- `workers/api/src/routes/ai.ts` — 모든 AI 헬퍼 함수
- `workers/api/src/routes/admin.ts` — 관리자 엔드포인트
- `workers/api/src/routes/dashboard.ts` — POST /inquiries 트리거
- `workers/api/src/routes/pages.tsx` — /supadmin/inquiries, /dashboard/inquiries/:id
- `workers/api/src/views/admin.tsx` — AdminInquiriesPage, AdminShopDetailPage, AdminAiReportsPage/DetailPage
- `workers/api/src/views/help.tsx` — InquiryDetailPage (고객용)
- `workers/api/src/views/layout.tsx` — .md-reply CSS + window.bgMdToHtml

막히면 번개가입 저장소 해당 파일을 직접 열어보거나, `@claude` 에게 "번개가입의 이 기능 어떻게 구현했는지 보여줘" 라고 요청.

---

## ⚠️ 반드시 확인할 것 (보안)

- 민감정보(시크릿·DB 스키마·내부 API 경로·OAuth client_secret)는 **절대 kb-public.md 에 넣지 않기**
- `workers/api/src/ai-context/*.ts` 는 빌드 결과물이므로 민감정보 확인 다시
- R2 버킷은 **private** 유지, Worker 프록시 경유로만 접근
- 자동답변 토글은 충분한 테스트 전 절대 ON 금지
- `danger-zone` 정지 조치는 **mall_id 타이핑 확인** 을 꼭 거치도록 유지

---

## 문의·개선 제안

번개가입 팀: help@suparain.com
