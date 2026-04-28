-- 0029: ai_briefings.headline 컬럼 추가
-- 대시보드 홈 카드에 표시할 한 줄 요약 (AI 생성)
ALTER TABLE ai_briefings ADD COLUMN headline TEXT;
