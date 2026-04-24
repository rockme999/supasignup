-- plan 컬럼 정규화 — 상품 유형(plan)과 결제 주기(billing_cycle) 분리
-- 2026-04-24
--
-- 배경: 초창기 DB는 shops.plan / subscriptions.plan에 'monthly' 또는 'yearly'를 저장했으나,
-- 이후 설계가 "plan = 'plus' (상품 유형) + billing_cycle = 'monthly'|'yearly' (주기)"로 바뀌었음.
-- 타입 정의(bg-core/types.ts)와 docs/schema.sql은 새 설계에 맞춰져 있었지만 실 DB와 코드(billing.tsx,
-- cafe24.ts 결제완료 핸들러)는 계속 'monthly'/'yearly'를 plan 컬럼에 INSERT/UPDATE했다.
-- 이번 마이그레이션으로 실 DB를 설계에 맞춰 정규화한다.
--
-- D1 제약 — foreign_keys 강제 활성화 상태라 shops 테이블을 DROP/RENAME할 수 없다 (shop_users,
-- funnel_events, inquiries, login_stats, cafe24_members, coupon_issues, ai_briefings 등 다수가
-- FK 참조). 따라서 shops는 테이블 재생성이 아닌 "컬럼 교체"(ADD/UPDATE/DROP/RENAME) 방식을 쓴다.
-- 컬럼 교체는 테이블 identity를 유지하므로 FK 검사와 무관.
-- 단점: ALTER TABLE ADD COLUMN으로는 CHECK 제약을 추가할 수 없다 → 새 plan 컬럼에는 CHECK 제약이
-- 없다. 유효성은 애플리케이션 레이어(billing.tsx, admin.ts 입력 검증)에서 enforce한다.
-- subscriptions는 자신을 FK로 참조하는 테이블이 없어 정상 재생성이 가능.

-- ─── 1. subscriptions 재생성 (CHECK 제약 포함) ────────────────
CREATE TABLE subscriptions_new (
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

-- 데이터 이관 — plan='plus' 고정, 기존 plan('monthly'|'yearly')을 billing_cycle로 복사
-- (기존 billing_cycle 컬럼은 DEFAULT 'monthly' 때문에 올바르게 채워지지 않은 상태라, 기존 plan
-- 컬럼에서 복원하는 것이 정확함)
INSERT INTO subscriptions_new (id, owner_id, shop_id, plan, billing_cycle, status, payment_id, started_at, expires_at, created_at)
SELECT
  id,
  owner_id,
  shop_id,
  'plus',
  CASE WHEN plan IN ('monthly', 'yearly') THEN plan ELSE 'monthly' END,
  status,
  payment_id,
  started_at,
  expires_at,
  created_at
FROM subscriptions;

DROP TABLE subscriptions;
ALTER TABLE subscriptions_new RENAME TO subscriptions;

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner_id   ON subscriptions(owner_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status     ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_id ON subscriptions(payment_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_shop_id    ON subscriptions(shop_id);

-- ─── 2. shops.plan 컬럼 교체 ('free'|'monthly'|'yearly' → 'free'|'plus') ───
-- 테이블 재생성 불가 이유로 컬럼 단위로 교체. 기존 CHECK('free','monthly','yearly')는 제거되고
-- 새 plan 컬럼에는 CHECK가 없어진다 (ADD COLUMN 제약). 입력 검증은 애플리케이션에서 처리.
ALTER TABLE shops ADD COLUMN plan_new TEXT NOT NULL DEFAULT 'free';
UPDATE shops SET plan_new = CASE WHEN plan = 'free' THEN 'free' ELSE 'plus' END;
ALTER TABLE shops DROP COLUMN plan;
ALTER TABLE shops RENAME COLUMN plan_new TO plan;
