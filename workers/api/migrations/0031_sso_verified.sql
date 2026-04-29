-- Migration 0031: shops.sso_verified_at / sso_verified_slots
-- SSO 설정 확인 결과 영구 보존 — 페이지 재진입 시 SSR로 결과 렌더링에 사용
-- sso_verified_at : 마지막 성공 검증 시각 (NULL = 미검증)
-- sso_verified_slots: 슬롯 상태 JSON 배열 [{type,status}]
ALTER TABLE shops ADD COLUMN sso_verified_at TEXT;
ALTER TABLE shops ADD COLUMN sso_verified_slots TEXT;
