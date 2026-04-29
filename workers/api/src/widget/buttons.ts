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
import { getCouponPackJs } from './coupon-pack';

export const WIDGET_JS = `(function() {
  'use strict';

  // 중복 실행 방지 — 카페24 ScriptTag 로더가 동일 스크립트를 2회 로딩하는 경우 대응
  if (window.__BG_WIDGET_LOADED__) return;
  window.__BG_WIDGET_LOADED__ = true;

  // ─── 서버에서 주입된 BASE_URL (런타임에 치환됨) ─────────────
  var __MY_BASE_URL__ = '';

  // ─── 유틸: HTML 이스케이프 (XSS 방지) ───────────────────────
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

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
    '.bg-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:16px auto;padding:0}',
    '.bg-widget-title{font-size:13px;color:#666;text-align:center;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:4px}',
    '.bg-flash{font-size:16px}',
    '.bg-btn{display:flex;align-items:center;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s ease;text-decoration:none;box-sizing:border-box}',
    '.bg-btn:hover{opacity:.85}',
    '.bg-btn-highlight{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6;font-weight:700;position:relative}',
    '.bg-btn-highlight::after{content:"이전에 사용";position:absolute;top:-9px;right:8px;background:#3B82F6;color:#fff;font-size:10px;padding:1px 6px;border-radius:3px;font-weight:500}',
    '.bg-btn-highlight-icon{border:2px solid #3B82F6!important;box-shadow:0 0 0 1px #3B82F6}',
    '.bg-btn-icon{display:flex;align-items:center;flex-shrink:0}',
    '.bg-powered{text-align:center;margin-top:4px;font-size:11px;color:#aaa}',
    '@media(max-width:480px){.bg-widget{margin:12px 8px}.bg-btn{font-size:15px}}',
    /* ── Plus 프리셋: 글래스모피즘 ── */
    '.bg-preset-glass{background:rgba(255,255,255,0.1)!important;backdrop-filter:blur(16px) saturate(140%)!important;-webkit-backdrop-filter:blur(16px) saturate(140%)!important;border:1px solid rgba(255,255,255,0.22)!important;color:#fff!important;box-shadow:0 2px 12px rgba(0,0,0,0.12)!important}',
    '.bg-preset-glass:hover{background:rgba(255,255,255,0.18)!important;transform:translateY(-1px)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important}',
    '.bg-preset-glass .bg-btn-icon{background:rgba(255,255,255,0.25);border-radius:50%}',
    /* ── Plus 프리셋: 네온 글로우 ── */
    '.bg-preset-neon{background:transparent!important;border:1px solid rgba(99,102,241,0.55)!important;color:#a5b4fc!important;box-shadow:0 0 6px rgba(99,102,241,0.25),inset 0 0 10px rgba(99,102,241,0.06)!important;text-shadow:0 0 8px rgba(165,180,252,0.5)!important}',
    '.bg-preset-neon:hover{border-color:rgba(99,102,241,0.9)!important;box-shadow:0 0 14px rgba(99,102,241,0.6),0 0 28px rgba(99,102,241,0.3),inset 0 0 14px rgba(99,102,241,0.12)!important;color:#e0e7ff!important;text-shadow:0 0 12px rgba(165,180,252,0.8)!important}',
    '.bg-preset-neon .bg-btn-icon{background:rgba(99,102,241,0.2);border-radius:50%;border:1px solid rgba(99,102,241,0.5);box-shadow:0 0 6px rgba(99,102,241,0.4)}',
    /* ── Plus 프리셋: 리퀴드 글래스 ── */
    '.bg-preset-liquid{position:relative!important;background:rgba(255,255,255,0.08)!important;backdrop-filter:blur(20px) saturate(180%)!important;-webkit-backdrop-filter:blur(20px) saturate(180%)!important;border:1px solid rgba(255,255,255,0.18)!important;color:rgba(255,255,255,0.92)!important;box-shadow:inset 0 0 20px rgba(255,255,255,0.07),0 8px 32px rgba(31,38,135,0.18),0 2px 6px rgba(0,0,0,0.18)!important;overflow:hidden!important}',
    '.bg-preset-liquid::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at var(--bg-mx,50%) var(--bg-my,30%),rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.06) 45%,transparent 70%);pointer-events:none}',
    '.bg-preset-liquid::after{content:"";position:absolute;top:0;left:10%;width:80%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);pointer-events:none}',
    '.bg-preset-liquid:hover{box-shadow:inset 0 0 24px rgba(255,255,255,0.12),0 12px 40px rgba(31,38,135,0.28),0 4px 12px rgba(0,0,0,0.22)!important;transform:translateY(-1px)!important}',
    '.bg-preset-liquid .bg-btn-icon{background:rgba(255,255,255,0.18);border-radius:50%;border:1px solid rgba(255,255,255,0.25)}',
    /* ── Plus 프리셋: 그라디언트 플로우 ── */
    '.bg-preset-gradient{background-size:200% 200%!important;background-image:linear-gradient(135deg,#f093fb 0%,#f5576c 25%,#fda085 50%,#f6d365 75%,#a18cd1 100%)!important;background-position:0% 50%!important;border:none!important;color:#fff!important;font-weight:600!important;box-shadow:0 3px 14px rgba(240,147,251,0.35)!important;text-shadow:0 1px 2px rgba(0,0,0,0.15)!important;transition:background-position 0.5s ease,box-shadow 0.3s ease,transform 0.2s ease!important}',
    '.bg-preset-gradient:hover{background-position:100% 50%!important;box-shadow:0 6px 24px rgba(240,147,251,0.5)!important;transform:translateY(-1px)!important}',
    '.bg-preset-gradient .bg-btn-icon{background:rgba(255,255,255,0.3);border-radius:50%}',
    /* ── Plus 프리셋: 소프트 섀도우 ── */
    '.bg-preset-soft{background:#ffffff!important;border:1px solid rgba(0,0,0,0.06)!important;color:#374151!important;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.07),0 16px 32px rgba(0,0,0,0.04)!important;transition:box-shadow 0.25s ease,transform 0.25s ease!important}',
    '.bg-preset-soft:hover{transform:translateY(-3px)!important;box-shadow:0 2px 4px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.10),0 24px 48px rgba(0,0,0,0.06)!important}',
    '.bg-preset-soft .bg-btn-icon{background:#f3f4f6;border-radius:50%}',
    /* ── Plus 프리셋: 펄스 애니메이션 ── */
    '.bg-preset-pulse{background:#fff!important;border:1px solid #e5e7eb!important;color:#374151!important;box-shadow:0 1px 3px rgba(0,0,0,0.06)!important;animation:bg-pulseRing 2s ease-in-out infinite!important}',
    '.bg-preset-pulse:hover{animation:none!important;transform:scale(1.02)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.25),0 4px 16px rgba(99,102,241,0.2)!important;border-color:#6366f1!important;color:#4f46e5!important}',
    '.bg-preset-pulse .bg-btn-icon{background:#ede9fe;border-radius:50%}',
    '.bg-preset-pulse-d1{animation-delay:0s!important}',
    '.bg-preset-pulse-d2{animation-delay:0.4s!important}',
    '.bg-preset-pulse-d3{animation-delay:0.8s!important}',
    '.bg-preset-pulse-d4{animation-delay:1.2s!important}',
    '@keyframes bg-pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.06)}50%{box-shadow:0 0 0 7px rgba(99,102,241,0),0 1px 3px rgba(0,0,0,0.06)}}'
  ].join('\\n');

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
      bgReferrerDomain = new URL(document.referrer).hostname;
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

    // Save last provider from URL (after OAuth callback)
    this.saveLastProvider();

    // Read last provider from localStorage
    try {
      this.lastProvider = localStorage.getItem('bg_last_provider');
    } catch (e) {
      // Private browsing mode - graceful fallback
    }

    // SSO 팝업에서 돌아온 경우 → 부모에 알리고 자동 닫기
    if (window.opener && window.name === 'bg_sso_popup') {
      try { window.opener.postMessage('bg_sso_complete', '*'); } catch(e) {}
      setTimeout(function() { window.close(); }, 500);
      return;
    }

    // Detect page type
    this.pageType = this.detectPageType();

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

  // 로그인/가입/동의 페이지가 아닌 이전 페이지를 저장
  BGWidget.prototype.saveReturnUrl = function() {
    try {
      var ref = document.referrer;
      if (!ref) return;
      var refPath = new URL(ref).pathname.toLowerCase();
      // 로그인/가입/동의 페이지는 저장하지 않음
      var skipPages = ['/member/login', '/member/join', '/member/agreement', '/member/modify'];
      for (var i = 0; i < skipPages.length; i++) {
        if (refPath.indexOf(skipPages[i]) >= 0) return;
      }
      localStorage.setItem('bg_return_url', new URL(ref).pathname + new URL(ref).search);
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

  BGWidget.prototype.detectPageType = function() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('/member/login') >= 0 || path.indexOf('/member/join') >= 0) return 'login';
    if (path === '/' || path === '/index.html') return 'main';
    if (/\\/products?\\//.test(path) || /\\/goods\\//.test(path)) return 'product';
    if (/\\/category\\//.test(path)) return 'category';
    return 'other';
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
      var params = new URLSearchParams(window.location.search);
      var provider = params.get('bg_provider');
      if (provider) {
        localStorage.setItem('bg_last_provider', provider);
        // Clean URL
        params.delete('bg_provider');
        var newUrl = window.location.pathname;
        var remaining = params.toString();
        if (remaining) newUrl += '?' + remaining;
        newUrl += window.location.hash;
        window.history.replaceState({}, '', newUrl);
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  BGWidget.prototype.loadConfig = function(clientId) {
    var self = this;
    var apiUrl = this.getApiBase() + '/api/widget/config?client_id=' + encodeURIComponent(clientId);

    fetch(apiUrl)
      .then(function(resp) {
        if (!resp.ok) throw new Error('Config load failed');
        return resp.json();
      })
      .then(function(config) {
        self.config = config;
        self.baseUrl = config.base_url || self.getApiBase();

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
          // Exit-intent 쿠폰 게이트 (W2-1 + Smart trigger W2-2)
          if (config.exit_intent_config) {
            self.initExitIntent(config);
          }
          // 라이브 가입자 카운터 (R4 W3 Cycle2)
          // 별도 /live-counter 엔드포인트를 fetch하여 threshold + 최근 가입자 데이터 획득
          if (config.client_id) {
            fetch(self.getApiBase() + '/api/widget/live-counter?client_id=' + encodeURIComponent(config.client_id))
              .then(function(r) { return r.ok ? r.json() : null; })
              .then(function(lc) { if (lc) { self.initLiveCounter({ live_counter: lc }); } })
              .catch(function() {});
          }
        }
      })
      .catch(function(err) {
        console.warn('[번개가입] Failed to load config:', err.message);
      });
  };

  BGWidget.prototype.getApiBase = function() {
    // 초기화 시 저장한 자신의 baseUrl 사용
    if (this.myBaseUrl) return this.myBaseUrl;
    return '';
  };

  BGWidget.prototype.render = function() {
    // Find or create container
    this.container = document.querySelector('#bg-widget');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'bg-widget';
      var s = (this.config && this.config.style) || {};
      var pos = s.widgetPosition || 'before';
      var target;
      if (pos === 'custom' && s.customSelector) {
        target = document.querySelector(s.customSelector);
      } else {
        target = this.findLoginPage();
      }
      if (target) {
        if (pos === 'after') {
          target.parentNode.insertBefore(this.container, target.nextSibling);
        } else {
          // before 또는 custom: 대상 요소 앞에 삽입
          target.parentNode.insertBefore(this.container, target);
        }
      } else {
        // 로그인/가입 페이지 영역을 찾지 못하면 렌더링하지 않음
        return;
      }
    }

    this.container.className = 'bg-widget';

    // Apply style settings to container
    var s = (this.config && this.config.style) || {};
    var buttonWidth = s.buttonWidth || 280;
    var preset = s.preset || 'default';

    if (preset === 'icon-only') {
      // icon-only: icons laid out in a row
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'row';
      this.container.style.flexWrap = 'wrap';
      this.container.style.alignItems = 'center';
      this.container.style.justifyContent = 'center';
      this.container.style.maxWidth = 'none';
    } else {
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
      this.container.style.alignItems = 'center';
      this.container.style.maxWidth = (buttonWidth + 32) + 'px';
    }

    // Title (showTitle: default false)
    if (s.showTitle === true) {
      var title = document.createElement('div');
      title.className = 'bg-widget-title';
      if (preset === 'icon-only') title.style.width = '100%';
      var flash = document.createElement('span');
      flash.className = 'bg-flash';
      flash.textContent = '\\u26A1';
      title.appendChild(flash);
      var titleText = document.createElement('span');
      titleText.textContent = ' 간편 로그인';
      title.appendChild(titleText);
      this.container.appendChild(title);
    }

    // Sort providers (last used first)
    var providers = this.sortProviders(this.config.providers);

    // Render buttons
    for (var i = 0; i < providers.length; i++) {
      var btn = this.renderButton(providers[i], i === 0 && this.lastProvider === providers[i]);
      this.container.appendChild(btn);
    }

    // Powered by (showPoweredBy: default true)
    if (s.showPoweredBy !== false) {
      var powered = document.createElement('div');
      powered.className = 'bg-powered';
      if (preset === 'icon-only') powered.style.width = '100%';
      powered.textContent = 'powered by 번개가입';
      this.container.appendChild(powered);
    }

    // 리퀴드 글래스: 마우스 추적 광택 효과 초기화
    if (preset === 'liquid-glass') {
      this.initLiquidGlass(this.container);
    }
  };

  // ─── Plus: 리퀴드 글래스 마우스 추적 광택 ────────────────────
  BGWidget.prototype.initLiquidGlass = function(container) {
    var btns = container.querySelectorAll('.bg-preset-liquid');
    if (!btns.length) return;
    container.addEventListener('mousemove', function(e) {
      for (var i = 0; i < btns.length; i++) {
        var rect = btns[i].getBoundingClientRect();
        var x = ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
        var y = ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
        btns[i].style.setProperty('--bg-mx', x);
        btns[i].style.setProperty('--bg-my', y);
      }
    });
    container.addEventListener('mouseleave', function() {
      for (var i = 0; i < btns.length; i++) {
        btns[i].style.setProperty('--bg-mx', '50%');
        btns[i].style.setProperty('--bg-my', '30%');
      }
    });
  };

  BGWidget.prototype.sortProviders = function(providers) {
    if (!this.lastProvider || providers.indexOf(this.lastProvider) === -1) {
      return providers.slice();
    }
    var sorted = providers.filter(function(p) { return p !== this.lastProvider; }.bind(this));
    sorted.unshift(this.lastProvider);
    return sorted;
  };

  BGWidget.prototype.renderButton = function(provider, isHighlight) {
    var info = PROVIDERS[provider];
    if (!info) return document.createElement('div');

    // Style settings
    var s = (this.config && this.config.style) || {};
    var preset = s.preset || 'default';
    var buttonWidth = s.buttonWidth || 280;
    var buttonHeight = s.buttonHeight !== undefined ? s.buttonHeight : 44;
    var buttonGap = s.buttonGap !== undefined ? s.buttonGap : 8;
    var borderRadius = s.borderRadius !== undefined ? s.borderRadius : 10;
    var buttonLabel = s.buttonLabel || '{name}로 시작하기';
    var showIcon = s.showIcon !== false;
    var iconGap = s.iconGap !== undefined ? s.iconGap : 8;
    var paddingLeft = s.paddingLeft !== undefined ? s.paddingLeft : 16;
    var align = s.align || 'center';
    var isMono = preset === 'mono';
    var isOutline = preset === 'outline';

    var justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };

    var bgColor = info.bgColor;
    var textColor = info.textColor;
    var originalColor = info.bgColor;
    var border = '';
    var isOutlineMono = preset === 'outline-mono';

    // mono preset: override colors
    if (isMono) {
      bgColor = '#ffffff';
      textColor = '#333333';
      border = '1px solid #d1d5db';
    } else if (isOutline) {
      textColor = '#333333';
      bgColor = '#ffffff';
      border = '2px solid ' + ((originalColor === '#f2f2f2' || originalColor === '#FFFFFF' || originalColor === '#ffffff') ? '#d1d5db' : originalColor);
    } else if (isOutlineMono) {
      textColor = '#333333';
      bgColor = '#ffffff';
      border = '2px solid #d1d5db';
    } else if (bgColor === '#f2f2f2' || bgColor === '#FFFFFF' || bgColor === '#ffffff') {
      border = '1px solid #dadce0';
    }

    // Plus 프리셋 집합 — 아래에서 분기용
    var PLUS_PRESET_CLASSES = {
      'glassmorphism': 'bg-preset-glass',
      'neon-glow': 'bg-preset-neon',
      'liquid-glass': 'bg-preset-liquid',
      'gradient-flow': 'bg-preset-gradient',
      'soft-shadow': 'bg-preset-soft',
      'pulse': 'bg-preset-pulse'
    };
    var isPlusPreset = PLUS_PRESET_CLASSES.hasOwnProperty(preset);

    var btn = document.createElement('a');
    var highlightClass = isHighlight ? (preset === 'icon-only' ? ' bg-btn-highlight-icon' : ' bg-btn-highlight') : '';
    btn.className = 'bg-btn' + highlightClass;
    // Plus 프리셋은 CSS 클래스만으로 스타일 제어 — 인라인 color/bg/border 설정 생략
    // (인라인 style이 남아 있으면 CSS !important와 충돌하여 브랜드 배경색이 잔존)
    if (!isPlusPreset) {
      btn.style.backgroundColor = bgColor;
      btn.style.color = textColor;
      if (border) btn.style.border = border;
    }
    btn.style.transition = 'all 0.3s';

    if (preset === 'icon-only') {
      btn.style.width = '44px';
      btn.style.height = '44px';
      btn.style.borderRadius = Math.min(borderRadius, 22) + 'px';
      btn.style.justifyContent = 'center';
      btn.style.margin = '4px';
      btn.style.padding = '0';

      var iconOnly = document.createElement('span');
      iconOnly.className = 'bg-btn-icon';
      iconOnly.innerHTML = info.icon;
      if (isMono || isOutlineMono) {
        var ipaths = iconOnly.querySelectorAll('path');
        for (var ii = 0; ii < ipaths.length; ii++) { ipaths[ii].setAttribute('fill', '#333333'); }
      }
      btn.appendChild(iconOnly);
    } else {
      var w = buttonWidth;
      btn.style.width = w + 'px';
      btn.style.height = buttonHeight + 'px';
      btn.style.borderRadius = borderRadius + 'px';
      btn.style.justifyContent = justifyMap[align] || 'center';
      btn.style.marginBottom = buttonGap + 'px';

      if (showIcon) {
        btn.style.gap = iconGap + 'px';
        btn.style.paddingLeft = paddingLeft + 'px';

        var iconSpan = document.createElement('span');
        iconSpan.className = 'bg-btn-icon';
        iconSpan.innerHTML = info.icon;
        if (isMono || isOutlineMono) {
          var paths = iconSpan.querySelectorAll('path');
          for (var pi = 0; pi < paths.length; pi++) { paths[pi].setAttribute('fill', '#333333'); }
        } else if (isOutline) {
          // outline: 모든 아이콘 fill을 소셜 배경색으로 통일 (구글은 4색 유지)
          var oFill = (originalColor === '#f2f2f2' || originalColor === '#FFFFFF' || originalColor === '#ffffff') ? '#4285F4' : originalColor;
          if (provider !== 'google') {
            var paths = iconSpan.querySelectorAll('path');
            for (var pi = 0; pi < paths.length; pi++) { paths[pi].setAttribute('fill', oFill); }
          }
        } else if (isPlusPreset && provider !== 'google') {
          // Plus 프리셋: 배경 톤에 따라 아이콘 fill 자동 결정 (구글 4색 제외)
          // 다크 배경: glass, neon, liquid, gradient → 흰색
          // 라이트 배경: soft, pulse → 검정
          var PLUS_DARK_PRESETS = new Set(['glassmorphism','neon-glow','liquid-glass','gradient-flow']);
          var plusIconFill = PLUS_DARK_PRESETS.has(preset) ? '#ffffff' : '#374151';
          var paths = iconSpan.querySelectorAll('path');
          for (var pi = 0; pi < paths.length; pi++) { paths[pi].setAttribute('fill', plusIconFill); }
        }
        btn.appendChild(iconSpan);
      } else {
        btn.style.justifyContent = 'center';
      }

      var label = document.createElement('span');
      label.textContent = buttonLabel.replace('{name}', info.name);
      btn.appendChild(label);
    }

    // Plus 프리셋 클래스 적용 + 버튼 인덱스별 딜레이(pulse)
    if (isPlusPreset) {
      var plusClass = PLUS_PRESET_CLASSES[preset];
      btn.className = btn.className + ' ' + plusClass;
      // pulse 순차 딜레이: 컨테이너 내 n번째 버튼 계산
      if (preset === 'pulse') {
        var pulseIdx = this.container ? this.container.querySelectorAll('.bg-btn').length : 0;
        var delayClasses = ['bg-preset-pulse-d1', 'bg-preset-pulse-d2', 'bg-preset-pulse-d3', 'bg-preset-pulse-d4'];
        btn.className = btn.className + ' ' + (delayClasses[pulseIdx] || delayClasses[0]);
      }
    }

    // outline / outline-mono preset: hover fill effect
    if (isOutline || isOutlineMono) {
      // 원본 아이콘 SVG 저장 (mouseleave 복원용)
      var iconEl = btn.querySelector('.bg-btn-icon');
      if (iconEl) btn.setAttribute('data-icon-html', iconEl.innerHTML);
      var hoverBg = isOutline
        ? ((originalColor === '#f2f2f2' || originalColor === '#FFFFFF' || originalColor === '#ffffff') ? '#4285F4' : originalColor)
        : '#333333';
      var restoreBorder = isOutline
        ? ((originalColor === '#f2f2f2' || originalColor === '#FFFFFF' || originalColor === '#ffffff') ? '#d1d5db' : originalColor)
        : '#d1d5db';
      btn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = hoverBg;
        this.style.color = '#fff';
        this.style.borderColor = hoverBg;
        var ps = this.querySelectorAll('path');
        for (var j = 0; j < ps.length; j++) { ps[j].setAttribute('fill', '#fff'); }
      });
      btn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#ffffff';
        this.style.color = '#333333';
        this.style.borderColor = restoreBorder;
        var saved = this.getAttribute('data-icon-html');
        var ic = this.querySelector('.bg-btn-icon');
        if (saved && ic) { ic.innerHTML = saved; }
      });
    }

    // Click handler
    var self = this;
    btn.href = '#';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      self.startAuth(provider);
    });

    return btn;
  };

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
      var mallMatch = config.sso_callback_uri.match(new RegExp('https://([^.]+)\\.cafe24\\.com'));
      var mallId = mallMatch ? mallMatch[1] : null;

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
          if (!e.origin.endsWith('.cafe24.com')) return; // origin 검증
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
    return Array.from(arr, function(b) { return b.toString(16).padStart(2, '0'); }).join('');
  };

  BGWidget.prototype.findLoginPage = function() {
    // Cafe24 login & signup page selectors
    var selectors = [
      '#member_login',
      '.xans-member-login',
      '.login_wrap',
      '.member_login_box',
      'form[action*="login"]',
      '#contents .login',
      '#member_join',
      '.xans-member-join',
      '.join_wrap',
      '.member_join_box',
      'form[action*="join"]',
      '#contents .join',
    ];

    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el) return el;
    }
    return null;
  };

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

  // ─── Plus: 미니배너 ───────────────────────────────────────────
  BGWidget.prototype.initMiniBanner = function(config) {
    var self = this;

    // 로그인 이력 기록 (현재 로그인 중이면 localStorage에 저장)
    self.checkLoginHistory();

    // 로그인한 회원에게는 미니배너 표시 안 함
    if (self.isUserLoggedIn()) return;

    var bc = config.banner_config || {};

    // 이전 로그인 기록 감지 시 표시 안 함 (설정에서 활성화된 경우)
    if (bc.hideForReturning && self.hasLoginHistory()) return;

    // 세션당 닫기 (사용자가 X 누르면 세션 동안 안 보임)
    try {
      if (sessionStorage.getItem('bg_banner_closed')) return;
    } catch (e) {}
    var banner = document.createElement('div');
    banner.className = 'bg-mini-banner';

    // 색상 프리셋 (0=밝은파랑, 1=화이트, 2=회색, 3=검정, 4=파랑보라, 5=보라자주, 6=녹색, 7=붉은색)
    // 0=화이트, 1=회색, 2=밝은파랑, 3=녹색, 4=붉은색, 5=파랑보라, 6=보라자주, 7=검정심플
    var presets = [
      { bg: '#ffffff', color: '#111827', border: '1px solid #d1d5db' },
      { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' },
      { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
      { bg: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
      { bg: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
      { bg: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', color: '#fff', border: 'none' },
      { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', border: 'none' },
      { bg: '#111827', color: '#fff', border: 'none' },
    ];
    var preset = presets[bc.preset || 0] || presets[0];

    var position = bc.position || 'floating';

    var isFullWidth = (bc.fullWidth === true);
    var paddingX = (bc.paddingX != null ? bc.paddingX : 28);
    var heightPx = 30;

    var s = banner.style;
    s.height = heightPx + 'px';
    if (isFullWidth) {
      s.width = '100%';
      s.padding = '0 16px';
    } else {
      s.width = 'auto';
      s.maxWidth = 'calc(100vw - 16px)';
      s.padding = '0 ' + paddingX + 'px';
    }
    s.background = preset.bg;
    s.color = preset.color;
    s.border = preset.border;
    s.fontSize = '14px';
    s.fontWeight = bc.bold ? '600' : '400';
    s.fontStyle = bc.italic ? 'italic' : 'normal';
    s.textAlign = 'center';
    s.cursor = 'pointer';
    s.display = 'flex';
    s.alignItems = 'center';
    s.justifyContent = 'center';
    s.gap = '8px';
    s.boxSizing = 'border-box';
    s.whiteSpace = 'nowrap';
    var bannerOpacity = ((bc.opacity != null ? bc.opacity : 90) / 100);
    s.opacity = bannerOpacity.toString();

    if (position === 'floating') {
      // 플로팅: fixed로 body에 부착, 기준 요소 바로 아래
      var animType = bc.animation || 'fadeIn';
      var anchorSel = (bc.anchorSelector || '#top_nav_box').trim();
      // 셀렉터를 정규화 (한 번만 계산)
      var resolvedSel = anchorSel;
      if (anchorSel.charAt(0) === '.' && anchorSel.indexOf(' ') >= 0) {
        resolvedSel = anchorSel.split(/\s+/).join('.');
      } else if (anchorSel.charAt(0) !== '#' && anchorSel.charAt(0) !== '.' && anchorSel.charAt(0) !== '[') {
        if (anchorSel.indexOf(' ') >= 0) {
          resolvedSel = '.' + anchorSel.split(/\s+/).join('.');
        }
      }

      var findNavBox = function() {
        if (resolvedSel.charAt(0) === '#' || resolvedSel.charAt(0) === '.' || resolvedSel.charAt(0) === '[') {
          return document.querySelector(resolvedSel);
        }
        return document.getElementById(resolvedSel) || document.querySelector('.' + resolvedSel);
      };

      var navBox = findNavBox();
      var tabProduct = document.getElementById('tabProduct');

      var isTabSticky = function() {
        // 기준 요소 자체가 tabProduct면 충돌 방지
        if (navBox && tabProduct && navBox === tabProduct) return false;
        if (!tabProduct || !navBox) return false;
        var navRect = navBox.getBoundingClientRect();
        var tabRect = tabProduct.getBoundingClientRect();
        return tabRect.top <= navRect.bottom + 5;
      };

      // 기준 요소가 뷰포트에 보이는지
      var isNavVisible = function() {
        if (!navBox) return false; // 기준 요소 못 찾으면 숨김
        var rect = navBox.getBoundingClientRect();
        var vh = window.innerHeight;
        return rect.bottom > 0 && rect.top < vh * 0.5;
      };

      s.position = 'fixed';
      s.left = isFullWidth ? '0' : '50%';
      if (!isFullWidth) s.transform = 'translateX(-50%)';
      s.borderRadius = (bc.borderRadius != null ? bc.borderRadius : 0) + 'px';
      s.zIndex = '9998';

      // 초기: 숨김 상태
      s.opacity = '0';
      s.pointerEvents = 'none';
      if (animType === 'fadeIn') {
        s.transition = 'opacity 1s ease';
      } else {
        s.transition = 'opacity 0.8s ease, top 0.8s ease';
      }

      // 초기 top은 0 (뷰포트 기준 재계산은 updatePos에서 수행)
      s.top = '0px';

      var lastState = 'hidden'; // hidden, visible, tab-hidden
      var updatePos = function() {
        // 기준 요소가 DOM에 없거나 분리(orphaned)되었으면 재탐색
        if (!navBox || !document.body.contains(navBox)) {
          navBox = findNavBox();
          if (!navBox) return;
          tabProduct = document.getElementById('tabProduct');
        }
        var tabSticky = isTabSticky();
        var navVisible = isNavVisible();

        if (tabSticky) {
          // tabProduct가 sticky → 배너 숨김
          if (lastState !== 'tab-hidden') {
            banner.style.opacity = '0';
            banner.style.pointerEvents = 'none';
            lastState = 'tab-hidden';
          }
        } else if (navVisible) {
          // 기준 요소가 뷰포트에 보임 → 배너 표시
          var targetTop = navBox ? navBox.getBoundingClientRect().bottom : 0;
          if (lastState !== 'visible') {
            if (animType === 'slideDown') {
              // 슬라이드: nav 위에서 시작 → 아래로 내려옴
              banner.style.transition = 'none';
              banner.style.top = (targetTop - heightPx) + 'px';
              banner.style.opacity = '0';
              banner.offsetHeight; // 강제 리플로우
              banner.style.transition = 'opacity 0.8s ease, top 0.8s ease';
              banner.style.top = targetTop + 'px';
              banner.style.opacity = bannerOpacity.toString();
            } else {
              banner.style.top = targetTop + 'px';
              banner.style.opacity = bannerOpacity.toString();
            }
            banner.style.pointerEvents = 'auto';
            lastState = 'visible';
          } else {
            banner.style.top = targetTop + 'px';
          }
        } else {
          // 기준 요소가 뷰포트 밖 → 배너 숨김
          if (lastState !== 'hidden') {
            banner.style.opacity = '0';
            banner.style.pointerEvents = 'none';
            lastState = 'hidden';
          }
        }
      };
      // 페이지 로드 후 딜레이를 줘서 출현 효과(fadeIn/slideDown)가 보이도록
      setTimeout(function() {
        updatePos();
        window.addEventListener('scroll', updatePos, { passive: true });
        window.addEventListener('resize', updatePos);
      }, 800);
    } else {
      // 위젯 상단: 소셜 버튼 위에 삽입
      s.borderRadius = (bc.borderRadius != null ? bc.borderRadius : 10) + 'px';
      s.marginBottom = '12px';
    }

    // 아이콘
    var icon = document.createElement('span');
    icon.textContent = bc.icon || '\\u26A1';
    icon.style.fontSize = '16px';

    // 텍스트
    var text = document.createElement('span');
    text.textContent = bc.text || '\\uBC88\\uAC1C\\uAC00\\uC785\\uC73C\\uB85C \\uD68C\\uC6D0 \\uD61C\\uD0DD\\uC744 \\uBC1B\\uC73C\\uC138\\uC694!';

    // 닫기 버튼
    var closeBtn = document.createElement('span');
    closeBtn.textContent = '\\u00D7'; // ×
    closeBtn.style.cssText = 'margin-left:auto;font-size:18px;opacity:0.5;cursor:pointer;padding:0 4px;flex-shrink:0';
    closeBtn.addEventListener('click', function(e) {
      e.stopPropagation();
      banner.style.display = 'none';
      try { sessionStorage.setItem('bg_banner_closed', '1'); } catch (ex) {}
    });

    // 아이콘+텍스트를 감싸는 컨테이너 (가운데 정렬용)
    var contentWrap = document.createElement('span');
    contentWrap.style.cssText = 'display:flex;align-items:center;gap:6px;margin:0 auto';
    contentWrap.appendChild(icon);
    contentWrap.appendChild(text);

    banner.appendChild(contentWrap);
    banner.appendChild(closeBtn);

    banner.addEventListener('click', function() {
      self.trackEvent('banner_click', { page: self.pageType });
      window.location.href = '/member/login.html';
    });

    // DOM 삽입
    if (position === 'floating') {
      // body에 직접 부착 (overflow 영향 없음)
      document.body.appendChild(banner);
    } else {
      // 위젯 상단: .bg-widget 바로 위에 삽입 (로그인 페이지에서만 의미 있음)
      var widgetContainer = document.querySelector('.bg-widget');
      if (widgetContainer && widgetContainer.parentNode) {
        widgetContainer.parentNode.insertBefore(banner, widgetContainer);
      }
    }
    self.trackEvent('banner_show', { page: self.pageType });
  };

  // ─── Plus: 이탈 감지 팝업 ────────────────────────────────────
  BGWidget.prototype.initExitPopup = function(config) {
    var self = this;
    var pc = config.popup_config;

    // 설정이 없거나 비활성화면 기본 동작 (로그인 페이지 한정, 하드코딩 텍스트)
    var enabled = pc ? pc.enabled !== false : true;
    if (!enabled) return;

    var allPages = pc ? pc.allPages === true : false;
    // allPages가 아니면 로그인/가입 페이지에서만 동작
    if (!allPages && this.pageType !== 'login') return;

    var popupTitle = pc && pc.title ? pc.title : '잠깐만요!';
    var popupBody = pc && pc.body ? pc.body : '지금 가입하면 특별 혜택을 드려요!';
    var popupCta = pc && pc.ctaText ? pc.ctaText : '혜택 받고 가입하기';
    var popupIcon = pc ? (pc.icon != null ? pc.icon : '\uD83C\uDF81') : '\uD83C\uDF81';
    var popupBorderRadius = pc && pc.borderRadius != null ? pc.borderRadius : 16;
    var popupOpacity = pc && pc.opacity != null ? pc.opacity : 100;
    var cooldownMs = ((pc && pc.cooldownHours ? pc.cooldownHours : 24)) * 60 * 60 * 1000;
    var presetIdx = pc && pc.preset != null ? pc.preset : 0;
    var popupPresets = [
      { ctaBg: '#2563eb', iconBg: 'linear-gradient(135deg, #2563eb, #7c3aed)' },
      { ctaBg: '#059669', iconBg: 'linear-gradient(135deg, #059669, #10b981)' },
      { ctaBg: '#ea580c', iconBg: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
      { ctaBg: '#6b7280', iconBg: '#6b7280' },
      { ctaBg: '#111827', iconBg: '#111827' },
      { ctaBg: '#ec4899', iconBg: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
      { ctaBg: '#eff6ff', ctaBorder: '2px solid #93c5fd', ctaColor: '#2563eb', iconBg: '#eff6ff', iconBorder: '2px solid #93c5fd', iconColor: '#2563eb' },
      { ctaBg: 'transparent', ctaBorder: '2px solid #9ca3af', ctaColor: '#6b7280', iconBg: 'transparent', iconBorder: '2px solid #d1d5db', iconColor: '#6b7280' },
    ];
    var preset = popupPresets[presetIdx] || popupPresets[0];

    // 쿨다운 체크 (localStorage)
    var popupKey = 'bg_exit_popup_shown';
    try {
      var lastShown = localStorage.getItem(popupKey);
      if (lastShown) {
        if (parseInt(lastShown, 10) > Date.now() - cooldownMs) return;
      }
    } catch(e) {}

    var shown = false;

    function showPopup() {
      if (shown) return;
      shown = true;
      try { localStorage.setItem(popupKey, String(Date.now())); } catch(e) {}

      // 오버레이
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center';

      // 모달
      var modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;border-radius:' + popupBorderRadius + 'px;opacity:' + (popupOpacity / 100);

      // 닫기 버튼
      var closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:4px 8px';
      closeBtn.textContent = '\u2715';
      closeBtn.addEventListener('click', function() {
        overlay.remove();
        self.trackEvent('popup_close', {});
      });

      // 아이콘
      if (popupIcon) {
        var iconWrap = document.createElement('div');
        iconWrap.style.cssText = 'width:48px;height:48px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center;background:' + preset.iconBg + ';' + (preset.iconBorder ? 'border:' + preset.iconBorder : '');
        var iconSpan = document.createElement('span');
        iconSpan.style.cssText = 'font-size:20px;color:' + (preset.iconColor || 'white');
        iconSpan.textContent = popupIcon;
        iconWrap.appendChild(iconSpan);
        modal.appendChild(iconWrap);
      }

      // 제목
      var title = document.createElement('h3');
      title.textContent = popupTitle;
      title.style.cssText = 'font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;color:#111827';

      // 본문
      var body = document.createElement('p');
      body.innerHTML = escapeHtml(popupBody).replace(/\\n/g, '<br>');
      body.style.cssText = 'font-size:14px;color:#6b7280;text-align:center;margin:0 0 16px';

      // Plus 쿠폰팩 카드 (pack.state === 'active')
      var cpConfig = config.coupon_pack;
      var cpCardEl = null;
      if (cpConfig && cpConfig.active) {
        cpCardEl = self.renderCouponPackCard(cpConfig);
        self.trackEvent('widget.coupon_pack_shown', {
          source: 'exit_popup',
          design: cpConfig.design || 'brand',
          anim_mode: cpConfig.anim_mode !== false,
          total_amount: cpConfig.total_amount || 55000
        });
      }

      // CTA 버튼
      var ctaBtn = document.createElement('button');
      var ctaText = cpCardEl
        ? '\\ud68c\\uc6d0\\uac00\\uc785 \\u2192'  // 회원가입 →
        : popupCta;
      ctaBtn.textContent = ctaText;
      var ctaR = Math.max(6, popupBorderRadius - 6);
      ctaBtn.style.cssText = 'display:block;width:100%;padding:14px;border-radius:' + ctaR + 'px;background:' + preset.ctaBg + ';color:' + (preset.ctaColor || '#fff') + ';font-size:16px;font-weight:700;cursor:pointer;border:' + (preset.ctaBorder || 'none');
      ctaBtn.addEventListener('click', function() {
        overlay.remove();
        self.trackEvent('popup_signup', {});
        if (cpCardEl) {
          self.trackEvent('widget.coupon_pack_clicked', {
            source: 'exit_popup',
            design: cpConfig.design || 'brand',
            total_amount: cpConfig.total_amount || 55000
          });
        }
        window.location.href = '/member/login.html';
      });

      modal.appendChild(closeBtn);
      modal.appendChild(title);
      modal.appendChild(body);
      // 쿠폰팩 카드 (Plus 플랜, state=active): body 아래, CTA 위에 배치 (핵심 비주얼)
      if (cpCardEl) modal.appendChild(cpCardEl);
      modal.appendChild(ctaBtn);
      overlay.appendChild(modal);

      // 오버레이 클릭으로 닫기
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          overlay.remove();
          self.trackEvent('popup_close', {});
        }
      });

      document.body.appendChild(overlay);
      self.trackEvent('popup_show', {});
    }

    // PC: mouseout (상단으로 마우스가 나갈 때)
    if (!/Mobi|Android/i.test(navigator.userAgent)) {
      document.addEventListener('mouseout', function(e) {
        if (e.clientY <= 0) showPopup();
      });
    } else {
      // 모바일: 빠른 scroll-up 패턴 감지
      var lastScrollY = window.scrollY;
      var scrollUpCount = 0;
      window.addEventListener('scroll', function() {
        var currentY = window.scrollY;
        if (currentY < lastScrollY && lastScrollY - currentY > 50) {
          scrollUpCount++;
          if (scrollUpCount >= 3) showPopup();
        } else {
          scrollUpCount = 0;
        }
        lastScrollY = currentY;
      }, { passive: true });
    }
  };

  // ─── Plus: 카카오 채널 추가 안내 ──────────────────────────────
  BGWidget.prototype.initKakaoChannel = function(config) {
    var self = this;

    // 가입 완료 페이지(/member/join.html)에서만 동작
    var path = window.location.pathname.toLowerCase();
    var isJoinPage = path.indexOf('/member/join') >= 0;
    if (!isJoinPage) return;

    var channelId = config.kakao_channel_id;
    if (!channelId) return;

    // 카카오 채널 추가 버튼 생성
    var btn = document.createElement('button');
    var bs = btn.style;
    bs.display = 'flex';
    bs.alignItems = 'center';
    bs.justifyContent = 'center';
    bs.gap = '8px';
    bs.width = '100%';
    bs.maxWidth = '320px';
    bs.margin = '12px auto 0';
    bs.padding = '12px 16px';
    bs.background = '#FEE500';
    bs.color = '#191919';
    bs.border = 'none';
    bs.borderRadius = '10px';
    bs.fontSize = '14px';
    bs.fontWeight = '600';
    bs.cursor = 'pointer';
    bs.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    bs.boxSizing = 'border-box';

    // 카카오 아이콘 (SVG)
    var iconSpan = document.createElement('span');
    iconSpan.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#191919" d="M12 3C6.48 3 2 6.36 2 10.4c0 2.6 1.72 4.88 4.3 6.18l-1.1 4.02c-.08.3.26.54.52.36l4.78-3.18c.48.06.98.1 1.5.1 5.52 0 10-3.36 10-7.48C22 6.36 17.52 3 12 3z"/></svg>';

    var label = document.createElement('span');
    label.textContent = '\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uCD94\\uAC00\\uD558\\uACE0 \\uC54C\\uB9BC \\uBC1B\\uAE30'; // 카카오 채널 추가하고 알림 받기

    btn.appendChild(iconSpan);
    btn.appendChild(label);

    btn.addEventListener('mouseenter', function() { this.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', function() { this.style.opacity = '1'; });

    btn.addEventListener('click', function() {
      self.trackEvent('kakao_channel_click', { channel_id: channelId });
      window.open('https://pf.kakao.com/' + channelId, '_blank');
    });

    // 가입 완료 영역 찾아서 버튼 삽입
    var joinComplete = document.querySelector('.xans-member-join') || document.querySelector('#member_join') || document.querySelector('.join_wrap');
    if (joinComplete) {
      joinComplete.appendChild(btn);
    } else {
      // 영역을 찾지 못하면 body 하단에 플로팅 형태로 표시
      btn.style.position = 'fixed';
      btn.style.bottom = '80px';
      btn.style.left = '50%';
      btn.style.transform = 'translateX(-50%)';
      btn.style.zIndex = '99998';
      btn.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)';
      document.body.appendChild(btn);
    }

    // 토스트 안내 표시
    self.showToast('\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uCD94\\uAC00\\uD558\\uACE0 \\uC54C\\uB9BC \\uBC1B\\uC544\\uBCF4\\uC138\\uC694! \\u2764\\uFE0F'); // 카카오 채널 추가하고 알림 받아보세요! ❤️
    self.trackEvent('kakao_channel_show', {});
  };

  // ─── Plus: 재방문 비회원 에스컬레이션 ──────────────────────────
  BGWidget.prototype.initEscalation = function(config) {
    var self = this;
    var ec = config.escalation_config;

    var enabled = ec ? ec.enabled !== false : true;
    if (!enabled) return;

    var hideForReturning = ec ? ec.hideForReturning !== false : true;

    // 로그인한 회원은 표시 안 함
    if (self.isUserLoggedIn()) return;

    // hideForReturning이면 과거 로그인 이력 체크
    if (hideForReturning && self.hasLoginHistory()) return;

    // 방문 횟수 — 전역 bgVisitCount 사용 (이중 증가 방지)
    var visitCount = bgVisitCount;

    var toastEnabled = ec ? ec.toastEnabled !== false : true;
    var floatingEnabled = ec ? ec.floatingEnabled !== false : true;

    var toastStartVisit = ec && ec.toastStartVisit != null ? ec.toastStartVisit : 2;
    var toastEndVisit = ec && ec.toastEndVisit != null ? ec.toastEndVisit : 3;
    var floatingStartVisit = toastEndVisit + 1;

    if (visitCount < toastStartVisit) return; // 설정된 시작 횟수 미만이면 표시 없음

    self.trackEvent('escalation_show', { visit_count: visitCount });

    // 토스트 설정
    var toastText = ec && ec.toastText ? ec.toastText : '\\uC548\\uB155\\uD558\\uC138\\uC694. {n}\\uBC88\\uC9F8 \\uBC29\\uBB38\\uC744 \\uD658\\uC601\\uD569\\uB2C8\\uB2E4.';
    var toastStyle = ec && ec.toastStyle != null ? ec.toastStyle : 0;
    var toastOpacity = ec && ec.toastOpacity != null ? ec.toastOpacity : 96;
    var toastBorderRadius = ec && ec.toastBorderRadius != null ? ec.toastBorderRadius : 20;
    var toastAnimation = ec && ec.toastAnimation ? ec.toastAnimation : 'fadeIn';
    var toastDuration = ec && ec.toastDuration != null ? ec.toastDuration : 3;
    var toastPersist = ec && ec.toastPersist === true;

    // 플로팅 배너 설정
    var floatingText = ec && ec.floatingText ? ec.floatingText : '\\uD68C\\uC6D0\\uAC00\\uC785\\uD558\\uBA74 \\uD2B9\\uBCC4 \\uD61C\\uD0DD!';
    var floatingBtnText = ec && ec.floatingBtnText ? ec.floatingBtnText : '\\uBC14\\uB85C \\uAC00\\uC785\\uD558\\uAE30';
    var floatingPreset = ec && ec.floatingPreset != null ? ec.floatingPreset : 0;
    var floatingOpacity = ec && ec.floatingOpacity != null ? ec.floatingOpacity : 100;
    var floatingBorderRadius = ec && ec.floatingBorderRadius != null ? ec.floatingBorderRadius : 0;
    var floatingAnimation = ec && ec.floatingAnimation ? ec.floatingAnimation : 'fadeIn';

    var floatingPresets = [
      { bg: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', btnColor: '#2563eb', btnBg: 'white' },
      { bg: '#111827', color: 'white', btnColor: '#374151', btnBg: 'white' },
      { bg: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: 'white', btnColor: '#ec4899', btnBg: 'white' },
      { bg: '#6b7280', color: 'white', btnColor: '#6b7280', btnBg: 'white' },
      { bg: '#ffffff', color: '#111827', btnColor: 'white', btnBg: '#2563eb', border: '1px solid #e5e7eb' },
    ];

    var toastStyles = [
      { bg: 'rgba(30,30,30,.92)', color: '#fff', shadow: '' },
      { bg: '#ffffff', color: '#111827', shadow: '0 4px 16px rgba(0,0,0,0.12)' },
      { bg: '#6b7280', color: '#fff', shadow: '' },
      { bg: '#eff6ff', color: '#2563eb', shadow: '0 2px 8px rgba(37,99,235,0.15)', border: '1px solid #93c5fd' },
    ];

    if (toastEnabled && visitCount >= toastStartVisit && visitCount <= toastEndVisit) {
      // 2회 방문: 부드러운 토스트 안내
      var ts = toastStyles[toastStyle] || toastStyles[0];
      setTimeout(function() {
        // 이미 표시 중이면 무시
        if (document.querySelector('.bg-toast')) return;
        var toast = document.createElement('div');
        toast.className = 'bg-toast';
        var tst = toast.style;
        tst.position = 'fixed';
        tst.bottom = '24px';
        tst.left = '50%';
        tst.transform = toastAnimation === 'slideUp' ? 'translateX(-50%) translateY(40px)' : 'translateX(-50%) translateY(20px)';
        tst.background = ts.bg;
        tst.color = ts.color;
        if (ts.shadow) tst.boxShadow = ts.shadow;
        if (ts.border) tst.border = ts.border;
        tst.padding = '10px 20px';
        tst.borderRadius = toastBorderRadius + 'px';
        tst.fontSize = '13px';
        tst.fontWeight = '500';
        tst.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
        tst.zIndex = '99999';
        tst.opacity = '0';
        tst.transition = 'all 1.6s ease';
        tst.whiteSpace = 'nowrap';
        tst.maxWidth = 'calc(100vw - 32px)';
        tst.boxSizing = 'border-box';
        tst.textAlign = 'center';
        tst.opacity = String(toastOpacity / 100);
        var toastContent = document.createElement('span');
        toastContent.textContent = toastText.replace('{n}', String(visitCount));
        toast.appendChild(toastContent);
        if (toastPersist) {
          var toastClose = document.createElement('span');
          toastClose.textContent = '\\u2715';
          toastClose.style.cssText = 'margin-left:10px;cursor:pointer;opacity:0.6;font-size:12px';
          toastClose.addEventListener('click', function() {
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
          });
          toast.appendChild(toastClose);
        }
        document.body.appendChild(toast);
        setTimeout(function() {
          toast.style.opacity = String(toastOpacity / 100);
          toast.style.transform = 'translateX(-50%) translateY(0)';
        }, 50);
        if (!toastPersist) {
          setTimeout(function() {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
            setTimeout(function() { toast.remove(); }, 300);
          }, toastDuration * 1000);
        }
      }, 1600);

    } else if (floatingEnabled && visitCount >= floatingStartVisit) {
      // 설정된 횟수 이상: 적극적 플로팅 배너
      setTimeout(function() {
      var fp = floatingPresets[floatingPreset] || floatingPresets[0];

      var banner = document.createElement('div');
      var bs2 = banner.style;
      bs2.position = 'fixed';
      bs2.bottom = '0';
      bs2.left = '0';
      bs2.right = '0';
      bs2.background = fp.bg;
      bs2.color = fp.color;
      if (fp.border) bs2.border = fp.border;
      bs2.padding = '14px 20px';
      bs2.display = 'flex';
      bs2.alignItems = 'center';
      bs2.justifyContent = 'space-between';
      bs2.zIndex = '99997';
      bs2.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
      bs2.boxShadow = fp.border ? 'none' : '0 -4px 20px rgba(0,0,0,.2)';
      bs2.gap = '12px';
      bs2.boxSizing = 'border-box';
      bs2.borderRadius = floatingBorderRadius > 0 ? (floatingBorderRadius + 'px ' + floatingBorderRadius + 'px 0 0') : '0';
      bs2.opacity = String(floatingOpacity / 100);

      var msgSpan = document.createElement('span');
      msgSpan.textContent = floatingText.replace('{n}', String(visitCount));
      msgSpan.style.fontSize = '14px';
      msgSpan.style.fontWeight = '600';
      msgSpan.style.color = fp.color;
      msgSpan.style.flex = '1';

      var joinBtn = document.createElement('button');
      var jbs = joinBtn.style;
      jbs.background = fp.btnBg || '#fff';
      jbs.color = fp.btnColor;
      jbs.border = 'none';
      jbs.borderRadius = '20px';
      jbs.padding = '8px 16px';
      jbs.fontSize = '13px';
      jbs.fontWeight = '700';
      jbs.cursor = 'pointer';
      jbs.whiteSpace = 'nowrap';
      jbs.flexShrink = '0';
      joinBtn.textContent = floatingBtnText;

      var closeBtn2 = document.createElement('button');
      var cbs = closeBtn2.style;
      cbs.background = 'none';
      cbs.border = 'none';
      cbs.color = 'rgba(255,255,255,.7)';
      cbs.fontSize = '18px';
      cbs.cursor = 'pointer';
      cbs.padding = '0 4px';
      cbs.lineHeight = '1';
      cbs.flexShrink = '0';
      closeBtn2.textContent = '\\u2715'; // ✕

      joinBtn.addEventListener('click', function() {
        self.trackEvent('escalation_click', { visit_count: visitCount });
        window.location.href = '/member/join.html';
      });

      closeBtn2.addEventListener('click', function() {
        banner.remove();
        self.trackEvent('escalation_dismiss', { visit_count: visitCount });
      });

      banner.appendChild(msgSpan);
      banner.appendChild(joinBtn);
      banner.appendChild(closeBtn2);

      if (floatingAnimation === 'slideUp') {
        banner.style.transform = 'translateY(100%)';
        banner.style.transition = 'transform .3s ease';
        document.body.appendChild(banner);
        setTimeout(function() { banner.style.transform = 'translateY(0)'; }, 300);
      } else {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 1.6s ease';
        document.body.appendChild(banner);
        setTimeout(function() { banner.style.opacity = String(floatingOpacity / 100); }, 50);
      }
    }, 1600);
    }
  };

  // ─── Plus: 토스트 알림 (공용) ─────────────────────────────────
  BGWidget.prototype.showToast = function(message) {
    // 이미 표시 중이면 무시
    if (document.querySelector('.bg-toast')) return;

    var toast = document.createElement('div');
    toast.className = 'bg-toast';
    var ts = toast.style;
    ts.position = 'fixed';
    ts.bottom = '24px';
    ts.left = '50%';
    ts.transform = 'translateX(-50%) translateY(20px)';
    ts.background = 'rgba(30,30,30,.92)';
    ts.color = '#fff';
    ts.padding = '10px 20px';
    ts.borderRadius = '24px';
    ts.fontSize = '13px';
    ts.fontWeight = '500';
    ts.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    ts.zIndex = '99999';
    ts.opacity = '0';
    ts.transition = 'all .8s ease';
    ts.whiteSpace = 'nowrap';
    ts.maxWidth = 'calc(100vw - 32px)';
    ts.boxSizing = 'border-box';
    ts.textAlign = 'center';
    toast.textContent = message;

    document.body.appendChild(toast);

    // 슬라이드 인
    setTimeout(function() {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 50);

    // 3초 후 사라짐
    setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  };

    // ─── Smart Trigger Engine ────────────────────────────────────
    ` + getSmartTriggerJs() + `

    // ─── Exit-intent 쿠폰 게이트 ─────────────────────────────────
    ` + getExitIntentJs() + `

    // ─── 라이브 가입자 카운터 ─────────────────────────────────────
    ` + getLiveCounterJs() + `

    // ─── 쿠폰팩 카드 렌더러 ──────────────────────────────────────
    ` + getCouponPackJs() + `

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
