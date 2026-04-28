# 번개가입 공개 문서/대시보드/구현 감사 리포트

> 작성: 2026-04-21 · 대상: FAQ.md · 카페24-ScriptTag사용가이드.md · 개인정보처리방침.md · help.tsx(QuickStart/Guide/Faq) · 실제 구현 코드
> 목적: Kimi 자동 답변 프롬프트용 공개 KB를 만들기 위한 교차검증. 모순·구식·민감 정보 식별.

---

## 1. 3-way 교차검증 요약

| # | 항목 | FAQ.md | help.tsx | 실제 코드/운영 | 결정 |
|---|---|---|---|---|---|
| 1 | **지원 프로바이더** | 6종 + "X·LINE 추가 예정" | 6종 (FaqPage 표), Guide 표에서 Telegram 포함 | DB `user_providers` 실제 가입 = **6종** (Kakao 10 / Naver 10 / Google 6 / Apple 3 / Discord 2 / Telegram 1). Facebook/X/LINE 가입 0 (향후) | **6종 운영 + 3종(LINE/X/Facebook) 향후 지원** 으로 표기 통일 |
| 2 | **디자인 프리셋** | — | Guide "5가지" | **settings.tsx UI = 5종** (기본/모노톤/호버 채움/호버 채움 흑백/아이콘만) | **5종** 확정. 코드 7 key 중 2개(compact·icon-text)는 UI 비노출 |
| 3 | **슬라이더 조절 항목** | — | Guide 8항목 | **settings.tsx UI = 6종** (너비 120–500 / 높이 32–60 / 간격 0–24 / 둥글기 0–30 / 아이콘-텍스트 간격 0–100 / 왼쪽 여백 0–150) | **6종** 확정. Guide의 "8항목"은 정렬·프리셋까지 포함한 카운트 |
| 4 | **버튼 문구 프리셋** | — | Guide 설명 | settings.tsx = 4종 + 직접 입력 | **4종 + 직접 입력** |
| 5 | **정렬** | — | Guide 3종 | 좌/중앙/우 | **3종** |
| 6 | **위젯 삽입 위치** | — | Guide 설명 | before / after / 커스텀 CSS 셀렉터 | **3옵션 + 추천 셀렉터**(`.login__button` / `.login__sns` / `.login__util` / `#member_login_module_id`) |
| 7 | **퀵스타트 단계** | — | **QuickStart 4단계** vs **Guide "1. 시작하기" 5단계** | 동일 흐름 | **4단계**로 통일 (QuickStart 기준) |
| 8 | **Plus 기능 수** | 일부 | Guide 8항목 | 배너·팝업·에스컬레이션·AI 브리핑·AI 정체성·AI 추천 문구·AI 자동적용·쿠폰 3종·카카오 채널 | **Guide 8항목** 기준 유지 |
| 9 | **AI 일일 호출 한도** | identity 10회만 명시 | 없음 | identity **10/일** · briefing **5/일** · escalation-copy **5/일** · copy **10/월** | 전체를 FAQ·Guide에 명시 |
| 10 | **카카오 채널 (Plus)** | 없음 | Guide 있음 | 코드 구현 있음 (Plus 플랜만) | **FAQ에 Q 추가** |
| 11 | **무료 플랜 제약** | 일부 | Guide 일부 | banner/popup/escalation null, kakao_channel 미반환, "powered by 번개가입" 강제 | FAQ에 요약 Q 추가 |

## 2. 공개 불가(프롬프트/KB 제외) 문서 확정

| 파일 | 제외 사유 |
|---|---|
| `docs/카페24_수집가능_데이터_정리.md` | 내부 의사결정 문서. OAuth 스코프·저장 전략·"결정 필요 사항" 포함. 경쟁/규제 감시 활용 위험 |
| `docs/서비스계획서_v*.md`, `docs/PRD_v*.md` | 사업 전략·경쟁 분석 |
| `docs/경쟁사_분석.md`, `docs/전략_및_MVP.md` | 전략 |
| `docs/구현계획서_*.md`, `docs/기술스펙_*.md`, `docs/소셜연동_설계.md` | 내부 아키텍처 |
| `docs/security-audit.md`, `docs/인프라_*.md`, `docs/클라우드플래어.md` | 보안·인프라 토폴로지 |
| `docs/카페24_API_*.md`, `docs/redirect_uri_analysis.md`, `docs/cafe24_login_detection.md` | 내부 구현·분석 |
| `docs/refactoring_plan.md`, `docs/V2_계획.md`, `docs/analytics_design.md`, `docs/대시보드_재설계_명세.md` | 내부 계획 |
| `docs/schema.sql` | DB 스키마 (절대 금지) |
| `.env*`, `.dev.vars`, `.secrets`, `credentials*.json` | 시크릿 (절대 금지) |

## 3. 공개 KB 포함 문서 확정

| 파일 | 공개 근거 |
|---|---|
| `docs/FAQ.md` | 운영자용 FAQ. 민감정보 없음. 단 Q "SSO 설정" 항목은 값 자체가 아닌 "설정 가이드 페이지 링크 참조" 수준으로 추상화 |
| `docs/카페24-ScriptTag사용가이드.md` | 공개 가능한 위젯 기술 명세. 단 line 1014~1133 "활용 아이디어"는 **로드맵 노출 위험** → 프롬프트 주입 시 제외 |
| `docs/개인정보처리방침.md` | 법정 공개 문서 |
| help.tsx `QuickStartPage` / `GuidePage` / `FaqPage` | 운영자에게 이미 노출된 UI 텍스트 |

## 4. 대시보드(help.tsx) 수정 항목

### QuickStartPage
- 변경 없음 (4단계 유지)
- 단, Guide "1. 시작하기" 5단계와 **번호 불일치**가 있으니 Guide 쪽을 4단계로 재편

### GuidePage
- **"1. 시작하기" 섹션을 5단계 → 4단계로 재편** (SSO 설정+확인을 1단계로 통합)
- **"4. 소셜 로그인 서비스별 안내" 표에 향후 지원 예정(LINE/X/Facebook) 행 추가** 
  - 비고 컬럼에 "2026년 예정" 식으로 명기
- **"5. 위젯 디자인 설정"** — 현재 프리셋 5가지 설명 유지, 슬라이더 6종의 범위 숫자가 실제와 일치하는지 재확인 (이미 맞는 것으로 확인됨)
- **신규 섹션 "8. 자주 묻는 화면 조작"** — FAQ 내용 중 "로그인 페이지에 소셜 버튼이 안 보여요", "다른 SSO 앱에서 전환 시 기존 회원은?" 을 Guide에 교차 링크

### FaqPage
- **신규 Q 3건 추가**
  - "카카오 채널 자동 연결은 어떤 요금제에서 쓸 수 있나요?" (Plus 전용)
  - "AI 기능별 일일 호출 제한은 얼마인가요?" (identity 10 / briefing 5 / escalation-copy 5 / copy 10월)
  - "무료 플랜과 Plus 플랜 기능 차이는?" (요약표)
- **프로바이더 주의사항 표에 "향후 지원 예정" 3행 추가** — LINE, X, Facebook (비고: 2026년 예정)

## 5. 정리 — 실제 수정 순서

1. `help.tsx` 코드 수정 (Phase E)
2. `docs/FAQ.md` 신규 Q 추가 (Phase E 포함)
3. `docs/ai-assistant/kb-public.md` 최종본 생성 (Phase D) — 위 모든 확정 팩트를 단일 문서화
4. `docs/ai-assistant/prompt-kimi-reply.md` 조립 (Phase F)

---

## 6. 민감정보 가드레일 (프롬프트 조립 시 반드시 확인)

Kimi에 넣기 전 최종 검수 체크리스트:
- [ ] `schema.sql`의 테이블명/컬럼명이 프롬프트에 없는가
- [ ] `database_id`, `KV namespace id`, `account_id` 같은 식별자가 없는가
- [ ] OAuth client_id/secret 부분 문자열이 없는가
- [ ] 내부 API 엔드포인트(`/api/supadmin/...`)가 운영자 노출 범위 밖의 경로가 아닌가
- [ ] "결정 필요 사항"/"TODO"/"로드맵 A안 vs B안" 같은 의사결정 과정이 유출되지 않는가
