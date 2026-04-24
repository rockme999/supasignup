-- 플랫폼 웹훅 수신 이벤트 영구 기록
-- 2026-04-22
-- 카페24 등 외부 플랫폼에서 수신하는 모든 웹훅을 DB에 기록하여
-- 예) 앱 정지 원인 추적, HMAC 실패/재전송 패턴 분석, 이벤트 히스토리 감사에 활용
CREATE TABLE IF NOT EXISTS webhook_events (
  id           TEXT PRIMARY KEY,
  platform     TEXT NOT NULL,                    -- 'cafe24' 등
  event_no     INTEGER,                          -- 90001, 90002, 90077, 90083, 90157, 90159 ...
  mall_id      TEXT,                             -- payload.resource.mall_id
  shop_id      TEXT,                             -- 매칭된 shops.shop_id (없으면 NULL)
  auth_method  TEXT NOT NULL,                    -- 'hmac' | 'api_key' | 'none'
  auth_valid   INTEGER NOT NULL DEFAULT 0,       -- 0 = 실패/미인증, 1 = 검증 성공
  headers      TEXT,                             -- 요청 헤더 JSON
  payload      TEXT,                             -- 원본 바디 (JSON 문자열 그대로)
  action       TEXT,                             -- 처리 결과: 'plan_downgraded' | 'soft_deleted' | 'payment_complete' | 'refund_complete' | 'member_joined' | 'shop_not_found' | 'ignored' | 'auth_failed' | 'invalid_json'
  note         TEXT,                             -- 추가 메모/에러 메시지
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_mall       ON webhook_events(mall_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_shop       ON webhook_events(shop_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event      ON webhook_events(event_no, created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at);
