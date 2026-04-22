# 번개가입 문서 — 목차

이 폴더는 번개가입(SupaSignup) 프로젝트의 모든 기획·설계·운영 문서를 담고 있습니다.
**루트에는 자주 참조하는 핵심 문서만 두고**, 나머지는 주제별 폴더로 분류했습니다.

---

## 🏠 루트 — 핵심 참조 문서

| 파일 | 설명 |
|---|---|
| [PRD_v2.md](PRD_v2.md) | 제품 요구사항 정의서 (최신) |
| [서비스계획서_v2.md](서비스계획서_v2.md) | 사업 계획서 (최신) |
| [구현계획서_v2.md](구현계획서_v2.md) | 구현 계획서 (최신) |
| [기술스펙_v2.md](기술스펙_v2.md) | 기술 스펙 (최신) |
| [schema.sql](schema.sql) | **DB 스키마 단일 진실 소스** — 테이블/인덱스 변경 시 반드시 먼저 수정 |
| [FAQ.md](FAQ.md) | 운영자 공개 FAQ |
| [개인정보처리방침.md](개인정보처리방침.md) | 법정 공개 문서 |
| [카페24-ScriptTag사용가이드.md](카페24-ScriptTag사용가이드.md) | 위젯 삽입·셀렉터 가이드 (공개) |

---

## 📂 하위 폴더 구조

### `ai-assistant/` — AI 고객지원·자동답변 시스템
Cloudflare Workers AI(Kimi K2.5) 기반 문의 자동 답변 인프라.
- [kb-public.md](ai-assistant/kb-public.md) — LLM 프롬프트용 공개 KB 단일 진실 소스
- [prompt-kimi-reply.md](ai-assistant/prompt-kimi-reply.md) — 시스템 프롬프트 조립 명세
- [doc-audit-report.md](ai-assistant/doc-audit-report.md) — 3-way 교차검증 리포트
- [benchmarks.md](ai-assistant/benchmarks.md) — Kimi 캐시·비용 실측 기록
- [reference/auto-inquiry-reply-playbook.md](ai-assistant/reference/auto-inquiry-reply-playbook.md) — **다른 프로젝트 적용용 재사용 플레이북**

### `promotion/` — 카페24 앱스토어 프로모션
앱스토어 스토리·사용팁·배너·아이콘 콘텐츠 소스.
- `stories/` — 스토리 원고 (메타 + HTML)
- `tips/` — 사용팁 원고
- `images/main/` — 444×320 대표이미지
- `images/screenshots/`, `images/banners/` — 본문 삽입용 이미지

### `cafe24/` — 카페24 플랫폼 연동
카페24 API, 결제, 앱 심사 관련 자료.
- 카페24_API_레퍼런스.md, API_문의.md, 결제연동.md
- 카페24_수집가능_데이터_정리.md (🔒 내부 전용)
- 카페24_앱심사_제출자료.md
- cafe24_appstore_analysis.md, banner_production_guide.md, login_detection.md, scripttag_competitors_analysis.md

### `specs/` — 설계 명세
내부 구현/아키텍처 설계 문서. 경쟁·해커 유출 시 위험 → LLM 프롬프트에 포함 금지.
- 소셜연동_설계.md, 대시보드_재설계_명세.md, 전략_및_MVP.md, V2_계획.md, 카페24_기술검증_명세서.md

### `infra/` — 인프라·보안
Cloudflare·스테이징/프로덕션 구성 및 보안 감사.
- 인프라_스테이징_프로덕션_설계.md, 클라우드플래어.md, security-audit.md

### `analysis/` — 분석·R&D
경쟁·시장·내부 구조 분석 문서.
- 경쟁사_분석.md, dashboard_admin_analysis.md, redirect_uri_analysis.md
- analytics_design.md, refactoring_plan.md, ScriptTag_활용_브레인스토밍.md

### `testing/` — 테스트
- E2E_테스트_체크리스트.md, TEST_CODE_TRACKER.md, 프로덕션_테스트_체크리스트.md

### `assets/` — 이미지·배너·아이콘·HTML 템플릿
- `banners/` — 740×416 카페24 앱스토어 배너 시안 (v2~v8)
- `icons/` — 앱 아이콘 (v2 포함 모든 버전)
- `screenshots/` — 회원정보·관리자 화면 캡쳐
- `templates/` — 카페24 관리자 폼 저장본, 약관 HTML 템플릿

### `external-review/` — 외부 검수/심사 제출자료
각 플랫폼(카카오·네이버·카페24) 심사용 제출 문서 모음.
- 네이버_검수_서비스소개.* (docx/html/pdf/pptx)
- 번개가입 서비스 소개 — 카카오 비즈앱 심사용.pdf
- 카페24 홍보 배너 제작 가이드.pdf
- kakao_service_guide.html

### `notes/` — 자잘한 메모 / 유틸
- setting.md, shortlinker.md, toggleon.md
- generate-docx.mjs — 문서 생성 유틸 스크립트

### `stories/`, `promo-banner/`, `app-screenshot/`, `screenshot/`, `naver/`, `benchmark/`
프로모션 스토리 원본 마크다운, 배너 시안 작업 폴더, 관리자 화면 캡쳐, 네이버 검수 자료 등.

### `archive/`
구버전(v1) PRD·서비스계획서·구현계획서·기술스펙, Apple Auth Key 백업 등.

---

## 📌 문서 작성·관리 원칙

1. **DB 스키마 변경 시** — `schema.sql` 을 먼저 수정하고 마이그레이션 파일 생성
2. **공개 가능 여부** — 운영자·외부에 공개될 수 있는 문서는 루트 또는 `cafe24/·ai-assistant/kb-public.md` 에, 내부 전략·아키텍처·보안은 `specs/·infra/·analysis/` 에 둘 것
3. **민감정보 절대 금지** — 시크릿·토큰·API 키·OAuth client_secret 은 코드/문서에 하드코딩 금지. `.env`, `.dev.vars`, `.secrets` 로 관리
4. **버전 관리** — 큰 문서가 v2로 개정되면 v1은 `archive/` 로 이동
5. **이미지 명명** — 배너는 `banner-{치수}-{버전}.{확장자}`, 아이콘은 `icon-{버전}.{확장자}` 패턴
6. **문서간 링크** — 이 README.md 를 기준으로 상대 경로 사용
