/**
 * Tests for Cafe24 app lifecycle routes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import cafe24Routes from './cafe24';

// ─── Mock cafe24-client ──────────────────────────────────────

vi.mock('@supasignup/cafe24-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@supasignup/cafe24-client')>();
  return {
    ...actual,
    Cafe24Client: vi.fn().mockImplementation(() => ({
      exchangeCode: vi.fn().mockResolvedValue({
        access_token: 'at_123',
        refresh_token: 'rt_123',
        expires_at: new Date(),
        refresh_token_expires_at: new Date(),
      }),
      getStoreInfo: vi.fn().mockResolvedValue({
        shop_name: '테스트몰',
        shop_domain: 'https://testmall.cafe24.com',
      }),
      listScriptTags: vi.fn().mockResolvedValue([]),
      createScriptTag: vi.fn().mockResolvedValue({ script_no: 1 }),
    })),
    verifyAppLaunchHmac: vi.fn().mockResolvedValue(true),
    verifyWebhookHmac: vi.fn().mockResolvedValue(true),
  };
});

// ─── Mock helpers ────────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, string>();
  return {
    get: vi.fn(async (key: string, type?: string) => {
      const val = store.get(key) ?? null;
      if (val && type === 'json') return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

function createMockD1() {
  const mockFirst = vi.fn().mockResolvedValue(null);
  const mockRun = vi.fn().mockResolvedValue({ success: true });
  const mockBatch = vi.fn().mockResolvedValue([{ success: true }]);
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: mockFirst, run: mockRun }),
      first: mockFirst,
      run: mockRun,
    }),
    batch: mockBatch,
    _mockFirst: mockFirst,
    _mockBatch: mockBatch,
  };
}

// 엣지 캐시(caches.default)는 Node 테스트 환경에 없으므로 최소 스텁 제공
// purgeWidgetConfigCache 호출 시 예외가 나지 않도록 delete만 지원하는 더미 캐시를 주입한다.
if (!(globalThis as unknown as { caches?: unknown }).caches) {
  (globalThis as unknown as { caches: { default: { delete: (req: Request) => Promise<boolean> } } }).caches = {
    default: { delete: async () => true },
  };
}

function createTestApp() {
  const kv = createMockKV();
  const d1 = createMockD1();

  const app = new Hono<{ Bindings: Env }>();
  app.route('/api/cafe24', cafe24Routes);

  const env = {
    DB: d1 as unknown as D1Database,
    KV: kv as unknown as KVNamespace,
    BASE_URL: 'https://bg.suparain.kr',
    CAFE24_CLIENT_ID: 'cafe24_test_cid',
    CAFE24_CLIENT_SECRET: 'cafe24_test_secret',
    ENCRYPTION_KEY: 'a'.repeat(64),
    JWT_SECRET: 'test_jwt_secret_key_for_testing',
  } as Env;

  return { app, env, kv, d1 };
}

// ─── GET /api/cafe24/install ─────────────────────────────────

describe('GET /api/cafe24/install', () => {
  it('returns 400 when missing parameters', async () => {
    const { app, env } = createTestApp();
    const resp = await app.request('/api/cafe24/install', {}, env);
    expect(resp.status).toBe(400);
  });

  it('returns 400 for expired timestamp', async () => {
    const { app, env } = createTestApp();
    const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 min ago
    const url = `/api/cafe24/install?mall_id=test&hmac=abc&timestamp=${oldTimestamp}`;
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('expired_timestamp');
  });

  it('redirects to Cafe24 OAuth on valid install', async () => {
    const { app, env } = createTestApp();
    const timestamp = Math.floor(Date.now() / 1000);
    const url = `/api/cafe24/install?mall_id=testmall&hmac=valid_hmac&timestamp=${timestamp}`;
    const resp = await app.request(url, {}, env);

    expect(resp.status).toBe(302);
    const location = resp.headers.get('Location')!;
    expect(location).toContain('testmall.cafe24api.com');
    expect(location).toContain('oauth/authorize');
    expect(location).toContain('client_id=cafe24_test_cid');
    expect(location).toContain('response_type=code');
    expect(location).toMatch(/state=testmall(%3A|:)/);
  });
});

// ─── GET /api/cafe24/callback ────────────────────────────────

describe('GET /api/cafe24/callback', () => {
  it('returns 400 when missing parameters', async () => {
    const { app, env } = createTestApp();
    const resp = await app.request('/api/cafe24/callback', {}, env);
    expect(resp.status).toBe(400);
  });

  it('returns 400 on cafe24 auth error', async () => {
    const { app, env } = createTestApp();
    const resp = await app.request('/api/cafe24/callback?error=access_denied&error_description=User+denied', {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('cafe24_auth_error');
  });

  it('redirects to dashboard on successful callback', async () => {
    const { app, env, kv, d1 } = createTestApp();

    // KV에 CSRF state 토큰 사전 등록
    const csrfToken = 'test_csrf_token';
    await kv.put(`cafe24_state:${csrfToken}`, JSON.stringify({ mall_id: 'testmall' }));

    // Mock: getShopByMallId returns null (new shop), then various queries
    let callCount = 0;
    d1.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockImplementation(async () => {
          callCount++;
          if (callCount === 1) return null; // getShopByMallId → no existing shop
          if (callCount === 2) return null; // getOrCreateDefaultOwner → no existing owner
          // After inserts, return the new shop
          return {
            shop_id: 'new_shop_id',
            client_id: 'bg_new_client',
            shop_name: '테스트몰',
          };
        }),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    });

    const resp = await app.request(`/api/cafe24/callback?code=auth_code_123&state=testmall:${csrfToken}`, {}, env);
    expect(resp.status).toBe(302);
    const location = resp.headers.get('Location')!;
    expect(location).toContain('/dashboard/shops/');
    expect(location).toContain('/setup');
  });
});

// ─── POST /api/cafe24/webhook ────────────────────────────────

describe('POST /api/cafe24/webhook', () => {
  it('returns 401 without signature header', async () => {
    const { app, env } = createTestApp();
    const resp = await app.request('/api/cafe24/webhook', {
      method: 'POST',
      body: '{}',
    }, env);
    expect(resp.status).toBe(401);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('missing_authentication');
  });

  // 90078 (앱 만료) — soft delete가 아니라 plan을 free로 다운그레이드
  it('handles app expired webhook (90078) — downgrades plan to free without soft-deleting', async () => {
    const { app, env, d1 } = createTestApp();

    const existingShop = { shop_id: 'shop_to_expire', client_id: 'bg_expiring' };
    const runSpy = vi.fn().mockResolvedValue({ success: true });
    d1.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(existingShop), // getShopByMallId
        run: runSpy,
      }),
    });

    const webhookBody = JSON.stringify({
      event_no: 90078,
      resource: { mall_id: 'testmall' },
    });

    const resp = await app.request('/api/cafe24/webhook', {
      method: 'POST',
      headers: {
        'X-Cafe24-Hmac-SHA256': 'valid_signature',
        'Content-Type': 'application/json',
      },
      body: webhookBody,
    }, env);

    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.ok).toBe(true);

    // batch 호출 — plan='free' + subscription status='expired'
    expect(d1._mockBatch).toHaveBeenCalledTimes(1);
    // softDeleteShop (UPDATE shops SET deleted_at = datetime('now')...)은 호출되지 않아야 함
    const prepareCalls = (d1.prepare as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0] as string);
    expect(prepareCalls.some((sql) => sql.includes("deleted_at = datetime('now')"))).toBe(false);
  });

  // 90002는 카페24 앱 라이프사이클 이벤트가 아니라 상품 이벤트이므로
  // 수신해도 우리 앱 상태가 바뀌면 안 된다 (ignored).
  it('ignores product event (90002) — must not soft-delete shop', async () => {
    const { app, env, d1 } = createTestApp();

    const existingShop = { shop_id: 'shop_should_stay', client_id: 'bg_stay' };
    d1.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(existingShop),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    });

    const webhookBody = JSON.stringify({
      event_no: 90002,
      resource: { mall_id: 'testmall', product_no: 13, product_code: 'P000000N' },
    });

    const resp = await app.request('/api/cafe24/webhook', {
      method: 'POST',
      headers: { 'X-Cafe24-Hmac-SHA256': 'valid_signature', 'Content-Type': 'application/json' },
      body: webhookBody,
    }, env);

    expect(resp.status).toBe(200);
    const prepareCalls = (d1.prepare as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0] as string);
    // soft delete UPDATE가 호출되면 안 됨
    expect(prepareCalls.some((sql) => sql.includes("UPDATE shops SET deleted_at = datetime('now')"))).toBe(false);
  });

  // 90077 (앱 삭제 신규) — soft delete
  it('handles app uninstall webhook (90077) — soft-deletes shop', async () => {
    const { app, env, d1 } = createTestApp();

    const existingShop = { shop_id: 'shop_to_delete_new', client_id: 'bg_new_uninstall' };
    d1.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(existingShop),
        run: vi.fn().mockResolvedValue({ success: true }),
      }),
    });

    const webhookBody = JSON.stringify({
      event_no: 90077,
      resource: { mall_id: 'testmall' },
    });

    const resp = await app.request('/api/cafe24/webhook', {
      method: 'POST',
      headers: { 'X-Cafe24-Hmac-SHA256': 'valid_signature', 'Content-Type': 'application/json' },
      body: webhookBody,
    }, env);

    expect(resp.status).toBe(200);
    const prepareCalls = (d1.prepare as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) => c[0] as string);
    expect(prepareCalls.some((sql) => sql.includes("UPDATE shops SET deleted_at = datetime('now')"))).toBe(true);
  });
});
