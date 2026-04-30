/**
 * animations-css.ts — @keyframes + 모바일 자동 미세 애니메이션 media query
 *
 * bg-pulseRing, bg-mobile-glass/neon/liquid/gradient/soft keyframes
 * 및 모바일 적용 @media 룰.
 *
 * 반환: string[] (WIDGET_CSS 배열에 spread)
 */
export function getAnimationsCss(): string[] {
  return [
    '@keyframes bg-pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.06)}50%{box-shadow:0 0 0 7px rgba(99,102,241,0),0 1px 3px rgba(0,0,0,0.06)}}',
    /* ── 모바일 자동 미세 애니메이션 keyframes ──
       6종 모두 PC 호버 효과를 0.5초 동안 모방하는 패턴 (0~6.25% 효과 + 6.25%~100% 정지). 인덱스별 animation-delay 로 6개 버튼이 차례로 trigger.
       모든 keyframe은 base 룰(.bg-preset-*)의 !important 와 충돌하지 않는 속성만 사용:
         - transform / filter (drop-shadow / brightness) / background-position → base box-shadow/border/color 등 !important 회피.
       gradient만 background-position 사용 (base에서 해당 속성 !important 제거됨). */
    '@keyframes bg-mobile-glass{0%,6.25%,100%{transform:translateY(0);filter:brightness(1) drop-shadow(0 0 0 transparent)}3%{transform:translateY(-1px);filter:brightness(1.1) drop-shadow(0 6px 18px rgba(0,0,0,0.18))}}',
    /* neon: PC hover 보다 외부 glow 더 진하게 — drop-shadow 3겹 chain (16px + 32px + 48px) + alpha 강화. brightness 1.3 */
    '@keyframes bg-mobile-neon{0%,6.25%,100%{transform:translateY(0);filter:brightness(1) drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent) drop-shadow(0 0 0 transparent)}3%{transform:translateY(-1px);filter:brightness(1.3) drop-shadow(0 0 16px rgba(99,102,241,0.9)) drop-shadow(0 0 32px rgba(99,102,241,0.6)) drop-shadow(0 0 48px rgba(99,102,241,0.35))}}',
    /* liquid: 사용자 요청에 따라 현재 상태(scale+brightness 호흡 + ::before 광택 sweep) 유지 */
    '@keyframes bg-mobile-liquid{0%,100%{transform:scale(1);filter:brightness(1)}50%{transform:scale(1.015);filter:brightness(1.08)}}',
    '@keyframes bg-mobile-liquid-shine{0%,100%{transform:translateX(-25%);opacity:0.55}50%{transform:translateX(25%);opacity:1}}',
    '@keyframes bg-mobile-gradient{0%,6.25%,100%{background-position:0% 50%;transform:translateY(0);filter:drop-shadow(0 0 0 transparent)}3%{background-position:100% 50%;transform:translateY(-1px);filter:drop-shadow(0 4px 12px rgba(240,147,251,0.4))}}',
    '@keyframes bg-mobile-soft{0%,6.25%,100%{transform:translateY(0);filter:drop-shadow(0 1px 2px rgba(0,0,0,0.04))}3%{transform:translateY(-3px);filter:drop-shadow(0 8px 20px rgba(0,0,0,0.12))}}',
    /* pulse: bg-pulseRing 링 위에 호버 시연 (scale 1.02 + indigo glow) 추가. 두 animation 합성 */
    '@keyframes bg-mobile-pulse{0%,6.25%,100%{transform:scale(1);filter:drop-shadow(0 0 0 transparent)}3%{transform:scale(1.02);filter:drop-shadow(0 0 10px rgba(99,102,241,0.5))}}',
    /* ── 모바일 자동 미세 애니메이션 적용 (hover 없는 환경 + 모션 허용) — 공백 추가로 iOS Safari/Android 호환 ── */
    /* pulse는 기본 룰에 'animation:bg-pulseRing ... !important' 가 박혀있어, 모바일에서 두 번째 애니메이션을 합치려면 !important + 셔터로 덮어써야 함. */
    '@media (hover: none) and (prefers-reduced-motion: no-preference){.bg-widget .bg-preset-glass{animation:bg-mobile-glass 8s ease-in-out infinite}.bg-widget .bg-preset-neon{animation:bg-mobile-neon 8s ease-in-out infinite}.bg-widget .bg-preset-liquid{animation:bg-mobile-liquid 8s ease-in-out infinite}.bg-widget .bg-preset-liquid::before{animation:bg-mobile-liquid-shine 7s ease-in-out infinite}.bg-widget .bg-preset-gradient{animation:bg-mobile-gradient 8s ease-in-out infinite}.bg-widget .bg-preset-soft{animation:bg-mobile-soft 8s ease-in-out infinite}.bg-widget .bg-preset-pulse{animation-name:bg-pulseRing,bg-mobile-pulse!important;animation-duration:2s,8s!important;animation-iteration-count:infinite,infinite!important;animation-timing-function:ease-in-out,ease-in-out!important}}',
  ];
}
