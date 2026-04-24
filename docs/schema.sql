-- 번개가입 (BG) D1 Schema — 실제 프로덕션 DB(bg-production) 기준
-- Tech Spec v1.1
--
-- 이 파일은 실제 D1의 sqlite_master 덤프를 기준으로 작성됨. ALTER TABLE로 추가된 컬럼은
-- 테이블 정의 끝쪽에 붙어 있다 (SQLite 특성). 새 환경에서 CREATE TABLE로 재생성 시에는
-- 이 파일을 그대로 실행할 수 있다.
--
-- 변경 이력:
--   2026-03-19: owners.role 컬럼 추가 (Phase 8 관리자 앱)
--   2026-03-19: audit_logs 테이블 추가 (Phase 8 관리자 감사 로그)
--   2026-03-20: owners.deleted_at 컬럼 추가 (계정 탈퇴 soft delete)
--   2026-03-20: shops.widget_style 컬럼 추가 (위젯 커스터마이징)
--   2026-04-02: shops.sso_type 컬럼 추가 (카페24 SSO 앱 슬롯 식별자: sso, sso1, sso2 ...)
--   2026-04-02: subscriptions 구조 변경 (billing_cycle 컬럼 분리)
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
--   2026-04-07: funnel_events.visitor_id 컬럼 추가 (JSON 정규화) + idx_funnel_visitor 복합 인덱스 추가
--   2026-04-08: cafe24_members 테이블 추가 (카페24 회원 ID 매핑, 웹훅 수신 시 upsert)
--   2026-04-21: AI 자동답변 — shops.auto_reply_inquiries + inquiries.status 'auto_replied' 추가
--   2026-04-21: 이미지 첨부 Phase 2 — inquiries.attachments TEXT DEFAULT '[]' 추가 (R2 객체 메타 JSON 배열)
--   2026-04-21: Phase 4 글로벌 AI 자동답변 — app_settings 싱글톤 테이블 추가 (ai_auto_reply_global)
--   2026-04-22: ai_auto_reply_failures 테이블 추가 — AI 자동답변 실패 이력 영구 기록 + 1회 재시도 지원
--   2026-04-22: inquiries.admin_read_at / customer_read_at 추가 — 관리자·운영자 조회 시각 추적 (미열람 뱃지)
--   2026-04-22: webhook_events 테이블 추가 — 플랫폼 웹훅 수신 이벤트 영구 기록 (원인 추적, 재전송 탐지)
--   2026-04-24: plan 정규화 (0027 마이그레이션) — subscriptions.plan='plus' 고정 + billing_cycle 분리.
--                shops.plan은 FK 제약 회피를 위해 컬럼 교체(ADD→UPDATE→DROP→RENAME) 방식으로 이관되었고,
--                그 부산물로 plan CHECK 제약이 제거됨. 'free' | 'plus' 검증은 billing.tsx / admin.ts /
--                dashboard.ts 애플리케이션 레이어에서 수행.

-- ============================================================
-- 1. owners — 운영자 계정
-- ============================================================
CREATE TABLE IF NOT EXISTS owners (
  owner_id      TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  name          TEXT,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  role          TEXT NOT NULL DEFAULT 'user',    -- 'user' | 'admin'
  deleted_at    TEXT
);

-- ============================================================
-- 2. shops — 등록 쇼핑몰
-- plan CHECK이 없음 — 0027 마이그레이션의 컬럼 교체 방식 특성.
-- 값은 'free' | 'plus'로 애플리케이션에서 검증.
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
  sso_configured         INTEGER NOT NULL DEFAULT 0,
  deleted_at             TEXT,
  created_at             TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at             TEXT NOT NULL DEFAULT (datetime('now')),
  widget_style           TEXT,                                    -- JSON: 위젯 커스터마이즈
  sso_type               TEXT NOT NULL DEFAULT 'sso',             -- 'sso' | 'sso1' | 'sso2' ...
  coupon_config          TEXT,                                    -- JSON: 쿠폰 설정
  kakao_channel_id       TEXT,                                    -- Plus: 카카오 채널 ID
  shop_identity          TEXT,                                    -- Plus: AI 정체성 분석 JSON
  banner_config          TEXT,                                    -- Plus: 미니배너 설정 JSON
  popup_config           TEXT,                                    -- Plus: 이탈 팝업 설정 JSON
  escalation_config      TEXT,                                    -- Plus: 에스컬레이션 설정 JSON
  ai_suggested_copy      TEXT,                                    -- Plus: AI 추천 카피 JSON
  auto_reply_inquiries   INTEGER NOT NULL DEFAULT 0,              -- AI 자동답변 on/off
  plan                   TEXT NOT NULL DEFAULT 'free',            -- 'free' | 'plus' (CHECK 없음, 앱 레이어 검증)
  UNIQUE(mall_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_shops_owner_id ON shops(owner_id);
CREATE INDEX IF NOT EXISTS idx_shops_platform ON shops(platform);

-- ============================================================
-- 3. users — 소셜 인증 유저 (PII 암호화)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  user_id       TEXT PRIMARY KEY,
  provider      TEXT NOT NULL,
  provider_uid  TEXT NOT NULL,
  email         TEXT,                -- AES-GCM encrypted
  email_hash    TEXT,                -- SHA-256 hash (search용)
  name          TEXT,                -- AES-GCM encrypted
  profile_image TEXT,
  raw_data      TEXT,                -- AES-GCM encrypted JSON
  phone         TEXT,                -- AES-GCM encrypted
  birthday      TEXT,                -- AES-GCM encrypted
  gender        TEXT,                -- plaintext (저민감)
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_uid)
);

CREATE INDEX IF NOT EXISTS idx_users_email_hash ON users(email_hash);
CREATE INDEX IF NOT EXISTS idx_users_provider   ON users(provider);

-- ============================================================
-- 4. shop_users — 쇼핑몰×유저 매핑
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
-- 5. subscriptions — 결제 구독 (plan='plus' 고정, billing_cycle로 주기 분리)
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

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id   ON subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id    ON subscriptions(shop_id);

-- ============================================================
-- 6. login_stats — 로그인/가입 통계
-- ============================================================
CREATE TABLE IF NOT EXISTS login_stats (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  user_id    TEXT NOT NULL,
  provider   TEXT NOT NULL,
  action     TEXT NOT NULL CHECK (action IN ('signup', 'login')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_stats_shop_id            ON login_stats(shop_id);
CREATE INDEX IF NOT EXISTS idx_login_stats_shop_action_date   ON login_stats(shop_id, action, created_at);

-- ============================================================
-- 7. user_providers — 유저×OAuth 프로바이더 연결
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
-- 8. audit_logs — 관리자 감사 로그
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id   ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================
-- 9. funnel_events — 위젯 퍼널 이벤트 영구 저장
-- ============================================================
CREATE TABLE IF NOT EXISTS funnel_events (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  event_type TEXT NOT NULL,             -- 13종: banner_show/click, popup_show/close/signup, escalation_*, kakao_channel_*, page_view, oauth_start, signup_complete
  event_data TEXT,                      -- JSON
  page_url   TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  visitor_id TEXT                       -- event_data.visitor_id 정규화 캐시
);

CREATE INDEX IF NOT EXISTS idx_funnel_shop_type_date ON funnel_events(shop_id, event_type, created_at);
CREATE INDEX IF NOT EXISTS idx_funnel_visitor        ON funnel_events(shop_id, visitor_id, event_type, created_at);

-- ============================================================
-- 10. inquiries — 1:1 문의 게시판 (+ 이미지 첨부, AI 자동답변 상태)
-- ============================================================
CREATE TABLE IF NOT EXISTS inquiries (
  id                TEXT PRIMARY KEY,
  shop_id           TEXT NOT NULL REFERENCES shops(shop_id),
  owner_id          TEXT NOT NULL REFERENCES owners(owner_id),
  title             TEXT NOT NULL,
  content           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'auto_replied', 'closed')),
  reply             TEXT,
  replied_at        TEXT,
  ai_prompt_version TEXT,
  ai_model          TEXT,
  ai_elapsed_ms     INTEGER,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  attachments       TEXT NOT NULL DEFAULT '[]',    -- R2 객체 메타 JSON 배열
  customer_read_at  TEXT,
  admin_read_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id           ON inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_owner_id          ON inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status            ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at        ON inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_admin_read_at     ON inquiries(admin_read_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_read_at  ON inquiries(customer_read_at);

-- ============================================================
-- 11. ai_briefings — AI 주간 브리핑
-- ============================================================
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

-- ============================================================
-- 12. coupon_issues — 쿠폰 발급 히스토리
-- ============================================================
CREATE TABLE IF NOT EXISTS coupon_issues (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id     TEXT NOT NULL,
  member_id   TEXT NOT NULL,
  coupon_type TEXT NOT NULL,
  coupon_no   INTEGER NOT NULL,
  issued_at   TEXT NOT NULL DEFAULT (datetime('now')),
  used_at     TEXT,
  order_id    TEXT,
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

CREATE INDEX IF NOT EXISTS idx_coupon_issues_shop   ON coupon_issues(shop_id, issued_at);
CREATE INDEX IF NOT EXISTS idx_coupon_issues_member ON coupon_issues(shop_id, member_id);

-- ============================================================
-- 13. cafe24_members — 카페24 회원 ID 매핑 (웹훅 수신 upsert)
-- ============================================================
CREATE TABLE IF NOT EXISTS cafe24_members (
  id         TEXT PRIMARY KEY,
  shop_id    TEXT NOT NULL REFERENCES shops(shop_id),
  mall_id    TEXT NOT NULL,
  member_id  TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(shop_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_cafe24_members_mall ON cafe24_members(mall_id, member_id);

-- ============================================================
-- 14. app_settings — 글로벌 싱글톤 설정 (Phase 4 AI 자동답변 글로벌 토글 등)
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 기본값: 자동답변 OFF
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ai_auto_reply_global', '0');

-- ============================================================
-- 15. ai_auto_reply_failures — AI 자동답변 실패 이력 (1회 재시도 정책)
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_auto_reply_failures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id    TEXT NOT NULL REFERENCES inquiries(id),
  attempt       INTEGER NOT NULL DEFAULT 1,
  reason        TEXT NOT NULL CHECK (reason IN ('inquiry_not_found','shop_not_found','ai_error','validation_failed','held_for_review','unexpected_error')),
  detail        TEXT,
  ai_elapsed_ms INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_aarf_inquiry_id ON ai_auto_reply_failures(inquiry_id);
CREATE INDEX IF NOT EXISTS idx_aarf_created_at ON ai_auto_reply_failures(created_at);
CREATE INDEX IF NOT EXISTS idx_aarf_reason     ON ai_auto_reply_failures(reason);

-- ============================================================
-- 16. webhook_events — 플랫폼 웹훅 수신 이벤트 영구 기록
-- PII가 포함되는 이벤트(예: 카페24 90032 회원 가입)는 저장 전 redact.
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_events (
  id          TEXT PRIMARY KEY,
  platform    TEXT NOT NULL,                -- 'cafe24' 등
  event_no    INTEGER,                      -- 90077, 90078, 90157, 90032 ...
  mall_id     TEXT,
  shop_id     TEXT,
  auth_method TEXT NOT NULL,                -- 'hmac' | 'api_key' | 'none'
  auth_valid  INTEGER NOT NULL DEFAULT 0,   -- 0=실패/미인증, 1=검증 성공
  headers     TEXT,                         -- JSON (민감 헤더 mask)
  payload     TEXT,                         -- 원본 바디 (PII 이벤트는 redact)
  action      TEXT,                         -- 처리 결과 라벨
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_mall       ON webhook_events(mall_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_shop       ON webhook_events(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event      ON webhook_events(event_no, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
