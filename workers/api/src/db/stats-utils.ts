/**
 * 통계 쿼리 공통 유틸리티
 */

/** period 파라미터를 SQLite datetime 표현식으로 변환 (화이트리스트 기반) */
export function buildSinceExpr(period: string): string {
  if (period === 'today') return "datetime('now', 'start of day')";
  if (period === '30d') return "datetime('now', '-30 days')";
  if (period === '90d') return "datetime('now', '-90 days')";
  if (period === 'month') return "datetime('now', 'start of month')";
  if (period === 'all') return "'2000-01-01'";
  return "datetime('now', '-7 days')"; // default 7d
}

/** shop 소유권 검증 */
export async function verifyShopOwnership(
  db: D1Database,
  shopId: string,
  ownerId: string,
) {
  return db
    .prepare('SELECT shop_id FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first();
}
