/**
 * ScriptTag 이벤트 감지 기술 검증 스크립트
 *
 * 검증 목적:
 *   D. visibilitychange — 탭 전환/앱 전환 시 이벤트 발생 여부
 *   E. Beacon API      — pagehide/beforeunload + sendBeacon() 호출 성공 여부
 *   H. MutationObserver — SPA 페이지 전환 / 동적 DOM 변경 감지
 *
 * 파일 경로: workers/api/src/widget/test-events.ts
 */

export const TEST_EVENTS_JS = `(function() {
  'use strict';

  // ─── 상수 ───────────────────────────────────────────────────────────────────
  var PANEL_ID      = 'sevt-panel-host';
  var BEACON_URL    = 'https://bg.suparain.kr/test/beacon';
  var MO_DEBOUNCE   = 100;   // MutationObserver 디바운스(ms)
  var START_TS      = Date.now();

  // ─── 유틸 ───────────────────────────────────────────────────────────────────
  function log(msg) {
    console.log('[SEVT-TEST] ' + msg);
  }

  function tsLabel() {
    var d = new Date();
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    var ms = String(d.getMilliseconds()).padStart(3, '0');
    return hh + ':' + mm + ':' + ss + '.' + ms;
  }

  function elapsed() {
    return ((Date.now() - START_TS) / 1000).toFixed(1) + 's';
  }

  // ─── 패널 DOM 참조 ──────────────────────────────────────────────────────────
  var refs = {
    visCount:    null,   // visibilitychange 누적 횟수
    visHistList: null,   // visibilitychange 히스토리 컨테이너
    beaconStatus:null,   // Beacon API 지원 여부 배지
    beaconLog:   null,   // Beacon 전송 이벤트 목록
    moCount:     null,   // MutationObserver 누적 횟수
    moHistList:  null,   // MO 히스토리 컨테이너
  };

  // ─── 패널 생성 ──────────────────────────────────────────────────────────────
  function createPanel() {
    var host = document.createElement('div');
    host.id = PANEL_ID;

    var hs = host.style;
    hs.position   = 'fixed';
    hs.bottom     = '10px';
    hs.right      = '10px';
    hs.zIndex     = '2147483647';
    hs.width      = '280px';
    hs.fontFamily = '-apple-system,BlinkMacSystemFont,sans-serif';
    document.body.appendChild(host);

    var shadow = host.attachShadow({ mode: 'closed' });

    var styleEl = document.createElement('style');
    styleEl.textContent = [
      ':host { all: initial; display: block; }',
      '.wrap { background: rgba(10,10,10,0.93); color: #e2e8f0;',
      '        border-radius: 10px; padding: 12px; font-size: 12px;',
      '        box-shadow: 0 4px 20px rgba(0,0,0,0.5); }',
      '.title { font-size: 13px; font-weight: 700; color: #38bdf8;',
      '         margin-bottom: 10px; letter-spacing: -0.3px; }',
      '.section { margin-bottom: 10px; border-top: 1px solid rgba(255,255,255,0.07);',
      '           padding-top: 8px; }',
      '.section:first-of-type { border-top: none; padding-top: 0; }',
      '.sec-title { font-size: 11px; font-weight: 700; color: #f0abfc;',
      '             text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }',
      '.label { font-size: 10px; color: #64748b; margin-bottom: 2px; }',
      '.count { font-size: 16px; font-weight: 700; color: #4ade80; }',
      '.badge { display: inline-block; padding: 2px 7px; border-radius: 999px;',
      '         font-size: 11px; font-weight: 700; }',
      '.ok   { background: #166534; color: #4ade80; }',
      '.warn { background: #7c2d12; color: #fb923c; }',
      '.no   { background: #3f3f46; color: #a1a1aa; }',
      '.hist { max-height: 72px; overflow-y: auto; margin-top: 4px; }',
      '.hist-row { display: flex; justify-content: space-between; align-items: center;',
      '            padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }',
      '.ht { color: #64748b; font-size: 10px; flex-shrink: 0; margin-right: 6px; }',
      '.hv { color: #a78bfa; font-size: 11px; font-weight: 600;',
      '      overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }',
      '.hv.visible  { color: #4ade80; }',
      '.hv.hidden   { color: #f87171; }',
      '.hv.beacon-ok  { color: #38bdf8; }',
      '.hv.beacon-err { color: #fb923c; }',
      '.hv.mo-change  { color: #fbbf24; }',
      '.close-btn { display: block; width: 100%; margin-top: 8px; padding: 5px;',
      '             background: rgba(255,255,255,0.08); border: none; border-radius: 6px;',
      '             color: #94a3b8; font-size: 11px; cursor: pointer; }',
      '.close-btn:hover { background: rgba(255,255,255,0.14); }',
    ].join(' ');
    shadow.appendChild(styleEl);

    var wrap = document.createElement('div');
    wrap.className = 'wrap';
    shadow.appendChild(wrap);

    // 패널 제목
    var titleEl = document.createElement('div');
    titleEl.className = 'title';
    titleEl.textContent = 'Event Test: D/E/H';
    wrap.appendChild(titleEl);

    // ── 섹션 D: visibilitychange ────────────────────────────────
    var secD = document.createElement('div');
    secD.className = 'section';

    var secDTitle = document.createElement('div');
    secDTitle.className = 'sec-title';
    secDTitle.textContent = 'D. visibilitychange';
    secD.appendChild(secDTitle);

    var dCountWrap = document.createElement('div');
    dCountWrap.className = 'label';
    dCountWrap.textContent = 'Fired count';
    secD.appendChild(dCountWrap);

    var dCount = document.createElement('div');
    dCount.className = 'count';
    dCount.textContent = '0';
    refs.visCount = dCount;
    secD.appendChild(dCount);

    var dHistLabel = document.createElement('div');
    dHistLabel.className = 'label';
    dHistLabel.textContent = 'History (newest first)';
    secD.appendChild(dHistLabel);

    var dHist = document.createElement('div');
    dHist.className = 'hist';
    refs.visHistList = dHist;
    secD.appendChild(dHist);

    wrap.appendChild(secD);

    // ── 섹션 E: Beacon API ──────────────────────────────────────
    var secE = document.createElement('div');
    secE.className = 'section';

    var secETitle = document.createElement('div');
    secETitle.className = 'sec-title';
    secETitle.textContent = 'E. Beacon API';
    secE.appendChild(secETitle);

    var eSupportLabel = document.createElement('div');
    eSupportLabel.className = 'label';
    eSupportLabel.textContent = 'sendBeacon support';
    secE.appendChild(eSupportLabel);

    var eStatus = document.createElement('div');
    refs.beaconStatus = eStatus;
    secE.appendChild(eStatus);

    var eLogLabel = document.createElement('div');
    eLogLabel.className = 'label';
    eLogLabel.style.marginTop = '4px';
    eLogLabel.textContent = 'Send log';
    secE.appendChild(eLogLabel);

    var eLog = document.createElement('div');
    eLog.className = 'hist';
    refs.beaconLog = eLog;
    secE.appendChild(eLog);

    wrap.appendChild(secE);

    // ── 섹션 H: MutationObserver ────────────────────────────────
    var secH = document.createElement('div');
    secH.className = 'section';

    var secHTitle = document.createElement('div');
    secHTitle.className = 'sec-title';
    secHTitle.textContent = 'H. MutationObserver';
    secH.appendChild(secHTitle);

    var hCountWrap = document.createElement('div');
    hCountWrap.className = 'label';
    hCountWrap.textContent = 'Changes detected';
    secH.appendChild(hCountWrap);

    var hCount = document.createElement('div');
    hCount.className = 'count';
    hCount.textContent = '0';
    refs.moCount = hCount;
    secH.appendChild(hCount);

    var hHistLabel = document.createElement('div');
    hHistLabel.className = 'label';
    hHistLabel.textContent = 'History (newest first)';
    secH.appendChild(hHistLabel);

    var hHist = document.createElement('div');
    hHist.className = 'hist';
    refs.moHistList = hHist;
    secH.appendChild(hHist);

    wrap.appendChild(secH);

    // 닫기 버튼
    var closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.textContent = 'Close Panel';
    closeBtn.addEventListener('click', function() { host.remove(); });
    wrap.appendChild(closeBtn);

    log('Panel created (bottom-right, closed Shadow DOM)');
  }

  // ─── 히스토리 행 추가 헬퍼 ──────────────────────────────────────────────────
  function addRow(container, valueText, valueClass) {
    var row = document.createElement('div');
    row.className = 'hist-row';

    var ht = document.createElement('span');
    ht.className = 'ht';
    ht.textContent = tsLabel();

    var hv = document.createElement('span');
    hv.className = 'hv' + (valueClass ? ' ' + valueClass : '');
    hv.textContent = valueText;

    row.appendChild(ht);
    row.appendChild(hv);
    container.insertBefore(row, container.firstChild);
  }

  // ─── 검증 D: visibilitychange ────────────────────────────────────────────────
  var visCount = 0;

  function initVisibilityChange() {
    if (typeof document.hidden === 'undefined') {
      log('visibilitychange: NOT SUPPORTED (document.hidden undefined)');
      if (refs.visCount) {
        refs.visCount.textContent = 'N/A';
        refs.visCount.style.color = '#94a3b8';
      }
      return;
    }

    document.addEventListener('visibilitychange', function() {
      visCount++;
      var state = document.visibilityState;   // 'visible' | 'hidden'
      var label = state.toUpperCase();

      log('visibilitychange #' + visCount + ': ' + state + ' at ' + tsLabel());

      if (refs.visCount) refs.visCount.textContent = String(visCount);
      if (refs.visHistList) addRow(refs.visHistList, label, state);
    });

    log('visibilitychange listener registered (current state: ' + document.visibilityState + ')');
  }

  // ─── 검증 E: Beacon API ──────────────────────────────────────────────────────
  var beaconCount = 0;

  function sendBeaconNow(trigger) {
    beaconCount++;
    var payload = JSON.stringify({
      test: true,
      trigger: trigger,
      seq: beaconCount,
      timestamp: Date.now(),
      url: location.href,
    });

    var supported = typeof navigator.sendBeacon === 'function';
    var result;

    if (supported) {
      try {
        result = navigator.sendBeacon(BEACON_URL, payload);
        log('sendBeacon(' + trigger + ') called — return: ' + result + ' (true=queued, 404 is OK)');
        if (refs.beaconLog) {
          addRow(refs.beaconLog,
            trigger + ' → ' + (result ? 'queued' : 'rejected'),
            result ? 'beacon-ok' : 'beacon-err');
        }
      } catch (e) {
        log('sendBeacon(' + trigger + ') ERROR: ' + e.message);
        if (refs.beaconLog) addRow(refs.beaconLog, trigger + ' → ERROR: ' + e.message, 'beacon-err');
      }
    } else {
      log('sendBeacon: NOT SUPPORTED');
      if (refs.beaconLog) addRow(refs.beaconLog, trigger + ' → sendBeacon not supported', 'beacon-err');
    }
  }

  function initBeaconAPI() {
    var supported = typeof navigator.sendBeacon === 'function';

    // 지원 여부 배지
    if (refs.beaconStatus) {
      var badge = document.createElement('span');
      badge.className = 'badge ' + (supported ? 'ok' : 'no');
      badge.textContent = supported ? 'Supported' : 'Not Supported';
      refs.beaconStatus.textContent = '';
      refs.beaconStatus.appendChild(badge);
    }

    log('sendBeacon support: ' + (supported ? 'YES' : 'NO'));

    // pagehide — 모바일/Safari 표준 이탈 이벤트
    window.addEventListener('pagehide', function(e) {
      log('pagehide fired (persisted=' + e.persisted + ')');
      sendBeaconNow('pagehide');
    });

    // beforeunload — 데스크톱 브라우저 이탈 이벤트
    window.addEventListener('beforeunload', function() {
      log('beforeunload fired');
      sendBeaconNow('beforeunload');
    });

    // 즉시 테스트 전송 (페이지 로드 시점 — 기능 동작 자체를 즉시 확인)
    if (supported) {
      setTimeout(function() {
        sendBeaconNow('onload-test');
      }, 800);
    }

    log('Beacon listeners registered: pagehide + beforeunload');
  }

  // ─── 검증 H: MutationObserver ────────────────────────────────────────────────
  var moCount       = 0;
  var moDebounceTimer = null;
  var moPendingBatch  = [];

  function flushMOBatch() {
    if (moPendingBatch.length === 0) return;

    var batch = moPendingBatch.slice();
    moPendingBatch = [];

    // 배치에서 의미 있는 변경만 추출 (본 패널 자신 제외)
    var meaningful = batch.filter(function(m) {
      // 패널 호스트 내부 변경은 무시
      if (m.target && m.target.id === PANEL_ID) return false;
      if (m.target && m.target.closest && m.target.closest('#' + PANEL_ID)) return false;

      // 텍스트만 변경되는 characterData는 제외 (노이즈)
      if (m.type === 'characterData') return false;

      // 실제 엘리먼트 추가/제거가 있는 경우만
      if (m.type === 'childList') {
        var hasElement = false;
        m.addedNodes.forEach(function(n) { if (n.nodeType === 1) hasElement = true; });
        m.removedNodes.forEach(function(n) { if (n.nodeType === 1) hasElement = true; });
        return hasElement;
      }
      return true;
    });

    if (meaningful.length === 0) return;

    moCount += meaningful.length;
    if (refs.moCount) refs.moCount.textContent = String(moCount);

    // 최대 대표 3건만 히스토리에 기록
    var toLog = meaningful.slice(0, 3);
    toLog.forEach(function(m) {
      var target = m.target;
      var targetDesc = target.tagName
        ? (target.tagName.toLowerCase()
            + (target.id ? '#' + target.id : '')
            + (target.className && typeof target.className === 'string'
               ? '.' + target.className.trim().split(/\\s+/)[0] : ''))
        : 'text';

      var added   = 0;
      var removed = 0;
      if (m.type === 'childList') {
        m.addedNodes.forEach(function(n) { if (n.nodeType === 1) added++; });
        m.removedNodes.forEach(function(n) { if (n.nodeType === 1) removed++; });
      }

      var desc = targetDesc + ' +' + added + '/-' + removed;
      log('MO change: ' + desc + ' at ' + tsLabel());

      if (refs.moHistList) addRow(refs.moHistList, desc, 'mo-change');
    });

    if (meaningful.length > 3) {
      log('MO batch: ' + meaningful.length + ' changes (showing 3)');
    }
  }

  function initMutationObserver() {
    if (typeof MutationObserver === 'undefined') {
      log('MutationObserver: NOT SUPPORTED');
      if (refs.moCount) {
        refs.moCount.textContent = 'N/A';
        refs.moCount.style.color = '#94a3b8';
      }
      return;
    }

    var target = document.documentElement || document.body;

    var observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) { moPendingBatch.push(m); });

      // 디바운스: 100ms 이내 변경은 배치로 합산
      clearTimeout(moDebounceTimer);
      moDebounceTimer = setTimeout(flushMOBatch, MO_DEBOUNCE);
    });

    observer.observe(target, {
      childList: true,
      subtree:   true,
    });

    log('MutationObserver registered on ' + target.tagName + ' (childList, subtree)');
  }

  // ─── 초기화 ──────────────────────────────────────────────────────────────────
  function init() {
    log('=== Event Test v1.0 — visibilitychange(D) / Beacon(E) / MutationObserver(H) ===');

    createPanel();
    initVisibilityChange();
    initBeaconAPI();
    initMutationObserver();

    log('Init complete at ' + elapsed());
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();`;
