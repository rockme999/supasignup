/**
 * Dashboard SSR page routes.
 *
 * These routes serve server-rendered HTML pages for the admin dashboard.
 * All pages except /login and /register require authentication via cookie.
 */
import { Hono } from 'hono';
import type { Env, WidgetStyle } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT, FREE_PLAN_WARN_THRESHOLD, decrypt } from '@supasignup/bg-core';
import { verifyToken } from '../services/jwt';
import { buildSinceExpr, escapeLike, buildDateFilter } from '../db/stats-utils';
import { hashPassword, verifyPassword } from '../services/password';
import { renderMarkdown } from '../utils/markdown';
import { maskName } from '../utils/mask';
import { CHANGELOG_PUBLIC, CHANGELOG_INTERNAL } from '../data/changelog';
import { BUILD_VERSION, BUILD_COMMIT_SHA, BUILD_TIME } from '../data/build-info';
import { LATEST_PLUS_PRESET_ADDED, getSeenAt, markSeen, isNew, getLatestBriefingCreatedAt } from '../data/whats-new';
import { Layout } from '../views/layout';
import {
  LoginPage,
  RegisterPage,
  HomePage,
  SsoGuidePage,
  StatsPage,
  BillingPage,
  ProvidersPage,
  GeneralSettingsPage,
  CouponSettingsPage,
  BannerSettingsPage,
  PopupSettingsPage,
  EscalationSettingsPage,
  KakaoSettingsPage,
  AiSettingsPage,
  AiBriefingPage,
  ExitIntentSettingsPage,
  LiveCounterSettingsPage,
  QuickStartPage,
  GuidePage,
  FaqPage,
  InquiriesPage,
  InquiryDetailPage,
  PrivacyPage,
  TermsPage,
  LandingPage,
  AdminHomePage,
  AdminShopsPage,
  AdminSubscriptionsPage,
  AdminMonitoringPage,
  AdminInquiriesPage,
  AdminAiReportsPage,
  AdminAiReportDetailPage,
  AdminShopDetailPage,
} from '../views/pages';
import { getGlobalAutoReplyEnabled } from './admin';

type PageEnv = {
  Bindings: Env;
  Variables: { ownerId: string; isCafe24: boolean };
};

// 현재 owner의 shop을 자동 조회 (단일 쇼핑몰 구조)
async function getOwnerShop(db: D1Database, ownerId: string) {
  return db.prepare(
    `SELECT shop_id, shop_name, mall_id, client_id, client_secret, platform, plan,
            enabled_providers, sso_configured, created_at, coupon_config, kakao_channel_id, widget_style, banner_config,
            shop_identity, exit_intent_config, live_counter_config
     FROM shops WHERE owner_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(ownerId).first<ShopRow & {
    coupon_config: string | null;
    kakao_channel_id: string | null;
    widget_style: string | null;
    banner_config: string | null;
    shop_identity: string | null;
    exit_intent_config: string | null;
    live_counter_config: string | null;
  }>();
}

type ShopRow = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  client_id: string;
  client_secret: string;
  platform: string;
  plan: string;
  enabled_providers: string;
  sso_configured: number;
  created_at: string;
  coupon_config?: string | null;
  kakao_channel_id?: string | null;
  widget_style?: string | null;
  shop_identity?: string | null;
};

export type LossAversionCards = {
  missedSignupCount: number;
  dataDays: number;
  firstPurchaseGap: string[];
};

/**
 * W2-3 손실 회피 카드 데이터 조회.
 *
 * 카드 A (가입 의도 비회원):
 *   최근 7일 내 'widget.exit_intent_shown' 또는 'page_view'+'signup_complete' 패턴 분석.
 *   실제로는 exit_intent_shown을 본 visitor 중 signup_complete가 없는 visitor 카운트.
 *   exit_intent 데이터가 없으면 fallback으로 page_view 진입 후 미전환 카운트.
 *
 * 카드 B (가입 후 첫구매 미전환):
 *   7일 이상 전에 가입했지만 coupon_issues에 주문 기록이 없는 회원 (이름 복호화 + 마스킹).
 *   카페24 주문 API 연동 전 단계 — 현재는 쿠폰 미사용(=첫구매 전) 회원으로 근사.
 */
export async function getLossAversionCards(
  env: Env,
  shopId: string,
): Promise<LossAversionCards> {
  // 병렬 조회
  const [missedResult, dataAgeResult, firstPurchaseResult] = await Promise.all([
    // 카드 A: exit_intent_shown 본 visitor 중 signup_complete 없는 수
    // exit_intent 데이터가 충분하면 이를 사용, 아니면 page_view 기반 fallback
    env.DB.prepare(`
      SELECT COUNT(DISTINCT v.visitor_id) AS missed
      FROM (
        SELECT DISTINCT visitor_id FROM funnel_events
        WHERE shop_id = ?
          AND event_type IN ('widget.exit_intent_shown', 'page_view')
          AND visitor_id IS NOT NULL
          AND created_at >= datetime('now', '-7 days')
      ) v
      WHERE v.visitor_id NOT IN (
        SELECT DISTINCT visitor_id FROM funnel_events
        WHERE shop_id = ?
          AND event_type = 'signup_complete'
          AND visitor_id IS NOT NULL
          AND created_at >= datetime('now', '-7 days')
      )
    `).bind(shopId, shopId).first<{ missed: number }>(),

    // 데이터 수집 일수 (distinct date 기준)
    env.DB.prepare(`
      SELECT COUNT(DISTINCT date(created_at)) AS days
      FROM funnel_events
      WHERE shop_id = ?
    `).bind(shopId).first<{ days: number }>(),

    // 카드 B: 7일 이상 전 가입 + 쿠폰 미발급 (첫구매 근사) 회원 — 최대 5명
    env.DB.prepare(`
      SELECT u.name
      FROM shop_users su
      JOIN users u ON su.user_id = u.user_id
      WHERE su.shop_id = ?
        AND su.created_at < datetime('now', '-7 days')
        AND su.user_id NOT IN (
          SELECT DISTINCT ci.member_id
          FROM coupon_issues ci
          WHERE ci.shop_id = ?
        )
        AND u.name IS NOT NULL
      ORDER BY su.created_at DESC
      LIMIT 5
    `).bind(shopId, shopId).all<{ name: string }>(),
  ]);

  // 카드 B 이름 복호화 + 마스킹
  const rawNames = firstPurchaseResult.results ?? [];
  const decryptedNames = await Promise.all(
    rawNames.map(async (r) => {
      try {
        const plain = await decrypt(r.name, env.ENCRYPTION_KEY);
        return maskName(plain);
      } catch {
        return null;
      }
    }),
  );
  const maskedNames = decryptedNames.filter((n): n is string => n !== null);

  return {
    missedSignupCount: missedResult?.missed ?? 0,
    dataDays: dataAgeResult?.days ?? 0,
    firstPurchaseGap: maskedNames,
  };
}

const pages = new Hono<PageEnv>();

// ─── Public standalone pages ─────────────────────────────────

pages.get('/', (c) => {
  return c.html(<LandingPage />);
});

pages.get('/privacy', (c) => {
  return c.html(<PrivacyPage />);
});

pages.get('/terms', (c) => {
  return c.html(<TermsPage />);
});

// ─── Auth check middleware (cookie-based, redirect to login) ─

async function getOwnerIdFromCookie(cookie: string | undefined, secret: string): Promise<string | null> {
  if (!cookie) return null;
  const match = cookie.match(/bg_token=([^;]+)/);
  if (!match) return null;
  const payload = await verifyToken(match[1], secret);
  return payload?.sub ?? null;
}

pages.use('/dashboard/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;

  // Public pages
  if (path === '/dashboard/logout' || path === '/dashboard/session-expired') {
    return next();
  }

  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    // 현재 카페24 전용 서비스 — 미인증 시 항상 세션 만료 안내 페이지로
    return c.redirect('/dashboard/session-expired');
  }
  c.set('ownerId', ownerId);

  const owner = await c.env.DB
    .prepare('SELECT email FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ email: string }>();
  // 플랫폼 자동 생성 계정 감지 (cafe24, imweb, godomall, shopby — 스탠드얼론 제외)
  const autoSuffixes = ['@cafe24.auto', '@imweb.auto', '@godomall.auto', '@shopby.auto'];
  const isPlatformUser = autoSuffixes.some(s => owner?.email?.endsWith(s));
  c.set('isCafe24', isPlatformUser);

  return next();
});

// ─── Public pages ────────────────────────────────────────────

pages.get('/dashboard/session-expired', (c) => {
  return c.html(
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>세션 만료 - 번개가입</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
          .card { background: #fff; border-radius: 12px; padding: 48px 40px; width: 100%; max-width: 420px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; }
          h1 { font-size: 20px; margin-bottom: 12px; color: #1e293b; }
          p { font-size: 14px; color: #64748b; line-height: 1.7; margin-bottom: 8px; }
          .icon { font-size: 48px; margin-bottom: 16px; }
          .info { background: #dbeafe; color: #1e40af; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-top: 20px; text-align: left; line-height: 1.6; }
        `}</style>
      </head>
      <body>
        <div class="card">
          <div class="icon">⏰</div>
          <h1>세션이 만료되었습니다</h1>
          <p>로그인 세션이 만료되어 대시보드에 접근할 수 없습니다.</p>
          <div class="info">
            카페24 쇼핑몰 관리자에서 <strong>번개가입 앱</strong>을 다시 실행해주세요.<br />
            앱 실행 시 자동으로 로그인됩니다.
          </div>
        </div>
      </body>
    </html>
  );
});

// 카페24 전용 — login/register 페이지 비활성화 (카페24 관리자에서 앱 실행으로 자동 로그인)
// pages.get('/dashboard/login', ...);
// pages.get('/dashboard/register', ...);

pages.get('/dashboard/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/dashboard/session-expired',
      'Set-Cookie': 'bg_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
});

// ─── Dashboard Home ──────────────────────────────────────────

pages.get('/dashboard', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);

  if (!shop) {
    // 앱 미설치 상태
    return c.html(
      <HomePage
        shop={null}
        stats={null}
        isCafe24={c.get('isCafe24')}
      />
    );
  }

  // shop_identity가 비어 있으면 백그라운드 분석 트리거
  // 헬퍼가 락/카운터/토큰조회/빈객체검증 모두 처리 (ai.ts:maybeTriggerIdentityAnalysis 참조)
  let needsAnalysis = !shop.shop_identity;
  if (!needsAnalysis && shop.shop_identity) {
    try {
      const parsed = JSON.parse(shop.shop_identity);
      needsAnalysis = !parsed?.industry && !parsed?.summary;
    } catch { needsAnalysis = true; }
  }
  if (needsAnalysis) {
    const { maybeTriggerIdentityAnalysis } = await import('./ai');
    c.executionCtx.waitUntil(
      maybeTriggerIdentityAnalysis(c.env, shop.shop_id)
        .catch((err) => console.error('[dashboard] identity trigger failed:', err))
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);
  const now = new Date();
  const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const billingMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  // Free 플랜 — 손실 회피 카드 데이터 병렬 조회 (Plus는 불필요)
  const lossAversionPromise = shop.plan === 'free'
    ? getLossAversionCards(c.env, shop.shop_id)
    : Promise.resolve<LossAversionCards>({ missedSignupCount: 0, dataDays: 0, firstPurchaseGap: [] });

  // 최신 AI 브리핑 (홈 카드용) — 모든 운영자 대상. performance도 함께 조회해 카드 미리보기 노출
  const latestBriefingPromise = c.env.DB.prepare(
    `SELECT headline, performance, created_at FROM ai_briefings WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(shop.shop_id).first<{ headline: string | null; performance: string | null; created_at: string }>();

  // 6 independent queries → single batch call
  const homeResults = await c.env.DB.batch([
    // [0] Total signups / logins
    c.env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats WHERE shop_id = ?`,
    ).bind(shop.shop_id),

    // [1] Today's signups
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`,
    ).bind(shop.shop_id, today),

    // [2] This month's signups
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`,
    ).bind(shop.shop_id, `${yearMonth}-01`),

    // [3] Per-provider breakdown
    c.env.DB.prepare(
      `SELECT provider, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       GROUP BY provider`,
    ).bind(shop.shop_id),

    // [4] Billing: this month's signups
    c.env.DB.prepare(
      `SELECT COUNT(*) as monthly_signups FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       AND created_at >= ? AND created_at < ?`,
    ).bind(shop.shop_id, `${billingMonth}-01`, nextMonthFirst),

    // [5] 퍼널 요약 (최근 7일, 홈 대시보드용)
    c.env.DB.prepare(
      `SELECT event_type, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND created_at >= datetime('now', '-7 days')
       GROUP BY event_type`,
    ).bind(shop.shop_id),
  ]);

  const totalResult = (homeResults[0] as D1Result<{ total: number; signups: number; logins: number }>).results?.[0];
  const todayResult = (homeResults[1] as D1Result<{ cnt: number }>).results?.[0];
  const monthResult = (homeResults[2] as D1Result<{ cnt: number }>).results?.[0];
  const providerRows = (homeResults[3] as D1Result<{ provider: string; cnt: number }>).results ?? [];
  const billingResult = (homeResults[4] as D1Result<{ monthly_signups: number }>).results?.[0];
  const funnelResult = (homeResults[5] as D1Result<{ event_type: string; cnt: number }>).results ?? [];

  const byProvider: Record<string, number> = {};
  for (const row of providerRows) {
    byProvider[row.provider] = row.cnt;
  }

  let couponEnabled = false;
  if (shop.coupon_config) {
    try { couponEnabled = JSON.parse(shop.coupon_config)?.enabled === true; } catch { /* ignore */ }
  }

  // 퍼널 요약 계산
  const funnelCounts: Record<string, number> = {};
  for (const row of funnelResult) {
    funnelCounts[row.event_type] = row.cnt;
  }

  // 손실 회피 카드 + 최신 브리핑 데이터 수집 (batch와 병렬 실행 중)
  const [lossAversion, latestBriefingRow] = await Promise.all([
    lossAversionPromise,
    latestBriefingPromise,
  ]);

  // latestBriefing: row 존재 → HomeBriefing, row 없으면 null (placeholder 표시)
  const latestBriefing = latestBriefingRow
    ? { headline: latestBriefingRow.headline, performance: latestBriefingRow.performance, created_at: latestBriefingRow.created_at }
    : null;

  return c.html(
    <HomePage
      shop={{
        shop_id: shop.shop_id,
        shop_name: shop.shop_name,
        mall_id: shop.mall_id,
        plan: shop.plan,
        sso_configured: shop.sso_configured,
        monthly_signups: billingResult?.monthly_signups ?? 0,
        coupon_enabled: couponEnabled,
      }}
      stats={{
        total_signups: totalResult?.signups ?? 0,
        total_logins: totalResult?.logins ?? 0,
        today_signups: todayResult?.cnt ?? 0,
        month_signups: monthResult?.cnt ?? 0,
        by_provider: byProvider,
      }}
      funnelSummary={funnelCounts}
      lossAversion={lossAversion}
      latestBriefing={latestBriefing}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Stats Page ─────────────────────────────────────────────

pages.get('/dashboard/stats', async (c) => {
  const ownerId = c.get('ownerId');
  const period = c.req.query('period') || '';

  // 쇼핑몰 목록을 먼저 조회하여, shop_id 미지정 시 자동 선택
  const shopsResult = await c.env.DB.prepare(
    'SELECT shop_id, shop_name, plan FROM shops WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at',
  ).bind(ownerId).all<{ shop_id: string; shop_name: string; plan: string }>();
  const shops = shopsResult.results ?? [];
  const shopIdFilter = c.req.query('shop_id') || (shops.length > 0 ? shops[0].shop_id : null);
  const currentShopPlan = shops.find(s => s.shop_id === shopIdFilter)?.plan || 'free';

  // Build date filter (공통 유틸 사용)
  const { dateFilter, dateParam } = buildDateFilter(period);
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  const shopFilter = shopIdFilter ? ' AND ls.shop_id = ?' : '';

  // Build params
  const baseParams: (string | null)[] = [ownerId];
  if (dateParam) baseParams.push(dateParam);
  if (shopIdFilter) baseParams.push(shopIdFilter);

  // Build per-query params
  const todayParams: (string | null)[] = [ownerId, today];
  if (shopIdFilter) todayParams.push(shopIdFilter);

  const monthParams: (string | null)[] = [ownerId, `${yearMonth}-01`];
  if (shopIdFilter) monthParams.push(shopIdFilter);

  const providerParams: (string | null)[] = [ownerId];
  if (dateParam) providerParams.push(dateParam);
  if (shopIdFilter) providerParams.push(shopIdFilter);

  let dailyDays = 30;
  if (period === '7d') dailyDays = 7;
  else if (period === 'today') dailyDays = 1;

  const sinceDate = new Date();
  sinceDate.setUTCDate(sinceDate.getUTCDate() - dailyDays);
  const sinceDateStr = sinceDate.toISOString().slice(0, 10);

  const dailyParams: string[] = [ownerId, sinceDateStr];
  if (shopIdFilter) dailyParams.push(shopIdFilter);

  // buildSinceExpr는 공통 유틸에서 import

  const funnelPeriod = period || '7d';
  const sinceExpr = buildSinceExpr(funnelPeriod);

  // 5 base queries → single batch call
  const baseResults = await c.env.DB.batch([
    // [0] Total signups / logins
    c.env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL${dateFilter}${shopFilter}`,
    ).bind(...baseParams),

    // [1] Today's signups
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    ).bind(...todayParams),

    // [2] This month's signups
    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    ).bind(...monthParams),

    // [3] Per-provider breakdown
    c.env.DB.prepare(
      `SELECT ls.provider, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL AND ls.action = 'signup'${dateFilter}${shopFilter}
       GROUP BY ls.provider`,
    ).bind(...providerParams),

    // [4] Daily breakdown
    c.env.DB.prepare(
      `SELECT DATE(ls.created_at) as day, ls.action, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.created_at >= ?${shopFilter}
       GROUP BY day, ls.action
       ORDER BY day`,
    ).bind(...dailyParams),
  ]);

  const totalResult = (baseResults[0] as D1Result<{ total: number; signups: number; logins: number }>).results?.[0];
  const todayResult = (baseResults[1] as D1Result<{ cnt: number }>).results?.[0];
  const monthResult = (baseResults[2] as D1Result<{ cnt: number }>).results?.[0];
  const providerResult = (baseResults[3] as D1Result<{ provider: string; cnt: number }>).results ?? [];
  const dailyResult = (baseResults[4] as D1Result<{ day: string; action: string; cnt: number }>).results ?? [];

  const byProvider: Record<string, number> = {};
  for (const row of providerResult) {
    byProvider[row.provider] = row.cnt;
  }

  // shop 선택 시 추가 통계 데이터 병렬 조회
  let funnelData: { event_type: string; cnt: number }[] = [];
  let oauthDropoff: {
    total_oauth_start: number;
    total_signup_complete: number;
    overall_completion_rate: number;
    overall_dropoff_rate: number;
    providers: Array<{
      provider: string;
      oauth_start: number;
      signup_complete: number;
      completion_rate: number;
      dropoff_rate: number;
    }>;
  } | undefined;
  let effort: {
    avg_visit_count: number | null;
    avg_session_pages: number | null;
    avg_product_views: number | null;
    avg_hours_to_signup: number | null;
    total_signups: number;
    first_visit_signups: number;
    first_visit_rate: number;
    trigger_distribution: Record<string, number>;
  } | undefined;
  let distribution: {
    device: Array<{ device: string; count: number }>;
    referrer: {
      categories: Record<string, number>;
      top_domains: Array<{ domain: string; count: number }>;
    };
    first_visit_page: Array<{ page_type: string; count: number }>;
    provider_by_device: Array<{ provider: string; device: string; count: number }>;
  } | undefined;
  let hourly: {
    heatmap: number[][];
    day_names: string[];
    peak: { day: string; hour: number; count: number; label: string };
  } | undefined;

  if (shopIdFilter) {
    // 배치 1: 퍼널 + OAuth 이탈 + effort 기본 (4개) → single batch call
    const batch1Results = await c.env.DB.batch([
      // [0] 퍼널 이벤트
      c.env.DB.prepare(
        `SELECT event_type, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND created_at >= ${sinceExpr}
         GROUP BY event_type`,
      ).bind(shopIdFilter),

      // [1] OAuth 이탈: oauth_start
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.provider') as provider, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'oauth_start' AND created_at >= ${sinceExpr}
         GROUP BY provider`,
      ).bind(shopIdFilter),

      // [2] OAuth 이탈: signup_complete
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.provider') as provider, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
         AND json_extract(event_data, '$.provider') IS NOT NULL
         GROUP BY provider`,
      ).bind(shopIdFilter),

      // [3] effort 기본
      c.env.DB.prepare(
        `SELECT
           AVG(CAST(json_extract(event_data, '$.visit_count') AS REAL)) as avg_visit_count,
           AVG(CAST(json_extract(event_data, '$.session_page_count') AS REAL)) as avg_session_pages,
           COUNT(*) as total_signups,
           SUM(CASE WHEN CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1 THEN 1 ELSE 0 END) as first_visit_signups
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}`,
      ).bind(shopIdFilter),
    ]);

    const funnelRaw = batch1Results[0] as D1Result<{ event_type: string; cnt: number }>;
    const dropoffStartRaw = batch1Results[1] as D1Result<{ provider: string; cnt: number }>;
    const dropoffCompleteRaw = batch1Results[2] as D1Result<{ provider: string; cnt: number }>;
    const effortRaw = (batch1Results[3] as D1Result<{ avg_visit_count: number | null; avg_session_pages: number | null; total_signups: number; first_visit_signups: number }>).results?.[0];

    // 배치 2: effort 상세 + distribution 디바이스/유입 (4개) → single batch call
    const batch2Results = await c.env.DB.batch([
      // [0] 가입 트리거 분포
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
             SELECT f1.visitor_id as vid,
               (SELECT f2.event_type FROM funnel_events f2
                WHERE f2.shop_id = ? AND f2.visitor_id = f1.visitor_id
                AND f2.event_type IN ('banner_click', 'popup_signup', 'escalation_click', 'kakao_channel_click')
                AND f2.created_at <= f1.created_at
                ORDER BY f2.created_at DESC LIMIT 1
               ) as last_click
             FROM funnel_events f1
             WHERE f1.shop_id = ? AND f1.event_type = 'signup_complete'
             AND f1.created_at >= ${sinceExpr}
             AND f1.visitor_id IS NOT NULL
             AND f1.visitor_id != ''
           )
         )
         GROUP BY trigger_type`,
      ).bind(shopIdFilter, shopIdFilter),

      // [1] 평균 상품 페이지 조회 수
      c.env.DB.prepare(
        `SELECT AVG(pv_cnt) as avg_product_views FROM (
           SELECT vid, SUM(is_product_pv) as pv_cnt FROM (
             SELECT visitor_id as vid,
                    event_type,
                    CASE WHEN event_type = 'page_view' AND json_extract(event_data, '$.page_type') = 'product' THEN 1 ELSE 0 END as is_product_pv
             FROM funnel_events
             WHERE shop_id = ? AND event_type IN ('page_view', 'signup_complete')
             AND created_at >= ${sinceExpr}
             AND visitor_id IS NOT NULL
             AND visitor_id != ''
           )
           GROUP BY vid
           HAVING SUM(CASE WHEN event_type = 'signup_complete' THEN 1 ELSE 0 END) > 0
         )`,
      ).bind(shopIdFilter),

      // [2] 첫 방문 → 가입까지 소요시간
      c.env.DB.prepare(
        `SELECT AVG(
           MAX(0, julianday(signup_time) - julianday(first_time))
         ) * 24 as avg_hours_to_signup
         FROM (
           SELECT
             visitor_id as vid,
             MIN(created_at) as first_time,
             MAX(CASE WHEN event_type = 'signup_complete' THEN created_at END) as signup_time
           FROM funnel_events
           WHERE shop_id = ? AND created_at >= ${sinceExpr}
           AND visitor_id IS NOT NULL
           GROUP BY vid
           HAVING signup_time IS NOT NULL
         )`,
      ).bind(shopIdFilter),

      // [3] 디바이스 분포
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.device') as device, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
         GROUP BY device ORDER BY cnt DESC`,
      ).bind(shopIdFilter),
    ]);

    const triggerRaw = batch2Results[0] as D1Result<{ trigger_type: string; cnt: number }>;
    const pageViewRaw = (batch2Results[1] as D1Result<{ avg_product_views: number | null }>).results?.[0];
    const timeRaw = (batch2Results[2] as D1Result<{ avg_hours_to_signup: number | null }>).results?.[0];
    const deviceRaw = batch2Results[3] as D1Result<{ device: string; cnt: number }>;

    // 배치 3: distribution 나머지 + hourly (4개) → single batch call
    const batch3Results = await c.env.DB.batch([
      // [0] 유입 경로 분포
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.referrer') as referrer, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'page_view'
         AND CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1
         AND created_at >= ${sinceExpr}
         AND json_extract(event_data, '$.referrer') != ''
         GROUP BY referrer ORDER BY cnt DESC LIMIT 20`,
      ).bind(shopIdFilter),

      // [1] 첫 방문 페이지 분포
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.page_type') as page_type, COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'page_view'
         AND CAST(json_extract(event_data, '$.visit_count') AS INTEGER) = 1
         AND created_at >= ${sinceExpr}
         GROUP BY page_type ORDER BY cnt DESC`,
      ).bind(shopIdFilter),

      // [2] 프로바이더 × 디바이스 교차 분석
      c.env.DB.prepare(
        `SELECT json_extract(event_data, '$.provider') as provider,
                json_extract(event_data, '$.device') as device,
                COUNT(*) as cnt
         FROM funnel_events
         WHERE shop_id = ? AND event_type = 'signup_complete' AND created_at >= ${sinceExpr}
         AND json_extract(event_data, '$.provider') IS NOT NULL
         GROUP BY provider, device ORDER BY cnt DESC`,
      ).bind(shopIdFilter),

      // [3] 시간대별 히트맵 (login_stats, 최근 30일 고정)
      c.env.DB.prepare(
        `SELECT
           CAST(strftime('%w', datetime(created_at, '+9 hours')) AS INTEGER) as dow,
           CAST(strftime('%H', datetime(created_at, '+9 hours')) AS INTEGER) as hour,
           COUNT(*) as cnt
         FROM login_stats
         WHERE shop_id = ? AND action = 'signup' AND created_at >= ${buildSinceExpr('30d')}
         GROUP BY dow, hour
         ORDER BY dow, hour`,
      ).bind(shopIdFilter),
    ]);

    const referrerRaw = batch3Results[0] as D1Result<{ referrer: string; cnt: number }>;
    const pageTypeRaw = batch3Results[1] as D1Result<{ page_type: string; cnt: number }>;
    const providerDeviceRaw = batch3Results[2] as D1Result<{ provider: string; device: string; cnt: number }>;
    const hourlyRaw = batch3Results[3] as D1Result<{ dow: number; hour: number; cnt: number }>;

    // 퍼널 데이터
    funnelData = funnelRaw.results ?? [];

    // OAuth 이탈 집계
    const starts: Record<string, number> = {};
    for (const row of dropoffStartRaw.results ?? []) {
      if (row.provider) starts[row.provider] = row.cnt;
    }
    const completes: Record<string, number> = {};
    for (const row of dropoffCompleteRaw.results ?? []) {
      if (row.provider) completes[row.provider] = row.cnt;
    }
    const allProviders = new Set([...Object.keys(starts), ...Object.keys(completes)]);
    let totalStart = 0, totalComplete = 0;
    const dropoffProviders: Array<{
      provider: string;
      oauth_start: number;
      signup_complete: number;
      completion_rate: number;
      dropoff_rate: number;
    }> = [];
    for (const p of allProviders) {
      const s = starts[p] ?? 0;
      const comp = completes[p] ?? 0;
      totalStart += s;
      totalComplete += comp;
      dropoffProviders.push({
        provider: p,
        oauth_start: s,
        signup_complete: comp,
        completion_rate: s > 0 ? Math.round((comp / s) * 100) : 0,
        dropoff_rate: s > 0 ? Math.round(((s - comp) / s) * 100) : 0,
      });
    }
    dropoffProviders.sort((a, b) => b.dropoff_rate - a.dropoff_rate);
    oauthDropoff = {
      total_oauth_start: totalStart,
      total_signup_complete: totalComplete,
      overall_completion_rate: totalStart > 0 ? Math.round((totalComplete / totalStart) * 100) : 0,
      overall_dropoff_rate: totalStart > 0 ? Math.round(((totalStart - totalComplete) / totalStart) * 100) : 0,
      providers: dropoffProviders,
    };

    // effort 집계
    const effortTotalSignups = effortRaw?.total_signups ?? 0;
    const effortFirstVisit = effortRaw?.first_visit_signups ?? 0;
    effort = {
      avg_visit_count: effortRaw?.avg_visit_count ? Math.round(effortRaw.avg_visit_count * 10) / 10 : null,
      avg_session_pages: effortRaw?.avg_session_pages ? Math.round(effortRaw.avg_session_pages * 10) / 10 : null,
      avg_product_views: pageViewRaw?.avg_product_views ? Math.round(pageViewRaw.avg_product_views * 10) / 10 : null,
      avg_hours_to_signup: timeRaw?.avg_hours_to_signup ? Math.round(timeRaw.avg_hours_to_signup * 10) / 10 : null,
      total_signups: effortTotalSignups,
      first_visit_signups: effortFirstVisit,
      first_visit_rate: effortTotalSignups > 0 ? Math.round((effortFirstVisit / effortTotalSignups) * 100) : 0,
      trigger_distribution: Object.fromEntries(
        (triggerRaw.results ?? []).map(r => [r.trigger_type, r.cnt])
      ),
    };

    // distribution 집계
    const referrerCategories: Record<string, number> = { search: 0, social: 0, direct: 0, other: 0 };
    for (const row of referrerRaw.results ?? []) {
      const r = (row.referrer || '').toLowerCase();
      if (/naver|google|daum|bing|yahoo/.test(r)) {
        referrerCategories.search += row.cnt;
      } else if (/instagram|facebook|twitter|tiktok|kakao|band/.test(r)) {
        referrerCategories.social += row.cnt;
      } else {
        referrerCategories.other += row.cnt;
      }
    }
    distribution = {
      device: (deviceRaw.results ?? []).map(r => ({ device: r.device || 'unknown', count: r.cnt })),
      referrer: {
        categories: referrerCategories,
        top_domains: (referrerRaw.results ?? []).map(r => ({ domain: r.referrer || 'unknown', count: r.cnt })),
      },
      first_visit_page: (pageTypeRaw.results ?? []).map(r => ({ page_type: r.page_type || 'unknown', count: r.cnt })),
      provider_by_device: (providerDeviceRaw.results ?? []).map(r => ({
        provider: r.provider,
        device: r.device || 'unknown',
        count: r.cnt,
      })),
    };

    // hourly 집계
    const heatmap: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    for (const row of hourlyRaw.results ?? []) {
      heatmap[row.dow][row.hour] = row.cnt;
    }
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
    hourly = {
      heatmap,
      day_names: dayNames,
      peak: {
        day: dayNames[peakDow],
        hour: peakHour,
        count: peakCount,
        label: `${dayNames[peakDow]}요일 ${peakHour}시`,
      },
    };
  }

  return c.html(
    <StatsPage
      stats={{
        total_signups: totalResult?.signups ?? 0,
        total_logins: totalResult?.logins ?? 0,
        today_signups: todayResult?.cnt ?? 0,
        month_signups: monthResult?.cnt ?? 0,
        by_provider: byProvider,
      }}
      daily={dailyResult}
      shops={shops}
      currentShopId={shopIdFilter}
      currentPeriod={period}
      plan={currentShopPlan}
      funnelData={funnelData}
      oauthDropoff={oauthDropoff}
      effort={effort}
      distribution={distribution}
      hourly={hourly}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Billing Page ───────────────────────────────────────────

pages.get('/dashboard/billing', async (c) => {
  const ownerId = c.get('ownerId');

  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);

  const [billingResult, shopsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT s.shop_id, s.shop_name, s.plan,
        (SELECT COUNT(*) FROM login_stats ls
         WHERE ls.shop_id = s.shop_id AND ls.action = 'signup'
         AND ls.created_at >= ? AND ls.created_at < ?) as monthly_signups
       FROM shops s
       WHERE s.owner_id = ? AND s.deleted_at IS NULL`
    ).bind(`${yearMonth}-01`, nextMonthFirst, ownerId)
     .all<{ shop_id: string; shop_name: string; plan: string; monthly_signups: number }>(),
    c.env.DB.prepare('SELECT shop_id, shop_name, mall_id FROM shops WHERE owner_id = ? AND deleted_at IS NULL')
      .bind(ownerId)
      .all<{ shop_id: string; shop_name: string; mall_id: string }>(),
  ]);

  const billingShops = (billingResult.results ?? []).map((shop) => ({
    ...shop,
    usage_percent: shop.plan === 'free'
      ? Math.round((shop.monthly_signups / FREE_PLAN_MONTHLY_LIMIT) * 100)
      : null,
    needs_upgrade: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_WARN_THRESHOLD,
    is_over_limit: shop.plan === 'free' && shop.monthly_signups >= FREE_PLAN_MONTHLY_LIMIT,
  }));

  // 현재 플랜 결정 (유료 shop이 하나라도 있으면 해당 플랜)
  const paidShop = billingShops.find(s => s.plan !== 'free');
  const currentPlan = paidShop ? paidShop.plan : 'free';

  return c.html(
    <BillingPage billingShops={billingShops} month={yearMonth} shops={shopsResult.results ?? []} currentPlan={currentPlan} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: General ──────────────────────────────────────

pages.get('/dashboard/settings/general', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  const owner = await c.env.DB
    .prepare('SELECT email, name FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ email: string; name: string }>();

  if (!owner) return c.redirect('/dashboard/login');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let couponConfig: any = null;
  if (shop?.coupon_config) {
    try {
      const parsed = JSON.parse(shop.coupon_config);
      // 새 포맷(shipping/amount/rate)인지 확인, 이전 포맷(enabled/coupons)이면 무시
      if (parsed?.shipping && parsed?.amount && parsed?.rate) {
        couponConfig = parsed;
      }
    } catch { /* ignore */ }
  }

  return c.html(
    <GeneralSettingsPage
      email={owner.email}
      name={owner.name}
      shop={shop ?? null}
      couponConfig={couponConfig}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: SSO Guide ─────────────────────────────────────

pages.get('/dashboard/settings/sso-guide', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  return c.html(
    <SsoGuidePage
      shop={shop}
      clientId={shop.client_id}
      baseUrl={c.env.BASE_URL}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: Providers ─────────────────────────────────────

pages.get('/dashboard/settings/providers', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  let widgetStyle: WidgetStyle | undefined;
  if (shop.widget_style) {
    try { widgetStyle = JSON.parse(shop.widget_style); } catch { /* use default */ }
  }

  // What's New 인디케이터: seen 시각 조회 + 방문 기록 갱신 (병렬)
  let newBadges: Partial<Record<string, boolean>> = {};
  try {
    const [seenPresets, seenChangelog] = await Promise.all([
      getSeenAt(c.env.KV, ownerId, 'design-presets'),
      getSeenAt(c.env.KV, ownerId, 'changelog'),
    ]);
    newBadges = {
      '/dashboard/settings/providers': isNew(seenPresets, LATEST_PLUS_PRESET_ADDED),
      '/dashboard/changelog': isNew(seenChangelog, BUILD_TIME),
    };
    // 이 페이지 방문 — design-presets seen 갱신 (비동기, 실패 무시)
    c.executionCtx.waitUntil(
      markSeen(c.env.KV, ownerId, 'design-presets').catch(() => {}),
    );
  } catch {
    // KV 조회 실패 시 배지 표시 안 함 (페이지 렌더링 정상 진행)
  }

  return c.html(
    <ProvidersPage
      shop={shop}
      baseUrl={c.env.BASE_URL}
      isCafe24={c.get('isCafe24')}
      widgetStyle={widgetStyle}
      newBadges={newBadges}
    />
  );
});

// ─── Settings: Login Design (redirect old URL) ─────────────
pages.get('/dashboard/settings/login-design', (c) => c.redirect('/dashboard/settings/providers', 301));

// ─── Settings: Coupon ────────────────────────────────────────

pages.get('/dashboard/settings/coupon', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let couponConfig: any = null;
  if (shop.coupon_config) {
    try { couponConfig = JSON.parse(shop.coupon_config); } catch { /* ignore */ }
  }

  return c.html(
    <CouponSettingsPage
      shop={shop}
      couponConfig={couponConfig}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: Banner [Plus] ─────────────────────────────────

pages.get('/dashboard/settings/banner', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  const bannerConfig = shop.banner_config ? JSON.parse(shop.banner_config) : null;
  return c.html(
    <BannerSettingsPage shop={shop} shopId={shop.shop_id} bannerConfig={bannerConfig} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: Popup [Plus] ──────────────────────────────────

pages.get('/dashboard/settings/popup', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.html(
    <PopupSettingsPage shop={shop} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: Escalation [Plus] ────────────────────────────

pages.get('/dashboard/settings/escalation', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.html(
    <EscalationSettingsPage shop={shop} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: Kakao [Plus] ──────────────────────────────────

pages.get('/dashboard/settings/kakao', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  return c.html(
    <KakaoSettingsPage
      shop={shop}
      kakaoChannelId={shop.kakao_channel_id ?? ''}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: Exit-intent [Plus] ───────────────────────────

pages.get('/dashboard/settings/exit-intent', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  const exitIntentConfig = shop.exit_intent_config
    ? JSON.parse(shop.exit_intent_config)
    : null;
  return c.html(
    <ExitIntentSettingsPage
      shop={shop}
      exitIntentConfig={exitIntentConfig}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: Live Counter [Plus] ──────────────────────────

pages.get('/dashboard/settings/live-counter', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  const liveCounterConfig = shop.live_counter_config
    ? JSON.parse(shop.live_counter_config)
    : null;
  return c.html(
    <LiveCounterSettingsPage
      shop={shop}
      liveCounterConfig={liveCounterConfig}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: AI [Plus] ─────────────────────────────────────

pages.get('/dashboard/settings/ai', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  return c.html(
    <AiSettingsPage shop={shop ?? null} isCafe24={c.get('isCafe24')} />
  );
});

// ─── AI Reports [Plus] ───────────────────────────────────────

// /dashboard/ai-reports → /dashboard/ai-briefing (301 redirect)
pages.get('/dashboard/ai-reports', (c) => {
  return c.redirect('/dashboard/ai-briefing', 301);
});

// ─── AI Briefing Page ────────────────────────────────────────

pages.get('/dashboard/ai-briefing', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  const PAGE_SIZE = 10;
  const pageParam = parseInt(c.req.query('page') ?? '1', 10);
  const page = Number.isNaN(pageParam) || pageParam < 1 ? 1 : pageParam;

  // 총 브리핑 건수
  const countRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM ai_briefings WHERE shop_id = ?`
  ).bind(shop.shop_id).first<{ cnt: number }>();
  const totalCount = countRow?.cnt ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  // 최신 브리핑 1건 (항상 page=1 기준, 위쪽 고정)
  // history: page별 10건 (latest 제외, offset 기준)
  // page=1 이면 latest=briefings[0], history=briefings[1..9]
  // page>1 이면 latest는 null (헤더/성과는 page=1 것만), history=해당 페이지 구간
  const offset = (safePage - 1) * PAGE_SIZE;
  const briefings = await c.env.DB.prepare(
    `SELECT id, performance, strategy, actions, insight, headline, source, created_at
     FROM ai_briefings WHERE shop_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).bind(shop.shop_id, PAGE_SIZE, offset).all<{
    id: string; performance: string; strategy: string; actions: string;
    insight: string | null; headline: string | null; source: string; created_at: string;
  }>();

  // What's New 배지 + ai-briefing seen 갱신
  let newBadges: Partial<Record<string, boolean>> = {};
  try {
    const latestBriefingCreatedAt = await getLatestBriefingCreatedAt(c.env.DB, shop.shop_id);
    const [seenPresets, seenChangelog, seenBriefing] = await Promise.all([
      getSeenAt(c.env.KV, ownerId, 'design-presets'),
      getSeenAt(c.env.KV, ownerId, 'changelog'),
      getSeenAt(c.env.KV, ownerId, 'ai-briefing'),
    ]);
    newBadges = {
      '/dashboard/settings/providers': isNew(seenPresets, LATEST_PLUS_PRESET_ADDED),
      '/dashboard/changelog': isNew(seenChangelog, BUILD_TIME),
      '/dashboard/ai-briefing': latestBriefingCreatedAt ? isNew(seenBriefing, latestBriefingCreatedAt) : false,
    };
    // 페이지 방문 → ai-briefing seen 갱신
    c.executionCtx.waitUntil(
      markSeen(c.env.KV, ownerId, 'ai-briefing').catch(() => {}),
    );
  } catch {
    // KV 실패 시 배지 생략
  }

  return c.html(
    <AiBriefingPage
      shop={shop}
      briefings={(briefings.results ?? []).map(r => ({ ...r, insight: r.insight ?? null, headline: r.headline ?? null }))}
      isCafe24={c.get('isCafe24')}
      newBadges={newBadges}
      page={safePage}
      totalPages={totalPages}
      totalCount={totalCount}
    />
  );
});

// ─── QuickStart ──────────────────────────────────────────────

pages.get('/dashboard/quickstart', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  return c.html(
    <QuickStartPage shop={shop ? { sso_configured: shop.sso_configured, plan: shop.plan } : null} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Guide ───────────────────────────────────────────────────

pages.get('/dashboard/guide', (c) => {
  return c.html(
    <GuidePage isCafe24={c.get('isCafe24')} />
  );
});

// ─── FAQ ─────────────────────────────────────────────────────

pages.get('/dashboard/faq', (c) => {
  return c.html(<FaqPage isCafe24={c.get('isCafe24')} />);
});

// ─── Inquiries ───────────────────────────────────────────────

pages.get('/dashboard/inquiries', async (c) => {
  const ownerId = c.get('ownerId');
  const result = await c.env.DB.prepare(
    `SELECT i.id, i.title, i.status, i.created_at, i.replied_at,
            s.shop_name, s.mall_id
     FROM inquiries i
     JOIN shops s ON i.shop_id = s.shop_id
     WHERE i.owner_id = ?
     ORDER BY i.created_at DESC
     LIMIT 50`,
  )
    .bind(ownerId)
    .all<{
      id: string;
      title: string;
      status: string;
      created_at: string;
      replied_at: string | null;
      shop_name: string | null;
      mall_id: string;
    }>();

  return c.html(
    <InquiriesPage
      isCafe24={c.get('isCafe24')}
      inquiries={result.results ?? []}
    />
  );
});

pages.get('/dashboard/inquiries/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const inquiryId = c.req.param('id');

  const inquiry = await c.env.DB.prepare(
    `SELECT i.id, i.title, i.content, i.status, i.reply, i.replied_at, i.created_at,
            i.customer_read_at, i.attachments,
            s.shop_name, s.mall_id
     FROM inquiries i
     JOIN shops s ON i.shop_id = s.shop_id
     WHERE i.id = ? AND i.owner_id = ?`,
  )
    .bind(inquiryId, ownerId)
    .first<{
      id: string;
      title: string;
      content: string;
      status: string;
      reply: string | null;
      replied_at: string | null;
      created_at: string;
      customer_read_at: string | null;
      attachments: string | null;
      shop_name: string | null;
      mall_id: string;
    }>();

  if (!inquiry) return c.redirect('/dashboard/inquiries');

  // 고객 조회 시각 기록 — 답변이 존재하고 아직 최초 조회 기록이 없을 때만
  // (실제 고객 페이지 렌더 경로는 이곳이므로 여기서 기록해야 함)
  if (inquiry.reply && !inquiry.customer_read_at) {
    c.executionCtx.waitUntil(
      c.env.DB.prepare(
        "UPDATE inquiries SET customer_read_at = datetime('now') WHERE id = ? AND customer_read_at IS NULL"
      )
        .bind(inquiryId)
        .run()
        .catch((e) => console.error('[customer-read] update failed:', e)),
    );
  }

  return c.html(
    <InquiryDetailPage
      isCafe24={c.get('isCafe24')}
      inquiry={inquiry}
    />
  );
});

// ─── (Legacy) Shops ──────────────────────────────────────────
// 기존 /dashboard/shops/* 라우트 — 단일 쇼핑몰 구조로 전환 후 리다이렉트

pages.get('/dashboard/shops', (c) => c.redirect('/dashboard', 301));
pages.get('/dashboard/shops/new', (c) => c.redirect('/dashboard', 301));

pages.get('/dashboard/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard', 301);
  return c.redirect('/dashboard/settings/general', 301);
});

pages.get('/dashboard/shops/:id/setup', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard', 301);
  return c.redirect('/dashboard/settings/sso-guide', 301);
});

pages.get('/dashboard/shops/:id/providers', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard', 301);
  return c.redirect('/dashboard/settings/providers', 301);
});

pages.get('/dashboard/shops/:id/ai-briefing', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard', 301);
  return c.redirect('/dashboard/ai-reports', 301);
});

// ─── (Legacy) /dashboard/settings — 계정 설정 리다이렉트 ───────

pages.get('/dashboard/settings', (c) => {
  return c.redirect('/dashboard/settings/general');
});

// ─── Settings API (JSON endpoints in pages.tsx) ──────────────
// NOTE: 아래 PUT/DELETE 엔드포인트들은 pages.tsx에 혼재되어 있음.
// 분리 가능 여부: routes/settings.ts 를 별도로 만들어 이관할 수 있음.
// 단, getOwnerIdFromCookie 헬퍼도 함께 이동해야 하고, app.ts 라우팅 등록도 필요.
// 현재 규모(3개 엔드포인트)에서는 리스크 대비 이득이 적으므로 보류.
// ─────────────────────────────────────────────────────────────

// ─── Settings API (password change) ─────────────────────────

pages.put('/api/dashboard/settings/password', async (c) => {
  // 명시적 인증 체크 (미들웨어 범위 밖이므로)
  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ current_password: string; new_password: string }>();

  if (!body.current_password || !body.new_password || body.new_password.length < 8) {
    return c.json({ error: 'invalid_input' }, 400);
  }

  const owner = await c.env.DB
    .prepare('SELECT password_hash FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ password_hash: string }>();

  if (!owner) return c.json({ error: 'not_found' }, 404);

  const valid = await verifyPassword(body.current_password, owner.password_hash);
  if (!valid) return c.json({ error: 'wrong_password' }, 401);

  const newHash = await hashPassword(body.new_password);
  await c.env.DB
    .prepare('UPDATE owners SET password_hash = ? WHERE owner_id = ?')
    .bind(newHash, ownerId)
    .run();

  return c.json({ ok: true });
});

// ─── Settings API (profile update) ──────────────────────────

pages.put('/api/dashboard/settings/profile', async (c) => {
  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ name: string }>();

  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: 'invalid_input' }, 400);
  }

  const trimmedName = body.name.trim();
  if (trimmedName.length > 100) {
    return c.json({ error: 'name_too_long' }, 400);
  }

  await c.env.DB
    .prepare('UPDATE owners SET name = ? WHERE owner_id = ?')
    .bind(trimmedName, ownerId)
    .run();

  return c.json({ ok: true });
});

// ─── Settings API (account delete) ──────────────────────────

pages.delete('/api/dashboard/settings/account', async (c) => {
  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const body = await c.req.json<{ password: string }>();

  if (!body.password) {
    return c.json({ error: 'invalid_input' }, 400);
  }

  const owner = await c.env.DB
    .prepare('SELECT password_hash FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ password_hash: string }>();

  if (!owner) return c.json({ error: 'not_found' }, 404);

  const valid = await verifyPassword(body.password, owner.password_hash);
  if (!valid) return c.json({ error: 'wrong_password' }, 401);

  // 해당 owner의 모든 shop soft delete
  await c.env.DB
    .prepare(`UPDATE shops SET deleted_at = datetime('now') WHERE owner_id = ? AND deleted_at IS NULL`)
    .bind(ownerId)
    .run();

  // owner soft delete: email을 'deleted_날짜'로 변경하고 password_hash 초기화
  const deletedEmail = `deleted_${new Date().toISOString().replace(/[:.]/g, '-')}_${ownerId.slice(0, 8)}`;
  await c.env.DB
    .prepare(`UPDATE owners SET email = ?, password_hash = '', deleted_at = datetime('now') WHERE owner_id = ?`)
    .bind(deletedEmail, ownerId)
    .run();

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'bg_token=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0',
    },
  });
});

// ─── Admin SSR 페이지 ─────────────────────────────────────────

// 관리자 전용 쿠키(bg_admin_token)에서 ownerId 추출
async function getAdminIdFromCookie(cookie: string | undefined, secret: string): Promise<string | null> {
  if (!cookie) return null;
  const match = cookie.match(/bg_admin_token=([^;]+)/);
  if (!match) return null;
  const payload = await verifyToken(match[1], secret);
  return payload?.sub ?? null;
}

// 관리자 인증 미들웨어 (SSR 페이지용 — 인증 실패 시 리다이렉트)
pages.use('/supadmin/*', async (c, next) => {
  const path = new URL(c.req.url).pathname;
  // 로그인/로그아웃 페이지는 인증 불필요
  if (path === '/supadmin/login' || path === '/supadmin/logout') return next();

  const ownerId = await getAdminIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) return c.redirect('/supadmin/login');

  const owner = await c.env.DB.prepare('SELECT role FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ role: string }>();

  if (!owner || owner.role !== 'admin') {
    return c.redirect('/supadmin/login');
  }

  c.set('ownerId', ownerId);
  return next();
});

// GET /supadmin/login — 관리자 로그인 페이지
pages.get('/supadmin/login', (c) => {
  return c.html(
    <html lang="ko">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>관리자 로그인</title>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
        .login-card { background: #1e293b; border-radius: 12px; padding: 40px; width: 100%; max-width: 380px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
        .login-card h1 { color: #f1f5f9; font-size: 20px; margin-bottom: 8px; text-align: center; }
        .login-card p { color: #64748b; font-size: 13px; text-align: center; margin-bottom: 24px; }
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; color: #94a3b8; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
        .form-group input { width: 100%; padding: 10px 12px; border: 1px solid #334155; border-radius: 6px; background: #0f172a; color: #f1f5f9; font-size: 14px; outline: none; }
        .form-group input:focus { border-color: #3b82f6; }
        .btn-login { width: 100%; padding: 10px; background: #ef4444; color: #fff; border: none; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; }
        .btn-login:hover { background: #dc2626; }
        .btn-login:disabled { opacity: 0.5; cursor: not-allowed; }
        .error { color: #ef4444; font-size: 12px; text-align: center; margin-top: 12px; display: none; }
        .badge-admin { background: #ef4444; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
      `}</style>
    </head>
    <body>
      <div class="login-card">
        <h1><span class="badge-admin">ADMIN</span> 관리자 로그인</h1>
        <p>번개가입 관리자 전용</p>
        <form id="adminLoginForm">
          <div class="form-group">
            <label>아이디</label>
            <input type="text" id="adminEmail" placeholder="관리자 아이디" autocomplete="username" />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input type="password" id="adminPassword" placeholder="비밀번호" autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-login" id="loginBtn">로그인</button>
          <p class="error" id="loginError"></p>
        </form>
      </div>
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
          e.preventDefault();
          var btn = document.getElementById('loginBtn');
          var err = document.getElementById('loginError');
          btn.disabled = true; btn.textContent = '로그인 중...';
          err.style.display = 'none';
          try {
            var resp = await fetch('/api/supadmin/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                email: document.getElementById('adminEmail').value.trim(),
                password: document.getElementById('adminPassword').value
              })
            });
            if (resp.ok) {
              window.location.href = '/supadmin';
            } else {
              var data = await resp.json().catch(function() { return {}; });
              err.textContent = data.message || '아이디 또는 비밀번호가 올바르지 않습니다.';
              err.style.display = 'block';
            }
          } catch(ex) {
            err.textContent = '서버 오류가 발생했습니다.';
            err.style.display = 'block';
          } finally {
            btn.disabled = false; btn.textContent = '로그인';
          }
        });
      `}} />
    </body>
    </html>
  );
});

// GET /supadmin/logout
pages.get('/supadmin/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/supadmin/login',
      'Set-Cookie': 'bg_admin_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
});

// GET /admin — 관리자 홈
pages.get('/supadmin', async (c) => {
  // 6개 쿼리 병렬 실행
  const [planCounts, providerResult, dailySignups, topShops, pendingInquiries, pendingCount] =
    await Promise.all([
      // 플랜별 쇼핑몰 수 — shops.plan은 'free'/'plus'. 월간/연간 분해는 active subscription의 billing_cycle 기반.
      c.env.DB.prepare(
        `SELECT
          (SELECT COUNT(*) FROM shops WHERE deleted_at IS NULL) as total,
          (SELECT COUNT(*) FROM shops WHERE deleted_at IS NULL AND plan = 'free') as free_count,
          (SELECT COUNT(*) FROM shops s JOIN subscriptions sub ON sub.shop_id = s.shop_id
             WHERE s.deleted_at IS NULL AND s.plan = 'plus' AND sub.status = 'active' AND sub.billing_cycle = 'monthly') as monthly_count,
          (SELECT COUNT(*) FROM shops s JOIN subscriptions sub ON sub.shop_id = s.shop_id
             WHERE s.deleted_at IS NULL AND s.plan = 'plus' AND sub.status = 'active' AND sub.billing_cycle = 'yearly') as yearly_count`,
      ).first<{ total: number; free_count: number; monthly_count: number; yearly_count: number }>(),

      // 프로바이더별 가입 분포 (전체)
      c.env.DB.prepare(
        `SELECT provider, COUNT(*) as cnt FROM login_stats WHERE action = 'signup' GROUP BY provider ORDER BY cnt DESC`,
      ).all<{ provider: string; cnt: number }>(),

      // 일자별 가입 추이 (최근 14일)
      c.env.DB.prepare(
        `SELECT DATE(created_at) as date, COUNT(*) as cnt
         FROM login_stats WHERE action = 'signup' AND created_at >= datetime('now', '-14 days')
         GROUP BY DATE(created_at) ORDER BY date ASC`,
      ).all<{ date: string; cnt: number }>(),

      // 상위 10개 쇼핑몰 (총 회원수 기준)
      c.env.DB.prepare(
        `SELECT s.shop_name, s.mall_id, s.plan,
          COUNT(*) as total_signups,
          SUM(CASE WHEN ls.created_at >= datetime('now', 'start of month') THEN 1 ELSE 0 END) as monthly_signups,
          SUM(CASE WHEN DATE(ls.created_at) = DATE('now') THEN 1 ELSE 0 END) as daily_signups
        FROM login_stats ls
        JOIN shops s ON ls.shop_id = s.shop_id
        WHERE ls.action = 'signup' AND s.deleted_at IS NULL
        GROUP BY ls.shop_id
        ORDER BY total_signups DESC
        LIMIT 10`,
      ).all<{ shop_name: string; mall_id: string; plan: string; total_signups: number; monthly_signups: number; daily_signups: number }>(),

      // 미답변 문의 (최근 10건)
      c.env.DB.prepare(
        `SELECT i.id, i.title, i.created_at, o.email as owner_email, s.shop_name
         FROM inquiries i
         JOIN owners o ON i.owner_id = o.owner_id
         JOIN shops s ON i.shop_id = s.shop_id
         WHERE i.status = 'pending'
         ORDER BY i.created_at DESC LIMIT 10`,
      ).all<{ id: string; title: string; created_at: string; owner_email: string; shop_name: string }>(),

      // 미답변 문의 수
      c.env.DB.prepare(
        "SELECT COUNT(*) as cnt FROM inquiries WHERE status = 'pending'",
      ).first<{ cnt: number }>(),
    ]);

  return c.html(
    <AdminHomePage
      planCounts={{
        total: planCounts?.total ?? 0,
        free: planCounts?.free_count ?? 0,
        cycleMonthly: planCounts?.monthly_count ?? 0,
        cycleYearly: planCounts?.yearly_count ?? 0,
      }}
      providerDistribution={providerResult.results ?? []}
      dailySignups={dailySignups.results ?? []}
      topShops={topShops.results ?? []}
      pendingInquiries={pendingInquiries.results ?? []}
      pendingInquiryCount={pendingCount?.cnt ?? 0}
    />
  );
});

// GET /admin/shops — 전체 쇼핑몰
pages.get('/supadmin/shops', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = c.req.query('search') || '';

  let query =
    'SELECT s.shop_id, s.shop_name, s.mall_id, s.plan, s.deleted_at, s.created_at, o.email as owner_email FROM shops s JOIN owners o ON s.owner_id = o.owner_id WHERE 1=1';
  const params: string[] = [];

  const escapedSearch = search ? escapeLike(search) : '';
  if (search) {
    query += " AND (s.mall_id LIKE ? ESCAPE '\\' OR s.shop_name LIKE ? ESCAPE '\\' OR o.email LIKE ? ESCAPE '\\')";
    params.push(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`);
  }

  query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const countQuery = search
    ? "SELECT COUNT(*) as total FROM shops s JOIN owners o ON s.owner_id = o.owner_id WHERE (s.mall_id LIKE ? ESCAPE '\\' OR s.shop_name LIKE ? ESCAPE '\\' OR o.email LIKE ? ESCAPE '\\')"
    : 'SELECT COUNT(*) as total FROM shops';

  const [shopsResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<{
      shop_id: string; shop_name: string; mall_id: string; plan: string;
      deleted_at: string | null; created_at: string; owner_email: string;
    }>(),
    search
      ? c.env.DB.prepare(countQuery).bind(`%${escapedSearch}%`, `%${escapedSearch}%`, `%${escapedSearch}%`).first<{ total: number }>()
      : c.env.DB.prepare(countQuery).first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.html(
    <AdminShopsPage
      shops={shopsResult.results ?? []}
      pagination={{ page, pages: Math.ceil(total / limit), total }}
      search={search}
    />
  );
});

// GET /supadmin/shops/:id — 쇼핑몰 상세
pages.get('/supadmin/shops/:id', async (c) => {
  const shopId = c.req.param('id');

  const shop = await c.env.DB.prepare(
    `SELECT s.*, o.email as owner_email, o.name as owner_name
     FROM shops s JOIN owners o ON s.owner_id = o.owner_id
     WHERE s.shop_id = ?`
  ).bind(shopId).first();

  if (!shop) return c.redirect('/supadmin/shops');

  // 최근 가입 통계 (7일)
  const recentStats = await c.env.DB.prepare(
    `SELECT provider, COUNT(*) as cnt FROM login_stats
     WHERE shop_id = ? AND action = 'signup' AND created_at >= datetime('now', '-7 days')
     GROUP BY provider ORDER BY cnt DESC`
  ).bind(shopId).all<{ provider: string; cnt: number }>();

  // 총 가입자 수
  const totalSignups = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM login_stats WHERE shop_id = ? AND action = 'signup'"
  ).bind(shopId).first<{ cnt: number }>();

  return c.html(
    <AdminShopDetailPage
      shop={shop as any}
      recentStats={recentStats.results ?? []}
      totalSignups={totalSignups?.cnt ?? 0}
    />
  );
});

// GET /admin/subscriptions — 전체 구독 현황
pages.get('/supadmin/subscriptions', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT sub.id as subscription_id, sub.shop_id, sub.plan, sub.billing_cycle, sub.status, sub.started_at, sub.expires_at, sub.created_at,
            s.mall_id, s.shop_name, o.email as owner_email
     FROM subscriptions sub
     JOIN shops s ON sub.shop_id = s.shop_id
     JOIN owners o ON sub.owner_id = o.owner_id
     ORDER BY sub.created_at DESC LIMIT 100`,
  ).all<{
    subscription_id: string; shop_id: string; shop_name: string; mall_id: string;
    owner_email: string; plan: string; billing_cycle: string; status: string;
    started_at: string | null; expires_at: string | null; created_at: string;
  }>();

  return c.html(
    <AdminSubscriptionsPage subscriptions={result.results ?? []} />
  );
});

// GET /supadmin/monitoring — 시스템 모니터링
pages.get('/supadmin/monitoring', (c) => {
  return c.html(
    <AdminMonitoringPage />
  );
});

// GET /admin/inquiries — 문의 관리
pages.get('/supadmin/inquiries', async (c) => {
  const statusFilter = c.req.query('status') || '';
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = `
    SELECT i.id, i.title, i.content, i.reply, i.status, i.created_at, i.replied_at,
           o.email as owner_email, s.shop_name, s.mall_id,
           i.shop_id, s.auto_reply_inquiries, i.customer_read_at, i.admin_read_at
    FROM inquiries i
    JOIN owners o ON i.owner_id = o.owner_id
    JOIN shops s ON i.shop_id = s.shop_id
    WHERE 1=1`;
  const params: string[] = [];

  if (statusFilter) {
    query += ' AND i.status = ?';
    params.push(statusFilter);
  }

  query += " ORDER BY CASE i.status WHEN 'pending' THEN 0 ELSE 1 END, i.created_at DESC LIMIT ? OFFSET ?";
  params.push(String(limit), String(offset));

  const countQuery = statusFilter
    ? 'SELECT COUNT(*) as total FROM inquiries WHERE status = ?'
    : 'SELECT COUNT(*) as total FROM inquiries';

  const [result, countResult, globalAutoReplyEnabled, pendingCountRow, autoRepliedCountRow] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<{
      id: string; title: string; content: string; reply: string | null;
      status: string; created_at: string;
      replied_at: string | null; owner_email: string;
      shop_name: string | null; mall_id: string;
      shop_id: string; auto_reply_inquiries: number;
      customer_read_at: string | null; admin_read_at: string | null;
    }>(),
    statusFilter
      ? c.env.DB.prepare(countQuery).bind(statusFilter).first<{ total: number }>()
      : c.env.DB.prepare(countQuery).first<{ total: number }>(),
    getGlobalAutoReplyEnabled(c.env),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM inquiries WHERE status = 'pending'").first<{ cnt: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) as cnt FROM inquiries WHERE status = 'auto_replied'").first<{ cnt: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.html(
    <AdminInquiriesPage
      inquiries={result.results ?? []}
      pagination={{ page, pages: Math.ceil(total / limit), total }}
      statusFilter={statusFilter}
      globalAutoReplyEnabled={globalAutoReplyEnabled}
      pendingCount={pendingCountRow?.cnt ?? 0}
      autoRepliedCount={autoRepliedCountRow?.cnt ?? 0}
    />
  );
});

// GET /admin/ai-reports — AI 보고서 현황
pages.get('/supadmin/ai-reports', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT s.shop_id, s.shop_name, s.mall_id, s.plan, s.shop_identity,
            ab.id as briefing_id, ab.source as briefing_type, ab.performance as summary,
            ab.created_at as briefing_created_at
     FROM shops s
     LEFT JOIN ai_briefings ab ON ab.shop_id = s.shop_id
       AND ab.id = (
         SELECT id FROM ai_briefings
         WHERE shop_id = s.shop_id
         ORDER BY created_at DESC
         LIMIT 1
       )
     WHERE s.deleted_at IS NULL
     ORDER BY ab.created_at DESC, s.created_at DESC
     LIMIT 100`,
  ).all<{
    shop_id: string; shop_name: string | null; mall_id: string;
    plan: string; shop_identity: string | null;
    briefing_id: string | null; briefing_type: string | null;
    summary: string | null; briefing_created_at: string | null;
  }>();

  return c.html(
    <AdminAiReportsPage shops={result.results ?? []} />
  );
});

// GET /supadmin/ai-reports/:shopId — 쇼핑몰별 AI 보고서 상세
pages.get('/supadmin/ai-reports/:shopId', async (c) => {
  const shopId = c.req.param('shopId');

  const shop = await c.env.DB.prepare(
    'SELECT shop_id, shop_name, mall_id, shop_identity FROM shops WHERE shop_id = ?'
  ).bind(shopId).first<{ shop_id: string; shop_name: string; mall_id: string; shop_identity: string | null }>();

  if (!shop) return c.redirect('/supadmin/ai-reports');

  const briefings = await c.env.DB.prepare(
    `SELECT id, performance, strategy, actions, insight, source, created_at
     FROM ai_briefings WHERE shop_id = ?
     ORDER BY created_at DESC LIMIT 50`
  ).bind(shopId).all<{
    id: string; performance: string; strategy: string; actions: string;
    insight: string | null; source: string; created_at: string;
  }>();

  return c.html(
    <AdminAiReportDetailPage
      shopName={shop.shop_name || shop.mall_id}
      shopId={shop.shop_id}
      mallId={shop.mall_id}
      shopIdentity={shop.shop_identity}
      briefings={briefings.results ?? []}
    />
  );
});

// ─── Changelog (운영자용) ────────────────────────────────────

pages.get('/dashboard/changelog', async (c) => {
  const ownerId = c.get('ownerId');
  const isCafe24 = c.get('isCafe24');
  const changelogHtml = renderMarkdown(CHANGELOG_PUBLIC);

  // What's New 인디케이터: seen 시각 조회 + 방문 기록 갱신 (병렬)
  let newBadges: Partial<Record<string, boolean>> = {};
  try {
    const [seenPresets, seenChangelog] = await Promise.all([
      getSeenAt(c.env.KV, ownerId, 'design-presets'),
      getSeenAt(c.env.KV, ownerId, 'changelog'),
    ]);
    newBadges = {
      '/dashboard/settings/providers': isNew(seenPresets, LATEST_PLUS_PRESET_ADDED),
      '/dashboard/changelog': isNew(seenChangelog, BUILD_TIME),
    };
    // 이 페이지 방문 — changelog seen 갱신 (비동기, 실패 무시)
    c.executionCtx.waitUntil(
      markSeen(c.env.KV, ownerId, 'changelog').catch(() => {}),
    );
  } catch {
    // KV 조회 실패 시 배지 표시 안 함 (페이지 렌더링 정상 진행)
  }

  return c.html(
    <Layout
      title="새로운 기능"
      loggedIn={true}
      currentPath="/dashboard/changelog"
      isCafe24={isCafe24}
      newBadges={newBadges}
    >
      <style>{`
        .changelog-page { max-width: 720px; margin: 0 auto; }
        .changelog-version-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 10px;
          padding: 10px 18px;
          margin-bottom: 28px;
        }
        .changelog-version-badge .ver-label {
          font-size: 12px;
          color: #0369a1;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .changelog-version-badge .ver-num {
          font-size: 22px;
          font-weight: 800;
          color: #0c4a6e;
          letter-spacing: -0.02em;
        }
        .changelog-content { line-height: 1.8; color: #1e293b; }
        .changelog-content h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 32px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .changelog-content h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 28px 0 8px; }
        .changelog-content h3 { font-size: 15px; font-weight: 600; color: #374151; margin: 20px 0 6px; }
        .changelog-content p { margin: 8px 0; font-size: 14px; }
        .changelog-content ul { margin: 6px 0 12px 20px; }
        .changelog-content li { margin: 4px 0; font-size: 14px; }
        .changelog-content strong { color: #0f172a; }
        .changelog-content code { background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font-size: 12.5px; font-family: monospace; color: #be185d; }
        .changelog-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
        .changelog-content a { color: #2563eb; }
        .changelog-content a:hover { text-decoration: underline; }
        .changelog-content blockquote { border-left: 3px solid #cbd5e1; padding: 8px 16px; margin: 12px 0; color: #64748b; font-size: 13px; background: #f8fafc; border-radius: 0 6px 6px 0; }
      `}</style>
      <div class="changelog-page">
        <div class="page-header" style="margin-bottom:24px">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px">새로운 기능 &amp; 업데이트</h2>
          <p style="font-size:13px;color:#64748b;margin:0">번개가입의 새로운 기능과 개선사항을 소개합니다.</p>
        </div>
        <div class="changelog-version-badge">
          <span class="ver-label">현재 버전</span>
          <span class="ver-num">v{BUILD_VERSION}</span>
        </div>
        <div
          class="changelog-content"
          dangerouslySetInnerHTML={{ __html: changelogHtml }}
        />
      </div>
    </Layout>
  );
});

// ─── Changelog (개발자용 — admin 전용) ──────────────────────

pages.get('/supadmin/changelog', (c) => {
  const changelogHtml = renderMarkdown(CHANGELOG_INTERNAL);

  return c.html(
    <Layout
      title="변경사항 (개발자용)"
      loggedIn={true}
      isAdmin={true}
      currentPath="/supadmin/changelog"
    >
      <style>{`
        .changelog-page { max-width: 800px; margin: 0 auto; }
        .changelog-version-badge {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 10px;
          padding: 10px 18px;
          margin-bottom: 28px;
        }
        .changelog-version-badge .ver-label {
          font-size: 12px;
          color: #0369a1;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .changelog-version-badge .ver-num {
          font-size: 22px;
          font-weight: 800;
          color: #0c4a6e;
          letter-spacing: -0.02em;
        }
        .changelog-version-badge .ver-commit {
          font-size: 11px;
          color: #64748b;
          font-family: monospace;
          background: #f1f5f9;
          border-radius: 4px;
          padding: 2px 6px;
        }
        .changelog-content { line-height: 1.8; color: #1e293b; }
        .changelog-content h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin: 32px 0 10px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
        .changelog-content h2 { font-size: 18px; font-weight: 700; color: #1e293b; margin: 28px 0 8px; }
        .changelog-content h3 { font-size: 15px; font-weight: 600; color: #374151; margin: 20px 0 6px; }
        .changelog-content p { margin: 8px 0; font-size: 14px; }
        .changelog-content ul { margin: 6px 0 12px 20px; }
        .changelog-content li { margin: 4px 0; font-size: 14px; }
        .changelog-content strong { color: #0f172a; }
        .changelog-content code { background: #f1f5f9; border-radius: 4px; padding: 1px 5px; font-size: 12.5px; font-family: monospace; color: #be185d; }
        .changelog-content hr { border: none; border-top: 1px solid #e2e8f0; margin: 28px 0; }
        .changelog-content a { color: #2563eb; }
        .changelog-content a:hover { text-decoration: underline; }
        .changelog-content blockquote { border-left: 3px solid #cbd5e1; padding: 8px 16px; margin: 12px 0; color: #64748b; font-size: 13px; background: #f8fafc; border-radius: 0 6px 6px 0; }
      `}</style>
      <div class="changelog-page">
        <div class="page-header" style="margin-bottom:24px">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 4px">변경사항 (개발자용)</h2>
          <p style="font-size:13px;color:#64748b;margin:0">기술 상세·마이그레이션·보안 수정이 모두 포함된 내부 changelog.</p>
        </div>
        <div class="changelog-version-badge">
          <span class="ver-label">현재 버전</span>
          <span class="ver-num">v{BUILD_VERSION}</span>
          <span class="ver-commit">[{BUILD_COMMIT_SHA}]</span>
        </div>
        <div
          class="changelog-content"
          dangerouslySetInnerHTML={{ __html: changelogHtml }}
        />
      </div>
    </Layout>
  );
});

export default pages;
