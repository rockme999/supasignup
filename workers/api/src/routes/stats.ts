/**
 * Statistics and Billing API endpoints.
 *
 * Stats (auth required):
 *   GET /api/dashboard/stats          - Aggregated stats for all shops
 *   GET /api/dashboard/stats/:shop_id - Per-shop stats
 *
 * Billing (auth required):
 *   GET /api/dashboard/billing        - Billing status for all shops
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT, FREE_PLAN_WARN_THRESHOLD } from '@supasignup/bg-core';
import { authMiddleware } from '../middleware/auth';
import { buildSinceExpr, verifyShopOwnership } from '../db/stats-utils';

type StatsEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const stats = new Hono<StatsEnv>();

stats.use('*', authMiddleware);

// ─── GET /stats ──────────────────────────────────────────────
stats.get('/stats', async (c) => {
  const ownerId = c.get('ownerId');
  const shopIdFilter = c.req.query('shop_id') || null;
  const period = c.req.query('period') || null; // today, 7d, 30d, month

  // Build date filter
  let dateFilter = '';
  let dateParam: string | null = null;
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  if (period === 'today') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = today;
  } else if (period === '7d') {
    dateFilter = ' AND ls.created_at >= ?';
    const d7 = new Date();
    d7.setUTCDate(d7.getUTCDate() - 7);
    dateParam = d7.toISOString().slice(0, 10);
  } else if (period === '30d') {
    dateFilter = ' AND ls.created_at >= ?';
    const d30 = new Date();
    d30.setUTCDate(d30.getUTCDate() - 30);
    dateParam = d30.toISOString().slice(0, 10);
  } else if (period === 'month') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = `${yearMonth}-01`;
  }

  const shopFilter = shopIdFilter ? ' AND ls.shop_id = ?' : '';

  // Build params array
  const baseParams: (string | null)[] = [ownerId];
  if (dateParam) baseParams.push(dateParam);
  if (shopIdFilter) baseParams.push(shopIdFilter);

  // Today / month params
  const todayParams: (string | null)[] = [ownerId, today];
  if (shopIdFilter) todayParams.push(shopIdFilter);
  const monthParams: (string | null)[] = [ownerId, `${yearMonth}-01`];
  if (shopIdFilter) monthParams.push(shopIdFilter);
  const providerParams: (string | null)[] = [ownerId];
  if (dateParam) providerParams.push(dateParam);
  if (shopIdFilter) providerParams.push(shopIdFilter);

  // 4 independent queries → parallel execution
  const [totalResult, todayResult, monthResult, providerResult] = await Promise.all([
    // Total signups / logins
    c.env.DB
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
          SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
         FROM login_stats ls
         JOIN shops s ON ls.shop_id = s.shop_id
         WHERE s.owner_id = ? AND s.deleted_at IS NULL${dateFilter}${shopFilter}`,
      )
      .bind(...baseParams)
      .first<{ total: number; signups: number; logins: number }>(),
    // Today's signups (always today regardless of filter)
    c.env.DB
      .prepare(
        `SELECT COUNT(*) as cnt FROM login_stats ls
         JOIN shops s ON ls.shop_id = s.shop_id
         WHERE s.owner_id = ? AND s.deleted_at IS NULL
         AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
      )
      .bind(...todayParams)
      .first<{ cnt: number }>(),
    // This month's signups (always current month regardless of filter)
    c.env.DB
      .prepare(
        `SELECT COUNT(*) as cnt FROM login_stats ls
         JOIN shops s ON ls.shop_id = s.shop_id
         WHERE s.owner_id = ? AND s.deleted_at IS NULL
         AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
      )
      .bind(...monthParams)
      .first<{ cnt: number }>(),
    // Per-provider breakdown
    c.env.DB
      .prepare(
        `SELECT ls.provider, COUNT(*) as cnt
         FROM login_stats ls
         JOIN shops s ON ls.shop_id = s.shop_id
         WHERE s.owner_id = ? AND s.deleted_at IS NULL AND ls.action = 'signup'${dateFilter}${shopFilter}
         GROUP BY ls.provider`,
      )
      .bind(...providerParams)
      .all<{ provider: string; cnt: number }>(),
  ]);

  const providerStats: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    providerStats[row.provider] = row.cnt;
  }

  return c.json({
    total_events: totalResult?.total ?? 0,
    total_signups: totalResult?.signups ?? 0,
    total_logins: totalResult?.logins ?? 0,
    today_signups: todayResult?.cnt ?? 0,
    month_signups: monthResult?.cnt ?? 0,
    by_provider: providerStats,
  });
});

// ─── GET /stats/daily ───────────────────────────────────────
stats.get('/stats/daily', async (c) => {
  const ownerId = c.get('ownerId');
  const shopIdFilter = c.req.query('shop_id') || null;
  const period = c.req.query('period') || '30d';

  let days = 30;
  if (period === 'today') days = 1;
  else if (period === '7d') days = 7;
  else if (period === '90d') days = 90;
  else if (period === 'month') {
    const now = new Date();
    days = now.getUTCDate(); // 현재 월 1일부터 오늘까지 일수
  }

  const shopFilter = shopIdFilter ? ' AND ls.shop_id = ?' : '';
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  const params: string[] = [ownerId, cutoffDate];
  if (shopIdFilter) params.push(shopIdFilter);

  const dailyResult = await c.env.DB
    .prepare(
      `SELECT DATE(ls.created_at) as day, ls.action, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.created_at >= ?${shopFilter}
       GROUP BY day, ls.action
       ORDER BY day`,
    )
    .bind(...params)
    .all<{ day: string; action: string; cnt: number }>();

  return c.json({
    daily: dailyResult.results ?? [],
    period,
  });
});

// ─── GET /stats/export — 내 쇼핑몰 통계 CSV ─────────────────
stats.get('/stats/export', async (c) => {
  const ownerId = c.get('ownerId');

  const result = await c.env.DB.prepare(
    `SELECT DATE(ls.created_at) as date, s.shop_name, ls.provider, ls.action, COUNT(*) as cnt
     FROM login_stats ls
     JOIN shops s ON ls.shop_id = s.shop_id
     WHERE s.owner_id = ? AND s.deleted_at IS NULL
     GROUP BY DATE(ls.created_at), ls.shop_id, ls.provider, ls.action
     ORDER BY DATE(ls.created_at) DESC, s.shop_name`,
  )
    .bind(ownerId)
    .all<{
      date: string;
      shop_name: string | null;
      provider: string;
      action: string;
      cnt: number;
    }>();

  const header = '날짜,쇼핑몰명,프로바이더,액션,건수\n';
  const rows = (result.results ?? []).map((r) =>
    `"${r.date}","${(r.shop_name || '').replace(/"/g, '""')}","${r.provider}","${r.action}","${r.cnt}"`,
  ).join('\n');

  const bom = '\uFEFF';
  const csv = bom + header + rows;
  const today = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="my_stats_${today}.csv"`,
    },
  });
});

// ─── GET /stats/funnel ──────────────────────────────────────
// NOTE: /funnel은 반드시 /:shop_id 보다 먼저 등록해야 함.
// Hono는 등록 순서대로 매칭하므로 /:shop_id가 먼저 오면 'funnel'이 shop_id로 인식됨.
stats.get('/stats/funnel', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '7d';

  if (!shopId) {
    return c.json({ error: 'shop_id_required' }, 400);
  }

  const shop = await verifyShop(c, shopId, ownerId);
  if (!shop) {
    return c.json({ error: 'not_found' }, 404);
  }

  const sinceExpr = buildSinceExpr(period);

  const result = await c.env.DB
    .prepare(
      `SELECT event_type, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND created_at >= ${sinceExpr}
       GROUP BY event_type`,
    )
    .bind(shopId)
    .all<{ event_type: string; cnt: number }>();

  const counts: Record<string, number> = {};
  for (const row of result.results ?? []) {
    counts[row.event_type] = row.cnt;
  }

  const bannerShow   = counts['banner_show']   ?? 0;
  const bannerClick  = counts['banner_click']  ?? 0;
  const popupShow    = counts['popup_show']    ?? 0;
  const popupSignup  = counts['popup_signup']  ?? 0;
  const signupComplete = counts['signup_complete'] ?? 0;
  const escalationShow  = counts['escalation_show']  ?? 0;
  const escalationClick = counts['escalation_click'] ?? 0;
  const escalationDismiss = counts['escalation_dismiss'] ?? 0;
  const kakaoChannelShow  = counts['kakao_channel_show']  ?? 0;
  const kakaoChannelClick = counts['kakao_channel_click'] ?? 0;
  const pageView     = counts['page_view']     ?? 0;
  const oauthStart   = counts['oauth_start']   ?? 0;

  return c.json({
    period,
    shop_id: shopId,
    // 기존 퍼널
    banner_show:      bannerShow,
    banner_click:     bannerClick,
    popup_show:       popupShow,
    popup_signup:     popupSignup,
    signup_complete:  signupComplete,
    // 에스컬레이션
    escalation_show:    escalationShow,
    escalation_click:   escalationClick,
    escalation_dismiss: escalationDismiss,
    // 카카오 채널
    kakao_channel_show:  kakaoChannelShow,
    kakao_channel_click: kakaoChannelClick,
    // 페이지뷰 & OAuth
    page_view:     pageView,
    oauth_start:   oauthStart,
    // 전환율 (0~100 정수 %)
    banner_ctr:       bannerShow   > 0 ? Math.round((bannerClick  / bannerShow)  * 100) : 0,
    popup_cvr:        popupShow    > 0 ? Math.round((popupSignup  / popupShow)   * 100) : 0,
    escalation_ctr:   escalationShow > 0 ? Math.round((escalationClick / escalationShow) * 100) : 0,
    kakao_channel_ctr: kakaoChannelShow > 0 ? Math.round((kakaoChannelClick / kakaoChannelShow) * 100) : 0,
    oauth_completion: oauthStart   > 0 ? Math.round((signupComplete / oauthStart) * 100) : 0,
    overall_cvr:      bannerShow   > 0 ? Math.round((signupComplete / bannerShow) * 100) : 0,
  });
});

// ─── 공통 헬퍼 (stats-utils.ts에서 import) ─────────────────
function verifyShop(c: { env: { DB: D1Database } }, shopId: string, ownerId: string) {
  return verifyShopOwnership(c.env.DB, shopId, ownerId);
}

// ─── GET /stats/oauth-dropoff ──────────────────────────────
// OAuth 이탈률: 프로바이더별 oauth_start vs signup_complete
stats.get('/stats/oauth-dropoff', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '7d';

  if (!shopId) return c.json({ error: 'shop_id_required' }, 400);
  const shop = await verifyShop(c, shopId, ownerId);
  if (!shop) return c.json({ error: 'not_found' }, 404);

  const sinceExpr = buildSinceExpr(period);

  // oauth_start + signup_complete 모두 funnel_events에서 집계 (데이터 소스 통일)
  const [startResult, completeResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.provider') as provider, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'oauth_start' AND created_at >= ${sinceExpr}
       GROUP BY provider`,
    ).bind(shopId).all<{ provider: string; cnt: number }>(),
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.provider') as provider, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
       AND json_extract(event_data, '$.provider') IS NOT NULL
       GROUP BY provider`,
    ).bind(shopId).all<{ provider: string; cnt: number }>(),
  ]);

  const starts: Record<string, number> = {};
  for (const row of startResult.results ?? []) {
    if (row.provider) starts[row.provider] = row.cnt;
  }

  const completes: Record<string, number> = {};
  for (const row of completeResult.results ?? []) {
    completes[row.provider] = row.cnt;
  }

  // 모든 프로바이더를 합집합으로
  const allProviders = new Set([...Object.keys(starts), ...Object.keys(completes)]);
  const providers: Array<{
    provider: string;
    oauth_start: number;
    signup_complete: number;
    completion_rate: number;
    dropoff_rate: number;
  }> = [];

  let totalStart = 0;
  let totalComplete = 0;

  for (const p of allProviders) {
    const s = starts[p] ?? 0;
    const comp = completes[p] ?? 0;
    totalStart += s;
    totalComplete += comp;
    providers.push({
      provider: p,
      oauth_start: s,
      signup_complete: comp,
      completion_rate: s > 0 ? Math.round((comp / s) * 100) : 0,
      dropoff_rate: s > 0 ? Math.round(((s - comp) / s) * 100) : 0,
    });
  }

  // 이탈률 높은 순 정렬
  providers.sort((a, b) => b.dropoff_rate - a.dropoff_rate);

  return c.json({
    period,
    shop_id: shopId,
    total_oauth_start: totalStart,
    total_signup_complete: totalComplete,
    overall_completion_rate: totalStart > 0 ? Math.round((totalComplete / totalStart) * 100) : 0,
    overall_dropoff_rate: totalStart > 0 ? Math.round(((totalStart - totalComplete) / totalStart) * 100) : 0,
    providers,
  });
});

// ─── GET /stats/effort ─────────────────────────────────────
// 가입까지의 노력: visitor_id 기반 분석
stats.get('/stats/effort', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '7d';

  if (!shopId) return c.json({ error: 'shop_id_required' }, 400);
  const shop = await verifyShop(c, shopId, ownerId);
  if (!shop) return c.json({ error: 'not_found' }, 404);

  const sinceExpr = buildSinceExpr(period);

  // 가입 완료한 visitor들의 visit_count, session_page_count 통계
  const [effortResult, triggerResult, pageViewResult, timeResult] = await Promise.all([
    // 가입 완료 이벤트에서 visit_count 평균/분포
    c.env.DB.prepare(
      `SELECT
         AVG(CAST(json_extract(event_data, '$.visit_count') AS REAL)) as avg_visit_count,
         AVG(CAST(json_extract(event_data, '$.session_page_count') AS REAL)) as avg_session_pages,
         COUNT(*) as total_signups,
         SUM(CASE WHEN CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1 THEN 1 ELSE 0 END) as first_visit_signups
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}`,
    ).bind(shopId).first<{
      avg_visit_count: number | null;
      avg_session_pages: number | null;
      total_signups: number;
      first_visit_signups: number;
    }>(),

    // 가입 트리거 분포: signup_complete 이벤트의 provider 기반
    // + 가입한 visitor가 마지막으로 클릭한 위젯 유형 분석
    c.env.DB.prepare(
      `SELECT trigger_type, COUNT(*) as cnt FROM (
         SELECT vid,
           CASE
             WHEN last_click = 'banner_click' THEN 'banner'
             WHEN last_click = 'popup_signup' THEN 'popup'
             WHEN last_click = 'escalation_click' THEN 'escalation'
             WHEN last_click = 'kakao_channel_click' THEN 'kakao_channel'
             ELSE 'direct'
           END as trigger_type
         FROM (
           SELECT json_extract(event_data, '$.visitor_id') as vid,
             (SELECT f2.event_type FROM funnel_events f2
              WHERE f2.shop_id = ? AND json_extract(f2.event_data, '$.visitor_id') = json_extract(f1.event_data, '$.visitor_id')
              AND f2.event_type IN ('banner_click', 'popup_signup', 'escalation_click', 'kakao_channel_click')
              AND f2.created_at <= f1.created_at
              ORDER BY f2.created_at DESC LIMIT 1
             ) as last_click
           FROM funnel_events f1
           WHERE f1.shop_id = ? AND f1.event_type = 'signup_complete'
           AND f1.created_at >= ${sinceExpr}
           AND json_extract(f1.event_data, '$.visitor_id') IS NOT NULL
           AND json_extract(f1.event_data, '$.visitor_id') != ''
         )
       )
       GROUP BY trigger_type`,
    ).bind(shopId, shopId).all<{ trigger_type: string; cnt: number }>(),

    // visitor_id별 상품 페이지 조회 수 (가입한 visitor만, single-pass)
    c.env.DB.prepare(
      `SELECT AVG(pv_cnt) as avg_product_views FROM (
         SELECT vid, SUM(is_product_pv) as pv_cnt FROM (
           SELECT json_extract(event_data, '$.visitor_id') as vid,
                  event_type,
                  CASE WHEN event_type = 'page_view' AND json_extract(event_data, '$.page_type') = 'product' THEN 1 ELSE 0 END as is_product_pv
           FROM funnel_events
           WHERE shop_id = ? AND event_type IN ('page_view', 'signup_complete')
           AND created_at >= ${sinceExpr}
           AND json_extract(event_data, '$.visitor_id') IS NOT NULL
           AND json_extract(event_data, '$.visitor_id') != ''
         )
         GROUP BY vid
         HAVING SUM(CASE WHEN event_type = 'signup_complete' THEN 1 ELSE 0 END) > 0
       )`,
    ).bind(shopId).first<{ avg_product_views: number | null }>(),

    // 첫 방문 → 가입까지 소요시간 (visitor_id별)
    c.env.DB.prepare(
      `SELECT AVG(
         julianday(signup_time) - julianday(first_time)
       ) * 24 as avg_hours_to_signup
       FROM (
         SELECT
           json_extract(event_data, '$.visitor_id') as vid,
           MIN(created_at) as first_time,
           MAX(CASE WHEN event_type = 'signup_complete' THEN created_at END) as signup_time
         FROM funnel_events
         WHERE shop_id = ? AND created_at >= ${sinceExpr}
         AND json_extract(event_data, '$.visitor_id') IS NOT NULL
         GROUP BY vid
         HAVING signup_time IS NOT NULL
       )`,
    ).bind(shopId).first<{ avg_hours_to_signup: number | null }>(),
  ]);

  const totalSignups = effortResult?.total_signups ?? 0;
  const firstVisitSignups = effortResult?.first_visit_signups ?? 0;

  return c.json({
    period,
    shop_id: shopId,
    avg_visit_count: effortResult?.avg_visit_count ? Math.round(effortResult.avg_visit_count * 10) / 10 : null,
    avg_session_pages: effortResult?.avg_session_pages ? Math.round(effortResult.avg_session_pages * 10) / 10 : null,
    avg_product_views: pageViewResult?.avg_product_views ? Math.round(pageViewResult.avg_product_views * 10) / 10 : null,
    avg_hours_to_signup: timeResult?.avg_hours_to_signup ? Math.round(timeResult.avg_hours_to_signup * 10) / 10 : null,
    total_signups: totalSignups,
    first_visit_signups: firstVisitSignups,
    first_visit_rate: totalSignups > 0 ? Math.round((firstVisitSignups / totalSignups) * 100) : 0,
    trigger_distribution: Object.fromEntries(
      (triggerResult.results ?? []).map(r => [r.trigger_type, r.cnt])
    ),
  });
});

// ─── GET /stats/distribution ───────────────────────────────
// 디바이스/유입경로/페이지타입 분포 + 프로바이더×디바이스 교차 분석
stats.get('/stats/distribution', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '7d';

  if (!shopId) return c.json({ error: 'shop_id_required' }, 400);
  const shop = await verifyShop(c, shopId, ownerId);
  if (!shop) return c.json({ error: 'not_found' }, 404);

  const sinceExpr = buildSinceExpr(period);

  const [deviceResult, referrerResult, pageTypeResult, providerDeviceResult] = await Promise.all([
    // 디바이스 분포 (가입 완료 기준)
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.device') as device, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
       GROUP BY device ORDER BY cnt DESC`,
    ).bind(shopId).all<{ device: string; cnt: number }>(),

    // 유입 경로 분포 (page_view의 referrer 기준, 첫 방문만)
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.referrer') as referrer, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'page_view'
       AND CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1
       AND created_at >= ${sinceExpr}
       AND json_extract(event_data, '$.referrer') != ''
       GROUP BY referrer ORDER BY cnt DESC LIMIT 20`,
    ).bind(shopId).all<{ referrer: string; cnt: number }>(),

    // 첫 방문 페이지 분포
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.page_type') as page_type, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'page_view'
       AND CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1
       AND created_at >= ${sinceExpr}
       GROUP BY page_type ORDER BY cnt DESC`,
    ).bind(shopId).all<{ page_type: string; cnt: number }>(),

    // 프로바이더 × 디바이스 교차 분석 (signup_complete의 event_data에서 직접 추출)
    c.env.DB.prepare(
      `SELECT json_extract(event_data, '$.provider') as provider,
              json_extract(event_data, '$.device') as device,
              COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
       AND json_extract(event_data, '$.provider') IS NOT NULL
       GROUP BY provider, device ORDER BY cnt DESC`,
    ).bind(shopId).all<{ provider: string; device: string; cnt: number }>(),
  ]);

  // 유입 경로를 카테고리로 분류
  const referrerCategories: Record<string, number> = { search: 0, social: 0, direct: 0, other: 0 };
  for (const row of referrerResult.results ?? []) {
    const r = (row.referrer || '').toLowerCase();
    if (/naver|google|daum|bing|yahoo/.test(r)) {
      referrerCategories.search += row.cnt;
    } else if (/instagram|facebook|twitter|tiktok|kakao|band/.test(r)) {
      referrerCategories.social += row.cnt;
    } else {
      referrerCategories.other += row.cnt;
    }
  }

  return c.json({
    period,
    shop_id: shopId,
    device: (deviceResult.results ?? []).map(r => ({ device: r.device || 'unknown', count: r.cnt })),
    referrer: {
      categories: referrerCategories,
      top_domains: (referrerResult.results ?? []).map(r => ({ domain: r.referrer || 'unknown', count: r.cnt })),
    },
    first_visit_page: (pageTypeResult.results ?? []).map(r => ({ page_type: r.page_type || 'unknown', count: r.cnt })),
    provider_by_device: (providerDeviceResult.results ?? []).map(r => ({
      provider: r.provider,
      device: r.device || 'unknown',
      count: r.cnt,
    })),
  });
});

// ─── GET /stats/hourly ─────────────────────────────────────
// 시간대별 가입 패턴 (요일 × 시간 히트맵)
stats.get('/stats/hourly', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  const period = c.req.query('period') || '30d';

  if (!shopId) return c.json({ error: 'shop_id_required' }, 400);
  const shop = await verifyShop(c, shopId, ownerId);
  if (!shop) return c.json({ error: 'not_found' }, 404);

  const sinceExpr = buildSinceExpr(period);

  // login_stats에서 가입 시간 기반 요일×시간 히트맵
  // KST(UTC+9) 기준으로 변환
  const result = await c.env.DB.prepare(
    `SELECT
       CAST(strftime('%w', datetime(created_at, '+9 hours')) AS INTEGER) as dow,
       CAST(strftime('%H', datetime(created_at, '+9 hours')) AS INTEGER) as hour,
       COUNT(*) as cnt
     FROM login_stats
     WHERE shop_id = ? AND action = 'signup' AND created_at >= ${sinceExpr}
     GROUP BY dow, hour
     ORDER BY dow, hour`,
  ).bind(shopId).all<{ dow: number; hour: number; cnt: number }>();

  // 7×24 매트릭스 초기화
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];

  for (const row of result.results ?? []) {
    heatmap[row.dow][row.hour] = row.cnt;
  }

  // 피크 시간대 찾기
  let peakDow = 0, peakHour = 0, peakCount = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (heatmap[d][h] > peakCount) {
        peakCount = heatmap[d][h];
        peakDow = d;
        peakHour = h;
      }
    }
  }

  return c.json({
    period,
    shop_id: shopId,
    heatmap,
    day_names: dayNames,
    peak: {
      day: dayNames[peakDow],
      hour: peakHour,
      count: peakCount,
      label: `${dayNames[peakDow]}요일 ${peakHour}시`,
    },
  });
});

// ─── GET /stats/:shop_id ────────────────────────────────────
stats.get('/stats/:shop_id', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.param('shop_id');

  // Verify ownership
  const shop = await c.env.DB
    .prepare('SELECT shop_id FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL')
    .bind(shopId, ownerId)
    .first();

  if (!shop) {
    return c.json({ error: 'not_found' }, 404);
  }

  // Daily stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().slice(0, 10);
  const dailyResult = await c.env.DB
    .prepare(
      `SELECT DATE(created_at) as day, action, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND created_at >= ?
       GROUP BY day, action
       ORDER BY day`,
    )
    .bind(shopId, thirtyDaysAgoDate)
    .all<{ day: string; action: string; cnt: number }>();

  // Per-provider breakdown for this shop
  const providerResult = await c.env.DB
    .prepare(
      `SELECT provider, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       GROUP BY provider`,
    )
    .bind(shopId)
    .all<{ provider: string; cnt: number }>();

  const providerStats: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    providerStats[row.provider] = row.cnt;
  }

  return c.json({
    shop_id: shopId,
    daily: dailyResult.results ?? [],
    by_provider: providerStats,
  });
});

// ─── GET /billing ────────────────────────────────────────────
stats.get('/billing/status', async (c) => {
  const ownerId = c.get('ownerId');

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  // Get all shops with their monthly signup count
  const result = await c.env.DB
    .prepare(
      `SELECT s.shop_id, s.shop_name, s.mall_id, s.plan,
        (SELECT COUNT(*) FROM login_stats ls
         WHERE ls.shop_id = s.shop_id AND ls.action = 'signup'
         AND ls.created_at >= ? AND ls.created_at < ?) as monthly_signups
       FROM shops s
       WHERE s.owner_id = ? AND s.deleted_at IS NULL`,
    )
    .bind(`${yearMonth}-01`, nextMonthFirst, ownerId)
    .all<{
      shop_id: string;
      shop_name: string;
      mall_id: string;
      plan: string;
      monthly_signups: number;
    }>();

  const shops = (result.results ?? []).map((shop) => ({
    ...shop,
    limit: shop.plan === 'free' ? FREE_PLAN_MONTHLY_LIMIT : null,
    usage_percent: shop.plan === 'free'
      ? Math.round((shop.monthly_signups / FREE_PLAN_MONTHLY_LIMIT) * 100)
      : null,
    needs_upgrade: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_WARN_THRESHOLD,
    is_over_limit: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_MONTHLY_LIMIT,
  }));

  return c.json({ shops, month: yearMonth });
});

export default stats;
