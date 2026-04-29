/**
 * mini-banner.ts — Plus 미니배너 (floating / widget-top)
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   initMiniBanner(config)  — 미니배너 초기화 + DOM 삽입
 *
 * 의존 (IIFE 스코프):
 *   self.isUserLoggedIn, self.hasLoginHistory, self.checkLoginHistory, self.trackEvent
 */
export function getMiniBannerJs(): string {
  return `
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
        resolvedSel = anchorSel.split(/\\s+/).join('.');
      } else if (anchorSel.charAt(0) !== '#' && anchorSel.charAt(0) !== '.' && anchorSel.charAt(0) !== '[') {
        if (anchorSel.indexOf(' ') >= 0) {
          resolvedSel = '.' + anchorSel.split(/\\s+/).join('.');
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
`;
}
