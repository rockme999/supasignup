/**
 * Cafe24 app lifecycle endpoints.
 *
 * GET  /api/cafe24/install   → App install start (HMAC verify → OAuth redirect)
 * GET  /api/cafe24/callback  → OAuth complete (token exchange → shop register → ScriptTag)
 * POST /api/cafe24/webhook   → App lifecycle webhooks (uninstall etc.)
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { generateId, generateSecret, timingSafeEqual } from '@supasignup/bg-core';
import { Cafe24Client, verifyAppLaunchHmac, verifyWebhookHmac, PAYMENT_COMPLETE, REFUND_COMPLETE } from '@supasignup/cafe24-client';
import { hashPassword } from '../services/password';
import { createToken } from '../services/jwt';
import { createShop, getShopByMallId, updateShop, softDeleteShop } from '../db/queries';
import { encrypt } from '@supasignup/bg-core';
import { issueCouponOnSignup } from '../services/coupon';
import { probeSsoType } from './dashboard';

// 카페24 회원 가입 이벤트
const MEMBER_JOINED = 90083;

/**
 * 쇼핑몰의 allowed_redirect_uris 목록을 생성.
 * 기본 cafe24 도메인 + 커스텀 도메인(있으면)의 SSO 콜백 URI 포함.
 */
function buildAllowedRedirectUris(mallId: string, shopDomain?: string, baseUrl?: string): string[] {
  const uris = [
    `https://${mallId}.cafe24api.com/api/v2/oauth/callback`,
    `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientCallback/sso/`,
    `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientCallback/sso1/`,
    `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientCallback/sso2/`,
  ];

  // 소셜 연동 완료 페이지 (마이페이지 팝업용)
  if (baseUrl) {
    uris.push(`${baseUrl}/link/complete`);
  }

  // 커스텀 도메인이 있고, 기본 cafe24.com 도메인과 다르면 추가
  if (shopDomain) {
    try {
      const host = new URL(shopDomain).host;
      if (!host.endsWith('.cafe24.com')) {
        uris.push(`https://${host}/Api/Member/Oauth2ClientCallback/sso/`);
        uris.push(`https://${host}/Api/Member/Oauth2ClientCallback/sso1/`);
        uris.push(`https://${host}/Api/Member/Oauth2ClientCallback/sso2/`);
      }
    } catch { /* invalid URL, skip */ }
  }

  return uris;
}

const cafe24 = new Hono<{ Bindings: Env }>();

// ─── GET /install ────────────────────────────────────────────
cafe24.get('/install', async (c) => {
  const mallId = c.req.query('mall_id');
  const hmac = c.req.query('hmac');
  const timestamp = c.req.query('timestamp');

  if (!mallId || !hmac || !timestamp) {
    return c.json({ error: 'missing_parameters' }, 400);
  }

  // Verify HMAC
  const queryString = c.req.url.split('?')[1] ?? '';
  const valid = await verifyAppLaunchHmac(queryString, hmac, c.env.CAFE24_CLIENT_SECRET);
  if (!valid) {
    return c.json({ error: 'invalid_hmac' }, 401);
  }

  // Check timestamp freshness (5 min)
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return c.json({ error: 'expired_timestamp' }, 400);
  }

  // Build Cafe24 OAuth URL
  const oauthUrl = new URL(`https://${mallId}.cafe24api.com/api/v2/oauth/authorize`);
  oauthUrl.searchParams.set('response_type', 'code');
  oauthUrl.searchParams.set('client_id', c.env.CAFE24_CLIENT_ID);
  oauthUrl.searchParams.set('redirect_uri', `${c.env.BASE_URL}/api/cafe24/callback`);
  oauthUrl.searchParams.set('scope', [
    // 1. 앱(Application) — Read+Write
    'mall.read_application',
    'mall.write_application',
    // 2. 상품분류(Category) — Read
    'mall.read_category',
    // 3. 상품(Product) — Read
    'mall.read_product',
    // 4. 판매분류(Collection) — Read (브랜드, 자체분류, 제조사, 트렌드)
    'mall.read_collection',
    // 5. 공급사(Supply) — Read
    'mall.read_supply',
    // 6. 개인화정보(Personal) — Read (장바구니, 관심상품, 좋아요)
    'mall.read_personal',
    // 7. 주문(Order) — Read
    'mall.read_order',
    // 8. 회원(Customer) — Read+Write
    'mall.read_customer',
    'mall.write_customer',
    // 9. 상점(Store) — Read+Write
    'mall.read_store',
    'mall.write_store',
    // 10. 프로모션(Promotion) — Read+Write (쿠폰, 혜택, 시리얼쿠폰)
    'mall.read_promotion',
    'mall.write_promotion',
    // 11. 매출통계(Salesreport) — Read
    'mall.read_salesreport',
    // 12. 개인정보(Privacy) — Read
    'mall.read_privacy',
    // 13. 배송(Shipping) — Read
    'mall.read_shipping',
  ].join(','));
  // CSRF 방어: state에 랜덤 토큰을 포함하고 KV에 저장 (TTL 600초)
  const csrfToken = generateSecret(16);
  const state = `${mallId}:${csrfToken}`;
  await c.env.KV.put(`cafe24_state:${csrfToken}`, JSON.stringify({ mall_id: mallId }), { expirationTtl: 600 });

  oauthUrl.searchParams.set('state', state);

  return c.redirect(oauthUrl.toString());
});

// ─── GET /callback ───────────────────────────────────────────
cafe24.get('/callback', async (c) => {
  try {
  const code = c.req.query('code');
  const stateParam = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: 'cafe24_auth_error', message: c.req.query('error_description') ?? error }, 400);
  }

  if (!code || !stateParam) {
    return c.json({ error: 'missing_parameters' }, 400);
  }

  // CSRF 검증: state를 mallId:csrfToken 형태로 파싱하여 KV에서 확인
  const colonIdx = stateParam.indexOf(':');
  if (colonIdx === -1) {
    return c.json({ error: 'invalid_state' }, 400);
  }
  const mallId = stateParam.slice(0, colonIdx);
  const csrfToken = stateParam.slice(colonIdx + 1);

  const storedState = await c.env.KV.get(`cafe24_state:${csrfToken}`, 'json') as { mall_id: string } | null;
  if (!storedState || storedState.mall_id !== mallId) {
    return c.json({ error: 'invalid_state' }, 400);
  }
  // 사용 후 즉시 삭제 (재사용 방지)
  await c.env.KV.delete(`cafe24_state:${csrfToken}`);

  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);

  // Exchange code for tokens
  const tokens = await client.exchangeCode(
    code,
    mallId,
    `${c.env.BASE_URL}/api/cafe24/callback`,
  );

  // Get store info
  const storeInfo = await client.getStoreInfo(mallId, tokens.access_token);

  // Create or update shop (include soft-deleted shops for reinstall)
  let shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');

  if (!shop) {
    // Check for soft-deleted shop (reinstall case)
    shop = await c.env.DB
      .prepare('SELECT * FROM shops WHERE mall_id = ? AND platform = ?')
      .bind(mallId, 'cafe24')
      .first();
  }

  if (shop) {
    // 토큰을 암호화하여 업데이트
    const encryptedAccessToken = await encrypt(tokens.access_token, c.env.ENCRYPTION_KEY);
    const encryptedRefreshToken = await encrypt(tokens.refresh_token, c.env.ENCRYPTION_KEY);

    // Update existing shop tokens + redirect URIs + restore if soft-deleted
    await updateShop(c.env.DB, shop.shop_id, {
      shop_name: storeInfo.shop_name || shop.shop_name,
      shop_url: storeInfo.shop_domain || shop.shop_url,
      platform_access_token: encryptedAccessToken,
      platform_refresh_token: encryptedRefreshToken,
      allowed_redirect_uris: JSON.stringify(buildAllowedRedirectUris(mallId, storeInfo.shop_domain, c.env.BASE_URL)),
    });
    // Restore soft-deleted shop
    if (shop.deleted_at) {
      await c.env.DB
        .prepare('UPDATE shops SET deleted_at = NULL WHERE shop_id = ?')
        .bind(shop.shop_id)
        .run();
    }
  } else {
    shop = await createShop(c.env.DB, {
      mall_id: mallId,
      platform: 'cafe24',
      shop_name: storeInfo.shop_name,
      shop_url: storeInfo.shop_domain,
      owner_id: await getOrCreateDefaultOwner(c.env.DB, mallId),
      platform_access_token: tokens.access_token,
      platform_refresh_token: tokens.refresh_token,
      allowed_redirect_uris: buildAllowedRedirectUris(mallId, storeInfo.shop_domain, c.env.BASE_URL),
    }, c.env.ENCRYPTION_KEY);
  }

  // Install/Update ScriptTag (widget)
  try {
    const existingTags = await client.listScriptTags(mallId, tokens.access_token);
    const widgetSrc = `${c.env.BASE_URL}/widget/buttons.js?shop=${shop.client_id}`;

    const existingTag = existingTags.find((tag) => tag.src.includes('/widget/buttons.js'));
    if (existingTag) {
      // 기존 태그 삭제 후 재생성 (display_location 업데이트를 위해)
      await client.deleteScriptTag(mallId, tokens.access_token, existingTag.script_no);
    }
    await client.createScriptTag(mallId, tokens.access_token, widgetSrc);
  } catch (err) {
    console.error('ScriptTag installation failed:', err);
    // Non-fatal: continue even if ScriptTag fails
  }

  // AI 쇼핑몰 정체성 자동 분석 (백그라운드)
  // 대시보드 기본 설정 페이지 진입 시 shop_identity가 없으면 자동 트리거됨
  // 콜백에서의 waitUntil AI 분석은 Cloudflare Workers 환경에서 안정적이지 않아 제거

  // 백그라운드 SSO 슬롯 프로빙 (앱 실행 시마다 자동 감지)
  c.executionCtx.waitUntil(
    probeSsoType(c.env, {
      shop_id: shop.shop_id,
      mall_id: shop.mall_id,
      client_id: shop.client_id,
      sso_type: shop.sso_type,
    }).catch((err) => console.error('[SSO Probe] failed:', err))
  );

  // Auto-login: issue JWT cookie for the owner so they can access the dashboard
  const token = await createToken(shop.owner_id, c.env.JWT_SECRET);
  const authCookie = `bg_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;
  const platformCookie = `bg_platform=1; Path=/; Secure; SameSite=Lax; Max-Age=604800`;

  // Redirect to dashboard (새 단일 쇼핑몰 구조)
  return new Response(null, {
    status: 302,
    headers: [
      ['Location', `${c.env.BASE_URL}/dashboard`],
      ['Set-Cookie', authCookie],
      ['Set-Cookie', platformCookie],
    ],
  });
  } catch (err: any) {
    console.error('Callback error:', err?.message, err?.stack);
    return c.json({
      error: 'callback_failed',
      message: err?.message ?? String(err),
      detail: err?.detail ?? null,
    }, 500);
  }
});

// ─── POST /webhook ───────────────────────────────────────────
cafe24.post('/webhook', async (c) => {
  const body = await c.req.text();

  // Log all headers and payload for debugging
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => { headers[k] = v; });
  console.info('Webhook headers:', JSON.stringify(headers));
  console.info('Webhook body:', body);

  // Auth: HMAC signature or x-api-key
  const signature = c.req.header('X-Cafe24-Hmac-SHA256');
  const apiKey = c.req.header('x-api-key');

  if (signature) {
    const valid = await verifyWebhookHmac(body, signature, c.env.CAFE24_CLIENT_SECRET);
    if (!valid) {
      console.error('HMAC verification failed');
      return c.json({ error: 'invalid_signature' }, 401);
    }
  } else if (apiKey) {
    const isValid = await timingSafeEqual(apiKey, c.env.CAFE24_WEBHOOK_API_KEY);
    if (!isValid) {
      console.error('API key mismatch');
      return c.json({ error: 'invalid_api_key' }, 401);
    }
  } else {
    console.error('No authentication header found');
    return c.json({ error: 'missing_authentication' }, 401);
  }

  const payload = JSON.parse(body) as { event_no?: number; resource?: Record<string, unknown> };
  const eventNo = payload.event_no;

  // App uninstall event (90001: expired, 90002: legacy uninstall, 90077: app deleted)
  if (eventNo === 90001 || eventNo === 90002 || eventNo === 90077) {
    const mallId = payload.resource?.mall_id as string | undefined;
    if (mallId) {
      const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
      if (shop) {
        await softDeleteShop(c.env.DB, shop.shop_id);
        console.info(`Shop soft-deleted: mall=${mallId}, shop_id=${shop.shop_id}`);
      }
    }
  }

  // ─── Payment complete (90157) ─────────────────────────────
  if (eventNo === PAYMENT_COMPLETE) {
    const orderId = payload.resource?.order_id as string | undefined;
    if (orderId) {
      // Find pending subscription by payment_id
      const sub = await c.env.DB
        .prepare("SELECT * FROM subscriptions WHERE payment_id = ? AND status = 'pending'")
        .bind(orderId)
        .first<{ id: string; shop_id: string; plan: string }>();

      if (sub) {
        // [M4] expires_at을 결제 확정 시점에 재계산
        const expiresAt = new Date();
        if (sub.plan === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }
        await c.env.DB.batch([
          c.env.DB.prepare("UPDATE subscriptions SET status = 'active', started_at = datetime('now'), expires_at = ? WHERE id = ?")
            .bind(expiresAt.toISOString(), sub.id),
          c.env.DB.prepare("UPDATE shops SET plan = ?, updated_at = datetime('now') WHERE shop_id = ?").bind(sub.plan, sub.shop_id),
        ]);
        console.info(`Payment complete: subscription=${sub.id}, shop=${sub.shop_id}, plan=${sub.plan}`);
      } else {
        // payment_id가 아직 저장되지 않은 경우를 대비하여 KV에 임시 저장 (5분 TTL)
        await c.env.KV.put(`webhook:payment:${orderId}`, JSON.stringify({
          order_id: orderId,
          event_no: eventNo,
          received_at: new Date().toISOString(),
        }), { expirationTtl: 300 });
        console.warn(`Payment webhook: no pending subscription for order_id=${orderId}, saved to KV for deferred processing`);
      }
    }
  }

  // ─── Member joined (90083) — 가입 쿠폰 자동 발급 ────────────
  if (eventNo === MEMBER_JOINED) {
    const mallId = payload.resource?.mall_id as string | undefined;
    const memberId = payload.resource?.member_id as string | undefined;

    if (mallId && memberId) {
      const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
      if (shop) {
        // waitUntil로 Worker 수명 연장 — 응답(200) 반환 후에도 쿠폰 발급 완료까지 실행
        c.executionCtx.waitUntil(
          issueCouponOnSignup(c.env, shop, memberId).catch((err) => {
            console.error(`[Coupon] 웹훅 쿠폰 발급 예외: mall=${mallId}, member=${memberId}`, err);
          })
        );
      }
    }
  }

  // ─── Refund complete (90159) ──────────────────────────────
  if (eventNo === REFUND_COMPLETE) {
    const orderId = payload.resource?.order_id as string | undefined;
    if (orderId) {
      const sub = await c.env.DB
        .prepare("SELECT * FROM subscriptions WHERE payment_id = ? AND status = 'active'")
        .bind(orderId)
        .first<{ id: string; shop_id: string }>();

      if (sub) {
        // 다른 active 구독이 남아있는지 확인 [M3]
        const otherActive = await c.env.DB
          .prepare("SELECT COUNT(*) as cnt FROM subscriptions WHERE shop_id = ? AND status = 'active' AND id != ?")
          .bind(sub.shop_id, sub.id)
          .first<{ cnt: number }>();

        const stmts = [
          c.env.DB.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?").bind(sub.id),
        ];
        // 다른 active가 없을 때만 plan을 free로 다운그레이드
        if (!otherActive || otherActive.cnt === 0) {
          stmts.push(c.env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(sub.shop_id));
        }
        await c.env.DB.batch(stmts);
        console.info(`Refund complete: subscription=${sub.id}, shop=${sub.shop_id}, reverted=${!otherActive || otherActive.cnt === 0}`);
      } else {
        console.warn(`Refund webhook: no active subscription for order_id=${orderId}`);
      }
    }
  }

  return c.json({ ok: true });
});

// ─── Helper: default owner for auto-install ──────────────────

async function getOrCreateDefaultOwner(db: D1Database, mallId: string): Promise<string> {
  const existing = await db
    .prepare("SELECT owner_id FROM owners WHERE email = ?")
    .bind(`${mallId}@cafe24.auto`)
    .first<{ owner_id: string }>();

  if (existing) return existing.owner_id;

  const ownerId = generateId();
  const randomPasswordHash = await hashPassword(generateSecret(32));
  await db
    .prepare(
      "INSERT INTO owners (owner_id, email, password_hash) VALUES (?, ?, ?)",
    )
    .bind(ownerId, `${mallId}@cafe24.auto`, randomPasswordHash)
    .run();

  return ownerId;
}

export default cafe24;
