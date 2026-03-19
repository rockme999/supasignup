-- Migration: 0002_user_providers
-- Description: Phase 3 - 계정 연결 기능을 위한 user_providers 테이블 생성
--   기존 users 레코드의 provider/provider_uid 데이터를 user_providers로 이관

-- user_providers 테이블 생성
CREATE TABLE IF NOT EXISTS user_providers (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(user_id),
  provider     TEXT NOT NULL,
  provider_uid TEXT NOT NULL,
  linked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_providers(user_id);

-- 기존 users 데이터를 user_providers로 이관
-- user_id를 id로 재사용하여 기존 데이터와 1:1 매핑
INSERT OR IGNORE INTO user_providers (id, user_id, provider, provider_uid, linked_at)
SELECT
  user_id,
  user_id,
  provider,
  provider_uid,
  created_at
FROM users;
