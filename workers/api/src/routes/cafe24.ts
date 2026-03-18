/**
 * Cafe24 app lifecycle endpoints.
 *
 * GET  /api/cafe24/install   → App install start (HMAC verify → OAuth redirect)
 * GET  /api/cafe24/callback  → OAuth complete (token exchange → shop register → ScriptTag)
 * POST /api/cafe24/webhook   → App lifecycle webhooks (uninstall etc.)
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { generateId, generateSecret } from '@supasignup/bg-core';
import { Cafe24Client, verifyAppLaunchHmac, verifyWebhookHmac } from '@supasignup/cafe24-client';
import { hashPassword } from '../services/password';
import { createToken } from '../services/jwt';
import { createShop, getShopByMallId, updateShop, softDeleteShop } from '../db/queries';

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
    'mall.read_store',
    'mall.write_store',
    'mall.read_customer',
    'mall.write_customer',
    'mall.read_application',
    'mall.write_application',
  ].join(','));
  oauthUrl.searchParams.set('state', mallId);

  return c.redirect(oauthUrl.toString());
});

// ─── GET /callback ───────────────────────────────────────────
cafe24.get('/callback', async (c) => {
  const code = c.req.query('code');
  const mallId = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: 'cafe24_auth_error', message: c.req.query('error_description') ?? error }, 400);
  }

  if (!code || !mallId) {
    return c.json({ error: 'missing_parameters' }, 400);
  }

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
    // Update existing shop tokens + restore if soft-deleted
    await updateShop(c.env.DB, shop.shop_id, {
      shop_name: storeInfo.shop_name || shop.shop_name,
      shop_url: storeInfo.shop_domain || shop.shop_url,
      platform_access_token: tokens.access_token,
      platform_refresh_token: tokens.refresh_token,
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
      allowed_redirect_uris: [
        `https://${mallId}.cafe24api.com/api/v2/oauth/callback`,
        `https://${mallId}.cafe24.com/Api/Member/Oauth2ClientCallback/sso/`,
      ],
    });
  }

  // Install ScriptTag (widget)
  try {
    const existingTags = await client.listScriptTags(mallId, tokens.access_token);
    const widgetSrc = `${c.env.BASE_URL}/widget/buttons.js?shop=${shop.client_id}`;

    const alreadyInstalled = existingTags.some((tag) => tag.src.includes('/widget/buttons.js'));
    if (!alreadyInstalled) {
      await client.createScriptTag(mallId, tokens.access_token, widgetSrc);
    }
  } catch (err) {
    console.error('ScriptTag installation failed:', err);
    // Non-fatal: continue even if ScriptTag fails
  }

  // Note: Webhook (app_uninstalled) is registered manually in Cafe24 Developer Center
  // URL: {BASE_URL}/api/cafe24/webhook

  // Auto-login: issue JWT cookie for the owner so they can access the dashboard
  const token = await createToken(shop.owner_id, c.env.JWT_SECRET);
  const cookie = `bg_token=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`;

  // Redirect to dashboard setup page
  return new Response(null, {
    status: 302,
    headers: {
      'Location': `${c.env.BASE_URL}/dashboard/shops/${shop.shop_id}/setup`,
      'Set-Cookie': cookie,
    },
  });
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
    if (apiKey !== c.env.CAFE24_WEBHOOK_API_KEY) {
      console.error(`API key mismatch: received=${apiKey}`);
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

  return c.json({ ok: true, debug_event_no: eventNo, debug_payload_keys: Object.keys(payload) });
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
