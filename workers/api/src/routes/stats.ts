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
import { FREE_PLAN_MONTHLY_LIMIT } from '@supasignup/bg-core';
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

  // Total signups / logins
  const totalResult = await c.env.DB
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL`,
    )
    .bind(ownerId)
    .first<{ total: number; signups: number; logins: number }>();

  // Today's signups
  const today = new Date().toISOString().slice(0, 10);
  const todayResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?`,
    )
    .bind(ownerId, today)
    .first<{ cnt: number }>();

  // This month's signups
  const yearMonth = today.slice(0, 7);
  const monthResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?`,
    )
    .bind(ownerId, `${yearMonth}-01`)
    .first<{ cnt: number }>();

  // Per-provider breakdown
  const providerResult = await c.env.DB
    .prepare(
      `SELECT ls.provider, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL AND ls.action = 'signup'
       GROUP BY ls.provider`,
    )
    .bind(ownerId)
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
  const dailyResult = await c.env.DB
    .prepare(
      `SELECT DATE(created_at) as day, action, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND created_at >= DATE('now', '-30 days')
       GROUP BY day, action
       ORDER BY day`,
    )
    .bind(shopId)
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

// ─── GET /billing ────────────────────────────────────────────
stats.get('/billing/status', async (c) => {
  const ownerId = c.get('ownerId');

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

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
    .bind(`${yearMonth}-01`, `${yearMonth}-32`, ownerId)
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
    needs_upgrade: shop.plan === 'free' && shop.monthly_signups >= 80,
    is_over_limit: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_MONTHLY_LIMIT,
  }));

  return c.json({ shops, month: yearMonth });
});

export default stats;
