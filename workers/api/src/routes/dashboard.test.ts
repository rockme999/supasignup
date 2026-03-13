/**
 * Tests for Dashboard API routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import dashboardRoutes from './dashboard';
import { createToken } from '../services/jwt';
import { hashPassword } from '../services/password';

// ─── Mock helpers ────────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

function createMockD1() {
  const firstResults: unknown[] = [];
  let callIdx = 0;
  const allResults: unknown[][] = [];
  let allIdx = 0;

  const mockFirst = vi.fn(async () => {
    return firstResults[callIdx++] ?? null;
  });
  const mockAll = vi.fn(async () => {
    return { results: allResults[allIdx++] ?? [] };
  });
  const mockRun = vi.fn(async () => ({ success: true }));
  const mockBind = vi.fn((..._args: unknown[]) => ({
    first: mockFirst, all: mockAll, run: mockRun,
  }));

  return {
    prepare: vi.fn(() => ({ bind: mockBind, first: mockFirst, run: mockRun, all: mockAll })),
    _setFirstSequence: (vals: unknown[]) => { firstResults.length = 0; firstResults.push(...vals); callIdx = 0; },
    _setAllSequence: (vals: unknown[][]) => { allResults.length = 0; allResults.push(...vals); allIdx = 0; },
    _mockBind: mockBind,
  };
}

const JWT_SECRET = 'test_jwt_secret';

function createApp() {
  const kv = createMockKV();
  const d1 = createMockD1();

  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/dashboard', dashboardRoutes);

  const env = {
    DB: d1 as unknown as D1Database,
    KV: kv as unknown as KVNamespace,
    BASE_URL: 'https://bg.suparain.kr',
    JWT_SECRET,
  } as Env;

  return { app, env, kv, d1 };
}

async function getAuthHeader(): Promise<string> {
  const token = await createToken('owner_001', JWT_SECRET);
  return `Bearer ${token}`;
}

// ─── Auth: Register ──────────────────────────────────────────

describe('POST /api/dashboard/auth/register', () => {
  it('returns 400 when missing fields', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env);
    expect(resp.status).toBe(400);
  });

  it('returns 400 for weak password', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: '123' }),
    }, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('weak_password');
  });

  it('returns 409 for duplicate email', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ owner_id: 'existing' }]); // email exists
    const resp = await app.request('/api/dashboard/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'dup@test.com', password: 'password123' }),
    }, env);
    expect(resp.status).toBe(409);
  });

  it('creates owner and returns token on success', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([null]); // no existing email
    const resp = await app.request('/api/dashboard/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@test.com', password: 'password123', name: '운영자' }),
    }, env);
    expect(resp.status).toBe(201);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.owner_id).toBeDefined();
    expect(body.token).toBeDefined();

    // Check Set-Cookie header
    const setCookie = resp.headers.get('Set-Cookie');
    expect(setCookie).toContain('bg_token=');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Strict');
  });
});

// ─── Auth: Login ─────────────────────────────────────────────

describe('POST /api/dashboard/auth/login', () => {
  it('returns 401 for non-existent email', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([null]); // no owner found
    const resp = await app.request('/api/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'none@test.com', password: 'pass' }),
    }, env);
    expect(resp.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await hashPassword('correct_password');
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ owner_id: 'owner_001', password_hash: hash }]);
    const resp = await app.request('/api/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong_password' }),
    }, env);
    expect(resp.status).toBe(401);
  });

  it('returns token for correct credentials', async () => {
    const hash = await hashPassword('correct_password');
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ owner_id: 'owner_001', password_hash: hash }]);
    const resp = await app.request('/api/dashboard/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@test.com', password: 'correct_password' }),
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.token).toBeDefined();
    expect(body.owner_id).toBe('owner_001');
  });
});

// ─── Auth Middleware ──────────────────────────────────────────

describe('Auth middleware', () => {
  it('returns 401 without token', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/shops', {}, env);
    expect(resp.status).toBe(401);
  });

  it('returns 401 with invalid token', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/shops', {
      headers: { Authorization: 'Bearer invalid_token' },
    }, env);
    expect(resp.status).toBe(401);
  });

  it('passes with valid JWT', async () => {
    const { app, env, d1 } = createApp();
    d1._setAllSequence([[]]); // empty shops list
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);
  });
});

// ─── Shop CRUD ───────────────────────────────────────────────

describe('GET /api/dashboard/shops', () => {
  it('returns shop list for authenticated owner', async () => {
    const { app, env, d1 } = createApp();
    const shops = [{ shop_id: 's1', shop_name: '샵1' }, { shop_id: 's2', shop_name: '샵2' }];
    d1._setAllSequence([shops]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as { shops: unknown[] };
    expect(body.shops).toHaveLength(2);
  });
});

describe('POST /api/dashboard/shops', () => {
  it('returns 400 for missing fields', async () => {
    const { app, env } = createApp();
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }, env);
    expect(resp.status).toBe(400);
  });

  it('creates shop with auto-generated client_id', async () => {
    const { app, env, d1 } = createApp();
    const newShop = {
      shop_id: 'new_shop',
      client_id: 'bg_auto123',
      client_secret: 'secret_auto',
      mall_id: 'newmall',
    };
    d1._setFirstSequence([null, newShop]); // createShop: INSERT then SELECT
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops', {
      method: 'POST',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mall_id: 'newmall', platform: 'cafe24' }),
    }, env);
    expect(resp.status).toBe(201);
  });
});

describe('GET /api/dashboard/shops/:id', () => {
  it('returns 404 for non-existent shop', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([null]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/nonexistent', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(404);
  });

  it('returns 404 for shop owned by another user', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ shop_id: 's1', owner_id: 'other_owner' }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(404);
  });

  it('returns shop with masked secret', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([
      { shop_id: 's1', owner_id: 'owner_001', client_secret: 'abcdefghijklmnop', enabled_providers: '["google"]' },
      { cnt: 42 },
    ]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as { shop: { client_secret: string }; monthly_signup_count: number };
    expect(body.shop.client_secret).toContain('****');
    expect(body.shop.client_secret).not.toBe('abcdefghijklmnop');
    expect(body.monthly_signup_count).toBe(42);
  });
});

describe('DELETE /api/dashboard/shops/:id', () => {
  it('soft deletes shop', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ shop_id: 's1', owner_id: 'owner_001' }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1', {
      method: 'DELETE',
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});

describe('PUT /api/dashboard/shops/:id/providers', () => {
  it('returns 400 for empty providers', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ shop_id: 's1', owner_id: 'owner_001' }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1/providers', {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: [] }),
    }, env);
    expect(resp.status).toBe(400);
  });

  it('returns 400 for invalid provider', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ shop_id: 's1', owner_id: 'owner_001' }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1/providers', {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: ['google', 'facebook'] }),
    }, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_provider');
  });

  it('updates providers and invalidates KV cache', async () => {
    const { app, env, d1, kv } = createApp();
    d1._setFirstSequence([{ shop_id: 's1', owner_id: 'owner_001', client_id: 'bg_cid' }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1/providers', {
      method: 'PUT',
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ providers: ['kakao', 'naver'] }),
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as { providers: string[] };
    expect(body.providers).toEqual(['kakao', 'naver']);

    // KV cache invalidated
    expect(kv.delete).toHaveBeenCalledWith('widget_config:bg_cid');
  });
});

describe('GET /api/dashboard/shops/:id/setup', () => {
  it('returns SSO setup info', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{
      shop_id: 's1',
      owner_id: 'owner_001',
      client_id: 'bg_cid',
      client_secret: 'bg_secret',
      enabled_providers: '["google","kakao"]',
    }]);
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/shops/s1/setup', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as {
      client_id: string;
      sso_entries: { provider: string; authorize_url: string }[];
      instructions: string[];
    };
    expect(body.client_id).toBe('bg_cid');
    expect(body.sso_entries).toHaveLength(2);
    expect(body.sso_entries[0].authorize_url).toContain('/oauth/authorize');
    expect(body.instructions.length).toBeGreaterThan(0);
  });
});
