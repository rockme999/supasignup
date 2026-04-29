/**
 * presets-css.ts — Plus 프리셋 6종 CSS + 자동 다크 wrapper
 *
 * glassmorphism, neon-glow, liquid-glass, gradient-flow, soft-shadow, pulse
 * 및 bg-dark-wrap-* 룰.
 *
 * 반환: string[] (WIDGET_CSS 배열에 spread)
 */
export function getPresetsCss(): string[] {
  return [
    /* ── Plus 프리셋: 글래스모피즘 — .bg-widget prefix로 specificity ↑ ── */
    '.bg-widget .bg-preset-glass{background:rgba(255,255,255,0.1)!important;background-image:none!important;backdrop-filter:blur(16px) saturate(140%)!important;-webkit-backdrop-filter:blur(16px) saturate(140%)!important;border:1px solid rgba(255,255,255,0.22)!important;color:#fff!important;box-shadow:0 2px 12px rgba(0,0,0,0.12)!important}',
    '.bg-widget .bg-preset-glass:hover{background:rgba(255,255,255,0.18)!important;transform:translateY(-1px)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important;opacity:1!important}',
    '.bg-widget .bg-preset-glass .bg-btn-icon{background:transparent}',
    /* ── Plus 프리셋: 네온 글로우 ── */
    '.bg-widget .bg-preset-neon{background:transparent!important;background-image:none!important;border:1px solid rgba(99,102,241,0.55)!important;color:#a5b4fc!important;box-shadow:0 0 6px rgba(99,102,241,0.25),inset 0 0 10px rgba(99,102,241,0.06)!important;text-shadow:0 0 8px rgba(165,180,252,0.5)!important}',
    '.bg-widget .bg-preset-neon:hover{border-color:rgba(99,102,241,0.9)!important;box-shadow:0 0 14px rgba(99,102,241,0.6),0 0 28px rgba(99,102,241,0.3),inset 0 0 14px rgba(99,102,241,0.12)!important;color:#e0e7ff!important;text-shadow:0 0 12px rgba(165,180,252,0.8)!important}',
    '.bg-widget .bg-preset-neon .bg-btn-icon{background:transparent}',
    /* ── Plus 프리셋: 리퀴드 글래스 ── */
    '.bg-widget .bg-preset-liquid{position:relative!important;background:rgba(255,255,255,0.08)!important;background-image:none!important;backdrop-filter:blur(20px) saturate(180%)!important;-webkit-backdrop-filter:blur(20px) saturate(180%)!important;border:1px solid rgba(255,255,255,0.18)!important;color:rgba(255,255,255,0.92)!important;box-shadow:inset 0 0 20px rgba(255,255,255,0.07),0 8px 32px rgba(31,38,135,0.18),0 2px 6px rgba(0,0,0,0.18)!important;overflow:hidden!important}',
    '.bg-widget .bg-preset-liquid::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at var(--bg-mx,50%) var(--bg-my,30%),rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.06) 45%,transparent 70%);pointer-events:none}',
    '.bg-widget .bg-preset-liquid::after{content:"";position:absolute;top:0;left:10%;width:80%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);pointer-events:none}',
    '.bg-widget .bg-preset-liquid:hover{box-shadow:inset 0 0 24px rgba(255,255,255,0.12),0 12px 40px rgba(31,38,135,0.28),0 4px 12px rgba(0,0,0,0.22)!important;transform:translateY(-1px)!important}',
    '.bg-widget .bg-preset-liquid .bg-btn-icon{background:transparent}',
    /* ── Plus 프리셋: 그라디언트 플로우 ── */
    '.bg-widget .bg-preset-gradient{background-size:200% 200%!important;background-image:linear-gradient(135deg,#f093fb 0%,#f5576c 25%,#fda085 50%,#f6d365 75%,#a18cd1 100%)!important;background-position:0% 50%!important;border:none!important;color:#fff!important;font-weight:600!important;box-shadow:0 3px 14px rgba(240,147,251,0.35)!important;text-shadow:0 1px 2px rgba(0,0,0,0.15)!important;transition:background-position 0.5s ease,box-shadow 0.3s ease,transform 0.2s ease!important}',
    '.bg-widget .bg-preset-gradient:hover{background-position:100% 50%!important;box-shadow:0 6px 24px rgba(240,147,251,0.5)!important;transform:translateY(-1px)!important}',
    '.bg-widget .bg-preset-gradient .bg-btn-icon{background:transparent}',
    /* ── Plus 프리셋: 소프트 섀도우 ── */
    '.bg-widget .bg-preset-soft{background:#ffffff!important;background-image:none!important;border:1px solid rgba(0,0,0,0.06)!important;color:#374151!important;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.07),0 16px 32px rgba(0,0,0,0.04)!important;transition:box-shadow 0.25s ease,transform 0.25s ease!important}',
    '.bg-widget .bg-preset-soft:hover{transform:translateY(-3px)!important;box-shadow:0 2px 4px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.10),0 24px 48px rgba(0,0,0,0.06)!important}',
    '.bg-widget .bg-preset-soft .bg-btn-icon{background:#f3f4f6;border-radius:50%}',
    /* ── Plus 프리셋: 펄스 애니메이션 ── */
    '.bg-widget .bg-preset-pulse{background:#fff!important;background-image:none!important;border:1px solid #e5e7eb!important;color:#374151!important;box-shadow:0 1px 3px rgba(0,0,0,0.06)!important;animation:bg-pulseRing 2s ease-in-out infinite!important}',
    '.bg-widget .bg-preset-pulse:hover{animation:none!important;transform:scale(1.02)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.25),0 4px 16px rgba(99,102,241,0.2)!important;border-color:#6366f1!important;color:#4f46e5!important}',
    '.bg-widget .bg-preset-pulse .bg-btn-icon{background:#ede9fe;border-radius:50%}',
    '.bg-widget .bg-preset-pulse-d1{animation-delay:0s!important}',
    '.bg-widget .bg-preset-pulse-d2{animation-delay:0.4s!important}',
    '.bg-widget .bg-preset-pulse-d3{animation-delay:0.8s!important}',
    '.bg-widget .bg-preset-pulse-d4{animation-delay:1.2s!important}',
    /* ── 자동 다크 wrapper (glass/neon/liquid 밝은 배경 보호) — 클래스 단독 룰: 컨테이너에 .bg-dark-wrap-* 만 있으면 항상 적용 ── */
    '.bg-dark-wrap{padding:14px 16px;border-radius:12px!important;display:inline-block!important;width:fit-content;max-width:100%;margin-left:auto;margin-right:auto}',
    '.bg-dark-wrap-glassmorphism{background:linear-gradient(135deg,#667eea,#764ba2,#f093fb)!important}',
    '.bg-dark-wrap-neon-glow{background:#0a0a14!important}',
    '.bg-dark-wrap-liquid-glass{background:linear-gradient(160deg,#0f2027,#203a43,#2c5364)!important}',
  ];
}
