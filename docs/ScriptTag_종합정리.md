# ScriptTag 종합 정리 문서

> **작성일**: 2026-03-31
> **목적**: 번개가입의 ScriptTag 기반 서비스 아키텍처, 부가기능, 기술 스펙을 한곳에 정리

---

## 1. ScriptTag의 핵심 역할

### 1.1 정의 및 목적

- **ScriptTag**: 카페24의 자동 스크립트 삽입 API
- **용도**: 번개가입의 JavaScript 파일을 쇼핑몰의 **모든 페이지**에 자동 삽입
- **효과**: 추가 설치 없이 기본 로그인부터 모든 부가기능(배너, 팝업 등)을 즉시 활성화 가능

### 1.2 기술적 위치

```
카페24 앱스토어 설치
  → 번개가입 대시보드 자동 등록
  → ScriptTag API로 위젯 JS 자동 삽입
  → 쇼핑몰 전 페이지에서 로그인 버튼 + 부가기능 렌더링
```

**관련 파일:**
- API: `/api/cafe24/install` → `/api/cafe24/callback` → `createScriptTag()`
- 기술스펙_v1.md 섹션 3.4

---

## 2. ScriptTag 기반 서비스 아키텍처

### 2.1 삽입 방식

```
번개가입 설치 (카페24 앱스토어)
  ↓
/api/cafe24/callback 처리
  ↓
cafe24Client.createScriptTag(mallId, accessToken, 
  `${BASE_URL}/widget/buttons.js?shop=${shop.shop_id}`)
  ↓
카페24가 쇼핑몰의 모든 페이지에 다음 코드 자동 삽입:
<script src="https://bg.suparain.kr/widget/buttons.js?shop=shop_xxxxx"></script>
```

**효과:**
- 설치 후 추가 코드 수정 필요 없음
- 로그인 페이지, 마이페이지, 전체 페이지에서 자동 동작

### 2.2 위젯 JS 구조

**파일**: `workers/widget/src/buttons.ts`

```javascript
(function() {
  // 1. 로그인/회원가입 페이지 감지
  // 2. shop_id 자동 추출 (URL 파라미터)
  // 3. API 호출: GET /api/widget/config?shop=SHOP_ID
  //    → 활성화된 프로바이더 목록 반환
  // 4. localStorage에서 bg_last_provider 확인
  // 5. 버튼 HTML 렌더링
  //    - 이전 로그인 provider는 강조 (번개마크 + 최상단)
  //    - 나머지 프로바이더는 버튼 형태
  // 6. 클릭 이벤트: window.location.href로 OAuth 플로우 시작
})();
```

**주요 기능:**
- Vanilla JS (프레임워크 의존성 없음)
- 모든 카페24 쇼핑몰 호환
- 인라인 CSS 포함 (독립 동작)

---

## 3. 부가기능 로드맵 (ScriptTag 활용)

### 3.1 Phase 1 (MVP 동시 출시)

#### 3.1.1 미니 배너 (하단 혜택 배너)

**정의:**
- 로그인 폼 아래에 슬라이드 카드 형태의 배너 4종 표시
- 1초가입의 대표 기능을 ScriptTag로 구현

**구현 방식:**
```
[기본 기능]
  - ScriptTag로 쇼핑몰 하단/측면에 커스텀 배너 표시
  - 배너 내용: 텍스트 + 이미지 + 링크
  - 운영자 대시보드에서 배너 생성/수정/삭제
  - 표시 조건: 전 페이지 or 특정 페이지
  - 노출 빈도: 항상 / 1회만 / 시간 간격

[카피 샘플]
  - "다양한 혜택을 받으세요"
  - "혜택은 오직 회원만"
  - "회원님을 위한 혜택 꼭 받아가세요"
  - "Member Benefits"
```

**과금:**
- 기본 배너 1개: 무료 (유인용)
- 복수 배너: 월정액
- A/B 테스트, 타겟팅: 월정액

**차별화:**
- AI 배너 카피라이터 포함 (Kimi K2.5)
  - 운영자가 '🤖 AI로 생성' 클릭
  - 쇼핑몰 상품/이벤트 기반 카피 3~5개 자동 제안
  - 선택만 하면 완료

**기술스펙:** 전략_및_MVP.md 섹션 5.1, 기술스펙_v1.md 섹션 5

#### 3.1.2 카카오 채널 연동

**정의:**
- 가입 시 카카오 채널 자동 친구 추가
- 경쟁사 4곳(1초가입, 해피싱크, 오모조인, 알파푸시) 모두 제공하는 필수 기능

**구현 흐름:**
```
[가입 플로우]
  1. 사용자가 카카오로 소셜 가입 완료
  2. 번개가입이 카카오 채널 API 호출
  3. 해당 쇼핑몰의 카카오 채널에 자동 추가

[운영자 설정]
  - 대시보드 > 쇼핑몰 설정 > 카카오 채널 ID 입력
  - ON/OFF 토글 (꺼두면 채널 추가 안 함)
```

**과금:**
- 월정액 (ON/OFF 자유)

**참고:** 전략_및_MVP.md 섹션 5.1 카카오 채널 연동 구현 범위

### 3.2 Phase 2 (출시 후 1~2개월)

#### 3.2.1 소셜 프루프 위젯

**정의:**
- "방금 N명이 카카오로 가입했어요" 실시간 알림
- 심리적 동기 부여 → 가입 전환율 상승

**구현 방식:**
- ScriptTag로 쇼핑몰 페이지 우측/하단에 플로팅 위젯
- 실시간 데이터 연결 (WebSocket 또는 폴링)

**과금:**
- 월정액

#### 3.2.2 이탈 감지 + 소셜 가입 팝업

**정의:**
- 마우스 이탈 또는 뒤로가기 감지 시 팝업
- 가입 전환 마지막 기회 포착

**구현 방식:**
- ScriptTag로 이벤트 리스너 자동 등록
- 조건: `mouseout` + `beforeunload` 감지

**과금:**
- 월정액

#### 3.2.3 프로바이더별 전환 분석 대시보드

**정의:**
- 프로바이더별 클릭 → 가입 전환율
- 일별/주별 추이, 이탈 지점 분석

**과금:**
- 월정액

### 3.3 Phase 3 (차별화 -- AI 활용)

#### 3.3.1 AI 스마트 배너

**정의:**
- Cloudflare Workers AI (Kimi K2.5)로 배너 카피/이미지 자동 생성
- 상품/이벤트에 맞는 문구 자동 제안

**과금:**
- 월정액

**비용 구조:**
- 무료: 10,000 Neurons/일
- 초과: $0.011/1,000 Neurons
- 쇼핑몰 1곳당 일일 AI 사용량 극소 → 수백 개 쇼핑몰까지 무료 티어 내 운영 가능

#### 3.3.2 AI A/B 테스트 최적화

**정의:**
- 버튼 순서, 배너 문구 자동 최적화
- 데이터 축적 = 자연스러운 lock-in

**효과:**
```
[설치 직후]
  - AI 없음 → 이탈 비용 낮음

[3개월 후 — AI A/B 테스트]
  - 버튼 순서, 배너 문구 최적화 데이터 축적
  - "어떤 조합이 전환율 최고인지" AI가 학습
  - 이탈 시 최적화 히스토리 전체 유실

[6개월 후 — AI 세그먼트 분석]
  - 프로바이더별 구매 전환율, 객단가 인사이트
  - 맞춤형 배너 자동 생성 히스토리
  - 이탈 비용: 매우 높음 (대체 불가한 데이터 자산)
```

**과금:**
- 월정액

#### 3.3.3 AI 고객 세그먼트 분석

**정의:**
- 소셜 프로바이더별 구매 전환율, 객단가 분석
- 운영자에게 인사이트 제공

**과금:**
- 월정액

#### 3.3.4 supa24 Discord 커뮤니티 연동

**정의:**
- Discord 로그인 시 브랜드 서버 자동 초대
- MZ 킬러 기능 (경쟁사 전무)

**구현:**
```
[쇼핑몰 방문자]
  1. Discord로 소셜 가입
  2. 번개가입이 Discord Bot API로 브랜드 서버 초대
  3. 가입 완료 + 커뮤니티 참여 동시 달성
```

**포인트:**
- 번개가입 + supa24 조합으로만 가능
- 경쟁사는 Discord 로그인 자체를 지원하지 않음 → 복제 불가

**과금:**
- 월정액

### 3.4 Phase 4 (생태계)

#### 3.4.1 수파레인 크레딧 쿠폰 시스템

**정의:**
- 번개가입으로 가입 → 생태계 서비스 크레딧 자동 발급
- 크로스셀링 통로

**구조:**
```
[번개가입 소셜 가입]
  → 수파레인 크레딧 쿠폰 자동 발급 (ScriptTag 기반)
  → supaMov: 동영상 인코딩 크레딧
  → VuDrop: 포장 동영상 저장 크레딧
  → 생태계 전체 체험 유도
```

**과금:**
- 연동 무료 (생태계 수익으로 충당)

#### 3.4.2 VuDrop 포장 영상 알림

**정의:**
- ScriptTag로 주문 포장 동영상 등록 시 고객 알림/링크 공유
- 경쟁사 전무한 기능

**구현:**
- VuDrop과 번개가입 ScriptTag 통합
- 가입 고객에게 포장 상태 알림

**과금:**
- 월정액

#### 3.4.3 오팀장 AI 운영 연동

**정의:**
- 소셜 전환 분석 데이터를 오팀장에 전달
- AI 기반 운영 제안 생성

**상태:**
- 향후 확정 (오팀장 런칭 후 접점 개발)

---

## 4. 경쟁사 분석 (부가기능 벤치마킹)

### 4.1 부가기능 비교표

| 기능 | 1초가입 | 해피싱크 | 오모조인 | 알파푸시 | **번개가입** |
|------|:-------:|:--------:|:--------:|:--------:|:----------:|
| **미니 배너** | ✅ | - | - | ✅ | ✅ (+ AI) |
| **팝업** | - | - | - | ✅ | ✅ (Phase 2) |
| **CRM 마케팅** | ✅ | - | - | ✅ | ✅ (향후) |
| **알림톡/문자** | - | - | - | ✅ | - |
| **쿠폰 자동 지급** | - | - | ✅ | - | - |
| **카카오 채널 자동 추가** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **온사이트 마케팅** | ✅ | - | - | ✅ | ✅ (부가기능) |
| **분석/리포트** | - | - | - | ✅ | ✅ (Phase 2+) |

### 4.2 1초가입 상세 분석

**기본 테마 (특허 등록번호: 30-2020-0039257):**
- 로그인 페이지를 **완전히 대체**하는 자체 UI
- "공감 포인트 자극을 통해 심리적 장벽 완화" 전략
- 카카오 1초 로그인/회원가입 + 네이버 버튼

**하단 혜택 배너 (미니 배너 핵심):**
- 로그인 폼 아래 **슬라이드형 카드 배너** 4종
- 할인/프로모션 혜택을 시각적으로 어필
- 가입 전환율 상승의 핵심

**브랜드 테마 (STANDARD 플랜 전용):**
- 쇼핑몰 브랜드 이미지를 배경으로 사용
- 애니메이션 ON/OFF
- 방문자 부담 최소화

**CRM 자동화 (KeepGrow 플랫폼):**
- Get-Keep-Grow 방법론
- 시간 기반 트리거: 가입 1일 후 → 첫 구매 유도
- 고객 세그먼트별 자동 캠페인

**우리의 대응:**
- 하단 혜택 배너는 Phase 1에서 필수 구현
- 로그인 페이지 완전 대체는 기술적 제약 (카페24 구조)
- CRM 자동화는 Phase 3+ (데이터 축적 후)

### 4.3 알파푸시 분석

**강점:**
- 무료 시작 (진입장벽 없음)
- 6개월 만에 6,000개 쇼핑몰 채택
- 회원가입 + CRM + 마케팅 + 분석까지 수직 통합

**약점:**
- 해외 소셜 (Google, Apple, Discord 등) 미지원
- 기능이 많아 단순 로그인만 원하는 운영자에게는 과할 수 있음

**우리의 차별화:**
- 9종 소셜 + 무료 = 알파푸시보다 나음
- 생태계 연동 (supa24, VuDrop, 오팀장) = 경쟁사 불가능

### 4.4 카페24 앱스토어 벤치마크

**참고 앱들 (ScriptTag 활용 패턴):**

1. **카카오톡 채팅상담 (#1702)**
   - 다중 채널 통합 상담 + 통계 대시보드
   - 참고: 다양한 로그인 제공자를 하나의 UI로 통합하는 방식

2. **숏링커 (#12539)**
   - 자사 도메인 단축 링크 + QR코드 생성
   - 참고: 자사 도메인 신뢰도 강조, 다언어 지원

3. **링크링커 (#19717)**
   - 배포 후 수정 가능한 단축 링크 + GA4 연동
   - 참고: 배포 후 설정 변경 가능 구조, 매개변수 보존

4. **카카오톡 상담버튼 (#30070)**
   - 극도로 간단한 설정 (1클릭)
   - 참고: 설정 5분 이내 완료되는 UX (우리도 필수)

5. **크리마 리뷰 (#1406)**
   - AI 기반 리뷰 관리 솔루션 (10,000+ 설치)
   - 참고: AI 활용, 설치 수 강조, 통합 솔루션 마케팅

---

## 5. 기술 스펙 상세

### 5.1 ScriptTag 삽입 API

**카페24 API 호출:**
```typescript
async createScriptTag(
  mallId: string, 
  accessToken: string, 
  src: string
): Promise<ScriptTag>;
```

**파라미터:**
- `mallId`: 카페24 쇼핑몰 ID
- `accessToken`: 카페24 OAuth 토큰
- `src`: 삽입할 JS 파일 URL (예: `https://bg.suparain.kr/widget/buttons.js?shop=shop_xxxxx`)

**응답:**
```json
{
  "script_no": 12345,
  "name": "bg_widget",
  "src": "https://bg.suparain.kr/widget/buttons.js?shop=shop_xxxxx",
  "display_location": "All pages",
  "is_used": "T",
  "created_date": "2026-03-31"
}
```

**관련 엔드포인트:**
- `createScriptTag()`: 위젯 삽입
- `deleteScriptTag()`: 위젯 삭제 (앱 제거 시)
- `listScriptTags()`: 기존 ScriptTag 목록 조회

**참고:** 기술스펙_v1.md 섹션 6, packages/cafe24-client/src/client.ts

### 5.2 위젯 API

#### `GET /widget/buttons.js`

ScriptTag로 삽입되는 JavaScript 파일.

**쿼리 파라미터:**
- `shop`: shop_id 또는 mall_id

**역할:**
1. 로그인/회원가입 페이지 감지
2. 활성 프로바이더 목록 조회 (`/api/widget/config`)
3. localStorage에서 이전 로그인 provider 확인
4. 버튼 HTML 렌더링
5. 클릭 이벤트 처리

#### `GET /api/widget/config`

위젯이 호출하는 설정 API.

**파라미터:** `shop` (shop_id)

**응답:**
```json
{
  "shop_id": "shop_xxxxx",
  "providers": [
    {
      "id": "google",
      "name": "Google",
      "enabled": true,
      "icon": "google"
    },
    {
      "id": "kakao",
      "name": "카카오톡",
      "enabled": true,
      "icon": "kakao"
    }
  ],
  "theme": {
    "button_color": "#000",
    "button_text_color": "#fff",
    "layout": "vertical"
  }
}
```

**캐싱:**
- KV에 5분 TTL로 캐시 저장
- 운영자가 설정 변경 시 `widget_config:{shop_id}` 캐시 무효화

**참고:** 기술스펙_v1.md 섹션 3.2

### 5.3 위젯 CSS 스타일

```css
/* 인라인 CSS (위젯 JS에 포함) */
.bg-widget {
  max-width: 320px;
  margin: 16px auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.bg-button {
  width: 100%;
  padding: 12px;
  margin: 8px 0;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* 프로바이더별 색상 */
.bg-btn-google { background: #fff; color: #000; border-color: #ddd; }
.bg-btn-kakao { background: #FFE812; color: #000; }
.bg-btn-naver { background: #00C73C; color: #fff; }
.bg-btn-apple { background: #000; color: #fff; }
```

**특징:**
- 인라인 CSS (외부 파일 의존 없음)
- 다크모드 자동 대응 (`prefers-color-scheme`)
- 터치 친화적 (모바일 최적화)

**참고:** 기술스펙_v1.md 섹션 5.2

### 5.4 로그인 페이지 감지 로직

```typescript
findLoginPage(): HTMLElement | null {
  // 카페24 표준 로그인 페이지 감지
  const selectors = [
    // 로그인 폼
    'form[name="frmMemberLogin"]',
    'form[class*="login"]',
    '#login-form',
    
    // 회원가입 폼
    'form[name="frmMemberJoin"]',
    'form[class*="join"]',
    '#join-form',
    
    // URL 기반
    window.location.pathname.includes('/login') ? 'body' : null,
    window.location.pathname.includes('/join') ? 'body' : null,
  ];
  
  for (const selector of selectors) {
    const elem = document.querySelector(selector);
    if (elem) return elem;
  }
  
  return null;
}
```

**참고:** 기술스펙_v1.md 섹션 5.3

### 5.5 KV 저장소 설계

ScriptTag 기반 모든 기능이 KV 캐시를 활용:

| 키 | TTL | 값 | 용도 |
|----|-----|-----|------|
| `widget_config:{shop_id}` | 5분 | JSON: {providers, theme} | 위젯 설정 캐시 |
| `oauth_session:{state}` | 10분 | JSON: {shop_id, redirect_uri, ...} | OAuth 플로우 세션 |
| `access_token:{token}` | 2시간 | JSON: {user_id, shop_id} | 로그인 토큰 |
| `dashboard_session:{token}` | 24시간 | JSON: {owner_id} | 대시보드 세션 |
| `login_attempt:{ip}` | 5분 | 시도 횟수 | Brute force 방지 |

**참고:** 기술스펙_v1.md 섹션 6

### 5.6 보안 설계

**위젯 레벨:**
- `innerHTML` 금지 → `document.createElement()` + `textContent` 사용
- 사용자 입력/외부 데이터는 반드시 `textContent`로 삽입 (XSS 방어)
- shop_id는 공개 정보 (민감 정보 없음)

**API 레벨:**
- OAuth: 각 프로바이더의 표준 OAuth 2.0 + PKCE
- 대시보드: JWT + 쿠키 (httpOnly, Secure, SameSite)
- Redirect URI 검증: 화이트리스트 대조

**참고:** 기술스펙_v1.md 섹션 7

---

## 6. 구현 일정 (MVP)

| 주차 | 작업 | 산출물 |
|------|------|--------|
| **1주차** | 프로젝트 셋업 + cafe24-client 포팅 | 모노레포 구조, cafe24-client 패키지 |
| **2주차** | OAuth Provider 핵심 구현 | /oauth/authorize, token, userinfo + KV/D1 |
| **3주차** | 소셜 OAuth 연동 | Google, Kakao, Naver, Apple 프로바이더 |
| **4주차** | 위젯 + 스마트 버튼 | buttons.js, localStorage 로직, CSS |
| **5주차** | 대시보드 (쇼핑몰 관리 + 프로바이더 선택) | 대시보드 UI + API |
| **6주차** | 대시보드 (통계 + 과금) + 카페24 SSO 통합 테스트 | 완성된 대시보드, E2E 테스트 |
| **7주차** | 버그 수정 + 최적화 + 카페24 앱스토어 준비 | MVP 완성 |

**MVP Phase 1에 포함되는 ScriptTag 기반 기능:**
- ✅ 소셜 로그인 9종 (카페24 SSO 4종 + ScriptTag 위젯 5종)
- ✅ 스마트 버튼 (이전 로그인 기억)
- ✅ 마이페이지 소셜 연동 위젯
- ✅ 기본 통계
- ⚠️ 미니 배너 (기본 기능, AI 카피라이터 포함)
- ⚠️ 카카오 채널 연동

**참고:** 전략_및_MVP.md 섹션 5

---

## 7. 마이그레이션 및 확장 전략

### 7.1 경쟁사 고객 전환

| 전환 유형 | 난이도 | 전략 |
|-----------|:------:|------|
| 소셜 없는 쇼핑몰 | 쉬움 | 바로 설치, 기존 ID/PW 회원은 SNS 연동 설정으로 자동 매핑 |
| 카페24 자체 소셜 (@g/@n/@k) | 보통 | 번개가입 SSO 추가 + 기존 소셜 버튼 CSS 숨김 |
| 경쟁 SSO (1초가입 등) | 보통 | SSO 2번 슬롯에 번개가입 추가 (@s + @s1 공존) |

### 7.2 서비스 이전 자동 매핑

**원칙:**
- 진입 비용: 0원 (무료)
- 이탈 비용: 데이터 축적으로 자연스럽게 증가
- 기존 회원 데이터: 이메일 기반 자동 매핑 (카페24 SNS 연동 설정 활용)

```
[설치 직후]
  - 진입 비용: 0원
  - 이탈 비용: 낮음 (아직 데이터 없음)

[3개월 후]
  - 전환 분석 데이터 축적
  - 이탈 비용: 중간 (분석 데이터 유실)

[6개월 후]
  - A/B 테스트 최적화 결과 축적
  - 이탈 비용: 높음 (최적화 히스토리 유실)
```

---

## 8. 핵심 결론

### 8.1 ScriptTag의 혁신성

1. **추가 설치 불필요** — 카페24가 자동으로 모든 페이지에 삽입
2. **부가기능 즉시 활성화** — ON/OFF만으로 기능 추가/제거
3. **확장성 무한대** — 미니 배너, 팝업, 소셜 프루프, AI 등 모두 ScriptTag로 가능
4. **이탈 비용 자동 증가** — 데이터 축적이 곧 lock-in 메커니즘

### 8.2 경쟁 우위

| 요소 | 차별점 |
|------|--------|
| **소셜 프로바이더** | 9종 (경쟁사 1~4종) |
| **부가기능** | ScriptTag 기반 무한 확장 가능 |
| **AI** | Cloudflare Workers AI 무료 티어 활용 |
| **가격** | 소셜 로그인 완전 무료 + 부가기능 후불제 |
| **생태계** | supa24, VuDrop, 오팀장 등 수파레인 자체 서비스 연동 |

### 8.3 우선 구현 순서 (필수)

1. **Phase 1 (MVP)**
   - 소셜 로그인 9종 ✅ (거의 완료)
   - 스마트 버튼 ✅ (거의 완료)
   - 미니 배너 + AI 카피라이터
   - 카카오 채널 연동
   - 모바일 테스트 (전 프로바이더)

2. **Phase 2 (출시 후 1~2개월)**
   - 소셜 프루프 위젯
   - 이탈 팝업
   - 프로바이더별 분석 대시보드

3. **Phase 3 (차별화)**
   - AI A/B 테스트 최적화
   - AI 세그먼트 분석
   - supa24 Discord 커뮤니티 연동

4. **Phase 4 (생태계)**
   - 크레딧 쿠폰 시스템
   - VuDrop 포장 영상 알림

---

## 9. 참고 자료

### 문서 링크
- **경쟁사_분석.md**: 1초가입, 해피싱크, 오모조인, 알파푸시 상세 분석
- **전략_및_MVP.md**: 수익 모델, 로드맵, MVP 정의
- **기술스펙_v1.md**: API 설계, 위젯 구조, 보안
- **cafe24_appstore_analysis.md**: 카페24 참고 앱 5개 (ScriptTag 활용 패턴)
- **소셜연동_설계.md**: OAuth 플로우, 카페24 SSO 설정 상세

### 카페24 API 문서
- ScriptTag API: `POST /admin/v2.1/stores/{mall_id}/scripttags`
- 제약: 쇼핑몰당 최대 5개 ScriptTag 저장소

### 공개 자료
- 1초가입 특허: 30-2020-0039257 (UI 디자인)
- Cloudflare Workers: https://developers.cloudflare.com/workers
- Hono: https://hono.dev

