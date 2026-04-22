-- AI 자동답변 실패 로그 (Phase 4+)
-- 2026-04-22
-- 자동답변 실패 이력을 영구 기록하여 원인 추적 가능하도록 함.
-- reason별 재시도 정책: ai_error, validation_failed → 1회 재시도 / 나머지 → 재시도 없음.

CREATE TABLE IF NOT EXISTS ai_auto_reply_failures (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id     TEXT NOT NULL REFERENCES inquiries(id),
  attempt        INTEGER NOT NULL DEFAULT 1,
  reason         TEXT NOT NULL CHECK (reason IN ('inquiry_not_found','shop_not_found','ai_error','validation_failed','held_for_review','unexpected_error')),
  detail         TEXT,
  ai_elapsed_ms  INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aarf_inquiry_id  ON ai_auto_reply_failures(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_aarf_created_at  ON ai_auto_reply_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_aarf_reason      ON ai_auto_reply_failures(reason);
