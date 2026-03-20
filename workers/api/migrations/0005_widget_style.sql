-- Migration: 0005_widget_style
-- Description: shops 테이블에 widget_style 컬럼 추가 (위젯 커스터마이징)
ALTER TABLE shops ADD COLUMN widget_style TEXT;
