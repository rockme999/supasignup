#!/bin/bash
# scripts/monitoring/shop-state-changes.sh
# shops 테이블 최근 N시간 변경 추적 (plan 변경, 탈퇴, 생성)
#
# Usage: ./shop-state-changes.sh [hours=24] [env=production]
# Examples:
#   ./shop-state-changes.sh          # 최근 24시간, production
#   ./shop-state-changes.sh 6        # 최근 6시간, production
#   ./shop-state-changes.sh 48 staging
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
echo "  shops 상태 변경 추적 (최근 ${HOURS}시간, $ENV)"
echo "============================================="

# 1. 최근 updated_at 변경된 shop 목록
echo ""
echo "--- 최근 업데이트된 shops ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT shop_id, mall_id, platform, shop_name, plan, deleted_at, created_at, updated_at FROM shops WHERE updated_at >= datetime('now', '-${HOURS} hours') ORDER BY updated_at DESC LIMIT 20" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  변경 없음');
        return;
      }
      rows.forEach((r, i) => {
        const deleted = r.deleted_at ? ' [탈퇴]' : '';
        console.log(\`  [\${i+1}] \${r.updated_at} | shop=\${r.shop_id} | mall=\${r.mall_id} | platform=\${r.platform} | plan=\${r.plan}\${deleted}\`);
        if (r.shop_name) console.log(\`       name: \${r.shop_name}\`);
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

# 2. 최근 탈퇴(소프트 삭제) 건수
echo ""
echo "--- 최근 탈퇴(deleted_at 변경) ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT COUNT(*) AS total FROM shops WHERE deleted_at >= datetime('now', '-${HOURS} hours')" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const total = data[0]?.results?.[0]?.total ?? 0;
      if (total === 0) console.log('  탈퇴 없음');
      else console.log(\`  탈퇴: \${total}건\`);
    } catch { console.log('  조회 실패'); }
  });
" 2>/dev/null || echo "  조회 실패"

# 3. plan 분포 (전체 현황)
echo ""
echo "--- plan 분포 (현재 전체, 삭제 제외) ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT plan, COUNT(*) AS count FROM shops WHERE deleted_at IS NULL GROUP BY plan ORDER BY count DESC" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      rows.forEach(r => console.log(\`  \${r.plan}: \${r.count}개\`));
    } catch { console.log('  조회 실패'); }
  });
" 2>/dev/null || echo "  조회 실패"

# 4. 최근 신규 등록 shops
echo ""
echo "--- 최근 신규 등록 ---"
# shellcheck disable=SC2086
npx wrangler d1 execute "$DB" $ENV_FLAG --remote --json --command \
  "SELECT shop_id, mall_id, platform, shop_name, plan, created_at FROM shops WHERE created_at >= datetime('now', '-${HOURS} hours') ORDER BY created_at DESC" \
  2>/dev/null | node -e "
  const chunks = [];
  process.stdin.on('data', c => chunks.push(c));
  process.stdin.on('end', () => {
    try {
      const data = JSON.parse(chunks.join(''));
      const rows = data[0]?.results || [];
      if (rows.length === 0) {
        console.log('  신규 등록 없음');
        return;
      }
      rows.forEach((r, i) => {
        console.log(\`  [\${i+1}] \${r.created_at} | shop=\${r.shop_id} | mall=\${r.mall_id} | platform=\${r.platform} | plan=\${r.plan}\`);
      });
    } catch(e) {
      console.log('  파싱 실패:', e.message);
    }
  });
" 2>/dev/null || echo "  조회 실패"

echo ""
