# 테스트 코드 추적 문서

> 프로덕션에 배포된 테스트 코드를 추적하여 나중에 깔끔하게 삭제하기 위한 문서.
> 테스트 완료 후 이 문서에 기록된 파일/라인을 역순으로 제거하면 됨.

---

## [TEST-001] ScriptTag DOM 조작 기술 검증 — 콘솔 테스트 도구

- **목적**: 카페24 상품 상세 페이지의 구매/장바구니 버튼을 ScriptTag로 조작 가능한지 확인
- **배포일**: 2026-04-01
- **상태**: 🔴 활성 (프로덕션 배포됨)
- **엔드포인트**: `GET /widget/test.js`

### 변경 파일 목록

| # | 파일 | 변경 내용 | 삭제 방법 |
|---|------|----------|----------|
| 1 | `workers/api/src/widget/test-dom.ts` | **신규 파일** — 테스트 JS 소스 (9가지 테스트) | 파일 삭제 |
| 2 | `workers/api/src/index.ts` | import 추가: `import { TEST_DOM_JS } from './widget/test-dom';` | 해당 라인 삭제 |
| 3 | `workers/api/src/index.ts` | 라우트 추가: `app.get('/widget/test.js', ...)` 블록 (약 7줄) | 해당 블록 삭제 |

### 테스트 방법

쇼핑몰 상품 상세 페이지에서 브라우저 콘솔:
```javascript
var s=document.createElement('script');s.src='https://bg.suparain.kr/widget/test.js';document.head.appendChild(s);
```

좌측 상단 테스트 패널에서 9가지 테스트 실행 가능.

### 테스트 결과 (2026-04-01)

| # | 테스트 | 결과 |
|---|--------|:----:|
| 1 | 텍스트 변경 (BUY IT NOW → 바로구매) | ✅ |
| 2 | 배경색 변경 (빨강) | ✅ |
| 3 | 배경색 변경 (파랑) | ✅ |
| 4 | 빨강↔파랑 점멸 (0.8초 간격 CSS transition) | ✅ |
| 5 | 원복 (모든 변경 되돌리기) | ✅ |
| 6 | 미니배너 삽입 (구매 버튼 위, 전체 폭) | ✅ |
| 7 | 미니배너 제거 | ✅ |
| 8 | 오버레이 뱃지 (BUY 버튼 우하단, 점멸) | ✅ |
| 9 | 오버레이 제거 | ✅ |

---

## [TEST-002] BUY 버튼 점멸 뱃지 — 실제 ScriptTag 삽입 (모바일 테스트용)

- **목적**: 모바일 실기기에서 BUY 버튼 오버레이 뱃지가 정상 동작하는지 확인
- **배포일**: 2026-04-01
- **상태**: 🔴 활성 (프로덕션 buttons.js에 삽입됨)
- **영향 범위**: 테스트 쇼핑몰(suparain999)의 **모든 상품 상세 페이지**에 자동 적용

### 변경 파일 목록

| # | 파일 | 변경 내용 | 삭제 방법 |
|---|------|----------|----------|
| 1 | `workers/api/src/widget/buttons.ts` | 4개 테스트 함수 + init 호출 + CSS 주입 | 아래 삭제 절차 참조 |

### 삭제 절차

```
buttons.ts에서 삭제할 것 (// ─── [TEST] 주석으로 찾기):

1. initBuyBadge() 함수 전체     — BUY 버튼 좌상단 뱃지
2. initShippingBadge() 함수 전체 — 배송비 옆 무료배송쿠폰 뱃지
3. initSalesBadge() 함수 전체   — 상품명 옆 판매 카운트업 뱃지
4. initPriceEffect() 함수 전체  — 판매가 -3,000원 카운트다운

5. Initialize 블록의 호출부:
   - initBuyBadge();      (2곳: DOMContentLoaded + else)
   - initShippingBadge();  (2곳)
   - initSalesBadge();     (2곳)
   - initPriceEffect();    (2곳)

재배포: cd workers/api && npx wrangler deploy
```

### 동작 설명 (4가지 효과)

| 효과 | 선택자 | 설명 |
|------|--------|------|
| BUY 뱃지 | `#orderFixArea a.btnSubmit` (모바일) / `#actionBuy` (PC) | 좌상단 빨간 "3,000원 할인" 뱃지 + 0.7초 점멸 |
| 배송비 뱃지 | `.delv_price_B` | 파란 "회원가입 시 무료배송쿠폰" 뱃지 + pulse 점멸 |
| 판매 카운트업 | `.headingArea h1` | 주황 "오늘 N개 판매" 뱃지 + 3~5초마다 1~3 증가 |
| 가격 카운트다운 | `#span_product_price_text` | 빨간 "회원가 N원" + 1초 후 100원씩 감소 → -3,000원 완료 |

---

## [TEST-001 + TEST-002] 일괄 삭제 절차

```bash
# 1. 테스트 전용 파일 삭제
rm workers/api/src/widget/test-dom.ts

# 2. index.ts 에서 제거
#    - import { TEST_DOM_JS } from './widget/test-dom';
#    - app.get('/widget/test.js', ...) 블록

# 3. buttons.ts 에서 제거
#    - initBuyBadge() 함수 전체 (// ─── [TEST] ~ })
#    - initBuyBadge(); 호출 2곳

# 4. 재배포
cd workers/api && npx wrangler deploy

# 5. 이 문서의 상태를 ✅ 삭제 완료로 변경
```

---

## [TEST-003] localStorage 용량 검증 — 50개 상품 레코드

- **목적**: 행동 추론 시스템의 localStorage 저장 용량 확인 (50개 ProductRecord + Session + Profile)
- **배포일**: 2026-04-01
- **상태**: 🔴 활성
- **엔드포인트**: `GET /widget/test-storage.js`

### 변경 파일 목록

| # | 파일 | 변경 내용 | 삭제 방법 |
|---|------|----------|----------|
| 1 | `workers/api/src/widget/test-storage.ts` | **신규 파일** — localStorage 검증 스크립트 | 파일 삭제 |
| 2 | `workers/api/src/index.ts` | import + 라우트 추가 | 해당 라인/블록 삭제 |

### 테스트 방법

```javascript
var s=document.createElement('script');s.src='https://bg.suparain.kr/widget/test-storage.js';document.head.appendChild(s);
```

### 테스트 결과 (2026-04-01 13:11 KST) ✅ 성공

| 항목 | 결과 |
|------|------|
| 상품 레코드 50개 저장/파싱 | ✅ 성공 (50개) |
| `bg_product_history` | 75.90 KB |
| `bg_session` | 954 B |
| `bg_visitor_profile` | 770 B |
| 3개 키 합계 | 77.59 KB |
| Origin 전체 | 77.84 KB |
| **5MB 한도 대비** | **1.52%** — 전혀 문제없음 |

→ 50개 상품 레코드 + 세션 + 프로필 합쳐도 **localStorage 5MB 한도의 1.5%만 사용**. 충분한 여유.

---

## [TEST-004] Shadow DOM + IntersectionObserver 검증

- **목적**: closed Shadow DOM CSS 격리 + 스크롤 4구간(top/info/detail/review) 감지 확인
- **배포일**: 2026-04-01
- **상태**: 🔴 활성
- **엔드포인트**: `GET /widget/test-shadow-io.js`

### 변경 파일 목록

| # | 파일 | 변경 내용 | 삭제 방법 |
|---|------|----------|----------|
| 1 | `workers/api/src/widget/test-shadow-io.ts` | **신규 파일** — Shadow DOM + IO 검증 스크립트 | 파일 삭제 |
| 2 | `workers/api/src/index.ts` | import + 라우트 추가 | 해당 라인/블록 삭제 |

### 테스트 방법

```javascript
var s=document.createElement('script');s.src='https://bg.suparain.kr/widget/test-shadow-io.js';document.head.appendChild(s);
```

### 테스트 결과 (2026-04-01 13:12 KST) ✅ 성공

| 항목 | 결과 |
|------|------|
| Shadow DOM (closed) | ✅ Isolated — 호스트 CSS 격리 정상 |
| 스크롤 존 감지 | ✅ DETAIL → REVIEW 전환 정확히 감지 |
| 존 전환 히스토리 | ✅ 경과 시간과 함께 기록 |
| 패널 렌더링 | ✅ 호스트 페이지 레이아웃에 영향 없음 |

→ **R4 이탈 맥락 감지의 기술적 기반 확보**. 4구간 스크롤 존 실시간 감지 정상 동작.

---

## [TEST-005] Admin API Store/Categories/Products 응답 확인

- **목적**: 카페24 Admin API 응답 필드 확인 (온보딩 자동분석용)
- **배포일**: 2026-04-01
- **상태**: 🔴 활성
- **엔드포인트**: `GET /test/store-info?mall_id=suparain999`

### 변경 파일 목록

| # | 파일 | 변경 내용 | 삭제 방법 |
|---|------|----------|----------|
| 1 | `workers/api/src/routes/test.ts` | **신규 파일** — 테스트 라우트 | 파일 삭제 |
| 2 | `workers/api/src/index.ts` | import + 라우트 마운트 | 해당 라인 삭제 |

### 테스트 결과 (2026-04-01)

**1차 (scope 추가 전)**:

| API | 결과 | 비고 |
|-----|:----:|------|
| `/admin/store` | ✅ 성공 | 토큰 갱신 후 성공 |
| `/admin/categories` | ❌ 403 | `mall.read_category` scope 필요 |
| `/admin/products/count` | ❌ 403 | `mall.read_product` scope 필요 |

**2차 (scope 추가 + 앱 재설치 후)** ✅ **전체 성공**:

| API | 결과 | 핵심 데이터 |
|-----|:----:|------------|
| `/admin/store` | ✅ | shop_name=수파레인, condition=도소매, sales_product_categories=["Undecided"] |
| `/admin/categories` | ✅ | **19개 카테고리**, depth 1~4 (Outerwear, Tops, Jackets, Coats, Blazers, Tees 등) |
| `/admin/products/count` | ✅ | **상품 5개** |

**온보딩 자동분석 가능 확인**:
- `sales_product_categories`는 "Undecided"이지만 카테고리 트리로 **패션/의류** 추론 가능
- 카테고리 depth 4단계: 대분류→중분류→소분류→상세분류

---

## 완료된 테스트

(삭제 완료 시 위 항목을 여기로 이동)
