// AUTO-GENERATED — DO NOT EDIT MANUALLY
// 소스: docs/카페24-ScriptTag사용가이드.md
// 재생성: node scripts/build-ai-context.mjs

export const USAGE_GUIDE = `# 카페24 ScriptTag 사용 가이드

> **작성일**: 2026-04-02 KST
> **기반**: suparain999.cafe24.com 실테스트 완료 (2026-04-01)
> **목적**: 카페24 앱에서 ScriptTag를 활용하여 쇼핑몰 프론트엔드에 JS를 삽입하는 방법의 종합 레퍼런스

---

## 목차

1. [ScriptTag 개요](#1-scripttag-개요)
2. [ScriptTag API](#2-scripttag-api)
3. [기술 검증 결과 (2026-04-01 실테스트)](#3-기술-검증-결과-2026-04-01-실테스트)
   - 3.1 DOM 조작
   - 3.2 localStorage
   - 3.3 Shadow DOM (closed mode)
   - 3.4 IntersectionObserver
   - 3.5 visibilitychange
   - 3.6 Beacon API
   - 3.7 MutationObserver
   - 3.8 Front JavaScript SDK
4. [실전 활용 패턴](#4-실전-활용-패턴)
5. [카페24 DOM 맵 (상품 상세 페이지)](#5-카페24-dom-맵-상품-상세-페이지)
6. [활용 아이디어](#6-활용-아이디어)
7. [트러블슈팅](#7-트러블슈팅)

---

## 1. ScriptTag 개요

### ScriptTag란?

카페24 앱에서 제공하는 메커니즘으로, 앱이 설치된 쇼핑몰의 **모든 페이지 HTML에 \`<script src="...">\` 태그를 자동 삽입**한다. 외부 JS 파일을 쇼핑몰 스킨에 직접 건드리지 않고도 주입할 수 있다.

\`\`\`html
<!-- 카페24가 모든 페이지에 자동 삽입하는 형태 -->
<script src="https://your-worker.workers.dev/widget/buttons.js?shop=CLIENT_ID"></script>
\`\`\`

### SSO와의 관계

ScriptTag는 SSO(Single Sign-On)와 **완전히 독립적**이다.

| 항목 | ScriptTag | SSO |
|------|-----------|-----|
| 필요 scope | \`mall.write_application\` | \`mall.read_application\` + 기타 |
| 작동 방식 | 쇼핑몰 페이지에 JS 삽입 | 카페24 회원 시스템 연동 |
| 앱 설치 여부 | 설치 시 자동 등록 가능 | 별도 OAuth flow 필요 |
| 주 용도 | 프론트엔드 위젯, 배너, 분석 | 소셜 로그인 연동 |

### 필요 Scope

ScriptTag를 등록하려면 앱 설치 시 부여되는 \`mall.write_application\` scope만 필요하다.

\`\`\`
mall.write_application  — ScriptTag 등록/수정/삭제
mall.read_application   — 앱 설정 조회, Front SDK에서 회원 감지(getCustomerIDInfo, getLoginProvider)
\`\`\`

앱 설치 시 이 scope들은 자동으로 부여된다. 별도 신청이 필요하지 않다.

### ScriptTag vs 직접 스킨 편집 비교

| 항목 | ScriptTag | 직접 스킨 편집 |
|------|-----------|--------------|
| 앱 설치/삭제 연동 | 자동 | 수동 |
| 스킨 테마 교체 시 | 유지됨 | 사라짐 |
| 쇼핑몰 운영자 개입 | 불필요 | 필요 |
| 적용 범위 | 전체 페이지 일괄 | 편집한 스킨만 |
| 운영 리스크 | 낮음 | 높음 (스킨 오류 가능) |
| 앱스토어 심사 | 필수 방식 | 권장하지 않음 |

---

## 2. ScriptTag API

### 2.1 등록 (createScriptTag)

\`\`\`
POST https://{mall_id}.cafe24api.com/api/v2/admin/scripttags
Authorization: Bearer {access_token}
Content-Type: application/json
X-Cafe24-Api-Version: 2024-06-01
\`\`\`

**요청 Body**:

\`\`\`json
{
  "request": {
    "src": "https://your-app.workers.dev/widget/buttons.js?shop=CLIENT_ID",
    "display_location": ["all"]
  }
}
\`\`\`

**응답**:

\`\`\`json
{
  "scripttag": {
    "script_no": 42,
    "client_id": "D786ohzUHVsjrjGOTdbx0A",
    "src": "https://your-app.workers.dev/widget/buttons.js?shop=CLIENT_ID",
    "display": ["all"],
    "exclude_path": []
  }
}
\`\`\`

**TypeScript (cafe24-client) 예시**:

\`\`\`typescript
// 전체 페이지에 삽입
const tag = await client.createScriptTag(mallId, accessToken, widgetSrc);

// 특정 페이지에만 삽입
const tag = await client.createScriptTag(mallId, accessToken, widgetSrc, [
  "/product/",
  "/order/basket"
]);
\`\`\`

### 2.2 조회 (listScriptTags)

\`\`\`
GET https://{mall_id}.cafe24api.com/api/v2/admin/scripttags
Authorization: Bearer {access_token}
\`\`\`

**TypeScript 예시**:

\`\`\`typescript
const tags = await client.listScriptTags(mallId, accessToken);
// tags: ScriptTag[] — 현재 등록된 모든 ScriptTag 목록
\`\`\`

### 2.3 삭제 (deleteScriptTag)

\`\`\`
DELETE https://{mall_id}.cafe24api.com/api/v2/admin/scripttags/{script_no}
Authorization: Bearer {access_token}
\`\`\`

**TypeScript 예시**:

\`\`\`typescript
await client.deleteScriptTag(mallId, accessToken, scriptNo);
\`\`\`

### 2.4 display_location 옵션

| 값 | 설명 |
|----|------|
| \`["all"]\` | 모든 페이지 (PC + 모바일 스킨 모두) |
| \`["/product/"]\` | 상품 상세 페이지만 |
| \`["/order/basket"]\` | 장바구니 페이지만 |
| \`["/member/login"]\` | 로그인 페이지만 |

> 주의: 모바일/PC 스킨을 \`display_location\`으로 구분할 수 없다. JS 런타임에서 \`navigator.userAgent\`로 분기해야 한다.

### 2.5 앱 설치 시 자동 등록 패턴

OAuth 콜백에서 ScriptTag를 자동으로 등록하는 패턴:

\`\`\`typescript
// OAuth callback (GET /api/cafe24/callback)
async function handleInstall(mallId: string, accessToken: string) {
  const widgetSrc = \`\${BASE_URL}/widget/buttons.js?shop=\${clientId}\`;

  // 기존 태그 확인 및 삭제 (재설치 시 중복 방지)
  const existingTags = await client.listScriptTags(mallId, accessToken);
  const existing = existingTags.find(tag => tag.src.includes('/widget/buttons.js'));
  if (existing) {
    await client.deleteScriptTag(mallId, accessToken, existing.script_no);
  }

  // 새로 등록
  await client.createScriptTag(mallId, accessToken, widgetSrc);
}
\`\`\`

### 2.6 캐시 주의사항

- ScriptTag 삭제 후에도 **카페24 서버 캐시** 때문에 1~5분간 계속 로딩될 수 있다.
- 개발 중 ScriptTag JS 서버에는 반드시 \`Cache-Control: no-cache, no-store\` 헤더를 설정한다.

\`\`\`typescript
// Cloudflare Worker에서 JS를 서빙할 때
return c.body(JS_CONTENT, 200, {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
});
\`\`\`

---

## 3. 기술 검증 결과 (2026-04-01 실테스트)

> **검증 환경**: suparain999.cafe24.com (실제 쇼핑몰)
> **검증 방식**: ScriptTag로 주입된 JS가 기존 DOM 요소를 조작하는 방식
> **결과**: 아래 7개 영역 전부 성공

---

### 3.1 DOM 조작 (11개 검증 완료)

**검증된 조작 목록**:

| # | 대상 | 조작 내용 | PC | 모바일 |
|---|------|----------|:--:|:-----:|
| 1 | BUY IT NOW 버튼 | 텍스트 변경 (→ 바로구매) | V | - |
| 2 | BUY IT NOW 버튼 | 배경색 변경 (빨강/파랑) | V | - |
| 3 | BUY IT NOW 버튼 | CSS transition 점멸 (0.8초) | V | - |
| 4 | BUY IT NOW 버튼 | 오버레이 뱃지 (우하단, 점멸) | V | V |
| 5 | .action_button 위 | 전체 폭 미니배너 삽입 | V | - |
| 6 | #orderFixArea | 모바일 플로팅 버튼 뱃지 | - | V |
| 7 | .headingArea h1 | "오늘 N개 판매" 카운트업 뱃지 | - | V |
| 8 | 판매가 | 가격 카운트다운 효과 | - | V |
| 9 | 배송비 | 무료배송쿠폰 뱃지 | - | V |
| 10 | 옵션 select 아래 | 재고 카운트다운 | - | V |
| 11 | CSS @keyframes | 동적 생성 (pulse, countup) | V | V |

**핵심 발견사항**:

1. **flex 컨테이너 주의**: \`.action_button\`이 \`flex\`여서 내부 삽입 시 요소가 옆으로 붙는다. 부모 레벨에 \`insertBefore\`하거나 버튼 내부에 \`position: absolute\`로 해결한다.
2. **모바일 플로팅 버튼 별도 처리**: \`#orderFixArea\`는 PC 본문 버튼과 별개다. 모바일에서는 이 플로팅 버튼이 항상 표시되므로 별도 타겟이 필요하다.
3. **CSS !important + setProperty**: 카페24 스킨 스타일이 강하게 지정되어 있어, \`element.style.setProperty('color', value, 'important')\` 방식이 필요하다.

**코드 예시 — 텍스트 변경**:

\`\`\`javascript
// BUY IT NOW → 바로구매 텍스트 변경
var buySpan = document.getElementById('actionBuy');
if (buySpan) {
  buySpan.textContent = '바로구매';  // innerHTML 사용 금지
}
\`\`\`

**코드 예시 — 배경색 변경 (CSS !important 강제 적용)**:

\`\`\`javascript
var buySpan = document.getElementById('actionBuy');
var buyBtn = buySpan ? buySpan.closest('a') : null;
if (buyBtn) {
  buyBtn.style.setProperty('background-color', '#ef4444', 'important');
  buyBtn.style.setProperty('color', '#ffffff', 'important');
  buyBtn.style.setProperty('transition', 'background-color 0.3s ease', 'important');
}
\`\`\`

**코드 예시 — 점멸 효과**:

\`\`\`javascript
var blinkTimer = null;
var colors = ['#ef4444', '#2563eb'];  // 빨강, 파랑
var idx = 0;

buyBtn.style.setProperty('transition', 'background-color 0.5s ease', 'important');

blinkTimer = setInterval(function() {
  buyBtn.style.setProperty('background-color', colors[idx % 2], 'important');
  buyBtn.style.setProperty('color', '#ffffff', 'important');
  idx++;
}, 800);

// 중지 시
clearInterval(blinkTimer);
\`\`\`

**코드 예시 — 구매 버튼 위 미니배너 삽입**:

\`\`\`javascript
var actionDiv = document.querySelector('.action_button');
if (actionDiv) {
  var banner = document.createElement('div');

  // 인라인 스타일로만 구성 (호스트 스타일과 충돌 방지)
  banner.style.width = '100%';
  banner.style.padding = '12px 16px';
  banner.style.marginBottom = '10px';
  banner.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  banner.style.color = '#ffffff';
  banner.style.borderRadius = '8px';
  banner.style.display = 'flex';
  banner.style.alignItems = 'center';
  banner.style.justifyContent = 'center';
  banner.style.cursor = 'pointer';

  // 텍스트는 반드시 textContent 사용 (innerHTML 금지)
  var text = document.createElement('span');
  text.textContent = '회원가입하면 3,000원 즉시 할인!';
  banner.appendChild(text);

  // flex 컨테이너 바깥(위)에 삽입 — flex 레이아웃 영향을 받지 않는다
  actionDiv.parentNode.insertBefore(banner, actionDiv);
}
\`\`\`

**코드 예시 — 오버레이 뱃지 (버튼 위에 겹침)**:

\`\`\`javascript
var buyBtn = document.getElementById('actionBuy')?.closest('a');
if (buyBtn) {
  // 버튼을 position:relative로 설정 (뱃지 기준점)
  if (window.getComputedStyle(buyBtn).position === 'static') {
    buyBtn.style.position = 'relative';
  }
  buyBtn.style.overflow = 'visible';

  var badge = document.createElement('div');
  badge.style.position = 'absolute';
  badge.style.right = '-4px';
  badge.style.bottom = '-4px';
  badge.style.padding = '3px 8px';
  badge.style.borderRadius = '10px';
  badge.style.background = '#ef4444';
  badge.style.color = '#ffffff';
  badge.style.fontSize = '10px';
  badge.style.fontWeight = '700';
  badge.style.pointerEvents = 'none';  // 클릭 이벤트 버튼에 전달
  badge.style.transition = 'opacity 0.4s ease';
  badge.textContent = '3,000원 할인';

  buyBtn.appendChild(badge);

  // 점멸 효과
  var visible = true;
  setInterval(function() {
    visible = !visible;
    badge.style.opacity = visible ? '1' : '0';
  }, 700);
}
\`\`\`

**코드 예시 — 원본 상태 저장/복원 패턴**:

\`\`\`javascript
// 원본 상태 저장 (첫 번째 조작 전에 한 번만)
var original = {};
function saveOriginal(el) {
  if (original.saved) return;
  var cs = window.getComputedStyle(el);
  original.text = el.textContent;
  original.bg = cs.backgroundColor;
  original.color = cs.color;
  original.saved = true;
}

// 원복
function restore(el) {
  el.textContent = original.text;
  el.style.removeProperty('background-color');
  el.style.removeProperty('color');
  el.style.removeProperty('transition');
  if (original.bg) el.style.backgroundColor = original.bg;
  if (original.color) el.style.color = original.color;
}
\`\`\`

---

### 3.2 localStorage (용량 검증 완료)

**검증 결과**:

| 키 | 내용 | 용량 |
|----|------|------|
| \`bg_product_history\` | 50개 상품 레코드 | 75.90 KB |
| \`bg_session\` | 세션 정보 | 954 B |
| \`bg_visitor_profile\` | 방문자 프로필 | 770 B |
| **합계** | | **77.59 KB** |
| 5MB 한도 대비 | | **1.52%** |

**결론**: 50개 상품 이력 + 세션 + 프로필을 모두 저장해도 localStorage 한도의 1.5%만 사용한다. 용량 걱정 없이 활용 가능하다.

**상품 이력 데이터 구조 예시**:

\`\`\`javascript
// localStorage 키 네이밍 컨벤션 (앱 prefix 사용 권장)
var KEYS = {
  history:  'myapp_product_history',  // 상품 열람 이력
  session:  'myapp_session',          // 현재 세션
  profile:  'myapp_visitor_profile',  // 방문자 프로필
  visitCount: 'myapp_visit_count'     // 방문 횟수 카운터
};

// 상품 레코드 구조
var productRecord = {
  id: 'prod_0001',
  name: '슬림핏 데님 자켓',
  price: 69000,
  category: '아우터',
  visit_count: 3,
  time_spent: 45000,          // ms
  scroll_depth: 72.5,         // %
  add_to_cart_count: 1,
  last_visited_at: Date.now()
};

// 이력 저장
function saveProductHistory(record) {
  try {
    var raw = localStorage.getItem(KEYS.history);
    var list = raw ? JSON.parse(raw) : [];

    // 중복 제거 후 앞에 추가
    list = list.filter(function(r) { return r.id !== record.id; });
    list.unshift(record);

    // 최대 50개 유지
    if (list.length > 50) list = list.slice(0, 50);

    localStorage.setItem(KEYS.history, JSON.stringify(list));
  } catch(e) {
    // 저장 실패 (Private 모드, 용량 초과 등) — 무시하고 진행
    console.warn('[Widget] localStorage write failed:', e.message);
  }
}
\`\`\`

> **주의**: iOS Safari Private 모드에서는 localStorage가 읽기 전용이다. 쓰기 실패를 반드시 try/catch로 감싸야 한다.

---

### 3.3 Shadow DOM (closed mode 검증 완료)

**검증 결과**:

- \`mode: 'closed'\` Shadow DOM 생성 성공
- 호스트 CSS 완전 격리 — \`.banner { background: red !important }\` 를 \`document.head\`에 주입해도 Shadow 내부에 영향 없음
- Shadow 내부 스타일이 호스트 페이지에 영향 없음
- 이벤트 핸들러 정상 동작 (클릭, 입력 등)
- 패널 렌더링 시 페이지 레이아웃 파괴 없음

**코드 예시 — Shadow DOM으로 위젯 삽입**:

\`\`\`javascript
// 1. host 요소 생성 (일반 DOM에 배치)
var host = document.createElement('div');
host.id = 'my-widget-host';
host.style.position = 'fixed';
host.style.top = '10px';
host.style.right = '10px';
host.style.zIndex = '2147483647';
document.body.appendChild(host);

// 2. closed Shadow DOM 생성 — 외부에서 querySelector로 접근 불가
var shadow = host.attachShadow({ mode: 'closed' });

// 3. Shadow 내부 스타일 (호스트 CSS와 완전 격리)
var styleEl = document.createElement('style');
styleEl.textContent = [
  ':host { all: initial; display: block; }',  // 호스트 스타일 초기화
  '.widget { background: #fff; padding: 16px; border-radius: 8px; }',
  '.btn { background: #ef4444; color: #fff; border: none; padding: 8px 16px; cursor: pointer; }'
].join('');
shadow.appendChild(styleEl);

// 4. 위젯 콘텐츠 생성 (innerHTML 절대 금지 — createElement + textContent 사용)
var widget = document.createElement('div');
widget.className = 'widget';

var title = document.createElement('p');
title.textContent = '회원가입하면 3,000원 할인!';

var btn = document.createElement('button');
btn.className = 'btn';
btn.textContent = '지금 가입하기';
btn.addEventListener('click', function() {
  // 클릭 처리
});

widget.appendChild(title);
widget.appendChild(btn);
shadow.appendChild(widget);

// 격리 검증: host.querySelector('.widget') === null (정상)
\`\`\`

---

### 3.4 IntersectionObserver (4구간 감지 검증 완료)

**검증 결과**: 상품 상세 페이지 4구간 전부 감지 성공

| 구간 | 선택자 | 설명 |
|------|--------|------|
| TOP | \`.headingArea\` | 상품 이미지/헤딩 |
| INFO | \`#span_product_price_text\` | 가격/옵션 영역 |
| DETAIL | \`.xans-product-detail\` | 상품 상세 설명 |
| REVIEW | fallback sentinel (75vh) | 리뷰 (선택자 없을 때 자동 생성) |

**설정**: \`rootMargin: '0px 0px -20% 0px'\`, \`threshold: 0.5\`

**코드 예시**:

\`\`\`javascript
var ZONES = [
  {
    id: 'top',
    selectors: ['.headingArea', '.thumbnail_area', '.imgArea'],
    threshold: 0.3
  },
  {
    id: 'info',
    selectors: ['#span_product_price_text', '.product_price', '.xans-product-price'],
    threshold: 0.5
  },
  {
    id: 'detail',
    selectors: ['.cont', '.xans-product-detail', '#prdDetail'],
    threshold: 0.2
  },
  {
    id: 'review',
    selectors: ['.xans-product-review', '#product_review', '.review_wrap'],
    threshold: 0.2
  }
];

function findTarget(zone) {
  for (var i = 0; i < zone.selectors.length; i++) {
    var el = document.querySelector(zone.selectors[i]);
    if (el) return el;
  }
  // fallback: 페이지 높이 비율 기준 sentinel 생성
  return createSentinel(zone.id);
}

function createSentinel(zoneId) {
  var ratioMap = { top: 0.1, info: 0.3, detail: 0.55, review: 0.75 };
  var sentinel = document.createElement('div');
  sentinel.style.position = 'absolute';
  sentinel.style.top = (ratioMap[zoneId] * 100) + 'vh';
  sentinel.style.left = '0';
  sentinel.style.width = '1px';
  sentinel.style.height = '1px';
  sentinel.style.opacity = '0';
  sentinel.style.pointerEvents = 'none';
  document.body.appendChild(sentinel);
  return sentinel;
}

var currentZone = null;

ZONES.forEach(function(zone) {
  var target = findTarget(zone);
  if (!target) return;

  var observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting && currentZone !== zone.id) {
        currentZone = zone.id;
        console.log('Zone:', zone.id);

        // 구간별 동작 처리
        onZoneEnter(zone.id);
      }
    });
  }, {
    threshold: zone.threshold,
    rootMargin: '0px 0px -20% 0px'
  });

  observer.observe(target);
});

function onZoneEnter(zoneId) {
  if (zoneId === 'info') {
    // 가격 영역 진입 시 → 할인 배너 표시
  } else if (zoneId === 'review') {
    // 리뷰 영역 진입 시 → 이탈 의도 감지
  }
}
\`\`\`

---

### 3.5 visibilitychange (탭/앱 전환 감지)

**검증 결과**: 탭 전환 시 \`visible\`/\`hidden\` 정확히 감지. 인앱 브라우저(카카오/네이버)는 추가 테스트 필요.

**코드 예시**:

\`\`\`javascript
if (typeof document.hidden !== 'undefined') {
  document.addEventListener('visibilitychange', function() {
    var state = document.visibilityState;  // 'visible' | 'hidden'

    if (state === 'hidden') {
      // 탭 숨김/앱 전환 — 현재 데이터 저장
      saveCurrentState();
    } else if (state === 'visible') {
      // 탭 복귀 — 재활성화 처리
      onPageRevisit();
    }
  });
}
\`\`\`

---

### 3.6 Beacon API (이탈 시 데이터 전송)

**검증 결과**: \`navigator.sendBeacon()\` 반환값 \`true\` (큐잉 성공). \`pagehide\` + \`beforeunload\` 리스너 등록 정상.

**코드 예시**:

\`\`\`javascript
var beaconSupported = typeof navigator.sendBeacon === 'function';

// pagehide — 모바일/Safari 표준 이탈 이벤트 (권장)
window.addEventListener('pagehide', function(e) {
  sendAnalytics('pagehide');
});

// beforeunload — 데스크톱 브라우저 이탈 이벤트
window.addEventListener('beforeunload', function() {
  sendAnalytics('beforeunload');
});

function sendAnalytics(trigger) {
  var payload = JSON.stringify({
    trigger: trigger,
    url: location.href,
    timestamp: Date.now(),
    time_spent: Date.now() - pageStartTime,
    scroll_depth: getScrollDepth()
  });

  if (beaconSupported) {
    // sendBeacon은 페이지 언로드 중에도 전송 보장
    navigator.sendBeacon('https://your-api.workers.dev/api/analytics/beacon', payload);
  } else {
    // fallback: fetch (beforeunload에서는 keepalive 필수)
    fetch('https://your-api.workers.dev/api/analytics/beacon', {
      method: 'POST',
      body: payload,
      keepalive: true  // 페이지 이탈 중에도 완료 보장
    }).catch(function() {});
  }
}
\`\`\`

---

### 3.7 MutationObserver (DOM 변경 감지)

**검증 결과**: \`document.documentElement\`에 \`childList + subtree\` 등록 정상. 100ms 디바운스로 의미 있는 변경만 캡처.

**코드 예시 — 디바운스 패턴**:

\`\`\`javascript
var moDebounceTimer = null;
var moPendingBatch = [];

var observer = new MutationObserver(function(mutations) {
  mutations.forEach(function(m) { moPendingBatch.push(m); });

  // 100ms 이내 연속 변경은 배치로 합산
  clearTimeout(moDebounceTimer);
  moDebounceTimer = setTimeout(flushBatch, 100);
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

function flushBatch() {
  var batch = moPendingBatch.slice();
  moPendingBatch = [];

  // 의미 없는 변경 필터링
  var meaningful = batch.filter(function(m) {
    // 자기 자신의 위젯 내부 변경은 무시
    if (m.target && m.target.closest && m.target.closest('#my-widget-host')) return false;

    // 텍스트만 변경되는 characterData는 무시 (노이즈)
    if (m.type === 'characterData') return false;

    // 실제 엘리먼트 추가/제거가 있는 경우만 처리
    if (m.type === 'childList') {
      var hasElement = false;
      m.addedNodes.forEach(function(n) { if (n.nodeType === 1) hasElement = true; });
      m.removedNodes.forEach(function(n) { if (n.nodeType === 1) hasElement = true; });
      return hasElement;
    }
    return true;
  });

  if (meaningful.length > 0) {
    // SPA 페이지 전환 감지 → 위젯 재초기화
    onDomChanged(meaningful);
  }
}

function onDomChanged(mutations) {
  // URL이 바뀌었는지 확인하여 SPA 라우팅 처리
  var newUrl = location.href;
  if (newUrl !== lastUrl) {
    lastUrl = newUrl;
    reinitWidget();  // 페이지 전환 시 위젯 재초기화
  }
}
\`\`\`

---

### 3.8 Front JavaScript SDK

**개요**: ScriptTag JS에서 카페24 API를 호출할 때는 직접 \`fetch\`가 CORS로 차단된다. 반드시 카페24가 쇼핑몰 페이지에 전역 객체로 제공하는 \`CAFE24API\` SDK를 사용해야 한다.

#### 초기화

\`\`\`javascript
// ScriptTag에서 client_id는 서버가 런타임에 주입 (하드코딩 금지)
(function(CAFE24API) {
  // SDK 초기화 후 사용 가능
  var mallId = CAFE24API.MALL_ID;   // "suparain999"
  var shopNo  = CAFE24API.SHOP_NO;  // 1
})(CAFE24API.init({
  client_id: 'D786ohzUHVsjrjGOTdbx0A',  // 서버에서 주입
  version: '2022-12-01'
}));
\`\`\`

#### 상품 정보 조회 (콜백 방식만 지원)

\`\`\`javascript
// 현재 상품 no 추출
function extractProductNo() {
  // 패턴 1: /product/상품명/12345/
  var m1 = location.href.match(/\\/product\\/[^/]+\\/(\\d+)\\/?/);
  if (m1) return Number(m1[1]);

  // 패턴 2: ?product_no=12345
  var m2 = location.href.match(/[?&]product_no=(\\d+)/);
  if (m2) return Number(m2[1]);

  // 패턴 3: 카페24 전역 변수
  if (window.iProductNo) return Number(window.iProductNo);

  return null;
}

var productNo = extractProductNo();
if (productNo) {
  // 반드시 콜백 방식 사용 — .then()은 에러 발생
  CAFE24API.get('/api/v2/products/' + productNo, function(err, res) {
    if (err) {
      console.error('Product fetch error:', err);
      return;
    }
    var product = res.product;
    console.log(product.product_name);  // "보이런던 스커트 B63SK03F"
    console.log(product.price);         // "69000.00"
    console.log(product.category);      // [{ category_no: 34 }]
    console.log(product.product_code);  // "P000000P"
  });
}
\`\`\`

#### SDK 전체 메서드 목록

\`\`\`javascript
// 회원
CAFE24API.getCustomerIDInfo(cb)         // 회원/비회원 ID — scope: mall.read_application
CAFE24API.getEncryptedMemberId(cid, cb) // 암호화 회원ID (JWT) — scope: mall.read_customer
CAFE24API.getCustomerInfo(cb)           // 회원 상세 (email, name, phone, group, birthday)
CAFE24API.getLoginProvider(cb)          // 현재 로그인 SNS — 'sso'|'kakao'|'naver'|'google'|null
CAFE24API.getCustomerProvider(cb)       // 연동된 모든 SNS — ['naver', 'kakao']

// 적립금/예치금
CAFE24API.getPointInfo(cb)              // 적립금 (available_point, total_point)
CAFE24API.getCreditInfo(cb)             // 예치금

// 장바구니
CAFE24API.getCartList(cb)               // 장바구니 목록
CAFE24API.getCartInfo(cb)               // 장바구니 총 금액
CAFE24API.getCartCount(cb)              // 장바구니 개수
CAFE24API.getCartItemList(cb)           // 장바구니 품목 상세
CAFE24API.addCartItem(params, cb)       // 장바구니 추가
CAFE24API.clearCart(cb)                 // 장바구니 비우기

// 기타
CAFE24API.getCouponCount(cb)            // 쿠폰 개수
CAFE24API.getWishCount(cb)              // 관심상품 개수
CAFE24API.getShopInfo(cb)               // 쇼핑몰 정보
CAFE24API.getOrderDetail(order_id, cb)  // 주문 상세
\`\`\`

#### SDK 제약사항

| 항목 | 내용 |
|------|------|
| **CORS** | ScriptTag에서 직접 \`fetch\` 불가 → \`401 "not an allowed client_id"\` 발생. 반드시 SDK 사용 |
| **콜백 전용** | Promise/async-await 미지원. \`.then()\` 호출 시 에러 발생 |
| **init 필수** | \`CAFE24API.init({ client_id, version })\` 없이 호출 시 인증 실패 |
| **Admin API 호출 금지** | ScriptTag 내에서 Admin API 직접 호출 시 앱스토어 심사 탈락 |
| **Rate Limit** | Leaky Bucket 방식 |

---

## 4. 실전 활용 패턴

### 4.1 위젯 삽입 패턴 (권장 아키텍처)

\`\`\`
쇼핑몰 페이지
  └─ <script src="https://your-worker.workers.dev/widget/loader.js?shop=CLIENT_ID">
       ├─ Cloudflare Worker에서 JS 서빙
       ├─ BASE_URL 런타임 주입 (hare-코딩 없음)
       ├─ client_id를 ?shop= 파라미터로 전달
       └─ Config API 호출 → 설정 기반 렌더링
\`\`\`

**Cloudflare Worker에서 JS 서빙**:

\`\`\`typescript
// worker: GET /widget/loader.js
app.get('/widget/loader.js', async (c) => {
  const shopClientId = c.req.query('shop') || '';
  const baseUrl = c.env.BASE_URL;  // e.g. "https://your-app.workers.dev"

  // BASE_URL과 client_id를 JS에 런타임 주입
  const js = WIDGET_JS
    .replace('var __MY_BASE_URL__ = \\'\\'', \`var __MY_BASE_URL__ = '\${baseUrl}'\`)
    .replace('var __CLIENT_ID__ = \\'\\'', \`var __CLIENT_ID__ = '\${shopClientId}'\`);

  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  });
});
\`\`\`

**ScriptTag JS에서 자기 자신의 src 파라미터 읽기**:

\`\`\`javascript
// ScriptTag에서 client_id 추출 (서버 주입 없이 self-contained 방식)
function extractClientId() {
  var scripts = document.querySelectorAll('script[src]');
  for (var i = 0; i < scripts.length; i++) {
    var src = scripts[i].getAttribute('src') || '';
    if (src.indexOf('your-app.workers.dev') === -1) continue;
    var m = src.match(/[?&]shop=([^&]+)/);
    if (m) return m[1];
  }
  return null;
}
\`\`\`

### 4.2 페이지 타입 감지

ScriptTag는 모든 페이지에 삽입되므로, 런타임에 현재 페이지를 판별해야 한다.

\`\`\`javascript
var PAGE_TYPE = (function() {
  var path = location.pathname;
  var search = location.search;

  // 상품 상세 — /product/상품명/번호/
  if (/\\/product\\/[^/]+\\/\\d+/.test(path)) return 'product';

  // 장바구니 — /order/basket.html 또는 ?type=basket
  if (path.includes('/order/basket') || search.includes('type=basket')) return 'cart';

  // 주문서 작성 — /order/order.html
  if (path.includes('/order/order')) return 'checkout';

  // 주문 완료 — /order/orderresult.html
  if (path.includes('/order/orderresult')) return 'order_complete';

  // 로그인 — /member/login.html
  if (path.includes('/member/login')) return 'login';

  // 회원가입 — /member/join.html
  if (path.includes('/member/join')) return 'signup';

  // 마이페이지 — /myshop/
  if (path.includes('/myshop/')) return 'mypage';

  // 메인 — /
  if (path === '/' || path === '/index.html') return 'main';

  return 'other';
})();

// 페이지별 동작
if (PAGE_TYPE === 'product') {
  initProductPageWidget();
} else if (PAGE_TYPE === 'cart') {
  initCartPageWidget();
} else if (PAGE_TYPE === 'login' || PAGE_TYPE === 'signup') {
  initLoginWidget();
}
\`\`\`

### 4.3 환경별 ScriptTag 관리

**스테이징/프로덕션 분리**: 스테이징 앱과 프로덕션 앱을 별도로 카페24 개발자 센터에 등록하면 각각 독립적인 ScriptTag를 관리할 수 있다.

| 환경 | 앱 | BASE_URL |
|------|-----|----------|
| 스테이징 | supasignup-staging | \`https://bg-staging.suparain.kr\` |
| 프로덕션 | supasignup | \`https://bg.suparain.kr\` |

**앱 재설치 시 ScriptTag 관리 패턴**:

\`\`\`typescript
// 앱 재설치 시 기존 태그 삭제 후 재생성 (OAuth callback에서)
async function reinstallScriptTag(client, mallId, accessToken, newSrc) {
  // 1. 현재 등록된 태그 목록 조회
  const tags = await client.listScriptTags(mallId, accessToken);

  // 2. 기존 태그 삭제
  for (const tag of tags) {
    if (tag.src.includes('/widget/')) {
      await client.deleteScriptTag(mallId, accessToken, tag.script_no);
    }
  }

  // 3. 새 태그 등록
  const newTag = await client.createScriptTag(mallId, accessToken, newSrc);
  return newTag;
}
\`\`\`

**캐시 관리**: 개발 중 변경사항이 즉시 반영되도록:

\`\`\`typescript
// Cloudflare Worker — JS 서빙 시 캐시 비활성화
return c.body(JS_CONTENT, 200, {
  'Content-Type': 'application/javascript; charset=utf-8',
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
});
\`\`\`

### 4.4 보안 주의사항

| 항목 | 금지 | 올바른 방법 |
|------|------|-----------|
| DOM 조작 | \`element.innerHTML = '<script>...'\` | \`createElement + textContent\` |
| ScriptTag에서 Admin API | \`fetch('/api/v2/admin/...')\` | 백엔드 서버에서 처리 |
| 민감 정보 | localStorage에 이메일/비밀번호 저장 | 서버 세션만 사용 |
| 클래스명 | \`class="ad-banner"\`, \`class="popup"\` | 다른 이름 사용 (광고 차단기 필터링 위험) |
| 전역 변수 | \`window.myVar = 123\` | IIFE로 격리 |

**사용 금지 클래스명** (삼성 인터넷 내장 광고 차단기 필터링):

\`\`\`
ad, ads, advertisement, banner, popup, overlay, modal
→ 대신: widget, promo, notice, card 등 사용
\`\`\`

---

## 5. 카페24 DOM 맵 (상품 상세 페이지)

실테스트에서 확인된 카페24 기본 스킨 선택자. 스킨 테마에 따라 다를 수 있으므로, 항상 fallback 선택자를 여러 개 준비한다.

### 5.1 주요 선택자

\`\`\`
[상품 정보]
.headingArea h1, .headingArea h2       ← 상품명
#span_product_price_text               ← 판매가
#span_product_price_custom             ← 소비자가 (취소선)
.delv_price_B                          ← 배송비
#product_option_id1                    ← 옵션 select
.xans-product-detail, #prdDetail       ← 상세 설명 영역
.xans-product-review, #product_review  ← 리뷰 영역

[구매 버튼 — PC 본문]
.action_button                         ← 버튼 컨테이너 (display:flex)
.action_button > a.btnSubmit           ← BUY IT NOW 링크
.action_button > a.btnSubmit > span#actionBuy  ← BUY IT NOW 텍스트
.action_button > button#actionCart     ← CART 버튼
.action_button > button#actionWish     ← WISH LIST 버튼

[구매 버튼 — 모바일 플로팅]
#orderFixArea                          ← 모바일 하단 고정 컨테이너
#orderFixArea a.btnSubmit              ← BUY IT NOW (플로팅)
#orderFixArea a.btnSubmit > span#actionBuy  ← BUY IT NOW 텍스트 (플로팅)
#orderFixArea button.actionCart        ← CART (플로팅)
\`\`\`

### 5.2 카테고리/옵션

\`\`\`
.xans-product-listmenu                 ← 카테고리 메뉴
#product_option_id1, #product_option_id2  ← 상품 옵션 select (순번)
.option_box                            ← 옵션 컨테이너
\`\`\`

### 5.3 주요 페이지 URL 패턴

\`\`\`
상품 상세:    /product/{name}/{product_no}/
장바구니:     /order/basket.html
주문서 작성:  /order/order.html
주문 완료:    /order/orderresult.html
로그인:       /member/login.html
회원가입:     /member/join.html
마이페이지:   /myshop/
메인:         /
\`\`\`

---

## 6. 활용 아이디어

브레인스토밍에서 도출된 실용적인 활용 방향.

### 6.1 소셜 로그인 위젯

로그인/회원가입 페이지에 Shadow DOM으로 소셜 로그인 버튼을 삽입한다.

\`\`\`javascript
if (PAGE_TYPE === 'login' || PAGE_TYPE === 'signup') {
  // 소셜 로그인 버튼 위젯 삽입
  var container = document.querySelector('.login_area') || document.querySelector('form[name="member_login"]');
  if (container) {
    insertSocialLoginWidget(container, clientId);
  }
}
\`\`\`

### 6.2 상품 상세 페이지 가입 유도 배너

구매 버튼 위에 미니배너, 가격 카운트다운, 배송비 쿠폰 뱃지를 삽입한다.

**에스컬레이션 흐름**:

\`\`\`
[0초]   페이지 진입 → BUY 버튼 할인 뱃지 + 가격 카운트다운 시작
[10초]  체류 중     → 버튼 색상 강조 (빨강)
[20초]  망설이는 중 → 버튼 점멸 시작
[30초]  이탈 위험   → 미니배너 슬라이드업 "지금 가입하면 4,000원 할인!"
\`\`\`

### 6.3 상품 열람 이력 추적

localStorage에 방문한 상품 이력을 저장하여 재방문 에스컬레이션에 활용한다.

\`\`\`javascript
// 방문 횟수에 따른 에스컬레이션
var visitCount = parseInt(localStorage.getItem('myapp_visit_count') || '0') + 1;
localStorage.setItem('myapp_visit_count', String(visitCount));

if (visitCount === 1) {
  showMiniPromo();       // 부드러운 안내
} else if (visitCount <= 3) {
  showFloatingPromo();   // 좀 더 적극적
} else {
  showUrgentPromo();     // 긴급성 + 특별 혜택
}
\`\`\`

### 6.4 이탈 감지 + 쿠폰 제안

페이지 이탈 의도를 감지하여 마지막 오퍼를 제시한다.

\`\`\`javascript
// 모바일: scroll-up 패턴 (연속 3회 위로 스크롤)
var lastScrollY = 0;
var upCount = 0;
window.addEventListener('scroll', function() {
  var currentY = window.scrollY;
  if (currentY < lastScrollY) {
    upCount++;
    if (upCount >= 3 && !exitOfferShown) {
      exitOfferShown = true;
      showExitOffer();
    }
  } else {
    upCount = 0;
  }
  lastScrollY = currentY;
});

// visibilitychange — 탭 전환/앱 전환
document.addEventListener('visibilitychange', function() {
  if (document.visibilityState === 'hidden') {
    saveAnalytics();  // Beacon API로 분석 데이터 전송
  }
});
\`\`\`

### 6.5 스마트 재방문자 에스컬레이션

\`\`\`javascript
var visitCount = getVisitCount();
var isLoggedIn = false;

// Front SDK로 로그인 상태 확인
CAFE24API.getCustomerIDInfo(function(err, res) {
  isLoggedIn = !err && res && res.customer && res.customer.customer_id;

  if (isLoggedIn) {
    // 가입 완료 → 유도 UI 모두 숨김
    hideAllPromos();
  } else if (visitCount >= 4) {
    // 4회 이상 미가입 → 시간제한 쿠폰 팝업
    showTimeLimitedCoupon();
  } else {
    // 일반 방문 → 방문 횟수에 따른 에스컬레이션
    showNormalPromo(visitCount);
  }
});
\`\`\`

### 6.6 AI 기반 배너 카피 생성

백엔드에서 쇼핑몰 정보를 기반으로 카피를 사전 생성하고, ScriptTag JS는 Config API에서 가져온다.

\`\`\`javascript
// Config API 호출 → 설정 + AI 생성 카피 수신
fetch(baseUrl + '/api/config?shop=' + clientId)
  .then(function(res) { return res.json(); })
  .then(function(config) {
    // config.banner_text: "🎉 봄 신상품 특가! 회원가입하면 5,000원 할인"
    // config.discount_amount: 5000
    // config.coupon_type: "percentage"
    renderWidget(config);
  });
\`\`\`

---

## 7. 트러블슈팅

### 7.1 ScriptTag 삭제 후에도 로딩되는 경우

**원인**: 카페24 서버 CDN 캐시

**해결**:
1. 삭제 후 1~5분 대기 (카페24 캐시 만료)
2. 개발 중 JS 서버에 \`Cache-Control: no-cache\` 설정
3. URL에 \`?v=타임스탬프\` 추가 (\`?shop=ID&v=1234567890\`)

\`\`\`typescript
const widgetSrc = \`\${baseUrl}/widget/buttons.js?shop=\${clientId}&v=\${Date.now()}\`;
\`\`\`

### 7.2 Front SDK 401 에러

**원인**: \`CAFE24API.init()\` 미호출 또는 잘못된 \`client_id\`

**해결**:

\`\`\`javascript
// 반드시 init 후 호출
var api = CAFE24API.init({
  client_id: 'YOUR_CLIENT_ID',
  version: '2022-12-01'
});

// IIFE 패턴 (권장)
(function(CAFE24API) {
  CAFE24API.get('/api/v2/products/' + productNo, function(err, res) { ... });
})(CAFE24API.init({ client_id: '...', version: '2022-12-01' }));
\`\`\`

### 7.3 display_location 함정

**증상**: 특정 페이지에만 ScriptTag를 적용하고 싶은데 전혀 표시되지 않는다.

**원인**: \`display_location\`을 빈 배열 \`[]\`로 지정하면 어디에도 표시되지 않는다.

**올바른 방법**: 전체 페이지에 적용하려면 반드시 \`["all"]\` 지정:

\`\`\`typescript
// 잘못된 예
await client.createScriptTag(mallId, accessToken, src, []);  // 어디에도 삽입 안 됨

// 올바른 예 — 전체 페이지
await client.createScriptTag(mallId, accessToken, src);  // displayLocation 생략 → ["all"] 기본값
await client.createScriptTag(mallId, accessToken, src, ["all"]);
\`\`\`

### 7.4 모바일/인앱 브라우저 대응

**카카오톡/네이버 인앱 브라우저 특이사항**:
- localStorage 세션 간 지속성이 일반 브라우저와 다를 수 있음
- \`document.cookie\`와 \`localStorage\`를 이중 저장하는 패턴 권장

\`\`\`javascript
// 인앱 브라우저 감지
var isInApp = /KAKAOTALK|NAVER|Line\\//i.test(navigator.userAgent);
var isMobile = /Mobi|Android/i.test(navigator.userAgent);

// 이중 저장 패턴 (인앱 브라우저 대응)
function saveData(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch(e) {}

  // 쿠키도 함께 저장 (30일)
  var expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = key + '=' + encodeURIComponent(JSON.stringify(value)) +
                    '; expires=' + expires + '; path=/; SameSite=Lax';
}

function loadData(key) {
  // localStorage 우선
  try {
    var ls = localStorage.getItem(key);
    if (ls) return JSON.parse(ls);
  } catch(e) {}

  // fallback: cookie
  var match = document.cookie.match(new RegExp('(?:^|;)\\\\s*' + key + '=([^;]+)'));
  if (match) {
    try { return JSON.parse(decodeURIComponent(match[1])); } catch(e) {}
  }

  return null;
}
\`\`\`

**삼성 인터넷 광고 차단기 대응**:

\`\`\`javascript
// 차단되는 클래스명 패턴 사용 금지
// 나쁜 예: banner, ad, popup, overlay, advertisement
// 좋은 예: promo-card, signup-notice, benefit-widget

var host = document.createElement('div');
host.id = 'benefit-widget-host';  // 광고처럼 보이지 않는 이름 사용
\`\`\`

### 7.5 CSS !important 충돌

**증상**: 스타일을 변경해도 카페24 스킨 CSS가 덮어쓴다.

**해결**: \`element.style.setProperty(name, value, 'important')\` 사용:

\`\`\`javascript
// 일반 방식은 카페24 스킨 CSS에 덮어씌워질 수 있음
element.style.backgroundColor = '#ef4444';  // 효과 없을 수 있음

// !important로 강제 적용
element.style.setProperty('background-color', '#ef4444', 'important');
element.style.setProperty('color', '#ffffff', 'important');
\`\`\`

### 7.6 전역 변수 오염

**증상**: 다른 스크립트와 변수명 충돌.

**해결**: IIFE로 스코프 격리:

\`\`\`javascript
// 올바른 패턴 — IIFE로 전역 변수 오염 방지
(function() {
  'use strict';

  var config = { ... };  // 외부에서 접근 불가
  var state  = { ... };

  function init() { ... }
  function render() { ... }

  init();
})();
\`\`\`

---

## 부록: ScriptTag 타입 정의 (TypeScript)

\`\`\`typescript
/** 카페24 ScriptTag 리소스 타입 */
export interface ScriptTag {
  script_no: number;
  client_id: string;
  src: string;
  display: string[];      // ["all"] 또는 ["/product/", "/order/basket"]
  exclude_path?: string[];
}
\`\`\`

## 부록: 필수 금지사항 체크리스트

ScriptTag JS 배포 전 반드시 확인:

\`\`\`
□ innerHTML 사용 없음 (XSS 위험 — createElement + textContent만 사용)
□ Admin API 직접 호출 없음 (앱스토어 심사 탈락)
□ 민감 정보 localStorage 저장 없음
□ 광고 차단기 필터링 클래스명 없음 (ad, banner, popup 등)
□ 전역 변수 오염 없음 (IIFE로 격리)
□ viewport meta 수정 없음 (호스트 레이아웃 파괴)
□ history.pushState 남용 없음 (쇼핑몰 라우팅 충돌)
□ localStorage write를 try/catch로 감쌈 (Private 모드 대응)
□ ScriptTag JS 서버에 Cache-Control: no-cache 설정
□ BASE_URL과 client_id는 서버에서 런타임 주입 (하드코딩 금지)
\`\`\`
`;
