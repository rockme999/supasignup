/**
 * Widget API endpoints.
 *
 * GET /api/widget/config?client_id=xxx → Return enabled providers for the shop widget
 * GET /api/widget/buttons.js?shop=xxx  → Serve widget JavaScript
 */

import { Hono } from 'hono';
import type { Env, ProviderName } from '@supasignup/bg-core';
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

  const config = {
    shop_id: shop.shop_id,
    client_id: shop.client_id,
    providers,
    base_url: c.env.BASE_URL,
    sso_callback_uri: ssoCallbackUri,
  };

  // Cache in KV
  await c.env.KV.put(cacheKey, JSON.stringify(config), {
    expirationTtl: WIDGET_CONFIG_TTL,
  });

  return c.json(config);
});

export default widget;
