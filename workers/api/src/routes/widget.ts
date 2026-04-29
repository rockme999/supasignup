/**
 * Widget API endpoints.
 *
 * GET /api/widget/config?client_id=xxx → Return enabled providers for the shop widget
 * GET /api/widget/buttons.js?shop=xxx  → Serve widget JavaScript
 */

import { Hono } from 'hono';
import type { Env, ProviderName, WidgetStyle } from '@supasignup/bg-core';
import { DEFAULT_WIDGET_STYLE, safeParseStringArray, safeParseJsonObject, decrypt } from '@supasignup/bg-core';
import { getShopByClientId, isOverFreeLimit } from '../db/queries';
import { maskNamePublic } from '../utils/mask';
import type { CouponPackConfig } from '../services/coupon-pack';
import { resolveCouponPackState } from '../services/coupon-pack';
import type { CouponConfig } from '../services/coupon';

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
    : (safeParseStringArray(shop.enabled_providers, `widget.enabled_providers shop_id=${shop.shop_id}`) as ProviderName[]);

  // Build SSO callback URI from mall_id for Cafe24 platform
  const ssoType = shop.sso_type || 'sso';
  const ssoCallbackUri = shop.platform === 'cafe24' && shop.mall_id
    ? `https://${shop.mall_id}.cafe24.com/Api/Member/OAuth2ClientCallback/${ssoType}/`
    : undefined;

  // Parse widget style (fall back to defaults)
  const parsedStyle = safeParseJsonObject<WidgetStyle>(shop.widget_style, null, `widget.widget_style shop_id=${shop.shop_id}`);
  const style: WidgetStyle = parsedStyle ?? { ...DEFAULT_WIDGET_STYLE };

  // Plus 프리셋 보안: presetTier === 'plus' 이지만 shop.plan === 'free' 이면
  // Free 기본 프리셋으로 fallback (운영자가 widget_style을 임의 수정해도 Plus 효과 차단)
  const PLUS_PRESETS = new Set(['glassmorphism', 'neon-glow', 'liquid-glass', 'gradient-flow', 'soft-shadow', 'pulse']);
  if (shop.plan === 'free' && PLUS_PRESETS.has(style.preset)) {
    style.preset = 'default';
    style.presetTier = 'free';
  }

  const config = {
    client_id: shop.client_id,
    providers,
    base_url: c.env.BASE_URL,
    sso_callback_uri: ssoCallbackUri,
    sso_type: ssoType,
    style,
    plan: shop.plan,
    banner_config: shop.plan !== 'free'
      ? safeParseJsonObject(shop.banner_config, null, `widget.banner_config shop_id=${shop.shop_id}`)
      : null,
    popup_config: shop.plan !== 'free'
      ? safeParseJsonObject(shop.popup_config, null, `widget.popup_config shop_id=${shop.shop_id}`)
      : null,
    escalation_config: shop.plan !== 'free'
      ? safeParseJsonObject(shop.escalation_config, null, `widget.escalation_config shop_id=${shop.shop_id}`)
      : null,
    // kakao_channel_id: free 플랜은 null, 유료 플랜은 shops 테이블 실제 값 반환
    kakao_channel_id: shop.plan !== 'free' ? (shop.kakao_channel_id || null) : null,
    // exit_intent_config: Plus 플랜만 반환 (쿠폰 게이트 설정)
    exit_intent_config: shop.plan !== 'free'
      ? safeParseJsonObject(shop.exit_intent_config, null, `widget.exit_intent_config shop_id=${shop.shop_id}`)
      : null,
    // coupon_config: exit_intent 모달에서 쿠폰 레이블 표시용 (민감 정보 제외한 부분 반환)
    coupon_config: shop.plan !== 'free'
      ? safeParseJsonObject(shop.coupon_config, null, `widget.coupon_config shop_id=${shop.shop_id}`)
      : null,
    // coupon_pack: Plus 플랜 쿠폰팩 카드 위젯 표시용
    coupon_pack: buildCouponPackField(shop.plan, shop.coupon_config ?? null),
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
// 유효한 이벤트 타입 (21종) — 모듈 상수로 빼서 allocation 회피
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'banner_click', 'banner_show',
  'popup_show', 'popup_close', 'popup_signup',
  'escalation_show', 'escalation_click', 'escalation_dismiss',
  'kakao_channel_show', 'kakao_channel_click',
  'page_view', 'oauth_start', 'signup_complete',
  // R4 W1 Plus 전환 funnel 이벤트 4종
  'widget_style.preview_plus_preset',       // Plus 프리셋 클릭 (미리보기 적용)
  'widget_style.save_attempt_locked',        // 저장 클릭 시 결제 모달 노출
  'billing.upgrade_modal_shown',             // 결제 모달 노출
  'billing.upgrade_completed_via_design_preview', // 결제 모달 → 결제 완료
  // R4 W2 Smart trigger + Exit-intent funnel 이벤트 4종
  'widget.exit_intent_shown',               // Exit-intent 모달 노출
  'widget.exit_intent_signup',              // Exit-intent 모달에서 가입 완료
  'widget.exit_intent_dismissed',           // Exit-intent 모달 그냥 닫기
  'widget.scroll_trigger_fired',            // Smart trigger (scroll-depth) 발동
  // R4 W3 Cycle2 라이브 가입자 카운터 funnel 이벤트 2종
  'widget.live_counter_shown',              // 라이브 카운터 sticky UI 노출
  'widget.live_toast_shown',               // 가입 토스트 1건 노출
  // Phase C 쿠폰팩 카드 funnel 이벤트 2종
  'widget.coupon_pack_shown',              // 쿠폰팩 카드 첫 노출 (이탈 팝업 내)
  'widget.coupon_pack_clicked',            // 쿠폰팩 CTA 클릭
  // Phase D-1/D-4 exit-intent 통합 + Free 업셀 funnel 이벤트 2종
  'widget.plus_upsell_shown',              // Free 사용자에게 업그레이드 카드 노출
  'widget.plus_upsell_clicked',            // Plus 업셀 CTA 클릭
]);
const MAX_PAGE_URL_LEN = 2048;
const MAX_EVENT_DATA_JSON_LEN = 4096;

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

  if (!VALID_EVENT_TYPES.has(body.event_type)) {
    return c.json({ error: 'invalid_event_type' }, 400);
  }

  // 페이로드 크기 제한 — 무제한 INSERT/스토리지 어뷰즈 방어
  if (body.page_url && body.page_url.length > MAX_PAGE_URL_LEN) {
    return c.json({ error: 'page_url_too_long' }, 400);
  }
  const eventData = body.event_data || {};
  const eventDataJson = JSON.stringify(eventData);
  if (eventDataJson.length > MAX_EVENT_DATA_JSON_LEN) {
    return c.json({ error: 'event_data_too_large' }, 400);
  }

  // shop 조회
  const shop = await getShopByClientId(c.env.DB, body.client_id);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // Origin 검증 — 남의 쇼핑몰 client_id로 가짜 이벤트 주입 차단
  // (가장 악용이 쉬운 벡터: 경쟁사가 타겟 대시보드·AI 브리핑을 오염)
  // 카페24 기본 도메인({mall_id}.cafe24.com) 또는 shop.shop_url에 등록된 커스텀 도메인만 허용.
  const originHeader = c.req.header('Origin') ?? c.req.header('Referer') ?? '';
  if (originHeader && !isOriginAllowedForShop(originHeader, shop.mall_id, shop.shop_url, shop.platform)) {
    return c.json({ error: 'origin_not_allowed' }, 403);
  }

  // funnel_events 테이블에 D1으로 영구 저장
  const eventId = crypto.randomUUID();
  const visitorId = (eventData as Record<string, unknown>).visitor_id as string | undefined || null;
  c.executionCtx.waitUntil(
    c.env.DB.prepare(
      'INSERT INTO funnel_events (id, shop_id, event_type, event_data, page_url, visitor_id) VALUES (?, ?, ?, ?, ?, ?)'
    )
      .bind(eventId, shop.shop_id, body.event_type, eventDataJson, body.page_url || '', visitorId)
      .run(),
  );

  // rate limit 카운터 증가 (비동기, 응답 블로킹 없음)
  c.executionCtx.waitUntil(
    c.env.KV.put(rateKey, String((parseInt(current || '0')) + 1), { expirationTtl: 60 })
  );

  return c.json({ ok: true });
});

// ─── coupon_pack 응답 필드 빌더 ──────────────────────────────────
// state === 'active'이면 위젯에 표시할 메타데이터를 반환, 그 외는 null.
function buildCouponPackField(
  plan: string,
  couponConfigRaw: string | null,
): {
  active: boolean;
  design: string;
  anim_mode: boolean;
  total_amount: number;
  items_count: number;
} | null {
  // Plus 플랜이 아니면 노출하지 않음
  if (plan === 'free' || !couponConfigRaw) return null;

  let pack: CouponPackConfig | null = null;
  try {
    const parsed = JSON.parse(couponConfigRaw) as CouponConfig & { pack?: CouponPackConfig };
    pack = parsed.pack ?? null;
  } catch {
    return null;
  }

  if (!pack) return null;

  const state = resolveCouponPackState(pack);
  if (state !== 'active') {
    return { active: false, design: 'brand', anim_mode: true, total_amount: 0, items_count: 0 };
  }

  // total_amount: items 의 discount 합계
  const totalAmount = (pack.items ?? []).reduce((sum, item) => sum + (item.discount ?? 0), 0);
  const itemsCount = (pack.items ?? []).length;

  return {
    active: true,
    design: pack.design ?? 'brand',
    anim_mode: pack.anim_mode !== false,
    total_amount: totalAmount > 0 ? totalAmount : 55000,
    items_count: itemsCount > 0 ? itemsCount : 5,
  };
}

// Origin/Referer를 파싱해 shop에 허용된 host인지 판정.
// - 카페24: {mall_id}.cafe24.com (PC) / m.{mall_id}.cafe24.com (모바일) 허용
// - shop_url(custom 도메인)이 설정된 경우 해당 host도 허용
// - 둘 다 매칭 안 되면 false
function isOriginAllowedForShop(
  originHeader: string,
  mallId: string,
  shopUrl: string | null,
  platform: string,
): boolean {
  let host: string;
  try {
    host = new URL(originHeader).host.toLowerCase();
  } catch {
    return false;
  }

  if (platform === 'cafe24' && mallId) {
    const m = mallId.toLowerCase();
    if (host === `${m}.cafe24.com` || host === `m.${m}.cafe24.com`) return true;
  }

  if (shopUrl) {
    try {
      const shopHost = new URL(shopUrl).host.toLowerCase();
      if (shopHost && (host === shopHost || host === `m.${shopHost}`)) return true;
    } catch { /* invalid shop_url, fall through */ }
  }

  return false;
}

// ─── GET /live-counter ───────────────────────────────────────
// Plus 전용 라이브 가입자 카운터 데이터 반환.
// threshold 미달(일 평균 < 3명) 또는 config.enabled=false 시 showCounter/showToast=false.
widget.get('/live-counter', async (c) => {
  const clientId = c.req.query('client_id');
  if (!clientId) {
    return c.json({ error: 'missing_client_id' }, 400);
  }

  const shop = await getShopByClientId(c.env.DB, clientId);
  if (!shop) {
    return c.json({ error: 'invalid_client_id' }, 404);
  }

  // Plus 전용
  if (shop.plan === 'free') {
    return c.json({ showCounter: false, showToast: false, todayCount: 0, recentSignups: [] });
  }

  // live_counter_config 파싱
  const lcConfig = safeParseJsonObject<{
    enabled?: boolean;
    position?: string;
    show_toast?: boolean;
    show_counter?: boolean;
  }>(shop.live_counter_config ?? null, null, `live-counter.live_counter_config shop_id=${shop.shop_id}`);

  // enabled=false 이면 즉시 비활성
  if (lcConfig?.enabled === false) {
    return c.json({ showCounter: false, showToast: false, todayCount: 0, recentSignups: [] });
  }

  const position = lcConfig?.position ?? 'bottom-right';
  const showToastCfg = lcConfig?.show_toast !== false;
  const showCounterCfg = lcConfig?.show_counter !== false;

  // KST 자정 기준 오늘 시작 (UTC+9)
  const nowUtc = new Date();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(nowUtc.getTime() + kstOffset);
  const kstToday = kstNow.toISOString().slice(0, 10); // YYYY-MM-DD KST
  const todayStartUtc = new Date(`${kstToday}T00:00:00+09:00`).toISOString();

  // 병렬 쿼리: 오늘 가입 수 + 최근 30분 가입자 5명 + 7일 평균 threshold
  const [todayResult, recentResult, avgResult] = await Promise.all([
    // 오늘(KST) 가입 수
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM shop_users WHERE shop_id = ? AND created_at >= ?`
    ).bind(shop.shop_id, todayStartUtc).first<{ cnt: number }>(),

    // 최근 30분 가입자 5명 (user_id + created_at, 이름은 users 테이블에서 join)
    c.env.DB.prepare(
      `SELECT su.created_at, u.name, su.user_id
       FROM shop_users su
       JOIN users u ON su.user_id = u.user_id
       WHERE su.shop_id = ? AND su.created_at >= datetime('now', '-30 minutes')
         AND u.name IS NOT NULL
       ORDER BY su.created_at DESC LIMIT 5`
    ).bind(shop.shop_id).all<{ created_at: string; name: string; user_id: string }>(),

    // 7일 일 평균 가입자 수 (threshold: ≥3)
    c.env.DB.prepare(
      `SELECT COUNT(*) * 1.0 / 7 as daily_avg
       FROM shop_users WHERE shop_id = ? AND created_at >= datetime('now', '-7 days')`
    ).bind(shop.shop_id).first<{ daily_avg: number }>(),
  ]);

  const todayCount = todayResult?.cnt ?? 0;
  const dailyAvg = avgResult?.daily_avg ?? 0;

  // threshold 미달 → 비활성
  if (dailyAvg < 3) {
    return c.json({ showCounter: false, showToast: false, todayCount: 0, recentSignups: [] });
  }

  // 최근 가입자 이름 복호화 + 마스킹 + timeAgo 계산
  const recentRaw = recentResult.results ?? [];
  const recentSignups: Array<{ name: string; timeAgo: string }> = [];
  const nowMs = Date.now();
  for (const row of recentRaw) {
    try {
      const plainName = await decrypt(row.name, c.env.ENCRYPTION_KEY);
      const masked = maskNamePublic(plainName);
      // timeAgo: "n초 전" / "n분 전"
      const diffSec = Math.max(0, Math.floor((nowMs - new Date(row.created_at).getTime()) / 1000));
      const timeAgo = diffSec < 60
        ? `${diffSec}초 전`
        : `${Math.floor(diffSec / 60)}분 전`;
      recentSignups.push({ name: masked, timeAgo });
    } catch {
      // 복호화 실패 시 skip
    }
  }

  return c.json({
    todayCount,
    recentSignups,
    showCounter: showCounterCfg,
    showToast: showToastCfg && recentSignups.length > 0,
    position,
  }, 200, {
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
  });
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

  const hintKey = `provider_hint:${clientId}`;
  const hintValue = JSON.stringify({ provider, visitor_id: visitorId, device });

  // KV edge cache(기본 60초) 레이스 회피: delete로 캐시 무효화 후 put.
  // 이전 프로바이더가 엣지 캐시에 남아 다른 프로바이더 클릭 시 재사용되는 버그 대응.
  await c.env.KV.delete(hintKey);
  await c.env.KV.put(hintKey, hintValue, { expirationTtl: 120 });

  // 사용자별 쿠키(강일관성) — /oauth/authorize가 쿠키를 우선 읽음.
  // 공유 KV 키의 레이스를 원천 차단. Safari ITP 환경은 쿠키 차단 가능 → KV 폴백.
  const cookieValue = encodeURIComponent(hintValue);
  c.header('Set-Cookie', `bg_hint=${cookieValue}; Path=/; Max-Age=120; SameSite=None; Secure`);

  return c.json({ ok: true });
});

export default widget;
