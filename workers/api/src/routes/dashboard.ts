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
import { generateId, DEFAULT_WIDGET_STYLE, encrypt } from '@supasignup/bg-core';
import { hashPassword, verifyPassword } from '../services/password';
import { createToken } from '../services/jwt';
import { authMiddleware, rateLimitMiddleware } from '../middleware/auth';
import {
  getShopById,
  updateShop,
  softDeleteShop,
  getMonthlySignupCount,
} from '../db/queries';
import { purgeWidgetConfigCache } from './widget';
import { syncCouponConfig, DEFAULT_COUPON_CONFIG } from '../services/coupon';
import type { CouponConfig } from '../services/coupon';
import { registerCouponPack, unregisterCouponPack, withPackDefaults, retryFailedPackItems, resolveCouponPackState } from '../services/coupon-pack';
import type { CouponPackConfig, CouponPackState, CouponPackDesign, CouponPackSize } from '../services/coupon-pack';
import { autoReplyInquiry } from './ai';
import { getGlobalAutoReplyEnabled } from './admin';

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

// 카페24 전용 — register/login API 비활성화
// 카페24 관리자에서 앱 실행 시 OAuth 콜백(/api/cafe24/callback)으로 자동 로그인 처리
dashboard.post('/auth/register', (c) => c.json({ error: 'disabled', message: '카페24 관리자에서 앱을 실행해주세요.' }, 403));
dashboard.post('/auth/login', (c) => c.json({ error: 'disabled', message: '카페24 관리자에서 앱을 실행해주세요.' }, 403));

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
// shop 등록은 반드시 카페24 OAuth 콜백(/api/cafe24/callback)을 통해서만 진행된다.
// 수동 등록은 경쟁사 mall_id로 가짜 shop을 만들 수 있는 경로가 되므로 비활성화.
dashboard.post('/shops', (c) =>
  c.json({ error: 'disabled', message: '카페24 앱 설치 흐름으로만 쇼핑몰을 등록할 수 있습니다.' }, 403),
);

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

  const body = await c.req.json<{ providers?: string[]; icon_providers?: string[] }>();
  const providers = body.providers;
  const iconProviders = Array.isArray(body.icon_providers) ? body.icon_providers : [];

  if (!providers || !Array.isArray(providers) || providers.length === 0) {
    return c.json({ error: 'invalid_providers', message: 'At least one provider required' }, 400);
  }

  // Validate each provider
  for (const p of providers) {
    if (!VALID_PROVIDERS.includes(p as ProviderName)) {
      return c.json({ error: 'invalid_provider', message: `Unknown provider: ${p}` }, 400);
    }
  }

  // icon_providers ⊆ providers 검증 (자동으로 비활성 프로바이더 제거)
  const providerSet = new Set(providers);
  const filteredIconProviders = iconProviders.filter((p) => providerSet.has(p));

  await updateShop(c.env.DB, shopId, {
    enabled_providers: JSON.stringify(providers),
    icon_providers: JSON.stringify(filteredIconProviders),
  });

  // Invalidate widget config cache (KV + 에지)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, providers, icon_providers: filteredIconProviders });
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

  // Validate preset (Free 5종 + Plus 6종)
  const FREE_PRESETS: WidgetStyle['preset'][] = ['default', 'compact', 'icon-text', 'icon-only', 'mono', 'outline', 'outline-mono'];
  const PLUS_PRESETS_LIST: WidgetStyle['preset'][] = ['glassmorphism', 'neon-glow', 'liquid-glass', 'gradient-flow', 'soft-shadow', 'pulse'];
  const VALID_PRESETS = [...FREE_PRESETS, ...PLUS_PRESETS_LIST];
  if (body.preset !== undefined && !VALID_PRESETS.includes(body.preset)) {
    return c.json({ error: 'invalid_preset', message: `preset must be one of: ${VALID_PRESETS.join(', ')}` }, 400);
  }

  // Plus 프리셋 저장 시 플랜 검증 — free 플랜이면 Plus 프리셋 저장 불가
  const isPlusPreset = body.preset !== undefined && PLUS_PRESETS_LIST.includes(body.preset);
  if (isPlusPreset && shop.plan === 'free') {
    return c.json({ error: 'plus_required', message: 'Plus 플랜이 필요합니다.' }, 403);
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

  // presetTier 결정: Plus 프리셋이면 'plus', 아니면 'free'
  const resolvedPreset = body.preset ?? currentStyle.preset;
  const resolvedPresetTier: 'free' | 'plus' = PLUS_PRESETS_LIST.includes(resolvedPreset) ? 'plus' : 'free';

  // Plus 전용 옵션: Free 플랜이면 모두 OFF + 기본값으로 강제 (보안)
  const isFree = shop.plan === 'free';
  const VALID_CP_POSITIONS: NonNullable<WidgetStyle['couponPackPosition']>[] = ['above', 'below'];
  if (body.couponPackPosition !== undefined && !VALID_CP_POSITIONS.includes(body.couponPackPosition)) {
    return c.json({ error: 'invalid_couponPackPosition', message: `must be one of: ${VALID_CP_POSITIONS.join(', ')}` }, 400);
  }
  if (body.couponPackGap !== undefined && (body.couponPackGap < 0 || body.couponPackGap > 60)) {
    return c.json({ error: 'invalid_couponPackGap', message: 'couponPackGap must be between 0 and 60' }, 400);
  }
  if (body.customText1 !== undefined && typeof body.customText1 === 'string' && body.customText1.length > 200) {
    return c.json({ error: 'invalid_customText1', message: 'customText1 max 200 chars' }, 400);
  }
  if (body.customText2 !== undefined && typeof body.customText2 === 'string' && body.customText2.length > 200) {
    return c.json({ error: 'invalid_customText2', message: 'customText2 max 200 chars' }, 400);
  }

  const newStyle: WidgetStyle = {
    preset: resolvedPreset,
    presetTier: resolvedPresetTier,
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
    widgetPosition: body.widgetPosition ?? currentStyle.widgetPosition ?? 'before',
    customSelector: body.customSelector ?? currentStyle.customSelector ?? '',
    // Plus 전용 — Free면 강제 OFF
    showCouponPack: isFree ? false : (body.showCouponPack ?? currentStyle.showCouponPack ?? true),
    couponPackPosition: body.couponPackPosition ?? currentStyle.couponPackPosition ?? 'below',
    couponPackGap: body.couponPackGap ?? currentStyle.couponPackGap ?? 12,
    customText1Enabled: isFree ? false : (body.customText1Enabled ?? currentStyle.customText1Enabled ?? true),
    customText1: body.customText1 ?? currentStyle.customText1 ?? '아이디 비밀번호 입력없이 번개가입! 번개로그인!',
    customText2Enabled: isFree ? false : (body.customText2Enabled ?? currentStyle.customText2Enabled ?? true),
    customText2: body.customText2 ?? currentStyle.customText2 ?? '회원가입 즉시 사용가능한 쿠폰팩 증정',
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

// ─── GET /shops/:id/popup ───────────────────────────────────
dashboard.get('/shops/:id/popup', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required' }, 403);
  }

  const config = shop.popup_config ? JSON.parse(shop.popup_config) : null;
  return c.json({ ok: true, popup_config: config });
});

// ─── PUT /shops/:id/popup ───────────────────────────────────
dashboard.put('/shops/:id/popup', async (c) => {
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
    enabled?: boolean;
    title?: string;
    body?: string;
    ctaText?: string;
    preset?: number;
    borderRadius?: number;
    opacity?: number;
    icon?: string;
    allPages?: boolean;
    cooldownHours?: number;
    // D2=A: 쿠폰 모드 (2026-04-29 추가)
    coupon_mode?: 'none' | 'single' | 'pack';
    coupon_type?: 'shipping' | 'amount' | 'rate';
    // Exit-intent 흡수 (D1=A, 2026-04-29)
    scroll_depth_threshold?: number;
    frequency_cap_hours?: number;
  }>();

  if (body.title && body.title.length > 20) {
    return c.json({ error: 'title_too_long' }, 400);
  }
  if (body.body && body.body.length > 100) {
    return c.json({ error: 'body_too_long' }, 400);
  }

  // 쿠폰 모드 검증
  const VALID_COUPON_MODES = ['none', 'single', 'pack'] as const;
  const VALID_COUPON_TYPES_POPUP = ['shipping', 'amount', 'rate'] as const;
  if (body.coupon_mode !== undefined && !VALID_COUPON_MODES.includes(body.coupon_mode as typeof VALID_COUPON_MODES[number])) {
    return c.json({ error: 'invalid_coupon_mode', message: 'coupon_mode must be none, single, or pack' }, 400);
  }
  // coupon_type: null은 none/pack 모드에서 허용 (coupon_type을 명시적으로 지우는 경우)
  if (body.coupon_type !== undefined && body.coupon_type !== null && !VALID_COUPON_TYPES_POPUP.includes(body.coupon_type as typeof VALID_COUPON_TYPES_POPUP[number])) {
    return c.json({ error: 'invalid_coupon_type', message: 'coupon_type must be shipping, amount, or rate' }, 400);
  }
  if (body.scroll_depth_threshold !== undefined) {
    const sdt = body.scroll_depth_threshold;
    if (typeof sdt !== 'number' || sdt < 0 || sdt > 100) {
      return c.json({ error: 'invalid_scroll_depth_threshold', message: 'scroll_depth_threshold must be 0-100' }, 400);
    }
  }
  if (body.frequency_cap_hours !== undefined) {
    const fch = body.frequency_cap_hours;
    if (typeof fch !== 'number' || fch < 1 || fch > 168) {
      return c.json({ error: 'invalid_frequency_cap_hours', message: 'frequency_cap_hours must be 1-168' }, 400);
    }
  }

  // 기존 저장값 로드 (새 필드 누락 시 기존값 보존)
  const existing = shop.popup_config ? JSON.parse(shop.popup_config) : {};

  const popupConfig = {
    enabled: body.enabled !== false,
    title: body.title || '잠깐만요!',
    body: body.body || '지금 가입하면 특별 혜택을 드려요!',
    ctaText: body.ctaText || '혜택 받고 가입하기',
    preset: Math.min(Math.max(body.preset ?? 6, 0), 7),
    borderRadius: Math.min(Math.max(body.borderRadius ?? 16, 8), 24),
    opacity: Math.min(Math.max(body.opacity ?? 100, 10), 100),
    icon: body.icon ?? '🎁',
    allPages: body.allPages === true,
    // frequency_cap_hours로 통합 (cooldownHours 하위 호환 유지)
    frequency_cap_hours: Math.min(Math.max(body.frequency_cap_hours ?? body.cooldownHours ?? existing.frequency_cap_hours ?? existing.cooldownHours ?? 24, 1), 168),
    cooldownHours: Math.min(Math.max(body.cooldownHours ?? body.frequency_cap_hours ?? existing.cooldownHours ?? existing.frequency_cap_hours ?? 24, 1), 168),
    // D2=A 쿠폰 모드 (2026-04-30: default를 'pack'으로 변경 — Plus 페이지이므로 쿠폰팩이 자연스러움)
    coupon_mode: (body.coupon_mode ?? existing.coupon_mode ?? 'pack') as 'none' | 'single' | 'pack',
    coupon_type: (body.coupon_type ?? existing.coupon_type ?? null) as 'shipping' | 'amount' | 'rate' | null,
    // Exit-intent 흡수
    scroll_depth_threshold: body.scroll_depth_threshold ?? existing.scroll_depth_threshold ?? 0,
  };

  await updateShop(c.env.DB, shopId, {
    popup_config: JSON.stringify(popupConfig),
  });

  // Invalidate widget config cache
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, popup_config: popupConfig });
});

// ─── GET /shops/:id/escalation ──────────────────────────────
dashboard.get('/shops/:id/escalation', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required' }, 403);
  }

  const config = shop.escalation_config ? JSON.parse(shop.escalation_config) : null;
  return c.json({ ok: true, escalation_config: config });
});

// ─── PUT /shops/:id/escalation ──────────────────────────────
dashboard.put('/shops/:id/escalation', async (c) => {
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
    enabled?: boolean;
    hideForReturning?: boolean;
    toastEnabled?: boolean;
    toastStartVisit?: number;
    toastEndVisit?: number;
    toastText?: string;
    toastStyle?: number;
    toastOpacity?: number;
    toastBorderRadius?: number;
    toastAnimation?: string;
    toastDuration?: number;
    toastPersist?: boolean;
    floatingEnabled?: boolean;
    floatingText?: string;
    floatingBtnText?: string;
    floatingPreset?: number;
    floatingOpacity?: number;
    floatingBorderRadius?: number;
    floatingAnimation?: string;
  }>();

  const escalationConfig = {
    enabled: body.enabled !== false,
    hideForReturning: body.hideForReturning === true,
    toastEnabled: body.toastEnabled !== false,
    toastStartVisit: Math.min(Math.max(body.toastStartVisit ?? 2, 2), 10),
    toastEndVisit: Math.min(Math.max(body.toastEndVisit ?? 3, 2), 10),
    toastText: body.toastText || '\uC548\uB155\uD558\uC138\uC694. {n}\uBC88\uC9F8 \uBC29\uBB38\uC744 \uD658\uC601\uD569\uB2C8\uB2E4.',
    toastStyle: Math.min(Math.max(body.toastStyle ?? 0, 0), 3),
    toastOpacity: Math.min(Math.max(body.toastOpacity ?? 96, 10), 100),
    toastBorderRadius: Math.min(Math.max(body.toastBorderRadius ?? 20, 0), 20),
    toastAnimation: body.toastAnimation === 'slideUp' ? 'slideUp' : 'fadeIn',
    toastDuration: Math.min(Math.max(body.toastDuration ?? 5, 1), 10),
    toastPersist: body.toastPersist === true,
    floatingEnabled: body.floatingEnabled !== false,
    floatingText: body.floatingText || '\uD68C\uC6D0\uAC00\uC785\uD558\uBA74 \uD2B9\uBCC4 \uD61C\uD0DD!',
    floatingBtnText: body.floatingBtnText || '\uBC14\uB85C \uAC00\uC785\uD558\uAE30',
    floatingPreset: Math.min(Math.max(body.floatingPreset ?? 0, 0), 4),
    floatingOpacity: Math.min(Math.max(body.floatingOpacity ?? 100, 10), 100),
    floatingBorderRadius: Math.min(Math.max(body.floatingBorderRadius ?? 0, 0), 20),
    floatingAnimation: body.floatingAnimation === 'slideUp' ? 'slideUp' : 'fadeIn',
  };

  await updateShop(c.env.DB, shopId, {
    escalation_config: JSON.stringify(escalationConfig),
  });

  // Invalidate widget config cache
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, escalation_config: escalationConfig });
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
    enabled?: boolean;
    preset: number;
    text: string;
    borderRadius: number;
    icon: string;
    opacity?: number;
    bold?: boolean;
    italic?: boolean;
    hideForReturning?: boolean;
    hideOnSpecialPages?: boolean;
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
    enabled: body.enabled !== false,                       // default true (기본 활성)
    hideOnSpecialPages: body.hideOnSpecialPages !== false, // default true (메인/로그인/회원가입에서 기본 숨김)
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
    fullWidth: body.fullWidth === true,
    paddingX: Math.min(Math.max(body.paddingX ?? 28, 12), 80),
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

  // client_secret 평문 노출: 쇼핑몰 관리자가 카페24 SSO 설정 시 복사해야 하므로 마스킹하지 않음
  // 이 엔드포인트는 인증된 shop owner만 접근 가능
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

  if (!shop.coupon_config) {
    return c.json({ coupon_config: DEFAULT_COUPON_CONFIG });
  }

  try {
    const config = JSON.parse(shop.coupon_config);
    // 새 포맷(shipping/amount/rate)인지 확인, 이전 포맷이면 기본값 반환
    if (!config?.shipping || !config?.amount || !config?.rate) {
      return c.json({ coupon_config: DEFAULT_COUPON_CONFIG });
    }
    return c.json({ coupon_config: config });
  } catch {
    return c.json({ coupon_config: DEFAULT_COUPON_CONFIG });
  }
});

// ─── GET /shops/:id/coupon-issues ───────────────────────────────────
dashboard.get('/shops/:id/coupon-issues', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = 20;
  const offset = (page - 1) * limit;

  const [issues, countResult] = await Promise.all([
    c.env.DB.prepare(
      'SELECT id, member_id, coupon_type, coupon_no, issued_at FROM coupon_issues WHERE shop_id = ? ORDER BY issued_at DESC LIMIT ? OFFSET ?',
    ).bind(shopId, limit, offset).all(),
    c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM coupon_issues WHERE shop_id = ?',
    ).bind(shopId).first<{ total: number }>(),
  ]);

  return c.json({
    issues: issues.results ?? [],
    total: countResult?.total ?? 0,
    page,
    limit,
  });
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
    shipping?: { enabled?: boolean; expire_days?: number };
    amount?: { enabled?: boolean; expire_days?: number; discount_amount?: number; min_order?: number };
    rate?: { enabled?: boolean; expire_days?: number; discount_rate?: number; min_order?: number };
  }>();

  // Free/Plus 동일: 3종 모두 활성화 + 세부 설정 자유 변경. 검증은 공통.

  const VALID_EXPIRE_DAYS = [3, 7, 10, 20, 30];

  // 검증: expire_days
  for (const key of ['shipping', 'amount', 'rate'] as const) {
    const section = body[key];
    if (section?.expire_days !== undefined && !VALID_EXPIRE_DAYS.includes(section.expire_days)) {
      return c.json({ error: 'invalid_expire_days', message: `expire_days must be one of: ${VALID_EXPIRE_DAYS.join(', ')}` }, 400);
    }
  }

  // 검증: discount_amount
  if (body.amount?.discount_amount !== undefined) {
    const da = body.amount.discount_amount;
    if (!Number.isInteger(da) || da < 100) {
      return c.json({ error: 'invalid_discount_amount', message: 'discount_amount must be an integer >= 100' }, 400);
    }
  }

  // 검증: discount_rate
  if (body.rate?.discount_rate !== undefined) {
    const dr = body.rate.discount_rate;
    if (!Number.isInteger(dr) || dr < 1 || dr > 100) {
      return c.json({ error: 'invalid_discount_rate', message: 'discount_rate must be an integer between 1 and 100' }, 400);
    }
  }

  // 검증: min_order
  for (const key of ['amount', 'rate'] as const) {
    const section = body[key];
    if (section?.min_order !== undefined) {
      if (!Number.isInteger(section.min_order) || section.min_order < 0) {
        return c.json({ error: 'invalid_min_order', message: 'min_order must be a non-negative integer' }, 400);
      }
    }
  }

  // 기존 config 로드 (cafe24_coupons 보존을 위해)
  let existingConfig: CouponConfig = { ...DEFAULT_COUPON_CONFIG };
  if (shop.coupon_config) {
    try {
      existingConfig = JSON.parse(shop.coupon_config) as CouponConfig;
    } catch { /* 파싱 실패 시 기본값 사용 */ }
  }

  // 새 설정 병합 (cafe24_coupons는 유지, 단 설정이 바뀐 쿠폰의 coupon_no는 초기화)
  const newConfig: CouponConfig = {
    shipping: {
      enabled: body.shipping?.enabled ?? existingConfig.shipping.enabled,
      expire_days: body.shipping?.expire_days ?? existingConfig.shipping.expire_days,
    },
    amount: {
      enabled: body.amount?.enabled ?? existingConfig.amount.enabled,
      expire_days: body.amount?.expire_days ?? existingConfig.amount.expire_days,
      discount_amount: body.amount?.discount_amount ?? existingConfig.amount.discount_amount,
      min_order: body.amount?.min_order ?? existingConfig.amount.min_order,
    },
    rate: {
      enabled: body.rate?.enabled ?? existingConfig.rate.enabled,
      expire_days: body.rate?.expire_days ?? existingConfig.rate.expire_days,
      discount_rate: body.rate?.discount_rate ?? existingConfig.rate.discount_rate,
      min_order: body.rate?.min_order ?? existingConfig.rate.min_order,
    },
    cafe24_coupons: existingConfig.cafe24_coupons ? { ...existingConfig.cafe24_coupons } : undefined,
  };

  // 설정이 변경된 쿠폰은 기존 coupon_no를 초기화하여 재생성 유도
  if (body.shipping !== undefined && newConfig.cafe24_coupons) {
    const shippingChanged =
      body.shipping.expire_days !== undefined &&
      body.shipping.expire_days !== existingConfig.shipping.expire_days;
    if (shippingChanged) {
      newConfig.cafe24_coupons.shipping_coupon_no = undefined;
    }
  }
  if (body.amount !== undefined && newConfig.cafe24_coupons) {
    const amountChanged =
      (body.amount.expire_days !== undefined && body.amount.expire_days !== existingConfig.amount.expire_days) ||
      (body.amount.discount_amount !== undefined && body.amount.discount_amount !== existingConfig.amount.discount_amount) ||
      (body.amount.min_order !== undefined && body.amount.min_order !== existingConfig.amount.min_order);
    if (amountChanged) {
      newConfig.cafe24_coupons.amount_coupon_no = undefined;
    }
  }
  if (body.rate !== undefined && newConfig.cafe24_coupons) {
    const rateChanged =
      (body.rate.expire_days !== undefined && body.rate.expire_days !== existingConfig.rate.expire_days) ||
      (body.rate.discount_rate !== undefined && body.rate.discount_rate !== existingConfig.rate.discount_rate) ||
      (body.rate.min_order !== undefined && body.rate.min_order !== existingConfig.rate.min_order);
    if (rateChanged) {
      newConfig.cafe24_coupons.rate_coupon_no = undefined;
    }
  }

  await updateShop(c.env.DB, shopId, {
    coupon_config: JSON.stringify(newConfig),
  });

  // 위젯 캐시 무효화 (coupon_config가 widget/config에 포함되므로 반드시 퍼지)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  // 백그라운드에서 카페24 쿠폰 생성 동기화
  const updatedShop = { ...shop, coupon_config: JSON.stringify(newConfig) };
  c.executionCtx.waitUntil(
    syncCouponConfig(c.env, updatedShop).catch((err) =>
      console.error(`[CouponSync] 백그라운드 동기화 오류: mall=${shop.mall_id}`, err),
    ),
  );

  return c.json({ ok: true, coupon_config: newConfig });
});

// ─── /shops/:id/exit-intent-config [REMOVED 2026-04-30] ─────
// 이탈 감지 팝업(/shops/:id/popup-config)으로 통합. 어드민 UI에서 더 이상 호출하지 않음.
// shops.exit_intent_config 컬럼은 데이터 보존 목적으로 유지(롤백 옵션). 차후 마이그레이션에서 컬럼 삭제 예정.

// ─── GET /shops/:id/live-counter ────────────────────────────
dashboard.get('/shops/:id/live-counter', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required' }, 403);
  }

  const config = shop.live_counter_config ? JSON.parse(shop.live_counter_config) : null;
  return c.json({ ok: true, live_counter_config: config });
});

// ─── PUT /shops/:id/live-counter ────────────────────────────
dashboard.put('/shops/:id/live-counter', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan === 'free') {
    return c.json({ error: 'plus_required', message: '라이브 카운터는 Plus 플랜에서만 사용할 수 있습니다.' }, 403);
  }

  const body = await c.req.json<{
    enabled?: boolean;
    position?: string;
    show_toast?: boolean;
    show_counter?: boolean;
  }>();

  const VALID_POSITIONS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'];
  const position = VALID_POSITIONS.includes(body.position ?? '') ? body.position : 'bottom-right';

  const newConfig = {
    enabled: body.enabled !== false,
    position,
    show_toast: body.show_toast !== false,
    show_counter: body.show_counter !== false,
  };

  await updateShop(c.env.DB, shopId, {
    live_counter_config: JSON.stringify(newConfig),
  });

  // 위젯 config cache 무효화 (live_counter는 별도 엔드포인트지만 config 캐시도 갱신)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

  return c.json({ ok: true, live_counter_config: newConfig });
});

// ─── PUT /shops/:id/kakao-channel ────────────────────────────

dashboard.put('/shops/:id/kakao-channel', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await c.env.DB
    .prepare('SELECT shop_id, client_id, plan FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first<{ shop_id: string; client_id: string; plan: string }>();

  if (!shop) return c.json({ error: 'not_found' }, 404);

  // 2026-05-01: 카카오 채널 ID는 Free 플랜도 설정 가능하도록 plan check 제거 (기본 설정 페이지로 통합).

  const body = await c.req.json<{ kakao_channel_id?: string }>();
  const channelId = (body.kakao_channel_id ?? '').trim();

  await c.env.DB
    .prepare("UPDATE shops SET kakao_channel_id = ?, updated_at = datetime('now') WHERE shop_id = ?")
    .bind(channelId || null, shopId)
    .run();

  // 위젯 캐시 무효화 (kakao_channel_id가 widget/config에 포함되므로 반드시 퍼지)
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);

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

  // 전역 AI 자동답변이 ON이면 백그라운드로 답변 생성
  const autoReplyEnabled = await getGlobalAutoReplyEnabled(c.env);
  if (autoReplyEnabled) {
    c.executionCtx.waitUntil(autoReplyInquiry(c.env, id));
  }

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

  // 답변이 있고 아직 운영자 조회 기록이 없으면 → customer_read_at 기록 (백그라운드)
  const inq = inquiry as Record<string, unknown>;
  if (inq.reply && !inq.customer_read_at) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        "UPDATE inquiries SET customer_read_at = datetime('now') WHERE id = ? AND customer_read_at IS NULL",
      )
        .bind(inquiryId)
        .run()
        .catch((e: unknown) => console.error('[customer-read] update failed:', e)),
    );
  }

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
    const slots = results.map((r) => ({
      type: r.type,
      status: r.is_ours ? 'ours' : r.is_other ? 'other' : r.is_empty ? 'empty' : 'unknown',
    }));
    const slotsJson = JSON.stringify(slots);

    // sso_type 업데이트 + 검증 결과 저장 + 캐시 삭제 (KV + 에지)
    if (detectedType !== currentType) {
      await Promise.all([
        c.env.DB.prepare("UPDATE shops SET sso_type = ?, sso_configured = 1, sso_verified_at = datetime('now'), sso_verified_slots = ?, updated_at = datetime('now') WHERE shop_id = ?")
          .bind(detectedType, slotsJson, shopId)
          .run(),
        c.env.KV.delete(`widget_config:${shop.client_id as string}`),
        purgeWidgetConfigCache(shop.client_id as string, c.env.BASE_URL),
      ]);
    } else {
      await c.env.DB.prepare("UPDATE shops SET sso_configured = 1, sso_verified_at = datetime('now'), sso_verified_slots = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(slotsJson, shopId)
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
      slots,
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

// ─── GET /shops/:id/ai-copy — AI 추천 문구 조회 ─────────────
dashboard.get('/shops/:id/ai-copy', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const rawCopy = (shop as unknown as Record<string, unknown>).ai_suggested_copy;
  if (!rawCopy) {
    return c.json({ copy: null });
  }

  try {
    return c.json({ copy: JSON.parse(String(rawCopy)) });
  } catch {
    return c.json({ copy: null });
  }
});

// ─── GET /promo-banner — 홍보 배너 프록시 ────────────────────
dashboard.get('/promo-banner', async (c) => {
  try {
    const resp = await fetch('https://sm.suparain.kr/api/v1/banners/active/html?app=supasignup', {
      headers: { 'Accept': 'text/html' },
    });

    if (!resp.ok) {
      return new Response('', { status: 204 });
    }

    const html = await resp.text();
    if (!html.trim()) {
      return new Response('', { status: 204 });
    }

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5분 캐시
      },
    });
  } catch {
    return new Response('', { status: 204 });
  }
});

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

// ─── POST /widget/event-dashboard ────────────────────────────
// 대시보드 내부에서 funnel_events를 기록하는 인증된 엔드포인트
// 위젯용 /api/widget/event 는 Origin 검증이 있어 대시보드에서 사용 불가
const DASHBOARD_FUNNEL_EVENT_TYPES: ReadonlySet<string> = new Set([
  'widget_style.preview_plus_preset',
  'widget_style.save_attempt_locked',
  'billing.upgrade_modal_shown',
  'billing.upgrade_completed_via_design_preview',
]);

dashboard.post('/widget/event-dashboard', async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{ shop_id: string; event_type: string; event_data?: Record<string, unknown> }>();

  if (!body.shop_id || !body.event_type) {
    return c.json({ error: 'missing_params' }, 400);
  }
  if (!DASHBOARD_FUNNEL_EVENT_TYPES.has(body.event_type)) {
    return c.json({ error: 'invalid_event_type' }, 400);
  }

  const shop = await getShopById(c.env.DB, body.shop_id);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  const eventId = crypto.randomUUID();
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      'INSERT INTO funnel_events (id, shop_id, event_type, event_data, page_url, visitor_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(eventId, shop.shop_id, body.event_type, JSON.stringify(body.event_data || {}), '/dashboard/settings/providers', null)
      .run()
  );

  return c.json({ ok: true });
});

// ─── PUT /shops/:id/coupon-pack ─────────────────────────────
/**
 * Plus 웰컴 쿠폰팩 활성화 / 비활성화 + 디자인/애니/만료일 설정.
 *
 * enabled=true : registerCouponPack() 호출 → coupon_config.pack 갱신 → 캐시 무효화
 * enabled=false: unregisterCouponPack() 호출 → coupon_config.pack.state='unregistered'
 *
 * 선택 필드:
 *   design      : 'dark' | 'brand' | 'illust' | 'minimal' (기본 'brand')
 *   anim_mode   : boolean (기본 true)
 *   expire_days : 7~90 (기본 30)
 *                 state=active 이고 expire_days 변경 시 카페24 PUT 즉시 반영 (D-5)
 *                 state!=active 이면 DB만 갱신 (다음 register 시 반영)
 *
 * - Plus 플랜 전용 (Free → 403)
 * - 기존 coupon_config 나머지 필드 변경 없음 (pack 필드 추가/수정만)
 */
dashboard.put('/shops/:id/coupon-pack', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan !== 'plus') {
    return c.json(
      { error: 'plus_required', message: '쿠폰팩은 Plus 플랜에서만 사용할 수 있습니다.' },
      403,
    );
  }

  const body = await c.req.json<{
    enabled: boolean;
    design?: CouponPackDesign;
    anim_mode?: boolean;
    expire_days?: number;
    size?: CouponPackSize;
  }>();

  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: 'invalid_body', message: 'enabled(boolean) 필드가 필요합니다.' }, 400);
  }

  const VALID_DESIGNS: CouponPackDesign[] = ['dark', 'brand', 'illust', 'minimal'];
  if (body.design !== undefined && !VALID_DESIGNS.includes(body.design)) {
    return c.json(
      { error: 'invalid_design', message: `design은 ${VALID_DESIGNS.join(' | ')} 중 하나여야 합니다.` },
      400,
    );
  }
  if (body.anim_mode !== undefined && typeof body.anim_mode !== 'boolean') {
    return c.json({ error: 'invalid_anim_mode', message: 'anim_mode는 boolean이어야 합니다.' }, 400);
  }
  if (body.expire_days !== undefined) {
    const d = body.expire_days;
    if (!Number.isInteger(d) || d < 7 || d > 90) {
      return c.json({ error: 'invalid_expire_days', message: 'expire_days는 7~90 사이 정수여야 합니다.' }, 400);
    }
  }
  const VALID_SIZES: CouponPackSize[] = ['lg', 'md', 'sm', 'xs'];
  if (body.size !== undefined && !VALID_SIZES.includes(body.size)) {
    return c.json(
      { error: 'invalid_size', message: `size는 ${VALID_SIZES.join(' | ')} 중 하나여야 합니다.` },
      400,
    );
  }

  // 기존 coupon_config 파싱 (pack 외 필드 보존)
  let existingConfig: CouponConfig & { pack?: CouponPackConfig } = {
    ...DEFAULT_COUPON_CONFIG,
  };
  if (shop.coupon_config) {
    try {
      existingConfig = JSON.parse(shop.coupon_config) as CouponConfig & { pack?: CouponPackConfig };
    } catch { /* 파싱 실패 시 기본값 사용 */ }
  }

  // 디자인/애니/만료일은 기존 값 유지 + body 덮어쓰기
  const prevPack = existingConfig.pack;
  const prevState = prevPack ? resolveCouponPackState(prevPack) : 'unregistered';
  const mergedDesign: CouponPackDesign    = body.design    ?? prevPack?.design    ?? 'brand';
  const mergedAnim:   boolean             = body.anim_mode ?? prevPack?.anim_mode ?? true;
  const mergedExpiry: number              = body.expire_days ?? prevPack?.expire_days ?? 30;
  const mergedSize:   CouponPackSize      = body.size ?? prevPack?.size ?? 'lg';
  if (body.enabled) {
    // ── 활성화 경로 분기 ──────────────────────────────────────
    // 이미 등록된 쿠폰팩(active|paused)은 metadata(design/anim_mode/size)만 갱신.
    // expire_days 는 카페24 정책상 등록 후 변경 불가 (active 쿠폰의 metadata-only PUT 거부 +
    // status transition 필요한데 transaction-style로 metadata도 함께 거부됨).
    // body.expire_days 가 들어와도 무시하고 prevPack 값 유지. UI에서도 readonly.
    if (prevState === 'active' || prevState === 'paused') {
      const newPack: CouponPackConfig = withPackDefaults({
        ...(prevPack ?? {}),
        // expire_days 는 prevPack 유지 (변경 무시)
        design: mergedDesign,
        anim_mode: mergedAnim,
        size: mergedSize,
      });

      const newConfig = { ...existingConfig, pack: newPack };

      await c.env.DB
        .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(JSON.stringify(newConfig), shopId)
        .run();

      await Promise.all([
        c.env.KV.delete(`widget_config:${shop.client_id}`),
        purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
      ]);

      console.info(
        `[CouponPack] metadata 갱신 (expire_days 변경은 카페24 정책상 차단): mall=${shop.mall_id}`,
      );

      return c.json({
        ok: true,
        pack: newPack,
        items: prevPack?.items ?? [],
        failures: [],
      });
    }

    // ── unregistered 상태에서 활성화: 5개 쿠폰 카페24 신규 등록 ──
    const result = await registerCouponPack(c.env, shop);

    const now = new Date().toISOString();
    const packActive = result.items.length > 0;
    const newPack: CouponPackConfig = withPackDefaults({
      enabled: packActive,
      state: packActive ? 'active' : 'unregistered',
      registered_at: packActive ? now : (prevPack?.registered_at ?? null),
      expire_days: mergedExpiry,
      items: result.items,
      design: mergedDesign,
      anim_mode: mergedAnim,
      size: mergedSize,
    });

    const newConfig = { ...existingConfig, pack: newPack };

    // 활성화 성공 시 위젯 쿠폰팩 노출 + 안내 텍스트1·2 — 미설정(undefined)인 경우만 자동 ON.
    // (Free→Plus 승급 후 첫 활성화 시 widget_style이 false로 강제 저장돼 안 보이는 문제 방지)
    // 운영자가 명시적으로 OFF(false)한 경우는 보존 — services/ai-copy.ts 의 customText1/2 처리와 일관.
    let widgetStyleUpdated: string | null = null;
    if (packActive) {
      let ws: Record<string, unknown> = {};
      if (shop.widget_style) {
        try { ws = JSON.parse(shop.widget_style) as Record<string, unknown>; } catch { /* keep empty */ }
      }
      let changed = false;
      if (ws.showCouponPack === undefined) { ws.showCouponPack = true; changed = true; }
      if (ws.customText1Enabled === undefined) { ws.customText1Enabled = true; changed = true; }
      if (ws.customText2Enabled === undefined) { ws.customText2Enabled = true; changed = true; }
      if (changed) widgetStyleUpdated = JSON.stringify(ws);
    }

    if (widgetStyleUpdated) {
      await c.env.DB
        .prepare("UPDATE shops SET coupon_config = ?, widget_style = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(JSON.stringify(newConfig), widgetStyleUpdated, shopId)
        .run();
    } else {
      await c.env.DB
        .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(JSON.stringify(newConfig), shopId)
        .run();
    }

    // KV + 엣지 캐시 무효화
    await Promise.all([
      c.env.KV.delete(`widget_config:${shop.client_id}`),
      purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
    ]);

    console.info(
      `[CouponPack] 등록 결과: mall=${shop.mall_id}, 성공=${result.items.length}, 실패=${result.failures.length}`,
    );

    return c.json({
      ok: true,
      pack: newPack,
      items: result.items,
      failures: result.failures,
      widget_style_auto_enabled: widgetStyleUpdated ? true : undefined,
    });

  } else {
    // ── 비활성화: 자동 발급 중지 ───────────────────────────────
    // 카페24 쿠폰 일시정지 (status=pause). 부분 실패 시 state 미갱신 + 502 응답으로 운영자에게 안내.
    // 호출부가 멱등하게 재시도 가능 (운영자가 다시 OFF 토글 → 남은 쿠폰만 다시 시도).
    const unregisterResult = await unregisterCouponPack(c.env, shop);

    if (!unregisterResult.success) {
      console.error(
        `[CouponPack] 운영자 비활성화 부분 실패: mall=${shop.mall_id}, 실패 coupon_no=${unregisterResult.failures.join(',')}`,
      );
      return c.json({
        ok: false,
        error: 'partial_unregister_fail',
        failures: unregisterResult.failures,
        message: '카페24 쿠폰 자동 발급 중지에 일부 실패했습니다. 잠시 후 다시 시도해 주세요.',
      }, 502);
    }

    const newPack: CouponPackConfig = withPackDefaults({
      ...(prevPack ?? {}),
      enabled: false,
      state: 'unregistered' as CouponPackState,
      expire_days: mergedExpiry,
      design: mergedDesign,
      anim_mode: mergedAnim,
      size: mergedSize,
    });

    const newConfig = { ...existingConfig, pack: newPack };

    await c.env.DB
      .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
      .bind(JSON.stringify(newConfig), shopId)
      .run();

    // KV + 엣지 캐시 무효화
    await Promise.all([
      c.env.KV.delete(`widget_config:${shop.client_id}`),
      purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
    ]);

    return c.json({ ok: true, pack: newPack, items: [], failures: [] });
  }
});

// ─── POST /shops/:id/dev-seed-signups ──────────────────────
/**
 * 라이브 카운터 동작 검증을 위한 fake 가입자 데이터 시드 (스테이징 전용).
 *
 * 가드:
 *  - BASE_URL 에 '-dev.' 포함 시에만 허용 (프로덕션 차단)
 *  - 인증된 owner + Plus 플랜
 *
 * Body: { count?: number (기본 25, 1~200), recent_count?: number (기본 5, 최근 30분 내) }
 *  - 처음 recent_count 명: 최근 30분 내 분산 (toast 후보)
 *  - 나머지: 최근 7일 분산 (threshold daily_avg ≥3 충족용)
 *
 * users.name 은 ENCRYPTION_KEY 로 encrypt 처리해 toast 마스킹 표시까지 동작.
 */
dashboard.post('/shops/:id/dev-seed-signups', async (c) => {
  if (!c.env.BASE_URL || !c.env.BASE_URL.includes('-dev.')) {
    return c.json({ error: 'forbidden', message: 'dev seed는 스테이징 환경에서만 사용 가능합니다.' }, 403);
  }

  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (shop.plan !== 'plus') {
    return c.json({ error: 'plus_required', message: '라이브 카운터는 Plus 플랜에서만 동작합니다.' }, 403);
  }

  const body = await c.req.json<{ count?: number; recent_count?: number }>().catch(() => ({}));
  const totalCount = body.count ?? 25;
  const recentCount = body.recent_count ?? 5;

  if (totalCount < 1 || totalCount > 200) {
    return c.json({ error: 'invalid_count', message: 'count는 1~200 사이여야 합니다.' }, 400);
  }
  if (recentCount < 0 || recentCount > totalCount) {
    return c.json({ error: 'invalid_recent_count' }, 400);
  }

  const koreanFirst = ['김','이','박','최','정','강','조','윤','장','임'];
  const koreanRest = ['민수','지영','영희','철수','수진','서연','준호','지훈','하늘','다은'];

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const formatSqlite = (ms: number) => new Date(ms).toISOString().replace('T', ' ').slice(0, 19);

  let inserted = 0;
  for (let i = 0; i < totalCount; i++) {
    const userId = crypto.randomUUID();
    const shopUserId = crypto.randomUUID();
    const fakeName = `${koreanFirst[i % koreanFirst.length]}${koreanRest[i % koreanRest.length]}${i + 1}`;
    const encryptedName = await encrypt(fakeName, c.env.ENCRYPTION_KEY);

    let createdMs: number;
    if (i < recentCount) {
      createdMs = now - Math.floor(Math.random() * 25 * 60 * 1000); // 최근 0~25분
    } else {
      createdMs = sevenDaysAgo + Math.floor(Math.random() * (now - sevenDaysAgo - 30 * 60 * 1000));
    }
    const createdAt = formatSqlite(createdMs);

    try {
      await c.env.DB.batch([
        c.env.DB.prepare(
          'INSERT INTO users (user_id, provider, provider_uid, name, created_at) VALUES (?, ?, ?, ?, ?)',
        ).bind(userId, 'dev', `seed-${userId}`, encryptedName, createdAt),
        c.env.DB.prepare(
          'INSERT INTO shop_users (id, shop_id, user_id, status, created_at) VALUES (?, ?, ?, ?, ?)',
        ).bind(shopUserId, shopId, userId, 'active', createdAt),
      ]);
      inserted++;
    } catch (err) {
      console.warn('[dev-seed] insert 실패:', err);
    }
  }

  return c.json({ ok: true, inserted, total: totalCount, recent: recentCount });
});

// ─── PUT /shops/:id/coupon-pack-size ────────────────────────
/**
 * 쿠폰팩 size만 변경 (위젯 미리보기 토글에서 호출).
 * 기존 PUT /coupon-pack은 enabled 필수라 size 단독 변경 케이스에 부적합 → 분리.
 */
dashboard.put('/shops/:id/coupon-pack-size', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }
  if (shop.plan !== 'plus') {
    return c.json({ error: 'plus_required', message: '쿠폰팩은 Plus 플랜에서만 사용할 수 있습니다.' }, 403);
  }

  const body = await c.req.json<{ size?: CouponPackSize }>();
  const VALID_SIZES: CouponPackSize[] = ['lg', 'md', 'sm', 'xs'];
  if (!body.size || !VALID_SIZES.includes(body.size)) {
    return c.json({ error: 'invalid_size', message: `size는 ${VALID_SIZES.join(' | ')} 중 하나여야 합니다.` }, 400);
  }

  // 기존 coupon_config 파싱 후 pack.size 만 갱신.
  // 단 pack 자체가 미존재(쿠폰팩 미등록 상태)면 size만 박지 않는다 — 빈 객체로 박히면
  // resolveCouponPackState 가 'unregistered' 로 처리해 위젯엔 안 뜨지만 데이터 위생상 거부.
  let existing: CouponConfig & { pack?: CouponPackConfig } = { ...DEFAULT_COUPON_CONFIG };
  if (shop.coupon_config) {
    try { existing = { ...existing, ...JSON.parse(shop.coupon_config) }; } catch { /* keep default */ }
  }
  if (!existing.pack || (!existing.pack.state && !existing.pack.enabled)) {
    return c.json({ error: 'pack_not_registered', message: '쿠폰팩이 먼저 등록되어 있어야 합니다.' }, 409);
  }
  existing.pack = { ...existing.pack, size: body.size };

  await updateShop(c.env.DB, shopId, { coupon_config: JSON.stringify(existing) });
  // 위젯 캐시 무효화
  await Promise.all([
    c.env.KV.delete(`widget_config:${shop.client_id}`),
    purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
  ]);
  return c.json({ ok: true, size: body.size });
});

// ─── POST /shops/:id/coupon-pack/retry ──────────────────────
/**
 * 쿠폰팩 부분 실패 항목 재시도.
 *
 * - items 중 cafe24_coupon_no가 없는 항목만 카페24 재등록
 * - 성공 항목은 건드리지 않음
 * - Plus 플랜 전용 (Free → 403)
 *
 * Response: { ok, success, items, failures }
 */
dashboard.post('/shops/:id/coupon-pack/retry', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('id');

  const shop = await getShopById(c.env.DB, shopId);
  if (!shop || shop.owner_id !== ownerId) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (shop.plan !== 'plus') {
    return c.json(
      { error: 'plus_required', message: '쿠폰팩은 Plus 플랜에서만 사용할 수 있습니다.' },
      403,
    );
  }

  const result = await retryFailedPackItems(c.env, shop);

  if (result.items.length > 0 || result.failures.length === 0) {
    // 성공 또는 재시도 결과 반영 → coupon_config 갱신
    let existingConfig: CouponConfig & { pack?: CouponPackConfig } = { ...DEFAULT_COUPON_CONFIG };
    if (shop.coupon_config) {
      try {
        existingConfig = JSON.parse(shop.coupon_config) as CouponConfig & { pack?: CouponPackConfig };
      } catch { /* 무시 */ }
    }

    const prevPack = existingConfig.pack;
    const allSuccess = result.failures.length === 0;
    const newPack: CouponPackConfig = withPackDefaults({
      ...(prevPack ?? {}),
      state: (allSuccess && result.items.length > 0) ? 'active' : prevPack?.state ?? 'unregistered',
      items: result.items,
      registered_at: (allSuccess && result.items.length > 0) ? new Date().toISOString() : (prevPack?.registered_at ?? null),
    });

    await c.env.DB
      .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
      .bind(JSON.stringify({ ...existingConfig, pack: newPack }), shopId)
      .run();

    await Promise.all([
      c.env.KV.delete(`widget_config:${shop.client_id}`),
      purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
    ]);

    console.info(
      `[CouponPack] retry 완료: mall=${shop.mall_id}, 성공=${result.items.length}, 실패=${result.failures.length}`,
    );
  }

  return c.json({
    ok: true,
    success: result.success,
    items: result.items,
    failures: result.failures,
  });
});

export default dashboard;
