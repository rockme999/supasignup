/**
 * 라이브 가입자 카운터 — BGWidget.prototype.initLiveCounter 정의
 *
 * buttons.ts WIDGET_JS IIFE 내부에 인라인 삽입됨.
 * 의존: escapeHtml, BGWidget (IIFE 스코프)
 *
 * 작동 조건:
 *   1. config.live_counter.showCounter === true 또는 showToast === true
 *   2. showCounter / showToast 값은 백엔드에서 plan + threshold 를 모두 검사한 후 반환됨
 *      (위젯은 flag 값만 신뢰하면 됨 — 직접 계산 없음)
 *
 * UI 구성:
 *   A. Sticky 카운터 — 우하단(또는 설정 위치) 고정, 오늘 가입자 수 + "번개가입" 배지
 *   B. 가입 토스트 — 최근 30분 내 가입자를 5초 간격으로 1명씩 최대 5명 순환
 *
 * funnel 이벤트:
 *   widget.live_counter_shown / widget.live_toast_shown
 */
export function getLiveCounterJs(): string {
  return [
    '  // ─── 라이브 가입자 카운터 ─────────────────────────────────',
    '  BGWidget.prototype.initLiveCounter = function(config) {',
    '    var self = this;',
    '    var lc = config.live_counter;',
    '    if (!lc) return;',
    '    if (!lc.showCounter && !lc.showToast) return;',

    // 공개 페이지 여부: 관리자/결제 path 제외
    '    var path = window.location.pathname.toLowerCase();',
    '    var blockPaths = ["/order/", "/member/login", "/member/logout", "/admin", "/member/modifyinfo"];',
    '    for (var bp = 0; bp < blockPaths.length; bp++) {',
    '      if (path.indexOf(blockPaths[bp]) !== -1) return;',
    '    }',

    // 카드 위치 결정 (position: bottom-right(기본) / bottom-left / top-right / top-left)
    '    var pos = lc.position || "bottom-right";',
    '    var isLeft = pos.indexOf("left") !== -1;',
    '    var isTop = pos.indexOf("top") !== -1;',
    '    var hPos = isLeft ? "left:18px" : "right:18px";',
    '    var vPos = isTop ? "top:18px" : "bottom:18px";',

    // CSS 애니메이션 한 번만 주입
    '    if (!document.getElementById("bg-lc-style")) {',
    '      var lcSt = document.createElement("style");',
    '      lcSt.id = "bg-lc-style";',
    '      lcSt.textContent = "@keyframes bg-lc-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}"',
    '        + "@keyframes bg-lc-slideup{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}"',
    '        + "@keyframes bg-lc-fadeout{from{opacity:1}to{opacity:0}}";',
    '      document.head.appendChild(lcSt);',
    '    }',

    // ── A. Sticky 카운터 렌더 ──
    '    var counterEl = null;',
    '    if (lc.showCounter && lc.todayCount >= 0) {',
    '      counterEl = document.createElement("div");',
    '      counterEl.id = "bg-live-counter";',
    '      counterEl.style.cssText = "position:fixed;" + vPos + ";" + hPos + ";z-index:9990;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;box-shadow:0 4px 18px rgba(0,0,0,0.13);min-width:160px;max-width:220px;cursor:default;animation:bg-lc-fadein 0.3s ease";',

    '      var countLine = document.createElement("div");',
    '      countLine.style.cssText = "font-size:13px;font-weight:600;color:#1e293b;line-height:1.4;margin-bottom:4px";',
    '      countLine.textContent = "오늘 " + lc.todayCount + "명이 가입했어요";',

    '      var badgeLine = document.createElement("div");',
    '      badgeLine.style.cssText = "font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:3px";',
    '      var flash = document.createElement("span");',
    '      flash.textContent = "⚡";',
    '      flash.style.cssText = "font-size:10px";',
    '      var badgeTxt = document.createTextNode(" 번개가입");',
    '      badgeLine.appendChild(flash);',
    '      badgeLine.appendChild(badgeTxt);',

    '      counterEl.appendChild(countLine);',
    '      counterEl.appendChild(badgeLine);',
    '      document.body.appendChild(counterEl);',

    '      self.trackEvent("widget.live_counter_shown", { today_count: lc.todayCount });',
    '    }',

    // ── B. 토스트 순환 ──
    '    if (lc.showToast && lc.recentSignups && lc.recentSignups.length > 0) {',
    '      var toasts = lc.recentSignups;',
    '      var toastIdx = 0;',
    '      var toastActive = false;',

    '      function showNextToast() {',
    '        if (toastIdx >= toasts.length || toastIdx >= 5) return;',
    '        if (toastActive) return;',
    '        toastActive = true;',
    '        var item = toasts[toastIdx];',
    '        toastIdx++;',

    '        var toast = document.createElement("div");',
    '        toast.id = "bg-live-toast";',
    '        var toastBottom = isTop ? "auto" : (counterEl ? "90px" : "18px");',
    '        var toastTop = isTop ? (counterEl ? "90px" : "18px") : "auto";',
    '        toast.style.cssText = "position:fixed;" + (isTop ? "top:" + toastTop : "bottom:" + toastBottom) + ";" + hPos + ";z-index:9989;background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;box-shadow:0 4px 18px rgba(0,0,0,0.13);min-width:160px;max-width:220px;animation:bg-lc-slideup 0.3s ease";',

    '        var nameLine = document.createElement("div");',
    '        nameLine.style.cssText = "font-size:13px;font-weight:600;color:#1e293b;margin-bottom:2px";',

    // 이름 + 가입 텍스트 (XSS 방지: textContent)
    '        var nameSpan = document.createElement("span");',
    '        nameSpan.textContent = item.name;',
    '        var signupTxt = document.createTextNode("님이 가입했어요");',
    '        nameLine.appendChild(nameSpan);',
    '        nameLine.appendChild(signupTxt);',

    '        var timeLine = document.createElement("div");',
    '        timeLine.style.cssText = "font-size:11px;color:#94a3b8";',
    '        timeLine.textContent = item.timeAgo;',

    '        toast.appendChild(nameLine);',
    '        toast.appendChild(timeLine);',
    '        document.body.appendChild(toast);',

    '        self.trackEvent("widget.live_toast_shown", { name_masked: item.name, time_ago: item.timeAgo });',

    // 5초 후 페이드아웃 → 제거
    '        setTimeout(function() {',
    '          toast.style.animation = "bg-lc-fadeout 0.4s ease forwards";',
    '          setTimeout(function() {',
    '            if (toast.parentNode) toast.parentNode.removeChild(toast);',
    '            toastActive = false;',
    '          }, 400);',
    '        }, 5000);',
    '      }',

    // 첫 토스트는 2초 후, 이후 7초 간격 (5초 표시 + 2초 간격)
    '      setTimeout(function() {',
    '        showNextToast();',
    '        var toastTimer = setInterval(function() {',
    '          if (toastIdx >= toasts.length || toastIdx >= 5) {',
    '            clearInterval(toastTimer);',
    '            return;',
    '          }',
    '          showNextToast();',
    '        }, 7000);',
    '      }, 2000);',
    '    }',
    '  };',
  ].join('\n');
}
