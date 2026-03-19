# Meta for Developers 빠른 참조 (Quick Reference)

**Version**: 2025-2026 최신 기준  
**업데이트**: 2026-03-19

---

## 1. 메뉴 위치 한눈에 보기

```
Dashboard (내 앱 선택)
├── Products
│   └── Facebook Login
│       └── Settings ← OAuth URI, 권한 설정
├── Settings
│   ├── Basic ← App ID, Secret, Privacy Policy, Contact Email
│   └── Advanced ← Data Deletion Callback URL
├── App Review ← 권한 신청 & 검토 현황
├── App Roles ← 팀원 접근 관리
└── Analytics ← 사용 통계
```

---

## 2. 핵심 설정 체크리스트 (순서대로)

### Phase 1: 기본 설정

```
Dashboard → Settings → Basic
[ ] App Name (필수)
[ ] App Category (필수)
[ ] Contact Email (필수)
[ ] App Icon (라이브 필수)
[ ] App Domains (Facebook Login 사용 시 필수)
```

### Phase 2: Facebook Login 추가

```
Dashboard → +Add Product → Facebook Login → Set Up
[ ] Facebook Login 활성화
[ ] 플랫폼 선택 (Web, iOS, Android 등)
```

### Phase 3: OAuth 설정

```
Dashboard → Products → Facebook Login → Settings
[ ] Client OAuth Login: ON
[ ] Web OAuth Login: ON
[ ] Valid OAuth Redirect URIs 등록 (HTTPS만)
[ ] 필요한 권한 추가 (public_profile, email 등)
```

**예시**:
```
Valid OAuth Redirect URIs:
https://yourdomain.com/auth/facebook/callback
https://yourdomain.com/oauth/return
```

### Phase 4: 고급 설정 & Privacy

```
Dashboard → Settings → Advanced
[ ] Data Deletion Request Callback URL (권장)

Dashboard → Settings → Basic (하단)
[ ] Privacy Policy URL (라이브 필수) - HTTPS, 공개
[ ] Terms of Service URL (선택)
[ ] User Data Deletion URL (권장)
```

### Phase 5: 라이브 모드 전환

```
Dashboard → 상단 우측 모드 버튼
[ ] "In Development" → 클릭 → "Live"
   또는
Dashboard → Settings → Basic → App Mode
[ ] "Switch to Live Mode" 클릭
```

**필수 조건**:
- Privacy Policy URL 등록
- App Icon 등록
- Contact Email 입력

### Phase 6: App Review 신청

```
Dashboard → App Review (또는 Submit for Review)
[ ] 요청할 권한 선택
[ ] 각 권한별 사용 목적 작성
[ ] 스크린 레코딩 업로드 (권한마다 1개)
[ ] 제출 (2-7일 대기)
```

---

## 3. 각 항목별 정확한 입력값

### App ID & Secret 위치

```
Dashboard → Settings → Basic
┌─────────────────────────────┐
│ App ID                       │
│ 123456789012345  [Copy]      │
├─────────────────────────────┤
│ App Secret Code              │
│ ••••••••••••••••  [Show] [Reset] │
└─────────────────────────────┘
```

**사용처**:
- App ID: 프론트엔드, API 호출
- App Secret: 백엔드 환경변수만

### Privacy Policy URL

```
위치: Dashboard → Settings → Basic (스크롤 하단)

필수 조건:
✓ HTTPS로 시작
✓ 공개 가능 (지역 차단 금지)
✓ Meta 크롤러 접근 가능
✓ 항상 최신 내용 유지

예시:
https://yourcompany.com/privacy
https://app.example.com/legal/privacy-policy
```

### Data Deletion Callback URL

```
위치: Dashboard → Settings → Advanced

형식: HTTPS URL (POST 요청 수신)

예시:
https://api.yourapp.com/webhooks/facebook/deletion
https://yourapp.com/data-deletion/callback
```

### Valid OAuth Redirect URIs

```
위치: Dashboard → Products → Facebook Login → Settings

형식: HTTPS URL (여러 개 등록 가능)

예시:
https://yourapp.com/auth/facebook/callback
https://dev.yourapp.com/auth/facebook/callback
https://www.yourapp.com/oauth/facebook/return

⚠️ 정확한 매칭 필수:
등록: https://app.com/callback
요청: https://app.com/callback     ✅
요청: https://app.com/callback/    ❌ 슬래시 다름
요청: https://app.com/Callback     ❌ 대소문자 다름
```

---

## 4. 자주 찾는 설정값

| 항목 | 경로 | 용도 | 보안 |
|------|------|------|------|
| **App ID** | Settings → Basic | OAuth, API 호출 | 공개 가능 |
| **App Secret** | Settings → Basic | 서버 인증 | ⚠️ 보안 필수 |
| **OAuth URIs** | Products → FB Login → Settings | 로그인 콜백 | HTTPS 필수 |
| **Privacy URL** | Settings → Basic | 규정 준수 | 공개, 최신 유지 |
| **Deletion Callback** | Settings → Advanced | GDPR 준수 | HTTPS, 서명 검증 |
| **Contact Email** | Settings → Basic | 개발자 연락처 | 운영 모니터링 |

---

## 5. OAuth Flow 한 줄 요약

```
1. 사용자: "Facebook 로그인" 클릭
   ↓
2. 앱: 로그인 Dialog로 리다이렉트
   https://facebook.com/dialog/oauth?client_id=...&redirect_uri=...
   ↓
3. 사용자: 권한 승인
   ↓
4. Facebook: redirect_uri로 code 반환
   ↓
5. 앱(서버): code + secret으로 access_token 요청
   ↓
6. 앱: access_token으로 사용자 정보 조회
```

---

## 6. Review 거부 시 재신청 플로우

```
거부됨 ← 확인
  ↓
"Feedback" 읽기 (왜 거부되었는지)
  ↓
문제 파악 및 개선
  ├─ 스크린 레코딩 다시 촬영? → 기술 부채
  ├─ 설명 다시 작성? → 명확하게
  └─ 앱 기능 수정? → 권한과 일치
  ↓
Resubmit 또는 새로 신청
  ↓
2-7일 대기 (평균 3일)
```

---

## 7. 보안 체크리스트 (필수)

```
Code & Environment
☐ App Secret은 .env 파일에만
☐ .env 파일은 .gitignore에 등록
☐ 소스코드에 secret 노출 없음
☐ 클라이언트 코드에서 secret 사용 안 함

Settings
☐ Privacy Policy URL이 404 아님
☐ 지역 차단 없음 (VPN 필요 없음)
☐ OAuth URIs가 정확히 일치
☐ Redirect URI는 HTTPS만

Operations
☐ Data Deletion Callback 구현됨
☐ 콜백 응답에 confirmation_code 포함
☐ HMAC-SHA256 서명 검증
```

---

## 8. 문제 진단 플로우

```
로그인 실패?
├─ "Invalid redirect URI" 에러?
│  └─ Dashboard → Products → FB Login → Settings
│     등록된 URI와 코드의 URI가 정확히 일치하는지 확인
│
├─ "권한이 없다" 에러?
│  └─ Dashboard → App Review → Requests
│     해당 권한이 Approved인지 확인
│     (라이브 모드에서는 승인된 권한만 가능)
│
└─ "앱을 찾을 수 없다" 에러?
   └─ Dashboard → Settings → Basic
      App ID 정확한지 확인
      (123456 이 아니라 전체 숫자 확인)

Privacy Policy 에러?
├─ "Privacy Policy not found" 에러?
│  └─ Settings → Basic의 Privacy URL을 브라우저에서 직접 방문
│     404인지 확인
│     지역 차단 여부 확인
│
└─ "Privacy Policy not accessible" 에러?
   └─ HTTPS 사용 확인
      방화벽/WAF 규칙 확인
      로봇 차단 설정 확인 (Meta 봇 허용)

App Review 거부?
└─ 자세히 읽기:
   Dashboard → App Review → Requests → (거부된 항목)
   "Feedback" 또는 거부 사유 확인
   → Community Forums에서 유사 사례 검색
   → 정확히 수정 후 재신청
```

---

## 9. API 엔드포인트 빠른 참조

### OAuth 로그인 Dialog

```
GET https://www.facebook.com/v25.0/dialog/oauth
  ?client_id=YOUR_APP_ID
  &redirect_uri=https://yourapp.com/callback
  &scope=public_profile,email
  &state=RANDOM_STRING
  &response_type=code
```

### Access Token 요청 (서버)

```
GET https://graph.facebook.com/v25.0/oauth/access_token
  ?client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET  ⚠️ 서버만
  &redirect_uri=https://yourapp.com/callback
  &code=CODE_FROM_DIALOG
```

### 사용자 정보 조회

```
GET https://graph.facebook.com/v25.0/me
  ?fields=id,name,email,picture
  &access_token=USER_ACCESS_TOKEN

응답:
{
  "id": "123456789",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": { "data": { "url": "..." } }
}
```

---

## 10. 상황별 FAQ

### Q. 로컬에서 Facebook Login 테스트하려면?

```
1. Valid OAuth Redirect URIs에 추가:
   https://localhost:3000/callback

2. Strict Mode가 활성화되어 있으면:
   정확히 일치하는 URL만 동작
   (localhost:3000과 localhost:3001은 다름)

3. HTTPS 필요:
   localhost도 https://localhost:3000 형식
   (ngrok, mkcert 등으로 로컬 HTTPS 구성)
```

### Q. 여러 환경 (dev/staging/prod)에서는?

```
Valid OAuth Redirect URIs에 모두 등록:
https://dev.yourapp.com/callback
https://staging.yourapp.com/callback
https://www.yourapp.com/callback

코드에서 환경변수로 관리:
const redirectUri = process.env.FACEBOOK_REDIRECT_URI;
```

### Q. 로그아웃 시 Facebook도 로그아웃하려면?

```
// Facebook 로그인 확인 후 로그아웃
window.location.href = `https://www.facebook.com/logout.php?next=YOUR_APP_URL`;

또는

<a href="https://www.facebook.com/logout.php?next=YOUR_APP_URL">
  Logout from Facebook
</a>
```

### Q. 권한 재요청(Re-prompt)하려면?

```
OAuth Dialog에 auth_type 파라미터 추가:
&auth_type=rerequest

또는

&auth_type=reauthenticate (다시 로그인)
```

### Q. 앱을 삭제하려면?

```
Dashboard → Settings → Basic (최하단)
[ ] "Delete App" 버튼 클릭
주의: 되돌릴 수 없음!
```

---

## 11. 공식 문서 링크

| 항목 | 링크 |
|------|------|
| Facebook Login 시작 | https://developers.facebook.com/docs/facebook-login |
| OAuth Manual Flow | https://developers.facebook.com/docs/facebook-login/guides/advanced/manual-flow/ |
| Basic Settings | https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings/ |
| Advanced Settings | https://developers.facebook.com/docs/development/create-an-app/app-dashboard/advanced-settings |
| Data Deletion | https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/ |
| App Review | https://developers.facebook.com/docs/resp-plat-initiatives/app-review/introduction |
| Dashboard Feedback | https://communityforums.atmeta.com/category/developer/discussions/dev-dashboard |

---

**작성자**: Claude Code (Haiku 4.5)  
**마지막 업데이트**: 2026-03-19

