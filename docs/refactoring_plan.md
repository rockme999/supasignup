# SupaSignup 리팩토링 종합 계획서

> 2026-04-07 KST 작성 / 최종 업데이트: 2026-04-07  
> DB/쿼리 효율성 + 보안/성능 + 코드 구조 3개 영역 심층 검토 결과

---

## 1. 현황 요약

| 항목 | 상태 |
|------|------|
| 전체 코드 | ~25,249줄 |
| 최대 파일 | `views/pages.tsx` **8,734줄** (전체의 34.6%) |
| 두번째 | `routes/pages.tsx` **1,614줄** |
| 컴포넌트 수 | 33개 (전부 하나의 파일) |
| 인덱스 | 4개 불필요 (write 성능 저하) |
| 보안 헤더 | CSP/X-Frame-Options **부재** |

---

## 2. 체크리스트 (진행 상태)

> 범례: `[ ]` 미착수 / `[~]` 진행중 / `[x]` 완료 / `[-]` 스킵

### P0: 즉시 조치 — 보안 + DB 인덱스 + 타입

- [x] **0-1. 보안 헤더 추가** ✅ 2026-04-07
  - [x] Hono 글로벌 미들웨어에 보안 헤더 설정 (`index.ts` 26~47행)
  - [x] Widget 라우트는 X-Frame-Options 제외 (iframe 허용 유지 확인)
  - [x] 테스트: `curl -sI` 응답 헤더 확인 통과

- [x] **0-2. login_stats 3컬럼 복합 인덱스** ✅ 2026-04-07
  - [x] 마이그레이션 `0017_index_optimization.sql` 작성
  - [x] `COVERING INDEX idx_login_stats_shop_action_date` 사용 확인 (EXPLAIN QUERY PLAN)
  - [x] `docs/schema.sql` 반영

- [x] **0-3. 불필요 인덱스 삭제** ✅ 2026-04-07
  - [x] funnel_events 3개 + login_stats 1개 = 4개 인덱스 삭제 (총 7개 → 3개)
  - [x] dev DB 적용 확인

- [x] **0-4. 타입 정합성 수정** ✅ 2026-04-07
  - [x] Shop에 sso_type, coupon_enabled, ai_suggested_copy 추가
  - [x] plan 타입 `'free' | 'plus'`로 통일
  - [x] views/pages.tsx 로컬 타입 검토 완료 (의도적 차이 확인)

- [x] **0-5. popupBody innerHTML XSS 수정** ✅ 2026-04-07
  - [x] `escapeHtml()` 함수 추가 + popupBody 이스케이프 적용 (`buttons.ts` 18~28행)
  - [x] 기존 테스트 7건 통과 확인

- [x] **0-6. 테스트 엔드포인트 비활성화** ✅ 2026-04-07
  - [x] `devOnly` 미들웨어 추가 — BASE_URL에 `-dev.` 포함 시만 허용 (`index.ts`)
  - [x] `/test/*`, `/widget/test*.js` 전체 적용

- [x] **0-7. dev 배포 + 검증** ✅ 2026-04-07
  - [x] `wrangler deploy --env dev` — Version `f10c6a14`
  - [x] 보안 헤더 테스트 통과
  - [x] 인덱스 COVERING INDEX 확인

---

### P1: 뷰 컴포넌트 분리 (views/pages.tsx 8,734줄 → 30+ 파일)

> 30+개 → **10개 파일**로 재조정 (2026-04-07)
> 원칙: 함께 변경되는 것은 함께 둔다 / 같은 공통 요소를 공유하면 묶는다 / 평균 ~900줄/파일

- [x] **1-1. shared.ts — 공통 상수/타입/유틸 (190줄)** ✅ 2026-04-07
  - [ ] providerColors, providerDisplayNames, providerPieColors, PIE_FALLBACK_COLORS
  - [ ] parseProviders, inquiryStatusLabel
  - [ ] 뷰 전용 타입 (HomeStats, DailyData, ShopDetail, ShopSummary 등)

- [x] **1-2. charts.tsx — 차트 컴포넌트 (194줄)** ✅ 2026-04-07
  - [ ] ProgressBar, LineChart, PieChart, HeatmapChart, MetricCard

- [x] **1-3. auth.tsx — 인증 (111줄)** ✅ 2026-04-07
  - [ ] LoginPage, RegisterPage

- [x] **1-4. home.tsx — 홈 대시보드 (245줄)** ✅ 2026-04-07
  - [ ] HomePage + HomeShop 타입

- [x] **1-5. stats.tsx — 통계 (466줄)** ✅ 2026-04-07
  - [ ] StatsPage + StatsPageProps, OauthDropoffData 등 전용 타입

- [x] **1-6. settings.tsx — 기본 설정 (1,826줄)** ✅ 2026-04-07
  - [ ] GeneralSettingsPage, SsoGuidePage, ProvidersPage, BillingPage, CouponSettingsPage

- [x] **1-7. plus-features.tsx — Plus 전용 설정 (2,371줄)** ✅ 2026-04-07
  - [ ] PlusLockOverlay + plusFeatureInfo
  - [ ] BannerSettingsPage, PopupSettingsPage, EscalationSettingsPage
  - [ ] KakaoSettingsPage, AiSettingsPage, AiReportsPage

- [x] **1-8. help.tsx — 도움말/문의 (1,162줄)** ✅ 2026-04-07
  - [ ] QuickStartPage, GuidePage, FaqPage
  - [ ] InquiriesPage, InquiryDetailPage

- [x] **1-9. admin.tsx — 관리자 전체 (1,520줄)** ✅ 2026-04-07
  - [ ] AdminHomePage, AdminShopsPage, AdminShopDetailPage
  - [ ] AdminSubscriptionsPage, AdminAuditLogPage, AdminMonitoringPage, AdminOwnersPage
  - [ ] AdminInquiriesPage, AdminAiReportsPage, AdminAiReportDetailPage

- [x] **1-10. static.tsx — 정적 페이지 (695줄)** ✅ 2026-04-07
  - [ ] LandingPage, PrivacyPage, TermsPage (Layout 미사용, 자체 완결형)

- [x] **1-11. barrel re-export + 빌드 검증** ✅ 2026-04-07
  - [x] `views/pages.tsx` → 14줄 barrel re-export로 축소
  - [x] `wrangler deploy --env dev` 성공 — Version `3f4ffaef`
  - [x] 페이지 정상 렌더링 확인

---

### P2: 공통 추출 + 라우트 분리

- [ ] **2-1. 공통 유틸/미들웨어 추출**
  - [ ] `escapeLike` → `db/stats-utils.ts`로 통합 (pages.tsx, admin.ts 중복 제거)
  - [ ] `getOwnerShop` → `middleware/shop-loader.ts` 미들웨어로 (17회 호출 → 1회)
  - [ ] 날짜 필터 빌더 → `db/stats-utils.ts`에 `buildDateFilter()` 추가

- [ ] **2-2. routes/pages.tsx 분리**
  - [ ] `routes/pages/public.tsx` — landing, login, register, logout, legal
  - [ ] `routes/pages/dashboard.tsx` — home, settings 라우트
  - [ ] `routes/pages/dashboard-stats.tsx` — stats 라우트 (가장 복잡)
  - [ ] `routes/pages/dashboard-api.tsx` — PUT/DELETE API 핸들러 분리
  - [ ] `routes/pages/index.ts` — 라우터 합성

- [ ] **2-3. 빌드 + 배포 검증**

---

### P3: DB 최적화 — funnel_events visitor_id 정규화

- [ ] **3-1. 마이그레이션 작성**
  - [ ] `ALTER TABLE funnel_events ADD COLUMN visitor_id TEXT`
  - [ ] `UPDATE funnel_events SET visitor_id = json_extract(event_data, '$.visitor_id')`
  - [ ] `CREATE INDEX idx_funnel_visitor ON funnel_events(shop_id, visitor_id, event_type, created_at)`

- [ ] **3-2. INSERT 코드 수정**
  - [ ] `widget.ts` 이벤트 INSERT 시 visitor_id 컬럼에도 저장
  - [ ] `oauth.ts` recordFunnelSignup 시 visitor_id 컬럼에도 저장

- [ ] **3-3. 쿼리 코드 수정**
  - [ ] trigger 분포 쿼리: `json_extract(..., '$.visitor_id')` → `visitor_id` 컬럼 참조
  - [ ] avg_product_views 쿼리: 동일 수정
  - [ ] avg_hours_to_signup 쿼리: 동일 수정
  - [ ] distribution 쿼리: 동일 수정

- [ ] **3-4. schema.sql 반영 + dev 적용**

---

### P4: D1 batch API 적용

- [ ] **4-1. dashboard 홈 쿼리 batch화**
  - [ ] 6개 Promise.all → `db.batch()` 1회

- [ ] **4-2. dashboard/stats 쿼리 batch화**
  - [ ] 배치 1 (기본 5쿼리) → `db.batch()` 1회
  - [ ] 배치 2 (퍼널+effort 4쿼리) → `db.batch()` 1회
  - [ ] 배치 3 (distribution+hourly 4쿼리) → `db.batch()` 1회

- [ ] **4-3. 배포 + 응답 시간 비교**

---

### P5: Stats 서비스 레이어 추출

- [ ] **5-1. services/stats-aggregator.ts 생성**
  - [ ] `fetchBasicStats(db, ownerId, shopId, period)`
  - [ ] `fetchFunnelAnalytics(db, shopId, period)`
  - [ ] `fetchOauthDropoff(db, shopId, period)`
  - [ ] `fetchEffortMetrics(db, shopId, period)`
  - [ ] `fetchDistribution(db, shopId, period)`
  - [ ] `fetchHourlyHeatmap(db, shopId)`

- [ ] **5-2. routes/stats.ts API에서 서비스 호출로 전환**
- [ ] **5-3. routes/pages SSR에서 서비스 호출로 전환**
- [ ] **5-4. 기존 중복 쿼리 코드 삭제**
- [ ] **5-5. 테스트 + 배포**

---

## 3. 테스트 계획

### 3.1 P0 테스트

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| 보안 헤더 | `curl -I https://bg-dev.suparain.kr/dashboard/login` | X-Frame-Options, CSP, X-Content-Type-Options 헤더 존재 |
| 보안 헤더 (위젯) | `curl -I https://bg-dev.suparain.kr/api/widget/config?client_id=...` | X-Frame-Options **없음** (iframe 허용) |
| 인덱스 최적화 | D1 `EXPLAIN QUERY PLAN SELECT ... FROM login_stats WHERE shop_id=? AND action='signup' AND created_at>=?` | `USING INDEX idx_login_stats_shop_action_date` 출력 |
| 타입 정합성 | `tsc --noEmit` | sso_type, ai_suggested_copy 관련 에러 0건 |
| XSS 방지 | 대시보드에서 popupBody에 `<img src=x onerror=alert(1)>` 입력 → 위젯 확인 | 스크립트 실행 안 됨, 이스케이프된 텍스트 표시 |
| 테스트 엔드포인트 | `curl https://bg-dev.suparain.kr/test` | dev: 200 정상 / prod: 404 또는 비활성화 |
| 통계 페이지 | `https://bg-dev.suparain.kr/dashboard/stats` 접속 | 에러 없이 정상 렌더링 |
| 위젯 동작 | 테스트 쇼핑몰에서 소셜 로그인 버튼 표시 | 정상 표시 + 클릭 동작 |

### 3.2 P1 테스트 (뷰 분리)

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| 빌드 성공 | `wrangler deploy --env dev --dry-run` | 빌드 에러 없음 |
| 페이지 렌더링 | 대시보드 전체 페이지 수동 확인 (15+ 페이지) | 기존과 동일하게 렌더링 |
| import 호환 | `routes/pages.tsx`의 import 경로 변경 없음 | barrel re-export 정상 |
| 관리자 페이지 | `/supadmin/*` 전체 페이지 확인 | 정상 렌더링 |

### 3.3 P2 테스트 (라우트 분리)

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| 라우트 매칭 | 전체 URL 패턴 접근 | 404 없이 기존과 동일 |
| shop-loader | 설정 페이지 접근 시 shop 데이터 정상 로드 | `c.get('shop')` 정상 |
| API 핸들러 | 비밀번호 변경, 프로필 수정, 계정 삭제 | 기능 정상 동작 |

### 3.4 P3 테스트 (DB 최적화)

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| 마이그레이션 | `wrangler d1 migrations apply --env dev` | 에러 없이 적용 |
| 기존 데이터 | `SELECT visitor_id FROM funnel_events LIMIT 5` | json_extract 값과 일치 |
| 신규 INSERT | 위젯 이벤트 발생 → DB 확인 | visitor_id 컬럼에 값 저장됨 |
| 쿼리 성능 | `/dashboard/stats` 응답 시간 비교 (Before/After) | 체감 개선 |
| 쿼리 정확성 | trigger 분포, effort 지표 값 비교 (Before/After) | 동일한 결과 |

### 3.5 P4 테스트 (batch API)

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| batch 정상 동작 | `/dashboard`, `/dashboard/stats` 접속 | 에러 없이 데이터 표시 |
| 응답 시간 | Workers Analytics에서 p50/p99 비교 | 50~100ms 개선 |

### 3.6 P5 테스트 (서비스 추출)

| 테스트 | 방법 | 기대 결과 |
|--------|------|-----------|
| API 응답 | `/api/dashboard/stats?shop_id=...` JSON 응답 | 기존과 동일 |
| SSR 페이지 | `/dashboard/stats` 렌더링 | 기존과 동일 |
| 데이터 정합성 | API와 SSR에서 같은 period/shopId로 비교 | 숫자 일치 |

---

## 4. 보안 검토 결과 요약

### 양호 (조치 불필요)
- JWT: timingSafeEqual + HMAC-SHA256 + 만료 검증
- PII 암호화: AES-256-GCM + SHA-256 해시 검색
- SQL Injection: 전면 파라미터 바인딩 + 화이트리스트
- OAuth: PKCE + state 검증 + redirect_uri 화이트리스트
- 비밀번호: PBKDF2 100K iterations
- CSRF: SameSite=Strict + CORS (합리적 수준)
- 로그인 Rate Limiting: IP 기반 5회 실패 → 5분 잠금
- 위젯 Rate Limiting: IP 기반 1분당 60건

### 조치 필요
| 항목 | 심각도 | 해당 작업 |
|------|--------|-----------|
| CSP/보안 헤더 부재 | 높음 | P0-1 |
| popupBody innerHTML XSS | 중간 | P0-5 |
| 테스트 엔드포인트 노출 | 중간 | P0-6 |
| OAuth /authorize rate limiting 없음 | 중간 | 별도 |
| 회원가입 rate limiting 강화 | 낮음 | 별도 |

---

## 5. 성능 검토 결과 요약

### 양호 (조치 불필요)
- 위젯 3단계 캐싱 (Edge → KV → D1)
- OAuth waitUntil 비동기화
- buttons.js ETag + stale-while-revalidate

### 조치 필요
| 항목 | 심각도 | 해당 작업 |
|------|--------|-----------|
| trigger 쿼리 O(n^2) | 심각 | P3 |
| json_extract 풀스캔 | 중간 | P3 |
| D1 개별 호출 overhead | 중간 | P4 |
| 대시보드 HTML 50~100KB | 중간 | P1 후 검토 |
| SELECT * 과다 사용 | 낮음 | P5 |

---

## 6. 실행 로드맵

```
P0 (즉시)    → 보안 헤더 + 인덱스 + 타입 + XSS 수정
P1 (1일)     → views/pages.tsx 도메인별 분리
P2 (1일)     → 공통 추출 + routes/pages.tsx 분리
P3 (0.5일)   → funnel_events visitor_id 정규화 마이그레이션
P4 (0.5일)   → D1 batch API 적용
P5 (1일)     → Stats 서비스 레이어 추출
```

각 Phase는 독립 배포 가능. barrel re-export 패턴으로 기존 import 경로 유지.

---

## 7. 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-04-07 | 초안 작성: 3개 영역 검토 결과 + 체크리스트 + 테스트 계획 |
