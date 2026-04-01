/**
 * ScriptTag Front API 기술 검증 스크립트
 *
 * 검증 목적:
 *   B. Front API 상품 정보 조회 — URL에서 product_no 추출, 상품명/가격/재고/옵션 조회,
 *      DOM 파싱 결과와 비교
 *   C. Front API 장바구니 담기 — API 호출 가능 여부 확인 (실제 담기 후 즉시 제거)
 *
 * 파일 경로: workers/api/src/widget/test-front-api.ts
 */

export const TEST_FRONT_API_JS = `(function() {
  'use strict';

  var MALL_ID    = 'suparain999';
  var CLIENT_ID  = '';   // ScriptTag 주입 시 치환 예정 (현재는 빈값으로 탐색)
  var PANEL_ID   = 'fapi-panel-host';
  var START_TS   = Date.now();

  // ─── 유틸 ────────────────────────────────────────────────────
  function log(msg) { console.log('[FAPI-TEST] ' + msg); }

  function elapsed() { return ((Date.now() - START_TS) / 1000).toFixed(2) + 's'; }

  function qs(sel, root) {
    try { return (root || document).querySelector(sel); } catch(e) { return null; }
  }

  // ─── product_no 추출 ─────────────────────────────────────────
  // 카페24 상품 상세 URL 패턴: /product/상품명/숫자/  또는  ?product_no=숫자
  function extractProductNo() {
    var href = location.href;

    // 패턴 1: /product/xxx/12345/
    var m1 = href.match(new RegExp('/product/[^/]+/(\\\\d+)/?'));
    if (m1) return Number(m1[1]);

    // 패턴 2: ?product_no=12345
    var m2 = href.match(new RegExp('[?&]product_no=(\\\\d+)'));
    if (m2) return Number(m2[1]);

    // 패턴 3: 카페24 전역 변수
    try {
      if (window.product_no) return Number(window.product_no);
      if (window.iProductNo) return Number(window.iProductNo);
    } catch(e) {}

    return null;
  }

  // ─── DOM에서 상품 정보 파싱 ───────────────────────────────────
  function parseDom() {
    var name  = null;
    var price = null;

    // 상품명
    var nameEl =
      qs('.headingArea h2') ||
      qs('.product_name') ||
      qs('[class*="product"][class*="name"]') ||
      qs('h2.name');
    if (nameEl) name = nameEl.textContent.trim();

    // 가격
    var priceEl =
      qs('#span_product_price_text') ||
      qs('.product_price') ||
      qs('[class*="price"]');
    if (priceEl) price = priceEl.textContent.trim().replace(new RegExp('[^0-9,]', 'g'), '');

    return { name: name, price: price };
  }

  // ─── 전역 객체 탐색 ──────────────────────────────────────────
  function detectGlobalObjects() {
    var results = [];
    var keys = ['CAFE24API', 'CAFE24', 'cafe24', 'Cafe24', 'EC', 'ecapi'];
    keys.forEach(function(k) {
      var exists = typeof window[k] !== 'undefined';
      results.push({ key: k, exists: exists, type: exists ? typeof window[k] : '-' });
      log('window.' + k + ' = ' + (exists ? typeof window[k] : 'undefined'));
    });
    return results;
  }

  // ─── Front API fetch (client_id 헤더 포함) ──────────────────
  function fetchProductInfo(productNo) {
    var url = 'https://' + MALL_ID + '.cafe24api.com/api/v2/products/' + productNo;
    log('Fetching: ' + url + ' (client_id: ' + (CLIENT_ID ? CLIENT_ID.slice(0,8) + '...' : 'EMPTY') + ')');
    var headers = { 'Content-Type': 'application/json' };
    if (CLIENT_ID) {
      headers['Authorization'] = 'Bearer ' + CLIENT_ID;
      headers['X-Cafe24-Client-Id'] = CLIENT_ID;
    }
    return fetch(url, { method: 'GET', headers: headers })
    .then(function(res) {
      return res.text().then(function(text) {
        try { return { status: res.status, ok: res.ok, body: JSON.parse(text) }; }
        catch(e) { return { status: res.status, ok: res.ok, body: text.slice(0, 300) }; }
      });
    })
    .catch(function(err) {
      return { status: 0, ok: false, error: err.message };
    });
  }

  // ─── CAFE24API SDK 방식 (콜백 패턴) ─────────────────────────
  function trySDKMethod(productNo) {
    return new Promise(function(resolve) {
      if (typeof window.CAFE24API === 'undefined') {
        return resolve({ tried: false, reason: 'CAFE24API not found' });
      }
      try {
        log('CAFE24API.init with client_id: ' + (CLIENT_ID ? CLIENT_ID.slice(0,8) + '...' : 'NONE'));

        // 1단계: init
        if (CLIENT_ID) {
          window.CAFE24API.init({ client_id: CLIENT_ID });
        }

        // 2단계: 콜백 방식으로 호출
        var path = '/api/v2/products/' + productNo;

        // 방법 A: 콜백 패턴 (공식 문서)
        if (typeof window.CAFE24API.get === 'function') {
          try {
            window.CAFE24API.get(path, function(err, res) {
              if (err) {
                log('SDK callback error: ' + JSON.stringify(err));
                resolve({ tried: true, ok: false, error: JSON.stringify(err), method: 'callback(err,res)' });
              } else {
                log('SDK callback success');
                resolve({ tried: true, ok: true, data: res, method: 'callback(err,res)' });
              }
            });
            return;
          } catch(e) {
            log('SDK callback threw: ' + e.message);
          }

          // 방법 B: 단일 콜백 패턴
          try {
            window.CAFE24API.get(path, function(res) {
              log('SDK single-callback: ' + typeof res);
              resolve({ tried: true, ok: true, data: res, method: 'callback(res)' });
            });
            return;
          } catch(e) {
            log('SDK single-callback threw: ' + e.message);
          }
        }

        resolve({ tried: true, ok: false, error: 'No working call pattern found', method: 'none' });
      } catch(e) {
        resolve({ tried: true, ok: false, error: e.message });
      }
    });
  }

  // ─── 검증 C: 장바구니 담기 ───────────────────────────────────
  // POST /api/v2/carts  (Front API — 인증 필요 시 실패하므로 에러 분석)
  function testAddToCart(productNo) {
    var url = 'https://' + MALL_ID + '.cafe24api.com/api/v2/carts';
    var body = JSON.stringify({
      shop_no: 1,
      items: [{
        product_no: productNo,
        quantity: 1
      }]
    });
    log('Cart POST: ' + url);
    var cartHeaders = {
      'Content-Type': 'application/json',
      'X-Cafe24-Api-Version': '2024-06-01'
    };
    if (CLIENT_ID) {
      cartHeaders['Authorization'] = 'Bearer ' + CLIENT_ID;
      cartHeaders['X-Cafe24-Client-Id'] = CLIENT_ID;
    }
    return fetch(url, {
      method: 'POST',
      headers: cartHeaders,
      body: body
    })
    .then(function(res) {
      return res.json().then(function(data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    })
    .catch(function(err) {
      return { status: 0, ok: false, error: err.message };
    });
  }

  // ─── 검증 C-1b: CAFE24API SDK 장바구니 담기 (콜백) ─────────
  function testSDKAddToCart(productNo) {
    return new Promise(function(resolve) {
      if (typeof window.CAFE24API === 'undefined') {
        return resolve({ tried: false, reason: 'CAFE24API not found' });
      }
      try {
        if (CLIENT_ID) {
          window.CAFE24API.init({ client_id: CLIENT_ID });
        }

        if (typeof window.CAFE24API.post !== 'function') {
          // post 없으면 create 시도
          if (typeof window.CAFE24API.create === 'function') {
            log('SDK cart: trying .create()');
            window.CAFE24API.create('/api/v2/carts', {
              shop_no: 1,
              items: [{ product_no: productNo, quantity: 1 }]
            }, function(err, res) {
              if (err) resolve({ tried: true, ok: false, error: JSON.stringify(err), method: 'create' });
              else resolve({ tried: true, ok: true, data: res, method: 'create' });
            });
            return;
          }
          return resolve({ tried: false, reason: 'No .post() or .create() method' });
        }

        log('SDK cart: trying .post()');
        window.CAFE24API.post('/api/v2/carts', {
          shop_no: 1,
          items: [{ product_no: productNo, quantity: 1 }]
        }, function(err, res) {
          if (err) {
            log('SDK cart error: ' + JSON.stringify(err));
            resolve({ tried: true, ok: false, error: JSON.stringify(err), method: 'post' });
          } else {
            log('SDK cart success');
            resolve({ tried: true, ok: true, data: res, method: 'post' });
          }
        });
      } catch(e) {
        resolve({ tried: true, ok: false, error: e.message });
      }
    });
  }

  // ─── form submit 대안 방식 ────────────────────────────────────
  function testCartFormAlt(productNo) {
    return new Promise(function(resolve) {
      try {
        // 카페24 표준 장바구니 form 패턴 분석 (실제 submit은 하지 않음)
        var existingForm =
          qs('form[name="frmCart"]') ||
          qs('form#productOrderForm') ||
          qs('form[action*="cart"]');

        if (existingForm) {
          var action = existingForm.getAttribute('action') || '';
          var method = existingForm.getAttribute('method') || 'GET';
          var inputs = existingForm.querySelectorAll('input');
          var fields = [];
          inputs.forEach(function(inp) {
            if (inp.name) fields.push(inp.name + '=' + (inp.value || '?'));
          });
          resolve({
            found: true,
            action: action,
            method: method,
            fields: fields.slice(0, 8)  // 최대 8개만
          });
        } else {
          resolve({ found: false, reason: 'No cart form detected' });
        }
      } catch(e) {
        resolve({ found: false, reason: e.message });
      }
    });
  }

  // ─── 모니터 패널 생성 ─────────────────────────────────────────
  var panelRefs = {};

  function createPanel() {
    if (document.getElementById(PANEL_ID)) document.getElementById(PANEL_ID).remove();

    var host = document.createElement('div');
    host.id = PANEL_ID;
    var hs = host.style;
    hs.position   = 'fixed';
    hs.top        = '10px';
    hs.left       = '10px';
    hs.zIndex     = '2147483647';
    hs.width      = '320px';
    hs.fontFamily = '-apple-system,BlinkMacSystemFont,monospace';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'open' });

    var styleEl = document.createElement('style');
    styleEl.textContent = [
      ':host { all: initial; display: block; }',
      '.wrap { background: rgba(10,10,10,0.93); color: #e2e8f0;',
      '        border-radius: 10px; padding: 14px; font-size: 11px;',
      '        box-shadow: 0 4px 24px rgba(0,0,0,0.5);',
      '        max-height: 90vh; overflow-y: auto; }',
      '.title { font-size: 13px; font-weight: 700; color: #38bdf8;',
      '         margin-bottom: 12px; }',
      '.section { margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.07);',
      '           padding-bottom: 8px; }',
      '.sec-title { font-size: 10px; font-weight: 700; color: #a78bfa;',
      '             text-transform: uppercase; letter-spacing: 0.6px;',
      '             margin-bottom: 6px; }',
      '.row { display: flex; justify-content: space-between; margin-bottom: 3px; }',
      '.key { color: #64748b; min-width: 90px; }',
      '.val { color: #f1f5f9; font-weight: 600; word-break: break-all; flex: 1; }',
      '.badge { display: inline-block; padding: 1px 7px; border-radius: 999px;',
      '         font-size: 10px; font-weight: 700; }',
      '.ok   { background: #166534; color: #4ade80; }',
      '.warn { background: #7c2d12; color: #fb923c; }',
      '.info { background: #1e3a5f; color: #60a5fa; }',
      '.match { background: #14532d; color: #86efac; }',
      '.mismatch { background: #7f1d1d; color: #fca5a5; }',
      '.close-btn { display: block; width: 100%; margin-top: 10px; padding: 5px;',
      '             background: rgba(255,255,255,0.08); border: none; border-radius: 6px;',
      '             color: #94a3b8; font-size: 11px; cursor: pointer; }',
      '.close-btn:hover { background: rgba(255,255,255,0.14); }',
      '.json { font-size: 10px; color: #94a3b8; word-break: break-all;',
      '        max-height: 80px; overflow-y: auto; margin-top: 4px; }',
    ].join(' ');
    shadow.appendChild(styleEl);

    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    shadow.appendChild(wrap);

    var titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = 'Front API Test (B+C)';
    wrap.appendChild(titleEl);

    // 섹션 생성 헬퍼
    function makeSection(id, label) {
      var sec = document.createElement('div');
      sec.className = 'section';
      var t = document.createElement('div');
      t.className = 'sec-title';
      t.textContent = label;
      sec.appendChild(t);
      wrap.appendChild(sec);
      panelRefs[id] = sec;
      return sec;
    }

    makeSection('secInfo',   'B-0. 기본 정보');
    makeSection('secGlobal', 'B-1. 전역 객체');
    makeSection('secDOM',    'B-2. DOM 파싱');
    makeSection('secFetch',  'B-3. Front API fetch');
    makeSection('secSDK',    'B-4. CAFE24API SDK');
    makeSection('secComp',   'B-5. 결과 비교');
    makeSection('secCartAPI','C-1a. 장바구니 fetch');
    makeSection('secCartSDK','C-1b. 장바구니 SDK');
    makeSection('secCartFrm','C-2. Form 대안');

    var closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = 'Close Panel';
    closeBtn.addEventListener('click', function() { host.remove(); });
    wrap.appendChild(closeBtn);
  }

  // ─── 패널 렌더 헬퍼 ─────────────────────────────────────────
  function addRow(secRef, key, val, badgeClass) {
    if (!secRef) return;
    var row = document.createElement('div');
    row.className = 'row';
    var k = document.createElement('span');
    k.className = 'key';
    k.textContent = key;
    var v = document.createElement('span');
    v.className = 'val';
    if (badgeClass) {
      var badge = document.createElement('span');
      badge.className = 'badge ' + badgeClass;
      badge.textContent = String(val);
      v.appendChild(badge);
    } else {
      v.textContent = String(val === null || val === undefined ? '—' : val);
    }
    row.appendChild(k);
    row.appendChild(v);
    secRef.appendChild(row);
  }

  function addJson(secRef, obj) {
    if (!secRef) return;
    var pre = document.createElement('div');
    pre.className = 'json';
    pre.textContent = JSON.stringify(obj, null, 1).slice(0, 600);
    secRef.appendChild(pre);
  }

  // ─── 메인 실행 ───────────────────────────────────────────────
  function run() {
    log('=== Front API Test v1.0 — B+C ===');

    createPanel();

    // B-0. 기본 정보
    var productNo = extractProductNo();
    addRow(panelRefs.secInfo, 'URL', location.pathname.slice(0, 40));
    addRow(panelRefs.secInfo, 'product_no',
      productNo ? String(productNo) : 'NOT FOUND',
      productNo ? 'ok' : 'warn');
    log('product_no: ' + productNo);

    if (!productNo) {
      addRow(panelRefs.secInfo, '경고', '상품 상세 페이지가 아닌 것 같습니다', 'warn');
    }

    // B-1. 전역 객체
    var globals = detectGlobalObjects();
    globals.forEach(function(g) {
      addRow(panelRefs.secGlobal, 'window.' + g.key,
        g.exists ? g.type : 'undefined',
        g.exists ? 'ok' : 'warn');
    });

    // B-2. DOM 파싱
    var domResult = parseDom();
    addRow(panelRefs.secDOM, 'name',  domResult.name  || '—');
    addRow(panelRefs.secDOM, 'price', domResult.price || '—');

    if (!productNo) {
      // product_no 없으면 API 테스트 스킵
      addRow(panelRefs.secFetch,   '상태', 'SKIP — no product_no', 'warn');
      addRow(panelRefs.secSDK,     '상태', 'SKIP — no product_no', 'warn');
      addRow(panelRefs.secCartAPI, '상태', 'SKIP — no product_no', 'warn');
      addRow(panelRefs.secCartFrm, '상태', 'SKIP — no product_no', 'warn');
      return;
    }

    // B-3. Front API fetch
    fetchProductInfo(productNo).then(function(res) {
      log('fetch status: ' + res.status);
      addRow(panelRefs.secFetch, 'HTTP status', res.status,
        (res.status === 200) ? 'ok' : 'warn');
      addRow(panelRefs.secFetch, 'ok', String(res.ok), res.ok ? 'ok' : 'warn');

      var apiName  = null;
      var apiPrice = null;
      var apiStock = null;

      if (res.ok && res.body && res.body.product) {
        var p = res.body.product;
        apiName  = p.product_name || p.name || null;
        apiPrice = p.retail_price || p.price || null;
        apiStock = p.stock !== undefined ? p.stock : null;

        addRow(panelRefs.secFetch, 'product_name', apiName  || '—');
        addRow(panelRefs.secFetch, 'price',        apiPrice !== null ? String(apiPrice) : '—');
        addRow(panelRefs.secFetch, 'stock',        apiStock !== null ? String(apiStock) : '—');

        // 옵션 정보
        var opts = p.options || p.variants || [];
        addRow(panelRefs.secFetch, 'options count', String(Array.isArray(opts) ? opts.length : '—'));
      } else if (res.error) {
        addRow(panelRefs.secFetch, 'error', res.error, 'warn');
      } else {
        addRow(panelRefs.secFetch, 'body', res.body ? 'see json' : 'empty', 'warn');
        if (res.body) addJson(panelRefs.secFetch, res.body);
      }

      // B-5. DOM vs API 비교
      if (domResult.name && apiName) {
        var nameMatch = domResult.name.includes(apiName) || apiName.includes(domResult.name);
        addRow(panelRefs.secComp, 'name match',
          nameMatch ? 'MATCH' : 'MISMATCH',
          nameMatch ? 'match' : 'mismatch');
        addRow(panelRefs.secComp, 'DOM name',  domResult.name.slice(0, 30));
        addRow(panelRefs.secComp, 'API name',  apiName.slice(0, 30));
      } else {
        addRow(panelRefs.secComp, '상태',
          !apiName ? 'API name N/A' : 'DOM name N/A',
          'info');
      }
      if (domResult.price && apiPrice !== null) {
        var domPriceNum = Number(domResult.price.replace(new RegExp(',', 'g'),''));
        var apiPriceNum = Number(String(apiPrice).replace(new RegExp(',', 'g'),''));
        var priceMatch  = !isNaN(domPriceNum) && !isNaN(apiPriceNum) &&
                          Math.abs(domPriceNum - apiPriceNum) < 10;
        addRow(panelRefs.secComp, 'price match',
          priceMatch ? 'MATCH' : 'MISMATCH',
          priceMatch ? 'match' : 'mismatch');
        addRow(panelRefs.secComp, 'DOM price', String(domResult.price));
        addRow(panelRefs.secComp, 'API price', String(apiPrice));
      }
    });

    // B-4. CAFE24API SDK
    trySDKMethod(productNo).then(function(res) {
      addRow(panelRefs.secSDK, 'tried', String(res.tried), res.tried ? 'ok' : 'info');
      if (!res.tried) {
        addRow(panelRefs.secSDK, 'reason', res.reason || '—', 'warn');
      } else if (res.ok) {
        addRow(panelRefs.secSDK, 'result', 'SUCCESS', 'ok');
        if (res.data) addJson(panelRefs.secSDK, res.data);
      } else {
        addRow(panelRefs.secSDK, 'error', res.error || 'unknown', 'warn');
      }
    });

    // C-1. 장바구니 API
    testAddToCart(productNo).then(function(res) {
      log('cart API status: ' + res.status);
      addRow(panelRefs.secCartAPI, 'HTTP status', res.status);

      if (res.status === 200 || res.status === 201) {
        addRow(panelRefs.secCartAPI, 'callable', 'YES — 담기 성공', 'ok');
        if (res.data) addJson(panelRefs.secCartAPI, res.data);
        // 담겼으면 바로 제거 시도 (cart_item_no 확인 후)
        // 카페24 Front API 카트 삭제: DELETE /api/v2/carts/{cart_item_no}
        try {
          var cartItem = res.data && res.data.cart && res.data.cart[0];
          if (cartItem && cartItem.cart_item_no) {
            var delUrl = 'https://' + MALL_ID + '.cafe24api.com/api/v2/carts/' + cartItem.cart_item_no;
            fetch(delUrl, { method: 'DELETE' }).then(function(dr) {
              log('Cart item removed, status: ' + dr.status);
              addRow(panelRefs.secCartAPI, 'auto-remove', String(dr.status), dr.ok ? 'ok' : 'warn');
            }).catch(function(e) {
              log('Cart remove failed: ' + e.message);
            });
          }
        } catch(e) {}
      } else if (res.status === 401 || res.status === 403) {
        addRow(panelRefs.secCartAPI, 'callable', 'AUTH REQUIRED (' + res.status + ')', 'warn');
        addRow(panelRefs.secCartAPI, '의미', 'API 존재, 인증 필요', 'info');
        if (res.data) addJson(panelRefs.secCartAPI, res.data);
      } else if (res.status === 404) {
        addRow(panelRefs.secCartAPI, 'callable', '404 — endpoint 없음', 'warn');
      } else if (res.status === 0) {
        addRow(panelRefs.secCartAPI, 'callable', 'NETWORK ERROR', 'warn');
        addRow(panelRefs.secCartAPI, 'error', res.error || '—');
        addRow(panelRefs.secCartAPI, 'CORS?', 'CORS 블록 가능성 있음', 'info');
      } else {
        addRow(panelRefs.secCartAPI, 'callable', 'status ' + res.status, 'warn');
        if (res.data) addJson(panelRefs.secCartAPI, res.data);
      }
    });

    // C-1b. SDK 장바구니
    testSDKAddToCart(productNo).then(function(res) {
      addRow(panelRefs.secCartSDK, 'tried', String(res.tried), res.tried ? 'ok' : 'info');
      if (!res.tried) {
        addRow(panelRefs.secCartSDK, 'reason', res.reason || '—', 'warn');
      } else if (res.ok) {
        addRow(panelRefs.secCartSDK, 'result', 'SUCCESS — 담기 성공!', 'ok');
        addRow(panelRefs.secCartSDK, 'method', res.method || '—');
        if (res.data) addJson(panelRefs.secCartSDK, res.data);
      } else {
        addRow(panelRefs.secCartSDK, 'error', res.error || 'unknown', 'warn');
        addRow(panelRefs.secCartSDK, 'method', res.method || '—');
      }
    });

    // C-2. Form 대안
    testCartFormAlt(productNo).then(function(res) {
      addRow(panelRefs.secCartFrm, 'form found', String(res.found), res.found ? 'ok' : 'warn');
      if (res.found) {
        addRow(panelRefs.secCartFrm, 'action', (res.action || '—').slice(0, 40));
        addRow(panelRefs.secCartFrm, 'method', res.method || '—');
        if (res.fields && res.fields.length) {
          res.fields.forEach(function(f) {
            addRow(panelRefs.secCartFrm, 'field', f.slice(0, 40));
          });
        }
      } else {
        addRow(panelRefs.secCartFrm, 'reason', res.reason || '—', 'warn');
      }
    });

    log('All tests initiated');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();`;
