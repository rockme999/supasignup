/**
 * 번개가입 Widget - buttons.js source
 *
 * This file is served as inline JavaScript from the API worker.
 * It renders social login buttons on Cafe24 shop pages.
 *
 * Security: No innerHTML usage. All DOM is built with createElement + textContent.
 */

import { getSmartTriggerJs } from './smart-triggers';
import { getExitIntentJs } from './exit-intent';
import { getLiveCounterJs } from './live-counter';
import { getCouponPackJs, getSingleCouponCardJs } from './coupon-pack';
import { getStyleHelpersJs } from './core/style-helpers';
import { getDebugJs } from './core/debug';
import { getReturnUrlJs } from './auth/return-url';
import { getStartAuthJs } from './auth/start-auth';
import { getMiniBannerJs } from './features/mini-banner';
import { getExitPopupJs } from './features/exit-popup';
import { getKakaoChannelJs } from './features/kakao-channel';
import { getEscalationJs } from './features/escalation';
import { getRenderJs } from './core/render';

export const WIDGET_JS = `(function() {
  'use strict';

  // ─── 서버에서 주입된 BASE_URL (런타임에 치환됨) ─────────────
  var __MY_BASE_URL__ = '';

  // 중복 실행 방지 — 같은 환경(BASE_URL)의 스크립트가 2회 로드되는 경우만 차단.
  // prod + dev 두 ScriptTag가 같은 가게에 박힌 경우 둘 다 실행되어야 하므로 키를 분리.
  var __BG_GUARD_KEY__ = '__BG_WIDGET_LOADED_' + (__MY_BASE_URL__ || 'unknown').replace(/[^a-z0-9]/gi, '_') + '__';
  if (window[__BG_GUARD_KEY__]) return;
  window[__BG_GUARD_KEY__] = true;

` + getDebugJs() + `

  // ─── Provider Info ───────────────────────────────────────────
  var PROVIDERS = {
    kakao: {
      name: '카카오',
      color: '#FEE500',
      bgColor: '#FEE500',
      textColor: '#191919',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#191919" d="M12 3C6.48 3 2 6.36 2 10.4c0 2.6 1.72 4.88 4.3 6.18l-1.1 4.02c-.08.3.26.54.52.36l4.78-3.18c.48.06.98.1 1.5.1 5.52 0 10-3.36 10-7.48C22 6.36 17.52 3 12 3z"/></svg>'
    },
    naver: {
      name: '네이버',
      color: '#03C75A',
      bgColor: '#03C75A',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M14.4 12.3L9.3 5H5v14h4.6V11.7L14.7 19H19V5h-4.6z"/></svg>'
    },
    google: {
      name: '구글',
      color: '#4285F4',
      bgColor: '#f2f2f2',
      textColor: '#1F1F1F',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
    },
    apple: {
      name: 'Apple',
      color: '#000000',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="2 2 20 20" width="18" height="18"><path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.02 8.83 8.76c1.28.07 2.17.72 2.91.78.93-.19 1.82-.87 2.82-.79 1.68.13 2.94.78 3.64 2.02-3.12 1.86-2.37 5.98.47 7.13-.57 1.5-1.31 2.99-2.62 4.38zM12.03 8.7c-.16-2.35 1.72-4.38 3.87-4.7.33 2.64-2.38 4.62-3.87 4.7z"/></svg>'
    },
    discord: {
      name: 'Discord',
      color: '#5865F2',
      bgColor: '#5865F2',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 00-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 00-4.8 0c-.14-.34-.35-.76-.54-1.09-.01-.02-.04-.03-.07-.03-1.5.26-2.93.71-4.27 1.33-.01 0-.02.01-.03.02-2.72 4.07-3.47 8.03-3.1 11.95 0 .02.01.04.03.05 1.8 1.32 3.53 2.12 5.24 2.65.03.01.06 0 .07-.02.4-.55.76-1.13 1.07-1.74.02-.04 0-.08-.04-.09-.57-.22-1.11-.48-1.64-.78-.04-.02-.04-.08-.01-.11.11-.08.22-.17.33-.25.02-.02.04-.02.06-.01 3.44 1.57 7.15 1.57 10.55 0 .02-.01.04-.01.06.01.11.09.22.17.33.26.04.03.03.09-.01.11-.52.31-1.07.56-1.64.78-.04.01-.05.06-.04.09.32.61.68 1.19 1.07 1.74.02.03.05.03.07.02 1.72-.53 3.45-1.33 5.25-2.65.02-.01.03-.03.03-.05.44-4.53-.73-8.46-3.1-11.95-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12 0 1.17-.83 2.12-1.89 2.12z"/></svg>'
    },
    facebook: {
      name: 'Facebook',
      color: '#1877F2',
      bgColor: '#1877F2',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>'
    },
    x: {
      name: 'X',
      color: '#000000',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>'
    },
    line: {
      name: 'LINE',
      color: '#06C755',
      bgColor: '#06C755',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>'
    },
    telegram: {
      name: 'Telegram',
      color: '#0088cc',
      bgColor: '#0088cc',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>'
    }
  };

  var WIDGET_CSS = [
    /* ── Specificity 강화: 카페24 모바일 스킨이 .member a 등에 !important 룰을 깔고 있어
       인라인 style이 무시되는 사례가 있어 .bg-widget 컨테이너 클래스를 prefix로 base 룰을 실어줌.
       (이전: #bg-widget ID prefix → 외부 element와 ID 충돌/누락 가능성 + 컨테이너 재사용 시 ID 보존 미보장 → class prefix로 안전화) ── */
    '.bg-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:16px auto;padding:0;box-sizing:border-box}',
    '.bg-widget .bg-widget-title{font-size:13px;color:#666;text-align:center;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:4px}',
    '.bg-widget .bg-flash{font-size:16px}',
    /* a.bg-btn: 모바일 스킨이 .member a/.xans-* a 에 강제하는 height/border/border-radius/text-decoration/background 등을 모두 차단 */
    '.bg-widget a.bg-btn,.bg-widget .bg-btn{display:flex!important;align-items:center;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s ease;text-decoration:none!important;box-sizing:border-box!important;line-height:1!important;background-image:none}',
    '.bg-widget .bg-btn:hover{opacity:.85}',
    '.bg-widget .bg-btn-highlight{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6;font-weight:700;position:relative}',
    '.bg-widget .bg-btn-highlight::after{content:"이전에 사용";position:absolute;top:-9px;right:8px;background:#3B82F6;color:#fff;font-size:10px;padding:1px 6px;border-radius:3px;font-weight:500}',
    '.bg-widget .bg-btn-highlight-icon{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6}',
    '.bg-widget .bg-btn-icon{display:flex;align-items:center;flex-shrink:0}',
    '.bg-widget .bg-powered{text-align:center;margin-top:4px;font-size:11px;color:#aaa}',
    '@media(max-width:480px){.bg-widget{margin:12px 8px}.bg-widget .bg-btn{font-size:15px}}',
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
    '@keyframes bg-pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.06)}50%{box-shadow:0 0 0 7px rgba(99,102,241,0),0 1px 3px rgba(0,0,0,0.06)}}',
    /* ── 모바일 자동 미세 애니메이션 keyframes ── */
    '@keyframes bg-mobile-glass{0%,100%{backdrop-filter:blur(16px) saturate(140%);-webkit-backdrop-filter:blur(16px) saturate(140%)}50%{backdrop-filter:blur(16px) saturate(165%);-webkit-backdrop-filter:blur(16px) saturate(165%)}}',
    '@keyframes bg-mobile-neon{0%,100%{box-shadow:0 0 6px rgba(99,102,241,0.25),inset 0 0 10px rgba(99,102,241,0.06)}50%{box-shadow:0 0 14px rgba(99,102,241,0.5),inset 0 0 14px rgba(99,102,241,0.10)}}',
    /* bg-mobile-liquid: ::before(radial-gradient 광택)를 좌→우 translateX로 이동 — 광택이 카드 위를 흐르는 효과, opacity 변화로 가시성 보강 */
    '@keyframes bg-mobile-liquid{0%,100%{transform:translateX(-15%);opacity:0.55}50%{transform:translateX(15%);opacity:1}}',
    '@keyframes bg-mobile-gradient{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}',
    '@keyframes bg-mobile-soft{0%,100%{box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.07),0 16px 32px rgba(0,0,0,0.04)}50%{box-shadow:0 2px 4px rgba(0,0,0,0.05),0 8px 20px rgba(0,0,0,0.10),0 24px 48px rgba(0,0,0,0.05)}}',
    /* ── 모바일 자동 미세 애니메이션 적용 (hover 없는 환경 + 모션 허용) — 공백 추가로 iOS Safari/Android 호환 ── */
    '@media (hover: none) and (prefers-reduced-motion: no-preference){.bg-widget .bg-preset-glass{animation:bg-mobile-glass 8s ease-in-out infinite}.bg-widget .bg-preset-neon{animation:bg-mobile-neon 8s ease-in-out infinite}.bg-widget .bg-preset-liquid::before{animation:bg-mobile-liquid 7s ease-in-out infinite}.bg-widget .bg-preset-gradient{animation:bg-mobile-gradient 8s ease-in-out infinite}.bg-widget .bg-preset-soft{animation:bg-mobile-soft 8s ease-in-out infinite}}',
    /* ── 자동 다크 wrapper (glass/neon/liquid 밝은 배경 보호) — 클래스 단독 룰: 컨테이너에 .bg-dark-wrap-* 만 있으면 항상 적용 ── */
    '.bg-dark-wrap{padding:14px 16px;border-radius:12px!important;display:inline-block!important;width:fit-content;max-width:100%;margin-left:auto;margin-right:auto}',
    '.bg-dark-wrap-glassmorphism{background:linear-gradient(135deg,#667eea,#764ba2,#f093fb)!important}',
    '.bg-dark-wrap-neon-glow{background:#0a0a14!important}',
    '.bg-dark-wrap-liquid-glass{background:linear-gradient(160deg,#0f2027,#203a43,#2c5364)!important}'
  ].join('\\n');

` + getStyleHelpersJs() + `

  // ─── 메타데이터 수집 헬퍼 ─────────────────────────────────────
  function bgDetectDevice() {
    var ua = navigator.userAgent;
    if (/iPad|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
    if (/iPhone|iPod|Android/i.test(ua)) return 'mobile';
    return 'desktop';
  }

  function bgDetectOS() {
    var ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    if (/Windows/i.test(ua)) return 'windows';
    if (/Mac/i.test(ua)) return 'mac';
    if (/Linux/i.test(ua)) return 'linux';
    return 'other';
  }

  function bgDetectBrowser() {
    var ua = navigator.userAgent;
    if (/Edg\\//i.test(ua)) return 'edge';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'chrome';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'safari';
    if (/Firefox/i.test(ua)) return 'firefox';
    return 'other';
  }

  // 방문자 식별자 (localStorage 기반 익명 ID, 실패 시 세션 단위 ID)
  var bgVisitorId = 'v_' + Math.random().toString(36).substr(2, 12);
  try {
    var stored = localStorage.getItem('bg_visitor_id');
    if (stored) {
      bgVisitorId = stored;
    } else {
      localStorage.setItem('bg_visitor_id', bgVisitorId);
    }
  } catch (e) {
    // Private browsing / localStorage 미지원 → 세션 단위 ID 사용
  }

  // 방문 횟수 (localStorage 기반, 세션 시작 시 +1)
  var bgVisitCount = 1;
  try {
    var vc = parseInt(localStorage.getItem('bg_visit_count') || '0');
    // 세션 내 중복 증가 방지
    if (!sessionStorage.getItem('bg_visit_counted')) {
      vc++;
      localStorage.setItem('bg_visit_count', String(vc));
      sessionStorage.setItem('bg_visit_counted', '1');
    }
    bgVisitCount = vc;
  } catch (e) {}

  // 세션 페이지 카운트
  var bgSessionPages = 1;
  try {
    bgSessionPages = parseInt(sessionStorage.getItem('bg_session_pages') || '0') + 1;
    sessionStorage.setItem('bg_session_pages', String(bgSessionPages));
  } catch (e) {}

  // referrer 도메인만 추출 (프라이버시)
  var bgReferrerDomain = '';
  try {
    if (document.referrer) {
      // new URL() 대신 <a> 태그를 이용한 ES5 URL 파싱
      var _refAnchor = document.createElement('a');
      _refAnchor.href = document.referrer;
      bgReferrerDomain = _refAnchor.hostname;
    }
  } catch (e) {}

  // ─── BGWidget Class ──────────────────────────────────────────

  function BGWidget() {
    this.container = null;
    this.config = null;
    this.lastProvider = null;
    this.baseUrl = '';
  }

  BGWidget.prototype.init = function() {
    // [디버그 a] init 시작 — UA, viewport, href
    bgLog('init: ua=', navigator.userAgent, 'vw=', window.innerWidth, 'vh=', window.innerHeight, 'isMobileViewport=', isMobileViewport(), 'href=', location.href);

    // Inject CSS
    var style = document.createElement('style');
    style.textContent = WIDGET_CSS;
    document.head.appendChild(style);

    // 서버에서 주입된 BASE_URL 사용
    this.myBaseUrl = __MY_BASE_URL__;

    // ScriptTag src에서 client_id 추출
    var clientId = null;
    var scripts = document.querySelectorAll('script[src*="buttons.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      // 자기 도메인의 ScriptTag만 매치
      if (this.myBaseUrl && src.indexOf(this.myBaseUrl) === -1) continue;
      var shopMatch = src.match(new RegExp('[?&]shop=([^&]+)'));
      if (shopMatch) { clientId = shopMatch[1]; break; }
      var dataShop = scripts[i].getAttribute('data-shop');
      if (dataShop) { clientId = dataShop; break; }
    }

    if (!clientId) {
      console.warn('[번개가입] client_id not found for ' + this.myBaseUrl);
      return;
    }

    this.clientId = clientId;
    // [디버그 b] clientId 추출 후
    bgLog('init: clientId=', clientId);

    // Save last provider from URL (after OAuth callback)
    this.saveLastProvider();

    // Read last provider from localStorage
    try {
      this.lastProvider = localStorage.getItem('bg_last_provider');
    } catch (e) {
      bgLog('error in init (localStorage):', e.message);
    }

    // SSO 팝업에서 돌아온 경우 → 부모에 알리고 자동 닫기
    if (window.opener && window.name === 'bg_sso_popup') {
      try { window.opener.postMessage('bg_sso_complete', '*'); } catch(e) {}
      setTimeout(function() { window.close(); }, 500);
      return;
    }

    // Detect page type
    this.pageType = this.detectPageType();
    // [디버그 c] pageType 결정 후
    bgLog('init: pageType=', this.pageType);

    // 모든 페이지에서 config 로드 (미니배너 등 Plus 기능은 전 페이지 동작)
    if (this.pageType === 'login') {
      // 이전 페이지 저장 (로그인/가입/동의 페이지가 아닌 마지막 페이지)
      this.saveReturnUrl();

      // SSO 로그인 완료 후 로그인 페이지에 머무는 경우 → 저장된 이전 페이지로 자동 이동
      // (카페24 MemberAction.snsLogin()이 return_url을 무시하는 문제 대응)
      if (this.isUserLoggedIn()) {
        var returnUrl = this.getReturnUrl();
        if (returnUrl && returnUrl !== '/member/login.html') {
          try { localStorage.removeItem('bg_return_url'); } catch(e) {}
          window.location.href = returnUrl;
          return;
        }
      }
    }
    this.loadConfig(clientId);
  };

` + getReturnUrlJs() + `

  BGWidget.prototype.detectPageType = function() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('/member/login') >= 0 || path.indexOf('/member/join') >= 0) return 'login';
    if (path === '/' || path === '/index.html') return 'main';
    if (/\\/products?\\//.test(path) || /\\/goods\\//.test(path)) return 'product';
    if (/\\/category\\//.test(path)) return 'category';
    return 'other';
  };

  BGWidget.prototype.loadConfig = function(clientId) {
    var self = this;
    var apiUrl = this.getApiBase() + '/api/widget/config?client_id=' + encodeURIComponent(clientId);
    // [디버그 e] loadConfig 시작
    bgLog('loadConfig: fetching', apiUrl);

    fetch(apiUrl, { credentials: 'omit', cache: 'no-store' })
      .then(function(resp) {
        // [디버그 f] loadConfig 응답
        bgLog('loadConfig: ok=', resp.ok, 'status=', resp.status);
        if (!resp.ok) throw new Error('Config load failed: HTTP ' + resp.status);
        return resp.json();
      })
      .then(function(config) {
        self.config = config;
        self.baseUrl = config.base_url || self.getApiBase();
        // [디버그 f2] config 주요 필드
        bgLog('config:', { plan: config.plan, preset: config.style && config.style.preset, providers_count: config.providers && config.providers.length, base_url: config.base_url });

        // 소셜 로그인 렌더링 (로그인/가입 페이지에서만)
        if (self.pageType === 'login' && config.providers && config.providers.length > 0) {
          self.render();
        }

        // page_view 이벤트 (비회원만, config 로드 후 1회 전송)
        if (!self.isUserLoggedIn()) {
          self.trackEvent('page_view', {});
        }

        // Plus 기능 활성화
        if (config.plan !== 'free') {
          self.initMiniBanner(config);
          self.initExitPopup(config);
          self.initEscalation(config);
          if (config.kakao_channel_id) {
            self.initKakaoChannel(config);
          }
          // Exit-intent 쿠폰 게이트 (DEPRECATED D1=A, 2026-04-29):
          // initExitIntent() 호출 제거 — initExitPopup으로 흡수됨.
          // 라이브 가입자 카운터 (R4 W3 Cycle2)
          // 별도 /live-counter 엔드포인트를 fetch하여 threshold + 최근 가입자 데이터 획득
          if (config.client_id) {
            fetch(self.getApiBase() + '/api/widget/live-counter?client_id=' + encodeURIComponent(config.client_id))
              .then(function(r) { return r.ok ? r.json() : null; })
              .then(function(lc) { if (lc) { self.initLiveCounter({ live_counter: lc }); } })
              .catch(function(err) { bgLog('error in loadConfig (live-counter):', err.message); });
          }
        }
      })
      .catch(function(err) {
        console.warn('[번개가입] Failed to load config:', err.message);
        bgLog('error in loadConfig:', err.message);
      });
  };

  BGWidget.prototype.getApiBase = function() {
    // 초기화 시 저장한 자신의 baseUrl 사용
    if (this.myBaseUrl) return this.myBaseUrl;
    return '';
  };

` + getRenderJs() + `

` + getStartAuthJs() + `

  // ─── Plus: 이벤트 추적 ────────────────────────────────────────
  BGWidget.prototype.trackEvent = function(eventType, eventData) {
    if (!this.config) return;
    // 공통 메타데이터 자동 추가
    var meta = {
      device: bgDetectDevice(),
      os: bgDetectOS(),
      browser: bgDetectBrowser(),
      referrer: bgReferrerDomain,
      visitor_id: bgVisitorId,
      visit_count: bgVisitCount,
      page_type: this.pageType || 'other',
      session_page_count: bgSessionPages
    };
    var merged = {};
    for (var k in meta) { if (meta.hasOwnProperty(k)) merged[k] = meta[k]; }
    if (eventData) { for (var j in eventData) { if (eventData.hasOwnProperty(j)) merged[j] = eventData[j]; } }

    var url = this.baseUrl + '/api/widget/event';
    var payload = JSON.stringify({
      client_id: this.config.client_id,
      event_type: eventType,
      event_data: merged,
      page_url: window.location.href
    });
    // Beacon API 사용 (페이지 이탈 시에도 전송 보장)
    if (navigator.sendBeacon) {
      navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    } else {
      fetch(url, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' }, credentials: 'omit', keepalive: true }).catch(function() {});
    }
  };


` + getMiniBannerJs() + `

` + getExitPopupJs() + `

` + getKakaoChannelJs() + `

` + getEscalationJs() + `

    // ─── Smart Trigger Engine ────────────────────────────────────
    ` + getSmartTriggerJs() + `

    // ─── Exit-intent 쿠폰 게이트 ─────────────────────────────────
    ` + getExitIntentJs() + `

    // ─── 라이브 가입자 카운터 ─────────────────────────────────────
    ` + getLiveCounterJs() + `

    // ─── 쿠폰팩 카드 렌더러 ──────────────────────────────────────
    ` + getCouponPackJs() + `

    // ─── 단일 쿠폰 카드 렌더러 (coupon_mode='single') ────────────
    ` + getSingleCouponCardJs() + `

    // ─── Initialize ──────────────────────────────────────────────

  var widget = new BGWidget();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      widget.init();
    });
  } else {
    widget.init();
  }
})();`;
