/**
 * Statistics and Billing API endpoints.
 *
 * Stats (auth required):
 *   GET /api/dashboard/stats          - Aggregated stats for all shops
 *   GET /api/dashboard/stats/:shop_id - Per-shop stats
 *
 * Billing (auth required):
 *   GET /api/dashboard/billing        - Billing status for all shops
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT, FREE_PLAN_WARN_THRESHOLD } from '@supasignup/bg-core';
import { authMiddleware } from '../middleware/auth';

type StatsEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const stats = new Hono<StatsEnv>();

stats.use('*', authMiddleware);

// ─── GET /stats ──────────────────────────────────────────────
stats.get('/stats', async (c) => {
  const ownerId = c.get('ownerId');
  const shopIdFilter = c.req.query('shop_id') || null;
  const period = c.req.query('period') || null; // today, 7d, 30d, month

  // Build date filter
  let dateFilter = '';
  let dateParam: string | null = null;
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  if (period === 'today') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = today;
  } else if (period === '7d') {
    dateFilter = ' AND ls.created_at >= ?';
    const d7 = new Date();
    d7.setUTCDate(d7.getUTCDate() - 7);
    dateParam = d7.toISOString().slice(0, 10);
  } else if (period === '30d') {
    dateFilter = ' AND ls.created_at >= ?';
    const d30 = new Date();
    d30.setUTCDate(d30.getUTCDate() - 30);
    dateParam = d30.toISOString().slice(0, 10);
  } else if (period === 'month') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = `${yearMonth}-01`;
  }

  const shopFilter = shopIdFilter ? ' AND ls.shop_id = ?' : '';

  // Build params array
  const baseParams: (string | null)[] = [ownerId];
  if (dateParam) baseParams.push(dateParam);
  if (shopIdFilter) baseParams.push(shopIdFilter);

  // Total signups / logins
  const totalResult = await c.env.DB
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL${dateFilter}${shopFilter}`,
    )
    .bind(...baseParams)
    .first<{ total: number; signups: number; logins: number }>();

  // Today's signups (always today regardless of filter)
  const todayParams: (string | null)[] = [ownerId, today];
  if (shopIdFilter) todayParams.push(shopIdFilter);
  const todayResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    )
    .bind(...todayParams)
    .first<{ cnt: number }>();

  // This month's signups (always current month regardless of filter)
  const monthParams: (string | null)[] = [ownerId, `${yearMonth}-01`];
  if (shopIdFilter) monthParams.push(shopIdFilter);
  const monthResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    )
    .bind(...monthParams)
    .first<{ cnt: number }>();

  // Per-provider breakdown
  const providerParams: (string | null)[] = [ownerId];
  if (dateParam) providerParams.push(dateParam);
  if (shopIdFilter) providerParams.push(shopIdFilter);
  const providerResult = await c.env.DB
    .prepare(
      `SELECT ls.provider, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL AND ls.action = 'signup'${dateFilter}${shopFilter}
       GROUP BY ls.provider`,
    )
    .bind(...providerParams)
    .all<{ provider: string; cnt: number }>();

  const providerStats: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    providerStats[row.provider] = row.cnt;
  }

  return c.json({
    total_events: totalResult?.total ?? 0,
    total_signups: totalResult?.signups ?? 0,
    total_logins: totalResult?.logins ?? 0,
    today_signups: todayResult?.cnt ?? 0,
    month_signups: monthResult?.cnt ?? 0,
    by_provider: providerStats,
  });
});

// ─── GET /stats/daily ───────────────────────────────────────
stats.get('/stats/daily', async (c) => {
  const ownerId = c.get('ownerId');
  const shopIdFilter = c.req.query('shop_id') || null;
  const period = c.req.query('period') || '30d';

  let days = 30;
  if (period === 'today') days = 1;
  else if (period === '7d') days = 7;
  else if (period === '90d') days = 90;
  else if (period === 'month') {
    const now = new Date();
    days = now.getUTCDate(); // 현재 월 1일부터 오늘까지 일수
  }

  const shopFilter = shopIdFilter ? ' AND ls.shop_id = ?' : '';
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const params: string[] = [ownerId, cutoffDate];
  if (shopIdFilter) params.push(shopIdFilter);

  const dailyResult = await c.env.DB
    .prepare(
      `SELECT DATE(ls.created_at) as day, ls.action, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.created_at >= ?${shopFilter}
       GROUP BY day, ls.action
       ORDER BY day`,
    )
    .bind(...params)
    .all<{ day: string; action: string; cnt: number }>();

  return c.json({
    daily: dailyResult.results ?? [],
    period,
  });
});

// ─── GET /stats/export — 내 쇼핑몰 통계 CSV ─────────────────
stats.get('/stats/export', async (c) => {
  const ownerId = c.get('ownerId');

  const result = await c.env.DB.prepare(
    `SELECT DATE(ls.created_at) as date, s.shop_name, ls.provider, ls.action, COUNT(*) as cnt
     FROM login_stats ls
     JOIN shops s ON ls.shop_id = s.shop_id
     WHERE s.owner_id = ? AND s.deleted_at IS NULL
     GROUP BY DATE(ls.created_at), ls.shop_id, ls.provider, ls.action
     ORDER BY DATE(ls.created_at) DESC, s.shop_name`,
  )
    .bind(ownerId)
    .all<{
      date: string;
      shop_name: string | null;
      provider: string;
      action: string;
      cnt: number;
    }>();

  const header = '날짜,쇼핑몰명,프로바이더,액션,건수\n';
  const rows = (result.results ?? []).map((r) =>
    `"${r.date}","${(r.shop_name || '').replace(/"/g, '""')}","${r.provider}","${r.action}","${r.cnt}"`,
  ).join('\n');

  const bom = '\uFEFF';
  const csv = bom + header + rows;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="my_stats_${today}.csv"`,
    },
  });
});

// ─── GET /stats/:shop_id ────────────────────────────────────
stats.get('/stats/:shop_id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('shop_id');

  // Verify ownership
  const shop = await c.env.DB
    .prepare('SELECT shop_id FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first();

  if (!shop) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Daily stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const dailyResult = await c.env.DB
    .prepare(
      `SELECT DATE(created_at) as day, action, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND created_at >= ?
       GROUP BY day, action
       ORDER BY day`,
    )
    .bind(shopId, thirtyDaysAgoDate)
    .all<{ day: string; action: string; cnt: number }>();

  // Per-provider breakdown for this shop
  const providerResult = await c.env.DB
    .prepare(
      `SELECT provider, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       GROUP BY provider`,
    )
    .bind(shopId)
    .all<{ provider: string; cnt: number }>();

  const providerStats: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    providerStats[row.provider] = row.cnt;
  }

  return c.json({
    shop_id: shopId,
    daily: dailyResult.results ?? [],
    by_provider: providerStats,
  });
});

// ─── GET /stats/funnel ──────────────────────────────────────
stats.get('/stats/funnel', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '7d';

  if (!shopId) {
    return c.json({ error: 'shop_id_required' }, 400);
  }

  // Verify ownership
  const shop = await c.env.DB
    .prepare('SELECT shop_id FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first();

  if (!shop) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Build date window
  let sinceExpr = "datetime('now', '-7 days')";
  if (period === 'today') sinceExpr = "datetime('now', 'start of day')";
  else if (period === '30d') sinceExpr = "datetime('now', '-30 days')";
  else if (period === 'month') sinceExpr = "datetime('now', 'start of month')";

  const result = await c.env.DB
    .prepare(
      `SELECT event_type, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND created_at >= ${sinceExpr}
       GROUP BY event_type`,
    )
    .bind(shopId)
    .all<{ event_type: string; cnt: number }>();

  const counts: Record<string, number> = {};
  for (const row of result.results ?? []) {
    counts[row.event_type] = row.cnt;
  }

  const bannerShow   = counts['banner_show']   ?? 0;
  const bannerClick  = counts['banner_click']  ?? 0;
  const popupShow    = counts['popup_show']    ?? 0;
  const popupSignup  = counts['popup_signup']  ?? 0;
  const signupComplete = counts['signup_complete'] ?? 0;

  return c.json({
    period,
    shop_id: shopId,
    banner_show:      bannerShow,
    banner_click:     bannerClick,
    popup_show:       popupShow,
    popup_signup:     popupSignup,
    signup_complete:  signupComplete,
    // 전환율 (0~100 정수 %)
    banner_ctr:     bannerShow   > 0 ? Math.round((bannerClick  / bannerShow)  * 100) : 0,
    popup_cvr:      popupShow    > 0 ? Math.round((popupSignup  / popupShow)   * 100) : 0,
    overall_cvr:    bannerShow   > 0 ? Math.round((signupComplete / bannerShow) * 100) : 0,
  });
});

// ─── GET /billing ────────────────────────────────────────────
stats.get('/billing/status', async (c) => {
  const ownerId = c.get('ownerId');

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  // Get all shops with their monthly signup count
  const result = await c.env.DB
    .prepare(
      `SELECT s.shop_id, s.shop_name, s.mall_id, s.plan,
        (SELECT COUNT(*) FROM login_stats ls
         WHERE ls.shop_id = s.shop_id AND ls.action = 'signup'
         AND ls.created_at >= ? AND ls.created_at < ?) as monthly_signups
       FROM shops s
       WHERE s.owner_id = ? AND s.deleted_at IS NULL`,
    )
    .bind(`${yearMonth}-01`, nextMonthFirst, ownerId)
    .all<{
      shop_id: string;
      shop_name: string;
      mall_id: string;
      plan: string;
      monthly_signups: number;
    }>();

  const shops = (result.results ?? []).map((shop) => ({
    ...shop,
    limit: shop.plan === 'free' ? FREE_PLAN_MONTHLY_LIMIT : null,
    usage_percent: shop.plan === 'free'
      ? Math.round((shop.monthly_signups / FREE_PLAN_MONTHLY_LIMIT) * 100)
      : null,
    needs_upgrade: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_WARN_THRESHOLD,
    is_over_limit: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_MONTHLY_LIMIT,
  }));

  return c.json({ shops, month: yearMonth });
});

export default stats;
