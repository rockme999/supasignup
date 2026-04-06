CREATE TABLE IF NOT EXISTS coupon_issues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shop_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  coupon_type TEXT NOT NULL,         -- 'shipping', 'amount', 'rate'
  coupon_no INTEGER NOT NULL,        -- 카페24 쿠폰 번호
  issued_at TEXT NOT NULL DEFAULT (datetime('now')),
  used_at TEXT,                       -- 사용 시각 (2단계에서 업데이트)
  order_id TEXT,                      -- 사용된 주문번호 (2단계에서 업데이트)
  FOREIGN KEY (shop_id) REFERENCES shops(shop_id)
);

CREATE INDEX idx_coupon_issues_shop ON coupon_issues(shop_id, issued_at);
CREATE INDEX idx_coupon_issues_member ON coupon_issues(shop_id, member_id);
