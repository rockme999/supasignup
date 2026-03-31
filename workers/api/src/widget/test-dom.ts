/**
 * ScriptTag DOM 조작 기술 검증 스크립트
 *
 * 목적: 카페24 쇼핑몰의 기존 버튼(BUY IT NOW, CART)을
 *       ScriptTag로 주입한 JS가 조작할 수 있는지 기술 검증
 *
 * 테스트 항목:
 *   1. 텍스트 변경 (BUY IT NOW → 바로구매)
 *   2. 배경색 변경 (빨강)
 *   3. 색상 점멸 효과 (빨강 ↔ 파랑)
 *   4. 하단 미니배너 삽입 (구매 버튼 위)
 *
 * 사용법: 쇼핑몰 상품 상세 페이지에서 브라우저 콘솔에 실행하거나
 *         ScriptTag로 삽입하여 테스트
 */

export const TEST_DOM_JS = `(function() {
  'use strict';

  // ─── 환경 감지 ─────────────────────────────────────────────
  var isMobile = /Mobi|Android/i.test(navigator.userAgent);
  var isInApp = /KAKAOTALK|NAVER|Line\\//i.test(navigator.userAgent);

  // ─── 유틸리티 ──────────────────────────────────────────────
  function log(msg) {
    console.log('[BG-TEST] ' + msg);
  }

  function waitForElement(selector, callback, maxRetry) {
    maxRetry = maxRetry || 20;
    var count = 0;
    var timer = setInterval(function() {
      var el = document.querySelector(selector);
      if (el) {
        clearInterval(timer);
        callback(el);
      } else if (++count >= maxRetry) {
        clearInterval(timer);
        log('Element not found: ' + selector);
      }
    }, 200);
  }

  // ─── 테스트 패널 (좌측 상단) ────────────────────────────────
  function createTestPanel() {
    var panel = document.createElement('div');
    panel.id = 'bg-test-panel';
    var s = panel.style;
    s.position = 'fixed';
    s.top = '10px';
    s.left = '10px';
    s.zIndex = '2147483647';
    s.background = 'rgba(0,0,0,0.9)';
    s.color = '#fff';
    s.padding = '12px';
    s.borderRadius = '8px';
    s.fontSize = '13px';
    s.fontFamily = '-apple-system, sans-serif';
    s.maxWidth = '280px';
    s.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';

    var title = document.createElement('div');
    title.textContent = 'ScriptTag DOM Test';
    title.style.fontWeight = 'bold';
    title.style.marginBottom = '8px';
    title.style.fontSize = '14px';
    title.style.color = '#4ade80';
    panel.appendChild(title);

    var info = document.createElement('div');
    info.textContent = (isMobile ? 'Mobile' : 'Desktop') + (isInApp ? ' (InApp)' : '');
    info.style.marginBottom = '10px';
    info.style.fontSize = '11px';
    info.style.color = '#94a3b8';
    panel.appendChild(info);

    // 버튼 생성 헬퍼
    function addBtn(label, color, onClick) {
      var btn = document.createElement('button');
      btn.textContent = label;
      var bs = btn.style;
      bs.display = 'block';
      bs.width = '100%';
      bs.padding = '8px 12px';
      bs.marginBottom = '6px';
      bs.border = 'none';
      bs.borderRadius = '6px';
      bs.background = color;
      bs.color = '#fff';
      bs.fontSize = '12px';
      bs.fontWeight = '600';
      bs.cursor = 'pointer';
      btn.addEventListener('click', onClick);
      panel.appendChild(btn);
    }

    // ── 테스트 1: 텍스트 변경 ──
    addBtn('1. 텍스트 변경 (바로구매)', '#3b82f6', function() {
      testChangeText();
    });

    // ── 테스트 2: 배경색 변경 (빨강) ──
    addBtn('2. 배경색 빨강으로', '#ef4444', function() {
      testChangeColor('#ef4444');
    });

    // ── 테스트 3: 배경색 변경 (파랑) ──
    addBtn('3. 배경색 파랑으로', '#2563eb', function() {
      testChangeColor('#2563eb');
    });

    // ── 테스트 4: 빨강↔파랑 점멸 ──
    addBtn('4. 빨강↔파랑 점멸 시작', '#8b5cf6', function() {
      testBlink();
    });

    // ── 테스트 5: 점멸 중지 ──
    addBtn('5. 점멸 중지 + 원복', '#6b7280', function() {
      testReset();
    });

    // ── 테스트 6: 미니배너 삽입 ──
    addBtn('6. 구매버튼 위 미니배너', '#f59e0b', function() {
      testMiniBanner();
    });

    // ── 테스트 7: 미니배너 제거 ──
    addBtn('7. 미니배너 제거', '#6b7280', function() {
      var banner = document.getElementById('bg-test-mini');
      if (banner) banner.remove();
      log('Mini banner removed');
    });

    // ── 테스트 8: 오버레이 배너 (BUY IT NOW 위에 겹침) ──
    addBtn('8. 오버레이 배너 (겹침)', '#ec4899', function() {
      testOverlayBanner();
    });

    // ── 테스트 9: 오버레이 배너 제거 ──
    addBtn('9. 오버레이 제거', '#6b7280', function() {
      if (overlayBlinkTimer) { clearInterval(overlayBlinkTimer); overlayBlinkTimer = null; }
      var ov = document.getElementById('bg-test-overlay');
      if (ov) ov.remove();
      log('Overlay removed');
    });

    // 닫기 버튼
    var closeBtn = document.createElement('div');
    closeBtn.textContent = '✕ 닫기';
    closeBtn.style.textAlign = 'center';
    closeBtn.style.marginTop = '6px';
    closeBtn.style.fontSize = '11px';
    closeBtn.style.color = '#94a3b8';
    closeBtn.style.cursor = 'pointer';
    closeBtn.addEventListener('click', function() {
      panel.style.display = 'none';
    });
    panel.appendChild(closeBtn);

    document.body.appendChild(panel);
    log('Test panel created');
  }

  // ─── 원본 상태 저장 ────────────────────────────────────────
  var original = {
    buyText: null,
    buyBg: null,
    buyColor: null,
    cartBg: null,
    cartColor: null,
    cartText: null
  };
  var blinkTimer = null;

  function saveOriginal(buyBtn, buySpan, cartBtn) {
    if (!original.buyText) {
      original.buyText = buySpan ? buySpan.textContent : '';
      original.buyBg = buyBtn ? buyBtn.style.backgroundColor : '';
      original.buyColor = buyBtn ? buyBtn.style.color : '';
      if (cartBtn) {
        original.cartBg = cartBtn.style.backgroundColor;
        original.cartColor = cartBtn.style.color;
        original.cartText = cartBtn.textContent;
      }
      // computed style도 저장 (inline이 없을 때)
      if (buyBtn && !original.buyBg) {
        var cs = window.getComputedStyle(buyBtn);
        original.buyBg = cs.backgroundColor;
        original.buyColor = cs.color;
      }
      if (cartBtn && !original.cartBg) {
        var cs2 = window.getComputedStyle(cartBtn);
        original.cartBg = cs2.backgroundColor;
        original.cartColor = cs2.color;
      }
      log('Original state saved');
    }
  }

  // ─── 테스트 1: 텍스트 변경 ─────────────────────────────────
  function testChangeText() {
    var buySpan = document.getElementById('actionBuy');
    var cartBtn = document.getElementById('actionCart');
    if (buySpan) {
      saveOriginal(buySpan.closest('a'), buySpan, cartBtn);
      buySpan.textContent = '바로구매';
      log('BUY button text changed to: 바로구매');
    }
    if (cartBtn) {
      cartBtn.textContent = '장바구니';
      log('CART button text changed to: 장바구니');
    }
  }

  // ─── 테스트 2: 배경색 변경 ─────────────────────────────────
  function testChangeColor(color) {
    var buySpan = document.getElementById('actionBuy');
    var buyBtn = buySpan ? buySpan.closest('a') : null;
    var cartBtn = document.getElementById('actionCart');
    if (buyBtn) {
      saveOriginal(buyBtn, buySpan, cartBtn);
      buyBtn.style.setProperty('background-color', color, 'important');
      buyBtn.style.setProperty('color', '#ffffff', 'important');
      buyBtn.style.setProperty('transition', 'background-color 0.3s ease', 'important');
      log('BUY button color changed to: ' + color);
    }
  }

  // ─── 테스트 3: 점멸 효과 ───────────────────────────────────
  function testBlink() {
    if (blinkTimer) {
      clearInterval(blinkTimer);
    }
    var buySpan = document.getElementById('actionBuy');
    var buyBtn = buySpan ? buySpan.closest('a') : null;
    var cartBtn = document.getElementById('actionCart');
    if (!buyBtn) {
      log('BUY button not found');
      return;
    }
    saveOriginal(buyBtn, buySpan, cartBtn);

    var colors = ['#ef4444', '#2563eb'];  // 빨강, 파랑
    var idx = 0;

    // CSS transition으로 부드럽게
    buyBtn.style.setProperty('transition', 'background-color 0.5s ease', 'important');

    blinkTimer = setInterval(function() {
      buyBtn.style.setProperty('background-color', colors[idx % 2], 'important');
      buyBtn.style.setProperty('color', '#ffffff', 'important');
      idx++;
    }, 800);

    log('Blink started (red <-> blue, 800ms interval)');
  }

  // ─── 테스트 4: 원복 ───────────────────────────────────────
  function testReset() {
    if (blinkTimer) {
      clearInterval(blinkTimer);
      blinkTimer = null;
    }
    var buySpan = document.getElementById('actionBuy');
    var buyBtn = buySpan ? buySpan.closest('a') : null;
    var cartBtn = document.getElementById('actionCart');

    if (buySpan && original.buyText) {
      buySpan.textContent = original.buyText;
    }
    if (buyBtn) {
      buyBtn.style.removeProperty('background-color');
      buyBtn.style.removeProperty('color');
      buyBtn.style.removeProperty('transition');
      // 원본값 복원
      if (original.buyBg) buyBtn.style.backgroundColor = original.buyBg;
      if (original.buyColor) buyBtn.style.color = original.buyColor;
    }
    if (cartBtn) {
      if (original.cartText) cartBtn.textContent = original.cartText;
      cartBtn.style.removeProperty('background-color');
      cartBtn.style.removeProperty('color');
      if (original.cartBg) cartBtn.style.backgroundColor = original.cartBg;
      if (original.cartColor) cartBtn.style.color = original.cartColor;
    }
    log('Reset to original state');
  }

  // ─── 테스트 5: 구매버튼 위 미니배너 삽입 ──────────────────
  function testMiniBanner() {
    // 이미 있으면 제거 후 재생성
    var existing = document.getElementById('bg-test-mini');
    if (existing) existing.remove();

    var actionDiv = document.querySelector('.action_button');
    if (!actionDiv) {
      log('action_button container not found');
      return;
    }

    var banner = document.createElement('div');
    banner.id = 'bg-test-mini';

    // 인라인 스타일 — action_button 바깥(위)에 삽입
    var bs = banner.style;
    bs.width = '100%';
    bs.padding = '12px 16px';
    bs.marginBottom = '10px';
    bs.borderRadius = '8px';
    bs.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    bs.color = '#ffffff';
    bs.fontSize = '13px';
    bs.fontWeight = '600';
    bs.textAlign = 'center';
    bs.boxSizing = 'border-box';
    bs.cursor = 'pointer';
    bs.display = 'flex';
    bs.alignItems = 'center';
    bs.justifyContent = 'center';
    bs.gap = '8px';

    var icon = document.createElement('span');
    icon.textContent = '\\u26A1';  // ⚡
    icon.style.fontSize = '16px';

    var text = document.createElement('span');
    text.textContent = '회원가입하면 3,000원 즉시 할인!';

    var arrow = document.createElement('span');
    arrow.textContent = '\\u203A';  // ›
    arrow.style.fontSize = '18px';
    arrow.style.marginLeft = '4px';

    banner.appendChild(icon);
    banner.appendChild(text);
    banner.appendChild(arrow);

    // action_button 컨테이너 바깥 — 바로 위에 삽입 (flex 레이아웃 영향 안 받음)
    actionDiv.parentNode.insertBefore(banner, actionDiv);

    // 클릭 이벤트
    banner.addEventListener('click', function() {
      alert('[BG-TEST] 소셜 가입 플로우로 이동합니다!');
    });

    log('Mini banner inserted above buy button');
  }

  // ─── 테스트 8: BUY IT NOW 우하단 뱃지 오버레이 + 점멸 ───────
  var overlayBlinkTimer = null;

  function testOverlayBanner() {
    var existing = document.getElementById('bg-test-overlay');
    if (existing) existing.remove();
    if (overlayBlinkTimer) { clearInterval(overlayBlinkTimer); overlayBlinkTimer = null; }

    // BUY IT NOW 버튼 찾기
    var buySpan = document.getElementById('actionBuy');
    var buyBtn = buySpan ? buySpan.closest('a') : null;
    if (!buyBtn) {
      log('BUY button not found');
      return;
    }

    // 버튼을 position:relative로 (뱃지 기준점)
    var btnPos = window.getComputedStyle(buyBtn).position;
    if (btnPos === 'static') {
      buyBtn.style.position = 'relative';
    }
    buyBtn.style.overflow = 'visible';

    var badge = document.createElement('div');
    badge.id = 'bg-test-overlay';

    var bs = badge.style;
    bs.position = 'absolute';
    bs.right = '-4px';
    bs.bottom = '-4px';
    bs.padding = '3px 8px';
    bs.borderRadius = '10px';
    bs.background = '#ef4444';
    bs.color = '#ffffff';
    bs.fontSize = '10px';
    bs.fontWeight = '700';
    bs.whiteSpace = 'nowrap';
    bs.zIndex = '10';
    bs.pointerEvents = 'none';
    bs.boxShadow = '0 1px 4px rgba(0,0,0,0.3)';
    bs.transition = 'opacity 0.4s ease';
    bs.letterSpacing = '-0.3px';

    badge.textContent = '3,000\\uC6D0 \\uD560\\uC778';  // 3,000원 할인

    buyBtn.appendChild(badge);

    // 점멸 효과
    var visible = true;
    overlayBlinkTimer = setInterval(function() {
      visible = !visible;
      badge.style.opacity = visible ? '1' : '0';
    }, 700);

    log('Overlay badge on BUY button (bottom-right, blinking)');
  }

  // ─── 초기화 ────────────────────────────────────────────────
  function init() {
    log('=== ScriptTag DOM Test v1.0 ===');
    log('Platform: ' + (isMobile ? 'Mobile' : 'Desktop') + (isInApp ? ' (InApp Browser)' : ''));
    log('UA: ' + navigator.userAgent.substring(0, 80));

    // 상품 상세 페이지인지 확인
    var isProductPage = !!document.querySelector('.action_button') ||
                        !!document.getElementById('actionBuy');

    if (isProductPage) {
      log('Product detail page detected');
      createTestPanel();
    } else {
      log('Not a product page - test panel hidden');
      // 상품 페이지가 아니면 패널만 간소하게 표시
      var notice = document.createElement('div');
      notice.id = 'bg-test-panel';
      var ns = notice.style;
      ns.position = 'fixed';
      ns.top = '10px';
      ns.left = '10px';
      ns.zIndex = '2147483647';
      ns.background = 'rgba(0,0,0,0.8)';
      ns.color = '#94a3b8';
      ns.padding = '8px 12px';
      ns.borderRadius = '6px';
      ns.fontSize = '11px';
      ns.fontFamily = '-apple-system, sans-serif';
      notice.textContent = 'BG Test: 상품 상세 페이지로 이동하세요';
      var closeN = document.createElement('span');
      closeN.textContent = ' ✕';
      closeN.style.cursor = 'pointer';
      closeN.style.color = '#ef4444';
      closeN.addEventListener('click', function() { notice.remove(); });
      notice.appendChild(closeN);
      document.body.appendChild(notice);
    }
  }

  // DOMContentLoaded 대응 (ScriptTag는 늦게 로드될 수 있음)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
