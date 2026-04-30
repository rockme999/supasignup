/**
 * 번개가입 Widget - buttons.js source
 *
 * This file is served as inline JavaScript from the API worker.
 * It renders social login buttons on Cafe24 shop pages.
 *
 * Security: No innerHTML usage. All DOM is built with createElement + textContent.
 */

import { getSmartTriggerJs } from './smart-triggers';
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
import { getBaseCss } from './styles/base-css';
import { getPresetsCss } from './styles/presets-css';
import { getAnimationsCss } from './styles/animations-css';

// 빌드 타임에 CSS 룰들을 평가하여 단일 string으로 inline.
// (이전 회귀: template literal 안에서 [...getBaseCss(),...].join('\n')을 그대로 적어
//  IIFE 안에 함수 호출 코드가 그대로 남아 브라우저 런타임에 ReferenceError 발생.
//  WIDGET_CSS는 init() 첫 줄에서 사용되므로 위젯 전체가 첫 진입에서 throw됐음.)
const __WIDGET_CSS_INLINE__ = JSON.stringify(
  [
    ...getBaseCss(),
    ...getPresetsCss(),
    ...getAnimationsCss(),
  ].join('\n')
);

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
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M16.27 12.27L7.44 3H3v18h4.73V12.73L16.56 21H21V3h-4.73z"/></svg>'
    },
    google: {
      name: 'Google',
      color: '#4285F4',
      bgColor: '#f2f2f2',
      textColor: '#1F1F1F',
      icon: '<svg viewBox="0 0 48 48" width="16" height="16"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/></svg>'
    },
    apple: {
      name: 'Apple',
      color: '#000000',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="2 2 20 20" width="18" height="18"><path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>'
    },
    discord: {
      name: 'Discord',
      color: '#5865F2',
      bgColor: '#5865F2',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
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

  var WIDGET_CSS = ` + __WIDGET_CSS_INLINE__ + `;

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
          // Exit-intent 쿠폰 게이트는 initExitPopup으로 완전 통합됨 (2026-04-30 제거).
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

    // ─── Exit-intent 쿠폰 게이트 [REMOVED 2026-04-30] ─────────────
    // initExitPopup(features/exit-popup.ts)으로 흡수됨. getExitIntentJs() 호출 제거.

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
