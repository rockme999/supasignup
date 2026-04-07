-- ai_briefings 테이블 생성 (스테이징에서만 수동 생성되어 있었으나 마이그레이션 누락)
CREATE TABLE IF NOT EXISTS ai_briefings (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(shop_id),
  performance TEXT NOT NULL,
  strategy    TEXT NOT NULL,
  actions     TEXT NOT NULL,
  insight     TEXT,
  stats_json  TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_shop ON ai_briefings(shop_id, created_at DESC);
