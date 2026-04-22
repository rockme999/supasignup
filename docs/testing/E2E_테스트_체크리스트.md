# 번개가입 E2E 테스트 체크리스트

**테스트 환경**: bg.suparain.kr (Cloudflare Workers, bg-production D1)
**테스트 쇼핑몰**: suparain999.cafe24.com (커스텀 도메인: suparain.kr)
**최종 업데이트**: 2026-03-28 KST

---

## 프로바이더별 E2E 테스트 결과 (2026-03-28)

### ✅ 통과 (6종 — 서비스 활성)

| 프로바이더 | 결과 | 발견 이슈 | 조치 |
|-----------|------|----------|------|
| **Google** | ✅ 통과 | redirect_uri에 커스텀 도메인 누락 | `buildAllowedRedirectUris()` 함수로 자동 등록 |
| **Kakao** | ✅ 통과 | ① V2 scope 미등록 (KOE205) ② 닉네임 `…` 마스킹 | ① scope 축소 ② `fallbackName()` 이메일 앞부분 대체 |
| **Naver** | ✅ 통과 | 없음 | — |
| **Apple** | ✅ 통과 | 릴레이 이메일로 계정 연결 불가 | Apple 정책상 불가피, 별도 회원 생성 |
| **Discord** | ✅ 통과 | 없음 | — |
| **Telegram** | ✅ 통과 | 이메일 미반환 → `@`만 저장 | `이름@쇼핑몰도메인` 대체 이메일 생성 |

### ⏭ 스킵 → 향후 지원 예정 (대시보드에서 "준비 중" 표시)

| 프로바이더 | 사유 | 해결 조건 |
|-----------|------|----------|
| **Facebook** | 개발 모드 — 테스터 역할만 로그인 가능 | Facebook 앱 역할에 테스터 추가 또는 앱 심사 통과 |
| **X (Twitter)** | Free tier API 제한 (403) — `/2/users/me` 차단 | Basic 구독 ($100/월) 또는 X API 정책 변경 대기 |
| **LINE** | 개발 모드 — 개발자 역할만 로그인 가능 | LINE Developers에서 테스터 역할 추가 또는 채널 공개 |
| **Toss** | 미구현 | Phase 2 |
| **TikTok** | 미구현 | Phase 2 |

---

## 🔴 프로덕션 출시 전 필수 작업

| # | 항목 | 상태 | 설명 |
|---|------|------|------|
| 1 | **Google OAuth 프로덕션 전환** | ❌ 미완료 | Google Cloud Console → OAuth 동의 화면 → "앱 게시". 현재 테스트 모드라 등록된 테스트 사용자만 로그인 가능. Google 검수 필요 |
| 2 | **Naver 서비스 검수** | ❌ 미완료 | 네이버 개발자센터 → 앱 검수 요청. 현재 "개발 중" 상태라 등록된 멤버만 로그인 가능 |
| 3 | **Kakao 비즈앱 검수** | ❌ 확인 필요 | 카카오 비즈앱 전환은 완료됐으나, 비즈니스 채널 연결/검수 상태 재확인 필요. 미완료 시 일반 사용자 로그인 제한될 수 있음 |

## 🟡 알려진 제한사항 (서비스는 가능하나 인지 필요)

| # | 항목 | 영향 | 설명 |
|---|------|------|------|
| 4 | **카카오 닉네임 마스킹** | 이름이 이메일 앞부분으로 대체 | 사용자가 닉네임 제공 거부 시 `…` 반환 → fallback 처리됨 |
| 5 | **Apple 릴레이 이메일** | 이메일 기반 계정 연결 불가 | `xxx@privaterelay.appleid.com` → 다른 소셜과 별도 회원 |
| 6 | **Telegram 대체 이메일** | 실제 이메일 아님 | `이름@쇼핑몰도메인` 형태 생성. 카페24 SSO 이메일 필수 대응 |
| 7 | **카페24 SSO 수동 설정** | 신규 쇼핑몰마다 필요 | 쇼핑몰 관리자가 SSO 가이드 따라 직접 등록해야 함 (`sso_configured` 플래그) |

---

## 이번 테스트에서 수정한 코드 (2026-03-28)

1. **커스텀 도메인 redirect_uri 자동 등록** (`cafe24.ts`)
   - `buildAllowedRedirectUris()` 함수 추가
   - 카페24 API primary_domain → 커스텀 도메인 SSO 콜백 URI 자동 추가
   - 신규 설치 + 재설치 모두 적용

2. **카카오 scope 축소** (`social.ts`)
   - `phone_number, birthyear, birthday, gender` 제거
   - 카카오 콘솔 동의항목 등록 전까지 기본 3종만 요청

3. **닉네임 fallback** (`social.ts`)
   - `fallbackName()` 함수 — `…` 또는 빈 이름 시 이메일 앞부분 대체

4. **이메일 없는 프로바이더 대체 이메일** (`oauth.ts`)
   - Telegram, X 등 이메일 미반환 시 `이름@쇼핑몰도메인` 생성
   - 카페24 SSO 이메일 필수 요구사항 대응

5. **X OAuth2 Basic Auth** (`social.ts`)
   - 토큰 교환 시 Authorization: Basic 헤더 추가

6. **대시보드 프로바이더 분류 변경** (`pages.tsx`)
   - 활성: Google, Kakao, Naver, Apple, Discord, Telegram (6종)
   - 향후 지원 예정 (준비 중): Facebook, X, LINE, Toss, TikTok (5종)

---

## Phase 1: 카페24 앱 설치 + 자동 등록

### P1-1. 카페24 앱 설치
- [x] 카페24 관리자 → 앱스토어 → 번개가입 앱 설치 시작
- [x] HMAC 검증 통과 → 카페24 OAuth 동의 화면 표시
- [x] OAuth 동의 완료 → `/api/cafe24/callback` 정상 처리
- [x] DB에 shop 자동 생성 확인 (shops 테이블)
- [x] DB에 owner 자동 생성 확인
- [x] ScriptTag 자동 설치 확인 (buttons.js)
- [x] 설정 페이지로 리다이렉트

### P1-2. 대시보드 접근 확인
- [x] 설정 페이지에서 Client ID 표시 확인
- [x] SSO 가이드 URL 표시 확인
- [x] 복사 버튼 동작 확인

### P1-3. 프로바이더 활성화
- [x] 6종 프로바이더 토글 ON/OFF 동작 확인
- [x] 저장 성공 확인

---

## Phase 2: 카페24 SSO 항목 등록

- [x] 카페24 관리자 → SSO 로그인 연동 관리 → 등록 완료
- [x] Authorize / Token / UserInfo URL 설정 완료
- [x] Client ID / Secret 설정 완료

---

## Phase 3: 소셜 로그인 E2E 테스트

- [x] Google 신규 가입 — 통과
- [x] Kakao 신규 가입 — 통과 (scope 수정 후)
- [x] Naver 신규 가입 — 통과
- [x] Apple 신규 가입 — 통과 (릴레이 이메일)
- [x] Discord 신규 가입 — 통과
- [x] Telegram 신규 가입 — 통과 (대체 이메일)

---

## Phase 4~6: 추가 테스트 (미실시)

- [ ] 재로그인 테스트 (login vs signup 구분)
- [ ] 스마트 버튼 강조 표시
- [ ] 위젯 렌더링 (모바일 포함)
- [ ] 과금 한도 테스트
- [ ] 에러 케이스 테스트

---

## 디버깅 명령어

```bash
# Workers 실시간 로그
cd workers/api && npx wrangler tail --format pretty

# DB 조회 (프로덕션)
npx wrangler d1 execute bg-production --remote --command "SELECT * FROM shops WHERE mall_id = 'suparain999'"
npx wrangler d1 execute bg-production --remote --command "SELECT * FROM login_stats ORDER BY created_at DESC LIMIT 10"
npx wrangler d1 execute bg-production --remote --command "SELECT user_id, provider, provider_uid FROM users"

# KV 조회
npx wrangler kv key list --namespace-id=fe38c181822b4729850b53ab839339b5 --remote
```
