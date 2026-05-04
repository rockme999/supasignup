# 변경사항 (Changelog)

번개가입(SupaSignup) 개발자용 변경 이력 — 최신 변경이 위쪽.

---

## [Unreleased]

작업 중인 변경사항.

### ✨ 신규 — AI 주간 브리핑 자동 이메일 발송 (Phase 1)

- **첫 실 운영자 메일 발송 성공** (2026-05-04): 19 활성 쇼핑몰 중 16 eligible → 15 신규 + 1 KV dedup hit + 0 failed
- **인프라**: Cloudflare Email Sending public beta (2026-04-16 출시) 채택. 발송 도메인 `mail.suparain.kr`. 전 Ecount SMTP는 외국 IP에서 535 거부로 우회.
- **From**: `noreply@mail.suparain.kr` / **Reply-To**: `help@suparain.com` (회신 시 Ecount 메일함 도착)
- **자동 cron**: 매주 월요일 09:00 KST `services/scheduled.ts:generateBriefingForShop` 끝의 hook으로 자동 발송. KV `briefing-email-sent:{briefing_id}` 30일 dedup TTL.
- **마이그레이션 0033** — `shops` 6개 컬럼 추가:
  - `store_email`, `store_phone`, `store_admin_name`, `store_synced_at` (카페24 운영자 연락처 sync 캐시)
  - `auto_briefing_email`, `auto_briefing_alimtalk` (발송 토글, 둘 다 기본 ON)
- **운영자 연락처 sync**:
  - 신규 install/reinstall 시 `routes/cafe24.ts` callback에서 `syncStoreContactByMallId` 자동 호출 (백그라운드 waitUntil)
  - 카페24 `/admin/store` API에서 11개 필드 추출 (`packages/cafe24-client` 의 `getStoreContact` 신설)
  - 우선순위: `notification_only_email` > `email` > `customer_service_email`. `@cafe24.auto` 더미 자동 제외
- **이메일 템플릿** (옵션 B 부분 노출): 헤드라인 + 지난주 성과 + 이번 주 전략 첫 1~2 문장 미리보기 + "이어서 보기" CTA. HTML/평문 양쪽 지원
- **어드민 토글 UI**: `/dashboard/ai-briefing` 알림 카드에 이메일 토글 + "발송 이메일" 노출
- **supadmin maintenance endpoint** (production-callable, supadmin 인증):
  - `GET /api/supadmin/maintenance/sync-store-contact?mall_id=<>|all=1` — 백필
  - `GET /api/supadmin/maintenance/resend-recent-briefings?since_hours=N&dry_run=0&confirm=yes` — 재발송 (KV dedup 자동)

### ✨ 신규 — 카톡 채널 친구 추가 흐름 Phase 2 B-1 (스테이징 only)

- **자체 구축, 발송대행사 미사용** — 카카오 알림톡·친구톡 자동 발송은 발송대행사 필수 (정책상 일반 사업자 직접 API 불가)
- **마이그레이션 0034** — `shops` 4개 컬럼: `kakao_channel_added`, `kakao_channel_added_at`, `update_news_email`, `update_news_alimtalk`
- **카카오톡 채널** `@번개가입` (PFID `_aUbxbX`) 비즈채널 심사 진행 중
- **친구 추가 흐름**: `/dashboard/ai-briefing` 알림 카드 + 홈 dismissible 카드. 단순 링크 + "추가 완료" self-report 방식
- **프로덕션 UI 가드**: `KAKAO_CHANNEL_UI_ENABLED='0'` 으로 프로덕션 모든 카톡 UI 숨김. 매핑 X manual broadcast 가치가 약함 → Phase 3 카카오 i 오픈빌더 챗봇 매핑 도입 시 노출 예정

### 🐛 수정

- 어드민 페이지의 plan UI를 0027 마이그레이션 후의 `'free'|'plus'` + `billing_cycle` 분리 구조에 맞춰 정정 (d8ab2bb 백엔드 fix의 프런트엔드 후속). 어드민이 "월간" 선택 후 저장 시 백엔드 validation에서 거부되던 사고 해결. 구독 현황 페이지에 `billing_cycle` 컬럼 추가, `AdminPlanCounts` 타입 명칭 명확화(`cycleMonthly`/`cycleYearly`).
- 어드민 시간 표시 KST 변환 — `inquiry`·`audit_logs`·`ai_briefings`·`shops` 등 D1 datetime을 `.slice(0,16)` 그대로 노출하던 9곳 → `formatKstShort` 헬퍼로 통합 (1707f30, 2026-05-04)
- `/dashboard/session-expired` 페이지에 카페24 로그인 링크 2개 (쇼핑몰 관리자 / 카페24) 추가
- supadmin 쇼핑몰 리스트의 도메인·이메일 컬럼 길이 제한 (max-width + ellipsis + tooltip) — 긴 값으로 레이아웃 무너지던 문제 해결

### 🚮 제거

- 운영자 대시보드 `/dashboard/ai-briefing` 의 "새 브리핑 생성" 버튼 2곳 모두 제거 — AI 비용 통제 + 매주 정기 발송 일관성. 자동 cron 만 사용. (POST `/api/ai/briefing` endpoint는 보존 — supadmin/Phase 3 챗봇용)

### 🔒 보안 / 운영 안전망

- d1_migrations 메타데이터 정합성 복구 — 0021~0027 7개 마이그레이션이 추적 누락된 상태 발견 후 양쪽 환경(스테이징·프로덕션) 메타데이터 보강 (데이터 변경 0)

### 📚 문서

- `docs/CHANGELOG.md` 신설 — 향후 모든 변경사항 누적 기록
- KB #683 (Cloudflare Email Sending API), #684 (Ecount SMTP 외국 IP 차단), #685 (카카오 알림톡 발송대행사 정책) 신설

---

## [2.0.0] — 2026-04-27

카페24 앱 정식 운영 + Plus 가격 정책 전환 + 운영 안정화 메이저 릴리즈.

### 💎 Plus 플랜 — 가격 정책 전환 ⚠️

- Plus 월 **6,900원** / 연 **79,000원** (이전: 월 29,900원 / 연 329,900원)
- Free **무제한 무료 제공** (이전: 월 100명 제한)
- 가격 전략 배경: 무료 경쟁 시장에서 Free 진입 장벽 제거, 부가 기능에서 수익 창출
- **마이그레이션 0027**: `subscriptions.plan='plus'` 고정 + `billing_cycle` 컬럼 분리, `shops.plan` 'free'|'plus' 정규화 (기존 active 유료 고객 데이터 손실 없이 이관)

### ✨ 신기능 — Plus 전용

- 💎 **미니 배너** — 로그인/가입 페이지 상하단 가입 유도 배너 (슬라이드 카드 최대 4종)
- 💎 **이탈 감지 팝업** — PC mouseout / 모바일 scroll-up 트리거, 쿠폰 연동
- 💎 **재방문 비회원 에스컬레이션** — 방문 횟수별 강도 자동 조절 (1~2회 / 3~4회 / 5회 이상)
- 💎 **AI 4종**: 쇼핑몰 정체성 자동 분석 / 주간 AI 브리핑 / 맥락 기반 카피 생성 / 재방문 맞춤 메시지
- 💎 **카카오 채널 자동 친구 추가** — 가입 시 비즈채널 친구 추가 (동의 시)
- 💎 **가입 전환 퍼널 통계** — 노출→클릭→인증→가입→쿠폰 단계별 전환율
- 💎 **"Powered by 번개가입" 브랜딩 제거**

### ✨ 신기능 — 공통

- AI 자동 문의 답변 시스템 (글로벌 + 쇼핑몰별 토글, 실패 1회 재시도)
- 1:1 문의 게시판 + 이미지 첨부 (R2 저장)
- 사용 가이드 / FAQ / 퀵스타트 페이지
- 카페24 공식 SSO 브릿지 패턴 (sso, sso1, sso2 슬롯 자동 매핑)
- 통계 시스템 Phase 1~4 + Plus 전용 상세 분석

### 🚀 개선

- 대시보드 UI 화이트 심플 리뉴얼
- 위젯 디자인 시스템 — 5종 프리셋(컬러/모노톤/테두리/호버채움/아이콘만) + 6슬라이더(너비·높이·간격·둥글기·아이콘 간격·왼쪽 여백) + 9소셜 아이콘 + 정렬·문구 커스텀
- 사이드바 디자인 + 홈/통계 차별화 + 액센트 핫핑크
- 랜딩페이지 순수 소개 페이지로 전환 + 요금제 가격 업데이트
- AI 정체성 분석 자동 트리거 (대시보드 진입 시 백그라운드 실행)

### ⚡ 성능

- `pages.tsx` 8,734줄 → 10개 파일 분리 (Phase 1)
- 공통 유틸 통합 + `funnel_events.visitor_id` 정규화 (Phase 2~3)
- D1 batch API 적용 — `Promise.all` → `db.batch()` (Phase 4)
- `funnel_events` 복합 인덱스 추가 (`shop_id`, `event_type`, `created_at`)
- `login_stats` 3컬럼 복합 인덱스 + 불필요 인덱스 4개 삭제
- AI 브리핑 Queue 기반 분산 처리

### 🔒 보안

- 보안 감사 + 보안 헤더 추가 + 인덱스 최적화 + 타입 정합성 + XSS 수정 (Phase 0)
- `cafe24_members` 테이블 신설 + 에러 메시지 보안 강화
- `/test/*` 라우트 admin 인증 체인 + `mall_id='suparain999'` 기본값 9곳 제거
- admin shop/owner/subscription 변경 4곳에 엣지 캐시 무효화 (KV + `purgeWidgetConfigCache`) — 5분 stale window 제거
- `safeParseJsonArray/Object` 유틸 도입 후 OAuth·위젯 JSON 파싱 경로 일괄 적용
- 위젯 `/event` `page_url`(2KB) / `event_data`(4KB) 크기 제한 + Origin 검증
- OAuth `/callback` 핸들러에서 KV.get 직후 동기 KV.delete로 state/PKCE 재사용 차단
- admin CSV export(`/export/shops`, `/export/stats`)에 `recordAuditLog` 추가
- admin.tsx inquiry JSON 임베드 시 `<` → `<` 치환으로 `</script>` 브레이크아웃 차단
- 모든 카페24 웹훅을 `webhook_events` 테이블에 영구 기록 (마이그레이션 0026) — PII는 저장 전 `[redacted]` 처리, 민감 헤더 mask, 기존 행 12건 소급 redact (PIPA 준수)

### 🐛 수정 (주요 사고 대응)

- **카페24 웹훅 `event_no` 오매핑 사고** — 상품 이벤트(90001/90002)가 앱 라이프사이클로 오인되어 shop 5곳이 free로 잘못 다운그레이드된 사고 수정. `packages/cafe24-client`의 공식 상수(`APP_DELETED=90077`, `APP_EXPIRED=90078`, `MEMBER_JOINED=90032`)로 일원화
- **`/oauth/sso-start` 신설** — first-party 쿠키 리디렉 패턴으로 cross-origin 쿠키 + KV 엣지 캐시 60초 레이스 근본 해결 (Apple 재로그인 강제 사고 대응)
- provider hint 레이스 수정 (이전 클릭 프로바이더 재사용 버그)
- 카페24 앱 만료(90001) 웹훅을 plan 다운그레이드로 변경 (이후 90078로 정정)
- 미니배너 기준 요소 위치 탐색 로직 전면 개선
- 이탈 팝업 기본 문구 한글화 + 오타 수정 ("잠긐만요" → "잠깐만요")
- 로그아웃 자동로그인 버그 + 위젯 CORS 수정
- 관리자 문의 페이지 — 문의 내용 조회 가능하도록 수정
- 다양한 위젯 디자인 버그 (모노톤/outline 프리셋 아이콘 색상, 구글 4색 G 로고 등)

### ⚠️ 주의 (Breaking)

- `subscriptions.plan` 값이 `'plus'`로 고정됨 (이전 `'monthly'`/`'yearly'`는 `billing_cycle` 컬럼으로 분리)
- `shops.plan` CHECK 제약 제거 (D1 FK 제약 회피용 컬럼 교체 부산물). `'free'`|`'plus'` 검증은 `billing.tsx` / `admin.ts` / `dashboard.ts` 애플리케이션 레이어에서 수행

### 📚 문서

- 카페24 앱스토어 배너 시안(v2~v9) + 메인 배너 + 블로그 디자인 통일
- 카페24 EC어드민 로그인 배너(396×120) 가이드 준수 제작
- 홍보 배너 + 스토리 2편 + 사용팁 2편
- AI 활동 보고 시스템 — 일일/주간/월간 보고 체계
- ScriptTag 종합정리 (경쟁사·전략·기술스펙·앱분석 5개 문서 통합)
- ai-assistant-template 폴더 — 다른 프로젝트 적용용 템플릿

---

## [1.0.0] — 2026-03 카페24 앱스토어 첫 출시

번개가입의 첫 정식 출시. 카페24 공식 앱 등록.

### ✨ 신기능

- 소셜 로그인 6종 1클릭 가입 — Google / Kakao / Naver / Apple / Discord / Telegram
- 카페24 공식 앱 등록 + ScriptTag 자동 위젯 주입
- 위젯 디자인 커스터마이징 — 5종 프리셋 + 슬라이더 6종 + 실시간 미리보기
- 기본 통계 — 일별 가입, 프로바이더별 분포
- 가입 쿠폰 자동 발급 (카페24 쿠폰 API 연동)
- 관리자 대시보드 + 운영자 계정 시스템
- 카페24 SSO 브릿지 — 운영자가 카카오/네이버 등 비즈앱 별도 등록 불필요
- 회원 PII AES-GCM 암호화 + 이메일 SHA-256 해시 인덱스
- 위젯 마이페이지 소셜 연동
- 9소셜 SVG 아이콘 + 모노톤 프리셋

---

## 포맷 / 정책 안내

이 문서는 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/) 포맷을 따르며,
프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 채택합니다.

### 카테고리 표준

- ✨ **신기능** (Added) — 새로 추가된 기능
- 🚀 **개선** (Changed) — 기존 기능의 개선·변경
- 🐛 **수정** (Fixed) — 버그 수정
- 💎 **Plus 전용** (Plus) — Plus 플랜 한정 변경
- 🔒 **보안** (Security) — 보안 관련 변경
- ⚡ **성능** (Performance) — 성능 최적화
- ⚠️ **주의** (Breaking) — 호환성 영향이 있는 변경
- 🗑️ **제거** (Removed) — 제거된 기능

### 버저닝 정책 (SemVer)

- **MAJOR** (X.0.0): 사용자 가시 큰 변화 — UI 리뉴얼, 가격 정책, 호환성 영향
- **MINOR** (0.X.0): 신기능 추가, 하위 호환되는 개선
- **PATCH** (0.0.X): 버그 수정, 성능 개선, 문서·자산 갱신

---

[Unreleased]: https://github.com/HappyYuna/supasignup/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/HappyYuna/supasignup/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/HappyYuna/supasignup/releases/tag/v1.0.0
