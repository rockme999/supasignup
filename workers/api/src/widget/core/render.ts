/**
 * render.ts — BGWidget 렌더링 (버튼 목록, Provider 메타, 컨테이너 배치)
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   render()                         — 컨테이너 생성/배치, 버튼 루프
 *   renderButton(provider, isHL)     — 개별 소셜 버튼 DOM 생성
 *   initLiquidGlass(container)       — liquid-glass 마우스 추적 광택
 *   sortProviders(providers)         — lastProvider를 맨 앞으로 정렬
 *   findLoginPage()                  — 카페24 로그인/가입 영역 DOM 탐색
 *
 * 의존 (IIFE 스코프):
 *   PROVIDERS, bgLog, bgDebug, bgSetImp, getEffectiveBgLuminance
 */
export function getRenderJs(): string {
  return `
  BGWidget.prototype.render = function() {
    // [디버그 g] render 시작
    bgLog('render: container=', this.container, 'preset=', this.config && this.config.style && this.config.style.preset);

    // Find or create container
    // 컨테이너 식별: ID + class 둘 다 사용 (외부 ID 충돌 방지 위해 우선 class로 찾고, 보조로 ID).
    this.container = document.querySelector('.bg-widget') || document.querySelector('#bg-widget');
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
        bgLog('render: no target element found — aborting render');
        return;
      }
    }

    // 멱등성: 재호출 시 기존 자식/이전 dark-wrap 잔재 모두 제거 후 다시 그림
    // (어드민 미리보기, 스킨 두 번 로드 등 재진입 케이스에서 button 누적/잔존 클래스 방지)
    this.container.id = 'bg-widget';
    this.container.className = 'bg-widget';
    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }

    // Apply style settings to container
    var s = (this.config && this.config.style) || {};
    var buttonWidth = s.buttonWidth || 280;
    var preset = s.preset || 'default';
    var DARK_BG_PRESETS = ['glassmorphism', 'neon-glow', 'liquid-glass'];

    // 진단 로그: config 또는 style 누락 (모바일 스킨에서 fetch 실패 가능성 확인용)
    if (!this.config) {
      console.warn('[번개가입] render() called without config — preset will fallback to default');
    } else if (!this.config.style) {
      console.warn('[번개가입] config.style is missing — preset will fallback to default');
    }
    // bgDebug() 헬퍼로 통일 (기존 직접 indexOf 패턴 교체)
    bgLog('render: applied preset =', preset, 'style =', s, 'plan =', this.config && this.config.plan);

    // 모든 일반/Plus 프리셋: block-level flex column + max-width 제한
    // → base CSS의 '.bg-widget { margin: 16px auto }' 가 자동 가운데 정렬을 수행.
    // (회귀 1 [구]: max-width 부재 + display:flex → wrap이 페이지 폭 다 차지해 둥근 배경/모서리 안 보임 → max-width로 해결)
    // (회귀 2 [구]: dark-wrap 후보 3종에 inline-flex 사용 → inline 박스라 margin:auto 무력화 → 좌측 치우침 → display:flex 복귀로 해결)
    var willMaybeWrap = DARK_BG_PRESETS.indexOf(preset) !== -1;
    if (preset === 'icon-only') {
      // icon-only: icons laid out in a row
      bgSetImp(this.container, 'display', 'flex');
      bgSetImp(this.container, 'flex-direction', 'row');
      bgSetImp(this.container, 'flex-wrap', 'wrap');
      bgSetImp(this.container, 'align-items', 'center');
      bgSetImp(this.container, 'justify-content', 'center');
      bgSetImp(this.container, 'max-width', 'none');
    } else {
      bgSetImp(this.container, 'display', 'flex');
      bgSetImp(this.container, 'flex-direction', 'column');
      bgSetImp(this.container, 'align-items', 'center');
      bgSetImp(this.container, 'max-width', (buttonWidth + 32) + 'px');
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

    // 아이콘 모드 split: preset === 'icon-only'면 split 비활성 (전부 아이콘 — 기존 동작 유지)
    // 그 외 preset에서는 iconProviders subset 을 별도 row로 분리.
    // last-used override: lastProvider는 모드 무관 풀버튼 promote (icon row에서는 제외)
    var iconList = (this.config.iconProviders && Array.isArray(this.config.iconProviders))
      ? this.config.iconProviders
      : [];
    var iconSet = {};
    for (var ix = 0; ix < iconList.length; ix++) { iconSet[iconList[ix]] = 1; }
    var splitEnabled = preset !== 'icon-only';

    var buttonProviders = [];
    var iconRowProviders = [];
    var lastProv = this.lastProvider;
    for (var k = 0; k < providers.length; k++) {
      var p = providers[k];
      if (splitEnabled && iconSet[p] && p !== lastProv) {
        iconRowProviders.push(p);
      } else {
        buttonProviders.push(p);
      }
    }

    // Render buttons (풀버튼 영역)
    for (var i = 0; i < buttonProviders.length; i++) {
      var btn = this.renderButton(buttonProviders[i], i === 0 && this.lastProvider === buttonProviders[i]);
      this.container.appendChild(btn);
    }

    // Render icon row (아이콘 모드 프로바이더)
    if (iconRowProviders.length > 0) {
      var iconRow = document.createElement('div');
      iconRow.className = 'bg-icon-row';
      for (var j = 0; j < iconRowProviders.length; j++) {
        var iconBtn = this.renderButton(iconRowProviders[j], false, true);
        iconRow.appendChild(iconBtn);
      }
      this.container.appendChild(iconRow);
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

    // Plus dark-bg 프리셋: 밝은 배경이면 자동으로 미리보기와 동일한 wrapper 배경 부여
    if (willMaybeWrap) {
      var lum = getEffectiveBgLuminance(this.container);
      if (lum > 0.6) {
        this.container.classList.add('bg-dark-wrap');
        this.container.classList.add('bg-dark-wrap-' + preset);
        // dark-wrap 클래스는 padding을 갖고 있으나, 컨테이너에 inline padding 강제 (외부 .member 룰 보호)
        bgSetImp(this.container, 'padding', '14px 16px');
        bgSetImp(this.container, 'border-radius', '12px');
      }
    }

    // [디버그 h] render 완료 — 적용된 computed style
    if (bgDebug() && this.container) {
      var dbgBtn = this.container.querySelector('.bg-btn');
      if (dbgBtn) {
        var cs = getComputedStyle(dbgBtn);
        bgLog('render computed:', { borderRadius: cs.borderRadius, height: cs.height, background: cs.backgroundColor, padding: cs.padding, border: cs.border });
      }
      bgLog('render container className=', this.container.className, 'id=', this.container.id);
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

  BGWidget.prototype.renderButton = function(provider, isHighlight, iconOnlyOverride) {
    var info = PROVIDERS[provider];
    if (!info) return document.createElement('div');

    // Style settings
    var s = (this.config && this.config.style) || {};
    var preset = s.preset || 'default';
    // iconOnlyOverride: 아이콘 row(.bg-icon-row)에서 호출될 때 true → 44×44 아이콘 모드 강제 렌더
    // 기존 'icon-only' preset 분기를 그대로 재사용 (옵션 B — 시그니처 확장)
    var isIconMode = preset === 'icon-only' || iconOnlyOverride === true;
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
    var highlightClass = isHighlight ? (isIconMode ? ' bg-btn-highlight-icon' : ' bg-btn-highlight') : '';
    btn.className = 'bg-btn' + highlightClass;
    // Plus 프리셋은 CSS 클래스만으로 스타일 제어 — 인라인 color/bg/border 설정 생략
    // (인라인 style이 남아 있으면 CSS !important와 충돌하여 브랜드 배경색이 잔존)
    // 단, iconOnlyOverride 일 때는 아이콘 row이므로 Plus 클래스 미적용 → 인라인 색상 활성화 (단순 원형)
    if (!isPlusPreset || iconOnlyOverride) {
      bgSetImp(btn, 'background-color', bgColor);
      bgSetImp(btn, 'color', textColor);
      if (border) bgSetImp(btn, 'border', border);
    }
    bgSetImp(btn, 'transition', 'all 0.3s');
    // 카페24 모바일 스킨 일부가 .member a {text-decoration:underline!important} 를 깔아둠 → 강제 제거
    bgSetImp(btn, 'text-decoration', 'none');

    if (isIconMode) {
      bgSetImp(btn, 'width', '44px');
      bgSetImp(btn, 'height', '44px');
      bgSetImp(btn, 'border-radius', Math.min(borderRadius, 22) + 'px');
      bgSetImp(btn, 'justify-content', 'center');
      bgSetImp(btn, 'margin', '4px');
      bgSetImp(btn, 'padding', '0');

      var iconOnly = document.createElement('span');
      iconOnly.className = 'bg-btn-icon';
      iconOnly.innerHTML = info.icon;
      if (isMono || isOutlineMono) {
        var ipaths = iconOnly.querySelectorAll('path');
        for (var ii = 0; ii < ipaths.length; ii++) { ipaths[ii].setAttribute('fill', '#333333'); }
      } else if (iconOnlyOverride) {
        // 아이콘 row: 다크 wrap이 적용될 Plus dark preset이면 fill 흰색 (가독성)
        // gradient-flow / soft-shadow / pulse 등은 라이트 배경이므로 원본 컬러 유지
        var DARK_PRESETS_FILL = ['glassmorphism','neon-glow','liquid-glass','gradient-flow'];
        if (DARK_PRESETS_FILL.indexOf(preset) !== -1) {
          var ipaths2 = iconOnly.querySelectorAll('path');
          for (var ii2 = 0; ii2 < ipaths2.length; ii2++) { ipaths2[ii2].setAttribute('fill', '#ffffff'); }
        }
      }
      btn.appendChild(iconOnly);
    } else {
      var w = buttonWidth;
      bgSetImp(btn, 'width', w + 'px');
      bgSetImp(btn, 'height', buttonHeight + 'px');
      bgSetImp(btn, 'border-radius', borderRadius + 'px');
      bgSetImp(btn, 'justify-content', justifyMap[align] || 'center');
      bgSetImp(btn, 'margin-bottom', buttonGap + 'px');
      bgSetImp(btn, 'padding-top', '0');
      bgSetImp(btn, 'padding-bottom', '0');

      if (showIcon) {
        bgSetImp(btn, 'gap', iconGap + 'px');
        bgSetImp(btn, 'padding-left', paddingLeft + 'px');

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
        } else if (isPlusPreset) {
          // Plus 프리셋: 배경 톤에 따라 아이콘 fill 자동 결정 (구글 포함 6종 모두 단색 통일)
          // 다크 배경: glass, neon, liquid, gradient → 흰색
          // 라이트 배경: soft, pulse → 검정
          var PLUS_DARK_PRESETS = ['glassmorphism','neon-glow','liquid-glass','gradient-flow'];
          var plusIconFill = PLUS_DARK_PRESETS.indexOf(preset) !== -1 ? '#ffffff' : '#374151';
          var paths = iconSpan.querySelectorAll('path');
          for (var pi = 0; pi < paths.length; pi++) { paths[pi].setAttribute('fill', plusIconFill); }
        }
        btn.appendChild(iconSpan);
      } else {
        bgSetImp(btn, 'justify-content', 'center');
      }

      var label = document.createElement('span');
      label.textContent = buttonLabel.replace('{name}', info.name);
      btn.appendChild(label);
    }

    // Plus 프리셋 클래스 적용 + 버튼 인덱스별 딜레이(pulse)
    // 아이콘 row(iconOnlyOverride)는 Plus 스타일 미적용 — 단순 원형/정사각만 (명세 4.4)
    if (isPlusPreset && !iconOnlyOverride) {
      var plusClass = PLUS_PRESET_CLASSES[preset];
      btn.className = btn.className + ' ' + plusClass;
      // 순차 딜레이: 컨테이너 내 n번째 버튼 계산. liquid 제외한 5종에 적용 (호버 시연 패턴, 8s 후 0.3s 간격 trigger)
      if (preset === 'pulse') {
        var pulseIdx = this.container ? this.container.querySelectorAll('.bg-btn').length : 0;
        var pulseDelayClasses = ['bg-mobile-pulse-d1', 'bg-mobile-pulse-d2', 'bg-mobile-pulse-d3', 'bg-mobile-pulse-d4', 'bg-mobile-pulse-d5', 'bg-mobile-pulse-d6'];
        btn.className = btn.className + ' ' + (pulseDelayClasses[pulseIdx] || pulseDelayClasses[0]);
      } else if (preset !== 'liquid-glass') {
        // glass / neon / gradient / soft 4종 공유 — 공통 delay 클래스
        var animIdx = this.container ? this.container.querySelectorAll('.bg-btn').length : 0;
        var animDelayClasses = ['bg-mobile-anim-d1', 'bg-mobile-anim-d2', 'bg-mobile-anim-d3', 'bg-mobile-anim-d4', 'bg-mobile-anim-d5', 'bg-mobile-anim-d6'];
        btn.className = btn.className + ' ' + (animDelayClasses[animIdx] || animDelayClasses[0]);
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
        bgSetImp(this, 'background-color', hoverBg);
        bgSetImp(this, 'color', '#fff');
        bgSetImp(this, 'border-color', hoverBg);
        var ps = this.querySelectorAll('path');
        for (var j = 0; j < ps.length; j++) { ps[j].setAttribute('fill', '#fff'); }
      });
      btn.addEventListener('mouseleave', function() {
        bgSetImp(this, 'background-color', '#ffffff');
        bgSetImp(this, 'color', '#333333');
        bgSetImp(this, 'border-color', restoreBorder);
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
      if (el) {
        // [디버그 d] findLoginPage 결과
        bgLog('init: target element=', el, 'selector matched=', selectors[i]);
        return el;
      }
    }
    // [디버그 d] findLoginPage 실패
    bgLog('init: target element= null (no selector matched)');
    return null;
  };
`;
}
