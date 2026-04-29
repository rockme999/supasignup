# Round 4 — 쿠폰팩 + 이탈 팝업 통합 명세 (검토용)

작성일: 2026-04-29 KST
상태: 사용자 합의 대기 (코드 수정 X)
관련 파일: `workers/api/src/widget/buttons.ts`, `widget/exit-intent.ts`, `services/coupon.ts`, `routes/dashboard.ts`, `routes/cafe24.ts`, `views/settings.tsx`, `views/plus-features.tsx`, `docs/schema.sql`

---

## 1. 배경 — 사용자 의도 4가지

1. **이탈 감지 팝업 + Exit-intent 쿠폰 게이트 합병** — 트리거가 겹쳐 동시 발동 가능. 별도 팝업 2개 대신 *이탈 감지 팝업에 쿠폰 옵션 흡수*.
2. **Free 쿠폰 정책 완화** — Free는 무료배송/정액/정률 *셋 중 하나*만 선택. (현재는 정률은 Plus 전용.)
3. **Plus 웰컴 쿠폰팩** — 5장 묶음(₩55,000 가치). 가입 직후 일괄 발급. 운영자 ON/OFF.
4. **쿠폰팩 그래픽 노출** — 이탈 팝업·에스컬레이션 배너에 "₩55,000 상당" 카드 노출.

> 사용자 명시 합계 ₩55,000 = 3,000+5,000+7,000+10,000+30,000. 원문의 "70,000원 할인"은 **7,000원 오타**로 정정 필요.

---

## 2. 현재 구조 (실측)

### 데이터 (`shops` JSON 컬럼)
- `coupon_config` — `{shipping, amount, rate, cafe24_coupons}`. 각 항목은 `enabled/expire_days/discount_*/min_order`. `cafe24_coupons.{shipping,amount,rate}_coupon_no`에 카페24 쿠폰 번호 저장. (`services/coupon.ts:22-45`)
- `popup_config` — 이탈 팝업 (title/body/ctaText/icon/preset/cooldownHours/allPages 등). 쿠폰 필드 **없음**. (`buttons.ts:1094-1229`)
- `escalation_config` — 토스트+플로팅 배너 (`toastText/floatingText/...`). 쿠폰 필드 **없음**. (`buttons.ts:1303-1507`)
- `exit_intent_config` — `{enabled, frequency_cap_hours, scroll_depth_threshold, coupon_type, headline, body}`. **쿠폰 1종 연동 게이트 단독 기능**. (`widget/exit-intent.ts`, 0028 마이그레이션)

### 발급 플로우
- 진입점: 카페24 웹훅 `90083 (member_joined)` → `routes/cafe24.ts:454-484` → `issueCouponOnSignup` (waitUntil).
- 발급 로직: `services/coupon.ts:386-491`. **`isFree`면 `couponNos.slice(0,1)` — 1장만 발급**. 그 외엔 enabled+coupon_no 있는 것 모두.
- 카페24 API: `POST /api/v2/admin/coupons/{coupon_no}/issues` — **장당 1회 호출** (벌크 API 미사용). `allow_duplication:'T'`, 401 시 refresh 1회 재시도.
- 쿠폰 생성: `syncCouponConfig` — `coupon_config` 저장 시 enabled+번호없는 것만 `POST /coupons`로 생성, `cafe24_coupons.*_coupon_no`에 캐시.
- 이력: `coupon_issues(shop_id, member_id, coupon_type, coupon_no, issued_at, used_at, order_id)`.

### Free 정책 (현재)
- `routes/dashboard.ts:625-662` PUT `/shops/:id/coupon`: Free는 `rate.enabled` 거부, `shipping`+`amount` 동시 켜기 거부, 세부값 강제(3,000원·30일 고정).
- `services/coupon.ts:421` 발급도 1장으로 제한.
- → **사용자 의도(셋 중 하나 선택)와 거의 일치**. "정률 금지"만 풀고, 세부값 고정은 유지/완화 결정 필요.

### 위젯 트리거 충돌 실측
- `initExitPopup` (popup_config): mouseout(top)·scroll-up 3연속 → 모달.
- `initExitIntent` (exit_intent_config): smart-trigger 엔진의 `exit-intent` 모드 + `scroll-depth` 모드 → 모달. `frequency_cap_hours`로 횟수 제한.
- `initEscalation`: 방문 N회차에 토스트→플로팅 배너 (별 트리거 — 충돌 없음).
- → **이탈 팝업과 Exit-intent가 같은 mouseout·scroll에 동시 반응**. 사용자 지적 정확.

---

## 3. 결정 포인트 8개 (옵션 + 추천)

### D1. Exit-intent 단독 기능 처리
- A. **완전 폐기 (이탈 팝업으로 흡수, 0028 컬럼 비활성)** ← **추천**
- B. URL/UI만 폐기, `exit_intent_config` 데이터 유지 (롤백 옵션)
- C. 두 팝업 병행 + 우선순위 규칙
- 트레이드오프: A는 코드 단순화·트리거 일원화. 단점은 `scroll_depth_threshold` 같은 Exit-intent 고유 옵션이 사라짐 — 이걸 popup_config로 이식하면 해결.

### D2. 이탈 팝업의 쿠폰 옵션 형태
- A. **드롭다운: "없음 / 단일쿠폰(타입선택) / 쿠폰팩(Plus만)"** ← **추천**
- B. 항상 쿠폰팩만 (Plus 전용), Free는 쿠폰 없음
- C. 쿠폰 옵션 분리 토글 2개
- 추천 이유: Free도 단일쿠폰 노출 가능 + Plus는 쿠폰팩 선택 가능 + 미설정 운영자엔 영향 없음.

### D3. Free 운영자 마이그레이션
- A. **기존 `coupon_config` 그대로 유지, 검증 로직만 완화 (정률도 허용)** ← **추천**
- B. SQL 마이그레이션으로 일괄 변환
- 추천 이유: 기존 운영자의 설정은 1종 켜진 상태이므로 새 정책("셋 중 하나")에 자동 부합. 변환 불필요.

### D4. 쿠폰팩 스키마 — 어디에 저장?
- A. `coupon_config.pack` 새 필드 (5장 정의 + cafe24 coupon_no 매핑) ← **추천**
- B. 신규 컬럼 `coupon_pack_config` (0031 마이그레이션)
- C. 5장 카페24 사전등록 → ID 리스트만 저장
- 추천 이유: A는 마이그레이션 없이 JSON 확장만으로 가능 + `syncCouponConfig`와 동일 패턴 재사용. 5장 스펙은 코드 상수로 고정(사용자가 "5종" 명시 → 변경 빈도 낮음), 운영자는 ON/OFF만 노출.

### D5. 쿠폰팩 발급 시점
- A. **가입 즉시 5장 일괄** ← **추천 (사용자 명시)**
- B. 단계별 (1주차/2주차…)
- 추천 이유: 사용자가 "즉시 일괄"로 명시. B는 별도 스케줄러 + 이탈률 추적 필요 — 1주차 범위 초과.

### D6. 쿠폰팩 유효기간
- A. **전 쿠폰 동일 N일 (기본 30일, 운영자 변경 가능)** ← **추천**
- B. 쿠폰별 개별 (3,000원짜리는 짧게, 30,000원짜리는 길게)
- 추천 이유: A는 단순. B는 발급 후 사용 데이터 쌓인 뒤 차후 최적화.

### D7. 카페24 5장 발급 전략
- A. **순차 5번 호출 + 부분 실패 허용 (성공한 것만 `coupon_issues` 기록, 실패는 로그+알림)** ← **추천**
- B. 트랜잭션식 — 1장 실패 시 발급된 것 회수
- C. 벌크 API (확인 결과 카페24는 쿠폰별 `/issues` 엔드포인트만 — 벌크 없음)
- 추천 이유: 카페24 회수 API의 안정성 미검증, 회수 도중 실패 시 더 큰 사고. 부분 실패 허용 + 모니터링이 안전. waitUntil 안에서 5장 직렬 호출 (병렬은 token 갱신 레이스 위험).

### D8. 쿠폰팩 그래픽 디자인
- A. **인라인 SVG 카드 (검은 쿠폰 + ₩55,000 + 카피)** ← **추천**
- B. 외부 이미지 URL
- 추천 이유: A는 위젯 단일 파일 자가완결, CDN/캐시 이슈 없음, 다크/라이트 프리셋 대응 쉬움. 기존 `initExitPopup` 모달 내부에 카드 컴포넌트로 삽입.

---

## 4. 데이터 모델 변경

### `coupon_config` 확장 (마이그레이션 SQL 불필요 — JSON 필드만 추가)

```ts
interface CouponConfig {
  shipping: { enabled, expire_days };
  amount:   { enabled, expire_days, discount_amount, min_order };
  rate:     { enabled, expire_days, discount_rate, min_order };
  cafe24_coupons?: { shipping_coupon_no?, amount_coupon_no?, rate_coupon_no?,
                     pack_coupon_nos?: number[] };  // 신규: 쿠폰팩 5장
  pack?: {                                          // 신규: Plus 웰컴팩
    enabled: boolean;
    expire_days: number;                            // 기본 30
    items: Array<{ min_order: number; discount_amount: number }>;
    // 기본값 (코드 상수, 운영자 미변경):
    // [{3000,3000},{50000,5000},{70000,7000},{100000,10000},{200000,30000}]
  };
}
```

### `popup_config` 확장 (마이그레이션 X)

```ts
interface PopupConfig {
  // ...기존 필드
  coupon_mode?: 'none' | 'single' | 'pack';   // 신규 (D2)
  coupon_type?: 'shipping' | 'amount' | 'rate'; // single 일 때
  scroll_depth_threshold?: number;            // exit_intent에서 이식
  frequency_cap_hours?: number;               // exit_intent에서 이식 (cooldownHours와 통합)
}
```

### `exit_intent_config` — Deprecate
- 신규 쇼핑몰엔 NULL. 기존 데이터는 존속(롤백 대비). UI는 폐기. 위젯의 `initExitIntent` 호출도 제거.
- 차후 0032 마이그레이션에서 컬럼 삭제 (1주 모니터링 후).

### `coupon_issues` (변경 없음)
- `coupon_type`이 'shipping'|'amount'|'rate'|**'pack_1'..'pack_5'**로 확장. 마이그레이션 불필요(TEXT).

---

## 5. Phase 분할 + 일정

전체 추정: **5~7일** (대리 1인 기준)

### Phase A — 데이터 모델 + 발급 서비스 (1.5일)
- `services/coupon.ts`: `CouponConfig.pack` 타입 + `syncCouponConfig`에 5장 생성 분기 + `issueCouponOnSignup`에 `pack` 분기 (5장 직렬 발급 + 부분 실패 허용).
- `routes/dashboard.ts` PUT `/shops/:id/coupon`: `pack.enabled` 검증 (Plus 전용), Free의 정률 금지 해제.
- 의존성: 없음. **선행 작업.**

### Phase B — 어드민 UI (1.5일)
- `views/settings.tsx` 쿠폰 설정: Free에서 정률 카드 활성화, "쿠폰팩(Plus 전용)" 토글 카드 신설.
- `views/plus-features.tsx` 이탈 팝업 페이지: "쿠폰 모드" 드롭다운 + scroll_depth/frequency_cap 옵션 이식.
- Exit-intent 페이지: deprecated 안내 문구 + 자동 리다이렉트(이탈 팝업으로) 또는 메뉴 제거.
- 의존성: Phase A.

### Phase C — 위젯 통합 (1.5일)
- `widget/buttons.ts initExitPopup`: 쿠폰 모드 분기 — single은 기존 Exit-intent 게이트 모달에 가깝게, pack은 새 쿠폰팩 카드. trigger 통합 (smart-trigger 엔진 사용으로 mouseout/scroll 일원화).
- `widget/exit-intent.ts`: 호출 제거 + 파일 삭제 (또는 deprecated 마크).
- `widget/buttons.ts initEscalation` 플로팅 배너: pack 활성 시 `${총가치}원 상당 웰컴팩` 메시지 + 쿠폰팩 미니 카드 옵션.
- 의존성: Phase A·B.

### Phase D — 쿠폰팩 그래픽 + 통합 검증 (1일)
- 인라인 SVG 쿠폰 카드 컴포넌트 (light/dark 자동).
- E2E: Plus 신규 가입 → 5장 발급 → 이탈 팝업 노출 → 에스컬레이션 노출. 부분 실패 시뮬레이션.
- 의존성: Phase A·B·C.

### Phase E (선택, 0.5~1일) — 모니터링 + 정리
- 쿠폰팩 발급 성공률 대시보드 카드.
- `exit_intent_config` 컬럼 0032 마이그레이션 (1주 후).

---

## 6. 리스크 + 대응

| # | 리스크 | 영향 | 대응 |
|---|---|---|---|
| R1 | **5장 발급 중 부분 실패** (token 만료, rate-limit, 카페24 장애) | 운영자/회원 클레임 | waitUntil 안에서 직렬 호출, 401만 1회 재시도, 실패 건은 `coupon_issues`에 미기록 + 별도 `coupon_issue_failures` 도입(차후) 또는 console.error + 주간 보고서 노출. **부분 발급 가능 정책** 사용자 합의 필요. |
| R2 | **카페24 쿠폰 자동생성 실패** (쇼핑몰 권한 부족·정책 위반) | 발급 자체 불가 | `syncCouponConfig`에서 5장 중 일부만 성공 시에도 저장. 운영자 화면에 "생성된 쿠폰 N/5" 뱃지. |
| R3 | **트리거 통합 회귀** — 기존 popup_config 운영자가 보던 동작 변화 | 사용자 컴플레인 | 쿠폰 모드 기본값 = `none` (기존 동작 유지). |
| R4 | **Exit-intent 페이지 삭제 — 즐겨찾기/링크 깨짐** | 사용자 혼란 | URL 1개월 유지 + 이탈 팝업 페이지로 안내 배너. |
| R5 | **Free 정률 허용 = 쇼핑몰 마진 침해 우려** | 운영자가 모르고 큰 할인율 설정 | UI에 "최대 할인율 권장 10%" 가이드. |
| R6 | **쿠폰팩 5장 가치(₩55,000)가 Plus 가입자에게도 부담** | 운영자가 끄고 싶어함 | ON/OFF 토글 + items 운영자 편집 옵션은 Phase E로 미룸. |

---

## 7. 합의 요청 (사용자 검토 포인트)

1. **D1**: Exit-intent 단독 기능을 **완전 폐기**하고 이탈 팝업으로 흡수해도 OK?
2. **D7 부분 실패 정책**: 5장 중 N장 실패 시 **성공한 것만 발급 유지**해도 OK? (회수 X)
3. **D6 유효기간**: 쿠폰팩 5장 모두 **동일 30일** 기본값 OK? 아니면 큰 금액일수록 길게?
4. **쿠폰팩 5번 항목**: 사용자 원문 "70,000원이상 70,000원 할인" → **7,000원 할인**으로 정정 OK? (총 ₩55,000 합산 일치)
5. **Free 정률 허용**: Free에서 정률할인을 **허용**하되 세부값(할인율 한도)은 어떻게?  
   (a) Plus와 동일 1~100% 자유 / (b) Free는 5/7/10% 프리셋만 / (c) 기타
6. **쿠폰팩 그래픽**: 첨부 이미지(검은 쿠폰)와 **유사한 톤**으로 갈지, 번개가입 브랜드 컬러로 별도 디자인할지?
7. **에스컬레이션 배너 노출**: 쿠폰팩 카드를 **항상** 띄울지, 운영자 토글로 둘지?

---
