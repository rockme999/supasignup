-- Migration: 0009_funnel_events
-- Description: 퍼널 이벤트 추적 테이블 — widget.ts KV 임시저장에서 D1 영구저장으로 전환
-- Date: 2026-04-02

CREATE TABLE IF NOT EXISTS funnel_events (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  event_type TEXT NOT NULL,
  event_data TEXT,
  page_url   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_funnel_events_shop_id   ON funnel_events(shop_id);
CREATE INDEX IF NOT EXISTS idx_funnel_events_created_at ON funnel_events(created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_events_type       ON funnel_events(event_type);
