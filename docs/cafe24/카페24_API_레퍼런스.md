# 카페24 API 레퍼런스 — 번개가입 필요 API 정리

> **작성일**: 2026-04-01 19:33 KST
> **최종 수정**: 2026-04-01 21:31 KST
> **목적**: 번개가입 구현에 필요한 카페24 API 스펙을 한 곳에 정리
> **출처**: 카페24 공식 개발자 문서 (developers.cafe24.com) + 실테스트 결과

---

## 1. Front JavaScript SDK (CAFE24API)

> ScriptTag에서 사용하는 클라이언트 측 SDK. 직접 fetch 호출은 CORS 차단됨 — **반드시 SDK 경유**.

### 1.1 초기화

```javascript
// client_id는 앱 설치 시 발급. 서버에서 ScriptTag JS에 런타임 주입.
CAFE24API.init({ client_id: 'D786ohzUHVsjrjGOTdbx0A' });
```

### 1.2 전역 변수

| 변수 | 설명 |
|------|------|
| `CAFE24API.MALL_ID` | 쇼핑몰 ID (예: suparain999) |
| `CAFE24API.SHOP_NO` | 멀티샵 번호 (기본 1) |

### 1.3 HTTP 메서드 (콜백 방식만 지원, Promise 불가)

```javascript
// GET
CAFE24API.get('/api/v2/products/{product_no}', function(err, res) {
  if (err) console.error(err);
  else console.log(res);
});

// POST
CAFE24API.post('/api/v2/carts', { product_no: 15, quantity: 1 }, function(err, res) {
  // ...
});

// PUT, DELETE도 동일 패턴
```

### 1.4 전체 SDK 메서드 목록 (공식 문서 기준)

> 출처: https://developers.cafe24.com/app/front/common/frontsdk

#### 회원 관련

| 메서드 | 용도 | Scope | 응답 |
|--------|------|-------|------|
| `getCustomerIDInfo(cb)` | 고객 아이디 조회 | `mall.read_application` | `{ id: { guest_id, member_id } }` |
| `getEncryptedMemberId(client_id, cb)` | 암호화 회원ID (JWT) | `mall.read_customer` | `{ member_id: "eyJ...", guest_id }` |
| `getCustomerInfo(cb)` | **회원 상세 정보** | `mall.read_customer` | `{ customer: { member_id, name, email, phone, group_no, group_name, birthday, nick_name, created_date } }` |
| `getLoginProvider(cb)` | **현재 로그인 SNS** | `mall.read_application` | `{ login: { member_id, provider, client_id } }` — provider: "sso", "kakao", "naver" 등 |
| `getCustomerProvider(cb)` | **연동된 모든 SNS** | `mall.read_application` | `{ login: { member_id, provider: ["naver","kakao"] } }` |

#### 적립금/예치금

| 메서드 | 용도 | Scope | 응답 |
|--------|------|-------|------|
| `getPointInfo(cb)` | **적립금 조회** | `mall.read_customer` | `{ point: { available_point, total_point, used_point } }` |
| `getCreditInfo(cb)` | 예치금 조회 | `mall.read_customer` | `{ credit: { all_credit, total_credit, used_credit } }` |

#### 장바구니

| 메서드 | 용도 | Scope | 응답 |
|--------|------|-------|------|
| `getCartList(cb)` | 장바구니 목록 | `mall.read_personal` | `{ carts: [{ product_no, variant_code, quantity, product_price }] }` |
| `getCartInfo(cb)` | 장바구니 총 금액 | `mall.read_personal` | `{ cart: { basket_price } }` |
| `getCartCount(cb)` | 장바구니 개수 | `mall.read_personal` | `{ count: 2 }` |
| `getCartItemList(cb)` | **장바구니 품목 상세** (주문서용) | `mall.read_order` | `{ items: [{ product_no, product_name, price, quantity, categories }] }` |
| `addCartItem(params, cb)` | **장바구니 상품 추가** | 미확인 | 장바구니에 상품 담기 |
| `addCartMultiItem(params, cb)` | 다수 품목 담기 | 미확인 | 복수 상품 일괄 담기 |
| `clearCart(cb)` | 장바구니 비우기 | 미확인 | 전체 삭제 |
| `removeCartItem(params, cb)` | 특정 품목 삭제 | 미확인 | 지정 품목 삭제 |

#### 기타

| 메서드 | 용도 | Scope |
|--------|------|-------|
| `getCouponCount(cb)` | **회원 쿠폰 개수** | 미확인 |
| `getWishCount(cb)` | 관심상품 개수 | 미확인 |
| `getShopInfo(cb)` | 쇼핑몰 정보 | 미확인 |
| `getOrderDetail(order_id, cb)` | 주문 상세 조회 | 미확인 |

#### 번개가입 핵심 활용 메서드

```
[필수]
getCustomerIDInfo()    → 로그인 상태 감지 (member_id 유무)
getLoginProvider()     → "sso"로 로그인했는지 확인 (번개가입 사용자 식별!)
getPointInfo()         → 적립금 표시 ("가입하면 3,000원 적립!")

[높은 활용도]
getCustomerInfo()      → 회원 상세 (이름, 이메일, 등급, 가입일)
getCustomerProvider()  → 연동된 소셜 목록 (마이페이지 위젯에 활용)
getCartList()          → 장바구니 분석 (R10 세션 리포트)
addCartItem()          → 장바구니 자동 담기 (R4 옵션 선택 후 가입 시)

[참고]
getCouponCount()       → "쿠폰 N장 보유" 표시
getCartCount()         → "장바구니 N개" 뱃지
```

### 1.5 사용 가능한 Front API 엔드포인트

| 엔드포인트 | 용도 | 인증 |
|-----------|------|------|
| `/api/v2/products` | 상품 목록/상세 | 공개 |
| `/api/v2/products/{no}` | 상품 상세 (이름, 가격, 재고, 카테고리) | 공개 |
| `/api/v2/categories` | 카테고리 목록 | 공개 |
| `/api/v2/carts` | 장바구니 조회/추가/삭제 | 회원 본인 |
| `/api/v2/customers` | 회원 정보 | 회원 본인 |

### 1.6 실테스트 결과 (2026-04-01)

| 항목 | 결과 | 비고 |
|------|:----:|------|
| `CAFE24API.init()` | ✅ | client_id 서버 주입 |
| `.get()` 상품 조회 | ✅ | product_name, price, category 전부 성공 |
| `.post()` 장바구니 | △ | 호출 가능, body 형식 보정 필요 (에러 `{}`) |
| `getMemberInfo()` | 미테스트 | 다음 Phase에서 테스트 |
| `getCartItemList()` | 미테스트 | 다음 Phase에서 테스트 |
| 직접 fetch | ❌ 401 | "not an allowed client_id" — SDK만 사용 가능 |

### 1.7 제약사항

- **CORS**: ScriptTag에서 직접 fetch 불가, CAFE24API SDK만 사용
- **콜백 전용**: Promise/async-await 미지원
- **Rate Limit**: Leaky Bucket 방식
- **심사 주의**: ScriptTag 내에서 카페24 Admin API 직접 호출 금지 (심사 탈락 사유)

---

## 2. Admin API — 쿠폰

> 서버(Cloudflare Worker)에서 호출. 가입 시 자동 쿠폰 발급에 사용.

### 2.1 쿠폰 목록 조회

```
GET /api/v2/admin/coupons
Scope: mall.read_promotion
```

### 2.2 쿠폰 생성 ✅ 실테스트 성공 (2026-04-01)

```
POST /api/v2/admin/coupons
Scope: mall.write_promotion
Header: X-Cafe24-Api-Version: 2026-03-01 (필수!)

Body:
{
  "shop_no": 1,
  "request": {
    "coupon_name": "번개가입 환영 쿠폰",
    "benefit_type": "A",                    // A=정액, B=정률, E=배송비무료
    "discount_amount": {
      "benefit_price": 3000                 // ★ 객체 안에 정수!
    },
    "discount_rate": null,
    "available_period_type": "F",           // F=고정기간, R=발급일기준
    "available_begin_datetime": "2026-04-02T00:00:00+09:00",
    "available_end_datetime": "2026-05-02T23:00:00+09:00",
    "available_site": ["W", "M"],           // ★ 생성시 배열 (조회시 쉼표문자열!)
    "available_scope": "O",                 // O=주문쿠폰
    "available_amount_type": "E",
    "available_coupon_count_by_order": 1,
    "available_price_type": "U",
    "available_payment_method": ["all"],
    "issue_type": "A",                      // A=자동발급, M=특정회원
    "issue_sub_type": "J",                  // ★ J=가입시! D=배송시, O=주문시
    "issue_member_join": "T",               // 환영쿠폰 활성화
    "issue_member_join_recommend": "F",
    "issue_member_join_type": "N",          // N=제한없음
    "issue_reserved": "F",
    "issue_order_date": "F"
  }
}

응답 (201 Created):
{ "coupon": { "coupon_no": "6084814586800005034", ... } }
```

### 2.3 쿠폰 발급 ✅ 실테스트 성공 (2026-04-01)

```
POST /api/v2/admin/coupons/{coupon_no}/issues
Scope: mall.write_promotion

Body:
{
  "request": {
    "issued_member_scope": "A"              // A=전체회원, M=특정회원
    // M일 때: "issued_member_id": ["member1", "member2"]
  }
}

응답 (201 Created):
{ "issues": { "shop_no": 1, "count": { "coupon_no": 12 } } }
```

### 2.5 정률할인 쿠폰 생성 ✅ 실테스트 성공 (2026-04-01)

```
benefit_type: 'B' 일 때:

"discount_amount": null,
"discount_rate": {
  "benefit_percentage": 10,                // 10% 할인
  "benefit_percentage_round_unit": "10",   // 10원 단위 절사 (★ 문자열!)
  "benefit_percentage_max_price": 5000     // 최대 할인금액 (null 가능)
}
```

### 2.7 쿠폰 상태 변경/삭제 ✅ 실테스트 성공 (2026-04-01)

```
PUT /api/v2/admin/coupons/{coupon_no}
Scope: mall.write_promotion

일시정지 (자동/수동 발급 모두 중지, 이미 발급된 쿠폰은 영향 없음):
{ "shop_no": 1, "request": { "status": "pause", "immediate_issue_pause": "I" } }

재개:
{ "shop_no": 1, "request": { "status": "restart", "immediate_issue_restart": "I" } }

삭제:
{ "shop_no": 1, "request": { "status": null, "deleted": "D" } }
// ★ deleted는 'D' (T가 아님!) — 보내면 진짜 삭제됨
```

#### ⚠️ 함정: `issue_member_join` 단독 PUT은 카페24가 거부 (2026-03-01 검증)

**시도 → 실패 사례** (2026-05-02, suparain888 검증):
```jsonc
// ❌ 422 "Whether coupon is deleted is a required field. (parameter.deleted)"
{ "shop_no": 1, "request": { "issue_member_join": "F" } }

// ❌ 422 "Input value in [Whether coupon is deleted] is invalid"
{ "shop_no": 1, "request": { "deleted": "F", "issue_member_join": "F" } }
{ "shop_no": 1, "request": { "deleted": false, "issue_member_join": "F" } }
```

**원인**: `deleted` 필드는 `'D'` 외 값 거부. 보내면 진짜 삭제됨. 그리고 `issue_member_join`만 단독으로 변경하는 PUT 패턴 자체를 카페24가 의미 있는 요청으로 받지 않음 (`status`/`deleted`/`immediate_*` 중 하나는 필요).

**해결**: 자동발급 ON/OFF 토글이 필요할 때도 `status: 'pause' / 'restart'` + `immediate_issue_*: 'I'` 패턴 사용. 이는 자동/수동 발급 전체를 중지/재개하지만 이미 발급된 쿠폰은 영향 없음 (`is_stopped_issued_coupon`은 별도 필드).

**프로젝트 적용**: `services/coupon-pack.ts` `togglePackCoupon(action: 'pause' | 'restart')` 단일 헬퍼로 통합. `pauseCouponPack` / `resumeCouponPack` / `unregisterCouponPack` 모두 같은 path 사용.

#### ⚠️ 함정 2: 카페24는 멱등하지 않음 (status transition 거부)

이미 desired state인 쿠폰에 transition 시도 시 422:
- `restart` 시 이미 active: `"Coupons in active status cannot be reactivated"`
- `pause` 시 이미 paused: 유사 메시지 추정

**해결**: 호출 측에서 `status===422 && /cannot be (reactivated|paused)/.test(message)` 인 응답을 success로 처리하는 멱등 가드. 부분 실패 후 재시도, 카페24 어드민에서 수동 변경 시점에서도 안전. `togglePackCoupon` 내부에 가드 내장.

회원별 발급 쿠폰 삭제:
```
DELETE /api/v2/admin/customers/{member_id}/coupons/{coupon_no}
```

### 2.8 쿠폰 생성 전체 파라미터 (공식 문서 + 실테스트 확인)

```
[필수]
coupon_name              쿠폰명 (1~50자)
benefit_type             A=정액, B=정률, C=적립금액, D=적립율, E=배송비무료, F=즉시적립
issue_type               M=대상자지정, A=조건부자동, D=다운로드, R=정기자동
available_period_type    F=고정기간, R=발급일기준, M=당월말
available_site           ['W','M','P'] (배열!)
available_coupon_count_by_order  주문당 최대 사용 수 (1~999)

[할인금액 (benefit_type에 따라)]
discount_amount          { benefit_price: 3000 }  ← 정수!
discount_rate            { benefit_percentage: 10,
                           benefit_percentage_round_unit: '10',  ← 문자열!
                           benefit_percentage_max_price: 5000 }

[기간 (available_period_type에 따라)]
available_begin_datetime  'F'일 때 필수
available_end_datetime    'F'일 때 필수
available_day_from_issued 'R'일 때 필수 (1~999일)

[발급 조건 (issue_type/issue_sub_type에 따라)]
issue_sub_type           J=가입, D=배송, A=생일, P=후기, O=주문, F=첫구매, T=전체
issue_member_join        'J'일 때 필수 — T/F
issue_member_join_recommend  'J'일 때 필수 — T/F
issue_member_join_type   'J'일 때 필수 — A/O/S/E/N
issue_count_per_once     1회 발급수량 (1~10)
issue_limit              발급수 제한 — T/F
same_user_reissue        동일인 재발급 — T/F (issue_limit 'T'일 때)
issue_max_count          최대 발급수 (1~999)
issue_max_count_by_user  동일인 최대수 (0~999)

[범위]
available_scope          O=주문쿠폰, P=상품쿠폰 (기본 O)
available_product        U=제한없음, I=선택적용, E=선택제외
available_category       U=제한없음, I=선택적용, E=선택제외
available_amount_type    E=할인전금액, I=할인후금액
available_price_type     U=제한없음, O=주문금액, P=상품금액

[기타]
show_product_detail      상품상세 노출 — T/F
available_payment_method ['all'] 또는 ['R','C','A',...] (배열)
send_sms_for_issue       SMS 발송 — T/F
send_email_for_issue     이메일 발송 — T/F
issue_reserved           예약 발행 — T/F
issue_order_date         주문기간 설정 — T/F
```

### 2.9 쿠폰 발급(issues) 파라미터 ✅ 특정 1명 발급 성공 (2026-04-01)

```
POST /api/v2/admin/coupons/{coupon_no}/issues

[특정 회원 1명에게 1장 발급] ← 번개가입 핵심 시나리오
{
  "shop_no": 1,
  "request": {
    "issued_member_scope": "M",        // A=전체, G=등급, M=특정회원
    "member_id": "bbbig",              // ★ 문자열! (배열 아님, issued_member_id 아님!)
    "allow_duplication": "T",          // T=중복허용
    "single_issue_per_once": "T",      // ★ T=1장만, F=issue_count_per_once만큼
    "send_sms_for_issue": "F"
  }
}

→ 응답: { "issues": { "count": { "coupon_no": 1 } } }  ← 1명 1장!

[전체 파라미터]
issued_member_scope      A=전체, G=특정등급, M=특정회원 (필수)
member_id                회원아이디 (scope M일 때 — 문자열!)
group_no                 회원등급번호 (scope G일 때)
allow_duplication        T/F/S (기본 F)
single_issue_per_once    T=1장, F=다수 (기본 T)
issue_count_per_once     다수 발행시 수량 (최소2, 최대10, 기본2)
send_sms_for_issue       T/F (기본 F)
issued_place_type        W=웹, M=모바일, P=브랜드앱
issued_by_action_type    INSTALLATION / ACCEPTING_PUSH
issued_by_event_type     C/U/B/R/Z/Y/X/M/W/V/L
request_admin_id         발급자 ID

응답 property:
  coupon_no, issue_no, member_id, group_no, issued_date,
  expiration_date, used_coupon, used_date, related_order_id, count
```

### 2.10 쿠폰 상태 변경 파라미터

```
PUT /api/v2/admin/coupons/{coupon_no}

status                   pause=일시정지, restart=재개, null=삭제시
deleted                  D=삭제
immediate_issue_pause    I=즉시정지
immediate_issue_restart  I=즉시재개
```

### 2.11 실테스트 결과 요약 — 전체 ✅ 성공

| API | 결과 | 비고 |
|-----|:----:|------|
| 쿠폰 생성 (정액 A) | ✅ | `discount_amount: { benefit_price: 3000 }` |
| 쿠폰 생성 (정률 B) | ✅ | `discount_rate: { benefit_percentage: 10 }` |
| 쿠폰 생성 (가입시 자동 J) | ✅ | `issue_type: 'A', issue_sub_type: 'J'` |
| 쿠폰 발급 (전체 A) | ✅ | `issued_member_scope: 'A'` → 12명 |
| **쿠폰 발급 (특정 1명 M)** | **✅** | `member_id: 'bbbig'` + `single_issue_per_once: 'T'` → **1명 1장** |
| 쿠폰 일시정지 | ✅ | `status: 'pause'` |
| 쿠폰 삭제 | ✅ | `deleted: 'D'` |

> **쿠폰 CRUD + 개인 발급 전체 검증 완료.** 번개가입 MVP에서 가입 시 쿠폰 자동 발급 구현 가능.

### 2.12 삽질 포인트 (실테스트에서 발견)

| 함정 | 올바른 방법 |
|------|-----------|
| `discount_amount: "3000"` | ❌ → `discount_amount: { benefit_price: 3000 }` (객체+정수) |
| `discount_rate: 10` | ❌ → `discount_rate: { benefit_percentage: 10, benefit_percentage_round_unit: '10' }` |
| `available_site: "W,M"` | 생성시 `["W","M"]` (배열), 조회시 `"W,M"` (쉼표문자열) |
| `benefit_price: "3000.00"` | ❌ → `3000` (정수) |
| `benefit_percentage_round_unit: 'F'` | ❌ → `'10'` (절사 단위, 정수 문자열) |
| `deleted: 'T'` | ❌ → `'D'` |
| `issue_sub_type: 'J'`만 입력 | ❌ → `issue_member_join` + `recommend` + `type` 3개 필수 |
| API 버전 헤더 없이 호출 | ❌ → `X-Cafe24-Api-Version: 2026-03-01` 필수 |

### 2.3 회원별 쿠폰 조회

```
GET /api/v2/admin/customers/{member_id}/coupons
Scope: mall.read_promotion
```

### 2.4 쿠폰 삭제

```
DELETE /api/v2/admin/customers/{member_id}/coupons/{coupon_id}
Scope: mall.write_promotion
```

### 2.5 번개가입 구현 시나리오

```
[가입 시 자동 쿠폰 발급 플로우]

1. 사전 준비 (1회):
   - 카페24 관리자에서 "번개가입 환영 쿠폰" 생성 (예: 3,000원 할인)
   - 생성된 coupon_no를 번개가입 설정에 저장

2. 회원 가입 웹훅 수신:
   - 카페24 → POST /api/cafe24/webhook (member.join)
   - webhook body에서 member_id 추출

3. 쿠폰 자동 발급:
   - POST /api/v2/admin/coupons/issues
   - coupon_no + member_id로 발급

4. 발급 결과 기록:
   - DB에 발급 이력 저장 (중복 방지)
   - AI 보고 데이터에 포함
```

---

## 3. Admin API — 적립금 (마일리지)

> 서버에서 호출. 가입 시 자동 적립금 지급에 사용.

### 3.1 적립금 조회

```
GET /api/v2/admin/points
Scope: mall.read_mileage
```

### 3.2 적립금 지급/차감

```
POST /api/v2/admin/points
Scope: mall.write_mileage

Body:
{
  "request": {
    "member_id": "member_id1",
    "points": 3000,           // 양수=적립, 음수=차감
    "type": "manual",         // manual: 수동 적립
    "memo": "번개가입 환영 적립금"
  }
}
```

### 3.3 현재 Scope 상태

```
현재 cafe24.ts에 등록된 scope:
  ✅ mall.read_promotion   — 쿠폰/혜택 조회
  ✅ mall.write_promotion  — 쿠폰 발급
  ❌ mall.read_mileage     — 적립금 조회 (미등록)
  ❌ mall.write_mileage    — 적립금 지급 (미등록)

→ 적립금 API 사용 시 scope 추가 + 앱 재설치 필요
→ 또는 적립금이 mall.write_customer에 포함되어 있는지 실테스트 필요
```

### 3.4 번개가입 구현 시나리오

```
[가입 시 자동 적립금 지급 플로우]

1. 관리자 설정:
   - 온보딩에서 가입 적립금 금액 설정 (예: 3,000원)

2. 회원 가입 웹훅 수신:
   - member.join 웹훅 → member_id 추출

3. 적립금 자동 지급:
   - POST /api/v2/admin/points
   - member_id + 금액 + 메모("번개가입 환영 적립금")

4. 지급 결과 기록 + AI 보고
```

---

## 4. Admin API — 혜택 (Benefits)

```
GET    /api/v2/admin/benefits          — 혜택 목록 조회
POST   /api/v2/admin/benefits          — 혜택 생성
PUT    /api/v2/admin/benefits/{no}     — 혜택 수정
DELETE /api/v2/admin/benefits/{no}     — 혜택 삭제

Scope: mall.read_promotion / mall.write_promotion
```

---

## 5. Admin API — 매출/통계

### 5.1 매출 리포트

| 엔드포인트 | 용도 | Scope |
|-----------|------|-------|
| `GET /admin/reports/hourlysales` | 시간별 매출 | `mall.read_salesreport` |
| `GET /admin/reports/productsales` | 상품별 매출 | `mall.read_salesreport` |
| `GET /admin/reports/salesvolume` | 판매 통계 | `mall.read_salesreport` |
| `GET /admin/financials/dailysales` | 일별 매출 | `mall.read_salesreport` |
| `GET /admin/financials/monthlysales` | 월별 매출 | `mall.read_salesreport` |

### 5.2 번개가입 활용

- **AI 일일보고**: dailysales로 매출 집계
- **매출 연동 예산**: monthlysales로 전월 매출 → 예산 자동 계산
- **피크 시간 분석**: hourlysales로 최적 노출 타이밍 결정
- **인기 상품 파악**: productsales로 크로스셀 데이터 보강

---

## 6. 앱스토어 출시 가이드

### 6.1 심사 소요 기간

- 앱 제출부터 출시까지 **영업일 6~12일**
- 시스템 심사 + 정보보안 심사

### 6.2 심사 기준 (거절 사유)

| 항목 | 설명 |
|------|------|
| 개인정보처리방침 미등록 | 필수 |
| SSL 인증서 미설치 | 대표 도메인 SSL 필수 |
| 영문 도메인 미설정 | 한글 도메인 미지원 |
| 앱 내 카페24 API 직접 호출 | ScriptTag 내 Admin API 호출 시 탈락 |
| 성인/음란 콘텐츠 | 탈락 |

### 6.3 출시 전 필수 준비물

| 항목 | 상태 |
|------|:----:|
| SSL 인증서 (bg.suparain.kr) | ✅ Cloudflare 자동 |
| 영문 도메인 | ✅ bg.suparain.kr |
| 개인정보처리방침 | ❌ 작성 필요 |
| 앱 아이콘 이미지 | ❌ 제작 필요 |
| 스크린샷 이미지 | ❌ 제작 필요 |
| 앱 설명 문구 | ❌ 작성 필요 |
| 상세페이지 | ❌ 작성 필요 |

### 6.4 출시 체크리스트

```
□ SSL 인증서 확인
□ 영문 도메인 설정
□ 개인정보처리방침 등록
□ 앱 아이콘/스크린샷/스플래시 이미지 제작
□ 앱스토어 상세페이지 작성
□ 앱 설명 문구 작성
□ 시스템 심사 통과
□ 정보보안 심사 통과
```

---

## 7. 할인 앱 제작 구조 (참고)

> 번개가입은 "할인 앱"이 아니지만, 동일한 CAFE24API SDK를 사용하므로 참고.

### 7.1 할인 앱 동작 프로세스

```
1. ScriptTag에서 CAFE24API.init(client_id)
2. CAFE24API.getCartItemList() → 장바구니 정보 획득
3. CAFE24API.getMemberInfo() → 회원 정보 획득
4. 앱 백엔드로 정보 전송 → 할인 로직 수행 → HMAC 서명
5. AppCallback.setDiscountPrice(result) → 카페24에 할인 반영
```

### 7.2 HMAC 스펙

```
알고리즘: sha256
키: Service_key (개발자센터 발급, 절대 외부 노출 금지)
guest_key: 회원=md5(member_id), 비회원=EC_GUEST_KEY
```

### 7.3 번개가입에 적용 가능한 부분

- `getMemberInfo()` → 로그인 상태 정확한 감지 (현재 DOM 기반보다 정확)
- `getCartItemList()` → 장바구니 분석, R10 세션 리포트
- `MALL_ID` / `SHOP_NO` → 멀티샵 환경 대응

---

## 8. Scope 전체 현황

### 현재 등록된 Scope (18개) — 2026-04-01 확정

> 카페24 개발자센터 + cafe24.ts 코드 동기화 완료

| # | 카테고리 | Scope | 권한 | 용도 |
|---|---------|-------|:----:|------|
| 1 | 앱(Application) | `mall.read_application` | R | 앱 설정 조회, SDK getCustomerIDInfo/getLoginProvider |
|   |                 | `mall.write_application` | W | 앱 설정 수정 |
| 2 | 상품분류(Category) | `mall.read_category` | R | 카테고리 트리, 기획전, 메인진열 |
| 3 | 상품(Product) | `mall.read_product` | R | 상품/재고/가격/옵션 조회 |
| 4 | 판매분류(Collection) | `mall.read_collection` | R | 브랜드, 자체분류, 제조사, 트렌드 |
| 5 | 공급사(Supply) | `mall.read_supply` | R | 공급사 정보 |
| 6 | 개인화정보(Personal) | `mall.read_personal` | R | **장바구니, 관심상품, 좋아요** |
| 7 | 주문(Order) | `mall.read_order` | R | 주문 이력, SDK getCartItemList |
| 8 | 회원(Customer) | `mall.read_customer` | R | 회원 조회, SDK getCustomerInfo/getPointInfo |
|   |               | `mall.write_customer` | W | 회원 정보 수정 |
| 9 | 상점(Store) | `mall.read_store` | R | 쇼핑몰 기본 정보, 설정 |
|   |            | `mall.write_store` | W | 쇼핑몰 설정 수정 |
| 10 | 프로모션(Promotion) | `mall.read_promotion` | R | **쿠폰/혜택/시리얼쿠폰 조회** |
|    |                    | `mall.write_promotion` | W | **쿠폰 발급, 혜택 생성** |
| 11 | 매출통계(Salesreport) | `mall.read_salesreport` | R | 일별/월별/시간별/상품별 매출 |
| 12 | 개인정보(Privacy) | `mall.read_privacy` | R | 고객 개인정보 조회 |
| 13 | 배송(Shipping) | `mall.read_shipping` | R | 배송/반품 설정 |

### 적립금(Mileage) Scope — MVP에서 제외

```
적립금(Mileage) scope는 카페24 개발자센터에서 별도 신청 필요한 민감 API.
(권한 설정 화면에 항목이 노출되지 않음)

[제외 이유] (2026-04-01 결정)
- 현금성 자산 → 보안 부담, 사고 시 책임 큼
- 심사 리스크 증가
- 쿠폰 발급(mall.write_promotion)으로 모든 혜택 집행 가능
- 향후 쇼핑몰 관리자 요청 많으면 그때 추가

[MVP 대안]
- 가입 혜택 = 쿠폰 발급 (POST /admin/coupons/{no}/issues)
- AI 예산 집행 = 쿠폰으로 대체
- 적립금 조회 = Front SDK getPointInfo()로 표시만 가능 (mall.read_customer)
- 적립금 직접 지급은 쇼핑몰 관리자가 카페24 관리자에서 직접 설정
```

---

## 9. 카페24 문의 필요사항

| # | 문의 | 이유 | 우선순위 |
|---|------|------|:--------:|
| **A** | `mall.write_mileage` scope 존재 여부 | 적립금 지급 API에 필요한 정확한 scope 확인 | 높음 |
| **B** | 쿠폰 발급 시 사전 쿠폰 등록 필요 여부 | API로 쿠폰 "생성"도 가능한지, 관리자에서 미리 만들어야 하는지 | 높음 |
| **C** | 앱스토어 심사 상세 체크리스트 | 정보보안 심사에서 구체적으로 뭘 검사하는지 | 중간 |
