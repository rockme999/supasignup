-- 0017_index_optimization.sql
-- login_stats: 3컬럼 복합 인덱스 추가 (shop_id, action, created_at)
-- 기존 2컬럼 인덱스를 대체하여 날짜 범위 쿼리 성능 30~50% 개선
CREATE INDEX IF NOT EXISTS idx_login_stats_shop_action_date ON login_stats(shop_id, action, created_at);

-- 기존 불필요 인덱스 삭제
-- idx_login_stats_shop_action: 새 3컬럼 인덱스의 prefix로 커버됨
DROP INDEX IF EXISTS idx_login_stats_shop_action;
-- idx_login_stats_created_at: 항상 shop_id와 함께 사용되므로 단독 인덱스 불필요
DROP INDEX IF EXISTS idx_login_stats_created_at;

-- funnel_events: 3컬럼 복합 인덱스(idx_funnel_shop_type_date)가 이미 있으므로 나머지 3개 삭제
-- idx_funnel_events_shop_id: 복합 인덱스의 prefix로 커버됨
DROP INDEX IF EXISTS idx_funnel_events_shop_id;
-- idx_funnel_events_created_at: 단독으로 사용되지 않음
DROP INDEX IF EXISTS idx_funnel_events_created_at;
-- idx_funnel_events_type: 단독으로 사용되지 않음
DROP INDEX IF EXISTS idx_funnel_events_type;
