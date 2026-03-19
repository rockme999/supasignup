-- Migration: 0003_admin_features
-- Description: Phase 8 - 관리자 앱 기능 추가
--   owners.role 컬럼 추가, audit_logs 테이블 생성

-- owners 테이블에 role 컬럼 추가
-- SQLite는 CHECK constraint를 ALTER TABLE ADD COLUMN으로 추가할 수 없으므로
-- DEFAULT 값만 지정하고, 애플리케이션 레이어에서 유효값 검증 처리
ALTER TABLE owners ADD COLUMN role TEXT NOT NULL DEFAULT 'user';

-- audit_logs 테이블 생성
CREATE TABLE IF NOT EXISTS audit_logs (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id   TEXT,
  detail      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
