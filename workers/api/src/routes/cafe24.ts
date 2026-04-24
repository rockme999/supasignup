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
import {
  Cafe24Client,
  verifyAppLaunchHmac,
  verifyWebhookHmac,
  APP_DELETED,
  APP_EXPIRED,
  MEMBER_JOINED,
  PAYMENT_COMPLETE,
  REFUND_COMPLETE,
} from '@supasignup/cafe24-client';
import { hashPassword } from '../services/password';
import { createToken } from '../services/jwt';
import { createShop, getShopByMallId, updateShop, softDeleteShop, upsertCafe24Member } from '../db/queries';
import { encrypt } from '@supasignup/bg-core';
import { issueCouponOnSignup } from '../services/coupon';
import { probeSsoType } from './dashboard';
import { purgeWidgetConfigCache } from './widget';

// 회원 이벤트 (90032: 신규 회원 가입) / 앱 라이프사이클 이벤트 상수는
// 모두 @supasignup/cafe24-client에서 공식 상수로 import
// APP_DELETED(90077): 쇼핑몰에 설치된 앱이 삭제된 경우 → soft delete
// APP_EXPIRED(90078): 쇼핑몰에 설치된 앱이 만료된 경우 → plan=free 다운그레이드
//                    (유저가 앱을 계속 쓸 의사가 있을 수 있음 → 로그인 기능은 무료로 유지)

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
      message: '인증 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }, 500);
  }
});

// ─── POST /webhook ───────────────────────────────────────────
cafe24.post('/webhook', async (c) => {
  const body = await c.req.text();

  // 헤더/바디 원문 console 로깅은 금지 — PII·시크릿 유출 위험.
  // 필요한 정보는 webhook_events 테이블에 redact된 상태로만 저장한다.
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((v, k) => { headers[k] = v; });

  // 모든 웹훅을 DB에 기록하기 위한 상태값 — 라우트 끝에서 단일 INSERT 수행
  const log: {
    event_no: number | null;
    mall_id: string | null;
    shop_id: string | null;
    auth_method: 'hmac' | 'api_key' | 'none';
    auth_valid: boolean;
    action: string | null;
    note: string | null;
  } = {
    event_no: null,
    mall_id: null,
    shop_id: null,
    auth_method: 'none',
    auth_valid: false,
    action: null,
    note: null,
  };
  const headersJson = JSON.stringify(redactWebhookHeaders(headers));

  // Auth: HMAC signature or x-api-key
  const signature = c.req.header('X-Cafe24-Hmac-SHA256');
  const apiKey = c.req.header('x-api-key');

  if (signature) {
    log.auth_method = 'hmac';
    const valid = await verifyWebhookHmac(body, signature, c.env.CAFE24_CLIENT_SECRET);
    if (!valid) {
      console.error('HMAC verification failed');
      log.action = 'auth_failed';
      log.note = 'HMAC verification failed';
      await recordWebhookEvent(c.env.DB, { ...log, headers: headersJson, payload: body });
      return c.json({ error: 'invalid_signature' }, 401);
    }
    log.auth_valid = true;
  } else if (apiKey) {
    log.auth_method = 'api_key';
    const isValid = await timingSafeEqual(apiKey, c.env.CAFE24_WEBHOOK_API_KEY);
    if (!isValid) {
      console.error('API key mismatch');
      log.action = 'auth_failed';
      log.note = 'API key mismatch';
      await recordWebhookEvent(c.env.DB, { ...log, headers: headersJson, payload: body });
      return c.json({ error: 'invalid_api_key' }, 401);
    }
    log.auth_valid = true;
  } else {
    console.error('No authentication header found');
    log.action = 'auth_failed';
    log.note = 'missing_authentication';
    await recordWebhookEvent(c.env.DB, { ...log, headers: headersJson, payload: body });
    return c.json({ error: 'missing_authentication' }, 401);
  }

  let payload: { event_no?: number; resource?: Record<string, unknown> };
  try {
    payload = JSON.parse(body);
  } catch {
    log.action = 'invalid_json';
    await recordWebhookEvent(c.env.DB, { ...log, headers: headersJson, payload: body });
    return c.json({ error: 'invalid_json' }, 400);
  }
  const eventNo = payload.event_no;
  log.event_no = typeof eventNo === 'number' ? eventNo : null;
  const mallIdFromPayload = payload.resource?.mall_id;
  log.mall_id = typeof mallIdFromPayload === 'string' ? mallIdFromPayload : null;

  // ─── 앱 만료 (APP_EXPIRED=90078): 구독 만료 → plan을 free로 다운그레이드 ───
  // shop을 soft-delete하지 않는다. 유저가 앱을 계속 쓸 수 있도록 core(소셜 로그인)는 유지,
  // Plus 기능만 비활성화한다. Plus 설정값은 DB에 보존 — 재결제 시 자동 복원됨.
  if (eventNo === APP_EXPIRED) {
    const mallId = payload.resource?.mall_id as string | undefined;
    if (mallId) {
      const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
      if (shop) {
        log.shop_id = shop.shop_id;
        await c.env.DB.batch([
          c.env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?")
            .bind(shop.shop_id),
          c.env.DB.prepare("UPDATE subscriptions SET status = 'expired' WHERE shop_id = ? AND status = 'active'")
            .bind(shop.shop_id),
        ]);
        // widget_config 캐시 무효화 (KV + 엣지) — 이후 요청부터 plan=free 반영
        await Promise.all([
          c.env.KV.delete(`widget_config:${shop.client_id}`),
          purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
        ]);
        console.info(`Shop expired (plan→free): mall=${mallId}, shop_id=${shop.shop_id}`);
        log.action = 'plan_downgraded';
      } else {
        log.action = 'shop_not_found';
      }
    } else {
      log.action = 'ignored';
      log.note = 'no mall_id in payload';
    }
  }

  // ─── 앱 삭제 (90077): 명시적 탈퇴 → soft delete ───
  if (eventNo === APP_DELETED) {
    const mallId = payload.resource?.mall_id as string | undefined;
    if (mallId) {
      const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
      if (shop) {
        log.shop_id = shop.shop_id;
        await softDeleteShop(c.env.DB, shop.shop_id);
        await Promise.all([
          c.env.KV.delete(`widget_config:${shop.client_id}`),
          purgeWidgetConfigCache(shop.client_id, c.env.BASE_URL),
        ]);
        console.info(`Shop soft-deleted (uninstall event=${eventNo}): mall=${mallId}, shop_id=${shop.shop_id}`);
        log.action = 'soft_deleted';
      } else {
        log.action = 'shop_not_found';
      }
    } else {
      log.action = 'ignored';
      log.note = 'no mall_id in payload';
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
        .first<{ id: string; shop_id: string; billing_cycle: string }>();

      if (sub) {
        log.shop_id = sub.shop_id;
        // [M4] expires_at을 결제 확정 시점에 재계산 — billing_cycle 기준으로 분기
        const expiresAt = new Date();
        if (sub.billing_cycle === 'monthly') {
          expiresAt.setMonth(expiresAt.getMonth() + 1);
        } else {
          expiresAt.setFullYear(expiresAt.getFullYear() + 1);
        }
        await c.env.DB.batch([
          c.env.DB.prepare("UPDATE subscriptions SET status = 'active', started_at = datetime('now'), expires_at = ? WHERE id = ?")
            .bind(expiresAt.toISOString(), sub.id),
          c.env.DB.prepare("UPDATE shops SET plan = 'plus', updated_at = datetime('now') WHERE shop_id = ?").bind(sub.shop_id),
        ]);
        console.info(`Payment complete: subscription=${sub.id}, shop=${sub.shop_id}, cycle=${sub.billing_cycle}`);
        log.action = 'payment_complete';
        log.note = `subscription=${sub.id}, cycle=${sub.billing_cycle}`;
      } else {
        // payment_id가 아직 저장되지 않은 경우를 대비하여 KV에 임시 저장 (5분 TTL)
        await c.env.KV.put(`webhook:payment:${orderId}`, JSON.stringify({
          order_id: orderId,
          event_no: eventNo,
          received_at: new Date().toISOString(),
        }), { expirationTtl: 300 });
        console.warn(`Payment webhook: no pending subscription for order_id=${orderId}, saved to KV for deferred processing`);
        log.action = 'payment_deferred';
        log.note = `no pending subscription for order_id=${orderId}`;
      }
    } else {
      log.action = 'ignored';
      log.note = 'no order_id in payload';
    }
  }

  // ─── Member joined (90083) — 가입 쿠폰 자동 발급 ────────────
  if (eventNo === MEMBER_JOINED) {
    const mallId = payload.resource?.mall_id as string | undefined;
    const memberId = payload.resource?.member_id as string | undefined;

    if (mallId && memberId) {
      const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
      if (shop) {
        log.shop_id = shop.shop_id;
        // cafe24_members 테이블에 회원 ID 저장 (upsert) — 실패해도 쿠폰 발급은 진행
        try {
          await upsertCafe24Member(c.env.DB, shop.shop_id, mallId, memberId);
        } catch (err) {
          console.error(`[Cafe24Member] upsert 실패: mall=${mallId}, member=${memberId}`, err);
        }

        // waitUntil로 Worker 수명 연장 — 응답(200) 반환 후에도 쿠폰 발급 완료까지 실행
        c.executionCtx.waitUntil(
          issueCouponOnSignup(c.env, shop, memberId).catch((err) => {
            console.error(`[Coupon] 웹훅 쿠폰 발급 예외: mall=${mallId}, member=${memberId}`, err);
          })
        );
        log.action = 'member_joined';
        log.note = `member_id=${memberId}`;
      } else {
        log.action = 'shop_not_found';
      }
    } else {
      log.action = 'ignored';
      log.note = 'no mall_id/member_id in payload';
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
        log.shop_id = sub.shop_id;
        // 다른 active 구독이 남아있는지 확인 [M3]
        const otherActive = await c.env.DB
          .prepare("SELECT COUNT(*) as cnt FROM subscriptions WHERE shop_id = ? AND status = 'active' AND id != ?")
          .bind(sub.shop_id, sub.id)
          .first<{ cnt: number }>();

        const stmts = [
          c.env.DB.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?").bind(sub.id),
        ];
        // 다른 active가 없을 때만 plan을 free로 다운그레이드
        const reverted = !otherActive || otherActive.cnt === 0;
        if (reverted) {
          stmts.push(c.env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(sub.shop_id));
        }
        await c.env.DB.batch(stmts);
        console.info(`Refund complete: subscription=${sub.id}, shop=${sub.shop_id}, reverted=${reverted}`);
        log.action = 'refund_complete';
        log.note = `subscription=${sub.id}, reverted=${reverted}`;
      } else {
        console.warn(`Refund webhook: no active subscription for order_id=${orderId}`);
        log.action = 'shop_not_found';
        log.note = `no active subscription for order_id=${orderId}`;
      }
    } else {
      log.action = 'ignored';
      log.note = 'no order_id in payload';
    }
  }

  // 처리되지 않은 event_no도 기록 (향후 새 이벤트 타입 대응)
  if (!log.action) {
    log.action = 'ignored';
    log.note = `unhandled event_no=${eventNo ?? 'null'}`;
  }

  await recordWebhookEvent(c.env.DB, { ...log, headers: headersJson, payload: body });
  return c.json({ ok: true });
});

// ─── Helper: 웹훅 이벤트 DB 기록 ────────────────────────────
async function recordWebhookEvent(
  db: D1Database,
  data: {
    event_no: number | null;
    mall_id: string | null;
    shop_id: string | null;
    auth_method: 'hmac' | 'api_key' | 'none';
    auth_valid: boolean;
    headers: string;
    payload: string;
    action: string | null;
    note: string | null;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO webhook_events
         (id, platform, event_no, mall_id, shop_id, auth_method, auth_valid, headers, payload, action, note)
         VALUES (?, 'cafe24', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        generateId(),
        data.event_no,
        data.mall_id,
        data.shop_id,
        data.auth_method,
        data.auth_valid ? 1 : 0,
        data.headers,
        redactWebhookPayload(data.event_no, data.payload),
        data.action,
        data.note,
      )
      .run();
  } catch (err) {
    // 기록 실패는 웹훅 응답을 막지 않도록 조용히 삼킴
    console.error('[Webhook] recordWebhookEvent failed:', err);
  }
}

// PIPA 준수 — 회원 PII를 포함하는 이벤트는 저장 전에 필드를 redact한다.
const PII_EVENT_NOS: ReadonlySet<number> = new Set([
  90032, // 회원 가입 — name/email/phone/birthday 등 포함
]);
const PII_RESOURCE_FIELDS: readonly string[] = [
  'name', 'nick_name', 'name_english', 'name_phonetic',
  'email', 'phone', 'cellphone',
  'birthday', 'gender', 'residence',
  'recommend_id', 'member_authentication',
];

function redactWebhookPayload(eventNo: number | null, body: string): string {
  if (eventNo === null || !PII_EVENT_NOS.has(eventNo)) return body;
  try {
    const payload = JSON.parse(body);
    if (payload && typeof payload === 'object' && payload.resource && typeof payload.resource === 'object') {
      for (const field of PII_RESOURCE_FIELDS) {
        if (field in payload.resource) payload.resource[field] = '[redacted]';
      }
    }
    return JSON.stringify(payload);
  } catch {
    return '[redacted-invalid-json]';
  }
}

// HMAC 시그니처·API 키·쿠키·Authorization 헤더는 저장 금지 (웹훅 위조 공격 재료).
const REDACTED_HEADER_NAMES: ReadonlySet<string> = new Set([
  'authorization',
  'cookie',
  'x-api-key',
  'x-cafe24-hmac-sha256',
]);

function redactWebhookHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    out[k] = REDACTED_HEADER_NAMES.has(k.toLowerCase()) ? '[redacted]' : v;
  }
  return out;
}

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
