-- AI 자동답변 Phase 1 스키마 변경
-- 2026-04-21

-- 1. shops 테이블: AI 자동답변 활성화 컬럼 추가
ALTER TABLE shops ADD COLUMN auto_reply_inquiries INTEGER NOT NULL DEFAULT 0;

-- 2. inquiries 테이블: SQLite는 CHECK 제약 직접 변경 불가 → 테이블 복사 방식으로 처리
--    기존 status CHECK('pending','replied','closed') → 'auto_replied' 추가
--    ai_prompt_version, ai_model, ai_elapsed_ms 컬럼도 동시 추가

CREATE TABLE inquiries_new (
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
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO inquiries_new
  (id, shop_id, owner_id, title, content, status, reply, replied_at, created_at, updated_at)
SELECT
  id, shop_id, owner_id, title, content, status, reply, replied_at, created_at, updated_at
FROM inquiries;

DROP TABLE inquiries;
ALTER TABLE inquiries_new RENAME TO inquiries;

-- 인덱스 재생성
CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id    ON inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_owner_id   ON inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
