/**
 * style-helpers.ts — DOM 스타일 헬퍼 함수
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * 포함:
 *   bgSetImp(el, prop, val)         — setProperty('important') 래퍼
 *   getEffectiveBgLuminance(el)     — 부모 트리 luminance 추적
 *   escapeHtml(str)                 — HTML 이스케이프 (XSS 방지)
 */
export function getStyleHelpersJs(): string {
  return `
  // ─── 모바일 스킨 대응: 인라인 style을 !important로 강제 적용 ────
  // 카페24 모바일 스킨이 .member a 등에 height/border-radius/padding/text-decoration 을
  // !important로 강제하는 사례가 있어, 위젯 인라인 style이 무시되어 "기본 버튼"으로
  // 보이는 모바일 한정 버그가 보고됨. setProperty('...', 'important') 로 우회.
  // prop 인자는 항상 kebab-case (border-radius, background-color, …). setProperty는
  // kebab-case만 받음. catch 경로에서는 .style[prop]에 부여해야 하므로 kebab → camelCase 변환.
  function bgSetImp(el, prop, val) {
    try {
      el.style.setProperty(prop, val, 'important');
    } catch (e) {
      // setProperty가 (구형 환경에서) 실패하면 camelCase 폴백
      var camel = prop.replace(/-([a-z])/g, function(_, c) { return c.toUpperCase(); });
      try { el.style[camel] = val; } catch (e2) {}
    }
  }

  // ─── Plus: 부모 트리 luminance 추적 (자동 다크 wrapper 판단) ─
  function getEffectiveBgLuminance(el) {
    try {
      var node = el;
      while (node && node !== document.documentElement) {
        var bg = window.getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)') {
          var m = bg.match(/rgba?\\(([^)]+)\\)/);
          if (m) {
            var p = m[1].split(',').map(function(x) { return parseFloat(x.trim()); });
            // 알파값이 0.5 이하면 투명으로 간주하고 계속 올라감
            if (p[3] === undefined || p[3] > 0.5) {
              return (0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]) / 255;
            }
          }
        }
        node = node.parentElement;
      }
    } catch (e) {
      // getComputedStyle 예외 (모바일 SafariIE 일부 노드) → 흰색(밝은 배경)으로 간주
    }
    // 모든 부모가 transparent 또는 예외 → 흰색(밝은 배경)으로 가정
    return 1.0;
  }

  // ─── 유틸: HTML 이스케이프 (XSS 방지) ───────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
`;
}
