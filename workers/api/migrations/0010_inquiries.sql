-- Migration: 0010_inquiries
-- Description: 1:1 문의 게시판 테이블 생성

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

CREATE INDEX IF NOT EXISTS idx_inquiries_shop_id ON inquiries(shop_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_owner_id ON inquiries(owner_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at);
