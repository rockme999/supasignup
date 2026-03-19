-- Migration: owners.deleted_at 컬럼 추가 (계정 탈퇴 soft delete)
-- Date: 2026-03-20

ALTER TABLE owners ADD COLUMN deleted_at TEXT;
