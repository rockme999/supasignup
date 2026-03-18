import type { Env } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT, FREE_PLAN_WARN_THRESHOLD } from '@supasignup/bg-core';

export interface BillingStatus {
  plan: string;
  monthly_count: number;
  limit: number | null;
  is_over_limit: boolean;
  needs_upgrade: boolean;
  usage_percent: number | null;
}

export async function getBillingStatus(db: D1Database, shopId: string): Promise<BillingStatus> {
  const shop = await db.prepare('SELECT plan FROM shops WHERE shop_id = ?').bind(shopId).first<{ plan: string }>();
  if (!shop) throw new Error('Shop not found');

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const count = await db.prepare(
    `SELECT COUNT(*) as cnt FROM login_stats WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`
  ).bind(shopId, monthStart).first<{ cnt: number }>();

  const monthlyCount = count?.cnt ?? 0;
  const isFree = shop.plan === 'free';

  return {
    plan: shop.plan,
    monthly_count: monthlyCount,
    limit: isFree ? FREE_PLAN_MONTHLY_LIMIT : null,
    is_over_limit: isFree && monthlyCount >= FREE_PLAN_MONTHLY_LIMIT,
    needs_upgrade: isFree && monthlyCount >= FREE_PLAN_WARN_THRESHOLD,
    usage_percent: isFree ? Math.round((monthlyCount / FREE_PLAN_MONTHLY_LIMIT) * 100) : null,
  };
}

export async function checkPlanLimit(db: D1Database, shopId: string): Promise<boolean> {
  const status = await getBillingStatus(db, shopId);
  return !status.is_over_limit;
}
