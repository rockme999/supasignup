-- Migration: 0001_initial_schema
-- Description: V1 기본 테이블 생성
--   owners, shops, users (+ phone/birthday/gender), shop_users,
--   subscriptions, login_stats

-- owners
CREATE TABLE IF NOT EXISTS owners (
  owner_id      TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

-- shops
CREATE TABLE IF NOT EXISTS shops (
  shop_id                TEXT PRIMARY KEY,
  mall_id                TEXT NOT NULL,
  platform               TEXT NOT NULL CHECK (platform IN ('cafe24', 'imweb', 'godomall', 'shopby')),
  shop_name              TEXT,
  shop_url               TEXT,
  owner_id               TEXT NOT NULL REFERENCES owners(owner_id),
  client_id              TEXT NOT NULL UNIQUE,
  client_secret          TEXT NOT NULL,
  enabled_providers      TEXT NOT NULL DEFAULT '["google","kakao","naver","apple"]',
  platform_access_token  TEXT,
  platform_refresh_token TEXT,
  allowed_redirect_uris  TEXT,
  plan                   TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'monthly', 'yearly')),
  sso_configured         INTEGER NOT NULL DEFAULT 0,
  deleted_at             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(mall_id, platform)
);
CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_platform ON shops(platform);

-- users (PII encrypted)
-- Phase 2: phone, birthday, gender 컬럼 포함
CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT PRIMARY KEY,
  provider      TEXT NOT NULL,
  provider_uid  TEXT NOT NULL,
  email         TEXT,
  email_hash    TEXT,
  name          TEXT,
  profile_image TEXT,
  raw_data      TEXT,
  phone         TEXT,
  birthday      TEXT,
  gender        TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_uid)
);
CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- shop_users
CREATE TABLE IF NOT EXISTS shop_users (
  id                 TEXT PRIMARY KEY,
  shop_id            TEXT NOT NULL REFERENCES shops(shop_id),
  user_id            TEXT NOT NULL REFERENCES users(user_id),
  platform_member_id TEXT,
  status             TEXT NOT NULL DEFAULT 'active',
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_users_shop_id ON shop_users(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_users_user_id ON shop_users(user_id);

-- subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id         TEXT PRIMARY KEY,
  owner_id   TEXT NOT NULL REFERENCES owners(owner_id),
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  plan       TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  status     TEXT NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  payment_id TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id ON subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id ON subscriptions(shop_id);

-- login_stats
CREATE TABLE IF NOT EXISTS login_stats (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  user_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('signup', 'login')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_login_stats_shop_id ON login_stats(shop_id);
CREATE INDEX IF NOT EXISTS idx_login_stats_created_at ON login_stats(created_at);
CREATE INDEX IF NOT EXISTS idx_login_stats_shop_action ON login_stats(shop_id, action);
