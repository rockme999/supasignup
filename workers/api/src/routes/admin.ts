/**
 * Admin routes — /admin/*
 * All routes require admin role (enforced via adminAuth middleware).
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { generateId } from '@supasignup/bg-core';
import { adminAuth } from '../middleware/admin';

type AdminEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const admin = new Hono<AdminEnv>();

// 모든 /admin/* 라우트에 관리자 인증 적용
admin.use('/*', adminAuth);

// LIKE 패턴 특수문자 이스케이프 (%, _, \)
function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// ─── GET /shops — 전체 쇼핑몰 목록 ──────────────────────────
admin.get('/shops', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = c.req.query('search') || '';

  let query =
    'SELECT s.*, o.email as owner_email FROM shops s JOIN owners o ON s.owner_id = o.owner_id WHERE s.deleted_at IS NULL';
  const params: string[] = [];

  if (search) {
    const escaped = escapeLike(search);
    query +=
      ' AND (s.mall_id LIKE ? ESCAPE \'\\\' OR s.shop_name LIKE ? ESCAPE \'\\\' OR o.email LIKE ? ESCAPE \'\\\')';
    params.push(`%${escaped}%`, `%${escaped}%`, `%${escaped}%`);
  }

  query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const result = await c.env.DB.prepare(query).bind(...params).all();

  const countQuery = search
    ? 'SELECT COUNT(*) as total FROM shops s JOIN owners o ON s.owner_id = o.owner_id WHERE s.deleted_at IS NULL AND (s.mall_id LIKE ? ESCAPE \'\\\' OR s.shop_name LIKE ? ESCAPE \'\\\' OR o.email LIKE ? ESCAPE \'\\\')'
    : 'SELECT COUNT(*) as total FROM shops WHERE deleted_at IS NULL';
  const escapedSearch = search ? escapeLike(search) : '';
  const countResult = search
    ? await c.env.DB.prepare(countQuery)
        .bind(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`)
        .first<{ total: number }>()
    : await c.env.DB.prepare(countQuery).first<{ total: number }>();

  return c.json({
    shops: result.results,
    pagination: {
      page,
      limit,
      total: countResult?.total ?? 0,
      pages: Math.ceil((countResult?.total ?? 0) / limit),
    },
  });
});

// ─── GET /shops/:id — 쇼핑몰 상세 ───────────────────────────
admin.get('/shops/:id', async (c) => {
  const shopId = c.req.param('id');
  const shop = await c.env.DB.prepare(
    `SELECT
      s.shop_id, s.mall_id, s.platform, s.shop_name, s.shop_url,
      s.owner_id, s.client_id, s.enabled_providers,
      s.allowed_redirect_uris, s.plan, s.sso_configured,
      s.deleted_at, s.created_at, s.updated_at,
      o.email as owner_email, o.name as owner_name
    FROM shops s
    JOIN owners o ON s.owner_id = o.owner_id
    WHERE s.shop_id = ?`,
  )
    .bind(shopId)
    .first();

  if (!shop) return c.json({ error: 'not_found' }, 404);
  return c.json({ shop });
});

// ─── PUT /shops/:id/plan — 플랜 변경 ────────────────────────
admin.put('/shops/:id/plan', async (c) => {
  const shopId = c.req.param('id');
  const { plan } = await c.req.json<{ plan: string }>();

  if (!['free', 'monthly', 'yearly'].includes(plan)) {
    return c.json({ error: 'invalid_plan' }, 400);
  }

  // Shop 존재 여부 확인
  const existingShop = await c.env.DB.prepare('SELECT shop_id FROM shops WHERE shop_id = ?')
    .bind(shopId)
    .first();
  if (!existingShop) return c.json({ error: 'not_found' }, 404);

  await c.env.DB.prepare(
    "UPDATE shops SET plan = ?, updated_at = datetime('now') WHERE shop_id = ?",
  )
    .bind(plan, shopId)
    .run();

  // 감사 로그
  await recordAuditLog(
    c.env.DB,
    c.get('ownerId'),
    'change_plan',
    'shop',
    shopId,
    `plan → ${plan}`,
  );

  // KV 캐시 무효화
  const shop = await c.env.DB.prepare(
    'SELECT client_id FROM shops WHERE shop_id = ?',
  ).bind(shopId).first<{ client_id: string }>();
  if (shop) await c.env.KV.delete(`widget_config:${shop.client_id}`);

  return c.json({ ok: true });
});

// ─── PUT /shops/:id/status — 정지/활성화 ────────────────────
admin.put('/shops/:id/status', async (c) => {
  const shopId = c.req.param('id');
  const { action } = await c.req.json<{ action: 'suspend' | 'activate' }>();

  if (action !== 'suspend' && action !== 'activate') {
    return c.json({ error: 'invalid_action' }, 400);
  }

  // Shop 존재 여부 확인
  const existingShop = await c.env.DB.prepare('SELECT shop_id FROM shops WHERE shop_id = ?')
    .bind(shopId)
    .first();
  if (!existingShop) return c.json({ error: 'not_found' }, 404);

  if (action === 'suspend') {
    await c.env.DB.prepare(
      "UPDATE shops SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE shop_id = ?",
    )
      .bind(shopId)
      .run();
  } else {
    await c.env.DB.prepare(
      "UPDATE shops SET deleted_at = NULL, updated_at = datetime('now') WHERE shop_id = ?",
    )
      .bind(shopId)
      .run();
  }

  await recordAuditLog(
    c.env.DB,
    c.get('ownerId'),
    action,
    'shop',
    shopId,
    null,
  );
  return c.json({ ok: true });
});

// ─── GET /owners — 전체 사용자 목록 ─────────────────────────
admin.get('/owners', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = c.req.query('search') || '';

  let query =
    `SELECT o.owner_id, o.email, o.name, o.role, o.created_at,
      (SELECT COUNT(*) FROM shops s WHERE s.owner_id = o.owner_id AND s.deleted_at IS NULL) as shop_count
     FROM owners o WHERE 1=1`;
  const params: string[] = [];

  if (search) {
    const escaped = escapeLike(search);
    query += " AND (o.email LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\')";
    params.push(`%${escaped}%`, `%${escaped}%`);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const countQuery = search
    ? "SELECT COUNT(*) as total FROM owners o WHERE (o.email LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\')"
    : 'SELECT COUNT(*) as total FROM owners';
  const escapedSearch = search ? escapeLike(search) : '';

  const [result, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    search
      ? c.env.DB.prepare(countQuery).bind(`%${escapedSearch}%`, `%${escapedSearch}%`).first<{ total: number }>()
      : c.env.DB.prepare(countQuery).first<{ total: number }>(),
  ]);

  return c.json({
    owners: result.results,
    pagination: {
      page,
      limit,
      total: countResult?.total ?? 0,
      pages: Math.ceil((countResult?.total ?? 0) / limit),
    },
  });
});

// ─── GET /owners/:id — 사용자 상세 ───────────────────────────
admin.get('/owners/:id', async (c) => {
  const ownerId = c.req.param('id');

  const owner = await c.env.DB.prepare(
    `SELECT owner_id, email, name, role, created_at FROM owners WHERE owner_id = ?`,
  )
    .bind(ownerId)
    .first();

  if (!owner) return c.json({ error: 'not_found' }, 404);

  const shops = await c.env.DB.prepare(
    `SELECT shop_id, mall_id, shop_name, platform, plan, deleted_at, created_at
     FROM shops WHERE owner_id = ? ORDER BY created_at DESC`,
  )
    .bind(ownerId)
    .all();

  return c.json({ owner, shops: shops.results ?? [] });
});

// ─── PUT /owners/:id/status — 사용자 정지/활성화 ─────────────
admin.put('/owners/:id/status', async (c) => {
  const ownerId = c.req.param('id');
  const { action } = await c.req.json<{ action: 'suspend' | 'activate' }>();

  if (action !== 'suspend' && action !== 'activate') {
    return c.json({ error: 'invalid_action' }, 400);
  }

  // Owner 존재 여부 확인
  const existingOwner = await c.env.DB.prepare('SELECT owner_id FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first();
  if (!existingOwner) return c.json({ error: 'not_found' }, 404);

  if (action === 'suspend') {
    // 해당 owner의 모든 shop soft delete
    await c.env.DB.prepare(
      "UPDATE shops SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE owner_id = ? AND deleted_at IS NULL",
    )
      .bind(ownerId)
      .run();
  } else {
    // 해당 owner의 모든 shop 복원
    await c.env.DB.prepare(
      "UPDATE shops SET deleted_at = NULL, updated_at = datetime('now') WHERE owner_id = ?",
    )
      .bind(ownerId)
      .run();
  }

  await recordAuditLog(
    c.env.DB,
    c.get('ownerId'),
    action === 'suspend' ? 'suspend_owner' : 'activate_owner',
    'owner',
    ownerId,
    null,
  );

  return c.json({ ok: true });
});

// ─── GET /stats — 전체 통계 ──────────────────────────────────
admin.get('/stats', async (c) => {
  const [totalShops, activeShops, totalSignups, providerDist] =
    await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as cnt FROM shops').first<{
        cnt: number;
      }>(),
      c.env.DB.prepare(
        'SELECT COUNT(*) as cnt FROM shops WHERE deleted_at IS NULL',
      ).first<{ cnt: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM login_stats WHERE action = 'signup'",
      ).first<{ cnt: number }>(),
      c.env.DB.prepare(
        "SELECT provider, COUNT(*) as cnt FROM login_stats WHERE action = 'signup' GROUP BY provider ORDER BY cnt DESC",
      ).all(),
    ]);

  return c.json({
    total_shops: totalShops?.cnt ?? 0,
    active_shops: activeShops?.cnt ?? 0,
    total_signups: totalSignups?.cnt ?? 0,
    provider_distribution: providerDist.results ?? [],
  });
});

// ─── GET /subscriptions — 전체 구독 현황 ────────────────────
admin.get('/subscriptions', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT sub.*, s.mall_id, s.shop_name, o.email as owner_email
     FROM subscriptions sub
     JOIN shops s ON sub.shop_id = s.shop_id
     JOIN owners o ON sub.owner_id = o.owner_id
     ORDER BY sub.created_at DESC LIMIT 100`,
  ).all();

  return c.json({ subscriptions: result.results ?? [] });
});

// ─── PUT /subscriptions/:id/cancel — 구독 취소 ──────────────
admin.put('/subscriptions/:id/cancel', async (c) => {
  const subscriptionId = c.req.param('id');

  // 구독 존재 여부 및 현재 상태 확인
  const sub = await c.env.DB.prepare(
    'SELECT id, shop_id, owner_id, status FROM subscriptions WHERE id = ?',
  )
    .bind(subscriptionId)
    .first<{ id: string; shop_id: string; owner_id: string; status: string }>();

  if (!sub) return c.json({ error: 'not_found' }, 404);
  if (sub.status === 'cancelled') return c.json({ error: 'already_cancelled' }, 400);

  // 구독 상태를 cancelled로 변경
  await c.env.DB.prepare(
    "UPDATE subscriptions SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?",
  )
    .bind(subscriptionId)
    .run();

  // 해당 shop의 다른 active 구독이 없으면 plan을 'free'로 다운그레이드
  const activeSubCount = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM subscriptions WHERE shop_id = ? AND status = 'active' AND id != ?",
  )
    .bind(sub.shop_id, subscriptionId)
    .first<{ cnt: number }>();

  if ((activeSubCount?.cnt ?? 0) === 0) {
    await c.env.DB.prepare(
      "UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?",
    )
      .bind(sub.shop_id)
      .run();

    // KV 캐시 무효화
    const shop = await c.env.DB.prepare(
      'SELECT client_id FROM shops WHERE shop_id = ?',
    ).bind(sub.shop_id).first<{ client_id: string }>();
    if (shop) await c.env.KV.delete(`widget_config:${shop.client_id}`);
  }

  // 감사 로그
  await recordAuditLog(
    c.env.DB,
    c.get('ownerId'),
    'cancel_subscription',
    'subscription',
    subscriptionId,
    `shop_id:${sub.shop_id}`,
  );

  return c.json({ ok: true });
});

// ─── GET /export/shops — 쇼핑몰 목록 CSV ────────────────────
admin.get('/export/shops', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT s.shop_name, s.mall_id, s.platform, s.plan, o.email as owner_email,
      CASE WHEN s.deleted_at IS NULL THEN 'active' ELSE 'suspended' END as status,
      s.created_at
     FROM shops s JOIN owners o ON s.owner_id = o.owner_id
     ORDER BY s.created_at DESC`,
  ).all<{
    shop_name: string | null;
    mall_id: string;
    platform: string;
    plan: string;
    owner_email: string;
    status: string;
    created_at: string;
  }>();

  const header = '쇼핑몰명,Mall ID,플랫폼,플랜,소유자 이메일,상태,가입일\n';
  const rows = (result.results ?? []).map((r) =>
    `"${(r.shop_name || '').replace(/"/g, '""')}","${r.mall_id}","${r.platform}","${r.plan}","${r.owner_email}","${r.status}","${r.created_at}"`,
  ).join('\n');

  const bom = '\uFEFF';
  const csv = bom + header + rows;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="shops_${today}.csv"`,
    },
  });
});

// ─── GET /export/stats — 통계 CSV ───────────────────────────
admin.get('/export/stats', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT DATE(ls.created_at) as date, s.shop_name, ls.provider, ls.action, COUNT(*) as cnt
     FROM login_stats ls
     JOIN shops s ON ls.shop_id = s.shop_id
     GROUP BY DATE(ls.created_at), ls.shop_id, ls.provider, ls.action
     ORDER BY DATE(ls.created_at) DESC, s.shop_name`,
  ).all<{
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
      'Content-Disposition': `attachment; filename="stats_${today}.csv"`,
    },
  });
});

// ─── GET /audit-log — 감사 로그 ─────────────────────────────
admin.get('/audit-log', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const result = await c.env.DB.prepare(
    `SELECT a.*, o.email as actor_email FROM audit_logs a
     LEFT JOIN owners o ON a.actor_id = o.owner_id
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(limit, offset)
    .all();

  return c.json({ logs: result.results ?? [], page, limit });
});

// ─── Helper: 감사 로그 기록 ──────────────────────────────────
async function recordAuditLog(
  db: D1Database,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string | null,
  detail: string | null,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail) VALUES (?, ?, ?, ?, ?, ?)',
    )
    .bind(generateId(), actorId, action, targetType, targetId, detail)
    .run();
}

export default admin;
