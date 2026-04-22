# 번개가입 redirect_uri 검증 에러 분석

## 1. 현황

### 에러 코드 위치
- **파일**: `/workers/api/src/routes/oauth.ts` (L62-71)
- **핸들러**: `GET /oauth/authorize`
- **에러 응답**: `invalid_redirect_uri` - "redirect_uri is not registered"

```typescript
// oauth.ts L62-71
const allowedUris: string[] = shop.allowed_redirect_uris
  ? JSON.parse(shop.allowed_redirect_uris)
  : [];
if (allowedUris.length === 0) {
  return c.json({ error: 'invalid_redirect_uri', message: 'No redirect URIs configured for this shop' }, 400);
}
if (!allowedUris.includes(redirectUri)) {
  return c.json({ error: 'invalid_redirect_uri', message: 'redirect_uri is not registered' }, 400);
}
```

---

## 2. DB에 등록된 allowed_redirect_uris

**Mall ID**: suparain999  
**Shop ID**: 81e0b212-c1fb-48fc-a06a-3e1191f13680

```json
[
  "https://suparain999.cafe24api.com/api/v2/oauth/callback",
  "https://suparain999.cafe24.com/Api/Member/Oauth2ClientCallback/sso/"
]
```

### 데이터 출처
- **생성**: `/workers/api/src/routes/cafe24.ts` (L146-149) - 카페24 앱 설치 시 자동 등록
- **등록 시점**: 사용자가 카페24 앱을 설치하면 자동으로 두 개의 redirect_uri가 DB에 저장됨

---

## 3. 위젯에서 보내는 redirect_uri

### 카페24 SSO 플로우 (정상 흐름)
**파일**: `/workers/api/src/widget/buttons.ts` (L417-428)

```javascript
if (config.sso_callback_uri && typeof MemberAction !== 'undefined' && MemberAction.snsLogin) {
  var hintUrl = this.baseUrl + '/api/widget/hint?client_id=' + ...;
  fetch(hintUrl, { mode: 'cors' }).then(function() {
    MemberAction.snsLogin('sso', returnUrl);
  });
  return;
}
```

**특징**:
- 카페24 네이티브 SSO (`MemberAction.snsLogin`) 호출
- 번개가입 API에서 `redirect_uri` 생성 → 검증하지 않음
- **카페24가 SSO 콜백 URL을 자동으로 설정**

### 폴백 플로우 (비카페24 플랫폼)
**파일**: `/workers/api/src/widget/buttons.ts` (L430-438)

```javascript
var authUrl = this.baseUrl + '/oauth/authorize'
  + '?client_id=' + encodeURIComponent(config.client_id)
  + '&redirect_uri=' + encodeURIComponent(window.location.origin + '/member/login.html')
  + '&provider=' + encodeURIComponent(provider)
  + '&state=' + encodeURIComponent(this.generateState());

window.location.href = authUrl;
```

**특징**:
- redirect_uri = `${window.location.origin}/member/login.html`
- 카페24 SSO가 아닌 경우 직접 OAuth authorize 호출

---

## 4. 문제 분석

### 시나리오 A: 카페24 SSO 흐름 (정상)
```
사용자가 카페24 쇼핑몰 로그인 페이지에서 번개가입 버튼 클릭
  ↓
위젯: MemberAction.snsLogin('sso', returnUrl) 호출 (네이티브)
  ↓
카페24: /Api/Member/Oauth2ClientCallback/sso/?code=...&state=... 으로 리다이렉트
  ↓
이 redirect_uri는 DB에 등록되어 있음 → 검증 통과
```

### 시나리오 B: 직접 authorize 호출 (에러 발생 가능)
```
사용자가 /oauth/authorize 엔드포인트를 직접 호출하거나
외부 플랫폼에서 호출:

GET /oauth/authorize?
  client_id=bg_a7bbf44e29396782063bdddeea259925
  &redirect_uri=<YOUR_ORIGIN>/member/login.html
  &provider=google
  &state=...
  ↓
위젯은 window.location.origin 기반 redirect_uri 생성
  ↓
이 URI가 DB의 allowed_redirect_uris에 없으면 → 에러!
```

---

## 5. 핵심 문제

### 원인
1. **카페24 SSO는 자동으로 작동** - 위젯이 네이티브 호출 사용 → redirect_uri 검증 우회
2. **폴백 플로우는 redirect_uri 검증 필요** - 하지만 `window.location.origin`으로 생성한 URI가 DB에 없음
3. **allowed_redirect_uris는 카페24 SSO용만 등록** - `/member/login.html` 같은 폴백용 URI는 미등록

### DB의 allowed_redirect_uris 분석
```json
[
  "https://suparain999.cafe24api.com/api/v2/oauth/callback",
  "https://suparain999.cafe24.com/Api/Member/Oauth2ClientCallback/sso/"
]
```

- ✅ 카페24 SSO 콜백: 등록됨
- ❌ 폴백 (로그인 페이지): 미등록

---

## 6. 에러 시나리오

```
1. 사용자가 직접 또는 외부에서 authorize 엔드포인트 호출
2. redirect_uri = "https://suparain999.cafe24.com/member/login.html" (폴백용)
3. DB 조회: ["https://suparain999.cafe24api.com/...", "https://suparain999.cafe24.com/Api/Member/..."]
4. 일치 안 함 → 에러 반환
```

---

## 7. 해결 방안

### 옵션 1: allowed_redirect_uris에 폴백 URI 추가 (권장)
DB의 allowed_redirect_uris를 확장:

```json
[
  "https://suparain999.cafe24api.com/api/v2/oauth/callback",
  "https://suparain999.cafe24.com/Api/Member/Oauth2ClientCallback/sso/",
  "https://suparain999.cafe24.com/member/login.html"
]
```

**실행**:
```bash
UPDATE shops 
SET allowed_redirect_uris = '[
  "https://suparain999.cafe24api.com/api/v2/oauth/callback",
  "https://suparain999.cafe24.com/Api/Member/Oauth2ClientCallback/sso/",
  "https://suparain999.cafe24.com/member/login.html"
]'
WHERE mall_id = 'suparain999' AND platform = 'cafe24';
```

### 옵션 2: 카페24 앱 설치 시 자동 추가
`/workers/api/src/routes/cafe24.ts` (L146-149) 수정:

```typescript
allowed_redirect_uris: [
  `https://${mallId}.cafe24api.com/api/v2/oauth/callback`,
  `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientCallback/sso/`,
  `https://${mallId}.cafe24.com/member/login.html`,  // 추가
],
```

### 옵션 3: authorize 검증 로직 유연화 (미권장)
와일드카드 매칭 (보안 위험):
```typescript
if (!allowedUris.some(uri => redirectUri.startsWith(uri))) {
  // 검증 실패
}
```

---

## 8. 정리

| 항목 | 상태 | 설명 |
|------|------|------|
| **DB 등록 URI** | ✅ 정상 | 카페24 SSO용 2개 URI 정상 등록 |
| **카페24 SSO** | ✅ 정상 | 네이티브 호출이므로 검증 우회 |
| **폴백 플로우** | ⚠️ 위험 | redirect_uri 검증이 필요하지만 미등록 |
| **에러 원인** | 🔴 명확 | 폴백용 /member/login.html이 DB에 없음 |
| **해결책** | 🟢 간단 | DB의 allowed_redirect_uris에 폴백 URI 추가 |

