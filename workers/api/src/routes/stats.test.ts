/**
 * Tests for Stats & Billing API routes.
 */
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import statsRoutes from './stats';
import { createToken } from '../services/jwt';

// ─── Mock helpers ────────────────────────────────────────────

function createMockD1() {
  const firstResults: unknown[] = [];
  let callIdx = 0;
  const allResults: unknown[][] = [];
  let allIdx = 0;

  const mockFirst = vi.fn(async () => firstResults[callIdx++] ?? null);
  const mockAll = vi.fn(async () => ({ results: allResults[allIdx++] ?? [] }));
  const mockRun = vi.fn(async () => ({ success: true }));
  const mockBind = vi.fn((..._args: unknown[]) => ({
    first: mockFirst, all: mockAll, run: mockRun,
  }));

  return {
    prepare: vi.fn(() => ({ bind: mockBind, first: mockFirst, run: mockRun, all: mockAll })),
    _setFirstSequence: (vals: unknown[]) => { firstResults.length = 0; firstResults.push(...vals); callIdx = 0; },
    _setAllSequence: (vals: unknown[][]) => { allResults.length = 0; allResults.push(...vals); allIdx = 0; },
  };
}

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

const JWT_SECRET = 'test_jwt_secret';

function createApp() {
  const d1 = createMockD1();
  const kv = createMockKV();

  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/dashboard', statsRoutes);

  const env = {
    DB: d1 as unknown as D1Database,
    KV: kv as unknown as KVNamespace,
    BASE_URL: 'https://bg.suparain.kr',
    JWT_SECRET,
  } as Env;

  return { app, env, d1 };
}

async function getAuthHeader(): Promise<string> {
  const token = await createToken('owner_001', JWT_SECRET);
  return `Bearer ${token}`;
}

// ─── GET /stats ──────────────────────────────────────────────

describe('GET /api/dashboard/stats', () => {
  it('returns 401 without auth', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/stats', {}, env);
    expect(resp.status).toBe(401);
  });

  it('returns aggregated stats', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([
      { total: 150, signups: 100, logins: 50 },  // total
      { cnt: 5 },                                  // today
      { cnt: 30 },                                 // month
    ]);
    d1._setAllSequence([
      [{ provider: 'kakao', cnt: 60 }, { provider: 'naver', cnt: 40 }],  // by provider
    ]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/stats', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as Record<string, unknown>;
    expect(body.total_events).toBe(150);
    expect(body.total_signups).toBe(100);
    expect(body.total_logins).toBe(50);
    expect(body.today_signups).toBe(5);
    expect(body.month_signups).toBe(30);
    expect(body.by_provider).toEqual({ kakao: 60, naver: 40 });
  });

  it('returns zeros when no data', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([null, null, null]);
    d1._setAllSequence([[]]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/stats', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as Record<string, unknown>;
    expect(body.total_events).toBe(0);
    expect(body.total_signups).toBe(0);
    expect(body.by_provider).toEqual({});
  });
});

// ─── GET /stats/:shop_id ────────────────────────────────────

describe('GET /api/dashboard/stats/:shop_id', () => {
  it('returns 404 for non-owned shop', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([null]); // ownership check fails
    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/stats/shop_x', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(404);
  });

  it('returns per-shop daily and provider stats', async () => {
    const { app, env, d1 } = createApp();
    d1._setFirstSequence([{ shop_id: 'shop_1' }]); // ownership ok
    d1._setAllSequence([
      [
        { day: '2026-03-10', action: 'signup', cnt: 3 },
        { day: '2026-03-10', action: 'login', cnt: 7 },
        { day: '2026-03-11', action: 'signup', cnt: 5 },
      ],
      [{ provider: 'google', cnt: 8 }],
    ]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/stats/shop_1', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as { shop_id: string; daily: unknown[]; by_provider: Record<string, number> };
    expect(body.shop_id).toBe('shop_1');
    expect(body.daily).toHaveLength(3);
    expect(body.by_provider).toEqual({ google: 8 });
  });
});

// ─── GET /billing/status ────────────────────────────────────

describe('GET /api/dashboard/billing/status', () => {
  it('returns 401 without auth', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/dashboard/billing/status', {}, env);
    expect(resp.status).toBe(401);
  });

  it('returns billing status for all shops', async () => {
    const { app, env, d1 } = createApp();
    d1._setAllSequence([
      [
        { shop_id: 's1', shop_name: '샵1', mall_id: 'mall1', plan: 'free', monthly_signups: 50 },
        { shop_id: 's2', shop_name: '샵2', mall_id: 'mall2', plan: 'free', monthly_signups: 95 },
      ],
    ]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/billing/status', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as { shops: Array<{
      shop_id: string;
      monthly_signups: number;
      limit: number | null;
      usage_percent: number | null;
      needs_upgrade: boolean;
      is_over_limit: boolean;
    }>; month: string };

    expect(body.shops).toHaveLength(2);

    // s1: 50/100 = 50%, not needs_upgrade, not over_limit
    expect(body.shops[0].usage_percent).toBe(50);
    expect(body.shops[0].needs_upgrade).toBe(false);
    expect(body.shops[0].is_over_limit).toBe(false);

    // s2: 95/100 = 95%, needs_upgrade (>=80), not over_limit (<100)
    expect(body.shops[1].usage_percent).toBe(95);
    expect(body.shops[1].needs_upgrade).toBe(true);
    expect(body.shops[1].is_over_limit).toBe(false);

    expect(body.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('marks shop as over_limit when at 100', async () => {
    const { app, env, d1 } = createApp();
    d1._setAllSequence([
      [{ shop_id: 's1', shop_name: '샵1', mall_id: 'mall1', plan: 'free', monthly_signups: 100 }],
    ]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/billing/status', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as { shops: Array<{ is_over_limit: boolean; needs_upgrade: boolean }> };
    expect(body.shops[0].is_over_limit).toBe(true);
    expect(body.shops[0].needs_upgrade).toBe(true);
  });

  it('returns null limit/usage for paid plan', async () => {
    const { app, env, d1 } = createApp();
    d1._setAllSequence([
      [{ shop_id: 's1', shop_name: '샵1', mall_id: 'mall1', plan: 'pro', monthly_signups: 500 }],
    ]);

    const auth = await getAuthHeader();
    const resp = await app.request('/api/dashboard/billing/status', {
      headers: { Authorization: auth },
    }, env);
    expect(resp.status).toBe(200);

    const body = await resp.json() as { shops: Array<{ limit: number | null; usage_percent: number | null; needs_upgrade: boolean; is_over_limit: boolean }> };
    expect(body.shops[0].limit).toBeNull();
    expect(body.shops[0].usage_percent).toBeNull();
    expect(body.shops[0].needs_upgrade).toBe(false);
    expect(body.shops[0].is_over_limit).toBe(false);
  });
});
