-- Migration 0028: shops.exit_intent_config
-- Exit-intent 쿠폰 게이트 설정 컬럼 추가 (Smart trigger + 쿠폰 연동)
-- JSON shape: { enabled, frequency_cap_hours, scroll_depth_threshold, coupon_type, headline, body }
-- NULL = 비활성 (기본값)
ALTER TABLE shops ADD COLUMN exit_intent_config TEXT;
