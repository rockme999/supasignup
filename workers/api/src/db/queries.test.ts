/**
 * DB queries unit tests with mocked D1.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getShopByClientId,
  getShopById,
  getShopByMallId,
  createShop,
  updateShop,
  softDeleteShop,
  upsertUser,
  getShopUser,
  createShopUser,
  getMonthlySignupCount,
  isOverFreeLimit,
  recordStat,
  getUserById,
} from './queries';
import type { Shop, OAuthUserInfo } from '@supasignup/bg-core';

// ─── D1 Mock ─────────────────────────────────────────────────

interface MockD1 {
  prepare: ReturnType<typeof vi.fn>;
  _queries: string[];
  _binds: unknown[][];
  _firstResult: unknown;
  _setFirstResult: (val: unknown) => void;
  _setFirstSequence: (vals: unknown[]) => void;
}

function createMockD1(): MockD1 {
  const queries: string[] = [];
  const binds: unknown[][] = [];
  let firstResult: unknown = null;
  let firstSequence: unknown[] | null = null;
  let callIndex = 0;

  const mockRun = vi.fn().mockResolvedValue({ success: true, meta: {} });
  const mockFirst = vi.fn().mockImplementation(async () => {
    if (firstSequence) {
      const val = firstSequence[callIndex] ?? null;
      callIndex++;
      return val;
    }
    return firstResult;
  });

  const mockBind = vi.fn().mockImplementation((...args: unknown[]) => {
    binds.push(args);
    return { first: mockFirst, run: mockRun, all: vi.fn() };
  });

  const mockPrepare = vi.fn().mockImplementation((sql: string) => {
    queries.push(sql);
    return { bind: mockBind, first: mockFirst, run: mockRun };
  });

  return {
    prepare: mockPrepare,
    _queries: queries,
    _binds: binds,
    _firstResult: firstResult,
    _setFirstResult: (val: unknown) => { firstResult = val; },
    _setFirstSequence: (vals: unknown[]) => { firstSequence = vals; callIndex = 0; },
  };
}

const ENCRYPTION_KEY = 'a'.repeat(64);

const TEST_SHOP: Shop = {
  shop_id: 'shop_001',
  mall_id: 'testmall',
  platform: 'cafe24',
  shop_name: '테스트샵',
  shop_url: 'https://testmall.cafe24.com',
  owner_id: 'owner_001',
  client_id: 'bg_abc123',
  client_secret: 'secret_xyz',
  enabled_providers: '["google","kakao"]',
  platform_access_token: null,
  platform_refresh_token: null,
  allowed_redirect_uris: '["https://testmall.cafe24api.com/api/v2/oauth/callback"]',
  plan: 'free',
  sso_configured: 1,
  widget_style: null,
  deleted_at: null,
  created_at: '2026-03-12',
  updated_at: '2026-03-12',
};

// ─── Shop queries ────────────────────────────────────────────

describe('getShopByClientId', () => {
  it('queries with correct SQL and client_id', async () => {
    const db = createMockD1();
    db._setFirstResult(TEST_SHOP);
    const result = await getShopByClientId(db as unknown as D1Database, 'bg_abc123');
    expect(result).toEqual(TEST_SHOP);
    expect(db._queries[0]).toContain('client_id');
    expect(db._queries[0]).toContain('deleted_at IS NULL');
    expect(db._binds[0][0]).toBe('bg_abc123');
  });

  it('returns null when not found', async () => {
    const db = createMockD1();
    db._setFirstResult(null);
    const result = await getShopByClientId(db as unknown as D1Database, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('getShopById', () => {
  it('filters by shop_id and excludes deleted', async () => {
    const db = createMockD1();
    db._setFirstResult(TEST_SHOP);
    const result = await getShopById(db as unknown as D1Database, 'shop_001');
    expect(result).toEqual(TEST_SHOP);
    expect(db._queries[0]).toContain('shop_id');
    expect(db._queries[0]).toContain('deleted_at IS NULL');
  });
});

describe('getShopByMallId', () => {
  it('queries by mall_id and platform', async () => {
    const db = createMockD1();
    db._setFirstResult(TEST_SHOP);
    const result = await getShopByMallId(db as unknown as D1Database, 'testmall', 'cafe24');
    expect(result).toEqual(TEST_SHOP);
    expect(db._binds[0]).toEqual(['testmall', 'cafe24']);
  });
});

describe('createShop', () => {
  it('generates client_id with bg_ prefix and client_secret', async () => {
    const db = createMockD1();
    // First call: INSERT, second call: getShopById (SELECT)
    db._setFirstSequence([null, TEST_SHOP]);

    const result = await createShop(db as unknown as D1Database, {
      mall_id: 'newmall',
      platform: 'cafe24',
      shop_name: '새 쇼핑몰',
      owner_id: 'owner_001',
    });

    // Verify INSERT was called
    expect(db._queries[0]).toContain('INSERT INTO shops');
    // Verify client_id starts with bg_
    const insertBinds = db._binds[0];
    expect(insertBinds[6]).toMatch(/^bg_/); // client_id
    expect(typeof insertBinds[7]).toBe('string'); // client_secret
    expect((insertBinds[7] as string).length).toBe(64); // 32 bytes hex
  });

  it('uses default providers when not specified', async () => {
    const db = createMockD1();
    db._setFirstSequence([null, TEST_SHOP]);

    await createShop(db as unknown as D1Database, {
      mall_id: 'newmall',
      platform: 'cafe24',
      owner_id: 'owner_001',
    });

    const insertBinds = db._binds[0];
    const providers = JSON.parse(insertBinds[8] as string);
    expect(providers).toEqual(['google', 'kakao', 'naver', 'apple']);
  });
});

describe('updateShop', () => {
  it('builds correct SET clause', async () => {
    const db = createMockD1();
    await updateShop(db as unknown as D1Database, 'shop_001', {
      shop_name: '변경된 이름',
      sso_configured: 1,
    });

    expect(db._queries[0]).toContain('UPDATE shops SET');
    expect(db._queries[0]).toContain('shop_name = ?');
    expect(db._queries[0]).toContain('sso_configured = ?');
    expect(db._queries[0]).toContain("updated_at = datetime('now')");
  });

  it('does nothing when no data provided', async () => {
    const db = createMockD1();
    await updateShop(db as unknown as D1Database, 'shop_001', {});
    expect(db._queries.length).toBe(0);
  });
});

describe('softDeleteShop', () => {
  it('sets deleted_at and updated_at', async () => {
    const db = createMockD1();
    await softDeleteShop(db as unknown as D1Database, 'shop_001');
    expect(db._queries[0]).toContain('deleted_at');
    expect(db._queries[0]).toContain("datetime('now')");
    expect(db._binds[0][0]).toBe('shop_001');
  });
});

// ─── User queries ────────────────────────────────────────────

describe('upsertUser', () => {
  const testUserInfo: OAuthUserInfo = {
    provider: 'google',
    providerUid: 'g_12345',
    email: 'test@example.com',
    name: '홍길동',
    profileImage: 'https://example.com/photo.jpg',
    rawData: { id: 'g_12345', email: 'test@example.com' },
  };

  it('inserts new user with encrypted PII', async () => {
    const db = createMockD1();
    const newUser = {
      user_id: 'user_new',
      provider: 'google',
      provider_uid: 'g_12345',
      email: 'ENCRYPTED',
      email_hash: 'HASH',
      name: 'ENCRYPTED',
      profile_image: 'https://example.com/photo.jpg',
    };
    // 1st: SELECT by provider → null (no existing provider match)
    // 2nd: SELECT by email_hash → null (no existing email match, account linking skip)
    // 3rd: INSERT user → null (run returns no first)
    // 4th: INSERT user_providers → null
    // 5th: SELECT inserted user → newUser
    db._setFirstSequence([null, null, null, null, newUser]);

    const result = await upsertUser(db as unknown as D1Database, testUserInfo, ENCRYPTION_KEY);

    // Verify SELECT by provider then SELECT by email_hash then INSERT was called
    expect(db._queries[0]).toContain('SELECT * FROM users WHERE provider');
    expect(db._queries[1]).toContain('SELECT * FROM users WHERE email_hash');
    const insertQueryIdx = db._queries.findIndex(q => q.includes('INSERT INTO users'));
    expect(insertQueryIdx).toBeGreaterThan(-1);

    // Verify encrypted values are not plaintext
    const insertBinds = db._binds[insertQueryIdx];
    expect(insertBinds[3]).not.toBe('test@example.com'); // email is encrypted
    expect(insertBinds[5]).not.toBe('홍길동'); // name is encrypted
    // email_hash should be a hex string (SHA-256)
    expect(insertBinds[4]).toMatch(/^[a-f0-9]{64}$/);
  });

  it('updates existing user', async () => {
    const db = createMockD1();
    const existingUser = {
      user_id: 'user_existing',
      provider: 'google',
      provider_uid: 'g_12345',
    };
    const updatedUser = { ...existingUser, email: 'ENCRYPTED', name: 'ENCRYPTED' };
    // 1st: SELECT by provider → found
    // 2nd: UPDATE (run, no first needed)
    // 3rd: INSERT OR IGNORE user_providers (run)
    // 4th: SELECT updated user → updatedUser
    db._setFirstSequence([existingUser, null, null, updatedUser]);

    const result = await upsertUser(db as unknown as D1Database, testUserInfo, ENCRYPTION_KEY);

    const updateQueryIdx = db._queries.findIndex(q => q.includes('UPDATE users SET'));
    expect(updateQueryIdx).toBeGreaterThan(-1);
    expect(db._queries[updateQueryIdx]).toContain('email = ?');
    expect(db._queries[updateQueryIdx]).toContain('email_hash = ?');
  });

  it('generates consistent email_hash for same email', async () => {
    const db1 = createMockD1();
    db1._setFirstSequence([null, null, null, null, { user_id: 'u1' }]);
    await upsertUser(db1 as unknown as D1Database, testUserInfo, ENCRYPTION_KEY);

    const db2 = createMockD1();
    db2._setFirstSequence([null, null, null, null, { user_id: 'u2' }]);
    await upsertUser(db2 as unknown as D1Database, testUserInfo, ENCRYPTION_KEY);

    // email_hash should be the same for same email
    const insertIdx1 = db1._queries.findIndex(q => q.includes('INSERT INTO users'));
    const insertIdx2 = db2._queries.findIndex(q => q.includes('INSERT INTO users'));
    const hash1 = db1._binds[insertIdx1][4];
    const hash2 = db2._binds[insertIdx2][4];
    expect(hash1).toBe(hash2);
  });

  it('handles null email and name', async () => {
    const db = createMockD1();
    // 1st: SELECT by provider → null
    // email is null so no email_hash lookup
    // 2nd: INSERT user (run)
    // 3rd: INSERT user_providers (run)
    // 4th: SELECT inserted → { user_id: 'u1' }
    db._setFirstSequence([null, null, null, { user_id: 'u1' }]);

    await upsertUser(db as unknown as D1Database, {
      provider: 'apple',
      providerUid: 'apple_123',
      rawData: { sub: 'apple_123' },
    }, ENCRYPTION_KEY);

    const insertQueryIdx = db._queries.findIndex(q => q.includes('INSERT INTO users'));
    const insertBinds = db._binds[insertQueryIdx];
    expect(insertBinds[3]).toBeNull(); // email
    expect(insertBinds[4]).toBeNull(); // email_hash
    expect(insertBinds[5]).toBeNull(); // name
  });
});

describe('getUserById', () => {
  it('queries by user_id', async () => {
    const db = createMockD1();
    const mockUser = { user_id: 'user_001', provider: 'google' };
    db._setFirstResult(mockUser);
    const result = await getUserById(db as unknown as D1Database, 'user_001');
    expect(result).toEqual(mockUser);
    expect(db._binds[0][0]).toBe('user_001');
  });
});

// ─── ShopUser queries ────────────────────────────────────────

describe('getShopUser', () => {
  it('queries by shop_id and user_id', async () => {
    const db = createMockD1();
    db._setFirstResult({ id: 'su_001', shop_id: 'shop_001', user_id: 'user_001' });
    const result = await getShopUser(db as unknown as D1Database, 'shop_001', 'user_001');
    expect(result).toBeDefined();
    expect(db._binds[0]).toEqual(['shop_001', 'user_001']);
  });

  it('returns null when not found', async () => {
    const db = createMockD1();
    db._setFirstResult(null);
    const result = await getShopUser(db as unknown as D1Database, 'shop_001', 'user_new');
    expect(result).toBeNull();
  });
});

describe('createShopUser', () => {
  it('inserts new shop_user with generated id', async () => {
    const db = createMockD1();
    const newShopUser = { id: 'su_new', shop_id: 'shop_001', user_id: 'user_001', status: 'active' };
    db._setFirstSequence([null, newShopUser]);

    const result = await createShopUser(db as unknown as D1Database, 'shop_001', 'user_001');
    expect(db._queries[0]).toContain('INSERT INTO shop_users');
    expect(db._binds[0][1]).toBe('shop_001');
    expect(db._binds[0][2]).toBe('user_001');
  });
});

// ─── Billing ─────────────────────────────────────────────────

describe('getMonthlySignupCount', () => {
  it('counts signups for current month', async () => {
    const db = createMockD1();
    db._setFirstResult({ cnt: 42 });
    const count = await getMonthlySignupCount(db as unknown as D1Database, 'shop_001');
    expect(count).toBe(42);
    expect(db._queries[0]).toContain("action = 'signup'");
    expect(db._binds[0][0]).toBe('shop_001');
  });

  it('returns 0 when no signups', async () => {
    const db = createMockD1();
    db._setFirstResult({ cnt: 0 });
    const count = await getMonthlySignupCount(db as unknown as D1Database, 'shop_001');
    expect(count).toBe(0);
  });
});

describe('isOverFreeLimit', () => {
  it('returns false for paid plan', async () => {
    const db = createMockD1();
    const paidShop = { ...TEST_SHOP, plan: 'monthly' as const };
    const result = await isOverFreeLimit(db as unknown as D1Database, paidShop);
    expect(result).toBe(false);
    // Should not even query the DB
    expect(db._queries.length).toBe(0);
  });

  it('returns false when under limit', async () => {
    const db = createMockD1();
    db._setFirstResult({ cnt: 99 });
    const result = await isOverFreeLimit(db as unknown as D1Database, TEST_SHOP);
    expect(result).toBe(false);
  });

  it('returns true when at limit', async () => {
    const db = createMockD1();
    db._setFirstResult({ cnt: 100 });
    const result = await isOverFreeLimit(db as unknown as D1Database, TEST_SHOP);
    expect(result).toBe(true);
  });

  it('returns true when over limit', async () => {
    const db = createMockD1();
    db._setFirstResult({ cnt: 150 });
    const result = await isOverFreeLimit(db as unknown as D1Database, TEST_SHOP);
    expect(result).toBe(true);
  });
});

// ─── Statistics ──────────────────────────────────────────────

describe('recordStat', () => {
  it('inserts login_stats with correct fields', async () => {
    const db = createMockD1();
    await recordStat(db as unknown as D1Database, 'shop_001', 'user_001', 'google', 'signup');
    expect(db._queries[0]).toContain('INSERT INTO login_stats');
    const binds = db._binds[0];
    expect(binds[1]).toBe('shop_001');
    expect(binds[2]).toBe('user_001');
    expect(binds[3]).toBe('google');
    expect(binds[4]).toBe('signup');
  });

  it('records login action correctly', async () => {
    const db = createMockD1();
    await recordStat(db as unknown as D1Database, 'shop_001', 'user_001', 'kakao', 'login');
    const binds = db._binds[0];
    expect(binds[3]).toBe('kakao');
    expect(binds[4]).toBe('login');
  });
});
