# 라운드 4 — 2주차 명세서 (Exit-intent + Smart trigger + 손실 회피 카드)

**작성**: 2026-04-27
**상태**: 초안 (사용자 합의 대기)
**관련**: `docs/specs/round4_plus_conversion.md` (1주차), `project_pricing_strategy` 메모리

---

## 1. 배경 — 2주차의 본질

### 1-1. 1주차에서 한 일
**B 트랙 (운영자 인지·감정 자극)** + **C 트랙 (운영자 retention)** 1차 깔기:
- Plus 프리셋 6종 + preview 패턴 + 결제 모달
- What's New 인디케이터
- funnel_events 신규 4종 (`widget_style.preview_plus_preset` 등)

→ *운영자 본인의 욕구 자극*은 시작됨. 그러나 *Plus가 가입자를 늘린다는 사실*은 아직 데이터로 증명 X.

### 1-2. 2주차의 핵심 — A 트랙 (가입 전환 실데이터 생성)

> **"Plus가 가입자를 N% 더 만든다"는 한 줄을 데이터로 증명할 수 있는 인프라부터.**

이 한 줄이 생기면:
- 운영자 결제 카피가 *사실 기반*이 됨 ("Plus 사용 후 가입 +X%")
- 1주차의 "Plus였다면 +X명" 손실 회피 카드가 *진짜 숫자*로 동작
- 추후 마케팅·홍보·심사 자료 모두에 정량 근거

라운드 3 검토에서 도달한 결론: **Exit-intent 쿠폰 게이트가 *데이터 생성기* 역할**.

### 1-3. 2주차 트랙 정리

| 트랙 | 작업 | 본질 |
|---|---|---|
| **A. 데이터 생성** | W2-1 Exit-intent + W2-2 Smart trigger | 가입자 실증 |
| **B. 데이터 가시화** | W2-3 손실 회피 카드 | 운영자 인지 자극 |

W2-1과 W2-2는 *함께 가야 안전* (frequency capping 없는 Exit-intent는 운영자 거부감 큼). W2-3는 W2-1·W2-2 데이터 누적 후 의미 살아남.

---

## 2. 2주차 3개 작업 단위

### W2-1. Exit-intent 쿠폰 게이트 (Plus 전용)

**컨셉**: 비회원이 *떠나려는 순간*에만 가입 혜택 마지막으로 한 번. 글로벌 conversion 앱(Privy / OptinMonster) 표준 패턴.

**트리거**:
- **PC**: `mouseout` 이벤트 — 마우스가 화면 위쪽(브라우저 탭/주소창) 으로 빠져나갈 때
- **모바일**: `scroll-up` 빠른 위 스크롤 (뒤로가기 의도) 또는 `history.pushState` + `popstate` 가로채기

**노출 조건**:
- shop.plan === 'plus' (Free 운영자엔 동작 X — 결제 동기 X)
- 비회원 (visitor cookie로 식별, 이미 로그인이면 skip)
- *frequency cap* 통과 (W2-2에서 정의)

**팝업 내용** (운영자가 카페24 쿠폰 API로 발급한 쿠폰과 연동):
```
"잠깐만요!"

지금 가입하면 [쿠폰명] [할인액/할인율] 즉시 받을 수 있어요.

[카카오로 1초 가입]   [네이버로 1초 가입]   [Google로 1초 가입]
                       (또는 운영자가 활성화한 소셜 + 운영자 위젯 디자인 그대로)

[그냥 닫기]
```

쿠폰 정보는 shops.coupon_config (이미 있음) 활용.

**구현**:
- `widget/buttons.ts` 또는 *별도 위젯 모듈* (`widget/exit-intent.ts`)에 트리거 + 모달 코드
- ScriptTag로 inject되니 운영자 쇼핑몰 모든 페이지에서 작동
- 모달 디자인은 위젯 톤 일관

### W2-2. Smart trigger 엔진 (Plus 전용 인프라)

**컨셉**: Exit-intent 외에도 *언제 위젯/팝업을 띄울지*를 정밀 제어. 글로벌 표준(Wisepops / Sleeknote).

**규칙 종류**:
- **Frequency capping**: 같은 visitor에 24h 내 재노출 금지 (cookie 기반)
- **Scroll-depth**: 60% 스크롤 시 트리거
- **Time-on-page**: 30초 이상 체류 시
- **Page-count**: 같은 세션에서 N페이지 이상 본 후
- **URL 패턴**: `/product/`, `/cart`, `/checkout` 같은 특정 경로에서만

**적용 대상**:
- W2-1 Exit-intent 쿠폰 (frequency capping 의무, scroll-depth 옵션)
- Plus 미니배너 (이미 1주차 이전 통합) — frequency capping 추가
- Plus 이탈 팝업 (이미 통합) — scroll-depth 추가
- 향후 라이브 카운터 등

**저장**:
- visitor_id 단위 frequency 카운트는 *클라이언트 cookie* (KV 부담 회피)
- 운영자 설정(어떤 트리거를 어떤 강도로)은 shops 테이블 새 컬럼 또는 widget_style JSON 확장

**구현 단순화**:
- 2주차엔 *frequency capping*과 *scroll-depth*만. 나머지는 3주차 이상.
- 운영자 UI는 ON/OFF 토글 + 간단한 강도(low/medium/high). 세밀 조정은 후속.

### W2-3. "Plus였다면 +X명" 손실 회피 카드 (대시보드 홈)

**컨셉**: Free 운영자에게 "이번 주 *Plus 기능을 사용했다면 잡을 수 있었던* 비회원 수"를 *근거 있는 데이터*로 보여줌. 라운드 3에서 *대안 1+3* 합의:

**카드 A (가입 의도 비회원 — 익명 카운트)**:
```
Plus로 가입 가능 회원 : 12명
(로그인 페이지 진입했지만 가입까지 안 간 비회원)
```

데이터 출처: funnel_events에서 `login_page_view` 또는 `oauth_initiated` 같은 이벤트가 *완료까지 안 간* visitor 카운트.

**카드 B (가입 후 첫구매 미전환 회원 — 실명, 첫·끝 글자 외 마스킹)**:
```
Plus로 첫구매 가능 회원 : 5명
김***수, 박***호, 이***진, 최***경, 정***진
```

마스킹 규칙(2026-04-28 사용자 결정):
- 1글자: 그대로 (예: `홍`)
- 2글자: 첫 글자 + `***` (예: `박민` → `박***`)
- 3글자 이상: 첫 글자 + `***` + 끝 글자 (예: `김철수` → `김***수`)

데이터 출처: 카페24 회원 DB × 주문 DB join (가입 후 7일 경과 + 주문 0건). 이름 마스킹.

**Threshold gate (사용자 원칙)**:
- 카드 A: 가입 의도 비회원 ≥ 10명 + 데이터 수집 ≥ 7일일 때만 노출. 미달이면 *카드 자체 숨김* (또는 "데이터 수집 중..." placeholder)
- 카드 B: 첫구매 미전환 회원 ≥ 3명일 때만 노출
- *근거 없는 메시지는 절대 X* — 사용자 명시 원칙

**카피 톤** (사용자 명시):
- "Plus로 추가 가입 회원 : N명" 수치 직접 노출형 ⭐
- 협력적 + 정량적, 추정·가정 표현 회피
- 카드 A는 가입 회원, 카드 B는 첫구매 회원으로 일관 패턴

**노출 위치**: `/dashboard` 홈, "🆕 최신 업데이트" 카드 옆 또는 위

---

## 3. 데이터 모델 / 마이그레이션

### 3-1. funnel_events 추가 이벤트 (필요 시)
1주차에서 `widget_style.*`, `billing.*` 4종 추가. 2주차에 추가:
- `widget.exit_intent_shown` — Exit-intent 모달 노출
- `widget.exit_intent_signup` — 모달에서 가입 완료
- `widget.exit_intent_dismissed` — 그냥 닫기
- `widget.scroll_trigger_fired` — Smart trigger 발동

기존 `widget_event` 테이블 또는 `funnel_events` 컨벤션 따름. 마이그레이션 X (event_type CHECK이 일반 패턴이라).

### 3-2. shops 컬럼 확장 (Smart trigger 설정)
`shops.exit_intent_config` JSON 컬럼 신설:
```json
{
  "enabled": true,
  "frequency_cap_hours": 24,
  "scroll_depth_threshold": 60,
  "coupon_id": "abc123",
  "headline": "잠깐만요!",
  "body": "지금 가입하면 [쿠폰] 즉시 받을 수 있어요"
}
```

기존 `popup_config`, `escalation_config` 패턴 따름. 새 마이그레이션 0028 필요.

### 3-3. 손실 회피 카드 — 마이그레이션 X
funnel_events 기존 데이터 + 카페24 회원 API로 계산. 새 컬럼 X.

---

## 4. 구현 우선순위 + 일정 (5일)

| Day | 작업 | 산출물 |
|---|---|---|
| **Day 1** | W2-2 Smart trigger 엔진 코어 (frequency capping + scroll-depth) | 위젯에 인프라 통합, 단위 동작 확인 |
| **Day 2** | W2-1 Exit-intent 쿠폰 게이트 (W2-2 트리거 활용) | PC/모바일 트리거 + 모달 |
| **Day 3** | 어드민 UI — Exit-intent 설정 페이지 (`/dashboard/settings/exit-intent`) | 운영자 설정 가능 |
| **Day 4** | W2-3 손실 회피 카드 — 대시보드 홈 통합 (threshold gate 포함) | 카드 A·B 노출 |
| **Day 5** | 통합 테스트 + 스테이징 검증 | 스테이징 누적 |

**프로덕션 배포는 별도 사이클** (1주차 디버그 + 2주차 모두 끝나면).

---

## 5. 성공 지표

| 지표 | 의미 | 목표 (2주차 누적) |
|---|---|---|
| Exit-intent 노출 → 가입 전환률 | 모달 본 비회원 중 실제 가입 비율 | 5% 이상 (적당함) |
| Frequency capping 효과 | 같은 visitor 재노출 비율 | 24h 내 재노출 0건 |
| Scroll-depth 트리거 정확도 | 60% 스크롤 도달 visitor 중 트리거 발동 | ≥ 95% |
| 손실 회피 카드 노출률 | threshold gate 통과한 운영자 비율 | 데이터 누적 후 측정 |

---

## 6. 리스크 + 대응

| 리스크 | 영향 | 대응 |
|---|---|---|
| Exit-intent 모달 너무 자주 → 운영자 거부감 | 부정 후기 | frequency cap 24h 의무, 운영자 ON/OFF 토글 |
| 모바일 trigger (scroll-up / popstate) 브라우저 호환성 | 일부 모바일에서 미동작 | iOS Safari / Android Chrome 우선 검증, 미동작 시 fallback (no-op) |
| Smart trigger 엔진 위젯 JS 크기 증가 | 페이지 로딩 속도 ↓ | 트리거 코드 최소화, 60% 스크롤·30초 등 단순 패턴만 |
| 손실 회피 카드 카피 강도 (협박 vs 협력) | 운영자 심리 영향 | 협력형 톤 ("잡을 수 있어요"), 비난형 금지 |
| Threshold 미달 카드 숨김 vs placeholder 충돌 | 빈 화면 우려 | 데이터 부족 시 "최신 업데이트" 카드만 노출 (이미 1주차에 있음) |

---

## 7. 합의 결과 (2026-04-27)

| # | 포인트 | 결과 |
|---|---|---|
| 1 | 트랙 분리 (A/B) | ✅ 동의 |
| 2 | Exit-intent 작동 조건 | ✅ 동의 |
| 3 | Smart trigger 2주차 범위 (cap + scroll-depth만) | ✅ 동의 |
| 4 | 손실 회피 카드 A 익명 + B 실명 | ✅ 동의 |
| 5 | 마이그레이션 0028 (shops.exit_intent_config) | ✅ 동의 |
| 6 | 5일 일정 + 어드민 UI 그대로 | ✅ 동의 |
| 7 | 카피 톤 | **"Plus로 추가 가입 회원 : N명"** 수치 직접 노출형 (사용자 명시) |

→ 합의 완료. 전체 구현 진행. 5일치를 *2 사이클로 분할*:
- 사이클 1: Phase A+B (Day 1~3) — Smart trigger + Exit-intent + 어드민 UI
- 사이클 2: Phase C+D (Day 4~5) — 손실 회피 카드 + 통합 검증
