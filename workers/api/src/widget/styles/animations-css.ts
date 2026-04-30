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
    /* ── 모바일 자동 미세 애니메이션 keyframes ── */
    '@keyframes bg-mobile-glass{0%,100%{backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%)}50%{backdrop-filter:blur(16px) saturate(165%);-webkit-backdrop-filter:blur(16px) saturate(165%)}}',
    '@keyframes bg-mobile-neon{0%,100%{box-shadow:0 0 6px rgba(99,102,241,0.25),inset 0 0 10px rgba(99,102,241,0.06)}50%{box-shadow:0 0 14px rgba(99,102,241,0.5),inset 0 0 14px rgba(99,102,241,0.10)}}',
    /* bg-mobile-liquid: ::before(radial-gradient 광택)를 좌→우 translateX로 이동 — 광택이 카드 위를 흐르는 효과, opacity 변화로 가시성 보강 */
    '@keyframes bg-mobile-liquid{0%,100%{transform:translateX(-15%);opacity:0.55}50%{transform:translateX(15%);opacity:1}}',
    '@keyframes bg-mobile-gradient{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}',
    '@keyframes bg-mobile-soft{0%,100%{box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.07),0 16px 32px rgba(0,0,0,0.04)}50%{box-shadow:0 2px 4px rgba(0,0,0,0.05),0 8px 20px rgba(0,0,0,0.10),0 24px 48px rgba(0,0,0,0.05)}}',
    /* bg-mobile-pulse: 모바일 전용 호흡감 — pulseRing(box-shadow 링)에 더해 미세 scale + 보더 톤 변화. hover 색감(#6366f1)보다 옅은 #c7d2fe로 "살아있음" 신호만. */
    '@keyframes bg-mobile-pulse{0%,100%{transform:scale(1);border-color:#e5e7eb}50%{transform:scale(1.012);border-color:#c7d2fe}}',
    /* ── 모바일 자동 미세 애니메이션 적용 (hover 없는 환경 + 모션 허용) — 공백 추가로 iOS Safari/Android 호환 ── */
    /* pulse는 기본 룰에 'animation:bg-pulseRing ... !important' 가 박혀있어, 모바일에서 두 번째 애니메이션을 합치려면 !important + 셔터로 덮어써야 함. */
    '@media (hover: none) and (prefers-reduced-motion: no-preference){.bg-widget .bg-preset-glass{animation:bg-mobile-glass 8s ease-in-out infinite}.bg-widget .bg-preset-neon{animation:bg-mobile-neon 8s ease-in-out infinite}.bg-widget .bg-preset-liquid::before{animation:bg-mobile-liquid 7s ease-in-out infinite}.bg-widget .bg-preset-gradient{animation:bg-mobile-gradient 8s ease-in-out infinite}.bg-widget .bg-preset-soft{animation:bg-mobile-soft 8s ease-in-out infinite}.bg-widget .bg-preset-pulse{animation:bg-pulseRing 2s ease-in-out infinite,bg-mobile-pulse 6s ease-in-out infinite!important}}',
  ];
}
