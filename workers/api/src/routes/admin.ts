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
