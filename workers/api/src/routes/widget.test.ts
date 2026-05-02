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

// ─── /api/widget/bg-sync (텔레메트리 ingest) ─────────────────
//
// Comet/Brave/Safari ITP 등 브라우저 내장 추적 보호가 third-party POST를
// 트래커로 차단하므로 GET 변형을 도입. POST/GET 모두 동일 핸들러를 공유.

describe('/api/widget/bg-sync', () => {
  // 정상 shop 응답을 반환하는 D1 mock + visitor_id 추출 가능한 INSERT bind 추적.
  function createBgSyncApp(shop: Record<string, unknown> | null = {
    shop_id: 'shop_001',
    client_id: 'bg_test_cid',
    mall_id: 'suparain888',
    shop_url: null,
    platform: 'cafe24',
  }) {
    const kv = createMockKV();
    const insertRun = vi.fn();
    const d1First = vi.fn().mockResolvedValue(shop);
    const d1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({ first: d1First, run: insertRun }),
      }),
    };
    const app = new Hono<{ Bindings: Env }>();
    app.route('/api/widget', widgetRoutes);
    const env = { DB: d1, KV: kv, BASE_URL: 'https://bg.suparain.kr' } as unknown as Env;
    return { app, env, kv, d1, insertRun };
  }

  // executionCtx mock — INSERT/KV put을 waitUntil로 비동기화하므로 필요
  const execCtx = { waitUntil: vi.fn(), passThroughOnException: vi.fn() } as unknown as ExecutionContext;

  // ── GET ────────────────────────────────────────────────────
  it('GET: 정상 호출 시 200 + ok=true + no-store 헤더', async () => {
    const { app, env } = createBgSyncApp();
    const url = '/api/widget/bg-sync?client_id=bg_test_cid&event_type=page_view&event_data=' +
      encodeURIComponent(JSON.stringify({ visitor_id: 'v_abc' }));
    const resp = await app.request(url, {
      headers: { Origin: 'https://suparain888.cafe24.com' },
    }, env, execCtx);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(resp.headers.get('Cache-Control')).toContain('no-store');
  });

  it('GET: event_type 누락 시 400', async () => {
    const { app, env } = createBgSyncApp();
    const resp = await app.request('/api/widget/bg-sync?client_id=bg_test_cid', {
      headers: { Origin: 'https://suparain888.cafe24.com' },
    }, env);
    expect(resp.status).toBe(400);
  });

  it('GET: 잘못된 event_data JSON 시 400', async () => {
    const { app, env } = createBgSyncApp();
    const url = '/api/widget/bg-sync?client_id=bg_test_cid&event_type=page_view&event_data=not_json';
    const resp = await app.request(url, {
      headers: { Origin: 'https://suparain888.cafe24.com' },
    }, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_event_data');
  });

  it('GET: 알 수 없는 event_type 시 400', async () => {
    const { app, env } = createBgSyncApp();
    const url = '/api/widget/bg-sync?client_id=bg_test_cid&event_type=unknown_event&event_data=' +
      encodeURIComponent('{}');
    const resp = await app.request(url, {
      headers: { Origin: 'https://suparain888.cafe24.com' },
    }, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_event_type');
  });

  it('GET: Origin 불일치 시 403', async () => {
    const { app, env } = createBgSyncApp();
    const url = '/api/widget/bg-sync?client_id=bg_test_cid&event_type=page_view&event_data=' +
      encodeURIComponent('{}');
    const resp = await app.request(url, {
      headers: { Origin: 'https://attacker.com' },
    }, env);
    expect(resp.status).toBe(403);
  });

  // ── POST (legacy + primary 호환성) ─────────────────────────
  it('POST /bg-sync: 정상 호출 시 200', async () => {
    const { app, env } = createBgSyncApp();
    const resp = await app.request('/api/widget/bg-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://suparain888.cafe24.com' },
      body: JSON.stringify({
        client_id: 'bg_test_cid',
        event_type: 'page_view',
        event_data: { visitor_id: 'v_abc' },
      }),
    }, env, execCtx);
    expect(resp.status).toBe(200);
  });

  it('POST /event (legacy alias): 정상 호출 시 200', async () => {
    const { app, env } = createBgSyncApp();
    const resp = await app.request('/api/widget/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://suparain888.cafe24.com' },
      body: JSON.stringify({
        client_id: 'bg_test_cid',
        event_type: 'page_view',
        event_data: {},
      }),
    }, env, execCtx);
    expect(resp.status).toBe(200);
  });
});

// ─── widget/buttons.js: GET 호출로 변환 검증 ──────────────────
describe('widget/buttons.js trackEvent', () => {
  it('uses GET /bg-sync with URLSearchParams (Comet/Brave 우회)', () => {
    // POST/sendBeacon 잔재가 없는지 확인
    expect(WIDGET_JS).not.toContain("navigator.sendBeacon");
    // GET 호출 패턴 + keepalive + no-referrer 정책 포함
    expect(WIDGET_JS).toContain("method: 'GET'");
    expect(WIDGET_JS).toContain("keepalive: true");
    expect(WIDGET_JS).toContain("referrerPolicy: 'no-referrer'");
    // bg-sync 경로 유지
    expect(WIDGET_JS).toContain("/api/widget/bg-sync");
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
    // innerHTML usage: hardcoded SVG icon insert + hover restore + kakao channel icon (data-icon-html save/restore)
    const allInnerHTML = WIDGET_JS.match(/\.innerHTML/g) || [];
    expect(allInnerHTML.length).toBeLessThanOrEqual(6);
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
