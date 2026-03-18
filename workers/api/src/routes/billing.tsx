/**
 * Billing API endpoints.
 *
 * POST /api/dashboard/billing/subscribe  → Create subscription order
 * GET  /api/dashboard/billing/return     → Payment return URL (popup close)
 */

import { Hono } from 'hono';
import type { Env, Subscription } from '@supasignup/bg-core';
import { PLAN_PRICES, generateId } from '@supasignup/bg-core';
import { Cafe24Client } from '@supasignup/cafe24-client';
import { authMiddleware } from '../middleware/auth';

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

  // Check for existing pending subscription
  const existing = await c.env.DB
    .prepare("SELECT id FROM subscriptions WHERE shop_id = ? AND status = 'pending'")
    .bind(body.shop_id)
    .first();

  if (existing) {
    // Cancel old pending
    await c.env.DB
      .prepare("UPDATE subscriptions SET status = 'cancelled' WHERE id = ?")
      .bind(existing.id)
      .run();
  }

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
    .bind(subId, ownerId, body.shop_id, body.plan, expiresAt.toISOString())
    .run();

  // Create Cafe24 appstore order
  try {
    const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);

    // Try with current token, refresh if needed
    let accessToken = shop.platform_access_token;
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
      if (err?.statusCode === 401 && shop.platform_refresh_token) {
        console.info(`Token expired for mall=${shop.mall_id}, refreshing...`);
        const newTokens = await client.refreshToken(shop.mall_id, shop.platform_refresh_token);
        accessToken = newTokens.access_token;

        // Save new tokens
        await c.env.DB
          .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
          .bind(newTokens.access_token, newTokens.refresh_token, shop.shop_id)
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
  // This page just closes the popup and refreshes the parent.
  return c.html(
    <html lang="ko">
      <head><title>결제 완료 - 번개가입</title></head>
      <body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;background:#f5f5f5">
        <div style="text-align:center;background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.08)">
          <h2 style="margin-bottom:8px">결제가 완료되었습니다</h2>
          <p style="color:#64748b;font-size:14px">잠시 후 자동으로 닫힙니다.</p>
        </div>
        <script>{`
          if (window.opener) {
            window.opener.postMessage('billing_complete', '*');
            window.opener.location.reload();
          }
          setTimeout(function() { window.close(); }, 1500);
        `}</script>
      </body>
    </html>
  );
});

export default billing;
