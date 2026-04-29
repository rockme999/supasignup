/**
 * debug.ts — 디버그 헬퍼 + 모바일 viewport 판단
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * 포함:
 *   bgDebug()          — ?bg_debug=1 또는 localStorage bg_debug=1 여부 반환
 *   bgLog(...args)     — bgDebug()가 true일 때만 console.info 출력
 *   isMobileViewport() — viewport 기반 모바일 판단 (UA 스푸핑 무관)
 */
export function getDebugJs(): string {
  return `
  // ─── 디버그 헬퍼 (?bg_debug=1 또는 localStorage bg_debug=1) ─
  function bgDebug() {
    try {
      if (window.location.search.indexOf('bg_debug=1') !== -1) return true;
      return localStorage.getItem('bg_debug') === '1';
    } catch (e) { return false; }
  }
  function bgLog() {
    if (!bgDebug()) return;
    try {
      var args = ['[번개가입]'];
      for (var i = 0; i < arguments.length; i++) args.push(arguments[i]);
      console.info.apply(console, args);
    } catch (e) {}
  }

  // ─── viewport 기반 모바일 판단 ───────────────────────────────
  // (UA 스푸핑/UA-reduction에 무관, 모바일 서브도메인 없는 환경에서 신뢰성 높음)
  function isMobileViewport() {
    try {
      if (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) return true;
      return window.innerWidth <= 768;
    } catch (e) {
      return window.innerWidth <= 768;
    }
  }
`;
}
