#!/bin/bash
# scripts/monitoring/webhook-failures.sh
# webhook_events 최근 N시간 인증/처리 실패 조회
#
# Usage: ./webhook-failures.sh [hours=1] [env=production]
# Examples:
#   ./webhook-failures.sh         # 최근 1시간, production
#   ./webhook-failures.sh 24      # 최근 24시간, production
#   ./webhook-failures.sh 6 staging
set -euo pipefail
cd "$(dirname "$0")/../../workers/api"

HOURS=${1:-1}
ENV=${2:-production}
DB="bg-production"
ENV_FLAG=""
if [ "$ENV" = "staging" ] || [ "$ENV" = "dev" ]; then
  DB="bg-dev"
  ENV_FLAG="--env dev"
fi

echo ""
echo "============================================="
echo "  webhook_events 실패 조회 (최근 ${HOURS}시간, $ENV)"
echo "============================================="

# 실패 action 목록 (shop_not_found는 별도 분류)
FAIL_ACTIONS="'auth_failed','invalid_json','error'"
SHOP_NOT_FOUND_ACTION="'shop_not_found'"

# 1. 실패 카운트 (shop_not_found 제외)
echo ""
echo "--- 실패 카운트 (auth_failed / invalid_json / error) ---"
# shellcheck disable=SC2086
COUNT_RESULT=$(npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT COUNT(*) AS total FROM webhook_events WHERE created_at >= datetime('now', '-${HOURS} hours') AND action IN (${FAIL_ACTIONS})" \
  2>/dev/null)

TOTAL=$(echo "$COUNT_RESULT" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      console.log(data[0]?.results?.[0]?.total ?? 0);
    } catch { console.log(0); }
  });
" 2>/dev/null || echo "0")

if [ "$TOTAL" = "0" ]; then
  echo "  실패 없음 (최근 ${HOURS}시간)"
else
  echo "  실패 총 ${TOTAL}건 발견"
  if [ "$TOTAL" -ge 3 ] 2>/dev/null; then
    echo "  [경고] 3건 이상 — 인증키 변경 또는 플랫폼 사양 변경 의심"
  fi
fi

# 2. shop_not_found 카운트 (참고용)
echo ""
echo "--- shop_not_found 카운트 (정상 케이스일 수 있음) ---"
# shellcheck disable=SC2086
SNF_RESULT=$(npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT COUNT(*) AS total FROM webhook_events WHERE created_at >= datetime('now', '-${HOURS} hours') AND action IN (${SHOP_NOT_FOUND_ACTION})" \
  2>/dev/null)

SNF_TOTAL=$(echo "$SNF_RESULT" | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      console.log(data[0]?.results?.[0]?.total ?? 0);
    } catch { console.log(0); }
  });
" 2>/dev/null || echo "0")

echo "  shop_not_found: ${SNF_TOTAL}건 (이미 탈퇴한 쇼핑몰의 웹훅은 정상 케이스)"

# 3. 실패 최신 10건
echo ""
echo "--- 실패 최신 10건 (auth_failed / invalid_json / error) ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT id, platform, event_no, mall_id, shop_id, auth_method, auth_valid, action, note, created_at FROM webhook_events WHERE created_at >= datetime('now', '-${HOURS} hours') AND action IN (${FAIL_ACTIONS}) ORDER BY created_at DESC LIMIT 10" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  (없음)');
        return;
      }
      rows.forEach((r, i) => {
        console.log(\`  [\${i+1}] \${r.created_at} | platform=\${r.platform} | event_no=\${r.event_no ?? '-'} | mall=\${r.mall_id ?? '-'} | action=\${r.action}\`);
        if (r.note) {
          const note = r.note.length > 100 ? r.note.slice(0, 100) + '...' : r.note;
          console.log(\`       note: \${note}\`);
        }
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

echo ""
