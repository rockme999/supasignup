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

# 빌드 메타데이터를 wrangler --var 플래그로 변환.
# /version 엔드포인트가 노출하는 commit/version/built_at 값.
# git이 dirty 상태(uncommitted changes)면 commit hash에 -dirty suffix.
build_vars() {
  local sha
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    sha="${sha}-dirty"
  fi
  local time
  time=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local ver
  ver=$(node -e "console.log(require('./package.json').version)" 2>/dev/null || echo "unknown")
  echo "--var COMMIT_SHA:$sha --var BUILD_TIME:$time --var VERSION:$ver"
}

# 가장 최근 배포의 version-id 추출 (롤백 대상).
# wrangler 4.x는 deployments list 출력에서 'Version(s):' 줄 또는 별도 줄에 UUID 표시.
# 시간순 정렬되어 마지막(tail -1)이 가장 최신.
get_latest_version_id() {
  local env_flag=${1:-}
  npx wrangler deployments list $env_flag 2>&1 \
    | grep -oE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" \
    | tail -1
}

# 배포 직전 호출 — 현재 운영 중인 version-id를 변수에 저장하고
# 운영자가 즉시 복구 가능하도록 명시 출력.
# 사용법: capture_rollback_target "스테이징|프로덕션" "--env dev|''"
# 결과는 ROLLBACK_VERSION_ID 전역 변수에 저장.
capture_rollback_target() {
  local label=$1
  local env_flag=${2:-}
  log "이전 $label 버전 ID 캡처 (롤백 대비)..."
  ROLLBACK_VERSION_ID=$(get_latest_version_id "$env_flag")
  if [ -n "$ROLLBACK_VERSION_ID" ]; then
    local rollback_cmd="npx wrangler rollback $ROLLBACK_VERSION_ID"
    [ -n "$env_flag" ] && rollback_cmd="$rollback_cmd $env_flag"
    echo "  ────────────────────────────────────────────────────────────"
    echo "  사고 시 즉시 복구 명령:"
    echo "    $rollback_cmd"
    echo "  ────────────────────────────────────────────────────────────"
  else
    warn "이전 버전 ID 조회 실패 (첫 배포이거나 wrangler 출력 형식 변경)"
    ROLLBACK_VERSION_ID=""
  fi
}

# 배포 직후 호출 — health 엔드포인트를 30초 간격 3회(총 90초) 폴링.
# 1회라도 실패하면 롤백 명령 강조 출력 후 함수는 1 반환 (스크립트 흐름은 계속).
# 5분이 아닌 90초로 제한한 이유: 1인 운영자 시간 절감, 사고는 보통 첫 분 내 가시화.
health_check_after_deploy() {
  local url=$1
  local rollback_id=${2:-}
  local env_flag=${3:-}

  echo ""
  echo "=== 배포 후 헬스체크 (30초 간격 3회, 총 90초) ==="
  local fail=0
  for i in 1 2 3; do
    sleep 30
    if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
      log "  [$i/3] $url OK"
    else
      echo -e "  ${RED}[✗]${NC} [$i/3] $url 응답 실패"
      fail=1
    fi
  done

  if [ "$fail" = "1" ]; then
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}  헬스체크 실패 — 롤백 권장${NC}"
    echo -e "${RED}========================================${NC}"
    if [ -n "$rollback_id" ]; then
      local rollback_cmd="npx wrangler rollback $rollback_id"
      [ -n "$env_flag" ] && rollback_cmd="$rollback_cmd $env_flag"
      echo "  실행 명령: $rollback_cmd"
    fi
    echo "  로그 확인: npx wrangler tail $env_flag"
    return 1
  fi
  log "안정 운영 확인 (90초). 이후로는 직접 모니터링하세요."
  return 0
}

# /version 엔드포인트에서 commit hash 추출.
# 도달 불가하면 'unreachable', 응답 파싱 실패 시 'unknown'.
fetch_remote_commit() {
  local url=$1
  local response
  response=$(curl -s --max-time 5 "$url" 2>/dev/null) || { echo "unreachable"; return; }
  echo "$response" | node -e "
    let data='';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try { console.log(JSON.parse(data).commit || 'unknown'); }
      catch { console.log('unknown'); }
    });
  " 2>/dev/null || echo "unknown"
}

# 로컬 git HEAD vs 스테이징·프로덕션 /version 응답의 commit hash 비교.
# 갭 발견 시 누락된 commit 메시지 표시. dirty 상태 자동 감지.
check_commit_gap() {
  echo ""
  echo "=== 코드 commit 갭 감지 ==="

  local local_sha
  local_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  local local_dirty=""
  if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
    local_dirty=" (dirty)"
  fi

  local staging_sha prod_sha
  staging_sha=$(fetch_remote_commit "https://bg-dev.suparain.kr/version")
  prod_sha=$(fetch_remote_commit "https://bg.suparain.kr/version")

  echo "  로컬 git HEAD:   $local_sha$local_dirty"
  echo "  스테이징 commit: $staging_sha"
  echo "  프로덕션 commit: $prod_sha"

  # commit hash 비교 (dirty suffix 무시)
  local staging_base="${staging_sha%-dirty}"
  local prod_base="${prod_sha%-dirty}"

  if [ "$staging_base" = "unreachable" ] || [ "$prod_base" = "unreachable" ]; then
    warn "한쪽 환경 도달 불가 — 네트워크 또는 미배포 상태"
    return
  fi

  if [ "$local_sha" = "$staging_base" ] && [ "$staging_base" = "$prod_base" ]; then
    log "양 환경 + 로컬 일치 — 클린 baseline ($local_sha)"
    [ -n "$local_dirty" ] && warn "단, 로컬은 uncommitted 변경 있음 (배포 시 -dirty suffix)"
  else
    if [ "$local_sha" != "$staging_base" ]; then
      warn "로컬 → 스테이징 갭 (로컬 $local_sha vs 스테이징 $staging_base)"
      if git rev-parse --verify "$staging_base" >/dev/null 2>&1; then
        echo "    누락 commits (스테이징에 갈 것):"
        git log --oneline "$staging_base..HEAD" | sed 's/^/      /'
      fi
    fi
    if [ "$staging_base" != "$prod_base" ]; then
      warn "스테이징 → 프로덕션 갭 (스테이징 $staging_base vs 프로덕션 $prod_base)"
      if git rev-parse --verify "$prod_base" >/dev/null 2>&1 && git rev-parse --verify "$staging_base" >/dev/null 2>&1; then
        echo "    누락 commits (프로덕션에 갈 것):"
        git log --oneline "$prod_base..$staging_base" | sed 's/^/      /'
      fi
    fi
  fi
}

# 마이그레이션 SQL 파일 정적 분석 — 위험 패턴 감지.
# DROP TABLE / DROP COLUMN / RENAME / 가드 없는 CREATE TABLE / ALTER ADD COLUMN 발견 시 경고.
# 차단은 하지 않고 정보 제공만. 실제 적용은 사용자 의식적 결정.
check_migration_safety() {
  echo ""
  echo "=== 마이그레이션 SQL 안전성 검사 ==="

  local migrations_dir="migrations"
  if [ ! -d "$migrations_dir" ]; then
    warn "migrations 디렉토리 없음"
    return
  fi

  local risk_count=0
  local total_count=0

  for sql in "$migrations_dir"/*.sql; do
    [ -f "$sql" ] || continue
    total_count=$((total_count + 1))
    local fname
    fname=$(basename "$sql")
    local risks=()

    # 위험 패턴 (대소문자 무시)
    grep -qiE "DROP[[:space:]]+TABLE" "$sql" && risks+=("DROP TABLE")
    grep -qiE "DROP[[:space:]]+COLUMN" "$sql" && risks+=("DROP COLUMN")
    grep -qiE "RENAME[[:space:]]+(TABLE|TO|COLUMN)" "$sql" && risks+=("RENAME (테이블 재생성 패턴)")

    # CREATE TABLE without IF NOT EXISTS
    if grep -qiE "^[[:space:]]*CREATE[[:space:]]+TABLE[[:space:]]+[^(I]" "$sql" \
         || grep -qiE "^[[:space:]]*CREATE[[:space:]]+TABLE[[:space:]]+[^I]+\(" "$sql"; then
      # IF NOT EXISTS 없는 CREATE TABLE 추정
      if ! grep -qiE "CREATE[[:space:]]+TABLE[[:space:]]+IF[[:space:]]+NOT[[:space:]]+EXISTS" "$sql"; then
        risks+=("CREATE TABLE without IF NOT EXISTS")
      fi
    fi

    # ALTER TABLE ADD COLUMN — D1은 IF NOT EXISTS 가드 미지원, 재실행 시 에러
    grep -qiE "ALTER[[:space:]]+TABLE.*ADD[[:space:]]+COLUMN" "$sql" \
      && risks+=("ALTER TABLE ADD COLUMN (재실행 시 에러)")

    if [ ${#risks[@]} -gt 0 ]; then
      risk_count=$((risk_count + 1))
      warn "$fname:"
      for r in "${risks[@]}"; do
        echo "    ⚠ $r"
      done
    fi
  done

  if [ "$risk_count" = "0" ]; then
    log "모든 마이그레이션 SQL이 안전 패턴 ($total_count개 검사)"
  else
    echo ""
    warn "$risk_count / $total_count 개 마이그레이션에 위험 패턴 발견"
    echo "  ⓘ 이미 적용된 마이그레이션은 재실행되지 않으니 이전 적용분은 무시 가능."
    echo "  ⓘ 새 마이그레이션 작성 시 IF NOT EXISTS 가드 + 파괴적 명령 회피 권장."
    echo "  ⓘ 자세한 가이드: docs/DEPLOYMENT.md → '마이그레이션 작성 규칙'"
  fi
}

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
    check_commit_gap
    check_migrations
    compare_schemas
    check_schema_sync
    check_secrets
    check_migration_safety
    ;;

  staging)
    echo "============================================"
    echo "  스테이징 배포"
    echo "============================================"

    log "스테이징 마이그레이션 적용..."
    npx wrangler d1 migrations apply bg-dev --env dev --remote

    capture_rollback_target "스테이징" "--env dev"

    log "빌드 메타데이터 생성..."
    node ../../scripts/build-meta.mjs
    node ../../scripts/build-changelog.mjs

    log "스테이징 Worker 배포 (빌드 메타데이터 주입)..."
    # shellcheck disable=SC2046
    npx wrangler deploy --env dev $(build_vars)

    log "스테이징 배포 완료!"
    echo "  → https://bg-dev.suparain.kr/health (헬스체크)"
    echo "  → https://bg-dev.suparain.kr/version (배포 버전 확인)"

    health_check_after_deploy "https://bg-dev.suparain.kr/health" "$ROLLBACK_VERSION_ID" "--env dev" || true
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

    capture_rollback_target "프로덕션" ""

    log "빌드 메타데이터 생성..."
    node ../../scripts/build-meta.mjs
    node ../../scripts/build-changelog.mjs

    log "프로덕션 Worker 배포 (빌드 메타데이터 주입)..."
    # shellcheck disable=SC2046
    npx wrangler deploy $(build_vars)

    log "프로덕션 배포 완료!"
    echo "  → https://bg.suparain.kr/health (헬스체크)"
    echo "  → https://bg.suparain.kr/version (배포 버전 확인)"

    health_check_after_deploy "https://bg.suparain.kr/health" "$ROLLBACK_VERSION_ID" "" || true
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

    capture_rollback_target "스테이징" "--env dev"
    STAGING_ROLLBACK_ID=$ROLLBACK_VERSION_ID

    log "빌드 메타데이터 생성..."
    node ../../scripts/build-meta.mjs
    node ../../scripts/build-changelog.mjs

    log "스테이징 Worker 배포 (빌드 메타데이터 주입)..."
    # shellcheck disable=SC2046
    npx wrangler deploy --env dev $(build_vars)

    log "스테이징 배포 완료!"
    echo "  → https://bg-dev.suparain.kr/version 에서 버전 확인 가능"

    health_check_after_deploy "https://bg-dev.suparain.kr/health" "$STAGING_ROLLBACK_ID" "--env dev" || true

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

    capture_rollback_target "프로덕션" ""

    log "빌드 메타데이터 생성..."
    node ../../scripts/build-meta.mjs
    node ../../scripts/build-changelog.mjs

    log "프로덕션 Worker 배포 (빌드 메타데이터 주입)..."
    # shellcheck disable=SC2046
    npx wrangler deploy $(build_vars)

    log "전체 배포 완료!"
    echo "  → https://bg.suparain.kr/version 에서 버전 확인 가능"

    health_check_after_deploy "https://bg.suparain.kr/health" "$ROLLBACK_VERSION_ID" "" || true
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
