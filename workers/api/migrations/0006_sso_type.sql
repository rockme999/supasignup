-- Migration: 0006_sso_type
-- Description: shops 테이블에 sso_type 컬럼 추가 (카페24 SSO 앱 슬롯 식별자: sso, sso1, sso2, ...)
ALTER TABLE shops ADD COLUMN sso_type TEXT NOT NULL DEFAULT 'sso';
