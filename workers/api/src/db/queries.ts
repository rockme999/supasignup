/**
 * D1 query functions for 번개가입.
 */

import {
  type Shop,
  type User,
  type ShopUser,
  type LoginStat,
  type OAuthUserInfo,
  generateId,
  generateSecret,
  encrypt,
  sha256,
  FREE_PLAN_MONTHLY_LIMIT,
} from '@supasignup/bg-core';

// ─── Shop queries ────────────────────────────────────────────

export async function getShopByClientId(
  db: D1Database,
  clientId: string,
): Promise<Shop | null> {
  return db
    .prepare('SELECT * FROM shops WHERE client_id = ? AND deleted_at IS NULL')
    .bind(clientId)
    .first<Shop>();
}

export async function getShopById(
  db: D1Database,
  shopId: string,
): Promise<Shop | null> {
  return db
    .prepare('SELECT * FROM shops WHERE shop_id = ? AND deleted_at IS NULL')
    .bind(shopId)
    .first<Shop>();
}

export async function getShopByMallId(
  db: D1Database,
  mallId: string,
  platform: string,
): Promise<Shop | null> {
  return db
    .prepare('SELECT * FROM shops WHERE mall_id = ? AND platform = ? AND deleted_at IS NULL')
    .bind(mallId, platform)
    .first<Shop>();
}

export async function createShop(
  db: D1Database,
  data: {
    mall_id: string;
    platform: Shop['platform'];
    shop_name?: string;
    shop_url?: string;
    owner_id: string;
    allowed_redirect_uris?: string[];
    enabled_providers?: string[];
    platform_access_token?: string;
    platform_refresh_token?: string;
  },
): Promise<Shop> {
  const shopId = generateId();
  const clientId = `bg_${generateSecret(16)}`;
  const clientSecret = generateSecret(32);

  await db
    .prepare(
      `INSERT INTO shops (shop_id, mall_id, platform, shop_name, shop_url, owner_id,
        client_id, client_secret, enabled_providers, allowed_redirect_uris,
        platform_access_token, platform_refresh_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      shopId,
      data.mall_id,
      data.platform,
      data.shop_name ?? null,
      data.shop_url ?? null,
      data.owner_id,
      clientId,
      clientSecret,
      JSON.stringify(data.enabled_providers ?? ['google', 'kakao', 'naver', 'apple']),
      data.allowed_redirect_uris ? JSON.stringify(data.allowed_redirect_uris) : null,
      data.platform_access_token ?? null,
      data.platform_refresh_token ?? null,
    )
    .run();

  return (await getShopById(db, shopId))!;
}

const ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'shop_name',
  'shop_url',
  'enabled_providers',
  'allowed_redirect_uris',
  'plan',
  'sso_configured',
  'platform_access_token',
  'platform_refresh_token',
]);

export async function updateShop(
  db: D1Database,
  shopId: string,
  data: Partial<Pick<Shop, 'shop_name' | 'shop_url' | 'enabled_providers' | 'allowed_redirect_uris' | 'plan' | 'sso_configured' | 'platform_access_token' | 'platform_refresh_token'>>,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (!ALLOWED_UPDATE_COLUMNS.has(key)) continue;
    sets.push(`${key} = ?`);
    values.push(value);
  }

  if (sets.length === 0) return;

  sets.push("updated_at = datetime('now')");
  values.push(shopId);

  await db
    .prepare(`UPDATE shops SET ${sets.join(', ')} WHERE shop_id = ?`)
    .bind(...values)
    .run();
}

export async function softDeleteShop(
  db: D1Database,
  shopId: string,
): Promise<void> {
  await db
    .prepare("UPDATE shops SET deleted_at = datetime('now'), updated_at = datetime('now') WHERE shop_id = ?")
    .bind(shopId)
    .run();
}

// ─── User queries (PII encrypted) ───────────────────────────

export async function upsertUser(
  db: D1Database,
  userInfo: OAuthUserInfo,
  encryptionKey: string,
): Promise<User> {
  const existing = await db
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_uid = ?')
    .bind(userInfo.provider, userInfo.providerUid)
    .first<User>();

  const encryptedEmail = userInfo.email
    ? await encrypt(userInfo.email, encryptionKey)
    : null;
  const emailHash = userInfo.email
    ? await sha256(userInfo.email.toLowerCase())
    : null;
  const encryptedName = userInfo.name
    ? await encrypt(userInfo.name, encryptionKey)
    : null;
  const encryptedRawData = await encrypt(
    JSON.stringify(userInfo.rawData),
    encryptionKey,
  );

  if (existing) {
    await db
      .prepare(
        `UPDATE users SET email = ?, email_hash = ?, name = ?, profile_image = ?,
         raw_data = ?, updated_at = datetime('now')
         WHERE user_id = ?`,
      )
      .bind(
        encryptedEmail,
        emailHash,
        encryptedName,
        userInfo.profileImage ?? null,
        encryptedRawData,
        existing.user_id,
      )
      .run();

    return (await db
      .prepare('SELECT * FROM users WHERE user_id = ?')
      .bind(existing.user_id)
      .first<User>())!;
  }

  const userId = generateId();
  await db
    .prepare(
      `INSERT INTO users (user_id, provider, provider_uid, email, email_hash, name, profile_image, raw_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      userId,
      userInfo.provider,
      userInfo.providerUid,
      encryptedEmail,
      emailHash,
      encryptedName,
      userInfo.profileImage ?? null,
      encryptedRawData,
    )
    .run();

  return (await db
    .prepare('SELECT * FROM users WHERE user_id = ?')
    .bind(userId)
    .first<User>())!;
}

export async function getUserById(
  db: D1Database,
  userId: string,
): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE user_id = ?')
    .bind(userId)
    .first<User>();
}

// ─── ShopUser queries ────────────────────────────────────────

export async function getShopUser(
  db: D1Database,
  shopId: string,
  userId: string,
): Promise<ShopUser | null> {
  return db
    .prepare('SELECT * FROM shop_users WHERE shop_id = ? AND user_id = ?')
    .bind(shopId, userId)
    .first<ShopUser>();
}

export async function createShopUser(
  db: D1Database,
  shopId: string,
  userId: string,
): Promise<ShopUser> {
  const id = generateId();
  await db
    .prepare('INSERT INTO shop_users (id, shop_id, user_id) VALUES (?, ?, ?)')
    .bind(id, shopId, userId)
    .run();

  return (await db
    .prepare('SELECT * FROM shop_users WHERE id = ?')
    .bind(id)
    .first<ShopUser>())!;
}

// ─── Billing / monthly count ─────────────────────────────────

export async function getMonthlySignupCount(
  db: D1Database,
  shopId: string,
): Promise<number> {
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const result = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       AND created_at >= ? AND created_at < ?`,
    )
    .bind(shopId, `${yearMonth}-01`, `${yearMonth}-32`)
    .first<{ cnt: number }>();

  return result?.cnt ?? 0;
}

export async function isOverFreeLimit(
  db: D1Database,
  shop: Shop,
): Promise<boolean> {
  if (shop.plan !== 'free') return false;
  const count = await getMonthlySignupCount(db, shop.shop_id);
  return count >= FREE_PLAN_MONTHLY_LIMIT;
}

// ─── Statistics ──────────────────────────────────────────────

export async function recordStat(
  db: D1Database,
  shopId: string,
  userId: string,
  provider: string,
  action: 'signup' | 'login',
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO login_stats (id, shop_id, user_id, provider, action) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(generateId(), shopId, userId, provider, action)
    .run();
}
