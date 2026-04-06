-- funnel_events에 visitor_id 컬럼 추가 (JSON에서 정규화)
-- visitor_id가 event_data JSON 안에만 있으면 json_extract()로 인덱스를 탈 수 없어
-- trigger 분포, product views, time-to-signup 쿼리에서 풀스캔 발생.
-- 정규화 컬럼으로 분리하여 복합 인덱스 사용 가능하게 함.

ALTER TABLE funnel_events ADD COLUMN visitor_id TEXT;

-- 기존 데이터 백필
UPDATE funnel_events SET visitor_id = json_extract(event_data, '$.visitor_id')
WHERE json_extract(event_data, '$.visitor_id') IS NOT NULL;

-- 인덱스 추가 (shop_id + visitor_id + event_type + created_at)
CREATE INDEX IF NOT EXISTS idx_funnel_visitor ON funnel_events(shop_id, visitor_id, event_type, created_at);
