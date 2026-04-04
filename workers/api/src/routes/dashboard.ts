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
import type { Env, ProviderName, WidgetStyle } from '@supasignup/bg-core';
import { generateId, DEFAULT_WIDGET_STYLE } from '@supasignup/bg-core';
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
import { purgeWidgetConfigCache } from './widget';
import { syncBenefitsToCoupons } from '../services/coupon';

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

  // Parallel: shop lookup + monthly count (both only need shopId)
  const [shop, monthlyCount] = await Promise.all([
    getShopById(c.env.DB, shopId),
    getMonthlySignupCount(c.env.DB, shopId),
  ]);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

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
  const allowed = ['shop_name', 'shop_url', 'allowed_redirect_uris', 'sso_configured', 'sso_type', 'shop_identity'];
  const updates: Record<string, unknown> = {};

  for (const key of allowed) {
    if (key in body) {
      if (key === 'allowed_redirect_uris' && Array.isArray(body[key])) {
        updates[key] = JSON.stringify(body[key]);
      } else if (key === 'sso_type') {
        const validSsoTypes = ['sso', 'sso1', 'sso2'];
        if (!validSsoTypes.includes(body[key] as string)) {
          return c.json({ error: 'invalid_sso_type', message: 'sso_type must be one of: sso, sso1, sso2' }, 400);
        }
        updates[key] = body[key];
      } else {
        updates[key] = body[key];
      }
    }
  }

  await updateShop(c.env.DB, shopId, updates);

  // shop_identity가 변경된 경우 백그라운드에서 쿠폰 동기화
  if ('shop_identity' in updates) {
    const updatedShop = { ...shop, shop_identity: updates.shop_identity as string | null };
    c.executionCtx.waitUntil(
      syncBenefitsToCoupons(c.env, updatedShop).catch((err) =>
        console.error(`[CouponSync] 백그라운드 동기화 오류: mall=${shop.mall_id}`, err),
      ),
    );
  }

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

  // Invalidate widget config cache (KV + 에지)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, providers });
});

// ─── PUT /shops/:id/widget-style ─────────────────────────────
dashboard.put('/shops/:id/widget-style', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = await c.req.json<Partial<WidgetStyle>>();

  // Validate preset
  const VALID_PRESETS: WidgetStyle['preset'][] = ['default', 'compact', 'icon-text', 'icon-only', 'mono', 'outline', 'outline-mono'];
  if (body.preset !== undefined && !VALID_PRESETS.includes(body.preset)) {
    return c.json({ error: 'invalid_preset', message: `preset must be one of: ${VALID_PRESETS.join(', ')}` }, 400);
  }

  // Validate align
  const VALID_ALIGNS: WidgetStyle['align'][] = ['left', 'center', 'right'];
  if (body.align !== undefined && !VALID_ALIGNS.includes(body.align)) {
    return c.json({ error: 'invalid_align', message: `align must be one of: ${VALID_ALIGNS.join(', ')}` }, 400);
  }

  // Validate numeric ranges
  if (body.buttonWidth !== undefined && (body.buttonWidth < 120 || body.buttonWidth > 500)) {
    return c.json({ error: 'invalid_buttonWidth', message: 'buttonWidth must be between 120 and 500' }, 400);
  }
  if (body.buttonGap !== undefined && (body.buttonGap < 0 || body.buttonGap > 24)) {
    return c.json({ error: 'invalid_buttonGap', message: 'buttonGap must be between 0 and 24' }, 400);
  }
  if (body.borderRadius !== undefined && (body.borderRadius < 0 || body.borderRadius > 30)) {
    return c.json({ error: 'invalid_borderRadius', message: 'borderRadius must be between 0 and 30' }, 400);
  }

  // Merge with current style (or defaults)
  const currentStyle: WidgetStyle = shop.widget_style
    ? JSON.parse(shop.widget_style)
    : { ...DEFAULT_WIDGET_STYLE };

  // 무료 플랜은 showPoweredBy 끄기 불가
  const showPoweredBy = shop.plan === 'free' ? true : (body.showPoweredBy ?? currentStyle.showPoweredBy ?? true);

  const newStyle: WidgetStyle = {
    preset: body.preset ?? currentStyle.preset,
    buttonWidth: body.buttonWidth ?? currentStyle.buttonWidth,
    buttonHeight: body.buttonHeight ?? currentStyle.buttonHeight ?? 44,
    buttonGap: body.buttonGap ?? currentStyle.buttonGap,
    borderRadius: body.borderRadius ?? currentStyle.borderRadius,
    align: body.align ?? currentStyle.align,
    buttonLabel: body.buttonLabel ?? currentStyle.buttonLabel ?? '{name}로 시작하기',
    showIcon: body.showIcon ?? currentStyle.showIcon ?? true,
    iconGap: body.iconGap ?? currentStyle.iconGap ?? 8,
    paddingLeft: body.paddingLeft ?? currentStyle.paddingLeft ?? 16,
    showTitle: body.showTitle ?? currentStyle.showTitle ?? true,
    showPoweredBy,
  };

  await updateShop(c.env.DB, shopId, {
    widget_style: JSON.stringify(newStyle),
  });

  // Invalidate widget config cache (KV + 에지)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, style: newStyle });
});

// ─── GET /shops/:id/banner ──────────────────────────────────
dashboard.get('/shops/:id/banner', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Plus 전용
  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required' }, 403);
  }

  const config = shop.banner_config ? JSON.parse(shop.banner_config) : null;
  return c.json({ ok: true, banner_config: config });
});

// ─── PUT /shops/:id/banner ──────────────────────────────────
dashboard.put('/shops/:id/banner', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required' }, 403);
  }

  const body = await c.req.json<{
    preset: number;
    text: string;
    borderRadius: number;
    icon: string;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
    hideForReturning?: boolean;
    anchorSelector?: string;
    position: string;
    animation?: string;
    fullWidth?: boolean;
    paddingX?: number;
    height?: number;
  }>();

  // Validate
  if (body.preset < 0 || body.preset > 7) {
    return c.json({ error: 'invalid_preset' }, 400);
  }
  if (body.borderRadius < 0 || body.borderRadius > 30) {
    return c.json({ error: 'invalid_borderRadius' }, 400);
  }
  if (body.text && body.text.length > 30) {
    return c.json({ error: 'text_too_long' }, 400);
  }

  const bannerConfig = {
    preset: body.preset,
    text: body.text || '번개가입으로 회원 혜택을 받으세요!',
    borderRadius: body.borderRadius ?? 10,
    icon: body.icon ?? '⚡',
    opacity: Math.min(Math.max(body.opacity ?? 90, 30), 100),
    bold: body.bold === true,
    italic: body.italic === true,
    hideForReturning: body.hideForReturning === true,
    anchorSelector: body.anchorSelector || '#top_nav_box',
    position: body.position || 'floating',
    animation: (body.animation === 'slideDown') ? 'slideDown' : 'fadeIn',
    fullWidth: body.fullWidth !== false,
    paddingX: Math.min(Math.max(body.paddingX ?? 24, 12), 80),
    height: Math.min(Math.max(body.height ?? 44, 32), 80),
  };

  await updateShop(c.env.DB, shopId, {
    banner_config: JSON.stringify(bannerConfig),
  });

  // Invalidate widget config cache
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, banner_config: bannerConfig });
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

// ─── GET /shops/:id/coupon ───────────────────────────────────
dashboard.get('/shops/:id/coupon', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  // coupon_config가 없으면 기본값 반환
  const defaultConfig = { enabled: false, coupons: [], multi_coupon: false };
  if (!shop.coupon_config) {
    return c.json({ coupon_config: defaultConfig });
  }

  try {
    const config = JSON.parse(shop.coupon_config);
    return c.json({ coupon_config: config });
  } catch {
    return c.json({ coupon_config: defaultConfig });
  }
});

// ─── PUT /shops/:id/coupon ───────────────────────────────────
dashboard.put('/shops/:id/coupon', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const body = await c.req.json<{
    enabled?: boolean;
    coupons?: unknown[];
    multi_coupon?: boolean;
  }>();

  const isPlusPlan = shop.plan !== 'free';

  // multi_coupon은 Plus 플랜에서만 허용; Free 플랜이면 false 강제
  const multiCoupon = isPlusPlan ? (body.multi_coupon ?? false) : false;

  // coupons 배열 검증 + 정규화: 허용 필드만 추출, coupon_no 필수
  const rawCoupons = Array.isArray(body.coupons) ? body.coupons : [];
  const validatedCoupons = rawCoupons
    .filter((c): c is Record<string, unknown> =>
      typeof c === 'object' && c !== null &&
      typeof (c as any).coupon_no === 'number' &&
      Number.isInteger((c as any).coupon_no) &&
      (c as any).coupon_no > 0
    )
    .map(c => ({
      coupon_no: c.coupon_no as number,
      coupon_name: typeof c.coupon_name === 'string' ? c.coupon_name : undefined,
      benefit_type: typeof c.benefit_type === 'string' ? c.benefit_type : undefined,
      discount_amount: typeof c.discount_amount === 'number' ? c.discount_amount : undefined,
      min_order: typeof c.min_order === 'number' ? c.min_order : undefined,
      expire_days: typeof c.expire_days === 'number' ? c.expire_days : undefined,
    }));
  const coupons = isPlusPlan ? validatedCoupons : validatedCoupons.slice(0, 1);

  const config = {
    enabled: body.enabled ?? false,
    coupons,
    multi_coupon: multiCoupon,
  };

  await updateShop(c.env.DB, shopId, {
    coupon_config: JSON.stringify(config),
  });

  return c.json({ ok: true, coupon_config: config });
});

// ─── PUT /shops/:id/kakao-channel ────────────────────────────

dashboard.put('/shops/:id/kakao-channel', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await c.env.DB
    .prepare('SELECT shop_id, plan FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first<{ shop_id: string; plan: string }>();

  if (!shop) return c.json({ error: 'not_found' }, 404);

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required', message: '카카오 채널 ID는 Plus 플랜에서만 설정할 수 있습니다.' }, 403);
  }

  const body = await c.req.json<{ kakao_channel_id?: string }>();
  const channelId = (body.kakao_channel_id ?? '').trim();

  await c.env.DB
    .prepare("UPDATE shops SET kakao_channel_id = ?, updated_at = datetime('now') WHERE shop_id = ?")
    .bind(channelId || null, shopId)
    .run();

  return c.json({ ok: true });
});

// ─── GET /inquiries — 내 문의 목록 ───────────────────────────
dashboard.get('/inquiries', authMiddleware, async (c) => {
  const ownerId = c.get('ownerId');

  const result = await c.env.DB.prepare(
    `SELECT i.id, i.title, i.status, i.created_at, i.replied_at,
            s.shop_name, s.mall_id
     FROM inquiries i
     JOIN shops s ON i.shop_id = s.shop_id
     WHERE i.owner_id = ?
     ORDER BY i.created_at DESC
     LIMIT 50`,
  )
    .bind(ownerId)
    .all();

  return c.json({ inquiries: result.results ?? [] });
});

// ─── POST /inquiries — 문의 작성 ─────────────────────────────
dashboard.post('/inquiries', authMiddleware, async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{ title?: string; content?: string; shop_id?: string }>();

  if (!body.title?.trim() || !body.content?.trim()) {
    return c.json({ error: 'title and content are required' }, 400);
  }

  // 해당 owner의 첫 번째 활성 쇼핑몰 (shop_id를 명시하지 않은 경우)
  let shopId = body.shop_id;
  if (!shopId) {
    const shop = await c.env.DB.prepare(
      'SELECT shop_id FROM shops WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1',
    )
      .bind(ownerId)
      .first<{ shop_id: string }>();
    if (!shop) return c.json({ error: 'no_shop_found' }, 400);
    shopId = shop.shop_id;
  } else {
    // shop_id를 명시한 경우 소유권 확인
    const shop = await c.env.DB.prepare(
      'SELECT shop_id FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL',
    )
      .bind(shopId, ownerId)
      .first();
    if (!shop) return c.json({ error: 'not_found' }, 404);
  }

  const id = generateId();
  await c.env.DB.prepare(
    `INSERT INTO inquiries (id, shop_id, owner_id, title, content, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`,
  )
    .bind(id, shopId, ownerId, body.title.trim(), body.content.trim())
    .run();

  return c.json({ ok: true, id }, 201);
});

// ─── GET /inquiries/:id — 문의 상세 (답변 포함) ──────────────
dashboard.get('/inquiries/:id', authMiddleware, async (c) => {
  const ownerId = c.get('ownerId');
  const inquiryId = c.req.param('id');

  const inquiry = await c.env.DB.prepare(
    `SELECT i.*, s.shop_name, s.mall_id
     FROM inquiries i
     JOIN shops s ON i.shop_id = s.shop_id
     WHERE i.id = ? AND i.owner_id = ?`,
  )
    .bind(inquiryId, ownerId)
    .first();

  if (!inquiry) return c.json({ error: 'not_found' }, 404);
  return c.json({ inquiry });
});

// ─── POST /shops/:id/verify-sso ─────────────────────────────
// SSO 슬롯 프로빙: sso~sso5를 모두 시도하여 우리 앱의 SSO 엔트리를 확정
dashboard.post('/shops/:id/verify-sso', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await c.env.DB
    .prepare('SELECT * FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first();

  if (!shop) return c.json({ error: 'not_found' }, 404);

  const mallId = shop.mall_id as string;
  const baseUrl = c.env.BASE_URL;
  const ssoTypes = ['sso', 'sso1', 'sso2', 'sso3', 'sso4', 'sso5'];

  // 각 SSO 슬롯을 병렬로 프로빙
  const results = await Promise.all(
    ssoTypes.map(async (type) => {
      try {
        const probeUrl = `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientLogin/${type}/?return_url=/member/login.html`;
        const resp = await fetch(probeUrl, { redirect: 'manual' });
        const location = resp.headers.get('location') || '';

        // 우리 BASE_URL로 리다이렉트되고 client_id가 포함되어 있으면 우리 앱의 SSO
        const isOurs = location.includes(baseUrl) && location.includes('client_id=');
        // 등록은 되어있지만 우리 앱이 아닌 경우 (다른 URL로 리다이렉트)
        const isOther = resp.status === 302 && location.startsWith('http') && !location.includes(baseUrl);
        // 미등록 (상대 URL이거나 빈 location)
        const isEmpty = resp.status === 302 && !location.startsWith('http');

        return {
          type,
          status: resp.status,
          is_ours: isOurs,
          is_other: isOther,
          is_empty: isEmpty,
          redirect_url: isOurs ? location.split('?')[0] : undefined,
          has_client_id: isOurs ? location.includes(`client_id=${shop.client_id}`) : false,
        };
      } catch {
        return { type, status: 0, is_ours: false, is_other: false, is_empty: false, has_client_id: false };
      }
    })
  );

  // 우리 앱의 SSO 슬롯 찾기
  const ourSso = results.find((r) => r.is_ours);

  if (ourSso) {
    const detectedType = ourSso.type;
    const currentType = (shop.sso_type as string) || 'sso';

    // sso_type 업데이트 + 캐시 삭제 (KV + 에지)
    if (detectedType !== currentType) {
      await Promise.all([
        c.env.DB.prepare("UPDATE shops SET sso_type = ?, sso_configured = 1, updated_at = datetime('now') WHERE shop_id = ?")
          .bind(detectedType, shopId)
          .run(),
        c.env.KV.delete(`widget_config:${shop.client_id as string}`),
        purgeWidgetConfigCache(shop.client_id as string, c.env.BASE_URL),
      ]);
    } else if (!(shop.sso_configured as number)) {
      await c.env.DB.prepare("UPDATE shops SET sso_configured = 1, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(shopId)
        .run();
    }

    return c.json({
      ok: true,
      detected_sso_type: detectedType,
      previous_sso_type: currentType,
      changed: detectedType !== currentType,
      has_client_id: ourSso.has_client_id,
      message: detectedType !== currentType
        ? `SSO 슬롯이 ${detectedType}로 확인되어 자동 변경되었습니다.`
        : `SSO 설정이 정상입니다. (${detectedType})`,
      slots: results.map((r) => ({
        type: r.type,
        status: r.is_ours ? 'ours' : r.is_other ? 'other' : r.is_empty ? 'empty' : 'unknown',
      })),
    });
  }

  return c.json({
    ok: false,
    message: '번개가입 SSO 설정을 찾을 수 없습니다. 카페24 관리자에서 SSO를 먼저 등록해주세요.',
    slots: results.map((r) => ({
      type: r.type,
      status: r.is_ours ? 'ours' : r.is_other ? 'other' : r.is_empty ? 'empty' : 'unknown',
    })),
  }, 404);
});

// ─── Helper ──────────────────────────────────────────────────

function maskSecret(secret: string): string {
  if (secret.length <= 8) return '****';
  return secret.slice(0, 4) + '****' + secret.slice(-4);
}

/**
 * SSO 슬롯 프로빙 (백그라운드용).
 * cafe24 callback에서 waitUntil로 호출.
 */
export async function probeSsoType(
  env: Env,
  shop: { shop_id: string; mall_id: string; client_id: string; sso_type?: string },
): Promise<void> {
  const ssoTypes = ['sso', 'sso1', 'sso2', 'sso3', 'sso4', 'sso5'];

  const results = await Promise.all(
    ssoTypes.map(async (type) => {
      try {
        const url = `https://${shop.mall_id}.cafe24.com/Api/Member/Oauth2ClientLogin/${type}/?return_url=/member/login.html`;
        const resp = await fetch(url, { redirect: 'manual' });
        const location = resp.headers.get('location') || '';
        return { type, isOurs: location.includes(env.BASE_URL) && location.includes('client_id=') };
      } catch {
        return { type, isOurs: false };
      }
    })
  );

  const detected = results.find((r) => r.isOurs);
  if (detected && detected.type !== (shop.sso_type || 'sso')) {
    await Promise.all([
      env.DB.prepare("UPDATE shops SET sso_type = ?, sso_configured = 1, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(detected.type, shop.shop_id)
        .run(),
      env.KV.delete(`widget_config:${shop.client_id}`),
      purgeWidgetConfigCache(shop.client_id, env.BASE_URL),
    ]);
    console.info(`[SSO Probe] ${shop.mall_id}: sso_type updated to ${detected.type}`);
  }
}

export default dashboard;
