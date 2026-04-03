-- AI 주간 브리핑 저장 테이블
-- 2026-04-03: 수동/자동 브리핑 결과를 DB에 영구 저장

CREATE TABLE IF NOT EXISTS ai_briefings (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(shop_id),
  performance TEXT NOT NULL,        -- 지난주 성과 요약
  strategy    TEXT NOT NULL,        -- 이번 주 전략 제안
  actions     TEXT NOT NULL,        -- JSON 배열: 추천 액션 3개
  insight     TEXT,                 -- AI 의견 (앱 범위 밖 참고사항)
  stats_json  TEXT,                 -- 원본 통계 JSON (참고용)
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_shop_created
  ON ai_briefings (shop_id, created_at DESC);
