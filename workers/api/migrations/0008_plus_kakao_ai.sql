-- Migration: 0008_plus_kakao_ai
-- Description: Plus 기능 — 카카오 채널 ID + AI 쇼핑몰 정체성 컬럼 추가
-- Date: 2026-04-02

-- shops: 카카오 채널 ID (Plus 전용 — 카카오 채널 추가 유도에 사용)
ALTER TABLE shops ADD COLUMN kakao_channel_id TEXT;

-- shops: AI 분석 쇼핑몰 정체성 (JSON) — 업종, 타겟 고객, 톤앤매너
ALTER TABLE shops ADD COLUMN shop_identity TEXT;
