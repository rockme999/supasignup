/**
 * Tests for OAuth routes: /oauth/authorize, /oauth/token, /oauth/userinfo
 *
 * Uses mocked D1 and KV bindings to test the route logic without
 * actual Cloudflare infrastructure.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import oauthRoutes from './oauth';

// ─── Mock helpers ────────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, { value: string; expiration?: number }>();
  return {
    get: vi.fn(async (key: string) => store.get(key)?.value ?? null),
    put: vi.fn(async (key: string, value: string, opts?: { expirationTtl?: number }) => {
      store.set(key, { value, expiration: opts?.expirationTtl });
    }),
    delete: vi.fn(async (key: string) => { store.delete(key); }),
    _store: store,
  };
}

function createMockD1() {
  const mockFirst = vi.fn().mockResolvedValue(null);
  const mockRun = vi.fn().mockResolvedValue({ success: true });
  const mockBind = vi.fn().mockReturnValue({ first: mockFirst, run: mockRun, all: vi.fn() });
  return {
    prepare: vi.fn().mockReturnValue({ bind: mockBind, first: mockFirst, run: mockRun }),
    _mockFirst: mockFirst,
    _mockBind: mockBind,
  };
}

const TEST_SHOP = {
  shop_id: 'shop_001',
  mall_id: 'testmall',
  platform: 'cafe24',
  shop_name: '테스트샵',
  shop_url: 'https://testmall.cafe24.com',
  owner_id: 'owner_001',
  client_id: 'bg_test_client_id',
  client_secret: 'test_client_secret_hex',
  enabled_providers: '["google","kakao","naver","apple"]',
  platform_access_token: null,
  platform_refresh_token: null,
  allowed_redirect_uris: '["https://testmall.cafe24api.com/api/v2/oauth/callback"]',
  plan: 'free',
  sso_configured: 1,
  deleted_at: null,
  created_at: '2026-03-12',
  updated_at: '2026-03-12',
};

function createApp(overrides?: { mockFirst?: ReturnType<typeof vi.fn> }) {
  const kv = createMockKV();
  const d1 = createMockD1();

  if (overrides?.mockFirst) {
    d1._mockFirst = overrides.mockFirst;
    d1.prepare = vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({ first: overrides.mockFirst, run: vi.fn().mockResolvedValue({ success: true }) }),
      first: overrides.mockFirst,
      run: vi.fn(),
    });
  }

  const app = new Hono<{ Bindings: Env }>();
  app.route('/oauth', oauthRoutes);

  const env = {
    DB: d1 as unknown as D1Database,
    KV: kv as unknown as KVNamespace,
    BASE_URL: 'https://bg.suparain.kr',
    GOOGLE_CLIENT_ID: 'google_cid',
    GOOGLE_CLIENT_SECRET: 'google_cs',
    KAKAO_CLIENT_ID: 'kakao_cid',
    KAKAO_CLIENT_SECRET: 'kakao_cs',
    NAVER_CLIENT_ID: 'naver_cid',
    NAVER_CLIENT_SECRET: 'naver_cs',
    APPLE_CLIENT_ID: 'apple_cid',
    APPLE_TEAM_ID: 'apple_tid',
    APPLE_KEY_ID: 'apple_kid',
    APPLE_PRIVATE_KEY: 'apple_pk',
    CAFE24_CLIENT_ID: 'cafe24_cid',
    CAFE24_CLIENT_SECRET: 'cafe24_cs',
    ENCRYPTION_KEY: 'a'.repeat(64),
    JWT_SECRET: 'jwt_secret',
  } as Env;

  return { app, env, kv, d1 };
}

// ─── Tests ───────────────────────────────────────────────────

describe('GET /oauth/authorize', () => {
  it('returns 400 when missing parameters', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/oauth/authorize', {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('missing_parameters');
  });

  it('returns 400 for invalid provider', async () => {
    const mockFirst = vi.fn().mockResolvedValue(TEST_SHOP);
    const { app, env } = createApp({ mockFirst });
    const redirectUri = encodeURIComponent('https://testmall.cafe24api.com/api/v2/oauth/callback');
    const url = `/oauth/authorize?client_id=bg_test_client_id&redirect_uri=${redirectUri}&provider=invalid&state=s`;
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_provider');
  });

  it('returns 400 for unknown client_id', async () => {
    const mockFirst = vi.fn().mockResolvedValue(null);
    const { app, env } = createApp({ mockFirst });
    const url = '/oauth/authorize?client_id=unknown&redirect_uri=http://a.com&provider=google&state=s';
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 400 when redirect_uri not in whitelist', async () => {
    const mockFirst = vi.fn().mockResolvedValue(TEST_SHOP);
    const { app, env } = createApp({ mockFirst });
    const url = '/oauth/authorize?client_id=bg_test_client_id&redirect_uri=https://evil.com/callback&provider=google&state=s';
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_redirect_uri');
  });

  it('returns 400 when provider is disabled', async () => {
    const shopWithLimitedProviders = {
      ...TEST_SHOP,
      enabled_providers: '["kakao"]',
    };
    const mockFirst = vi.fn().mockResolvedValue(shopWithLimitedProviders);
    const { app, env } = createApp({ mockFirst });
    const redirectUri = encodeURIComponent('https://testmall.cafe24api.com/api/v2/oauth/callback');
    const url = `/oauth/authorize?client_id=bg_test_client_id&redirect_uri=${redirectUri}&provider=google&state=s`;
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('provider_disabled');
  });

  it('redirects to Google OAuth on valid request', async () => {
    // Mock: first call returns shop, second call for billing returns count 0
    const mockFirst = vi.fn()
      .mockResolvedValueOnce(TEST_SHOP) // getShopByClientId
      .mockResolvedValueOnce({ cnt: 0 }); // getMonthlySignupCount

    const { app, env, kv } = createApp({ mockFirst });
    const redirectUri = encodeURIComponent('https://testmall.cafe24api.com/api/v2/oauth/callback');
    const url = `/oauth/authorize?client_id=bg_test_client_id&redirect_uri=${redirectUri}&provider=google&state=cafe24_state_abc`;
    const resp = await app.request(url, {}, env);

    expect(resp.status).toBe(302);
    const location = resp.headers.get('Location')!;
    expect(location).toContain('accounts.google.com');
    expect(location).toContain('code_challenge=');
    expect(location).toContain('code_challenge_method=S256');

    // Verify KV was called to store session and PKCE
    expect(kv.put).toHaveBeenCalledTimes(2);
    const sessionCall = kv.put.mock.calls.find((c: unknown[]) => (c[0] as string).startsWith('oauth_session:'));
    const pkceCall = kv.put.mock.calls.find((c: unknown[]) => (c[0] as string).startsWith('pkce:'));
    expect(sessionCall).toBeDefined();
    expect(pkceCall).toBeDefined();

    // Verify session contains correct data
    const sessionData = JSON.parse(sessionCall![1]);
    expect(sessionData.shop_id).toBe('shop_001');
    expect(sessionData.cafe24_state).toBe('cafe24_state_abc');
    expect(sessionData.provider).toBe('google');
  });

  it('returns 403 when free plan limit exceeded', async () => {
    const freeShop = { ...TEST_SHOP, plan: 'free' };
    const mockFirst = vi.fn()
      .mockResolvedValueOnce(freeShop) // getShopByClientId
      .mockResolvedValueOnce({ cnt: 100 }); // getMonthlySignupCount = 100

    const { app, env } = createApp({ mockFirst });
    const redirectUri = encodeURIComponent('https://testmall.cafe24api.com/api/v2/oauth/callback');
    const url = `/oauth/authorize?client_id=bg_test_client_id&redirect_uri=${redirectUri}&provider=google&state=s`;
    const resp = await app.request(url, {}, env);
    expect(resp.status).toBe(403);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('limit_exceeded');
  });
});

describe('POST /oauth/token', () => {
  it('returns 400 when missing parameters', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=authorization_code',
    }, env);
    expect(resp.status).toBe(400);
  });

  it('returns 401 for invalid client_secret', async () => {
    const mockFirst = vi.fn().mockResolvedValueOnce(TEST_SHOP);
    const { app, env } = createApp({ mockFirst });
    const resp = await app.request('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=authorization_code&code=abc&client_id=bg_test_client_id&client_secret=wrong_secret',
    }, env);
    expect(resp.status).toBe(401);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_client');
  });

  it('returns 400 for expired/used auth_code', async () => {
    const mockFirst = vi.fn().mockResolvedValueOnce(TEST_SHOP);
    const { app, env, kv } = createApp({ mockFirst });
    // KV returns null for auth_code (expired)
    const resp = await app.request('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&code=expired_code&client_id=bg_test_client_id&client_secret=test_client_secret_hex`,
    }, env);
    expect(resp.status).toBe(400);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_grant');
  });

  it('returns access_token for valid auth_code', async () => {
    const mockFirst = vi.fn().mockResolvedValueOnce(TEST_SHOP);
    const { app, env, kv } = createApp({ mockFirst });

    // Pre-populate KV with auth_code
    const authCodeData = JSON.stringify({ user_id: 'user_001', shop_id: 'shop_001' });
    await kv.put('auth_code:valid_code', authCodeData, { expirationTtl: 300 });

    const resp = await app.request('/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=authorization_code&code=valid_code&client_id=bg_test_client_id&client_secret=test_client_secret_hex`,
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.access_token).toBeDefined();
    expect(typeof body.access_token).toBe('string');
    expect(body.token_type).toBe('Bearer');
    expect(body.expires_in).toBe(7200);

    // Verify auth_code was deleted (one-time use)
    expect(kv.delete).toHaveBeenCalledWith('auth_code:valid_code');

    // Verify access_token was stored in KV
    const atCall = kv.put.mock.calls.find((c: unknown[]) => (c[0] as string).startsWith('access_token:'));
    expect(atCall).toBeDefined();
  });
});

describe('GET /oauth/userinfo', () => {
  it('returns 401 without Authorization header', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/oauth/userinfo', {}, env);
    expect(resp.status).toBe(401);
  });

  it('returns 401 for expired token', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/oauth/userinfo', {
      headers: { Authorization: 'Bearer expired_token' },
    }, env);
    expect(resp.status).toBe(401);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.error).toBe('invalid_token');
  });

  it('returns user info for valid token', async () => {
    const encryptionKey = 'a'.repeat(64);

    // Import encrypt to prepare test data
    const { encrypt } = await import('@supasignup/bg-core');
    const encryptedEmail = await encrypt('test@example.com', encryptionKey);
    const encryptedName = await encrypt('홍길동', encryptionKey);

    const mockUser = {
      user_id: 'user_001',
      provider: 'google',
      provider_uid: 'g_123',
      email: encryptedEmail,
      email_hash: 'abc123',
      name: encryptedName,
      profile_image: 'https://example.com/photo.jpg',
      raw_data: null,
      created_at: '2026-03-12',
      updated_at: '2026-03-12',
    };

    const mockFirst = vi.fn().mockResolvedValue(mockUser);
    const { app, env, kv } = createApp({ mockFirst });

    // Pre-populate KV with access_token
    const tokenData = JSON.stringify({ user_id: 'user_001', shop_id: 'shop_001' });
    await kv.put('access_token:valid_at', tokenData);

    const resp = await app.request('/oauth/userinfo', {
      headers: { Authorization: 'Bearer valid_at' },
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.id).toBe('user_001');
    expect(body.email).toBe('test@example.com');
    expect(body.name).toBe('홍길동');
    expect(body.profile_image).toBe('https://example.com/photo.jpg');
    expect(body.provider).toBe('google');
  });
});

describe('POST /oauth/userinfo (Cafe24 SSO compatibility)', () => {
  it('returns user info when access_token is in POST body', async () => {
    const encryptionKey = 'a'.repeat(64);
    const { encrypt } = await import('@supasignup/bg-core');
    const encryptedEmail = await encrypt('post@example.com', encryptionKey);
    const encryptedName = await encrypt('김철수', encryptionKey);

    const mockUser = {
      user_id: 'user_002',
      provider: 'kakao',
      provider_uid: 'k_456',
      email: encryptedEmail,
      email_hash: 'def456',
      name: encryptedName,
      profile_image: null,
      raw_data: null,
      created_at: '2026-03-13',
      updated_at: '2026-03-13',
    };

    const mockFirst = vi.fn().mockResolvedValue(mockUser);
    const { app, env, kv } = createApp({ mockFirst });

    const tokenData = JSON.stringify({ user_id: 'user_002', shop_id: 'shop_001' });
    await kv.put('access_token:post_token', tokenData);

    const resp = await app.request('/oauth/userinfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'access_token=post_token',
    }, env);
    expect(resp.status).toBe(200);
    const body = await resp.json() as Record<string, unknown>;
    expect(body.id).toBe('user_002');
    expect(body.email).toBe('post@example.com');
    expect(body.name).toBe('김철수');
  });

  it('returns 401 when no access_token in POST body', async () => {
    const { app, env } = createApp();
    const resp = await app.request('/oauth/userinfo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: '',
    }, env);
    expect(resp.status).toBe(401);
  });
});
