-- Migration: 0016_funnel_composite_index
-- Description: 통계 시스템 Phase 1 — 퍼널 이벤트 복합 인덱스 추가 (shop_id + event_type + created_at)
-- Date: 2026-04-06

-- 기존 개별 인덱스에 더해, 통계 쿼리 성능 최적화를 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_funnel_shop_type_date ON funnel_events(shop_id, event_type, created_at);
