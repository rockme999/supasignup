-- 0020: cafe24_members 테이블 추가
-- 카페24 member_joined 웹훅(90083) 수신 시 회원 ID를 저장하여
-- 쿠폰 발급 등에서 참조할 수 있도록 함.

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
