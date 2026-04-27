#!/bin/bash
# scripts/monitoring/ai-failures.sh
# AI 자동답변 실패 이력 조회 (ai_auto_reply_failures 테이블)
#
# Usage: ./ai-failures.sh [hours=24] [env=production]
# Examples:
#   ./ai-failures.sh          # 최근 24시간, production
#   ./ai-failures.sh 48       # 최근 48시간, production
#   ./ai-failures.sh 24 staging
set -euo pipefail
cd "$(dirname "$0")/../../workers/api"

HOURS=${1:-24}
ENV=${2:-production}
DB="bg-production"
ENV_FLAG=""
if [ "$ENV" = "staging" ] || [ "$ENV" = "dev" ]; then
  DB="bg-dev"
  ENV_FLAG="--env dev"
fi

echo ""
echo "============================================="
echo "  AI 자동답변 실패 조회 (최근 ${HOURS}시간, $ENV)"
echo "============================================="

# 1. reason별 실패 카운트
echo ""
echo "--- reason별 실패 카운트 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT reason, COUNT(*) AS count FROM ai_auto_reply_failures WHERE created_at >= datetime('now', '-${HOURS} hours') GROUP BY reason ORDER BY count DESC" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  실패 없음 (최근 ${HOURS}시간)');
        return;
      }
      let totalFail = 0;
      rows.forEach(r => {
        totalFail += r.count;
        let warn = '';
        if (r.reason === 'ai_error' && r.count >= 3) warn = ' [경고: AI 서비스 장애 의심]';
        else if (r.reason === 'ai_error') warn = ' [AI 서비스 오류]';
        console.log(\`  \${r.reason}: \${r.count}건\${warn}\`);
      });
      console.log(\`  합계: \${totalFail}건\`);
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

# 2. ai_error 비율 계산 (quota 초과 감지)
echo ""
echo "--- ai_error 최신 5건 (서비스 장애/quota 감지) ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT id, inquiry_id, attempt, reason, detail, ai_elapsed_ms, created_at FROM ai_auto_reply_failures WHERE created_at >= datetime('now', '-${HOURS} hours') AND reason = 'ai_error' ORDER BY created_at DESC LIMIT 5" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  ai_error 없음');
        return;
      }
      rows.forEach((r, i) => {
        const elapsed = r.ai_elapsed_ms ? \` | elapsed=\${r.ai_elapsed_ms}ms\` : '';
        console.log(\`  [\${i+1}] \${r.created_at} | inquiry=\${r.inquiry_id} | attempt=\${r.attempt}\${elapsed}\`);
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

# 3. 전체 실패 최신 5건
echo ""
echo "--- 전체 실패 최신 5건 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT id, inquiry_id, attempt, reason, detail, ai_elapsed_ms, created_at FROM ai_auto_reply_failures WHERE created_at >= datetime('now', '-${HOURS} hours') ORDER BY created_at DESC LIMIT 5" \
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
        const elapsed = r.ai_elapsed_ms ? \` | elapsed=\${r.ai_elapsed_ms}ms\` : '';
        console.log(\`  [\${i+1}] \${r.created_at} | reason=\${r.reason} | inquiry=\${r.inquiry_id} | attempt=\${r.attempt}\${elapsed}\`);
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

echo ""
