/**
 * Billing API endpoints.
 *
 * POST /api/dashboard/billing/subscribe  → Create subscription order
 * GET  /api/dashboard/billing/return     → Payment return URL (popup close)
 */

import { Hono } from 'hono';
import type { Env, Subscription } from '@supasignup/bg-core';
import { PLAN_PRICES, generateId, encrypt } from '@supasignup/bg-core';
import { Cafe24Client } from '@supasignup/cafe24-client';
import { authMiddleware } from '../middleware/auth';
import { decryptShopTokens } from '../db/queries';

type BillingEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const billing = new Hono<BillingEnv>();

billing.use('*', authMiddleware);

// ─── POST /subscribe ────────────────────────────────────────

billing.post('/subscribe', async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{ plan: 'monthly' | 'yearly'; shop_id: string }>();

  if (!body.plan || !body.shop_id) {
    return c.json({ error: 'missing_parameters' }, 400);
  }

  if (body.plan !== 'monthly' && body.plan !== 'yearly') {
    return c.json({ error: 'invalid_plan' }, 400);
  }

  // Verify shop ownership
  const shop = await c.env.DB
    .prepare('SELECT shop_id, mall_id, plan, platform_access_token, platform_refresh_token FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(body.shop_id, ownerId)
    .first<{ shop_id: string; mall_id: string; plan: string; platform_access_token: string | null; platform_refresh_token: string | null }>();

  if (!shop) {
    return c.json({ error: 'shop_not_found' }, 404);
  }

  if (shop.plan !== 'free') {
    return c.json({ error: 'already_subscribed' }, 400);
  }

  if (!shop.platform_access_token) {
    return c.json({ error: 'no_platform_token', message: '카페24 앱 재설치가 필요합니다.' }, 400);
  }

  // 암호화된 토큰 복호화
  const tokens = await decryptShopTokens(shop as any, c.env.ENCRYPTION_KEY);
  if (!tokens.access_token) {
    return c.json({ error: 'no_platform_token', message: '카페24 앱 재설치가 필요합니다.' }, 400);
  }

  // 기존 pending 구독이 있으면 취소하고 새로 생성
  await c.env.DB
    .prepare("UPDATE subscriptions SET status = 'cancelled' WHERE shop_id = ? AND status = 'pending'")
    .bind(shop.shop_id)
    .run();

  const price = PLAN_PRICES[body.plan];
  const orderName = body.plan === 'monthly'
    ? '번개가입 월간 플랜 (₩29,900/월)'
    : '번개가입 연간 플랜 (₩329,900/년)';

  // Calculate expires_at
  const now = new Date();
  const expiresAt = new Date(now);
  if (body.plan === 'monthly') {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  } else {
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);
  }

  // Create pending subscription
  const subId = generateId();
  await c.env.DB
    .prepare(
      `INSERT INTO subscriptions (id, owner_id, shop_id, plan, status, expires_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .bind(subId, ownerId, shop.shop_id, body.plan, expiresAt.toISOString())
    .run();

  // Create Cafe24 appstore order
  try {
    const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);

    // Try with current token, refresh if needed
    let accessToken = tokens.access_token;
    let order: { order_id: string; confirmation_url: string };

    try {
      order = await client.createAppstoreOrder(
        shop.mall_id,
        accessToken,
        orderName,
        price,
        `${c.env.BASE_URL}/api/dashboard/billing/return`,
      );
    } catch (err: any) {
      // Token expired → refresh and retry
      if (err?.statusCode === 401 && tokens.refresh_token) {
        console.info(`Token expired for mall=${shop.mall_id}, refreshing...`);
        const newTokens = await client.refreshToken(shop.mall_id, tokens.refresh_token);
        accessToken = newTokens.access_token;

        // Save new tokens (암호화)
        const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
        const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
        await c.env.DB
          .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
          .bind(encAt, encRt, shop.shop_id)
          .run();

        order = await client.createAppstoreOrder(
          shop.mall_id,
          accessToken,
          orderName,
          price,
          `${c.env.BASE_URL}/api/dashboard/billing/return`,
        );
      } else {
        throw err;
      }
    }

    // Save payment_id (cafe24 order_id)
    await c.env.DB
      .prepare('UPDATE subscriptions SET payment_id = ? WHERE id = ?')
      .bind(order.order_id, subId)
      .run();

    // C3: 웹훅이 먼저 도착했는지 KV 확인 (레이스 컨디션 대비)
    const pendingWebhook = await c.env.KV.get(`webhook:payment:${order.order_id}`);
    if (pendingWebhook) {
      // 웹훅이 먼저 도착했었음 → 즉시 결제 완료 처리
      const now = new Date();
      const expiresAt = new Date(now);
      if (body.plan === 'monthly') {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE subscriptions SET status = 'active', started_at = datetime('now'), expires_at = ? WHERE id = ?")
          .bind(expiresAt.toISOString(), subId),
        c.env.DB.prepare("UPDATE shops SET plan = ?, updated_at = datetime('now') WHERE shop_id = ?")
          .bind(body.plan, shop.shop_id),
      ]);
      await c.env.KV.delete(`webhook:payment:${order.order_id}`);
      console.info(`Deferred payment processed: subscription=${subId}, order=${order.order_id}`);
    }

    return c.json({ confirmation_url: order.confirmation_url, subscription_id: subId });
  } catch (err: any) {
    console.error('Cafe24 order creation failed:', err);

    // Mark subscription as failed
    await c.env.DB
      .prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?")
      .bind(subId)
      .run();

    return c.json({ error: 'payment_failed', message: '결제 주문 생성에 실패했습니다.' }, 500);
  }
});

// ─── GET /return ────────────────────────────────────────────

billing.get('/return', (c) => {
  // This is the return URL after Cafe24 payment.
  // Actual plan change happens via webhook (event_no=90157).
  // Redirect back to billing page after short delay.
  return c.html(
    <html lang="ko">
      <head><title>결제 완료 - 번개가입</title></head>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f5">
        <div style="text-align:center;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
          <h2 style="margin-bottom:8px">결제가 완료되었습니다</h2>
          <p style="color:#64748b;font-size:14px">잠시 후 자동으로 닫힙니다.</p>
        </div>
        <script dangerouslySetInnerHTML={{__html: `
          if (window.opener) {
            window.opener.location.reload();
          }
          setTimeout(function() { window.close(); }, 2000);
          setTimeout(function() { window.location.href = '/dashboard/billing'; }, 3000);
        `}} />
      </body>
    </html>
  );
});

// ─── POST /cancel ───────────────────────────────────────────

billing.post('/cancel', async (c) => {
  const ownerId = c.get('ownerId');
  const body = await c.req.json<{ subscription_id: string }>();

  if (!body.subscription_id) {
    return c.json({ error: 'missing_parameters' }, 400);
  }

  // pending 상태만 취소 가능, 본인 소유 확인
  const result = await c.env.DB
    .prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ? AND owner_id = ? AND status = 'pending'")
    .bind(body.subscription_id, ownerId)
    .run();

  return c.json({ ok: true, cancelled: result.meta.changes > 0 });
});

// ─── GET /status/:subscription_id ───────────────────────────

billing.get('/status/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const subId = c.req.param('id');

  const sub = await c.env.DB
    .prepare('SELECT status, plan FROM subscriptions WHERE id = ? AND owner_id = ?')
    .bind(subId, ownerId)
    .first<{ status: string; plan: string }>();

  if (!sub) {
    return c.json({ error: 'not_found' }, 404);
  }

  return c.json({ status: sub.status, plan: sub.plan });
});

export default billing;
