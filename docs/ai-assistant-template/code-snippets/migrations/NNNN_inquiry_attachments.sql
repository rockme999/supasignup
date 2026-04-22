-- Phase 2: 문의 이미지 첨부 기능
-- 2026-04-21
-- inquiries 테이블에 attachments 컬럼 추가 (R2 객체 메타 JSON 배열)
-- SQLite ALTER TABLE ADD COLUMN 사용 가능 (CHECK 변경 없으므로 테이블 재생성 불필요)

ALTER TABLE inquiries ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]';
