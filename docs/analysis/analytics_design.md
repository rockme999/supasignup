# 번개가입 통계 시스템 확장 설계서

> 작성일: 2026-04-06 KST
> 최종 수정: 2026-04-06 KST — Phase 1~4 구현 완료
> 상태: 전체 구현 완료

## 1. 현재 상태

### 수집 중인 데이터

| 데이터 소스 | 테이블 | 수집 항목 |
|------------|--------|----------|
| 소셜 로그인/가입 | `login_stats` | shop_id, user_id, provider, action(signup/login), created_at |
| 퍼널 이벤트 | `funnel_events` | shop_id, event_type, event_data(JSON), page_url, created_at |

### 수집 중인 이벤트 (funnel_events)

| 이벤트 | 설명 | API 허용 |
|--------|------|---------|
| `banner_show` | 미니배너 노출 | ✅ |
| `banner_click` | 미니배너 클릭 | ✅ |
| `popup_show` | 이탈 감지 팝업 노출 | ✅ |
| `popup_close` | 팝업 닫기 | ✅ |
| `popup_signup` | 팝업 가입 클릭 | ✅ |
| `escalation_show` | 에스컬레이션 노출 | ✅ |
| `escalation_click` | 에스컬레이션 클릭 | ❌ 누락 |
| `escalation_dismiss` | 에스컬레이션 닫기 | ❌ 누락 |
| `kakao_channel_show` | 카카오 채널 노출 | ❌ 누락 |
| `kakao_channel_click` | 카카오 채널 클릭 | ❌ 누락 |
| `signup_complete` | 가입 완료 | ✅ |
| `oauth_start` | 소셜 로그인 버튼 클릭 | ❌ 미구현 |
| `page_view` | 페이지 조회 | ❌ 미구현 |

### 수집하지 않는 정보 (추가 필요)

- User-Agent (모바일/PC, Android/iPhone 구분)
- Referrer (유입 경로)
- 방문자 식별자 (가입 전 행동 추적용)
- 페이지 조회 이벤트 (상품 페이지 조회 수)
- OAuth 시작 이벤트 (이탈률 계산용)

---

## 2. 확장 설계

### 2.1 이벤트 수집 확장

#### API 허용 이벤트 추가

```
기존 7종 + 추가 5종 = 12종
```

| 추가 이벤트 | 설명 | 위젯 수정 |
|------------|------|----------|
| `escalation_click` | 에스컬레이션 가입 클릭 | 이미 전송 중, API만 허용 추가 |
| `escalation_dismiss` | 에스컬레이션 닫기 | 이미 전송 중, API만 허용 추가 |
| `kakao_channel_show` | 카카오 채널 노출 | 이미 전송 중, API만 허용 추가 |
| `kakao_channel_click` | 카카오 채널 클릭 | 이미 전송 중, API만 허용 추가 |
| `page_view` | 페이지 조회 | 위젯에 추가 필요 |
| `oauth_start` | 소셜 로그인 버튼 클릭 | 위젯에 추가 필요 |

#### event_data 확장

현재 `event_data`에 JSON으로 저장하는 구조를 활용하여, 모든 이벤트에 공통 메타데이터를 추가:

```json
{
  "device": "mobile",         // "mobile" | "desktop" | "tablet"
  "os": "ios",               // "ios" | "android" | "windows" | "mac" | "linux" | "other"
  "browser": "safari",       // "chrome" | "safari" | "firefox" | "edge" | "other"
  "referrer": "https://search.naver.com/...",
  "visitor_id": "v_abc123",  // localStorage 기반 익명 방문자 ID
  "visit_count": 3,          // 현재 방문 횟수
  "page_type": "product",    // "main" | "product" | "category" | "login" | "other"
  "session_page_count": 5    // 이번 세션에서 본 페이지 수
}
```

#### 위젯 수정 사항 (buttons.ts)

```javascript
// 1. 방문자 식별자 생성 (localStorage, 가입 전 행동 추적용)
var visitorId = localStorage.getItem('bg_visitor_id');
if (!visitorId) {
  visitorId = 'v_' + Math.random().toString(36).substr(2, 12);
  localStorage.setItem('bg_visitor_id', visitorId);
}

// 2. 디바이스/브라우저 감지
function detectDevice() {
  var ua = navigator.userAgent;
  var isMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  var isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  return isTablet ? 'tablet' : isMobile ? 'mobile' : 'desktop';
}

function detectOS() {
  var ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  if (/Windows/i.test(ua)) return 'windows';
  if (/Mac/i.test(ua)) return 'mac';
  if (/Linux/i.test(ua)) return 'linux';
  return 'other';
}

// 3. 페이지 타입 감지
function detectPageType() {
  var path = window.location.pathname;
  if (path === '/' || path === '/index.html') return 'main';
  if (/\/products?\//.test(path) || /\/goods\//.test(path)) return 'product';
  if (/\/category\//.test(path)) return 'category';
  if (/\/member\/login/.test(path)) return 'login';
  return 'other';
}

// 4. 세션 페이지 카운트
var sessionKey = 'bg_session_pages';
var sessionPages = parseInt(sessionStorage.getItem(sessionKey) || '0') + 1;
sessionStorage.setItem(sessionKey, String(sessionPages));

// 5. trackEvent에 공통 메타데이터 추가
BGWidget.prototype.trackEvent = function(eventType, eventData) {
  var meta = {
    device: detectDevice(),
    os: detectOS(),
    browser: detectBrowser(),
    referrer: document.referrer || '',
    visitor_id: visitorId,
    visit_count: parseInt(localStorage.getItem('bg_visit_count') || '1'),
    page_type: detectPageType(),
    session_page_count: sessionPages
  };
  var merged = Object.assign({}, meta, eventData || {});
  // ... 기존 전송 로직
};

// 6. page_view 이벤트 자동 전송 (초기화 시 1회)
this.trackEvent('page_view', {});

// 7. oauth_start 이벤트 (소셜 로그인 버튼 클릭 시)
// 각 프로바이더 버튼의 onclick에 추가
this.trackEvent('oauth_start', { provider: 'kakao' });
```

---

### 2.2 분석 지표 설계

#### A. 노출/클릭/전환율

| 기능 | 노출 이벤트 | 클릭 이벤트 | 전환율 계산 |
|------|-----------|-----------|-----------|
| 미니배너 | `banner_show` | `banner_click` | click / show × 100 |
| 이탈 감지 팝업 | `popup_show` | `popup_signup` | signup / show × 100 |
| 에스컬레이션 토스트 | `escalation_show` (visit≤3) | `escalation_click` | click / show × 100 |
| 에스컬레이션 배너 | `escalation_show` (visit≥4) | `escalation_click` | click / show × 100 |
| 카카오 채널 | `kakao_channel_show` | `kakao_channel_click` | click / show × 100 |

#### A-2. OAuth 이탈률 (OAuth Drop-off Rate)

| 프로바이더 | 산출 방법 | 의미 |
|-----------|----------|------|
| **프로바이더별 이탈률** | 1 - (signup_complete / oauth_start) × 100 (provider별) | 인증 시작 후 완료하지 않은 비율 |
| **전체 OAuth 완료율** | signup_complete / oauth_start × 100 | 전체 소셜 로그인 완료율 |

- `oauth_start` 이벤트에 `{ provider: "kakao" }` 를 포함하여 프로바이더별 분석
- 이탈률이 높은 프로바이더 → 설정 오류 또는 UX 문제 진단 가능
- 예시 인사이트: "Apple은 이탈률 40%, 다른 프로바이더는 10% 미만 → Apple 연동 점검 필요"

#### A-3. 프로바이더 × 디바이스 교차 분석

| 지표 | 산출 방법 | 의미 |
|------|----------|------|
| **디바이스별 선호 프로바이더** | login_stats JOIN funnel_events(device) by visitor_id | 모바일: 카카오/네이버, PC: 구글 등 패턴 발견 |
| **디바이스별 전환율** | device별 signup_complete / banner_show × 100 | 모바일 vs PC 전환율 비교 |

- Phase 2 쿼리에서 구현 (Phase 1의 device 메타데이터 수집이 선행 조건)
- 디바이스별 프로바이더 노출 순서 최적화의 근거

#### B. 가입까지의 노력 (Effort-to-Signup)

| 지표 | 산출 방법 | 의미 |
|------|----------|------|
| **평균 방문 횟수** | signup 이벤트의 visit_count 평균 | 몇 번 와야 가입하는가 |
| **평균 페이지 조회 수** | signup 직전 page_view 수 (visitor_id 기준) | 몇 페이지를 봐야 가입하는가 |
| **가입 트리거 분포** | signup_complete 직전 이벤트 종류별 비율 | 배너/팝업/에스컬레이션 중 어디서 가입했는가 |
| **가입 전 상품 조회 수** | page_type='product'인 page_view 수 (visitor_id별) | 상품을 몇 개 봐야 가입하는가 |
| **1회 방문 가입률** | visit_count=1인 signup 비율 | 첫 방문에 가입하는 비율 |
| **첫 상호작용→가입 소요시간** | visitor_id 기준 첫 page_view ~ signup_complete 시간 차이 | 가입까지 평균 며칠/몇 시간 걸리는가 |

#### C. 유입 분석

| 지표 | 산출 방법 | 의미 |
|------|----------|------|
| **첫 방문 페이지 분포** | visit_count=1인 page_view의 page_type 비율 | 메인 vs 상품 vs 카테고리 |
| **유입 경로 분포** | referrer 도메인 집계 | 검색엔진/SNS/직접접속/기타 |
| **디바이스 분포** | device 필드 집계 | 모바일(iOS/Android) vs PC |
| **브라우저 분포** | browser 필드 집계 | Chrome/Safari/Firefox/Edge |

#### D. 시각화 계획

| 차트 타입 | 용도 | 위치 |
|----------|------|------|
| **파이 차트** | 프로바이더별 가입 비율 | 통계 |
| **파이 차트** | 디바이스 분포 (모바일/PC) | 통계 |
| **파이 차트** | 가입 트리거 분포 (배너/팝업/에스컬레이션/직접) | 통계 |
| **막대 차트** | 일자별 가입 추이 | 통계 |
| **스택 막대** | 일자별 프로바이더별 가입 | 통계 |
| **퍼널 차트** | 배너노출→클릭→팝업→가입→완료 | 통계 |
| **수치 카드** | 노출수/클릭수/전환율 | 홈 + 통계 |
| **라인 차트** | 일자별 노출/클릭 추이 | 통계 |
| **도넛 차트** | 유입 경로 분포 | 통계 |
| **히트맵** | 시간대별 가입 분포 (요일 × 시간) | 통계 |
| **수치 카드** | OAuth 시작/완료/이탈률 (프로바이더별) | 통계 |
| **교차 막대** | 프로바이더 × 디바이스 가입 분포 | 통계 |

---

### 2.3 홈(대시보드)과 통계 페이지 역할 분리

#### 홈 — 한눈에 보는 요약

```
┌─ 핵심 지표 카드 (4개) ─────────────────┐
│ 오늘 가입 | 이번 주 가입 | 총 회원수 | CTR │
└───────────────────────────────────────┘
┌─ 가입 트리거 (어디서 가입했나) ─────────┐
│ 배너: 45% | 팝업: 30% | 에스컬: 20% | 직접: 5% │
└───────────────────────────────────────┘
┌─ 빠른 설정 링크 ──────────────────────┐
│ SSO 미설정 → 설정하기 / Plus → 업그레이드 │
└───────────────────────────────────────┘
```

#### 통계 — 상세 분석

```
┌─ 기간 필터 ───────────────────────────┐
│ [오늘] [7일] [30일] [이번 달] [전체]    │
└───────────────────────────────────────┘
┌─ 노출/클릭/전환율 카드 ──────────────┐
│ 배너 CTR | 팝업 CVR | 에스컬 CVR      │
└───────────────────────────────────────┘
┌─ 일자별 가입 추이 (막대) ────────────┐
│ [프로바이더별 스택 막대 차트]          │
└───────────────────────────────────────┘
┌─ 가입 분석 ──────────────────────────┐
│ 프로바이더 파이 | 디바이스 파이 | 유입경로 도넛 │
└───────────────────────────────────────┘
┌─ 가입까지의 노력 ────────────────────┐
│ 평균 방문 횟수 | 평균 페이지 수 | 1회 가입률 │
│ 가입 전 상품 조회 수 | 트리거 분포     │
└───────────────────────────────────────┘
┌─ 퍼널 분석 ──────────────────────────┐
│ 배너노출 → 클릭 → 팝업 → 가입 → 완료  │
│ 각 단계 전환율 %                      │
└───────────────────────────────────────┘
┌─ OAuth 이탈 분석 ────────────────────┐
│ 카카오: 5% | 네이버: 8% | 구글: 12%  │
│ Apple: 35% | Facebook: 15%           │
│ → Apple 연동 점검 필요 알림           │
└───────────────────────────────────────┘
┌─ 프로바이더 × 디바이스 ─────────────┐
│ [교차 막대 차트]                      │
│ 모바일: 카카오 60% 네이버 25% ...     │
│ PC: 구글 45% 카카오 30% ...           │
└───────────────────────────────────────┘
┌─ 시간대별 가입 패턴 (히트맵) ────────┐
│ [요일 × 시간 히트맵]                  │
│ 토요일 오후 2~4시 피크               │
└───────────────────────────────────────┘
┌─ 첫 방문 페이지 분포 ────────────────┐
│ 메인: 40% | 상품: 45% | 카테고리: 10% │
└───────────────────────────────────────┘
```

---

## 3. 구현 순서

### Phase 1: 이벤트 수집 확장 (위젯 + API)
1. API 허용 이벤트 6종 추가 (escalation_click, escalation_dismiss, kakao_channel_show, kakao_channel_click, page_view, oauth_start)
2. 위젯 trackEvent에 공통 메타데이터 추가 (device, os, browser, referrer, visitor_id, visit_count, page_type, session_page_count)
3. 위젯에 `page_view` 이벤트 자동 전송 (초기화 시 1회)
4. 위젯에 `oauth_start` 이벤트 전송 (소셜 로그인 버튼 클릭 시, provider 포함)
5. API 엔드포인트에서 확장된 event_data 수용
6. docs/schema.sql 이벤트 타입 주석 업데이트

### Phase 2: 통계 쿼리 + API
1. 노출/클릭/전환율 집계 쿼리
2. OAuth 이탈률 집계 쿼리 (oauth_start vs signup_complete, 프로바이더별)
3. 가입까지의 노력 집계 쿼리 (visitor_id 기반)
4. 첫 상호작용→가입 소요시간 쿼리 (visitor_id 기준)
5. 디바이스/유입경로/첫 방문 페이지 분포 쿼리
6. 프로바이더 × 디바이스 교차 분석 쿼리
7. 시간대별 가입 패턴 쿼리 (요일 × 시간)
8. 통계 API 엔드포인트 추가 또는 기존 확장

### Phase 3: 통계 페이지 UI 전면 개편
1. 파이 차트 컴포넌트 (CSS/SVG 기반)
2. 퍼널 차트 개선
3. 노출/클릭/전환율 카드
4. OAuth 이탈률 카드 (프로바이더별)
5. 가입까지의 노력 섹션
6. 프로바이더 × 디바이스 교차 분석 차트
7. 시간대별 가입 히트맵 (요일 × 시간)
8. 디바이스/유입경로/첫 방문 분석 섹션
9. 기간 필터 연동

### Phase 4: 홈 대시보드 개선
1. 핵심 지표 카드에 전환율 추가
2. 가입 트리거 분포 요약
3. 홈/통계 표현 완전 통일

---

## 4. 기술 고려사항

### D1 쿼리 성능
- funnel_events 테이블이 커지면 쿼리 느려질 수 있음
- 인덱스: `(shop_id, event_type, created_at)` 복합 인덱스 필요
- 일별 집계 테이블(daily_stats) 생성 고려 (cron으로 전날 데이터 집계)

### 방문자 식별
- `visitor_id`는 localStorage 기반 → 브라우저/기기별 다른 ID
- 가입 후 user_id와 매핑: OAuth 콜백에서 `visitor_id` 쿠키를 읽어 login_stats에 저장
- 크로스 디바이스 추적은 불가 (가입 후 user_id로만 통합)

### 프라이버시
- IP 주소는 저장하지 않음 (rate limit용으로만 사용)
- visitor_id는 익명 식별자 (개인정보 아님)
- User-Agent는 카테고리화하여 저장 (원본 저장하지 않음)
- referrer는 도메인만 저장 (전체 URL 저장하지 않음)

### 파이 차트 구현
- 외부 라이브러리 없이 CSS `conic-gradient` 또는 SVG로 구현
- 이유: Cloudflare Workers 번들 크기 제한, SSR 호환성
