/**
 * escalation.ts — Plus 재방문 비회원 에스컬레이션 + 공용 토스트
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   initEscalation(config)  — 방문 횟수 기반 토스트/플로팅 배너 표시
 *   showToast(message)      — 공용 하단 토스트 알림
 *
 * 의존 (IIFE 스코프):
 *   bgVisitCount, self.isUserLoggedIn, self.hasLoginHistory, self.trackEvent
 */
export function getEscalationJs(): string {
  return `
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
`;
}
