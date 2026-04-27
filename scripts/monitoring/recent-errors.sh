#!/bin/bash
# scripts/monitoring/recent-errors.sh
# audit_logs 최근 N시간 에러 조회
#
# Usage: ./recent-errors.sh [hours=1] [env=production]
# Examples:
#   ./recent-errors.sh          # 최근 1시간, production
#   ./recent-errors.sh 3        # 최근 3시간, production
#   ./recent-errors.sh 6 staging  # 최근 6시간, staging
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
echo "  audit_logs 에러 조회 (최근 ${HOURS}시간, $ENV)"
echo "============================================="

# 1. 에러 카운트
echo ""
echo "--- 에러 카운트 ---"
# shellcheck disable=SC2086
COUNT_RESULT=$(npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT COUNT(*) AS total FROM audit_logs WHERE created_at >= datetime('now', '-${HOURS} hours') AND (action LIKE '%error%' OR action LIKE '%fail%' OR detail LIKE '%error%' OR detail LIKE '%Error%')" \
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
  echo "  에러 없음 (최근 ${HOURS}시간)"
else
  echo "  에러 총 ${TOTAL}건 발견"
  if [ "$TOTAL" -ge 5 ] 2>/dev/null; then
    echo "  [경고] 시간당 5건 이상 — 즉시 확인 권장"
  fi
fi

# 2. 에러 최신 10건
echo ""
echo "--- 최신 10건 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT id, actor_id, action, target_type, target_id, detail, created_at FROM audit_logs WHERE created_at >= datetime('now', '-${HOURS} hours') AND (action LIKE '%error%' OR action LIKE '%fail%' OR detail LIKE '%error%' OR detail LIKE '%Error%') ORDER BY created_at DESC LIMIT 10" \
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
        console.log(\`  [\${i+1}] \${r.created_at} | action=\${r.action} | actor=\${r.actor_id} | target=\${r.target_type}:\${r.target_id || '-'}\`);
        if (r.detail) {
          const detail = r.detail.length > 120 ? r.detail.slice(0, 120) + '...' : r.detail;
          console.log(\`       detail: \${detail}\`);
        }
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

echo ""
