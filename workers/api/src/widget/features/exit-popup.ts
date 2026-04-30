/**
 * exit-popup.ts — Plus 이탈 감지 팝업 (mouseout + scroll-up + scroll-depth)
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   initExitPopup(config)  — 이탈 팝업 초기화 + 트리거 등록
 *
 * 의존 (IIFE 스코프):
 *   isMobileViewport, escapeHtml, self.isUserLoggedIn, self.trackEvent
 *   self.renderCouponPackCard, self.renderSingleCouponCard
 *   window.__BG_TRIGGERS__ (smart-triggers.ts)
 */
export function getExitPopupJs(): string {
  return `
  // ─── Plus: 이탈 감지 팝업 ────────────────────────────────────
  BGWidget.prototype.initExitPopup = function(config) {
    var self = this;
    var pc = config.popup_config;

    // 설정이 없거나 비활성화면 기본 동작 (로그인 페이지 한정, 하드코딩 텍스트)
    var enabled = pc ? pc.enabled !== false : true;
    if (!enabled) return;

    // 비회원만 팝업 표시
    if (self.isUserLoggedIn()) return;

    var allPages = pc ? pc.allPages === true : false;
    // allPages가 아니면 로그인/가입 페이지에서만 동작
    if (!allPages && this.pageType !== 'login') return;

    var popupTitle = pc && pc.title ? pc.title : '잠깐만요!';
    var popupBody = pc && pc.body ? pc.body : '지금 가입하면 특별 혜택을 드려요!';
    var popupCta = pc && pc.ctaText ? pc.ctaText : '혜택 받고 가입하기';
    var popupIcon = pc ? (pc.icon != null ? pc.icon : '🎁') : '🎁';
    var popupBorderRadius = pc && pc.borderRadius != null ? pc.borderRadius : 16;
    var popupOpacity = pc && pc.opacity != null ? pc.opacity : 100;

    // frequency_cap_hours 통합 (cooldownHours 하위 호환 fallback)
    var capHours = (pc && pc.frequency_cap_hours != null)
      ? pc.frequency_cap_hours
      : (pc && pc.cooldownHours ? pc.cooldownHours : 24);
    var cooldownMs = capHours * 60 * 60 * 1000;

    // scroll_depth_threshold (0이면 비활성, Exit-intent에서 이식)
    var scrollDepthThreshold = (pc && typeof pc.scroll_depth_threshold === 'number' && pc.scroll_depth_threshold > 0)
      ? pc.scroll_depth_threshold
      : 0;

    // 쿠폰 모드 (D2=A: none / single / pack)
    // 2026-04-30: Plus 페이지의 쿠폰팩이 기본 운영 흐름이므로 default를 'pack'으로 변경.
    // 'pack' 모드여도 운영자가 쿠폰팩을 활성화(coupon_pack.active=true)하지 않으면 카드 미노출이라 안전.
    var couponMode = (pc && pc.coupon_mode) ? pc.coupon_mode : 'pack';
    var couponType = (pc && pc.coupon_type) ? pc.coupon_type : '';

    var presetIdx = pc && pc.preset != null ? pc.preset : 6;
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
      modal.style.cssText = 'background:#fff;padding:24px;max-width:420px;width:90%;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3);position:relative;border-radius:' + popupBorderRadius + 'px;opacity:' + (popupOpacity / 100) + ';text-align:center';

      // 닫기 버튼
      var closeBtn = document.createElement('button');
      closeBtn.style.cssText = 'position:absolute;top:12px;right:16px;background:none;border:none;font-size:20px;cursor:pointer;color:#999;padding:4px 8px';
      closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
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

      // 쿠폰 카드 노출 (D2=A 쿠폰 모드 분기)
      // couponMode, couponType은 showPopup 외부 스코프에서 참조
      var couponCardEl = null;

      if (couponMode === 'pack') {
        // pack: Plus 전용 쿠폰팩 카드 (coupon_pack.active 필요)
        var cpConfig = config.coupon_pack;
        if (cpConfig && cpConfig.active) {
          couponCardEl = self.renderCouponPackCard(cpConfig);
          self.trackEvent('widget.coupon_pack_shown', {
            source: 'exit_popup',
            design: cpConfig.design || 'brand',
            anim_mode: cpConfig.anim_mode !== false,
            total_amount: cpConfig.total_amount || 55000
          });
        }
      } else if (couponMode === 'single') {
        // single: 단일 쿠폰 그래픽 카드 (Free 포함)
        var couponCfg = config.coupon_config || {};
        if (couponType && couponCfg[couponType] && couponCfg[couponType].enabled) {
          couponCardEl = self.renderSingleCouponCard(couponType, couponCfg[couponType]);
        }
      }
      // couponMode === 'none' 또는 미설정: 카드 미노출

      // CTA 버튼
      var ctaBtn = document.createElement('button');
      var ctaText = couponCardEl
        ? '\\ud68c\\uc6d0\\uac00\\uc785 \\u2192'  // 회원가입 →
        : popupCta;
      ctaBtn.textContent = ctaText;
      var ctaR = Math.max(6, popupBorderRadius - 6);
      // padding/font 톤다운 + 너비 텍스트 크기에 fit (이전: width:100% + padding:14px + font:16px/700 → 너무 강조됨)
      ctaBtn.style.cssText = 'display:inline-block;padding:10px 24px;border-radius:' + ctaR + 'px;background:' + preset.ctaBg + ';color:' + (preset.ctaColor || '#fff') + ';font-size:14px;font-weight:600;cursor:pointer;opacity:0.92;border:' + (preset.ctaBorder || 'none');
      // CTA 버튼 클릭은 modal 전체 click 핸들러로 흡수 (아래 modal.addEventListener 참조).
      // 닫기 버튼만 stopPropagation 으로 차단됨.

      // 닫기 버튼 외 modal 영역 어디든 클릭 시 로그인 이동 (CTA 포함, closeBtn 은 stopPropagation 처리됨)
      modal.style.cursor = 'pointer';
      modal.addEventListener('click', function() {
        overlay.remove();
        self.trackEvent('popup_signup', {});
        if (couponMode === 'pack' && couponCardEl) {
          var cpCfg = config.coupon_pack;
          self.trackEvent('widget.coupon_pack_clicked', {
            source: 'exit_popup',
            design: (cpCfg && cpCfg.design) || 'brand',
            total_amount: (cpCfg && cpCfg.total_amount) || 55000
          });
        }
        window.location.href = '/member/login.html';
      });

      modal.appendChild(closeBtn);
      modal.appendChild(title);
      modal.appendChild(body);
      // 쿠폰 카드 (single/pack): body 아래, CTA 위에 배치 (핵심 비주얼)
      if (couponCardEl) modal.appendChild(couponCardEl);
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

    // PC/모바일 분기: viewport 기반 (UA 스푸핑/UA-reduction 무관)
    if (!isMobileViewport()) {
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

    // scroll_depth_threshold 추가 트리거 (Exit-intent에서 이식, 0이면 비활성)
    if (scrollDepthThreshold > 0) {
      var triggers = window.__BG_TRIGGERS__;
      if (triggers) {
        triggers.registerTrigger(
          { eventKey: 'exit_popup_scroll', mode: 'scroll-depth', threshold: scrollDepthThreshold, capHours: capHours },
          function() {
            self.trackEvent('widget.scroll_trigger_fired', { threshold: scrollDepthThreshold, source: 'exit_popup' });
            showPopup();
          }
        );
      }
    }
  };
`;
}
