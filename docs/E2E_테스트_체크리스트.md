# 번개가입 E2E 테스트 체크리스트

**테스트 환경**: bg.suparain.kr (Cloudflare Workers, bg-dev D1)
**테스트 쇼핑몰**: suparain999.cafe24.com
**작성일**: 2026-03-13

---

## Phase 1: 카페24 앱 설치 + 자동 등록

### P1-1. 카페24 앱 설치
- [ ] 카페24 관리자 → 앱스토어 → 번개가입 앱 설치 시작
- [ ] HMAC 검증 통과 → 카페24 OAuth 동의 화면 표시
- [ ] OAuth 동의 완료 → `/api/cafe24/callback` 정상 처리
- [ ] DB에 shop 자동 생성 확인 (shops 테이블)
- [ ] DB에 owner 자동 생성 확인 (suparain999@cafe24.auto)
- [ ] ScriptTag 자동 설치 확인 (buttons.js)
- [ ] 설정 페이지로 리다이렉트 (`/dashboard/shops/:id/setup`)

### P1-2. 대시보드 접근 확인
- [ ] 설정 페이지에서 Client ID 표시 확인
- [ ] 설정 페이지에서 Client Secret (마스킹) 표시 확인
- [ ] SSO Authorize URL 4개 표시 확인 (google/kakao/naver/apple)
- [ ] Token URL, UserInfo URL 표시 확인
- [ ] 복사 버튼 동작 확인

### P1-3. 프로바이더 활성화
- [ ] 쇼핑몰 상세 페이지 → Google 토글 ON
- [ ] Kakao 토글 ON
- [ ] Naver 토글 ON
- [ ] (Apple은 별도 테스트) 토글 OFF 유지
- [ ] 저장 성공 확인

---

## Phase 2: 카페24 SSO 항목 등록

카페24 관리자 → 쇼핑몰 설정 → 기본 설정 → 외부 로그인 설정

### P2-1. Google SSO 등록
- [ ] Authorize URL: `https://bg.suparain.kr/oauth/authorize?provider=google`
- [ ] Token URL: `https://bg.suparain.kr/oauth/token`
- [ ] UserInfo URL: `https://bg.suparain.kr/oauth/userinfo`
- [ ] Client ID: 대시보드에서 복사한 값
- [ ] Client Secret: 대시보드에서 복사한 값
- [ ] 저장 완료

### P2-2. Kakao SSO 등록
- [ ] Authorize URL: `https://bg.suparain.kr/oauth/authorize?provider=kakao`
- [ ] Token URL / UserInfo URL: 위와 동일
- [ ] Client ID / Secret: 위와 동일
- [ ] 저장 완료

### P2-3. Naver SSO 등록
- [ ] Authorize URL: `https://bg.suparain.kr/oauth/authorize?provider=naver`
- [ ] Token URL / UserInfo URL: 위와 동일
- [ ] Client ID / Secret: 위와 동일
- [ ] 저장 완료

### P2-4. Account Linking 설정
- [ ] Account Linking 옵션 활성화 (있을 경우)

---

## Phase 3: 소셜 로그인 E2E 테스트

쇼핑몰 로그인 페이지: `https://suparain999.cafe24.com/member/login.html`

### P3-1. Google 신규 가입
- [ ] 로그인 페이지에서 Google 버튼 클릭
- [ ] bg.suparain.kr/oauth/authorize로 리다이렉트 확인
- [ ] Google 계정 선택 → 동의
- [ ] 카페24로 다시 리다이렉트 (auth_code + state 포함)
- [ ] 카페24 회원으로 자동 가입 완료 (회원관리에서 확인)
- [ ] D1 login_stats: action=signup 기록 확인
- [ ] D1 users: 암호화된 PII 저장 확인
- [ ] 대시보드 홈: 통계 반영 확인

### P3-2. Kakao 신규 가입
- [ ] 로그인 페이지에서 Kakao 버튼 클릭
- [ ] 카카오 계정 로그인 → 동의
- [ ] 카페24 회원 자동 가입 완료
- [ ] D1 login_stats: action=signup, provider=kakao 확인
- [ ] 대시보드 통계 반영 확인

### P3-3. Naver 신규 가입
- [ ] 로그인 페이지에서 Naver 버튼 클릭
- [ ] 네이버 계정 로그인 → 동의
- [ ] 카페24 회원 자동 가입 완료
- [ ] D1 login_stats: action=signup, provider=naver 확인
- [ ] 대시보드 통계 반영 확인
- [ ] **주의**: 네이버 "개발 중" 상태 → 등록된 테스트 계정만 가능

### P3-4. Apple 신규 가입 (Phase 2 프로바이더 활성화 후)
- [ ] Apple 프로바이더 토글 ON + 카페24 SSO 등록
- [ ] 로그인 페이지에서 Apple 버튼 클릭
- [ ] Apple ID 로그인 → form_post 콜백 정상 처리
- [ ] 카페24 회원 자동 가입 완료
- [ ] 최초 인증 시 이름 저장 확인

---

## Phase 4: 재로그인 + 스마트 버튼

### P4-1. 재로그인 테스트 (Google)
- [ ] 이미 가입한 Google 계정으로 다시 로그인
- [ ] D1 login_stats: action=login (signup 아님) 확인
- [ ] shop_users 중복 생성 안 됨 확인

### P4-2. 재로그인 테스트 (Kakao)
- [ ] 이미 가입한 Kakao 계정으로 다시 로그인
- [ ] action=login 확인

### P4-3. 스마트 버튼 강조 표시
- [ ] 소셜 로그인 완료 후 URL에 bg_provider 파라미터 포함 확인
- [ ] 다시 로그인 페이지 방문 → 마지막 프로바이더 버튼 강조 + 최상단
- [ ] localStorage에 bg_last_provider 저장 확인 (브라우저 개발자 도구)

---

## Phase 5: 위젯 + 과금 확인

### P5-1. 위젯 렌더링
- [ ] 쇼핑몰 로그인 페이지에서 번개가입 위젯 자동 렌더링 확인
- [ ] 활성화된 프로바이더 버튼만 표시 확인
- [ ] 번개 마크 + "powered by 번개가입" 표시 확인
- [ ] 모바일 화면에서 레이아웃 정상 확인

### P5-2. 대시보드 통계/과금 확인
- [ ] 대시보드 홈: 전체 가입 수 정확
- [ ] 오늘 가입 수 정확
- [ ] 이번 달 가입 수 정확
- [ ] 소셜별 비율 표시
- [ ] 과금 현황: 쇼핑몰별 사용량 % 표시

### P5-3. 위젯 API 직접 확인
- [ ] `GET /api/widget/config?client_id={ID}` → 활성 providers 반환
- [ ] `GET /widget/buttons.js?shop={ID}` → JS 정상 서빙

---

## Phase 6: 에러 케이스

### P6-1. 비활성 프로바이더
- [ ] Apple 비활성 상태에서 authorize?provider=apple 요청 → 400 에러

### P6-2. 잘못된 Client ID
- [ ] 존재하지 않는 client_id로 authorize 요청 → 400 에러

### P6-3. 위젯 과금 한도
- [ ] (시뮬레이션) login_stats 100건 INSERT 후 widget/config → 빈 providers

---

## 디버깅 명령어

```bash
# Workers 실시간 로그
cd workers/api && npx wrangler tail

# DB 조회
npx wrangler d1 execute bg-dev --remote --command "SELECT * FROM shops WHERE mall_id = 'suparain999'"
npx wrangler d1 execute bg-dev --remote --command "SELECT * FROM login_stats ORDER BY created_at DESC LIMIT 10"
npx wrangler d1 execute bg-dev --remote --command "SELECT user_id, provider, email_hash FROM users"
npx wrangler d1 execute bg-dev --remote --command "SELECT * FROM shop_users"
npx wrangler d1 execute bg-dev --remote --command "SELECT * FROM owners"

# KV 조회
npx wrangler kv key list --namespace-id=6aaca4b2e92f4361a5b31f39f96f4c5a
```

---

## 테스트 결과 요약

| Phase | 항목 | 결과 | 비고 |
|-------|------|------|------|
| P1 | 카페24 앱 설치 + 자동 등록 | - | |
| P2 | 카페24 SSO 항목 등록 | - | |
| P3 | 소셜 로그인 E2E (Google/Kakao/Naver) | - | |
| P4 | 재로그인 + 스마트 버튼 | - | |
| P5 | 위젯 + 과금 확인 | - | |
| P6 | 에러 케이스 | - | |
