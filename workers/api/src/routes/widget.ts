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
const EDGE_CACHE_TTL = 300;   // 5 minutes edge cache (s-maxage)

/** 에지 캐시에 저장할 Response 생성 (브라우저 캐시 방지 + CORS 포함) */
function buildCacheResponse(body: string): Response {
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `no-store, s-maxage=${EDGE_CACHE_TTL}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** 에지 캐시 무효화 (대시보드에서 설정 변경 시 호출) */
export async function purgeWidgetConfigCache(clientId: string, baseUrl: string): Promise<void> {
  const cache = caches.default;
  const url = `${baseUrl}/api/widget/config?client_id=${clientId}`;
  await cache.delete(new Request(url));
}

const widget = new Hono<{ Bindings: Env }>();

// ─── GET /config ─────────────────────────────────────────────
widget.get('/config', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'missing_client_id' }, 400);
  }

  // 1차: CF Cache API (에지 캐시, 같은 PoP에서 ~1ms)
  const cache = caches.default;
  const cacheUrl = new URL(c.req.url);
  const cacheRequest = new Request(cacheUrl.toString());
  const edgeCached = await cache.match(cacheRequest);
  if (edgeCached) {
    // 에지 캐시에 저장된 Response를 그대로 반환
    // 저장 시 no-store + CORS 헤더 포함되어 있으므로 안전
    return new Response(edgeCached.body, {
      status: edgeCached.status,
      headers: edgeCached.headers,
    });
  }

  // 2차: KV cache (글로벌, ~50ms)
  const cacheKey = `widget_config:${clientId}`;
  const cached = await c.env.KV.get(cacheKey);
  if (cached) {
    // KV 히트 시 에지 캐시에도 저장 (다음 요청부터 에지에서 바로 응답)
    c.executionCtx.waitUntil(
      cache.put(cacheRequest, buildCacheResponse(cached))
    );
    return c.json(JSON.parse(cached), 200, {
      'Cache-Control': 'no-store',
    });
  }

  // Look up shop
  const shop = await getShopByClientId(c.env.DB, clientId);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // Check billing limit (병렬화 불가: shop 결과가 필요하므로 순차 실행)
  // 단, free 플랜이 아니면 D1 쿼리 자체를 건너뜀 (isOverFreeLimit 내부 early return)
  const overLimit = await isOverFreeLimit(c.env.DB, shop);

  const providers: ProviderName[] = overLimit
    ? []
    : JSON.parse(shop.enabled_providers);

  // Build SSO callback URI from mall_id for Cafe24 platform
  const ssoType = shop.sso_type || 'sso';
  const ssoCallbackUri = shop.platform === 'cafe24' && shop.mall_id
    ? `https://${shop.mall_id}.cafe24.com/Api/Member/OAuth2ClientCallback/${ssoType}/`
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
    sso_type: ssoType,
    style,
    plan: shop.plan,
    banner_config: shop.plan !== 'free' && shop.banner_config ? JSON.parse(shop.banner_config) : null,
    popup_config: shop.plan !== 'free' && shop.popup_config ? JSON.parse(shop.popup_config) : null,
    escalation_config: shop.plan !== 'free' && shop.escalation_config ? JSON.parse(shop.escalation_config) : null,
    // kakao_channel_id: free 플랜은 null, 유료 플랜은 shops 테이블 실제 값 반환
    kakao_channel_id: shop.plan !== 'free' ? (shop.kakao_channel_id || null) : null,
  };

  // Cache in KV + 에지 캐시 (waitUntil로 비동기화 — 응답 블로킹 없음)
  const configJson = JSON.stringify(config);
  c.executionCtx.waitUntil(
    Promise.all([
      c.env.KV.put(cacheKey, configJson, { expirationTtl: WIDGET_CONFIG_TTL }),
      cache.put(cacheRequest, buildCacheResponse(configJson)),
    ])
  );

  return c.json(config, 200, {
    'Cache-Control': 'no-store',
  });
});

// ─── POST /event ─────────────────────────────────────────────
widget.post('/event', async (c) => {
  // IP 기반 rate limit: 1분당 최대 60건 (page_view 추가로 상향)
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const rateKey = `rate:event:${ip}`;
  const current = await c.env.KV.get(rateKey);
  if (current && parseInt(current) >= 60) {
    return c.json({ error: 'rate_limit_exceeded' }, 429);
  }

  // body 파싱 (잘못된 JSON 방어)
  let body: {
    client_id: string;
    event_type: string;
    event_data?: Record<string, unknown>;
    page_url?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'invalid_json' }, 400);
  }

  if (!body.client_id || !body.event_type) {
    return c.json({ error: 'missing_params' }, 400);
  }

  // 유효한 이벤트 타입만 허용 (13종)
  const validTypes = [
    'banner_click',
    'banner_show',
    'popup_show',
    'popup_close',
    'popup_signup',
    'escalation_show',
    'escalation_click',
    'escalation_dismiss',
    'kakao_channel_show',
    'kakao_channel_click',
    'page_view',
    'oauth_start',
    'signup_complete',
  ];
  if (!validTypes.includes(body.event_type)) {
    return c.json({ error: 'invalid_event_type' }, 400);
  }

  // shop 조회
  const shop = await getShopByClientId(c.env.DB, body.client_id);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // funnel_events 테이블에 D1으로 영구 저장
  const eventId = crypto.randomUUID();
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      'INSERT INTO funnel_events (id, shop_id, event_type, event_data, page_url) VALUES (?, ?, ?, ?, ?)'
    )
      .bind(eventId, shop.shop_id, body.event_type, JSON.stringify(body.event_data || {}), body.page_url || '')
      .run(),
  );

  // rate limit 카운터 증가 (비동기, 응답 블로킹 없음)
  c.executionCtx.waitUntil(
    c.env.KV.put(rateKey, String((parseInt(current || '0')) + 1), { expirationTtl: 60 })
  );

  return c.json({ ok: true });
});

// ─── GET /hint ───────────────────────────────────────────────
// Store provider hint in KV so authorize can auto-select provider
// Called by widget before triggering Cafe24 SSO (cross-domain cookie won't work)
//
// 성능 최적화: D1 쿼리 대신 widget_config KV 캐시로 Origin 검증.
// widget/config는 위젯 로딩 시 hint보다 항상 먼저 호출되므로 캐시가 존재함.
// 캐시 미스 시에만 D1 fallback.
widget.get('/hint', async (c) => {
  const clientId = c.req.query('client_id');
  const provider = c.req.query('provider');
  if (!clientId || !provider) {
    return c.json({ error: 'missing_params' }, 400);
  }

  // Origin 검증: KV 캐시 → D1 fallback
  const originHeader = c.req.header('Origin') ?? c.req.header('Referer') ?? '';
  let isValidOrigin = false;

  // KV 캐시에서 mall_id 추출 시도 (D1 쿼리 회피)
  const cacheKey = `widget_config:${clientId}`;
  const cached = await c.env.KV.get(cacheKey);

  if (cached) {
    const config = JSON.parse(cached);
    // sso_callback_uri에서 mall_id 추출: https://{mall_id}.cafe24.com/...
    if (config.sso_callback_uri) {
      const match = config.sso_callback_uri.match(/https:\/\/([^.]+)\.cafe24\.com/);
      if (match) isValidOrigin = originHeader.includes(match[1]);
    }
  }

  // KV 캐시 미스 또는 mall_id 매칭 실패 → D1 fallback (커스텀 도메인 대응)
  if (!isValidOrigin) {
    const shop = await getShopByClientId(c.env.DB, clientId);
    if (!shop) {
      return c.json({ error: 'invalid_client_id' }, 404);
    }

    if (shop.mall_id && originHeader.includes(shop.mall_id)) {
      isValidOrigin = true;
    } else if (shop.shop_url) {
      try {
        const shopHostname = new URL(
          shop.shop_url.startsWith('http') ? shop.shop_url : `https://${shop.shop_url}`,
        ).hostname;
        isValidOrigin = originHeader.includes(shopHostname);
      } catch {
        // Ignore invalid shop_url
      }
    }
  }

  if (!isValidOrigin) {
    return c.json({ error: 'forbidden' }, 403);
  }

  // visitor_id/device도 함께 저장 (funnel_events signup_complete 기록용)
  const visitorId = c.req.query('visitor_id') || '';
  const device = c.req.query('device') || '';

  // KV PUT을 await로 블로킹 — hint가 KV에 확실히 쓰인 후 응답
  // 위젯이 응답을 받아야 MemberAction.snsLogin()을 호출하므로,
  // hint가 KV에 없으면 authorize가 이전 프로바이더를 사용하게 됨
  await c.env.KV.put(`provider_hint:${clientId}`, JSON.stringify({ provider, visitor_id: visitorId, device }), { expirationTtl: 120 });

  return c.json({ ok: true });
});

export default widget;
