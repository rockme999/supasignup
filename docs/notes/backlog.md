# 차후 버전 백로그

다음 출시 사이클(v2.6 또는 그 이후)에 검토할 작업들. 우선순위 미정.

---

## 0. AI 보고 시스템 Phase 3 (v2.6+)

Phase 1·2 완성 (2026-05-04) 후 다음 단계. 자세한 컨텍스트는 메모리 `project_v2_5_next_steps.md` 참조.

### 0-1. 카카오 i 오픈빌더 챗봇 매핑 (가장 큰 차별화)
- **목적**: 카톡 채널 친구 추가 시 user_id ↔ shop_id 매핑 + 24/7 reactive Q&A
- **활용 자산**: AI 자동답변 (inquiry), shop_identity, KB, ai_briefing, D1 통계
- **시나리오 예시**: "이번 주 가입자 몇 명?" → D1 조회 / "쿠폰팩 어떻게 등록?" → KB 검색 / "AI 브리핑 보내줘" → 즉시 발송
- **구현**: 카카오 i 오픈빌더 GUI 시나리오 + 워커 webhook (`POST /api/kakao/skill`) + 5초 응답 제약
- **선결**: 카카오톡 채널 비즈채널 심사 통과
- **노출 가드**: 매핑 도입 후 `KAKAO_CHANNEL_UI_ENABLED='1'` 변경하면 즉시 활성화 (현재 staging만 노출, production hide)

### 0-2. 친구톡 자동 발송 (발송대행사 1건 도입, 가입자 100명+ 시)
- **현황**: 카톡 자동 broadcast = 발송대행사 필수 (KB #685 참조). 일반 사업자 자체 직접 API 불가
- **후보**: SOLAPI (13원/건 알림톡 / 19원 친구톡) — REST API 깔끔
- **수요 검증**: 친구 추가 운영자 비율, 메일 미열람률, "카톡으로도 받기" 요청 빈도로 판단
- **도입 시 작업**: SOLAPI 가입 + 채널 발신프로필 연동 + 카카오 템플릿 검수 + worker fetch 호출

### 0-3. ai_briefings.email_sent_at 컬럼 추가 (KV dedup 보강)
- 현재 KV 30일 TTL — 만료 후 잘못 재호출 시 중복 발송 위험 (희박)
- 영구 추적은 D1 컬럼이 안전 (마이그레이션 0035 후보)
- 우선순위 낮음 — 운영 6개월 안정 후 검토

### 0-4. 자동 발송 통계 supadmin 대시보드
- 매주 발송 성공률, 친구 추가율, 토글 OFF 비율 등
- 운영 가시성 향상

---

## 1. 쿠폰팩 만료일 변경 — 삭제 + 재생성 패턴

**현재 상태 (v2.5.1)**: 등록된 쿠폰팩(`state in (active, paused)`)의 만료일 변경 기능 폐지. 운영자가 만료일 입력은 readonly, 카페24 어드민에서 직접 변경하도록 안내.

**왜 폐지했나** (2026-05-03 검증):
- 카페24 API 2026-03-01: PUT `/admin/coupons/{coupon_no}` 의 metadata-only 변경 거부
  - `available_day_from_issued` 단독 PUT → 422 "Whether coupon is deleted is required"
  - status `'restart'` + metadata 동시 PUT → 422 "Coupons in active status cannot be reactivated" (transaction-style 거부, metadata도 적용 안 됨)
  - 30일 이하(25일)도 같은 거부 → 만료일 상한 문제 아님
- 결과: 카페24 API로 active 쿠폰의 만료일을 변경할 방법 없음

**다음 버전에서 지원할 방법**: **삭제 후 재생성 패턴**

운영자가 만료일 변경 요청 시 자동으로:

1. 기존 5장 모두 카페24 측 삭제 — `PUT /admin/coupons/{coupon_no}` body `{ status: null, deleted: 'D' }`
2. 신규 5장 생성 — `POST /admin/coupons` 5번 (새 만료일 적용)
3. `coupon_config.pack.items` 의 `cafe24_coupon_no` 5개를 새 번호로 갱신
4. 위젯 KV/엣지 캐시 무효화

### 구현 시 검토할 설계 포인트

- **이미 발급된 쿠폰 영향**: 마스터 쿠폰(생성된 쿠폰 정의)만 재생성되므로 손님 보유 중인 쿠폰 인스턴스에는 영향 없음. 다만 카페24 측 정책 재확인 필요(마스터 삭제 시 발급된 인스턴스 어떻게 되는지 — 사용 가능? 회수? 만료?).
- **부분 실패 처리**: 5장 삭제 중 일부 실패 / 5장 재생성 중 일부 실패 시 롤백 가능한 트랜잭션 패턴 필요. 단순 시퀀스로 구현하면 데이터 비일관 위험.
  - 옵션 A: 신규 5장 먼저 생성 → 모두 성공 시에만 기존 5장 삭제 (더 안전, 단 일시적으로 10장 존재)
  - 옵션 B: 기존 삭제 → 신규 생성 (기본 흐름, 부분 실패 시 audit_logs + 운영자 재시도)
- **Origin/Authorization**: 어드민에서만 호출되므로 별도 보안 추가 없음. `routes/dashboard.ts` PUT `/coupon-pack` 의 활성화 분기 안에 새 흐름 추가.
- **UI**: settings.tsx 의 만료일 input 을 `unregistered` 외 상태에서도 활성화 + "변경 시 카페24 5장이 새 번호로 재생성됩니다 (이미 발급된 쿠폰은 영향 없음)" 안내.
- **운영자 알림**: 재생성 5장이 새 `cafe24_coupon_no` 가지므로 운영자 대시보드 "쿠폰팩 현황" 페이지에서 새 번호로 갱신되어 보임. 사용자 가시 변화 없음.

### 관련 코드 영역
- `workers/api/src/services/coupon-pack.ts`: `registerCouponPack`(POST 5번) + `unregisterCouponPack` 또는 새 `deletePackCoupon` 헬퍼 (status `null` + `deleted: 'D'`)
- `workers/api/src/routes/dashboard.ts`: PUT `/coupon-pack` 의 `prevState in (active, paused) && expireDaysChanged` 분기에서 새 흐름 호출
- `workers/api/src/views/settings.tsx`: 만료일 input readonly 해제 + 안내 변경

### KB 참조
- KB #669 (api): 카페24 쿠폰 PUT — issue_member_join 단독 토글 거부
- KB #670 (troubleshooting): 카페24 쿠폰 PUT 422 deleted required
- (신규 추가 예정): 카페24 쿠폰 metadata-only 변경 불가 — 만료일은 재생성 패턴

---
