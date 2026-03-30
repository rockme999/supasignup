/**
 * Widget API endpoints.
 *
 * GET /api/widget/config?client_id=xxx → Return enabled providers for the shop widget
 * GET /api/widget/buttons.js?shop=xxx  → Serve widget JavaScript
 */

import { Hono } from 'hono';
import type { Env, ProviderName, WidgetStyle } from '@supasignup/bg-core';
import { DEFAULT_WIDGET_STYLE } from '@supasignup/bg-core';
import { getShopByClientId, isOverFreeLimit } from '../db/queries';

const WIDGET_CONFIG_TTL = 300; // 5 minutes KV cache

const widget = new Hono<{ Bindings: Env }>();

// ─── GET /config ─────────────────────────────────────────────
widget.get('/config', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'missing_client_id' }, 400);
  }

  // Check KV cache first
  const cacheKey = `widget_config:${clientId}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) {
    return c.json(JSON.parse(cached));
  }

  // Look up shop
  const shop = await getShopByClientId(c.env.DB, clientId);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // Check billing limit
  const overLimit = await isOverFreeLimit(c.env.DB, shop);

  const providers: ProviderName[] = overLimit
    ? []
    : JSON.parse(shop.enabled_providers);

  // Build SSO callback URI from mall_id for Cafe24 platform
  const ssoCallbackUri = shop.platform === 'cafe24' && shop.mall_id
    ? `https://${shop.mall_id}.cafe24.com/Api/Member/OAuth2ClientCallback/sso/`
    : undefined;

  // Parse widget style (fall back to defaults)
  const style: WidgetStyle = shop.widget_style
    ? JSON.parse(shop.widget_style)
    : { ...DEFAULT_WIDGET_STYLE };

  const config = {
    client_id: shop.client_id,
    providers,
    base_url: c.env.BASE_URL,
    sso_callback_uri: ssoCallbackUri,
    style,
  };

  // Cache in KV
  await c.env.KV.put(cacheKey, JSON.stringify(config), {
    expirationTtl: WIDGET_CONFIG_TTL,
  });

  return c.json(config);
});

// ─── GET /hint ───────────────────────────────────────────────
// Store provider hint in KV so authorize can auto-select provider
// Called by widget before triggering Cafe24 SSO (cross-domain cookie won't work)
widget.get('/hint', async (c) => {
  const clientId = c.req.query('client_id');
  const provider = c.req.query('provider');
  if (!clientId || !provider) {
    return c.json({ error: 'missing_params' }, 400);
  }

  // Validate request origin against shop's mall_id to prevent unauthorized hint injection
  const shop = await getShopByClientId(c.env.DB, clientId);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // Check Origin or Referer header to verify request comes from shop's domain
  const originHeader = c.req.header('Origin') ?? c.req.header('Referer') ?? '';
  const mallId = shop.mall_id;

  let isValidOrigin = mallId ? originHeader.includes(mallId) : false;

  // Also allow shop_url hostname match as fallback
  if (!isValidOrigin && shop.shop_url) {
    try {
      const shopHostname = new URL(
        shop.shop_url.startsWith('http') ? shop.shop_url : `https://${shop.shop_url}`,
      ).hostname;
      isValidOrigin = originHeader.includes(shopHostname);
    } catch {
      // Ignore invalid shop_url
    }
  }

  if (!isValidOrigin) {
    return c.json({ error: 'forbidden' }, 403);
  }

  await c.env.KV.put(`provider_hint:${clientId}`, provider, { expirationTtl: 60 });

  // Verify KV write is readable (eventual consistency safeguard)
  const verified = await c.env.KV.get(`provider_hint:${clientId}`);
  if (verified !== provider) {
    // Retry once if not yet consistent
    await new Promise((r) => setTimeout(r, 50));
    await c.env.KV.put(`provider_hint:${clientId}`, provider, { expirationTtl: 60 });
  }

  return c.json({ ok: true });
});

export default widget;
