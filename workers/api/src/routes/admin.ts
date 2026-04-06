/**
 * Admin routes — /admin/*
 * All routes require admin role (enforced via adminAuth middleware).
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { generateId } from '@supasignup/bg-core';
import { adminAuth } from '../middleware/admin';
import { rateLimitMiddleware } from '../middleware/auth';

type AdminEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const admin = new Hono<AdminEnv>();

// POST /auth/login — 관리자 전용 로그인 (미들웨어 적용 전에 등록)
admin.post('/auth/login', rateLimitMiddleware, async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();
  if (!body.email || !body.password) {
    return c.json({ error: 'missing_fields', message: '아이디와 비밀번호를 입력해주세요.' }, 400);
  }

  const normalizedEmail = body.email.toLowerCase().trim();

  const owner = await c.env.DB
    .prepare('SELECT owner_id, password_hash, role FROM owners WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ owner_id: string; password_hash: string; role: string }>();

  if (!owner || owner.role !== 'admin') {
    return c.json({ error: 'invalid_credentials', message: '관리자 계정이 아닙니다.' }, 401);
  }

  const { verifyPassword } = await import('../services/password');
  const valid = await verifyPassword(body.password, owner.password_hash);
  if (!valid) {
    return c.json({ error: 'invalid_credentials', message: '아이디 또는 비밀번호가 올바르지 않습니다.' }, 401);
  }

  const { createToken } = await import('../services/jwt');
  const token = await createToken(owner.owner_id, c.env.JWT_SECRET);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': `bg_admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400`,
    },
  });
});

// 모든 /admin/* 라우트에 관리자 인증 적용
admin.use('/*', adminAuth);

// LIKE 패턴 특수문자 이스케이프 (%, _, \)
function escapeLike(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

// CSV 인젝션 방어: =, +, -, @ 로 시작하는 값 앞에 ' 추가
function sanitizeCsvCell(val: string): string {
  if (/^[=+\-@]/.test(val)) return "'" + val;
  return val;
}

// ─── GET /stats/providers — 기간별/플랜별 프로바이더 분포 ────
admin.get('/stats/providers', async (c) => {
  const days = c.req.query('days');
  const plan = c.req.query('plan');

  let where = "WHERE ls.action = 'signup'";
  if (days && ['7', '30', '90'].includes(days)) {
    where += ` AND ls.created_at >= datetime('now', '-${days} days')`;
  }
  if (plan === 'free') {
    where += " AND s.plan = 'free'";
  } else if (plan === 'paid') {
    where += " AND s.plan != 'free'";
  }

  const result = await c.env.DB.prepare(
    `SELECT ls.provider, COUNT(*) as cnt FROM login_stats ls JOIN shops s ON ls.shop_id = s.shop_id ${where} GROUP BY ls.provider ORDER BY cnt DESC`
  ).all<{ provider: string; cnt: number }>();

  return c.json({ providers: result.results ?? [] });
});

// ─── GET /stats/daily — 일자별/프로바이더별 가입 추이 ────────
admin.get('/stats/daily', async (c) => {
  const days = c.req.query('days') || '14';
  const plan = c.req.query('plan');

  const dayCount = ['7', '14', '30', '90'].includes(days) ? days : '14';

  let where = "WHERE ls.action = 'signup'";
  where += ` AND ls.created_at >= datetime('now', '-${dayCount} days')`;
  if (plan === 'free') {
    where += " AND s.plan = 'free'";
  } else if (plan === 'paid') {
    where += " AND s.plan != 'free'";
  }

  const result = await c.env.DB.prepare(
    `SELECT DATE(ls.created_at) as date, ls.provider, COUNT(*) as cnt
     FROM login_stats ls JOIN shops s ON ls.shop_id = s.shop_id
     ${where}
     GROUP BY DATE(ls.created_at), ls.provider
     ORDER BY date ASC, cnt DESC`
  ).all<{ date: string; provider: string; cnt: number }>();

  return c.json({ daily: result.results ?? [] });
});

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
    `"${sanitizeCsvCell((r.shop_name || '').replace(/"/g, '""'))}","${sanitizeCsvCell(r.mall_id)}","${sanitizeCsvCell(r.platform)}","${sanitizeCsvCell(r.plan)}","${sanitizeCsvCell(r.owner_email)}","${sanitizeCsvCell(r.status)}","${sanitizeCsvCell(r.created_at)}"`,
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
    `"${sanitizeCsvCell(r.date)}","${sanitizeCsvCell((r.shop_name || '').replace(/"/g, '""'))}","${sanitizeCsvCell(r.provider)}","${sanitizeCsvCell(r.action)}","${String(r.cnt)}"`,
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

// ─── GET /monitoring — Cloudflare 리소스 사용량 ──────────────
admin.get('/monitoring', async (c) => {
  const token = c.env.CF_API_TOKEN;
  const accountId = c.env.CF_ACCOUNT_ID;

  if (!token || !accountId) {
    return c.json({ error: 'cf_not_configured', message: 'CF_API_TOKEN 또는 CF_ACCOUNT_ID가 설정되지 않았습니다.' }, 503);
  }

  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(); // 24시간 전
  const until = now.toISOString();
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // 번개가입 Worker/D1만 필터링
  const isDev = c.env.BASE_URL.includes('dev');
  const workerName = isDev ? 'bg-api-dev' : 'bg-api';
  const d1Id = isDev ? 'd420b951-c93b-4449-8f8c-f86c9f99a2cc' : '254438d7-b1b1-45a1-afe1-2c766aba252b';

  // GraphQL 쿼리: Workers 요청/에러/CPU + 일자별 추이 (variables 사용으로 인젝션 방어)
  const query = `query($accountTag: string!, $since7d: string!, $until: string!, $since24h: string!, $workerName: string!, $d1Id: string!) {
    viewer {
      accounts(filter: {accountTag: $accountTag}) {
        workersInvocationsAdaptive(
          filter: {datetimeGeq: $since7d, datetimeLt: $until, scriptName: $workerName}
          limit: 1000
          orderBy: [datetime_ASC]
        ) {
          sum { requests errors subrequests }
          quantiles { cpuTimeP50 cpuTimeP99 }
          dimensions { datetime: datetimeHour scriptName }
        }
        d1AnalyticsAdaptive(
          filter: {datetimeGeq: $since24h, datetimeLt: $until, databaseId: $d1Id}
          limit: 100
        ) {
          sum { readQueries writeQueries rowsRead rowsWritten }
          dimensions { databaseId }
        }
      }
    }
  }`;

  try {
    const resp = await fetch('https://api.cloudflare.com/client/v4/graphql', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          accountTag: accountId,
          since7d,
          until,
          since24h: since,
          workerName,
          d1Id,
        },
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error('[Monitoring] CF API error:', resp.status, text);
      return c.json({ error: 'cf_api_error', status: resp.status }, 502);
    }

    const data = await resp.json() as { data: unknown; errors: unknown };
    return c.json({ data: data.data, errors: data.errors });
  } catch (err) {
    console.error('[Monitoring] fetch error:', err);
    return c.json({ error: 'cf_fetch_error' }, 500);
  }
});

// ─── POST /test-briefing-queue — Queue 테스트 (관리자 전용) ──
admin.post('/test-briefing-queue', async (c) => {
  const { shop_id } = await c.req.json<{ shop_id: string }>();
  if (!shop_id) return c.json({ error: 'shop_id required' }, 400);

  const shop = await c.env.DB.prepare('SELECT shop_id, shop_name FROM shops WHERE shop_id = ?')
    .bind(shop_id).first<{ shop_id: string; shop_name: string }>();
  if (!shop) return c.json({ error: 'not_found' }, 404);

  await c.env.BRIEFING_QUEUE.send({ shop_id: shop.shop_id, shop_name: shop.shop_name });
  return c.json({ ok: true, message: `Queued briefing for ${shop.shop_name}` });
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

// ─── GET /inquiries — 전체 문의 목록 ─────────────────────────
admin.get('/inquiries', async (c) => {
  const status = c.req.query('status') || '';
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = `
    SELECT i.id, i.title, i.status, i.created_at, i.replied_at,
           o.email as owner_email, s.shop_name, s.mall_id
    FROM inquiries i
    JOIN owners o ON i.owner_id = o.owner_id
    JOIN shops s ON i.shop_id = s.shop_id
    WHERE 1=1`;
  const params: string[] = [];

  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  query += ' ORDER BY CASE i.status WHEN \'pending\' THEN 0 ELSE 1 END, i.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const countQuery = status
    ? 'SELECT COUNT(*) as total FROM inquiries WHERE status = ?'
    : 'SELECT COUNT(*) as total FROM inquiries';

  const [result, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    status
      ? c.env.DB.prepare(countQuery).bind(status).first<{ total: number }>()
      : c.env.DB.prepare(countQuery).first<{ total: number }>(),
  ]);

  return c.json({
    inquiries: result.results ?? [],
    pagination: {
      page,
      limit,
      total: countResult?.total ?? 0,
      pages: Math.ceil((countResult?.total ?? 0) / limit),
    },
  });
});

// ─── PUT /inquiries/:id/reply — 답변 작성 ────────────────────
admin.put('/inquiries/:id/reply', async (c) => {
  const inquiryId = c.req.param('id');
  const { reply } = await c.req.json<{ reply?: string }>();

  if (!reply?.trim()) {
    return c.json({ error: 'reply is required' }, 400);
  }

  const existing = await c.env.DB.prepare(
    'SELECT id FROM inquiries WHERE id = ?',
  )
    .bind(inquiryId)
    .first();
  if (!existing) return c.json({ error: 'not_found' }, 404);

  await c.env.DB.prepare(
    `UPDATE inquiries
     SET reply = ?, status = 'replied', replied_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ?`,
  )
    .bind(reply.trim(), inquiryId)
    .run();

  await recordAuditLog(
    c.env.DB,
    c.get('ownerId'),
    'reply_inquiry',
    'inquiry',
    inquiryId,
    null,
  );

  return c.json({ ok: true });
});

// ─── GET /ai-reports — 전체 쇼핑몰 AI 브리핑 목록 ───────────
admin.get('/ai-reports', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT s.shop_id, s.shop_name, s.mall_id, s.plan, s.shop_identity,
            ab.id as briefing_id, ab.briefing_type, ab.summary,
            ab.created_at as briefing_created_at
     FROM shops s
     LEFT JOIN ai_briefings ab ON ab.shop_id = s.shop_id
       AND ab.id = (
         SELECT id FROM ai_briefings
         WHERE shop_id = s.shop_id
         ORDER BY created_at DESC
         LIMIT 1
       )
     WHERE s.deleted_at IS NULL
     ORDER BY ab.created_at DESC NULLS LAST, s.created_at DESC
     LIMIT 100`,
  ).all();

  return c.json({ shops: result.results ?? [] });
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
