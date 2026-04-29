/**
 * return-url.ts — URL 복귀, 로그인 상태 감지, 프로바이더 기록
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   saveReturnUrl()      — 이전 페이지 URL 저장 (login/join 페이지 제외)
 *   getReturnUrl()       — 저장된 복귀 URL 반환 (없으면 /index.html)
 *   isUserLoggedIn()     — 카페24 로그인 상태 감지 (쿠키/DOM/MemberAction)
 *   checkLoginHistory()  — 로그인 이력 기록 + 현재 로그인 여부 반환
 *   hasLoginHistory()    — 과거 로그인 이력 확인
 *   saveLastProvider()   — URL bg_provider 파라미터 읽어 localStorage 저장 후 URL 정리
 */
export function getReturnUrlJs(): string {
  return `
  // 로그인/가입/동의 페이지가 아닌 이전 페이지를 저장
  BGWidget.prototype.saveReturnUrl = function() {
    try {
      var ref = document.referrer;
      if (!ref) return;
      // new URL() 대신 <a> 태그를 이용한 ES5 URL 파싱
      var refA = document.createElement('a');
      refA.href = ref;
      var refPath = refA.pathname.toLowerCase();
      // 로그인/가입/동의 페이지는 저장하지 않음
      var skipPages = ['/member/login', '/member/join', '/member/agreement', '/member/modify'];
      for (var i = 0; i < skipPages.length; i++) {
        if (refPath.indexOf(skipPages[i]) >= 0) return;
      }
      localStorage.setItem('bg_return_url', refA.pathname + refA.search);
    } catch(e) {}
  };

  // 저장된 복귀 URL 반환 (없으면 메인 페이지)
  BGWidget.prototype.getReturnUrl = function() {
    try {
      var saved = localStorage.getItem('bg_return_url');
      if (saved && saved !== '/') return saved;
    } catch(e) {}
    return '/index.html';
  };

  // 카페24 로그인 상태 감지 (공통)
  BGWidget.prototype.isUserLoggedIn = function() {
    // 방법 1: iscache=F 쿠키 (카페24 로그인 시 설정, 가장 확실)
    try {
      if (/(?:^|; ?)iscache=F/.test(document.cookie)) return true;
    } catch (e) {}
    // 방법 2: 로그인 상태 레이아웃 요소
    if (document.querySelector('.xans-layout-statelogon')) return true;
    // 방법 3: MemberAction 전역 객체 (로그인 페이지에서만 존재)
    try {
      if (typeof MemberAction !== 'undefined' && MemberAction.isLogin && MemberAction.isLogin()) {
        return true;
      }
    } catch (e) {}
    return false;
  };

  // 로그인 이력 기록 및 확인
  BGWidget.prototype.checkLoginHistory = function() {
    var loggedIn = this.isUserLoggedIn();
    // 현재 로그인 상태면 이력 기록
    if (loggedIn) {
      try { localStorage.setItem('bg_has_logged_in', '1'); } catch (e) {}
    }
    return loggedIn;
  };

  BGWidget.prototype.hasLoginHistory = function() {
    try { return localStorage.getItem('bg_has_logged_in') === '1'; } catch (e) {}
    return false;
  };

  BGWidget.prototype.saveLastProvider = function() {
    try {
      // URLSearchParams 대신 직접 쿼리스트링 파싱 (ES5)
      var search = window.location.search;
      var provider = null;
      if (search) {
        var qs = search.charAt(0) === '?' ? search.slice(1) : search;
        var pairs = qs.split('&');
        for (var qi = 0; qi < pairs.length; qi++) {
          var eq = pairs[qi].indexOf('=');
          if (eq === -1) continue;
          var key = decodeURIComponent(pairs[qi].slice(0, eq).replace(/\\+/g, ' '));
          if (key === 'bg_provider') {
            provider = decodeURIComponent(pairs[qi].slice(eq + 1).replace(/\\+/g, ' '));
            break;
          }
        }
      }
      if (provider) {
        localStorage.setItem('bg_last_provider', provider);
        // Clean URL: bg_provider 파라미터 제거
        var newPairs = [];
        if (search) {
          var qs2 = search.charAt(0) === '?' ? search.slice(1) : search;
          var allPairs = qs2.split('&');
          for (var qi2 = 0; qi2 < allPairs.length; qi2++) {
            var eq2 = allPairs[qi2].indexOf('=');
            var k2 = eq2 !== -1 ? allPairs[qi2].slice(0, eq2) : allPairs[qi2];
            if (decodeURIComponent(k2.replace(/\\+/g, ' ')) !== 'bg_provider') {
              newPairs.push(allPairs[qi2]);
            }
          }
        }
        var newUrl = window.location.pathname;
        var remaining = newPairs.join('&');
        if (remaining) newUrl += '?' + remaining;
        newUrl += window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  };
`;
}
