/**
 * Dashboard API endpoints.
 *
 * Auth:
 *   POST /api/dashboard/auth/register - Owner signup
 *   POST /api/dashboard/auth/login    - Owner login (JWT)
 *
 * Shops (auth required):
 *   GET    /api/dashboard/shops           - List shops
 *   POST   /api/dashboard/shops           - Create shop
 *   GET    /api/dashboard/shops/:id       - Get shop detail
 *   PUT    /api/dashboard/shops/:id       - Update shop
 *   DELETE /api/dashboard/shops/:id       - Soft delete shop
 *   PUT    /api/dashboard/shops/:id/providers - Update enabled providers
 *   GET    /api/dashboard/shops/:id/setup     - SSO setup info
 */

import { Hono } from 'hono';
import type { Env, ProviderName } from '@supasignup/bg-core';
import { generateId } from '@supasignup/bg-core';
import { hashPassword, verifyPassword } from '../services/password';
import { createToken } from '../services/jwt';
import { authMiddleware, rateLimitMiddleware } from '../middleware/auth';
import {
  getShopById,
  createShop,
  updateShop,
  softDeleteShop,
  getMonthlySignupCount,
} from '../db/queries';

const VALID_PROVIDERS: ProviderName[] = ['google', 'kakao', 'naver', 'apple', 'discord', 'facebook', 'x', 'line', 'telegram'];
const COOKIE_MAX_AGE = 86400; // 24 hours

type DashboardEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const dashboard = new Hono<DashboardEnv>();

// ═══════════════════════════════════════════════════════════════
// Auth routes (no auth middleware)
// ═══════════════════════════════════════════════════════════════

// ─── POST /auth/register ─────────────────────────────────────
dashboard.post('/auth/register', rateLimitMiddleware, async (c) => {
  const body = await c.req.json<{ email?: string; password?: string; name?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'missing_fields', message: 'email and password are required' }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ error: 'weak_password', message: 'Password must be at least 8 characters' }, 400);
  }

  const normalizedEmail = body.email.toLowerCase().trim();

  // Check duplicate email
  const existing = await c.env.DB
    .prepare('SELECT owner_id FROM owners WHERE email = ?')
    .bind(normalizedEmail)
    .first();

  if (existing) {
    return c.json({ error: 'email_exists', message: 'Email already registered' }, 409);
  }

  const ownerId = generateId();
  const passwordHash = await hashPassword(body.password);

  await c.env.DB
    .prepare('INSERT INTO owners (owner_id, email, name, password_hash) VALUES (?, ?, ?, ?)')
    .bind(ownerId, normalizedEmail, body.name ?? null, passwordHash)
    .run();

  const token = await createToken(ownerId, c.env.JWT_SECRET);

  return c.json({ owner_id: ownerId, token }, 201, {
    'Set-Cookie': `bg_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`,
  });
});

// ─── POST /auth/login ────────────────────────────────────────
dashboard.post('/auth/login', rateLimitMiddleware, async (c) => {
  const body = await c.req.json<{ email?: string; password?: string }>();

  if (!body.email || !body.password) {
    return c.json({ error: 'missing_fields' }, 400);
  }

  const normalizedEmail = body.email.toLowerCase().trim();

  const owner = await c.env.DB
    .prepare('SELECT owner_id, password_hash FROM owners WHERE email = ?')
    .bind(normalizedEmail)
    .first<{ owner_id: string; password_hash: string }>();

  if (!owner) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  const valid = await verifyPassword(body.password, owner.password_hash);
  if (!valid) {
    return c.json({ error: 'invalid_credentials' }, 401);
  }

  const token = await createToken(owner.owner_id, c.env.JWT_SECRET);

  return c.json({ owner_id: owner.owner_id, token }, 200, {
    'Set-Cookie': `bg_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`,
  });
});

// ═══════════════════════════════════════════════════════════════
// Protected routes (auth middleware applied)
// ═══════════════════════════════════════════════════════════════

dashboard.use('/shops/*', authMiddleware);
dashboard.use('/shops', authMiddleware);

// ─── GET /shops ──────────────────────────────────────────────
dashboard.get('/shops', async (c) => {
  const ownerId = c.get('ownerId');
  const result = await c.env.DB
    .prepare('SELECT * FROM shops WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC')
    .bind(ownerId)
    .all();

  return c.json({ shops: result.results ?? [] });
});

// ─── POST /shops ─────────────────────────────────────────────
dashboard.post('/shops', async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{
    mall_id?: string;
    platform?: string;
    shop_name?: string;
    shop_url?: string;
    allowed_redirect_uris?: string[];
  }>();

  if (!body.mall_id || !body.platform) {
    return c.json({ error: 'missing_fields', message: 'mall_id and platform are required' }, 400);
  }

  if (!['cafe24', 'imweb', 'godomall', 'shopby'].includes(body.platform)) {
    return c.json({ error: 'invalid_platform' }, 400);
  }

  const shop = await createShop(c.env.DB, {
    mall_id: body.mall_id,
    platform: body.platform as 'cafe24' | 'imweb' | 'godomall' | 'shopby',
    shop_name: body.shop_name,
    shop_url: body.shop_url,
    owner_id: ownerId,
    allowed_redirect_uris: body.allowed_redirect_uris,
  });

  return c.json({ shop }, 201);
});

// ─── GET /shops/:id ──────────────────────────────────────────
dashboard.get('/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Add monthly count
  const monthlyCount = await getMonthlySignupCount(c.env.DB, shopId);

  return c.json({
    shop: { ...shop, client_secret: maskSecret(shop.client_secret) },
    monthly_signup_count: monthlyCount,
  });
});

// ─── PUT /shops/:id ──────────────────────────────────────────
dashboard.put('/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = await c.req.json<Record<string, unknown>>();

  // Prevent direct modification of protected fields
  const allowed = ['shop_name', 'shop_url', 'allowed_redirect_uris', 'sso_configured'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) {
      if (key === 'allowed_redirect_uris' && Array.isArray(body[key])) {
        updates[key] = JSON.stringify(body[key]);
      } else {
        updates[key] = body[key];
      }
    }
  }

  await updateShop(c.env.DB, shopId, updates);
  return c.json({ ok: true });
});

// ─── DELETE /shops/:id ───────────────────────────────────────
dashboard.delete('/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  await softDeleteShop(c.env.DB, shopId);
  return c.json({ ok: true });
});

// ─── PUT /shops/:id/providers ────────────────────────────────
dashboard.put('/shops/:id/providers', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = await c.req.json<{ providers?: string[] }>();
  const providers = body.providers;

  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return c.json({ error: 'invalid_providers', message: 'At least one provider required' }, 400);
  }

  // Validate each provider
  for (const p of providers) {
    if (!VALID_PROVIDERS.includes(p as ProviderName)) {
      return c.json({ error: 'invalid_provider', message: `Unknown provider: ${p}` }, 400);
    }
  }

  await updateShop(c.env.DB, shopId, {
    enabled_providers: JSON.stringify(providers),
  });

  // Invalidate widget config cache
  await c.env.KV.delete(`widget_config:${shop.client_id}`);

  return c.json({ ok: true, providers });
});

// ─── GET /shops/:id/setup ────────────────────────────────────
dashboard.get('/shops/:id/setup', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const baseUrl = c.env.BASE_URL;
  const enabledProviders: string[] = JSON.parse(shop.enabled_providers);

  return c.json({
    client_id: shop.client_id,
    client_secret: shop.client_secret,
    sso_entries: enabledProviders.map((provider) => ({
      provider,
      display_name: `번개가입 ${provider}`,
      authorize_url: `${baseUrl}/oauth/authorize`,
      token_url: `${baseUrl}/oauth/token`,
      userinfo_url: `${baseUrl}/oauth/userinfo`,
      params: `provider=${provider}`,
    })),
    account_linking: true,
    instructions: [
      '1. 카페24 관리자 → 쇼핑몰 설정 → 외부 서비스 연동 → SSO 설정',
      '2. 위 프로바이더별로 SSO 항목을 등록합니다.',
      '3. Client ID와 Client Secret을 입력합니다.',
      '4. Account Linking을 활성화합니다.',
    ],
  });
});

// ─── Helper ──────────────────────────────────────────────────

function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

export default dashboard;
