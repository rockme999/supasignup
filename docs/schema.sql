-- 번개가입 (BG) D1 Schema
-- Tech Spec v1.1
-- 변경 이력:
--   2026-03-19: owners.role 컬럼 추가 (Phase 8 관리자 앱)
--   2026-03-19: audit_logs 테이블 추가 (Phase 8 관리자 감사 로그)
--   2026-03-20: owners.deleted_at 컬럼 추가 (계정 탈퇴 soft delete)
--   2026-03-20: shops.widget_style 컬럼 추가 (위젯 커스터마이징)
--   2026-04-02: shops.sso_type 컬럼 추가 (카페24 SSO 앱 슬롯 식별자: sso, sso1, sso2 ...)
--   2026-04-02: shops.plan CHECK 변경 (free/plus), subscriptions 구조 변경 (billing_cycle 분리)
--   2026-04-02: shops.kakao_channel_id 추가 (Plus: 카카오 채널), shops.shop_identity 추가 (Plus: AI 정체성 분석)
--   2026-04-02: funnel_events 테이블 추가 (퍼널 이벤트 D1 영구저장)
--   2026-04-02: inquiries 테이블 추가 (1:1 문의 게시판)
--   2026-04-03: ai_briefings 테이블 추가 (AI 주간 브리핑 저장)
--   2026-04-04: shops.banner_config 추가 (Plus: 미니배너 설정 저장)
--   2026-04-05: shops.popup_config 추가 (Plus: 이탈 감지 팝업 설정 저장)
--   2026-04-05: shops.escalation_config 추가 (Plus: 에스컬레이션 설정 저장)
--   2026-04-06: coupon_issues 테이블 추가 (쿠폰 발급 히스토리)
--   2026-04-06: shops.ai_suggested_copy 추가 (AI 브리핑 시 생성된 추천 문구 JSON 저장)
--   2026-04-06: funnel_events event_type 13종 확장 + shop_id/event_type/created_at 복합 인덱스 추가
--   2026-04-07: 인덱스 최적화 — login_stats 3컬럼 복합 인덱스, 불필요 인덱스 4개 삭제

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
  coupon_config          TEXT,                         -- JSON: {"enabled":false,"coupons":[...],"multi_coupon":false}
  kakao_channel_id       TEXT,                         -- Plus: 카카오 채널 ID (pf.kakao.com/{id}/friend)
  shop_identity          TEXT,                         -- Plus: AI 분석 쇼핑몰 정체성 JSON {"industry","target","tone","keywords","summary"}
  banner_config          TEXT,                         -- Plus: 미니배너 설정 JSON {"preset":0,"text":"...","borderRadius":10,"icon":"⚡","position":"floating"}
  popup_config           TEXT,                         -- Plus: 이탈팝업 설정 JSON {"enabled":true,"title":"...","body":"...","ctaText":"...","preset":0,"allPages":false}
  escalation_config      TEXT,                         -- Plus: 에스컬레이션 설정 JSON
  ai_suggested_copy      TEXT,                         -- Plus: AI 브리핑 시 생성된 추천 문구 JSON {"banner","toast","floating","floatingBtn","popupTitle","popupBody","popupCta"}
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

CREATE INDEX IF NOT EXISTS idx_login_stats_shop_id         ON login_stats(shop_id);
CREATE INDEX IF NOT EXISTS idx_login_stats_shop_action_date ON login_stats(shop_id, action, created_at);

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

-- ============================================================
-- 9. funnel_events - Widget funnel tracking (D1 persistent)
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_events (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  event_type TEXT NOT NULL,           -- 13종: banner_show | banner_click | popup_show | popup_close | popup_signup | escalation_show | escalation_click | escalation_dismiss | kakao_channel_show | kakao_channel_click | page_view | oauth_start | signup_complete
  event_data TEXT,                    -- JSON payload
  page_url   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_funnel_shop_type_date ON funnel_events(shop_id, event_type, created_at);

-- ============================================================
-- 10. inquiries - 1:1 문의 게시판
-- ============================================================
CREATE TABLE IF NOT EXISTS inquiries (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  owner_id   TEXT NOT NULL REFERENCES owners(owner_id),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  reply      TEXT,
  replied_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id   ON inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_owner_id  ON inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status    ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);

-- ============================================================
-- 11. ai_briefings - AI 주간 브리핑 저장
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_briefings (
  id          TEXT PRIMARY KEY,
  shop_id     TEXT NOT NULL REFERENCES shops(shop_id),
  performance TEXT NOT NULL,
  strategy    TEXT NOT NULL,
  actions     TEXT NOT NULL,
  stats_json  TEXT,
  source      TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'scheduled')),
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ai_briefings_shop_created ON ai_briefings(shop_id, created_at DESC);

-- ============================================================
-- 12. coupon_issues - 쿠폰 발급 히스토리
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  coupon_type TEXT NOT NULL,         -- 'shipping', 'amount', 'rate'
  coupon_no INTEGER NOT NULL,        -- 카페24 쿠폰 번호
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_at TEXT,                       -- 사용 시각
  order_id TEXT,                      -- 사용된 주문번호
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_issues_shop ON coupon_issues(shop_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_member ON coupon_issues(shop_id, member_id);
