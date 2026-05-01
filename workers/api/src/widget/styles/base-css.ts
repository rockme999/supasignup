/**
 * base-css.ts — WIDGET_CSS 기본 룰
 *
 * .bg-widget 컨테이너, .bg-btn, .bg-btn-highlight, .bg-powered 등
 * 위젯 레이아웃/버튼 공통 스타일.
 *
 * 반환: string[] (WIDGET_CSS 배열에 spread)
 */
export function getBaseCss(): string[] {
  return [
    /* ── Specificity 강화: 카페24 모바일 스킨이 .member a 등에 !important 룰을 깔고 있어
       인라인 style이 무시되는 사례가 있어 .bg-widget 컨테이너 클래스를 prefix로 base 룰을 실어줌.
       (이전: #bg-widget ID prefix → 외부 element와 ID 충돌/누락 가능성 + 컨테이너 재사용 시 ID 보존 미보장 → class prefix로 안전화) */
    /* font-family: 어드민(layout.tsx)과 동일 stack 사용. 카페24 외부 CSS 우선 차단을 위해 !important + 자식 버튼 룰에도 명시 */
    '.bg-widget{font-family:-apple-system,BlinkMacSystemFont,\'Pretendard\',\'Segoe UI\',sans-serif!important;margin:16px auto;padding:0;box-sizing:border-box}',
    '.bg-widget .bg-widget-title{font-size:13px;color:#666;text-align:center;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:4px}',
    '.bg-widget .bg-flash{font-size:16px}',
    /* a.bg-btn: 모바일 스킨이 .member a/.xans-* a 에 강제하는 height/border/border-radius/text-decoration/background 등을 모두 차단 */
    '.bg-widget a.bg-btn,.bg-widget .bg-btn{display:flex!important;align-items:center;cursor:pointer;font-family:-apple-system,BlinkMacSystemFont,\'Pretendard\',\'Segoe UI\',sans-serif!important;font-size:14px;font-weight:500;transition:all .15s ease;text-decoration:none!important;box-sizing:border-box!important;line-height:1!important;background-image:none}',
    '.bg-widget .bg-btn:hover{opacity:.85}',
    '.bg-widget .bg-btn-highlight{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6;font-weight:700;position:relative}',
    '.bg-widget .bg-btn-highlight::after{content:"이전에 사용";position:absolute;top:-9px;right:8px;background:#3B82F6;color:#fff;font-size:10px;padding:1px 6px;border-radius:3px;font-weight:500}',
    '.bg-widget .bg-btn-highlight-icon{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6}',
    '.bg-widget .bg-btn-icon{display:flex;align-items:center;flex-shrink:0}',
    '.bg-widget .bg-powered{text-align:center;margin-top:4px;font-size:11px;color:#aaa}',
    /* 아이콘 모드 row: 풀버튼 영역 아래에 가로 정렬되는 컴팩트 아이콘 컨테이너 (44×44 터치 타겟) */
    '.bg-widget .bg-icon-row{display:flex!important;flex-direction:row;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:8px;width:100%}',
    '@media(max-width:480px){.bg-widget{margin:12px 8px}.bg-widget .bg-btn{font-size:15px}}',
  ];
}
