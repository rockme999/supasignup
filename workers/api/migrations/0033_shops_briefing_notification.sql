-- Migration 0033: AI 주간 브리핑 자동 발송 인프라
--
-- 1) 카페24 운영자 연락처 캐시 (4컬럼)
--    owners.email은 카페24 OAuth 가입 시 @cafe24.auto 더미로 채워져 발송 불가.
--    /admin/store API에서 가져온 진짜 연락처를 별도 컬럼에 저장.
-- 2) 발송 채널 토글 (2컬럼, 기본 ON)
--    이메일은 즉시 사용. 알림톡은 Phase 2에서 발송 코드 추가 예정 (컬럼만 선반영).
ALTER TABLE shops ADD COLUMN store_email TEXT;
ALTER TABLE shops ADD COLUMN store_phone TEXT;
ALTER TABLE shops ADD COLUMN store_admin_name TEXT;
ALTER TABLE shops ADD COLUMN store_synced_at TEXT;
ALTER TABLE shops ADD COLUMN auto_briefing_email INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shops ADD COLUMN auto_briefing_alimtalk INTEGER NOT NULL DEFAULT 1;
