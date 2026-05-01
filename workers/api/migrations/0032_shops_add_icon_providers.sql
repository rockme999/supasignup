-- Migration 0032: shops.icon_providers
-- 아이콘 모드 프로바이더 ID 배열 (JSON). enabled_providers 의 부분집합.
-- 빈 배열('[]') = 전부 풀버튼 모드 = 기존 동작 동일.
-- last-used override는 모드와 무관하게 풀버튼 promote 유지.
ALTER TABLE shops ADD COLUMN icon_providers TEXT NOT NULL DEFAULT '[]';
