/**
 * ScriptTag Shadow DOM + IntersectionObserver 기술 검증 스크립트
 *
 * 검증 목적:
 *   1. closed Shadow DOM 안에서 배너/위젯 렌더링 — 호스트 CSS 격리 확인
 *   2. IntersectionObserver로 상품 상세 4구간(top/info/detail/review) 감지
 *
 * 파일 경로: workers/api/src/widget/test-shadow-io.ts
 */

export const TEST_SHADOW_IO_JS = `(function() {
  'use strict';

  // ─── 상수 ───────────────────────────────────────────────────
  var PANEL_ID  = 'sio-panel-host';
  var BANNER_ID = 'sio-banner-host';
  var START_TS  = Date.now();

  // ─── 유틸 ───────────────────────────────────────────────────
  function log(msg) {
    console.log('[SIO-TEST] ' + msg);
  }

  function elapsed() {
    return ((Date.now() - START_TS) / 1000).toFixed(1) + 's';
  }

  function qs(selector, root) {
    try { return (root || document).querySelector(selector); } catch(e) { return null; }
  }

  // ─── 모니터링 패널 (Shadow DOM 밖, position:fixed) ──────────
  var panelRefs = {};

  function createMonitorPanel() {
    var host = document.createElement('div');
    host.id = PANEL_ID;
    var hs = host.style;
    hs.position   = 'fixed';
    hs.top        = '10px';
    hs.right      = '10px';
    hs.zIndex     = '2147483647';
    hs.width      = '260px';
    hs.fontFamily = '-apple-system,BlinkMacSystemFont,sans-serif';
    document.body.appendChild(host);

    // closed Shadow DOM — 패널 자체도 Shadow 안에 렌더링
    var shadow = host.attachShadow({ mode: 'closed' });

    // 스타일
    var styleEl = document.createElement('style');
    styleEl.textContent = [
      ':host { all: initial; display: block; }',
      '.wrap { background: rgba(10,10,10,0.92); color: #e2e8f0;',
      '        border-radius: 10px; padding: 12px; font-size: 12px;',
      '        box-shadow: 0 4px 20px rgba(0,0,0,0.4); }',
      '.title { font-size: 13px; font-weight: 700; color: #38bdf8;',
      '         margin-bottom: 10px; letter-spacing: -0.3px; }',
      '.section { margin-bottom: 8px; }',
      '.label { font-size: 10px; color: #64748b; text-transform: uppercase;',
      '         letter-spacing: 0.5px; margin-bottom: 3px; }',
      '.value { font-weight: 600; }',
      '.badge { display: inline-block; padding: 2px 7px; border-radius: 999px;',
      '         font-size: 11px; font-weight: 700; }',
      '.ok   { background: #166534; color: #4ade80; }',
      '.warn { background: #7c2d12; color: #fb923c; }',
      '.zone { font-size: 16px; font-weight: 700; color: #f0abfc; }',
      '.hist { max-height: 90px; overflow-y: auto; }',
      '.hist-row { display: flex; justify-content: space-between;',
      '            padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }',
      '.hist-time { color: #64748b; font-size: 10px; }',
      '.hist-zone { color: #a78bfa; font-size: 11px; font-weight: 600; }',
      '.close-btn { display: block; width: 100%; margin-top: 8px; padding: 5px;',
      '             background: rgba(255,255,255,0.08); border: none; border-radius: 6px;',
      '             color: #94a3b8; font-size: 11px; cursor: pointer; }',
      '.close-btn:hover { background: rgba(255,255,255,0.14); }',
    ].join(' ');
    shadow.appendChild(styleEl);

    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    shadow.appendChild(wrap);

    // 제목
    var titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = 'Shadow DOM + IO Test';
    wrap.appendChild(titleEl);

    // Shadow DOM 상태
    var secShadow = document.createElement('div');
    secShadow.className = 'section';
    var lbShadow = document.createElement('div');
    lbShadow.className = 'label';
    lbShadow.textContent = 'Shadow DOM';
    var valShadow = document.createElement('div');
    panelRefs.shadowStatus = valShadow;
    secShadow.appendChild(lbShadow);
    secShadow.appendChild(valShadow);
    wrap.appendChild(secShadow);

    // 현재 Zone
    var secZone = document.createElement('div');
    secZone.className = 'section';
    var lbZone = document.createElement('div');
    lbZone.className = 'label';
    lbZone.textContent = 'Current Scroll Zone';
    var valZone = document.createElement('div');
    valZone.className = 'zone';
    valZone.textContent = '—';
    panelRefs.zoneEl = valZone;
    secZone.appendChild(lbZone);
    secZone.appendChild(valZone);
    wrap.appendChild(secZone);

    // Zone 히스토리
    var secHist = document.createElement('div');
    secHist.className = 'section';
    var lbHist = document.createElement('div');
    lbHist.className = 'label';
    lbHist.textContent = 'Zone History';
    var histList = document.createElement('div');
    histList.className = 'hist';
    panelRefs.histList = histList;
    secHist.appendChild(lbHist);
    secHist.appendChild(histList);
    wrap.appendChild(secHist);

    // 닫기
    var closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = 'Close Panel';
    closeBtn.addEventListener('click', function() { host.remove(); });
    wrap.appendChild(closeBtn);

    log('Monitor panel (closed Shadow DOM) created');
  }

  // ─── 패널 업데이트 헬퍼 ─────────────────────────────────────
  function setShadowStatus(ok, label) {
    if (!panelRefs.shadowStatus) return;
    var badge = document.createElement('span');
    badge.className = 'badge ' + (ok ? 'ok' : 'warn');
    badge.textContent = label;
    panelRefs.shadowStatus.textContent = '';
    panelRefs.shadowStatus.appendChild(badge);
  }

  function setZone(name) {
    if (panelRefs.zoneEl) panelRefs.zoneEl.textContent = name;
  }

  function addHistory(zone) {
    if (!panelRefs.histList) return;
    var row = document.createElement('div');
    row.className = 'hist-row';
    var t = document.createElement('span');
    t.className = 'hist-time';
    t.textContent = elapsed();
    var z = document.createElement('span');
    z.className = 'hist-zone';
    z.textContent = zone;
    row.appendChild(t);
    row.appendChild(z);
    panelRefs.histList.insertBefore(row, panelRefs.histList.firstChild);
  }

  // ─── Shadow DOM 테스트 배너 ─────────────────────────────────
  function runShadowBannerTest() {
    // 1. host 요소 생성 (일반 DOM)
    var host = document.createElement('div');
    host.id = BANNER_ID;
    var hs = host.style;
    hs.display = 'block';
    hs.margin   = '20px 0';

    // 배너를 .headingArea 바로 아래에 삽입 (없으면 body 상단)
    var anchor = qs('.headingArea') || qs('.xans-product-detail') || qs('body > *:first-child');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(host, anchor.nextSibling);
    } else {
      document.body.insertBefore(host, document.body.firstChild);
    }

    // 2. closed Shadow DOM 생성
    var shadow = host.attachShadow({ mode: 'closed' });

    // 3. Shadow 내부 스타일 (호스트 CSS와 완전 격리)
    var styleEl = document.createElement('style');
    styleEl.textContent = [
      ':host { all: initial; display: block; }',
      '.banner { background: linear-gradient(135deg, #7c3aed, #db2777);',
      '          color: #ffffff !important; font-family: -apple-system,sans-serif !important;',
      '          font-size: 15px !important; font-weight: 700 !important;',
      '          padding: 14px 20px; border-radius: 10px;',
      '          display: flex; align-items: center; justify-content: space-between;',
      '          box-shadow: 0 4px 12px rgba(0,0,0,0.25); }',
      '.msg  { flex: 1; }',
      '.tag  { font-size: 10px; font-weight: 400; opacity: 0.7; display: block;',
      '        margin-bottom: 3px; letter-spacing: 0.5px; }',
      '.btn  { background: #ffffff; color: #7c3aed !important;',
      '        border: none; border-radius: 6px; padding: 8px 14px;',
      '        font-size: 12px !important; font-weight: 700 !important;',
      '        cursor: pointer; white-space: nowrap; margin-left: 12px; }',
      '.btn:hover { background: #f0fdf4; }',
      '.result { margin-top: 10px; padding: 8px 12px; border-radius: 6px;',
      '          background: rgba(255,255,255,0.15); font-size: 12px; }',
    ].join(' ');
    shadow.appendChild(styleEl);

    // 4. 배너 콘텐츠
    var banner = document.createElement('div');
    banner.className = 'banner';

    var msg = document.createElement('div');
    msg.className = 'msg';
    var tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = 'SHADOW DOM TEST — CSS ISOLATION';
    var text = document.createElement('span');
    text.textContent = '회원가입하면 3,000원 즉시 할인!';
    msg.appendChild(tag);
    msg.appendChild(text);

    var btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = '가입하기';

    // 결과 표시 영역
    var result = document.createElement('div');
    result.className = 'result';
    result.style.display = 'none';

    // 5. 버튼 클릭 이벤트 — Shadow 안에서 정상 동작하는지 확인
    var clickCount = 0;
    btn.addEventListener('click', function(e) {
      e.stopPropagation();  // 호스트로 이벤트 전파 차단 테스트
      clickCount++;
      result.style.display = 'block';
      result.textContent = '';
      var line1 = document.createElement('span');
      line1.textContent = 'Click #' + clickCount + ' captured inside Shadow DOM';
      var br = document.createElement('br');
      var line2 = document.createElement('span');
      line2.textContent = 'Event target: ' + e.target.tagName + ' (retargeted from shadow)';
      result.appendChild(line1);
      result.appendChild(br);
      result.appendChild(line2);
      log('Shadow DOM button click #' + clickCount);

      // 패널에 Shadow DOM 상태 업데이트
      setShadowStatus(true, 'OK — isolated + event works');
    });

    banner.appendChild(msg);
    banner.appendChild(btn);
    shadow.appendChild(banner);
    shadow.appendChild(result);

    // 6. 격리 검증 — 호스트에서 Shadow 내부 요소에 접근 불가 확인
    var innerFromHost = host.querySelector('.banner');  // null 이어야 정상
    var isolated = innerFromHost === null;
    log('Shadow DOM isolation check (querySelector from host): ' + (isolated ? 'PASS — null' : 'FAIL — accessible'));
    setShadowStatus(isolated, isolated ? 'Isolated (mode: closed)' : 'WARN: not isolated');

    // 7. 호스트 스타일이 Shadow 내부로 침투하는지 확인
    //    — body에 강제 스타일을 심고 Shadow 안에서 확인
    var testStyle = document.createElement('style');
    testStyle.id = 'sio-bleed-test';
    testStyle.textContent = '.banner { background: red !important; color: blue !important; }';
    document.head.appendChild(testStyle);
    // Shadow 내부는 영향 없어야 함 (검증은 육안 + 콘솔)
    log('Host bleed-in test: injected .banner{background:red} to document.head — Shadow banner should remain purple');

    return shadow;
  }

  // ─── IntersectionObserver 4구간 감지 ────────────────────────
  var currentZone = null;

  var ZONES = [
    {
      id: 'top',
      label: 'TOP (이미지/헤딩)',
      selectors: ['.headingArea', '.thumbnail_area', '.imgArea', '.product-image', '.xans-product-image'],
      threshold: 0.3
    },
    {
      id: 'info',
      label: 'INFO (가격)',
      selectors: ['#span_product_price_text', '.product_price', '.xans-product-price', '.price_wrap', '#product_price'],
      threshold: 0.5
    },
    {
      id: 'detail',
      label: 'DETAIL (상세설명)',
      selectors: ['.cont', '.detail_cont', '.xans-product-detail', '#prdDetail', '.product-detail-cont'],
      threshold: 0.2
    },
    {
      id: 'review',
      label: 'REVIEW (리뷰)',
      selectors: ['.xans-product-review', '#product_review', '.review_wrap', '.product-review', '.review_list'],
      threshold: 0.2
    }
  ];

  function findZoneTarget(zone) {
    for (var i = 0; i < zone.selectors.length; i++) {
      var el = qs(zone.selectors[i]);
      if (el) {
        log('Zone [' + zone.id + '] target found: ' + zone.selectors[i]);
        return el;
      }
    }
    // fallback: 페이지 비율 위치의 가상 요소
    return createFallbackSentinel(zone.id);
  }

  function createFallbackSentinel(zoneId) {
    var ratioMap = { top: 0.1, info: 0.3, detail: 0.55, review: 0.75 };
    var ratio = ratioMap[zoneId] || 0.5;

    var sentinel = document.createElement('div');
    sentinel.id = 'sio-sentinel-' + zoneId;
    var ss = sentinel.style;
    ss.position   = 'absolute';
    ss.top        = (ratio * 100) + 'vh';
    // 페이지 총 높이 기준으로 배치
    ss.left       = '0';
    ss.width      = '1px';
    ss.height     = '1px';
    ss.pointerEvents = 'none';
    ss.opacity    = '0';
    document.body.appendChild(sentinel);
    log('Zone [' + zoneId + '] fallback sentinel created at ' + (ratio * 100) + 'vh');
    return sentinel;
  }

  function initIntersectionObserver() {
    if (!window.IntersectionObserver) {
      log('IntersectionObserver: NOT SUPPORTED');
      setShadowStatus(false, 'IO: Not Supported');
      return;
    }

    var lastZone = null;

    ZONES.forEach(function(zone) {
      var target = findZoneTarget(zone);
      if (!target) return;

      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
          if (entry.isIntersecting && currentZone !== zone.id) {
            currentZone = zone.id;
            var label = zone.label;
            setZone(label);
            if (lastZone !== zone.id) {
              addHistory(label);
              lastZone = zone.id;
              log('Zone entered: ' + label + ' at ' + elapsed());
            }
          }
        });
      }, {
        threshold: zone.threshold,
        rootMargin: '0px 0px -20% 0px'
      });

      observer.observe(target);
      log('IO attached to zone [' + zone.id + ']: ' + (target.id || target.className || target.tagName));
    });

    log('IntersectionObserver: ' + ZONES.length + ' zones registered');
  }

  // ─── 초기화 ─────────────────────────────────────────────────
  function init() {
    log('=== SIO Test v1.0 — Shadow DOM + IntersectionObserver ===');

    // 1. 모니터링 패널 생성
    createMonitorPanel();

    // 2. Shadow DOM 배너 삽입 및 검증
    runShadowBannerTest();

    // 3. IO 4구간 감지 시작
    initIntersectionObserver();

    log('Init complete');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
