#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# 번개가입 성능 벤치마크 스크립트
#
# 사용법:
#   ./scripts/benchmark.sh              # 스테이징(기본) 측정
#   ./scripts/benchmark.sh before       # "before" 라벨로 저장
#   ./scripts/benchmark.sh after        # "after" 라벨로 저장
#   ./scripts/benchmark.sh compare      # before vs after 비교
#
# 결과 저장: docs/benchmark/
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ── 설정 ────────────────────────────────────────────────────
BASE_URL="${BG_BASE_URL:-https://bg-dev.suparain.kr}"
RUNS="${BG_BENCH_RUNS:-5}"        # 각 테스트 반복 횟수
LABEL="${1:-$(date +%Y%m%d_%H%M%S)}"
OUTDIR="$(cd "$(dirname "$0")/.." && pwd)/docs/benchmark"

mkdir -p "$OUTDIR"
OUTFILE="$OUTDIR/bench_${LABEL}.txt"

# ── 유틸 함수 ──────────────────────────────────────────────
log() { echo -e "\033[1;36m▸ $1\033[0m"; }
sep() { echo "────────────────────────────────────────────"; }

# curl 타이밍 — time_total(ms), http_code, size_download 반환
# $1 = URL, $2... = extra curl args
measure() {
  local url="$1"; shift
  curl -s -o /dev/null -w '%{time_total} %{http_code} %{size_download}' "$@" "$url"
}

# N회 반복 측정 → 평균/최소/최대 (ms 단위)
bench() {
  local label="$1" url="$2"; shift 2
  local sum=0 min=999999 max=0 code=0 size=0

  for ((i=1; i<=RUNS; i++)); do
    local raw
    raw=$(measure "$url" "$@")
    local t_sec=$(echo "$raw" | awk '{print $1}')
    code=$(echo "$raw" | awk '{print $2}')
    size=$(echo "$raw" | awk '{print $3}')

    # sec → ms (정수)
    local t_ms=$(echo "$t_sec" | awk '{printf "%.0f", $1 * 1000}')
    sum=$((sum + t_ms))
    ((t_ms < min)) && min=$t_ms
    ((t_ms > max)) && max=$t_ms
  done

  local avg=$((sum / RUNS))
  printf "%-35s  avg=%4dms  min=%4dms  max=%4dms  status=%s  size=%s\n" \
    "$label" "$avg" "$min" "$max" "$code" "$size"
}

# ── 비교 모드 ──────────────────────────────────────────────
if [[ "$LABEL" == "compare" ]]; then
  BEFORE="$OUTDIR/bench_before.txt"
  AFTER="$OUTDIR/bench_after.txt"

  if [[ ! -f "$BEFORE" || ! -f "$AFTER" ]]; then
    echo "❌ before/after 파일이 필요합니다."
    echo "   먼저 실행: ./scripts/benchmark.sh before"
    echo "   배포 후:   ./scripts/benchmark.sh after"
    exit 1
  fi

  echo ""
  echo "═══════════════════════════════════════════════════════════"
  echo "  📊 성능 비교 리포트"
  echo "═══════════════════════════════════════════════════════════"
  echo ""

  # 헤더
  printf "%-35s  %12s  %12s  %10s\n" "테스트" "BEFORE(avg)" "AFTER(avg)" "개선"
  sep

  # before/after 파일에서 라인별로 비교
  while IFS= read -r line; do
    test_name=$(echo "$line" | sed 's/  avg=.*//')
    avg_before=$(echo "$line" | grep -o 'avg=[0-9]*ms' | grep -o '[0-9]*')

    # after에서 같은 테스트 찾기
    after_line=$(grep "^${test_name}" "$AFTER" 2>/dev/null || true)
    if [[ -n "$after_line" ]]; then
      avg_after=$(echo "$after_line" | grep -o 'avg=[0-9]*ms' | grep -o '[0-9]*')
      diff=$((avg_before - avg_after))
      if [[ $avg_before -gt 0 ]]; then
        pct=$(( (diff * 100) / avg_before ))
      else
        pct=0
      fi

      if [[ $diff -gt 0 ]]; then
        improvement="⬇ ${diff}ms (${pct}%)"
      elif [[ $diff -lt 0 ]]; then
        improvement="⬆ $((-diff))ms ($((-pct))%)"
      else
        improvement="━ 변동없음"
      fi

      printf "%-35s  %10sms  %10sms  %s\n" \
        "$test_name" "$avg_before" "$avg_after" "$improvement"
    fi
  done < <(grep 'avg=' "$BEFORE")

  echo ""
  echo "───────────────────────────────────────────────────────────"
  echo "  before: $(head -1 "$BEFORE")"
  echo "  after:  $(head -1 "$AFTER")"
  echo "═══════════════════════════════════════════════════════════"
  echo ""
  exit 0
fi

# ── 메인 측정 ──────────────────────────────────────────────
{
  echo "📅 $(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M:%S KST') | label=$LABEL | url=$BASE_URL | runs=$RUNS"
  sep

  # 1. Health check (baseline)
  log "Health check (baseline)"
  bench "health" "$BASE_URL/health"
  echo ""

  # 2. buttons.js — 초회 (200)
  log "buttons.js — 초회 (200 full response)"
  bench "buttons.js [200]" "$BASE_URL/widget/buttons.js?shop=bench"
  echo ""

  # 3. buttons.js — ETag 304 테스트
  log "buttons.js — ETag 가져오기"
  ETAG=$(curl -sI "$BASE_URL/widget/buttons.js?shop=bench" | grep -i '^etag:' | tr -d '\r' | awk '{print $2}' || true)
  if [[ -n "${ETAG:-}" ]]; then
    echo "  ETag=$ETAG"
    bench "buttons.js [304 ETag]" "$BASE_URL/widget/buttons.js?shop=bench" -H "If-None-Match: $ETAG"
  else
    echo "  ⚠ ETag 헤더 없음 (개선 전 버전)"
    bench "buttons.js [no-cache재요청]" "$BASE_URL/widget/buttons.js?shop=bench"
  fi
  echo ""

  # 4. widget/config — 존재하지 않는 client_id (404, DB 조회만 측정)
  log "widget/config — invalid client_id (DB lookup only)"
  bench "widget/config [404]" "$BASE_URL/api/widget/config?client_id=bg_bench_invalid"
  echo ""

  # 5. widget/config — 실제 client_id (suparain999)
  TEST_CLIENT_ID="${BG_TEST_CLIENT_ID:-bg_fc02ea99d0d5f6ff07589842fd49a9e5}"
  TEST_SHOP_ID="${BG_TEST_SHOP_ID:-6035ba71-9534-44ab-8d0f-9ccdc5c86963}"

  log "widget/config — real client_id (suparain999)"
  bench "widget/config [200]" "$BASE_URL/api/widget/config?client_id=$TEST_CLIENT_ID"
  echo ""

  # 6. widget/hint — real client_id + Origin 헤더 (suparain999.cafe24.com)
  log "widget/hint — real request (Origin: suparain999)"
  bench "widget/hint [200]" \
    "$BASE_URL/api/widget/hint?client_id=$TEST_CLIENT_ID&provider=google" \
    -H "Origin: https://suparain999.cafe24.com"
  echo ""

  # 7. 대시보드 API — JWT 인증 필요
  # 토큰 발급: 카페24 어드민 > 번개가입 앱 실행 후 브라우저 쿠키에서 bg_token 복사
  if [[ -n "${BG_TEST_TOKEN:-}" ]]; then
    log "dashboard/stats — authenticated"
    bench "stats [200]" "$BASE_URL/api/dashboard/stats" \
      -H "Authorization: Bearer $BG_TEST_TOKEN"
    echo ""

    log "dashboard/shops/:id — authenticated"
    bench "shops/:id [200]" "$BASE_URL/api/dashboard/shops/$TEST_SHOP_ID" \
      -H "Authorization: Bearer $BG_TEST_TOKEN"
    echo ""
  else
    echo "  ℹ 대시보드 API 측정 생략 (BG_TEST_TOKEN 미설정)"
    echo "  토큰 발급 방법:"
    echo "    1. 카페24 어드민 > 번개가입 앱 실행"
    echo "    2. 브라우저 DevTools > Application > Cookies > bg_token 값 복사"
    echo "    3. export BG_TEST_TOKEN=\"복사한토큰\""
    echo ""
  fi

  sep
  echo "✅ 측정 완료"

} 2>&1 | tee "$OUTFILE"

echo ""
echo "📁 결과 저장: $OUTFILE"
