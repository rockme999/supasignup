#!/bin/bash
# scripts/monitoring/latest-events.sh
# funnel_events 최근 트래픽 조회 (급감/급증 감지)
#
# Usage: ./latest-events.sh [hours=1] [env=production]
# Examples:
#   ./latest-events.sh          # 최근 1시간, production
#   ./latest-events.sh 3        # 최근 3시간, production
#   ./latest-events.sh 1 staging
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
echo "  funnel_events 트래픽 조회 (최근 ${HOURS}시간, $ENV)"
echo "============================================="

# 1. event_type별 카운트
echo ""
echo "--- event_type별 카운트 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT event_type, COUNT(*) AS count FROM funnel_events WHERE created_at >= datetime('now', '-${HOURS} hours') GROUP BY event_type ORDER BY count DESC" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  이벤트 없음 (최근 ${HOURS}시간)');
        console.log('  [참고] 트래픽 급감 시 이 출력이 비어 있을 수 있음');
        return;
      }
      let total = 0;
      rows.forEach(r => {
        total += r.count;
        console.log(\`  \${r.event_type.padEnd(30)}: \${r.count}건\`);
      });
      console.log(\`  ${'합계'.padEnd(30)}: \${total}건\`);
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

# 2. oauth_start → signup_complete 전환율 (가장 중요한 지표)
echo ""
echo "--- 핵심 전환 지표 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT event_type, COUNT(*) AS count FROM funnel_events WHERE created_at >= datetime('now', '-${HOURS} hours') AND event_type IN ('oauth_start', 'signup_complete') GROUP BY event_type" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      const map = {};
      rows.forEach(r => { map[r.event_type] = r.count; });
      const starts = map['oauth_start'] || 0;
      const completes = map['signup_complete'] || 0;
      const rate = starts > 0 ? ((completes / starts) * 100).toFixed(1) : 'N/A';
      console.log(\`  oauth_start:      \${starts}건\`);
      console.log(\`  signup_complete:  \${completes}건\`);
      console.log(\`  전환율:           \${rate}%\`);
      if (starts > 10 && parseFloat(rate) < 50) {
        console.log('  [경고] 전환율 50% 미만 — OAuth 흐름 이상 의심');
      }
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

# 3. shop별 상위 5개 (트래픽 집중 감지)
echo ""
echo "--- shop별 상위 5개 트래픽 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT shop_id, COUNT(*) AS count FROM funnel_events WHERE created_at >= datetime('now', '-${HOURS} hours') GROUP BY shop_id ORDER BY count DESC LIMIT 5" \
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
        console.log(\`  [\${i+1}] shop=\${r.shop_id} | \${r.count}건\`);
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

echo ""
