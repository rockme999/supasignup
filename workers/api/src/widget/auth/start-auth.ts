/**
 * start-auth.ts — OAuth 시작 흐름 (카페24 SSO + fallback)
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   startAuth(provider)  — PC(MemberAction) vs 모바일(popup) 분기
 *   generateState()      — CSRF state 토큰 생성 (crypto.getRandomValues)
 *
 * 의존 (IIFE 스코프):
 *   bgLog, bgDetectDevice, bgVisitorId (debug.ts / widget-base.ts)
 */
export function getStartAuthJs(): string {
  return `
  BGWidget.prototype.startAuth = function(provider) {
    var config = this.config;
    if (!config) return;

    // OAuth 시작 이벤트 추적 (이탈률 계산용)
    this.trackEvent('oauth_start', { provider: provider });

    // Save last provider to localStorage for smart button (Cafe24 SSO doesn't pass bg_provider back)
    try { localStorage.setItem('bg_last_provider', provider); } catch (e) {}

    if (config.sso_callback_uri) {
      var ssoType = config.sso_type || 'sso';

      // sso_callback_uri에서 mall_id 추출 (팝업 완료 감지용)
      var mallMatch = config.sso_callback_uri.match(new RegExp('https://([^.]+)\\\\.cafe24\\\\.com'));
      var mallId = mallMatch ? mallMatch[1] : null;

      // [디버그 i] startAuth 분기
      bgLog('startAuth: branch=', (typeof MemberAction !== 'undefined' && MemberAction.snsLogin) ? 'PC-MemberAction' : 'else-popup', 'mallId=', mallId);

      // /oauth/sso-start: first-party 맥락으로 bg.suparain.kr 방문 → 쿠키 확정 세팅 →
      // Cafe24 SSO URL로 302. 기존의 cross-origin fetch로 Set-Cookie 시도는 ITP/3rd-party
      // 차단으로 쿠키가 저장되지 않아 /authorize가 KV 엣지 캐시의 이전 값을 읽는 레이스
      // (이전 클릭 프로바이더로 재시도되는 버그)를 원천 제거.
      var startUrlBase = this.baseUrl + '/oauth/sso-start'
        + '?client_id=' + encodeURIComponent(config.client_id)
        + '&provider=' + encodeURIComponent(provider)
        + '&sso_type=' + encodeURIComponent(ssoType)
        + '&visitor_id=' + encodeURIComponent(bgVisitorId)
        + '&device=' + encodeURIComponent(bgDetectDevice());

      if (typeof MemberAction !== 'undefined' && MemberAction.snsLogin) {
        // login 페이지: 전체 페이지 네비게이션 (top-level navigation → first-party 쿠키 세팅)
        var loginStartUrl = startUrlBase + '&return_url=' + encodeURIComponent(this.getReturnUrl());
        window.location.href = loginStartUrl;
      } else if (mallId) {
        // join 페이지 등: 팝업에서 /oauth/sso-start 호출. 팝업 컨텍스트도 top-level 네비게이션이라
        // bg.suparain.kr에 first-party 쿠키가 세팅됨. 팝업 내부 SSO 완료 후 /member/login.html로
        // 복귀하면 그 페이지의 위젯이 postMessage 'bg_sso_complete' 를 보내 팝업을 닫음.
        var savedReturnUrl = this.getReturnUrl();
        var popupStartUrl = startUrlBase + '&return_url=' + encodeURIComponent('/member/login.html');
        var popup = window.open(popupStartUrl, 'bg_sso_popup', 'width=520,height=700,scrollbars=yes');
        window.addEventListener('message', function handler(e) {
          if (e.origin.slice(-11) !== '.cafe24.com') return; // origin 검증 (endsWith 대신 slice)
          if (e.data === 'bg_sso_complete') {
            window.removeEventListener('message', handler);
            window.location.href = savedReturnUrl;
          }
        });
        // 팝업이 닫힌 경우에도 이전 페이지로 이동
        var pollClosed = setInterval(function() {
          if (!popup || popup.closed) {
            clearInterval(pollClosed);
            window.location.href = savedReturnUrl;
          }
        }, 1000);
      }
      return;
    }

    // Fallback: direct OAuth flow (non-Cafe24 platforms)
    var authUrl = this.baseUrl + '/oauth/authorize'
      + '?client_id=' + encodeURIComponent(config.client_id)
      + '&redirect_uri=' + encodeURIComponent(window.location.origin + '/member/login.html')
      + '&provider=' + encodeURIComponent(provider)
      + '&state=' + encodeURIComponent(this.generateState());

    window.location.href = authUrl;
  };

  BGWidget.prototype.generateState = function() {
    var arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    // Array.from + padStart 대신 ES5 for 루프 + 직접 패딩
    var hex = '';
    for (var gi = 0; gi < arr.length; gi++) {
      var byteHex = arr[gi].toString(16);
      hex += byteHex.length === 1 ? '0' + byteHex : byteHex;
    }
    return hex;
  };
`;
}
