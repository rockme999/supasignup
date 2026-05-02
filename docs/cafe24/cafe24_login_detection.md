# 카페24 로그인 상태 감지 방법

> **작성일**: 2026-04-04 조사 완료
> **프로젝트**: supasignup (번개가입)
> **목적**: 카페24 쇼핑몰에서 JavaScript로 사용자 로그인 상태를 감지하는 모든 방법 정리
> **대상**: Desktop + Mobile skin 모두 포함

---

## 요약

카페24에서는 4가지 방법으로 로그인 상태를 감지할 수 있습니다:

| 방법 | 방식 | Desktop | Mobile | 비고 |
|------|------|---------|--------|------|
| **쿠키 확인** | `iscache` 쿠키 | ✅ | ✅ | 가장 직접적이고 빠름 |
| **Layout 모듈** | 조건부 렌더링 | ✅ | ✅ | Smart Design 템플릿 변수 |
| **localStorage** | 로그인 유지 데이터 | ✅ | ✅ | 모바일 로그인 지속성 |
| **DOM 구조** | xans-layout 요소 | ✅ | ✅ | 스타일 변경으로 표시 |

---

## 1. 쿠키 기반 감지 (추천)

### 1.1 원리

카페24는 로그인/비로그인 상태를 `iscache` 쿠키로 관리합니다:
- **로그인됨**: `iscache=F` (또는 없음)
- **로그아웃**: `iscache` 쿠키 존재하지 않음

### 1.2 감지 코드

```javascript
// 기본 방법 (권장)
const isLogin = document.cookie.match(/(?:^| |;)iscache=F/) ? true : false;

// 또는 더 명시적으로
const isLogin = /(?:^| |;)iscache=F/.test(document.cookie);

// 또는 쿠키 파싱 함수 사용
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

const cacheValue = getCookie('iscache');
const isLogin = cacheValue === 'F';
```

### 1.3 장점 & 단점

**장점:**
- ✅ 동기 처리 가능 (즉시 결과)
- ✅ DOM 로드 완료 전에도 확인 가능
- ✅ 가장 빠른 성능
- ✅ Desktop & Mobile 동일 동작

**단점:**
- ❌ 쿠키 삭제 시 감지 실패
- ❌ Private browsing 모드에서 신뢰도 낮음
- ❌ 14일 미접속 시 자동 로그아웃 (쿠키 유지 설정에 따름)

### 1.4 주의사항

```javascript
// ❌ 피해야 할 방법들
document.cookie.includes('iscache=F')  // 다른 쿠키명에 'iscache' 포함 시 오탐지

// ✅ 올바른 방법
/(?:^| |;)iscache=F/.test(document.cookie)  // 정확한 regex
```

---

## 2. Layout 모듈 기반 감지

### 2.1 원리

카페24 Smart Design에서는 로그인 상태에 따라 다른 HTML을 렌더링하는 2개 모듈을 제공합니다:

- **`Layout_statelogoff`** — 비로그인 시 표시 (로그인/가입 링크)
- **`Layout_statelogon`** — 로그인 시 표시 (사용자명, 로그아웃, 마이페이지)

### 2.2 감지 코드

#### 방법 A: 요소 가시성 확인 (권장)

```javascript
// Layout_statelogon 요소가 보이면 → 로그인
const isLogin = !!document.querySelector('.xans-layout-statelogon') &&
                window.getComputedStyle(
                  document.querySelector('.xans-layout-statelogon')
                ).display !== 'none';
```

#### 방법 B: 특정 요소 존재 확인

```javascript
// 로그인된 사용자만 보이는 요소 (예: 로그아웃 버튼)
const isLogin = !!document.querySelector('[href*="logout"]');

// 또는 마이페이지 링크
const isLogin = !!document.querySelector('a[href*="mypage"]');
```

#### 방법 C: 템플릿 변수 (Smart Design 템플릿 내에서만)

```html
<!-- Smart Design 템플릿에서만 사용 가능 -->
<div class="layout-statelogon">
  <strong>{$name}</strong>님 반갑습니다!
  <a href="{$action_logout}">로그아웃</a>
</div>
```

사용 가능한 변수:
- `{$name}` — 로그인 회원명
- `{$id}` — 로그인 회원 ID (requires JavaScript 동적 처리)
- `{$basket_count}` — 장바구니 개수
- `{$action_logout}` — 로그아웃 URL

### 2.3 DOM 구조 예시

```html
<!-- 로그인 상태 -->
<div class="layout-statelogon" style="display: block;">
  <span>member_name</span>님
  <a href="/exec/front/Member/logout/">로그아웃</a>
  <a href="/exec/front/Member/mypage/">마이페이지</a>
</div>

<div class="layout-statelogoff" style="display: none;">
  <!-- 숨김 -->
</div>

<!-- 비로그인 상태 -->
<div class="layout-statelogon" style="display: none;">
  <!-- 숨김 -->
</div>

<div class="layout-statelogoff" style="display: block;">
  <a href="/exec/front/Member/login/">로그인</a>
  <a href="/exec/front/Member/join/">가입</a>
</div>
```

### 2.4 장점 & 단점

**장점:**
- ✅ 공식 카페24 모듈 (신뢰도 높음)
- ✅ DOM이 충분히 로드된 후 실행하면 안정적
- ✅ 모바일 스킨에서도 동작

**단점:**
- ❌ DOM 로드 완료 필요 (비동기)
- ❌ CSS 숨김 방식이므로 `display: block !important` 오버라이드 시 오탐지
- ❌ 커스텀 스킨에서는 해당 모듈을 사용하지 않을 수 있음

---

## 3. localStorage 기반 감지

### 3.1 원리

카페24 모바일에서 **"로그인 상태 유지"** 기능을 사용하면, localStorage에 로그인 정보를 저장합니다.

관리자 설정:
```
[관리자] 쇼핑몰 설정 > 사이트 설정 > 쇼핑몰 환경 설정 
→ 모바일(탭) > 기본 설정(탭) 
→ '로그인 상태 유지' = '사용함'
```

### 3.2 감지 코드

```javascript
// localStorage에서 로그인 정보 확인
function isLoginFromLocalStorage() {
  // 카페24가 저장하는 키 (예상)
  const loginData = localStorage.getItem('seq_no_key');
  const expiryData = localStorage.getItem('seq_no_key_expiry');
  
  if (!loginData || !expiryData) {
    return false;
  }
  
  // 만료 시간 확인
  const expiry = parseInt(expiryData, 10);
  const now = Date.now();
  
  return expiry > now;
}
```

### 3.3 저장되는 데이터

| 키 | 예상 값 | 용도 |
|----|--------|------|
| `seq_no_key` | `"12345"` | 회원 일련번호 |
| 만료 시간 | timestamp | 로그인 지속성 기한 |

**실제 키명은 카페24 버전에 따라 다를 수 있으므로 개발자 도구에서 확인 필요합니다.**

### 3.4 제한사항

```
모바일 "로그인 상태 유지" 기능 조건:
- ✅ SSL(HTTPS) 환경 필수
- ✅ 모바일 스킨에서만 작동
- ❌ PC 디자인(반응형 포함)에서는 미지원
- ❌ 쿠키 삭제 시 무효화
- ❌ 14일 미접속 시 자동 로그아웃
```

### 3.5 장점 & 단점

**장점:**
- ✅ 모바일 환경에서 지속적인 로그인 상태 유지
- ✅ 서버 왕복 없음 (클라이언트만 확인)
- ✅ 5MB까지 저장 가능 (충분한 용량)

**단점:**
- ❌ 모바일 로그인 상태 유지 기능이 활성화되어야 함
- ❌ localStorage 지원하지 않는 환경에서는 사용 불가
- ❌ 개발자 도구로 수정 가능 (신뢰도 낮음)

---

## 4. DOM 구조 기반 감지

### 4.1 xans-layout 클래스

카페24는 로그인 상태를 나타내는 여러 DOM 요소를 제공합니다:

```html
<!-- 로그인/비로그인 상태를 구분하는 요소 -->
<div class="xans-layout">
  <!-- 로그인 상태에서만 표시 -->
  <div class="xans-layout-statelogon">
    ...
  </div>
  
  <!-- 비로그인 상태에서만 표시 -->
  <div class="xans-layout-statelogoff">
    ...
  </div>
</div>
```

### 4.2 감지 코드

```javascript
// 접근 방법 1: xans-layout-statelogon 요소 확인
function isLoginViaDOM() {
  const stateLogon = document.querySelector('.xans-layout-statelogon');
  const stateLogoff = document.querySelector('.xans-layout-statelogoff');
  
  if (stateLogon && stateLogoff) {
    const logonVisible = window.getComputedStyle(stateLogon).display !== 'none';
    const logoffVisible = window.getComputedStyle(stateLogoff).display !== 'none';
    
    return logonVisible && !logoffVisible;
  }
  
  // fallback: statelogon 요소만 있어도 로그인 상태로 가정
  return !!stateLogon;
}

// 접근 방법 2: 로그인/로그아웃 버튼으로 판별
function isLoginViaButton() {
  const logoutBtn = document.querySelector('a[href*="logout"]');
  const loginBtn = document.querySelector('a[href*="login"]');
  
  if (logoutBtn) {
    const logoutVisible = window.getComputedStyle(logoutBtn).display !== 'none';
    return logoutVisible;
  }
  
  return !!loginBtn;
}
```

### 4.3 주의사항

```javascript
// ❌ 피해야 할 방법
document.body.classList.contains('is-logged-in')  // 커스텀 클래스 기준

// ✅ 카페24 공식 요소 사용
document.querySelector('.xans-layout-statelogon')  // 공식 요소
```

### 4.4 모바일 스킨에서의 변화

모바일과 데스크톱에서 DOM 구조가 다를 수 있으므로:

```javascript
// 반응형 체크
function isMobileViewport() {
  return window.innerWidth < 768;
}

// 디바이스별로 다른 선택자 사용
function getLoginIndicator() {
  if (isMobileViewport()) {
    return document.querySelector('.xans-layout-statelogon');
  } else {
    return document.querySelector('.layout-statelogon');
  }
}
```

---

## 5. 추천 구현 방식

### 5.1 최적의 조합 (프로덕션)

```javascript
class Cafe24LoginDetector {
  static detect() {
    // 1순위: 쿠키 확인 (가장 빠름)
    if (this.detectByCookie()) {
      return true;
    }
    
    // 2순위: DOM 요소 확인 (DOM 로드 필수)
    if (document.readyState !== 'loading') {
      if (this.detectByDOM()) {
        return true;
      }
    }
    
    // 3순위: localStorage (모바일)
    if (this.detectByLocalStorage()) {
      return true;
    }
    
    return false;
  }
  
  static detectByCookie() {
    return /(?:^| |;)iscache=F/.test(document.cookie);
  }
  
  static detectByDOM() {
    const stateLogon = document.querySelector('.xans-layout-statelogon');
    if (!stateLogon) return false;
    
    return window.getComputedStyle(stateLogon).display !== 'none';
  }
  
  static detectByLocalStorage() {
    const seq = localStorage.getItem('seq_no_key');
    if (!seq) return false;
    
    // 만료 시간이 있다면 확인
    const expiry = localStorage.getItem('seq_no_key_expiry');
    if (expiry && parseInt(expiry, 10) < Date.now()) {
      return false;
    }
    
    return true;
  }
}

// 사용법
const isLogin = Cafe24LoginDetector.detect();
console.log('로그인 상태:', isLogin);
```

### 5.2 실시간 감시

```javascript
class Cafe24LoginMonitor {
  constructor(callback) {
    this.callback = callback;
    this.previousState = null;
    
    // 초기 상태 감지
    this.check();
    
    // 쿠키 변화 감시
    this.watchCookie();
    
    // DOM 변화 감시
    this.watchDOM();
  }
  
  check() {
    const currentState = Cafe24LoginDetector.detect();
    
    if (currentState !== this.previousState) {
      this.previousState = currentState;
      this.callback(currentState);
    }
  }
  
  watchCookie() {
    // 쿠키 변화는 직접 감지 불가능하므로 폴링 사용
    setInterval(() => this.check(), 1000);
  }
  
  watchDOM() {
    // DOM 변화 감시
    const observer = new MutationObserver(() => this.check());
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }
}

// 사용법
new Cafe24LoginMonitor((isLogin) => {
  if (isLogin) {
    console.log('로그인됨');
  } else {
    console.log('로그아웃됨');
  }
});
```

### 5.3 Page Load 타이밍별

```javascript
// 페이지 로드 직후 (가장 빠름)
const isLoginImmediate = /(?:^| |;)iscache=F/.test(document.cookie);
console.log('쿠키 기반:', isLoginImmediate);

// DOM 로드 후
document.addEventListener('DOMContentLoaded', () => {
  const isLoginDOM = !!document.querySelector('.xans-layout-statelogon:not([style*="display: none"])');
  console.log('DOM 기반:', isLoginDOM);
});

// 전체 리소스 로드 후
window.addEventListener('load', () => {
  const isLoginFinal = Cafe24LoginDetector.detect();
  console.log('최종:', isLoginFinal);
});
```

---

## 6. 모바일 스킨 특이사항

### 6.1 모바일 전용 기능

```
카페24 모바일 환경 특징:
1. 로그인 상태 유지 (Keep-alive)
   - localStorage 사용
   - 관리자 설정 필요 ([모바일] > [로그인 상태 유지])
   
2. 인앱 브라우저 (In-app Browser)
   - 카카오톡, 네이버 앱 내 브라우저
   - localStorage 독립적 동작 가능
   - 쿠키는 공유될 수 있음
   
3. Private Browsing
   - Safari, Chrome 비공개 탭
   - localStorage 접근 불가능할 수 있음
   - 쿠키는 정상 작동
```

### 6.2 모바일별 감지 전략

```javascript
function detectLoginMobile() {
  // iOS Safari Private Browsing 감지
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
  } catch (e) {
    // Private mode → 쿠키로만 확인
    return /(?:^| |;)iscache=F/.test(document.cookie);
  }
  
  // 일반 모바일
  // 1. localStorage 확인 (가장 신뢰도 높음)
  if (localStorage.getItem('seq_no_key')) {
    return true;
  }
  
  // 2. 쿠키 확인
  if (/(?:^| |;)iscache=F/.test(document.cookie)) {
    return true;
  }
  
  // 3. DOM 확인
  if (document.querySelector('.xans-layout-statelogon:not([style*="display: none"])')) {
    return true;
  }
  
  return false;
}
```

---

## 7. 카페24 Front SDK와의 통합

### 7.1 SDK 회원 감지

Front JavaScript SDK에서 제공하는 공식 방법:

```javascript
// ScriptTag 환경에서만 사용 가능
CAFE24API.init({
  client_id: 'YOUR_CLIENT_ID',
  version: '2022-12-01'
});

// 회원 ID 조회 (로그인/비로그인 구분)
CAFE24API.getCustomerIDInfo(function(err, res) {
  if (err) {
    console.log('에러:', err);
    return;
  }
  
  // 로그인 상태 확인
  const isLogin = res.is_member === 'T';  // T=회원, F=비회원
  console.log('로그인 상태:', isLogin);
  
  // 회원 ID
  console.log('회원 ID:', res.customer_id);  // 예: "12345"
});

// 현재 로그인 SNS 확인
CAFE24API.getLoginProvider(function(err, res) {
  if (!err) {
    // provider: "sso" | "kakao" | "naver" | "google" | null
    console.log('로그인 방식:', res.provider);
  }
});
```

### 7.2 SDK 장점

```
✅ 공식 API (신뢰도 높음)
✅ 회원/비회원 정확히 구분
✅ SNS 로그인 여부 파악
✅ 콜백 기반 (동기 처리 가능)

❌ ScriptTag 환경 전용
❌ SDK 초기화 필수
❌ Scope 필요 (mall.read_application)
```

---

## 8. 비교 표

| 방법 | 속도 | 정확도 | 환경 | 구현 난이도 | 추천도 |
|------|------|--------|------|-----------|--------|
| 쿠키 (`iscache`) | ⚡⚡⚡ | ⭐⭐⭐ | 모두 | ⭐ | ⭐⭐⭐ |
| Layout 모듈 | ⚡⚡ | ⭐⭐⭐ | 모두 | ⭐⭐ | ⭐⭐⭐ |
| localStorage | ⚡⚡ | ⭐⭐ | 모바일만 | ⭐⭐ | ⭐⭐ |
| DOM 요소 | ⚡⚡ | ⭐⭐ | 모두 | ⭐⭐ | ⭐⭐ |
| Front SDK | ⚡ | ⭐⭐⭐ | ScriptTag | ⭐⭐⭐ | ⭐⭐⭐ |

---

## 9. 구현 체크리스트

- [ ] 쿠키 기반 감지 구현 (`iscache=F`)
- [ ] Layout 모듈 DOM 선택자 확인
- [ ] 모바일 viewport에서 테스트
- [ ] Private browsing 모드 테스트
- [ ] localStorage 만료 시간 로직 추가
- [ ] 실시간 상태 변경 감시 구현
- [ ] Front SDK 활용 검토 (ScriptTag 환경)
- [ ] 쿠키 삭제 후 감지 재확인
- [ ] 14일 미접속 시나리오 테스트
- [ ] 인앱 브라우저(카카오/네이버) 호환성 검증

---

## ⚠️ 카페24 자체 인식 불일치 — `statelogon` true / `MemberAction.isLogin()` false (2026-05-02 검증)

### 증상
회원이 한 번 로그인한 뒤 명시적 로그아웃 없이 시간이 지나면 다음 상태가 동시에 나타날 수 있음:
- `iscache=F` 쿠키 살아있음
- `<body>`에 `xans-layout-statelogon` 클래스가 붙어 카페24 헤더가 "로그인됨"(로그아웃/마이페이지 메뉴) 표시
- 그러나 `MemberAction.isLogin()` 은 `false`

즉 **카페24 서버의 layout 렌더는 "로그인됨"인데 클라이언트 SDK는 "로그아웃됨"** — 카페24 내부적으로 일관성 없음.

### 운영자 시점에서의 헷갈림
- 운영자가 로그인 페이지에 있다가 새로고침만 했는데 헤더가 "로그아웃 → 마이페이지"로 바뀐 것처럼 보임
- 실제로는 **이전 로그인 세션 쿠키(`PHPSESSVERIFY` / `ECSESSID` / `iscache=F`)가 잔존하여** 카페24가 페이지를 statelogon으로 렌더한 것
- 번개가입의 SSO 흐름과 무관 (네트워크 탭에서 `/oauth/sso-start` 호출 없음으로 확인)

### 진단 방법
콘솔에서:
```js
document.cookie.split(';').filter(s => /iscache|MEMBER|EC_USE/.test(s));
!!document.querySelector('.xans-layout-statelogon');
typeof MemberAction !== 'undefined' && MemberAction.isLogin && MemberAction.isLogin();
```
세 값이 일관되지 않으면(특히 1번에 `iscache=F` 살아있고 2번 true + 3번 false) 본 현상.

### 해결
- 카페24 측 원인이라 번개가입에서 직접 패치 불가
- 시크릿/프라이빗 창에서 재현 안 됨 (회원 세션 쿠키 없음)
- 실제 로그아웃이 필요하면 카페24 헤더의 "로그아웃" 누르면 `iscache=F` 사라지고 statelogoff로 복귀

### 번개가입 측 영향
- `widget/buttons.ts`의 자동 returnUrl redirect는 **트리거되지 않음** — `bg_return_url`이 만료(3분 TTL) 또는 u==='/' 폴백이라 safe 검증을 통과 못 함
- `widget/auth/return-url.ts` `getReturnUrl`은 u==='/' 인 데드 데이터를 즉시 정리하도록 보강 (운영자가 메인 페이지에서 로그인 페이지로 이동한 케이스의 잔존 데이터를 깔끔히 제거)

---

## 10. 참고 자료

- [카페24 Smart Design Support - Login State Module](https://sdsupport.cafe24.com/module/layout/statelog.html)
- [카페24 Front JavaScript SDK](https://developers.cafe24.com/app/front/common/frontsdk)
- [카페24 로그인 상태 유지 기능 (Help Center)](https://support.cafe24.com/hc/ko/articles/8461643656345-%EC%87%BC%ED%95%91%EB%AA%B0%EC%97%90-%EC%9E%90%EB%8F%99%EC%9C%BC%EB%A1%9C-%EB%A1%9C%EA%B7%B8%EC%9D%B8%ED%95%A0-%EC%88%98-%EC%9E%88%EB%82%98%EC%9A%94)
- [카페24 모바일 환경 설정 (Service Guide)](https://serviceguide.cafe24.com/ko_KR/MB.MS.html)
- [카페24 코딩 팁 정보](https://unto.kr/blog/coding-info/cafe24-coding-tip/)

