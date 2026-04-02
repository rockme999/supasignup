-- 번개가입 (BG) D1 Schema
-- Tech Spec v1.1
-- 변경 이력:
--   2026-03-19: owners.role 컬럼 추가 (Phase 8 관리자 앱)
--   2026-03-19: audit_logs 테이블 추가 (Phase 8 관리자 감사 로그)
--   2026-03-20: owners.deleted_at 컬럼 추가 (계정 탈퇴 soft delete)
--   2026-03-20: shops.widget_style 컬럼 추가 (위젯 커스터마이징)
--   2026-04-02: shops.sso_type 컬럼 추가 (카페24 SSO 앱 슬롯 식별자: sso, sso1, sso2 ...)
--   2026-04-02: shops.plan CHECK 변경 (free/plus), subscriptions 구조 변경 (billing_cycle 분리)

-- ============================================================
-- 1. owners - Operator accounts
-- ============================================================
CREATE TABLE IF NOT EXISTS owners (
  owner_id   TEXT PRIMARY KEY,
  email      TEXT NOT NULL UNIQUE,
  name       TEXT,
  password_hash TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  deleted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- 2. shops - Registered shops
-- ============================================================
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
  plan                   TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'plus')),
  sso_configured         INTEGER NOT NULL DEFAULT 0,
  widget_style           TEXT,              -- JSON: {"preset":"default","buttonWidth":280,"buttonGap":8,"borderRadius":10,"align":"center"}
  sso_type               TEXT NOT NULL DEFAULT 'sso',  -- 카페24 SSO 슬롯 식별자 (sso, sso1, sso2, ...)
  deleted_at             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(mall_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_platform ON shops(platform);

-- ============================================================
-- 3. users - Social auth users (PII encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT PRIMARY KEY,
  provider      TEXT NOT NULL,
  provider_uid  TEXT NOT NULL,
  email         TEXT,              -- AES-GCM encrypted
  email_hash    TEXT,              -- SHA-256 hash for search
  name          TEXT,              -- AES-GCM encrypted
  profile_image TEXT,
  raw_data      TEXT,              -- AES-GCM encrypted JSON
  phone         TEXT,              -- AES-GCM encrypted
  birthday      TEXT,              -- AES-GCM encrypted
  gender        TEXT,              -- plaintext (low sensitivity)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider);

-- ============================================================
-- 4. shop_users - Shop-user mapping
-- ============================================================
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

-- ============================================================
-- 5. subscriptions - Billing
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL REFERENCES owners(owner_id),
  shop_id       TEXT NOT NULL REFERENCES shops(shop_id),
  plan          TEXT NOT NULL CHECK (plan IN ('plus')),
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly')),
  status        TEXT NOT NULL CHECK (status IN ('pending', 'active', 'cancelled', 'expired')),
  payment_id    TEXT,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at    TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id ON subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id ON subscriptions(shop_id);

-- ============================================================
-- 6. login_stats - Statistics
-- ============================================================
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

-- ============================================================
-- 7. user_providers - Multi-provider linking
-- ============================================================
CREATE TABLE IF NOT EXISTS user_providers (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(user_id),
  provider     TEXT NOT NULL,
  provider_uid TEXT NOT NULL,
  linked_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_user_providers_user_id ON user_providers(user_id);

-- ============================================================
-- 8. audit_logs - Admin audit trail
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
