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
  decrypt,
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
  encryptionKey?: string,
): Promise<Shop> {
  const shopId = generateId();
  const clientId = `bg_${generateSecret(16)}`;
  const clientSecret = generateSecret(32);

  // 플랫폼 토큰은 AES-256-GCM으로 암호화하여 저장
  const encryptedAccessToken = data.platform_access_token && encryptionKey
    ? await encrypt(data.platform_access_token, encryptionKey)
    : data.platform_access_token ?? null;
  const encryptedRefreshToken = data.platform_refresh_token && encryptionKey
    ? await encrypt(data.platform_refresh_token, encryptionKey)
    : data.platform_refresh_token ?? null;

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
      encryptedAccessToken,
      encryptedRefreshToken,
    )
    .run();

  return (await getShopById(db, shopId))!;
}

/**
 * Decrypt platform tokens stored in a shop record.
 * Returns a copy of the shop with decrypted token values.
 */
export async function decryptShopTokens(
  shop: Shop,
  encryptionKey: string,
): Promise<{ access_token: string | null; refresh_token: string | null }> {
  const access_token = shop.platform_access_token
    ? await decrypt(shop.platform_access_token, encryptionKey)
    : null;
  const refresh_token = shop.platform_refresh_token
    ? await decrypt(shop.platform_refresh_token, encryptionKey)
    : null;
  return { access_token, refresh_token };
}

const ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'shop_name',
  'shop_url',
  'enabled_providers',
  'allowed_redirect_uris',
  'plan',
  'sso_configured',
  'widget_style',
  'coupon_config',
  'platform_access_token',
  'platform_refresh_token',
  'shop_identity',
  'banner_config',
]);

export async function updateShop(
  db: D1Database,
  shopId: string,
  data: Partial<Pick<Shop, 'shop_name' | 'shop_url' | 'enabled_providers' | 'allowed_redirect_uris' | 'plan' | 'sso_configured' | 'widget_style' | 'coupon_config' | 'platform_access_token' | 'platform_refresh_token' | 'shop_identity' | 'banner_config'>>,
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

export async function getUserByEmailHash(
  db: D1Database,
  emailHash: string,
): Promise<User | null> {
  return db
    .prepare('SELECT * FROM users WHERE email_hash = ?')
    .bind(emailHash)
    .first<User>();
}

export async function getUserProviders(
  db: D1Database,
  userId: string,
): Promise<Array<{ provider: string; provider_uid: string; linked_at: string }>> {
  const result = await db
    .prepare('SELECT provider, provider_uid, linked_at FROM user_providers WHERE user_id = ?')
    .bind(userId)
    .all();
  return (result.results ?? []) as Array<{ provider: string; provider_uid: string; linked_at: string }>;
}

export async function addUserProvider(
  db: D1Database,
  userId: string,
  provider: string,
  providerUid: string,
): Promise<void> {
  await db
    .prepare('INSERT OR IGNORE INTO user_providers (id, user_id, provider, provider_uid) VALUES (?, ?, ?, ?)')
    .bind(generateId(), userId, provider, providerUid)
    .run();
}

export async function upsertUser(
  db: D1Database,
  userInfo: OAuthUserInfo,
  encryptionKey: string,
): Promise<User> {
  // Prepare encrypted/hashed PII (전체 병렬 처리)
  const [encryptedEmail, emailHash, encryptedName, encryptedRawData, encryptedPhone, encryptedBirthday] = await Promise.all([
    userInfo.email ? encrypt(userInfo.email, encryptionKey) : null,
    userInfo.email ? sha256(userInfo.email.toLowerCase()) : null,
    userInfo.name ? encrypt(userInfo.name, encryptionKey) : null,
    encrypt(JSON.stringify(userInfo.rawData), encryptionKey),
    userInfo.phone ? encrypt(userInfo.phone, encryptionKey) : null,
    userInfo.birthday ? encrypt(userInfo.birthday, encryptionKey) : null,
  ]);
  const gender = userInfo.gender ?? null;

  // 1. Look up by provider + provider_uid (same provider, same account)
  const existingByProvider = await db
    .prepare('SELECT * FROM users WHERE provider = ? AND provider_uid = ?')
    .bind(userInfo.provider, userInfo.providerUid)
    .first<User>();

  if (existingByProvider) {
    // Update existing user (RETURNING * eliminates extra SELECT)
    const updated = await db
      .prepare(
        `UPDATE users SET email = ?, email_hash = ?, name = ?, profile_image = ?,
         raw_data = ?, phone = ?, birthday = ?, gender = ?, updated_at = datetime('now')
         WHERE user_id = ? RETURNING *`,
      )
      .bind(
        encryptedEmail,
        emailHash,
        encryptedName,
        userInfo.profileImage ?? null,
        encryptedRawData,
        encryptedPhone,
        encryptedBirthday,
        gender,
        existingByProvider.user_id,
      )
      .first<User>();

    await addUserProvider(db, existingByProvider.user_id, userInfo.provider, userInfo.providerUid);

    return updated!;
  }

  // 2. Account linking: look up by email_hash (same email, different provider)
  if (emailHash) {
    const existingByEmail = await getUserByEmailHash(db, emailHash);
    if (existingByEmail) {
      // Link new provider to existing user (auto-linking)
      await addUserProvider(db, existingByEmail.user_id, userInfo.provider, userInfo.providerUid);

      // Update user info with latest data from new provider (RETURNING * eliminates extra SELECT)
      const updated = await db
        .prepare(
          `UPDATE users SET email = ?, email_hash = ?, name = ?, profile_image = ?,
           raw_data = ?, phone = ?, birthday = ?, gender = ?, updated_at = datetime('now')
           WHERE user_id = ? RETURNING *`,
        )
        .bind(
          encryptedEmail,
          emailHash,
          encryptedName,
          userInfo.profileImage ?? null,
          encryptedRawData,
          encryptedPhone,
          encryptedBirthday,
          gender,
          existingByEmail.user_id,
        )
        .first<User>();

      return updated!;
    }
  }

  // 3. Create new user (RETURNING * eliminates extra SELECT)
  const userId = generateId();
  const newUser = await db
    .prepare(
      `INSERT INTO users (user_id, provider, provider_uid, email, email_hash, name, profile_image, raw_data, phone, birthday, gender)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
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
      encryptedPhone,
      encryptedBirthday,
      gender,
    )
    .first<User>();

  await addUserProvider(db, userId, userInfo.provider, userInfo.providerUid);

  return newUser!;
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
  const shopUser = await db
    .prepare('INSERT INTO shop_users (id, shop_id, user_id) VALUES (?, ?, ?) RETURNING *')
    .bind(id, shopId, userId)
    .first<ShopUser>();

  return shopUser!;
}

/**
 * Insert shop_user if not exists, return action type.
 * Uses INSERT OR IGNORE + UNIQUE(shop_id, user_id) to avoid SELECT+INSERT round-trip.
 */
export async function ensureShopUser(
  db: D1Database,
  shopId: string,
  userId: string,
): Promise<'signup' | 'login'> {
  const id = generateId();
  const result = await db
    .prepare('INSERT OR IGNORE INTO shop_users (id, shop_id, user_id) VALUES (?, ?, ?)')
    .bind(id, shopId, userId)
    .run();

  // changes === 1 means new row inserted (signup), 0 means already existed (login)
  return (result.meta?.changes ?? 0) > 0 ? 'signup' : 'login';
}

// ─── Billing / monthly count ─────────────────────────────────

export async function getMonthlySignupCount(
  db: D1Database,
  shopId: string,
): Promise<number> {
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const nextMonthStr = nextMonth.toISOString().slice(0, 10);

  const result = await db
    .prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       AND created_at >= ? AND created_at < ?`,
    )
    .bind(shopId, `${yearMonth}-01`, nextMonthStr)
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
