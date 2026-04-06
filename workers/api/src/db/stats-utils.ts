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

/**
 * LIKE 패턴 특수문자 이스케이프 (%, _, \)
 * admin.ts / pages.tsx에서 중복 정의되던 로직을 통합.
 */
export function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, '\\$&');
}

/**
 * period 파라미터를 SQL WHERE 절 날짜 필터로 변환.
 * login_stats 테이블의 created_at 컬럼 기준 (DATE 문자열 비교).
 *
 * @returns dateFilter - SQL AND 절 문자열 (예: " AND ls.created_at >= ?")
 *          dateParam  - 바인딩할 날짜 값. 인라인 SQL 사용 시 null
 */
export function buildDateFilter(period: string): { dateFilter: string; dateParam: string | null } {
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  if (period === 'today') {
    return { dateFilter: ' AND ls.created_at >= ?', dateParam: today };
  }
  if (period === '7d') {
    // 바인딩 파라미터 대신 인라인 DATE 표현식 사용 (D1/SQLite 호환)
    return { dateFilter: " AND ls.created_at >= DATE('now', '-7 days')", dateParam: null };
  }
  if (period === '30d') {
    return { dateFilter: " AND ls.created_at >= DATE('now', '-30 days')", dateParam: null };
  }
  if (period === 'month') {
    return { dateFilter: ' AND ls.created_at >= ?', dateParam: `${yearMonth}-01` };
  }
  // 기간 미지정 — 전체
  return { dateFilter: '', dateParam: null };
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
