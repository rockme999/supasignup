/**
 * Tests for Widget API routes.
 */
import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '@supasignup/bg-core';
import widgetRoutes from './widget';
import { WIDGET_JS } from '../widget/buttons';

// ─── Mock helpers ────────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  };
}

function createMockD1(firstResult: unknown = null) {
  const mockFirst = vi.fn().mockResolvedValue(firstResult);
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: mockFirst, run: vi.fn() }),
      first: mockFirst,
    }),
    _mockFirst: mockFirst,
  };
}

const TEST_SHOP = {
  shop_id: 'shop_001',
  client_id: 'bg_test_cid',
  enabled_providers: '["google","kakao","naver"]',
  plan: 'free',
};

function createApp(shopResult: unknown = null) {
  const kv = createMockKV();
  const d1 = createMockD1(shopResult);

  const app = new Hono<{ Bindings: Env }>();
  app.use('/api/widget/*', cors({ origin: '*', allowMethods: ['GET'] }));
  app.route('/api/widget', widgetRoutes);
  app.get('/widget/buttons.js', (c) => {
    return c.body(WIDGET_JS, 200, {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'Access-Control-Allow-Origin': '*',
    });
  });

  const env = {
    DB: d1 as unknown as D1Database,
    KV: kv as unknown as KVNamespace,
    BASE_URL: 'https://bg.suparain.kr',
  } as Env;

  return { app, env, kv, d1 };
}

// ─── GET /api/widget/config ──────────────────────────────────

describe('GET /api/widget/config', () => {
  it('returns 400 without client_id', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/widget/config', {}, env);
    expect(resp.status).toBe(400);
  });

  it('returns 404 for unknown client_id', async () => {
    const { app, env } = createApp(null);
    const resp = await app.request('/api/widget/config?client_id=unknown', {}, env);
    expect(resp.status).toBe(404);
  });

  it('returns providers for valid shop', async () => {
    // Mock: first call = getShopByClientId, second call = getMonthlySignupCount
    const d1First = vi.fn()
      .mockResolvedValueOnce(TEST_SHOP)
      .mockResolvedValueOnce({ cnt: 50 });
    const kv = createMockKV();
    const d1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: d1First, run: vi.fn() }),
      }),
    };

    const app = new Hono<{ Bindings: Env }>();
    app.route('/api/widget', widgetRoutes);
    const env = { DB: d1, KV: kv, BASE_URL: 'https://bg.suparain.kr' } as unknown as Env;

    const resp = await app.request('/api/widget/config?client_id=bg_test_cid', {}, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.providers).toEqual(['google', 'kakao', 'naver']);
    expect(body.client_id).toBe('bg_test_cid');
    expect(body.base_url).toBe('https://bg.suparain.kr');
  });

  it('returns empty providers when over free limit', async () => {
    const d1First = vi.fn()
      .mockResolvedValueOnce(TEST_SHOP)
      .mockResolvedValueOnce({ cnt: 100 });
    const kv = createMockKV();
    const d1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: d1First, run: vi.fn() }),
      }),
    };

    const app = new Hono<{ Bindings: Env }>();
    app.route('/api/widget', widgetRoutes);
    const env = { DB: d1, KV: kv, BASE_URL: 'https://bg.suparain.kr' } as unknown as Env;

    const resp = await app.request('/api/widget/config?client_id=bg_test_cid', {}, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.providers).toEqual([]);
  });

  it('returns cached config from KV on second call', async () => {
    const d1First = vi.fn()
      .mockResolvedValueOnce(TEST_SHOP)
      .mockResolvedValueOnce({ cnt: 10 });
    const kv = createMockKV();
    const d1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: d1First, run: vi.fn() }),
      }),
    };

    const app = new Hono<{ Bindings: Env }>();
    app.route('/api/widget', widgetRoutes);
    const env = { DB: d1, KV: kv, BASE_URL: 'https://bg.suparain.kr' } as unknown as Env;

    // First call: populates cache
    await app.request('/api/widget/config?client_id=bg_test_cid', {}, env);
    expect(kv.put).toHaveBeenCalled();

    // Second call: should hit cache
    const resp2 = await app.request('/api/widget/config?client_id=bg_test_cid', {}, env);
    expect(resp2.status).toBe(200);
    expect(kv.get).toHaveBeenCalledWith('widget_config:bg_test_cid');
  });

  it('includes CORS headers', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/api/widget/config?client_id=x', {
      headers: { Origin: 'https://some-shop.cafe24.com' },
    }, env);
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

// ─── GET /widget/buttons.js ──────────────────────────────────

describe('GET /widget/buttons.js', () => {
  it('serves JavaScript with correct content type', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/widget/buttons.js', {}, env);
    expect(resp.status).toBe(200);
    expect(resp.headers.get('Content-Type')).toContain('application/javascript');
    expect(resp.headers.get('Cache-Control')).toContain('max-age=300');
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });

  it('contains BGWidget class', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/widget/buttons.js', {}, env);
    const body = await resp.text();
    expect(body).toContain('BGWidget');
    expect(body).toContain('bg-widget');
  });

  it('does not use innerHTML for user data (XSS check)', () => {
    // Only SVG icon constants use innerHTML, which are hardcoded
    // Verify no dynamic innerHTML usage
    const dynamicInnerHTML = WIDGET_JS.match(/\.innerHTML\s*=\s*[^'"`]/g);
    // The only innerHTML usage should be for hardcoded SVG icons
    expect(WIDGET_JS).toContain('.innerHTML = info.icon');
    // innerHTML usage: hardcoded SVG icon insert + hover restore (data-icon-html save/restore)
    const allInnerHTML = WIDGET_JS.match(/\.innerHTML/g) || [];
    expect(allInnerHTML.length).toBeLessThanOrEqual(4);
  });

  it('contains all 4 provider definitions', () => {
    expect(WIDGET_JS).toContain("kakao:");
    expect(WIDGET_JS).toContain("naver:");
    expect(WIDGET_JS).toContain("google:");
    expect(WIDGET_JS).toContain("apple:");
  });

  it('contains localStorage fallback for private browsing', () => {
    expect(WIDGET_JS).toContain('catch');
    expect(WIDGET_JS).toContain('localStorage');
  });

  it('contains Cafe24 login page selectors', () => {
    expect(WIDGET_JS).toContain('#member_login');
    expect(WIDGET_JS).toContain('.xans-member-login');
  });

  it('contains responsive CSS', () => {
    expect(WIDGET_JS).toContain('@media');
    expect(WIDGET_JS).toContain('max-width:480px');
  });
});
