-- Migration 0030: shops.live_counter_config
-- 라이브 가입자 카운터 설정 컬럼 추가 (Plus 전용 sticky 카운터 + 토스트)
-- JSON shape: { enabled, position, show_toast, show_counter }
-- NULL = 기본값(활성). Plus 플랜 + 일 평균 ≥3명 threshold 통과 시 자동 활성.
ALTER TABLE shops ADD COLUMN live_counter_config TEXT;
