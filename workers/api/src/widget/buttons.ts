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
    '.bg-btn-icon{display:flex;align-items:center;flex-shrink:0}',
    '.bg-powered{text-align:center;margin-top:4px;font-size:11px;color:#aaa}',
    '.bg-link-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;margin:20px auto;padding:20px;max-width:480px;background:#fff;border:1px solid #e5e7eb;border-radius:12px}',
    '.bg-link-title{font-size:15px;font-weight:600;color:#333;margin-bottom:16px;display:flex;align-items:center;gap:6px}',
    '.bg-link-row{display:flex;align-items:center;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px}',
    '.bg-link-row .bg-btn-icon{margin-right:10px}',
    '.bg-link-name{flex:1;font-size:14px;font-weight:500;color:#333}',
    '.bg-link-badge{font-size:12px;padding:2px 10px;border-radius:12px;font-weight:500}',
    '.bg-link-badge.linked{background:#dcfce7;color:#16a34a}',
    '.bg-link-badge.unlinked{background:#f1f5f9;color:#64748b;cursor:pointer;transition:all .15s}',
    '.bg-link-badge.unlinked:hover{background:#3b82f6;color:#fff}',
    '.bg-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);z-index:99999;display:flex;align-items:center;justify-content:center}',
    '.bg-modal{background:#fff;border-radius:16px;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative}',
    '.bg-modal-close{position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:4px 8px}',
    '.bg-modal-close:hover{color:#333}',
    '@media(max-width:480px){.bg-widget{margin:12px 8px}.bg-btn{font-size:15px}.bg-modal{padding:16px;margin:8px}}'
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
      console.warn('[번개가입] client_id not found. scripts found:', scripts.length);
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

    // Detect page type
    this.pageType = this.detectPageType();

    // 로그인/가입 페이지 또는 마이페이지에서만 위젯 표시
    // 그 외 페이지에서는 아무것도 렌더링하지 않음
    if (this.pageType === 'login' || this.pageType === 'myshop') {
      this.loadConfig(clientId);
    }
  };

  BGWidget.prototype.detectPageType = function() {
    var path = window.location.pathname.toLowerCase();
    if (path.indexOf('/myshop') === 0) return 'myshop';
    if (path.indexOf('/member/login') >= 0 || path.indexOf('/member/join') >= 0) return 'login';
    return 'other';
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
          if (self.pageType === 'myshop') {
            self.renderLinkWidget();
          } else {
            self.render();
          }
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
      this.container.style.maxWidth = (buttonWidth + 32) + 'px';
    } else {
      this.container.style.display = 'flex';
      this.container.style.flexDirection = 'column';
      this.container.style.alignItems = 'center';
      this.container.style.maxWidth = (buttonWidth + 32) + 'px';
    }

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

    var btn = document.createElement('a');
    btn.className = 'bg-btn' + (isHighlight ? ' bg-btn-highlight' : '');
    btn.style.backgroundColor = bgColor;
    btn.style.color = textColor;
    btn.style.transition = 'all 0.3s';
    if (border) btn.style.border = border;

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
        }
        btn.appendChild(iconSpan);
      } else {
        btn.style.justifyContent = 'center';
      }

      var label = document.createElement('span');
      label.textContent = buttonLabel.replace('{name}', info.name);
      btn.appendChild(label);
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

  // ─── 마이페이지: 소셜 연동 메뉴 + 팝업 ─────────────────
  BGWidget.prototype.renderLinkWidget = function() {
    var self = this;
    if (document.querySelector('#bg-link-menu')) return;

    // "회원 정보 수정" 링크를 찾아서 그 뒤에 메뉴 삽입
    var menuLinks = document.querySelectorAll('#myshopMain a, .xans-myshop-main a');
    var modifyItem = null;
    for (var i = 0; i < menuLinks.length; i++) {
      if (menuLinks[i].getAttribute('href') === '/member/modify.html') {
        modifyItem = menuLinks[i].closest('li');
        break;
      }
    }
    if (!modifyItem) return;

    // 메뉴 아이템 생성
    var menuItem = document.createElement('li');
    menuItem.id = 'bg-link-menu';
    var menuLink = document.createElement('a');
    menuLink.href = '#none';
    menuLink.textContent = '소셜 계정 연동 ⚡';
    menuLink.addEventListener('click', function(e) {
      e.preventDefault();
      self.openLinkPopup();
    });
    menuItem.appendChild(menuLink);

    // "회원 정보 수정" 다음에 삽입
    modifyItem.parentNode.insertBefore(menuItem, modifyItem.nextSibling);
  };

  BGWidget.prototype.openLinkPopup = function() {
    var self = this;
    var config = this.config;
    if (!config) return;

    // 이미 열려있으면 무시
    if (document.querySelector('.bg-modal-overlay')) return;

    // 오버레이
    var overlay = document.createElement('div');
    overlay.className = 'bg-modal-overlay';
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) overlay.remove();
    });

    // 모달
    var modal = document.createElement('div');
    modal.className = 'bg-modal';

    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.className = 'bg-modal-close';
    closeBtn.textContent = '\\u2715';
    closeBtn.addEventListener('click', function() { overlay.remove(); });
    modal.appendChild(closeBtn);

    // 제목
    var title = document.createElement('div');
    title.className = 'bg-link-title';
    title.textContent = '\\u26A1 소셜 계정 연동';
    modal.appendChild(title);

    // 연동 상태
    var linkedProviders = [];
    try {
      var stored = localStorage.getItem('bg_linked_providers');
      if (stored) linkedProviders = JSON.parse(stored);
    } catch (e) {}
    var lastProvider = null;
    try { lastProvider = localStorage.getItem('bg_last_provider'); } catch (e) {}
    if (lastProvider && linkedProviders.indexOf(lastProvider) === -1) {
      linkedProviders.push(lastProvider);
      try { localStorage.setItem('bg_linked_providers', JSON.stringify(linkedProviders)); } catch (e) {}
    }

    // 프로바이더 목록
    var providers = config.providers;
    for (var i = 0; i < providers.length; i++) {
      var p = providers[i];
      var info = PROVIDERS[p];
      if (!info) continue;

      var row = document.createElement('div');
      row.className = 'bg-link-row';

      var icon = document.createElement('span');
      icon.className = 'bg-btn-icon';
      icon.innerHTML = info.icon;
      var paths = icon.querySelectorAll('path');
      var iconFill = (info.bgColor === '#f2f2f2' || info.bgColor === '#FFFFFF' || info.bgColor === '#ffffff') ? '#4285F4' : info.color;
      for (var pi = 0; pi < paths.length; pi++) {
        var currentFill = paths[pi].getAttribute('fill');
        if (currentFill === '#fff' || currentFill === '#FFFFFF' || currentFill === '#ffffff') {
          paths[pi].setAttribute('fill', iconFill);
        }
      }
      row.appendChild(icon);

      var name = document.createElement('span');
      name.className = 'bg-link-name';
      name.textContent = info.name;
      row.appendChild(name);

      var badge = document.createElement('span');
      badge.className = 'bg-link-badge';
      if (linkedProviders.indexOf(p) >= 0) {
        badge.classList.add('linked');
        badge.textContent = '연동됨';
      } else {
        badge.classList.add('unlinked');
        badge.textContent = '연동하기';
        badge.setAttribute('data-provider', p);
        badge.addEventListener('click', function() {
          var prov = this.getAttribute('data-provider');
          overlay.remove();
          self.startLinkAuth(prov);
        });
      }
      row.appendChild(badge);
      modal.appendChild(row);
    }

    // powered by
    var powered = document.createElement('div');
    powered.style.cssText = 'text-align:center;margin-top:16px;font-size:11px;color:#aaa';
    powered.textContent = 'powered by 번개가입';
    modal.appendChild(powered);

    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  };

  BGWidget.prototype.startLinkAuth = function(provider) {
    var config = this.config;
    if (!config) return;

    // 팝업 윈도우로 OAuth 플로우 실행
    var authUrl = this.baseUrl + '/oauth/authorize'
      + '?client_id=' + encodeURIComponent(config.client_id)
      + '&redirect_uri=' + encodeURIComponent(this.baseUrl + '/link/complete')
      + '&provider=' + encodeURIComponent(provider)
      + '&response_type=code'
      + '&state=' + encodeURIComponent(this.generateState());

    var popup = window.open(authUrl, 'bg_link', 'width=500,height=600,scrollbars=yes');

    // 팝업 닫힘 감지 → 연동 상태 갱신
    var checkInterval = setInterval(function() {
      if (!popup || popup.closed) {
        clearInterval(checkInterval);
        // 연동 프로바이더 목록 업데이트
        try {
          localStorage.setItem('bg_last_provider', provider);
          var linked = JSON.parse(localStorage.getItem('bg_linked_providers') || '[]');
          if (linked.indexOf(provider) === -1) {
            linked.push(provider);
            localStorage.setItem('bg_linked_providers', JSON.stringify(linked));
          }
        } catch (e) {}
        // 페이지 새로고침하여 연동 상태 반영
        window.location.reload();
      }
    }, 500);
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
