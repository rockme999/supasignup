/**
 * Dashboard SSR page routes.
 *
 * These routes serve server-rendered HTML pages for the admin dashboard.
 * All pages except /login and /register require authentication via cookie.
 */
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT } from '@supasignup/bg-core';
import { verifyToken } from '../services/jwt';
import { hashPassword, verifyPassword } from '../services/password';
import {
  LoginPage,
  RegisterPage,
  HomePage,
  ShopsPage,
  ShopNewPage,
  ShopDetailPage,
  ShopSetupPage,
  SettingsPage,
} from '../views/pages';

type PageEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const pages = new Hono<PageEnv>();

// ─── Auth check middleware (cookie-based, redirect to login) ─

async function getOwnerIdFromCookie(cookie: string | undefined, secret: string): Promise<string | null> {
  if (!cookie) return null;
  const match = cookie.match(/bg_token=([^;]+)/);
  if (!match) return null;
  const payload = await verifyToken(match[1], secret);
  return payload?.sub ?? null;
}

pages.use('/dashboard/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Public pages
  if (path === '/dashboard/login' || path === '/dashboard/register' || path === '/dashboard/logout') {
    return next();
  }

  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    return c.redirect('/dashboard/login');
  }
  c.set('ownerId', ownerId);
  return next();
});

// ─── Public pages ────────────────────────────────────────────

pages.get('/dashboard/login', (c) => {
  return c.html(<LoginPage />);
});

pages.get('/dashboard/register', (c) => {
  return c.html(<RegisterPage />);
});

pages.get('/dashboard/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/dashboard/login',
      'Set-Cookie': 'bg_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
});

// ─── Dashboard Home ──────────────────────────────────────────

pages.get('/dashboard', async (c) => {
  const ownerId = c.get('ownerId');

  // Fetch stats
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

  const byProvider: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    byProvider[row.provider] = row.cnt;
  }

  // Fetch billing
  const now = new Date();
  const billingMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const billingResult = await c.env.DB
    .prepare(
      `SELECT s.shop_id, s.shop_name, s.plan,
        (SELECT COUNT(*) FROM login_stats ls
         WHERE ls.shop_id = s.shop_id AND ls.action = 'signup'
         AND ls.created_at >= ? AND ls.created_at < ?) as monthly_signups
       FROM shops s
       WHERE s.owner_id = ? AND s.deleted_at IS NULL`,
    )
    .bind(`${billingMonth}-01`, `${billingMonth}-32`, ownerId)
    .all<{ shop_id: string; shop_name: string; plan: string; monthly_signups: number }>();

  const billingShops = (billingResult.results ?? []).map((shop) => ({
    ...shop,
    usage_percent: shop.plan === 'free'
      ? Math.round((shop.monthly_signups / FREE_PLAN_MONTHLY_LIMIT) * 100)
      : null,
    needs_upgrade: shop.plan === 'free' && shop.monthly_signups >= 80,
    is_over_limit: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_MONTHLY_LIMIT,
  }));

  return c.html(
    <HomePage
      stats={{
        total_signups: totalResult?.signups ?? 0,
        total_logins: totalResult?.logins ?? 0,
        today_signups: todayResult?.cnt ?? 0,
        month_signups: monthResult?.cnt ?? 0,
        by_provider: byProvider,
      }}
      billingShops={billingShops}
    />
  );
});

// ─── Shops ───────────────────────────────────────────────────

pages.get('/dashboard/shops', async (c) => {
  const ownerId = c.get('ownerId');
  const result = await c.env.DB
    .prepare(
      `SELECT shop_id, shop_name, mall_id, platform, plan, enabled_providers, created_at
       FROM shops WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`,
    )
    .bind(ownerId)
    .all();

  return c.html(<ShopsPage shops={(result.results ?? []) as any} />);
});

pages.get('/dashboard/shops/new', (c) => {
  return c.html(<ShopNewPage />);
});

pages.get('/dashboard/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await c.env.DB
    .prepare(
      `SELECT shop_id, shop_name, mall_id, client_id, client_secret, platform, plan, enabled_providers, created_at
       FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL`,
    )
    .bind(shopId, ownerId)
    .first();

  if (!shop) return c.redirect('/dashboard/shops');

  // Mask secret
  const secret = (shop as any).client_secret as string;
  const masked = secret.length > 8
    ? secret.slice(0, 4) + '****' + secret.slice(-4)
    : '****';

  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const countResult = await c.env.DB
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`,
    )
    .bind(shopId, `${ym}-01`)
    .first<{ cnt: number }>();

  return c.html(
    <ShopDetailPage
      shop={{ ...(shop as any), client_secret: masked }}
      monthlySignups={countResult?.cnt ?? 0}
      baseUrl={c.env.BASE_URL}
    />
  );
});

pages.get('/dashboard/shops/:id/setup', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await c.env.DB
    .prepare(
      `SELECT shop_id, shop_name, mall_id, client_id, client_secret, platform, plan, enabled_providers, created_at
       FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL`,
    )
    .bind(shopId, ownerId)
    .first();

  if (!shop) return c.redirect('/dashboard/shops');

  const providers = (() => {
    try { return JSON.parse((shop as any).enabled_providers || '[]') as string[]; }
    catch { return [] as string[]; }
  })();

  const ssoEntries = providers.map((provider) => ({
    provider,
    authorize_url: `${c.env.BASE_URL}/oauth/authorize?provider=${provider}`,
  }));

  return c.html(
    <ShopSetupPage
      shop={shop as any}
      clientId={(shop as any).client_id}
      ssoEntries={ssoEntries}
      baseUrl={c.env.BASE_URL}
    />
  );
});

// ─── Settings ────────────────────────────────────────────────

pages.get('/dashboard/settings', async (c) => {
  const ownerId = c.get('ownerId');

  const owner = await c.env.DB
    .prepare('SELECT email, name FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ email: string; name: string }>();

  if (!owner) return c.redirect('/dashboard/login');

  return c.html(
    <SettingsPage email={owner.email} name={owner.name} />
  );
});

// ─── Settings API (password change) ─────────────────────────

pages.put('/api/dashboard/settings/password', async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{ current_password: string; new_password: string }>();

  if (!body.current_password || !body.new_password || body.new_password.length < 8) {
    return c.json({ error: 'invalid_input' }, 400);
  }

  const owner = await c.env.DB
    .prepare('SELECT password_hash FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ password_hash: string }>();

  if (!owner) return c.json({ error: 'not_found' }, 404);

  const valid = await verifyPassword(body.current_password, owner.password_hash);
  if (!valid) return c.json({ error: 'wrong_password' }, 401);

  const newHash = await hashPassword(body.new_password);
  await c.env.DB
    .prepare('UPDATE owners SET password_hash = ? WHERE owner_id = ?')
    .bind(newHash, ownerId)
    .run();

  return c.json({ ok: true });
});

export default pages;
