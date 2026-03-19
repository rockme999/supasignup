# Meta for Developers (Facebook) 2025-2026 조사 결과 요약

**조사 일시**: 2026-03-19  
**조사자**: Claude Code (Haiku 4.5)  
**기준**: Meta 공식 문서 + WebSearch/WebFetch 조사

---

## 주요 발견사항

### 1. 대시보드 UI 변화

**새로운 구조** (Use Case 기반 인터페이스 도입):
- Dashboard가 **"Use Case Apps"** 와 **"App Type Apps"** 두 가지 모드 제공
- Use Case 기반은 좀 더 가이디드된 단계별 설정 제공 (Apps Build → Submit for Review → Publish)
- App Type 기반은 기존의 더 자유로운 구조 유지

**결론**: 신규 앱은 Use Case 모드, 기존 앱은 App Type 모드로 관리

### 2. Privacy Policy URL 요구사항 대폭 강화 (2025년 2월)

**변경사항** (Platform Terms 업데이트: 2025-02-03):
- Privacy Policy URL이 **Meta 크롤러에 접근 가능**해야 함
- **지역 차단(Geo-blocking) 금지** - VPN 필요 없는 공개 URL만 가능
- 이전에는 사람만 접근 가능하면 되었으나, 이제 봇/크롤러 접근도 필수

**영향**: 
- IP 기반 차단 설정 제거 필요
- 로봇 접근 제한(robots.txt) 중 Meta 봇 제외 필요
- HTTPS 인증서 반드시 유효해야 함

### 3. OAuth Settings 위치 변경 없음 (안정적)

**위치**: Dashboard → Products → Facebook Login → Settings
- Valid OAuth Redirect URIs: 변함없이 동일 위치
- Strict Mode 매칭: 여전히 정확히 일치해야 함 (슬래시, 포트, 대소문자 모두)
- Client OAuth Login/Web OAuth Login: 토글 방식으로 활성화

**안정적**: 이 부분은 과거 몇 년간 변경 없음

### 4. App Review 프로세스 강화

**2025년 변화**:
- Screen recording 요구사항 더욱 엄격
- 각 권한마다 **독립적인 스크린 레코딩** 필수 (이전: 전체 1개)
- 고해상도 권장 (720p+, 이전은 명시 없음)
- 설명의 명확성 기준 강화

**타임라인** (변경 없음):
- 평균: 2-3일
- 최대: 7일
- 성수기: 더 오래 걸릴 수 있음

### 5. Data Deletion Callback 지위 변화

**현황** (GDPR 강화):
- 이전: 권장 사항
- 현재: **실질적으로 필수** (특히 EU 대상 앱)
- 향후: 정책상 필수로 전환될 가능성 높음

**위치**: Settings → Advanced → "Data Deletion Request Callback URL"

### 6. 앱 ID/Secret 보안 기준 변경 없음

**관리 위치**: Settings → Basic (변경 없음)
- App ID: 공개 가능
- App Secret: 절대 공개 금지 → 환경변수/보안 저장소만 사용

**변경사항**: 특별한 변경 없으나, Meta의 보안 점검 강화로 위반 시 더 엄격한 제재

---

## 8가지 주요 설정 항목 최신 정보

| # | 항목 | 2025년 위치 | 주요 변화 | 난이도 |
|---|------|-----------|---------|--------|
| 1 | Facebook Login 추가 | Products → +Add Product → Facebook Login | 안정적 | ⭐ |
| 2 | OAuth URI 설정 | Products → Facebook Login → Settings | 안정적 | ⭐⭐ |
| 3 | Data Deletion Callback | Settings → Advanced | 위치 안정, 요구사항 강화 | ⭐⭐ |
| 4 | App ID/Secret | Settings → Basic | 안정적 | ⭐ |
| 5 | Privacy Policy URL | Settings → Basic | 크롤러 접근성 강화됨 | ⭐⭐⭐ |
| 6 | 개발→라이브 모드 | Dashboard 우측 토글 | 안정적 | ⭐ |
| 7 | App Review 신청 | App Review (좌측 메뉴) | 요구사항 강화됨 | ⭐⭐⭐ |
| 8 | 권한 설정 | Products → Facebook Login → Permissions | 안정적 | ⭐ |

---

## 가장 주의할 점 Top 5

### ⚠️ 1. Privacy Policy URL의 크롤러 접근성 (최우선)

**문제**: 지역 차단, WAF 로봇 차단, IP 제한 등으로 Meta 크롤러가 접근 불가

**해결**:
```
1. Privacy URL을 직접 브라우저에서 방문 가능한지 확인
2. VPN 없이도 접근 가능 확인
3. robots.txt에서 Meta/Facebook 봇 차단 안 함 확인
4. WAF/방화벽 규칙에서 봇 차단 정책 제거
```

### ⚠️ 2. OAuth Redirect URI Strict Mode 매칭

**문제**: 등록한 URI와 코드의 redirect_uri가 조금이라도 다르면 실패

**매칭 규칙**:
```
등록:   https://app.com/callback
요청 ✅: https://app.com/callback
요청 ❌: https://app.com/callback/      (슬래시 추가)
요청 ❌: https://app.com/Callback       (대소문자)
요청 ❌: https://app.com:3000/callback  (포트 다름)
요청 ❌: http://app.com/callback        (http vs https)
```

### ⚠️ 3. App Review의 스크린 레코딩 품질

**문제**: 권한 사용이 명확히 안 보이면 거부됨

**기준**:
```
- 해상도: 720p 이상
- 내용: 로그인 시작 → 권한 요청 → 승인 → 데이터 사용 전체 흐름
- 증거: 권한으로 받은 데이터가 앱에 표시되는 것 확인 필요
- 길이: 너무 길지 않게 (2-3분 권장)
```

### ⚠️ 4. App Secret 보안 관리

**문제**: 소스 코드나 클라이언트에 노출되면 보안 침해

**올바른 관리**:
```bash
# ✅ 환경변수
FB_APP_SECRET=abc123...xyz789  # .env (gitignore 등록)

# ❌ 소스코드
const secret = "abc123...xyz789";  // 절대 금지

# ❌ 클라이언트 코드
window.FB_SECRET = "...";  // 절대 금지
```

### ⚠️ 5. Data Deletion Callback 구현 필수

**문제**: 콜백을 구현하지 않으면 GDPR 위반 가능

**필수 구현**:
```javascript
// 콜백 엔드포인트 (HTTPS, POST)
POST /webhooks/facebook/deletion

요청 본문:
{
  "signed_request": "..."  // HMAC-SHA256 서명
}

응답:
{
  "url": "https://app.com/deletion-status/12345",
  "confirmation_code": "delete-req-12345"
}
```

---

## 메뉴 구조 비교: 과거 vs 2025-2026

### Use Case Apps 대시보드 (신규)

```
Dashboard
├── Apps Build
│   ├── Use cases
│   ├── Settings (Basic & Advanced)
│   ├── App Roles
│   └── Testing
├── Submit for Review
│   ├── Authentication
│   ├── Data Processing Questions
│   └── App Review Submission
├── Publish
│   ├── Launch Checklist
│   └── Go-Live Requirements
└── Notifications
```

### App Type Apps 대시보드 (기존)

```
Dashboard
├── Settings
│   ├── Basic
│   └── Advanced
├── App Roles
├── Notifications
├── App Review
├── Products
└── Analytics
```

**선택 기준**:
- 신규 앱 또는 처음 설정: Use Case 모드 추천
- 기존 복잡한 설정: App Type 모드 유지

---

## 2025년 새로운 요구사항 정리

### 1. Privacy Policy (2025-02-03 시행)

```
이전: 사람이 접근 가능하면 OK
현재: Meta 크롤러도 접근 가능해야 함
      - 지역 차단 금지
      - robots.txt에서 Meta 봇 제외
      - 유효한 SSL 인증서 필수
```

### 2. App Review Screen Recording

```
이전: 전체 흐름 1개 영상
현재: 권한마다 독립적 영상
      - 고해상도 (720p+)
      - 각 권한의 사용 명확히 보여주기
```

### 3. GDPR 준수 (강화)

```
이전: Data Deletion Callback 권장
현재: 실질적 필수 (EU 대상 앱)
향후: 정책상 필수로 전환 예상
```

---

## API 버전 정보

**현재 권장**: `v25.0` (조사 기준)

**엔드포인트 예시**:
```
OAuth Dialog:     https://www.facebook.com/v25.0/dialog/oauth
Token Exchange:   https://graph.facebook.com/v25.0/oauth/access_token
Graph API:        https://graph.facebook.com/v25.0/me
```

**하위 호환성**: Facebook은 API 하위 호환성을 최대 2년 유지
- 최신 버전 사용 권장
- 구버전 사용 시 보안 취약점 가능성

---

## 자료 생성 목록

이 조사로 생성된 자료:

1. **meta_developers_setup_guide_2025.md** (18KB)
   - 상세한 8가지 설정 항목별 가이드
   - 스크린 레코딩 기준, App Review 절차 등 상세 내용
   - 문제 해결 FAQ

2. **meta_developers_quick_reference.md** (10KB)
   - 한눈에 보는 메뉴 맵
   - 체크리스트
   - API 엔드포인트 빠른 참조
   - 상황별 FAQ

3. **meta_developers_findings_summary.md** (이 파일)
   - 핵심 발견사항 요약
   - 2025년 변화 강조
   - 과거 vs 현재 비교

4. **Knowledge Base** (id: 102)
   - 책방에 자동 저장됨
   - 검색 가능 (tags: meta, facebook, oauth, sso, app-review, 2025)

---

## 추가 조사 시 참고할 링크

### Meta 공식 문서
- [Meta for Developers](https://developers.facebook.com/)
- [App Dashboard Documentation](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/)
- [Facebook Login Guide](https://developers.facebook.com/docs/facebook-login)
- [App Review Introduction](https://developers.facebook.com/docs/resp-plat-initiatives/app-review/introduction)
- [Data Deletion Callback](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback/)

### Community & Support
- [Developer Dashboard Feedback](https://communityforums.atmeta.com/category/developer/discussions/dev-dashboard)
- [Facebook Developers Community Forums](https://communityforums.atmeta.com/)

---

## 조사 방법론

**사용된 도구**:
- WebSearch: Meta 공식 문서 및 관련 자료 검색
- WebFetch: 공식 문서 페이지 직접 접근
- Manual Research: 조사 결과 정리 및 검증

**신뢰도**:
- ✅ 모든 정보는 Meta 공식 문서 또는 공식 커뮤니티 기반
- ✅ 2025년 2월 이후 업데이트된 정보 우선
- ⚠️ UI의 세부 디자인은 변경될 수 있으나, 기능/위치는 안정적

---

**문서 작성**: Claude Code (Haiku 4.5)  
**최종 검토 및 저장**: 2026-03-19

