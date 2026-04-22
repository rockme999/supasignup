-- 문의 조회 시점 추적 (Phase 4+)
-- 2026-04-22
-- customer_read_at: 쇼핑몰 운영자(고객)가 답변을 처음 조회한 시각
-- admin_read_at: 수파레인 관리자가 문의를 처음 열어본 시각
ALTER TABLE inquiries ADD COLUMN customer_read_at TEXT;
ALTER TABLE inquiries ADD COLUMN admin_read_at TEXT;

CREATE INDEX IF NOT EXISTS idx_inquiries_admin_read_at    ON inquiries(admin_read_at);
CREATE INDEX IF NOT EXISTS idx_inquiries_customer_read_at ON inquiries(customer_read_at);
