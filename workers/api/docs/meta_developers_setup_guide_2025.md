# Meta for Developers (Facebook) 앱 설정 가이드 (2025-2026)

**최종 업데이트**: 2026-03-19
**기준**: Meta for Developers 공식 문서 (February 2025 이후)

---

## 목차

1. [대시보드 메뉴 구조](#1-대시보드-메뉴-구조)
2. [Facebook Login 추가 및 설정](#2-facebook-login-추가-및-설정)
3. [OAuth 리디렉션 URI 설정](#3-oauth-리디렉션-uri-설정)
4. [데이터 삭제 콜백 URL 설정](#4-데이터-삭제-콜백-url-설정)
5. [앱 ID와 시크릿 키 확인](#5-앱-id와-시크릿-키-확인)
6. [개인정보처리방침 등록](#6-개인정보처리방침-등록)
7. [앱 모드 전환 (개발→라이브)](#7-앱-모드-전환-개발라이브)
8. [App Review 제출](#8-app-review-제출)

---

## 1. 대시보드 메뉴 구조

### 1.1 진입 경로

- **사이트**: https://developers.facebook.com
- **메인 네비게이션**: `My Apps` → 앱 선택

### 1.2 앱 대시보드의 주요 섹션

App Dashboard는 **Use Case 기반** 대시보드와 **App Type 기반** 대시보드 두 가지 구조를 가집니다.

#### Use Case Apps 대시보드 (새 인터페이스)

좌측 사이드바 메뉴:
- **Apps Build**
  - Use cases
  - Settings (Basic & Advanced)
  - App Roles
  - Testing
- **Submit for Review**
  - Authentication
  - Data Processing Questions
  - App Review Submission
- **Publish**
  - Launch Checklist
  - Go-Live Requirements
- **Notifications**
  - Developer Alerts
  - Settings

#### App Type Apps 대시보드 (기존 인터페이스)

좌측 사이드바 메뉴:
- **Settings**
  - Basic Settings
  - Advanced Settings
- **App Roles**
  - Team access management
- **Notifications**
- **App Review**
  - Submission tracking
  - Permission requests
- **Products**
  - Add new products
  - Product certificates
- **Analytics**
  - Activity logs
  - Usage limits
  - API statistics
  - Facebook Login metrics

---

## 2. Facebook Login 추가 및 설정

### 2.1 Facebook Login 제품 추가

**경로**: Dashboard 좌측 메뉴 → `+Add Product` 또는 `Products`

1. **Add Product 버튼** 클릭
2. **Facebook Login** 찾기
3. **Set Up** 또는 **Add** 버튼 클릭
4. 플랫폼 선택 (Web, iOS, Android, Devices)
5. 필수 설정 완료

### 2.2 Facebook Login 설정 화면 위치

**경로**: Dashboard → Products → Facebook Login → Settings

#### 웹 플랫폼 설정 항목

| 섹션 | 설정 항목 | 설명 |
|------|---------|------|
| **Client OAuth Settings** | Valid OAuth Redirect URIs | 콜백 URI 등록 (HTTPS 필수) |
| **Client OAuth Settings** | Valid OAuth Domains | OAuth 관련 도메인 |
| **Client OAuth Settings** | Client OAuth Login | 토글: 활성화 필수 |
| **Client OAuth Settings** | Web OAuth Login | 토글: 활성화 필수 |
| **Permissions** | Public Profile | 기본 권한 |
| **Permissions** | Email | 이메일 권한 (필요시 요청) |

### 2.3 필수 설정 단계

```
1. Products > Facebook Login > Settings 진입
2. Client OAuth Settings 섹션에서:
   - Client OAuth Login: 켜기
   - Web OAuth Login: 켜기
3. Valid OAuth Redirect URIs에 콜백 URL 추가
4. Save Changes
```

---

## 3. OAuth 리디렉션 URI 설정

### 3.1 설정 위치

**경로**: Dashboard → Products → Facebook Login → Settings → Client OAuth Settings

### 3.2 유효한 리디렉션 URI 형식

```
https://yourdomain.com/auth/facebook/callback
https://yourdomain.com/oauth/facebook/return
https://yourapp.com/api/auth/callback/facebook
```

**중요**: 
- 반드시 **HTTPS**만 가능
- localhost 테스트는 `https://localhost:3000/callback` 형식으로 설정 가능
- Strict Mode: 정확한 URL 매칭 필수

### 3.3 리디렉션 URI 등록 방법

1. **Products → Facebook Login → Settings** 이동
2. **Client OAuth Settings** 섹션 찾기
3. **Valid OAuth Redirect URIs** 필드 클릭
4. URI 입력 (한 줄에 하나씩)
5. **Save Changes** 버튼 클릭

### 3.4 OAuth Flow 설정

#### 로그인 요청 엔드포인트

```
https://www.facebook.com/v25.0/dialog/oauth
```

**필수 파라미터**:
- `client_id`: 앱 ID (Settings > Basic에서 확인)
- `redirect_uri`: 위에서 등록한 콜백 URI (정확히 일치해야 함)
- `state`: CSRF 보호용 무작위 문자열
- `scope`: 요청할 권한 (예: `public_profile,email`)
- `response_type`: `code` (권장) 또는 `token`

#### 액세스 토큰 요청 엔드포인트

```
GET https://graph.facebook.com/v25.0/oauth/access_token

Parameters:
- client_id: 앱 ID
- client_secret: 앱 시크릿 (서버에서만 사용)
- redirect_uri: 로그인 요청과 동일한 URI
- code: 로그인 dialog에서 받은 code
```

---

## 4. 데이터 삭제 콜백 URL 설정

### 4.1 규정 요구사항

- **GDPR 준수**: EU 지역 사용자 대상 필수
- **Meta 정책**: Facebook Login 사용 앱 권장
- **기능**: 사용자가 Facebook 프로필에서 "앱 삭제" 요청 시 콜백 수신

### 4.2 설정 위치

**경로**: Dashboard → Settings → Advanced (또는 Basic Settings 하단)

- **필드명**: "Data Deletion Request Callback URL" 또는 "User Data Deletion URL"
- **프로토콜**: HTTPS 필수
- **유형**: URL (예: `https://yourapp.com/webhooks/facebook-data-deletion`)

### 4.3 콜백 URL 등록 방법

1. **Settings → Advanced** 이동
2. **Data Deletion Request Callback URL** 또는 **User Data Deletion URL** 필드 찾기
3. HTTPS URL 입력
4. **Save** 버튼 클릭

### 4.4 콜백 요청 형식

**요청 방식**: POST  
**요청 내용**: 서명된 JSON

```json
{
  "signed_request": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**서명 검증**:
- HMAC-SHA256 알고리즘 사용
- App Secret으로 검증

**응답 형식** (필수):

```json
{
  "url": "https://yourapp.com/data-deletion-status/12345",
  "confirmation_code": "delete-req-12345"
}
```

### 4.5 테스트 방법

1. Facebook 프로필 → Settings & Privacy → Settings
2. Apps and Websites → Apps you use → (앱 선택)
3. Remove App
4. 콜백 엔드포인트에서 요청 수신 확인

---

## 5. 앱 ID와 시크릿 키 확인

### 5.1 설정 위치

**경로**: Dashboard → Settings → Basic

### 5.2 필드 위치

| 항목 | 필드명 | 설명 |
|-----|--------|------|
| **App ID** | App ID | 공개 가능, API 호출에 사용 |
| **App Secret** | App Secret Code | 절대 공개 금지, 서버 환경변수에만 저장 |

### 5.3 중요 보안 주의사항

**⚠️ App Secret 취급**:
- 클라이언트 코드(JavaScript)에 절대 포함 금지
- 환경변수 또는 `.env` 파일에만 저장
- GitHub/Public Repository에 커밋 금지
- 서버 코드에서만 사용

**예시 (잘못된 것)**:
```javascript
// ❌ 절대 금지!
const FB_APP_SECRET = "abc123...xyz789";
const config = {
  appSecret: process.env.FB_APP_SECRET
};
```

**예시 (올바른 것)**:
```javascript
// ✅ 올바른 방식
// .env 파일
FB_APP_ID=123456789
FB_APP_SECRET=abc123...xyz789

// 코드
const appId = process.env.FB_APP_ID;
const appSecret = process.env.FB_APP_SECRET;
```

### 5.4 키 복사 방법

1. **Settings → Basic** 진입
2. **App ID** 섹션에서 "Copy" 버튼 클릭
3. **App Secret Code** 섹션에서 "Show" → "Copy" 버튼 클릭
4. 안전한 곳(`.env`, Password Manager 등)에 저장

### 5.5 키 재생성 (보안 침해 시)

1. **App Secret** 옆의 "Reset" 버튼 클릭
2. 확인 대화상자에서 재생성 승인
3. 새 Secret 복사 및 저장
4. 모든 서버 환경에서 즉시 업데이트

---

## 6. 개인정보처리방침 등록

### 6.1 설정 위치

**경로**: Dashboard → Settings → Basic

### 6.2 필수 필드

| 필드 | 필수 여부 | 설명 |
|-----|---------|------|
| **Privacy Policy URL** | Live Mode 필수 | 공개 링크 (크롤러 접근 가능) |
| **Terms of Service URL** | Live Mode 필수 | 서비스 약관 링크 |
| **User Data Deletion URL** | 권장 | 데이터 삭제 요청 페이지 |
| **Contact Email** | 필수 | 개발자 연락처 (운영진용) |

### 6.3 개인정보처리방침 등록 방법

1. **Settings → Basic** 이동
2. 스크롤하여 **Privacy Policy URL** 필드 찾기
3. HTTPS URL 입력 (예: `https://yourapp.com/privacy`)
4. **Save Changes** 버튼 클릭

### 6.4 Privacy Policy URL 요구사항 (2025 업데이트)

**중요**: 2025년 2월 3일부터 적용된 Meta Platform Terms

- URL이 공개 가능해야 함 (지역 차단 금지)
- 지오 블로킹 불가
- Meta의 크롤러가 접근 가능해야 함
- 유효한 SSL/TLS 인증서 필수 (HTTPS)
- 항상 최신 내용 유지

### 6.5 Privacy Policy 포함 필수 항목

```markdown
## 개인정보처리방침에 포함해야 할 항목

1. 수집하는 개인정보 항목
   - 이름, 이메일, 프로필 사진 등

2. 수집 목적
   - 사용자 인증, 계정 관리

3. 보유/이용 기간
   - 계약 기간 동안, 또는 법적 요구까지

4. 제3자 제공
   - Facebook Graph API를 통해 Meta에 제공

5. 사용자 권리
   - 열람, 수정, 삭제 요청 방법
   - 데이터 포팅 권리

6. 데이터 삭제 요청 방법
   - Facebook 앱 제거 → 콜백으로 처리됨
   - 또는 직접 요청 폼 링크

7. 보안 조치
   - 암호화, 접근 제어 등
```

---

## 7. 앱 모드 전환 (개발→라이브)

### 7.1 앱 모드 이해

| 모드 | 설명 | 접근 가능자 | API 권한 |
|-----|------|-----------|--------|
| **Development (개발 모드)** | 기본 모드, 개발/테스트 목적 | Admin, Developer, Tester | 모든 권한/기능 |
| **Live (라이브 모드)** | 실제 사용자 대상 운영 | 승인된 사용자만 | App Review 승인 권한만 |

### 7.2 모드 전환 전 필수 요구사항

```checklist
□ Settings → Basic 완료
  □ App Name (표시 이름)
  □ App Category (앱 카테고리)
  □ Contact Email (연락처)
  □ App Icon (앱 아이콘)
  □ Privacy Policy URL (공개 HTTPS URL)
  □ Terms of Service URL (선택사항)

□ Facebook Login 설정
  □ Valid OAuth Redirect URIs 등록
  □ 필요한 권한 추가 (public_profile, email 등)

□ 기타 설정
  □ App Domains 등록
  □ Data Deletion Callback URL (권장)
```

### 7.3 라이브 모드 전환 방법

**경로**: Dashboard 상단 우측 또는 Settings

#### 방법 1: 대시보드 상단 토글

1. **Dashboard 상단 우측** 모드 버튼 찾기
2. **"In Development"** 또는 개발 모드 표시 확인
3. **클릭하여 토글**
4. Live Mode로 전환 확인

#### 방법 2: Settings에서 전환

1. **Settings → Basic** 이동
2. 페이지 상단의 **App Mode** 또는 **Status** 섹션
3. **Switch to Live Mode** 버튼 클릭
4. 필수 필드 확인 및 동의

### 7.4 라이브 모드 전환 후

**주의사항**:
- Privacy Policy URL 유지 필수
- 데이터 접근 권한은 App Review 승인된 것만 가능
- 미승인 권한/기능 사용 시 API 에러 발생
- 추가 권한 필요 시 새로 App Review 신청 필요

---

## 8. App Review 제출

### 8.1 App Review 개요

**목적**: Meta가 앱의 권한/기능 사용을 검증하고 정책 준수 확인

**대상**: Live Mode 운영 시 필수
- 권한 요청 (email, public_profile 등)
- 기능 사용 (Facebook Login 통합 등)

**예외**: 직원(Admin, Developer, Tester)만 접근하는 앱은 App Review 불필요

### 8.2 App Review 제출 위치

**경로 1** (새 인터페이스): Dashboard → Submit for Review

**경로 2** (기존 인터페이스): Dashboard → App Review

### 8.3 App Review 제출 전 필수 작업

```checklist
□ 앱이 정상 작동하는지 테스트
  □ Facebook Login 로그인 테스트
  □ 권한 요청/승인 흐름 테스트
  □ 데이터 수신/저장 확인

□ 스크린 레코딩 준비 (필수)
  □ 요청 권한마다 1개씩 필요
  □ 권한 사용 장면 명확히 보여야 함
  □ 해상도: 720p 이상 권장
  □ 형식: MP4, MOV 등

□ 문서 준비
  □ 앱이 각 권한을 어떻게 사용하는지 설명
  □ 테스트 계정 정보 (필요 시)
  □ 특별한 접근 권한 필요사항 (예: 특정 페이지 관리자 권한)

□ Settings 최종 확인
  □ Contact Email 정확성
  □ Privacy Policy URL 접근 가능성
  □ App Domain 정확성
```

### 8.4 App Review 신청 절차

#### Step 1: 권한/기능 선택

1. **App Review 섹션** 진입
2. **Request Permissions or Features** (또는 유사 버튼) 클릭
3. 요청할 권한 선택
   - 예: `email`, `public_profile`, `user_friends` 등
4. **Next** 또는 **Continue** 클릭

#### Step 2: 사용 사례 작성

각 권한마다:
1. **How will you use this permission?** 필드
2. 구체적이고 명확한 설명 작성
   ```
   예시 (좋음):
   사용자의 이메일로 계정을 생성하고, 로그인 인증에 사용합니다.
   이메일은 암호화되어 데이터베이스에 저장되며, 
   사용자 동의 하에만 접근합니다.
   ```
   ```
   예시 (나쁨):
   이메일을 받습니다.
   ```

#### Step 3: 스크린 레코딩 업로드

1. **Screen Recording** 필드 클릭
2. 영상 파일 선택 (MP4/MOV)
3. 업로드 (재생하여 확인)

**좋은 스크린 레코딩 기준**:
- 로그인 시작부터 권한 요청, 승인까지 전체 흐름 보여주기
- 권한 사용 후 데이터 확인 (예: 프로필 출력 또는 이메일 로깅)
- 자막이나 설명 추가 권장

#### Step 4: 검토 및 제출

1. 모든 정보 재확인
2. **Submit for Review** 또는 **Request Review** 클릭
3. 제출 확인 메시지 수신

### 8.5 Review 타임라인

| 상태 | 기간 | 설명 |
|-----|------|------|
| Pending | 2-3일 (평균) | 심사 대기 중 |
| Pending | 최대 7일 | 성수기 또는 복잡한 경우 |
| Approved | 즉시 | 권한/기능 사용 가능 |
| Rejected | 즉시 | 피드백과 함께 거부 원인 표시 |

### 8.6 거부(Rejection) 시 대응

**거부 이유 확인**:
1. **App Review → Requests** 섹션
2. 거부된 권한/기능 클릭
3. **Feedback** 또는 **Rejection Reason** 읽기

**일반적인 거부 이유**:
- 스크린 레코딩이 권한 사용을 명확히 보여주지 않음
- 설명이 불명확하거나 불충분함
- 앱이 실제로 권한을 사용하지 않는 것으로 보임
- Privacy Policy URL에 접근 불가
- 테스트 계정 정보 불일치

**재신청 방법**:
1. 피드백 검토 및 개선
2. 스크린 레코딩 다시 촬영
3. 설명 명확히 수정
4. **Resubmit** 또는 새로 신청
5. 평가 대기

### 8.7 App Review 팁

```tips
✅ DO (권장)
- 명확하고 자세한 설명 작성
- 전체 흐름을 보여주는 스크린 레코딩
- 고해상도 비디오 (720p+)
- 테스트 계정 미리 준비
- Privacy Policy에 데이터 사용 명시

❌ DON'T (금지)
- 짧거나 불명확한 설명
- 권한 사용 부분을 보여주지 않는 영상
- 저해상도 비디오
- 테스트 계정 미제공 (요청 시)
- Privacy Policy URL 404 에러
- App Review 없이 Live Mode에서 무단 권한 사용
```

---

## 9. 추가 정보

### 9.1 관련 문서 링크

- [Meta for Developers 공식 사이트](https://developers.facebook.com/)
- [Create an App 가이드](https://developers.facebook.com/docs/development/create-an-app/)
- [Facebook Login 문서](https://developers.facebook.com/docs/facebook-login)
- [App Review 소개](https://developers.facebook.com/docs/resp-plat-initiatives/app-review/introduction)
- [Data Deletion Callback 가이드](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)
- [Basic Settings 참조](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/basic-settings/)
- [Advanced Settings 참조](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/advanced-settings)

### 9.2 주요 변경사항 (2025년 기준)

1. **Privacy Policy 크롤러 접근성 (2025-02-03)**
   - Meta 크롤러가 접근 가능한 공개 URL 필수
   - 지역 차단(Geo-blocking) 금지

2. **User Data Deletion 강화**
   - GDPR 준수 강화
   - Callback URL 등록 권장 → 필수로 변경 추세

3. **대시보드 UI 개선**
   - Use Case 기반 새 인터페이스 도입
   - 더 직관적인 단계별 가이드 제공

### 9.3 보안 체크리스트

```security-checklist
□ App Secret 관리
  □ 환경변수로만 관리
  □ 소스 코드에 포함 금지
  □ GitHub .gitignore 등록 확인

□ OAuth 설정
  □ HTTPS 리디렉션 URI만 사용
  □ State 파라미터로 CSRF 방지
  □ Redirect URI 정확한 매칭

□ 데이터 처리
  □ 수집한 데이터 최소화
  □ 사용자 동의 명시적 확보
  □ Privacy Policy에 명시

□ API 호출
  □ 서버 코드에서만 secret 사용
  □ 클라이언트 요청 최소화
  □ Rate limiting 구현
```

---

## 10. 문제 해결

### Q1: "Privacy Policy URL is not accessible" 에러

**원인**: URL이 공개 가능하지 않거나 지역 차단됨

**해결**:
1. URL이 `https://`로 시작하는지 확인
2. 브라우저에서 URL 직접 접근 테스트
3. VPN 불가 (지역 차단 제거)
4. 서버 방화벽 규칙 확인

### Q2: App Review 반복 거부

**일반 원인**:
- 스크린 레코딩이 권한 사용을 명확히 보여주지 않음
- 앱 설명과 실제 동작이 불일치
- 테스트 계정 정보 오류

**해결**:
1. Meta Community Forums에서 유사 사례 검색
2. 구체적이고 명확한 설명으로 재작성
3. 고품질 스크린 레코딩 재촬영
4. Developer Dashboard Feedback 채널 활용

### Q3: "Valid OAuth Redirect URIs" 등록 후 로그인 실패

**원인**: 등록한 URI와 코드의 redirect_uri 불일치

**해결**:
1. 등록된 URI와 코드의 URI 정확히 비교
2. 슬래시(`/`) 포함 여부 확인
3. 포트 번호 일치 확인
4. 대소문자 구분 (정확히 매치)

**예시**:
```
등록: https://yourapp.com/auth/callback
코드: https://yourapp.com/auth/callback    ✅ OK
코드: https://yourapp.com/auth/Callback    ❌ Case mismatch
코드: https://yourapp.com/auth/callback/   ❌ Extra slash
```

---

**작성자**: Claude Code (Haiku 4.5)  
**최종 업데이트**: 2026-03-19

