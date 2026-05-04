-- Migration 0034: 카카오톡 채널 친구 추가 + 업데이트 소식 알림 토글
--
-- Phase 2 (B-1: 자체 구축, 발송대행사 미사용):
-- 1) kakao_channel_added/added_at: 운영자가 @번개가입 채널을 친구로 추가한 사실 추적
--    Kakao JS SDK addChannel callback 시점에 PUT으로 1 갱신.
--    매주 manual broadcast 시 친구 추가율 통계용.
-- 2) update_news_*: AI 주간 브리핑과 별개로 "번개가입 앱 업데이트 소식" 수신 토글.
--    이메일/알림톡 별도 토글, 둘 다 기본 ON.
--    auto_briefing_*는 매주 정기 보고용, update_news_*는 비정기 릴리즈/공지용.
ALTER TABLE shops ADD COLUMN kakao_channel_added INTEGER NOT NULL DEFAULT 0;
ALTER TABLE shops ADD COLUMN kakao_channel_added_at TEXT;
ALTER TABLE shops ADD COLUMN update_news_email INTEGER NOT NULL DEFAULT 1;
ALTER TABLE shops ADD COLUMN update_news_alimtalk INTEGER NOT NULL DEFAULT 1;
