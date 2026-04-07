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

# D1 테이블 목록 조회 헬퍼 (JSON 파싱 개선)
get_tables() {
  local DB_NAME=$1
  local ENV_FLAG=${2:-}
  npx wrangler d1 execute "$DB_NAME" $ENV_FLAG --remote --json \
    --command "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'd1_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE 'sqlite_%' ORDER BY name" \
    2>/dev/null | node -e "
      const chunks = [];
      process.stdin.on('data', c => chunks.push(c));
      process.stdin.on('end', () => {
        try {
          const data = JSON.parse(chunks.join(''));
          const results = data[0]?.results || [];
          results.forEach(r => console.log(r.name));
        } catch(e) {
          process.exit(1);
        }
      });
    " 2>/dev/null | sort
}

# ============================================================
# 1. 스키마 비교 함수
# ============================================================
compare_schemas() {
  echo ""
  echo "=== D1 스키마 비교 ==="

  PROD_SCHEMA=$(get_tables bg-production || echo "")
  DEV_SCHEMA=$(get_tables bg-dev "--env dev" || echo "")

  if [ -z "$PROD_SCHEMA" ] || [ -z "$DEV_SCHEMA" ]; then
    warn "스키마 조회 실패 — 수동 확인 필요"
    [ -z "$PROD_SCHEMA" ] && warn "  프로덕션 DB 조회 실패"
    [ -z "$DEV_SCHEMA" ] && warn "  스테이징 DB 조회 실패"
    return 1
  fi

  PROD_ONLY=$(comm -23 <(echo "$PROD_SCHEMA") <(echo "$DEV_SCHEMA"))
  DEV_ONLY=$(comm -13 <(echo "$PROD_SCHEMA") <(echo "$DEV_SCHEMA"))

  if [ -z "$PROD_ONLY" ] && [ -z "$DEV_ONLY" ]; then
    log "테이블 목록 일치"
    echo "  테이블: $(echo "$PROD_SCHEMA" | tr '\n' ', ')"
  else
    warn "테이블 목록 불일치!"
    if [ -n "$PROD_ONLY" ]; then
      echo -e "  ${RED}프로덕션에만 있는 테이블:${NC}"
      echo "$PROD_ONLY" | sed 's/^/    - /'
    fi
    if [ -n "$DEV_ONLY" ]; then
      echo -e "  ${RED}스테이징에만 있는 테이블:${NC}"
      echo "$DEV_ONLY" | sed 's/^/    - /'
      echo ""
      err "스테이징에만 있는 테이블이 있습니다. 마이그레이션 파일을 먼저 생성하세요!"
    fi
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
# 3. docs/schema.sql과 실제 DB 테이블 정합성 검증
# ============================================================
check_schema_sync() {
  echo ""
  echo "=== docs/schema.sql 정합성 검증 ==="

  local SCHEMA_FILE="../../docs/schema.sql"
  if [ ! -f "$SCHEMA_FILE" ]; then
    warn "docs/schema.sql 파일이 없습니다"
    return
  fi

  # schema.sql에서 CREATE TABLE 이름 추출
  DOC_TABLES=$(grep -iE "^CREATE TABLE" "$SCHEMA_FILE" \
    | sed -E 's/CREATE TABLE (IF NOT EXISTS )?//i' \
    | sed -E 's/[[:space:]]*\(.*//' \
    | tr -d '`" ' \
    | sort)

  DEV_SCHEMA=$(get_tables bg-dev "--env dev" || echo "")

  if [ -z "$DEV_SCHEMA" ]; then
    warn "스테이징 DB 조회 실패 — 정합성 검증 건너뜀"
    return
  fi

  # schema.sql에 있지만 DB에 없는 테이블
  DOC_ONLY=$(comm -23 <(echo "$DOC_TABLES") <(echo "$DEV_SCHEMA"))
  # DB에 있지만 schema.sql에 없는 테이블
  DB_ONLY=$(comm -13 <(echo "$DOC_TABLES") <(echo "$DEV_SCHEMA") | grep -v -E "^(sqlite_sequence|_cf_KV)$" || true)

  if [ -z "$DOC_ONLY" ] && [ -z "$DB_ONLY" ]; then
    log "docs/schema.sql과 스테이징 DB 테이블 일치"
  else
    if [ -n "$DOC_ONLY" ]; then
      warn "docs/schema.sql에 있지만 DB에 없는 테이블:"
      echo "$DOC_ONLY" | sed 's/^/    - /'
    fi
    if [ -n "$DB_ONLY" ]; then
      warn "DB에 있지만 docs/schema.sql에 없는 테이블:"
      echo "$DB_ONLY" | sed 's/^/    - /'
    fi
  fi

  # 마이그레이션 파일에서 CREATE TABLE 이름 추출
  MIGRATION_TABLES=$(grep -ihE "CREATE TABLE" migrations/*.sql 2>/dev/null \
    | sed -E 's/.*CREATE TABLE (IF NOT EXISTS )?//i' \
    | sed -E 's/[[:space:]]*\(.*//' \
    | tr -d '`" ' \
    | sort -u)

  # DB에 있는 사용자 테이블 중 마이그레이션에 없는 것
  UNMIGRATED=$(comm -13 <(echo "$MIGRATION_TABLES") <(echo "$DEV_SCHEMA") | grep -v -E "^(sqlite_sequence|_cf_KV)$" || true)
  if [ -n "$UNMIGRATED" ]; then
    echo ""
    warn "DB에 있지만 마이그레이션 파일에 CREATE TABLE이 없는 테이블:"
    echo "$UNMIGRATED" | sed 's/^/    - /'
    echo "  → 수동 생성된 테이블일 수 있습니다. 마이그레이션을 만드세요!"
  fi
}

# ============================================================
# 4. Secrets 비교
# ============================================================
check_secrets() {
  echo ""
  echo "=== Secrets 비교 ==="

  PROD_SECRETS=$(npx wrangler secret list 2>&1 | grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"//;s/"//' | sort)
  DEV_SECRETS=$(npx wrangler secret list --env dev 2>&1 | grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]*"' | sed 's/.*"//;s/"//' | sort)

  PROD_ONLY=$(comm -23 <(echo "$PROD_SECRETS") <(echo "$DEV_SECRETS"))
  DEV_ONLY=$(comm -13 <(echo "$PROD_SECRETS") <(echo "$DEV_SECRETS"))

  if [ -z "$PROD_ONLY" ] && [ -z "$DEV_ONLY" ]; then
    log "Secrets 목록 일치 ($(echo "$PROD_SECRETS" | wc -l | tr -d ' ')개)"
  else
    if [ -n "$PROD_ONLY" ]; then
      warn "프로덕션에만 있는 Secrets:"
      echo "$PROD_ONLY" | sed 's/^/    - /'
    fi
    if [ -n "$DEV_ONLY" ]; then
      warn "스테이징에만 있는 Secrets:"
      echo "$DEV_ONLY" | sed 's/^/    - /'
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
    check_schema_sync
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

    # 배포 전 스키마 비교 (불일치 시 중단)
    log "배포 전 스키마 비교..."
    compare_schemas

    ask "계속하시겠습니까? (yes/no)"
    [ "$REPLY" = "yes" ] || err "취소됨"

    log "프로덕션 D1 백업 생성..."
    npx wrangler d1 backup create bg-production --remote 2>&1 || warn "백업 명령 실패 (D1 backup API 미지원 가능)"

    log "프로덕션 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-production --remote

    log "배포 후 스키마 재비교..."
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
    check_schema_sync
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
