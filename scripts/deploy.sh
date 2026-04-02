#!/bin/bash
# ============================================================
# 번개가입 배포 스크립트
# 스테이징 → 프로덕션 안전 배포 프로세스
# ============================================================
set -euo pipefail

cd "$(dirname "$0")/../workers/api"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }
ask()  { echo -e "${YELLOW}[?]${NC} $1"; read -r REPLY; }

# ============================================================
# 1. 스키마 비교 함수
# ============================================================
compare_schemas() {
  echo ""
  echo "=== D1 스키마 비교 ==="

  PROD_SCHEMA=$(npx wrangler d1 execute bg-production --remote \
    --command "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' ORDER BY name" \
    2>/dev/null | grep -o '"name":"[^"]*"' | sort)

  DEV_SCHEMA=$(npx wrangler d1 execute bg-dev --env dev --remote \
    --command "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' ORDER BY name" \
    2>/dev/null | grep -o '"name":"[^"]*"' | sort)

  if [ "$PROD_SCHEMA" = "$DEV_SCHEMA" ]; then
    log "테이블 목록 일치"
  else
    warn "테이블 목록 불일치!"
    echo "  프로덕션: $PROD_SCHEMA"
    echo "  스테이징: $DEV_SCHEMA"
  fi
}

# ============================================================
# 2. 마이그레이션 상태 확인
# ============================================================
check_migrations() {
  echo ""
  echo "=== 마이그레이션 상태 ==="

  echo "[스테이징]"
  npx wrangler d1 migrations list bg-dev --env dev --remote 2>&1 | tail -n +5

  echo ""
  echo "[프로덕션]"
  npx wrangler d1 migrations list bg-production --remote 2>&1 | tail -n +5
}

# ============================================================
# 3. Secrets 비교
# ============================================================
check_secrets() {
  echo ""
  echo "=== Secrets 비교 ==="

  PROD_SECRETS=$(npx wrangler secret list 2>/dev/null | grep '"name"' | sort)
  DEV_SECRETS=$(npx wrangler secret list --env dev 2>/dev/null | grep '"name"' | sort)

  PROD_ONLY=$(comm -23 <(echo "$PROD_SECRETS") <(echo "$DEV_SECRETS"))
  DEV_ONLY=$(comm -13 <(echo "$PROD_SECRETS") <(echo "$DEV_SECRETS"))

  if [ -z "$PROD_ONLY" ] && [ -z "$DEV_ONLY" ]; then
    log "Secrets 목록 일치"
  else
    if [ -n "$PROD_ONLY" ]; then
      warn "프로덕션에만 있는 Secrets:"
      echo "$PROD_ONLY" | sed 's/.*"name": *"//;s/".*/  - /'
    fi
    if [ -n "$DEV_ONLY" ]; then
      warn "스테이징에만 있는 Secrets:"
      echo "$DEV_ONLY" | sed 's/.*"name": *"//;s/".*/  - /'
    fi
  fi
}

# ============================================================
# 메인 프로세스
# ============================================================
case "${1:-}" in
  check)
    echo "============================================"
    echo "  배포 전 환경 점검"
    echo "============================================"
    check_migrations
    compare_schemas
    check_secrets
    ;;

  staging)
    echo "============================================"
    echo "  스테이징 배포"
    echo "============================================"

    log "스테이징 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-dev --env dev --remote

    log "스테이징 Worker 배포..."
    npx wrangler deploy --env dev

    log "스테이징 배포 완료!"
    echo "  → https://bg-dev.suparain.kr/health 에서 확인하세요"
    ;;

  production)
    echo "============================================"
    echo "  프로덕션 배포"
    echo "============================================"
    warn "프로덕션에 배포합니다. 실행 중인 서비스에 영향을 줄 수 있습니다."
    ask "계속하시겠습니까? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    log "프로덕션 D1 백업 생성..."
    npx wrangler d1 backup create bg-production --remote 2>&1 || warn "백업 명령 실패 (D1 backup API 미지원 가능)"

    log "프로덕션 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-production --remote

    log "스키마 비교 검증..."
    compare_schemas

    ask "스키마 검증을 확인했습니다. 프로덕션 Worker를 배포할까요? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    log "프로덕션 Worker 배포..."
    npx wrangler deploy

    log "프로덕션 배포 완료!"
    echo "  → https://bg.suparain.kr/health 에서 확인하세요"
    ;;

  full)
    echo "============================================"
    echo "  전체 배포 (스테이징 → 프로덕션)"
    echo "============================================"

    # Step 1: 환경 점검
    check_migrations
    compare_schemas
    check_secrets

    ask "환경 점검 결과를 확인했습니다. 스테이징 배포를 진행할까요? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    # Step 2: 스테이징 배포
    log "스테이징 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-dev --env dev --remote

    log "스테이징 Worker 배포..."
    npx wrangler deploy --env dev

    log "스테이징 배포 완료!"
    ask "스테이징 테스트를 완료한 후 Enter를 누르세요. 프로덕션 배포를 진행할까요? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    # Step 3: 프로덕션 배포
    log "프로덕션 D1 백업 생성..."
    npx wrangler d1 backup create bg-production --remote 2>&1 || warn "백업 명령 실패"

    log "프로덕션 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-production --remote

    log "스키마 비교 검증..."
    compare_schemas

    ask "프로덕션 Worker를 배포할까요? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    log "프로덕션 Worker 배포..."
    npx wrangler deploy

    log "전체 배포 완료!"
    ;;

  *)
    echo "사용법: $0 {check|staging|production|full}"
    echo ""
    echo "  check       환경 점검 (스키마, 마이그레이션, Secrets 비교)"
    echo "  staging     스테이징만 배포"
    echo "  production  프로덕션만 배포 (확인 절차 포함)"
    echo "  full        전체 배포 (스테이징 → 테스트 → 프로덕션)"
    ;;
esac
