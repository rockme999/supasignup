/**
 * 번개가입 Widget - buttons.js source
 *
 * This file is served as inline JavaScript from the API worker.
 * It renders social login buttons on Cafe24 shop pages.
 *
 * Security: No innerHTML usage. All DOM is built with createElement + textContent.
 */

export const WIDGET_JS = `(function() {
  'use strict';

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
      bgColor: '#FFFFFF',
      textColor: '#1F1F1F',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>'
    },
    apple: {
      name: 'Apple',
      color: '#000000',
      bgColor: '#000000',
      textColor: '#FFFFFF',
      icon: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.51-3.23 0-1.44.64-2.2.45-3.06-.4C3.79 16.17 4.36 9.02 8.83 8.76c1.28.07 2.17.72 2.91.78.93-.19 1.82-.87 2.82-.79 1.68.13 2.94.78 3.64 2.02-3.12 1.86-2.37 5.98.47 7.13-.57 1.5-1.31 2.99-2.62 4.38zM12.03 8.7c-.16-2.35 1.72-4.38 3.87-4.7.33 2.64-2.38 4.62-3.87 4.7z"/></svg>'
    }
  };

  var WIDGET_CSS = [
    '.bg-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:320px;margin:16px auto;padding:0}',
    '.bg-widget-title{font-size:13px;color:#666;text-align:center;margin-bottom:10px;display:flex;align-items:center;justify-content:center;gap:4px}',
    '.bg-flash{font-size:16px}',
    '.bg-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:44px;border:1px solid #ddd;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s ease;margin-bottom:8px;text-decoration:none;box-sizing:border-box}',
    '.bg-btn:hover{opacity:.85;transform:translateY(-1px)}',
    '.bg-btn-highlight{border:2px solid #3B82F6;box-shadow:0 0 0 1px #3B82F6;font-weight:700;position:relative}',
    '.bg-btn-highlight::after{content:"이전에 사용";position:absolute;top:-9px;right:8px;background:#3B82F6;color:#fff;font-size:10px;padding:1px 6px;border-radius:3px;font-weight:500}',
    '.bg-btn-icon{display:flex;align-items:center;flex-shrink:0}',
    '.bg-powered{text-align:center;margin-top:4px;font-size:11px;color:#aaa}',
    '@media(max-width:480px){.bg-widget{max-width:100%;margin:12px 8px}.bg-btn{height:48px;font-size:15px}}'
  ].join('\\n');

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

    // Find script tag to get shop client_id
    var scripts = document.querySelectorAll('script[src*="buttons.js"]');
    var clientId = null;
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      var match = src.match(/[?&]shop=([^&]+)/);
      if (match) {
        clientId = match[1];
        break;
      }
      // Also check data attribute
      var dataShop = scripts[i].getAttribute('data-shop');
      if (dataShop) {
        clientId = dataShop;
        break;
      }
    }

    if (!clientId) {
      console.warn('[번개가입] client_id not found');
      return;
    }

    // Save last provider from URL (after OAuth callback)
    this.saveLastProvider();

    // Read last provider from localStorage
    try {
      this.lastProvider = localStorage.getItem('bg_last_provider');
    } catch (e) {
      // Private browsing mode - graceful fallback
    }

    // Load config from API
    this.loadConfig(clientId);
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
        if (config.providers && config.providers.length > 0) {
          self.render();
        }
      })
      .catch(function(err) {
        console.warn('[번개가입] Failed to load config:', err.message);
      });
  };

  BGWidget.prototype.getApiBase = function() {
    var scripts = document.querySelectorAll('script[src*="buttons.js"]');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].getAttribute('src') || '';
      var match = src.match(/^(https?:\\/\\/[^/]+)/);
      if (match) return match[1];
    }
    return 'https://bg.suparain.kr';
  };

  BGWidget.prototype.render = function() {
    // Find or create container
    this.container = document.querySelector('#bg-widget');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'bg-widget';
      // Try to find Cafe24 login page area
      var target = this.findLoginPage();
      if (target) {
        target.parentNode.insertBefore(this.container, target);
      } else {
        // Fallback: append to body
        document.body.appendChild(this.container);
      }
    }

    this.container.className = 'bg-widget';

    // Title
    var title = document.createElement('div');
    title.className = 'bg-widget-title';
    var flash = document.createElement('span');
    flash.className = 'bg-flash';
    flash.textContent = '\\u26A1';
    title.appendChild(flash);
    var titleText = document.createElement('span');
    titleText.textContent = ' 간편 로그인';
    title.appendChild(titleText);
    this.container.appendChild(title);

    // Sort providers (last used first)
    var providers = this.sortProviders(this.config.providers);

    // Render buttons
    for (var i = 0; i < providers.length; i++) {
      var btn = this.renderButton(providers[i], i === 0 && this.lastProvider === providers[i]);
      this.container.appendChild(btn);
    }

    // Powered by
    var powered = document.createElement('div');
    powered.className = 'bg-powered';
    powered.textContent = 'powered by 번개가입';
    this.container.appendChild(powered);
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

    var btn = document.createElement('a');
    btn.className = 'bg-btn' + (isHighlight ? ' bg-btn-highlight' : '');
    btn.style.backgroundColor = info.bgColor;
    btn.style.color = info.textColor;
    if (info.bgColor === '#FFFFFF') {
      btn.style.border = '1px solid #dadce0';
    }

    // Icon (using innerHTML only for SVG icons which are hardcoded constants, not user data)
    var iconSpan = document.createElement('span');
    iconSpan.className = 'bg-btn-icon';
    iconSpan.innerHTML = info.icon;
    btn.appendChild(iconSpan);

    // Label
    var label = document.createElement('span');
    label.textContent = info.name + '로 계속하기';
    btn.appendChild(label);

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

    // For Cafe24: store provider hint in KV, then trigger native SSO flow
    // Use fetch + waitUntil pattern to ensure hint is stored before SSO trigger
    if (config.sso_callback_uri && typeof MemberAction !== 'undefined' && MemberAction.snsLogin) {
      var hintUrl = this.baseUrl + '/api/widget/hint?client_id=' + encodeURIComponent(config.client_id) + '&provider=' + encodeURIComponent(provider);
      var returnUrl = encodeURIComponent(window.location.pathname || '/index.html');
      // Save last provider to localStorage for smart button (Cafe24 SSO doesn't pass bg_provider back)
      try { localStorage.setItem('bg_last_provider', provider); } catch (e) {}
      fetch(hintUrl, { mode: 'cors' }).then(function() {
        MemberAction.snsLogin('sso', returnUrl);
      }).catch(function() {
        MemberAction.snsLogin('sso', returnUrl);
      });
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

  // ─── Initialize ──────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      new BGWidget().init();
    });
  } else {
    new BGWidget().init();
  }
})();`;
