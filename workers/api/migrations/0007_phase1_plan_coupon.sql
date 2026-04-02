-- Migration: 0007_phase1_plan_coupon
-- Description: Phase 1 — shops.coupon_config 추가 + subscriptions.billing_cycle 추가
-- Date: 2026-04-02
--
-- Note: SQLite D1에서 CHECK 제약 변경은 테이블 재생성이 필요하지만,
--       FK 제약으로 인해 마이그레이션에서 테이블 재생성 불가.
--       plan 값 검증은 코드 레벨에서 처리 (shops.plan: 'free'/'plus' only)
--       기존 'monthly'/'yearly' 값은 실제 DB에 없음 (전부 'free')

-- shops: 쿠폰 설정 JSON 컬럼 추가
ALTER TABLE shops ADD COLUMN coupon_config TEXT;

-- subscriptions: 결제 주기 컬럼 추가 (기존 plan과 분리)
ALTER TABLE subscriptions ADD COLUMN billing_cycle TEXT NOT NULL DEFAULT 'monthly';
