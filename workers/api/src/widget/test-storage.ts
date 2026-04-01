/**
 * ScriptTag localStorage 용량 검증 스크립트
 *
 * 목적: 50개 상품 레코드를 localStorage에 저장했을 때의
 *       용량과 동작을 검증
 *
 * 테스트 항목:
 *   1. 50개 더미 상품 레코드(ProductRecord) 생성 및 저장
 *   2. 읽기/파싱 정상 동작 확인
 *   3. bg_product_history 키 바이트 크기 측정
 *   4. bg_session, bg_visitor_profile 함께 저장 후 총 용량 측정
 *   5. 결과 패널 화면 좌상단 표시
 */

export const TEST_STORAGE_JS = `(function() {
  'use strict';

  var KEYS = {
    history: 'bg_product_history',
    session: 'bg_session',
    profile: 'bg_visitor_profile'
  };

  // ─── 유틸리티 ──────────────────────────────────────────────
  function log(msg) {
    console.log('[BG-STORAGE] ' + msg);
  }

  function byteSize(str) {
    // UTF-16 기준 localStorage 실제 저장 크기
    return str.length * 2;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    return (bytes / 1024).toFixed(2) + ' KB';
  }

  // ─── 더미 데이터 생성 ──────────────────────────────────────
  var CATEGORIES = ['상의', '하의', '신발', '가방', '액세서리', '아우터', '속옷', '스포츠'];
  var NAMES = [
    '슬림핏 데님 자켓', '오버사이즈 후드티', '스트라이프 셔츠', '캐주얼 치노 팬츠',
    '레더 스니커즈', '캔버스 토트백', '실버 링 세트', '패딩 점퍼',
    '메쉬 운동화', '크로스백', '베이직 티셔츠', '와이드 슬랙스',
    '앵클 부츠', '버킷햇', '골드 이어링', '리버시블 점퍼',
    '압축 레깅스', '미니 클러치', '린넨 셔츠', '카고 팬츠'
  ];

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomFloat(min, max, dec) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(dec || 1));
  }

  function makePriceHistory(basePrice) {
    var history = [];
    var months = ['2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03'];
    for (var i = 0; i < months.length; i++) {
      history.push({
        date: months[i],
        price: basePrice + randomInt(-5000, 10000)
      });
    }
    return history;
  }

  function generateProductRecords(count) {
    var records = [];
    var now = Date.now();
    for (var i = 0; i < count; i++) {
      var productId = 'prod_' + String(1000 + i).padStart(4, '0');
      var price = randomInt(9900, 299000);
      var name = NAMES[i % NAMES.length] + ' ' + (i + 1);
      var category = CATEGORIES[i % CATEGORIES.length];

      records.push({
        id: productId,
        name: name,
        price: price,
        original_price: price + randomInt(0, 30000),
        category: category,
        sub_category: category + '_sub',
        brand: 'Brand_' + String.fromCharCode(65 + (i % 26)),
        sku: 'SKU-' + productId,
        image_url: 'https://suparain999.cafe24.com/web/product/medium/' + productId + '.jpg',
        product_url: '/product/' + productId,
        tags: [category, '신상품', i % 3 === 0 ? '베스트' : '일반'],
        visit_count: randomInt(1, 20),
        time_spent: randomInt(5000, 300000),
        scroll_depth: randomFloat(10, 100, 1),
        add_to_cart_count: randomInt(0, 5),
        purchase_count: randomInt(0, 2),
        wishlist: i % 4 === 0,
        last_visited_at: now - randomInt(0, 604800000),
        first_visited_at: now - randomInt(604800000, 2592000000),
        price_history: makePriceHistory(price),
        review_score: randomFloat(3.0, 5.0, 1),
        review_count: randomInt(0, 500),
        stock_status: i % 5 === 0 ? 'soldout' : 'in_stock',
        discount_rate: randomInt(0, 40)
      });
    }
    return records;
  }

  function generateSessionRecord() {
    var now = Date.now();
    return {
      session_id: 'sess_' + now + '_' + randomInt(1000, 9999),
      visitor_id: 'vis_' + randomInt(100000, 999999),
      started_at: now - randomInt(0, 3600000),
      last_activity_at: now,
      page_views: randomInt(1, 20),
      referrer: document.referrer || 'direct',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      device: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      os: navigator.platform,
      browser: navigator.userAgent.split(' ').pop(),
      viewport_width: window.innerWidth,
      viewport_height: window.innerHeight,
      is_logged_in: false,
      current_page: location.pathname
    };
  }

  function generateVisitorProfile() {
    var now = Date.now();
    return {
      visitor_id: 'vis_' + randomInt(100000, 999999),
      created_at: now - randomInt(86400000, 2592000000),
      updated_at: now,
      total_visits: randomInt(1, 50),
      total_page_views: randomInt(10, 300),
      total_time_spent: randomInt(60000, 3600000),
      preferred_categories: ['상의', '하의', '신발'],
      avg_price_range: { min: 19900, max: 89000 },
      last_purchase_at: now - randomInt(0, 2592000000),
      purchase_count: randomInt(0, 10),
      cart_abandon_count: randomInt(0, 20),
      wishlist_count: randomInt(0, 15),
      segment: 'occasional',
      social_linked: false,
      email: null
    };
  }

  // ─── 패널 생성 ─────────────────────────────────────────────
  function createPanel() {
    var panel = document.createElement('div');
    panel.id = 'bg-storage-panel';
    var s = panel.style;
    s.position = 'fixed';
    s.top = '10px';
    s.left = '10px';
    s.zIndex = '2147483647';
    s.background = 'rgba(0,0,0,0.92)';
    s.color = '#fff';
    s.padding = '14px';
    s.borderRadius = '10px';
    s.fontSize = '12px';
    s.fontFamily = '-apple-system, monospace';
    s.maxWidth = '320px';
    s.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
    s.lineHeight = '1.6';

    var title = document.createElement('div');
    title.textContent = 'localStorage 용량 테스트';
    title.style.fontWeight = 'bold';
    title.style.fontSize = '14px';
    title.style.color = '#4ade80';
    title.style.marginBottom = '10px';
    panel.appendChild(title);

    return panel;
  }

  function addRow(panel, label, value, color) {
    var row = document.createElement('div');
    row.style.marginBottom = '4px';
    row.style.display = 'flex';
    row.style.justifyContent = 'space-between';
    row.style.gap = '12px';

    var lbl = document.createElement('span');
    lbl.textContent = label;
    lbl.style.color = '#94a3b8';
    lbl.style.flexShrink = '0';

    var val = document.createElement('span');
    val.textContent = value;
    val.style.color = color || '#f1f5f9';
    val.style.fontWeight = '600';
    val.style.textAlign = 'right';

    row.appendChild(lbl);
    row.appendChild(val);
    panel.appendChild(row);
  }

  function addDivider(panel) {
    var d = document.createElement('div');
    d.style.borderTop = '1px solid #334155';
    d.style.margin = '8px 0';
    panel.appendChild(d);
  }

  function addCloseBtn(panel) {
    var btn = document.createElement('div');
    btn.textContent = '✕ 닫기';
    btn.style.textAlign = 'center';
    btn.style.marginTop = '10px';
    btn.style.fontSize = '11px';
    btn.style.color = '#64748b';
    btn.style.cursor = 'pointer';
    btn.addEventListener('click', function() { panel.remove(); });
    panel.appendChild(btn);
  }

  // ─── 테스트 실행 ───────────────────────────────────────────
  function runTest() {
    log('=== localStorage 용량 테스트 시작 ===');

    var results = {};

    // 1. 50개 상품 레코드 생성
    var records = generateProductRecords(50);
    log('레코드 생성: ' + records.length + '개');

    // 2. bg_product_history 저장
    var historyJson = JSON.stringify(records);
    var historyBytes = byteSize(historyJson);
    try {
      localStorage.setItem(KEYS.history, historyJson);
      results.history = { ok: true, bytes: historyBytes };
      log('bg_product_history 저장 성공: ' + formatBytes(historyBytes));
    } catch(e) {
      results.history = { ok: false, bytes: historyBytes, error: e.message };
      log('bg_product_history 저장 실패: ' + e.message);
    }

    // 3. 읽기/파싱 확인
    var parseOk = false;
    var parsedCount = 0;
    try {
      var raw = localStorage.getItem(KEYS.history);
      if (raw) {
        var parsed = JSON.parse(raw);
        parsedCount = Array.isArray(parsed) ? parsed.length : -1;
        parseOk = parsedCount === 50;
        log('파싱 확인: ' + parsedCount + '개 레코드');
      }
    } catch(e) {
      log('파싱 실패: ' + e.message);
    }
    results.parseOk = parseOk;
    results.parsedCount = parsedCount;

    // 4. bg_session 저장
    var sessionJson = JSON.stringify(generateSessionRecord());
    var sessionBytes = byteSize(sessionJson);
    try {
      localStorage.setItem(KEYS.session, sessionJson);
      results.session = { ok: true, bytes: sessionBytes };
      log('bg_session 저장 성공: ' + formatBytes(sessionBytes));
    } catch(e) {
      results.session = { ok: false, bytes: sessionBytes, error: e.message };
      log('bg_session 저장 실패: ' + e.message);
    }

    // 5. bg_visitor_profile 저장
    var profileJson = JSON.stringify(generateVisitorProfile());
    var profileBytes = byteSize(profileJson);
    try {
      localStorage.setItem(KEYS.profile, profileJson);
      results.profile = { ok: true, bytes: profileBytes };
      log('bg_visitor_profile 저장 성공: ' + formatBytes(profileBytes));
    } catch(e) {
      results.profile = { ok: false, bytes: profileBytes, error: e.message };
      log('bg_visitor_profile 저장 실패: ' + e.message);
    }

    // 6. 총 용량 계산
    var totalBytes = historyBytes +
      (results.session ? results.session.bytes : 0) +
      (results.profile ? results.profile.bytes : 0);
    results.totalBytes = totalBytes;

    // 7. localStorage 전체 사용량 (현재 origin 기준)
    var allBytes = 0;
    try {
      for (var k in localStorage) {
        if (localStorage.hasOwnProperty(k)) {
          allBytes += byteSize(localStorage.getItem(k) || '');
          allBytes += byteSize(k);
        }
      }
    } catch(e) {}
    results.allBytes = allBytes;

    log('총 3개 키 합계: ' + formatBytes(totalBytes));
    log('origin 전체 localStorage: ' + formatBytes(allBytes));
    log('=== 테스트 완료 ===');

    // 8. 패널 표시
    var panel = createPanel();

    addRow(panel, '상품 레코드 수', '50개');
    addRow(panel, '파싱 검증', parseOk ? ('성공 (' + parsedCount + '개)') : '실패', parseOk ? '#4ade80' : '#f87171');

    addDivider(panel);

    addRow(panel, 'bg_product_history',
      results.history.ok ? formatBytes(results.history.bytes) : '저장 실패',
      results.history.ok ? '#f1f5f9' : '#f87171');

    addRow(panel, 'bg_session',
      results.session.ok ? formatBytes(results.session.bytes) : '저장 실패',
      results.session.ok ? '#f1f5f9' : '#f87171');

    addRow(panel, 'bg_visitor_profile',
      results.profile.ok ? formatBytes(results.profile.bytes) : '저장 실패',
      results.profile.ok ? '#f1f5f9' : '#f87171');

    addDivider(panel);

    addRow(panel, '3개 키 합계', formatBytes(totalBytes), '#fbbf24');
    addRow(panel, 'Origin 전체', formatBytes(allBytes), '#fb923c');
    addRow(panel, '5MB 한도 대비', (totalBytes / (5 * 1024 * 1024) * 100).toFixed(2) + '%', '#a78bfa');

    addCloseBtn(panel);

    var existing = document.getElementById('bg-storage-panel');
    if (existing) existing.remove();
    document.body.appendChild(panel);
  }

  // ─── 초기화 ────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runTest);
  } else {
    runTest();
  }
})();`;
