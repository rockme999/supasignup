-- 글로벌 앱 설정 싱글톤 테이블 추가 (Phase 4: 전역 AI 자동답변 토글)
-- 2026-04-21

-- 전역 앱 설정 (싱글톤 키-밸류)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 기본값: 자동답변 OFF
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ai_auto_reply_global', '0');
