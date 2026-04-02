/**
 * Dashboard SSR page routes.
 *
 * These routes serve server-rendered HTML pages for the admin dashboard.
 * All pages except /login and /register require authentication via cookie.
 */
import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { FREE_PLAN_MONTHLY_LIMIT, FREE_PLAN_WARN_THRESHOLD } from '@supasignup/bg-core';
import { verifyToken } from '../services/jwt';
import { hashPassword, verifyPassword } from '../services/password';
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
  AiReportsPage,
  GuidePage,
  InquiriesPage,
  SettingsPage,
  PrivacyPage,
  TermsPage,
  LandingPage,
  AdminHomePage,
  AdminShopsPage,
  AdminSubscriptionsPage,
  AdminAuditLogPage,
  AdminOwnersPage,
} from '../views/pages';

type PageEnv = {
  Bindings: Env;
  Variables: { ownerId: string; isCafe24: boolean };
};

function escapeLike(s: string): string {
  return s.replace(/[%_\\]/g, '\\$&');
}

// 현재 owner의 shop을 자동 조회 (단일 쇼핑몰 구조)
async function getOwnerShop(db: D1Database, ownerId: string) {
  return db.prepare(
    `SELECT shop_id, shop_name, mall_id, client_id, client_secret, platform, plan,
            enabled_providers, sso_configured, created_at, coupon_config, kakao_channel_id, widget_style
     FROM shops WHERE owner_id = ? AND deleted_at IS NULL LIMIT 1`,
  ).bind(ownerId).first<ShopRow & {
    coupon_config: string | null;
    kakao_channel_id: string | null;
    widget_style: string | null;
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
};

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
  if (path === '/dashboard/login' || path === '/dashboard/register' || path === '/dashboard/logout' || path === '/dashboard/session-expired') {
    return next();
  }

  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) {
    // 플랫폼 사용자 힌트 쿠키가 있으면 세션 만료 안내 페이지로
    const cookie = c.req.header('Cookie') ?? '';
    const isPlatform = cookie.includes('bg_platform=1');
    if (isPlatform) {
      return c.redirect('/dashboard/session-expired');
    }
    return c.redirect('/dashboard/login');
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

pages.get('/dashboard/login', (c) => {
  return c.html(<LoginPage />);
});

pages.get('/dashboard/register', (c) => {
  return c.html(<RegisterPage />);
});

pages.get('/dashboard/logout', (c) => {
  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/dashboard/login',
      'Set-Cookie': 'bg_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
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

  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);
  const now = new Date();
  const nextMonthFirst = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  const billingMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

  const [totalResult, todayResult, monthResult, providerResult, billingResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats WHERE shop_id = ?`,
    ).bind(shop.shop_id).first<{ total: number; signups: number; logins: number }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`,
    ).bind(shop.shop_id, today).first<{ cnt: number }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats
       WHERE shop_id = ? AND action = 'signup' AND created_at >= ?`,
    ).bind(shop.shop_id, `${yearMonth}-01`).first<{ cnt: number }>(),

    c.env.DB.prepare(
      `SELECT provider, COUNT(*) as cnt
       FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       GROUP BY provider`,
    ).bind(shop.shop_id).all<{ provider: string; cnt: number }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as monthly_signups FROM login_stats
       WHERE shop_id = ? AND action = 'signup'
       AND created_at >= ? AND created_at < ?`,
    ).bind(shop.shop_id, `${billingMonth}-01`, nextMonthFirst)
     .first<{ monthly_signups: number }>(),
  ]);

  const byProvider: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    byProvider[row.provider] = row.cnt;
  }

  let couponEnabled = false;
  if (shop.coupon_config) {
    try { couponEnabled = JSON.parse(shop.coupon_config)?.enabled === true; } catch { /* ignore */ }
  }

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
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Stats Page ─────────────────────────────────────────────

pages.get('/dashboard/stats', async (c) => {
  const ownerId = c.get('ownerId');
  const shopIdFilter = c.req.query('shop_id') || null;
  const period = c.req.query('period') || '';

  // Build date filter
  let dateFilter = '';
  let dateParam: string | null = null;
  const today = new Date().toISOString().slice(0, 10);
  const yearMonth = today.slice(0, 7);

  if (period === 'today') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = today;
  } else if (period === '7d') {
    dateFilter = " AND ls.created_at >= DATE('now', '-7 days')";
  } else if (period === '30d') {
    dateFilter = " AND ls.created_at >= DATE('now', '-30 days')";
  } else if (period === 'month') {
    dateFilter = ' AND ls.created_at >= ?';
    dateParam = `${yearMonth}-01`;
  }

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

  // Funnel data (only when a specific shop is selected)
  let funnelData: { event_type: string; cnt: number }[] = [];
  if (shopIdFilter) {
    const funnelResult = await c.env.DB.prepare(
      `SELECT event_type, COUNT(*) as cnt
       FROM funnel_events
       WHERE shop_id = ? AND created_at > datetime('now', '-7 days')
       GROUP BY event_type`,
    ).bind(shopIdFilter).all<{ event_type: string; cnt: number }>();
    funnelData = funnelResult.results ?? [];
  }

  // All queries in parallel
  const [totalResult, todayResult, monthResult, providerResult, dailyResult, shopsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN action = 'signup' THEN 1 ELSE 0 END) as signups,
        SUM(CASE WHEN action = 'login' THEN 1 ELSE 0 END) as logins
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL${dateFilter}${shopFilter}`,
    ).bind(...baseParams).first<{ total: number; signups: number; logins: number }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    ).bind(...todayParams).first<{ cnt: number }>(),

    c.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.action = 'signup' AND ls.created_at >= ?${shopFilter}`,
    ).bind(...monthParams).first<{ cnt: number }>(),

    c.env.DB.prepare(
      `SELECT ls.provider, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL AND ls.action = 'signup'${dateFilter}${shopFilter}
       GROUP BY ls.provider`,
    ).bind(...providerParams).all<{ provider: string; cnt: number }>(),

    c.env.DB.prepare(
      `SELECT DATE(ls.created_at) as day, ls.action, COUNT(*) as cnt
       FROM login_stats ls
       JOIN shops s ON ls.shop_id = s.shop_id
       WHERE s.owner_id = ? AND s.deleted_at IS NULL
       AND ls.created_at >= ?${shopFilter}
       GROUP BY day, ls.action
       ORDER BY day`,
    ).bind(...dailyParams).all<{ day: string; action: string; cnt: number }>(),

    c.env.DB.prepare(
      'SELECT shop_id, shop_name FROM shops WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at',
    ).bind(ownerId).all<{ shop_id: string; shop_name: string }>(),
  ]);

  const byProvider: Record<string, number> = {};
  for (const row of providerResult.results ?? []) {
    byProvider[row.provider] = row.cnt;
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
      daily={dailyResult.results ?? []}
      shops={shopsResult.results ?? []}
      currentShopId={shopIdFilter}
      currentPeriod={period}
      funnelData={funnelData}
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
  if (c.get('isCafe24')) {
    return c.redirect('/dashboard');
  }
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  const owner = await c.env.DB
    .prepare('SELECT email, name FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ email: string; name: string }>();

  if (!owner) return c.redirect('/dashboard/login');

  return c.html(
    <GeneralSettingsPage
      email={owner.email}
      name={owner.name}
      shop={shop ?? null}
      isCafe24={c.get('isCafe24')}
    />
  );
});

// ─── Settings: SSO Guide ─────────────────────────────────────

pages.get('/dashboard/settings/sso-guide', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  // Mask secret
  const secret = shop.client_secret;
  const masked = secret.length > 8
    ? secret.slice(0, 4) + '****' + secret.slice(-4)
    : '****';

  return c.html(
    <SsoGuidePage
      shop={{ ...shop, client_secret: masked }}
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

  let widgetStyle: { preset: string; buttonWidth: number; buttonGap: number; borderRadius: number; align: string } | undefined;
  if (shop.widget_style) {
    try { widgetStyle = JSON.parse(shop.widget_style); } catch { /* use default */ }
  }

  return c.html(
    <ProvidersPage
      shop={shop}
      baseUrl={c.env.BASE_URL}
      isCafe24={c.get('isCafe24')}
      widgetStyle={widgetStyle}
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

  let couponConfig: { enabled: boolean; coupon_no: string; coupon_name?: string; multi_coupon: boolean } | null = null;
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
  return c.html(
    <BannerSettingsPage shop={shop ?? null} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: Popup [Plus] ──────────────────────────────────

pages.get('/dashboard/settings/popup', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  return c.html(
    <PopupSettingsPage shop={shop ?? null} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Settings: Escalation [Plus] ────────────────────────────

pages.get('/dashboard/settings/escalation', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  return c.html(
    <EscalationSettingsPage shop={shop ?? null} isCafe24={c.get('isCafe24')} />
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

// ─── Settings: AI [Plus] ─────────────────────────────────────

pages.get('/dashboard/settings/ai', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  return c.html(
    <AiSettingsPage shop={shop ?? null} isCafe24={c.get('isCafe24')} />
  );
});

// ─── AI Reports [Plus] ───────────────────────────────────────

pages.get('/dashboard/ai-reports', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');

  return c.html(
    <AiReportsPage shop={shop} isCafe24={c.get('isCafe24')} />
  );
});

// ─── Guide ───────────────────────────────────────────────────

pages.get('/dashboard/guide', (c) => {
  return c.html(
    <GuidePage isCafe24={c.get('isCafe24')} />
  );
});

// ─── Inquiries ───────────────────────────────────────────────

pages.get('/dashboard/inquiries', (c) => {
  return c.html(
    <InquiriesPage isCafe24={c.get('isCafe24')} />
  );
});

// ─── (Legacy) Shops ──────────────────────────────────────────
// 기존 /dashboard/shops/* 라우트 — 단일 쇼핑몰 구조로 전환 후 리다이렉트

pages.get('/dashboard/shops', (c) => c.redirect('/dashboard'));
pages.get('/dashboard/shops/new', (c) => c.redirect('/dashboard'));

pages.get('/dashboard/shops/:id', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.redirect('/dashboard/settings/general');
});

pages.get('/dashboard/shops/:id/setup', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.redirect('/dashboard/settings/sso-guide');
});

pages.get('/dashboard/shops/:id/providers', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.redirect('/dashboard/settings/providers');
});

pages.get('/dashboard/shops/:id/ai-briefing', async (c) => {
  const ownerId = c.get('ownerId');
  const shop = await getOwnerShop(c.env.DB, ownerId);
  if (!shop) return c.redirect('/dashboard');
  return c.redirect('/dashboard/ai-reports');
});

// ─── (Legacy) /dashboard/settings — 계정 설정 리다이렉트 ───────

pages.get('/dashboard/settings', (c) => {
  return c.redirect('/dashboard/settings/general');
});

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
      'Set-Cookie': 'bg_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0',
    },
  });
});

// ─── Admin SSR 페이지 ─────────────────────────────────────────

// 관리자 인증 미들웨어 (SSR 페이지용 — 인증 실패 시 리다이렉트)
pages.use('/admin/*', async (c, next) => {
  const ownerId = await getOwnerIdFromCookie(c.req.header('Cookie'), c.env.JWT_SECRET);
  if (!ownerId) return c.redirect('/dashboard/login');

  const owner = await c.env.DB.prepare('SELECT role FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ role: string }>();

  if (!owner || owner.role !== 'admin') {
    return c.redirect('/dashboard');
  }

  c.set('ownerId', ownerId);
  return next();
});

// GET /admin — 관리자 홈
pages.get('/admin', async (c) => {
  const [statsResult, recentLogsResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT
        (SELECT COUNT(*) FROM shops) as total_shops,
        (SELECT COUNT(*) FROM shops WHERE deleted_at IS NULL) as active_shops,
        (SELECT COUNT(*) FROM login_stats WHERE action = 'signup') as total_signups`,
    ).first<{ total_shops: number; active_shops: number; total_signups: number }>(),

    c.env.DB.prepare(
      `SELECT a.id, o.email as actor_email, a.action, a.target_type, a.target_id, a.detail, a.created_at
       FROM audit_logs a
       LEFT JOIN owners o ON a.actor_id = o.owner_id
       ORDER BY a.created_at DESC LIMIT 5`,
    ).all<{ id: string; actor_email: string | null; action: string; target_type: string; target_id: string | null; detail: string | null; created_at: string }>(),
  ]);

  const providerResult = await c.env.DB.prepare(
    `SELECT provider, COUNT(*) as cnt FROM login_stats WHERE action = 'signup' GROUP BY provider ORDER BY cnt DESC`,
  ).all<{ provider: string; cnt: number }>();

  return c.html(
    <AdminHomePage
      stats={{
        total_shops: statsResult?.total_shops ?? 0,
        active_shops: statsResult?.active_shops ?? 0,
        total_signups: statsResult?.total_signups ?? 0,
        provider_distribution: providerResult.results ?? [],
      }}
      recentLogs={recentLogsResult.results ?? []}
    />
  );
});

// GET /admin/shops — 전체 쇼핑몰
pages.get('/admin/shops', async (c) => {
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

// GET /admin/subscriptions — 전체 구독 현황
pages.get('/admin/subscriptions', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT sub.id as subscription_id, sub.shop_id, sub.plan, sub.status, sub.started_at, sub.expires_at, sub.created_at,
            s.mall_id, s.shop_name, o.email as owner_email
     FROM subscriptions sub
     JOIN shops s ON sub.shop_id = s.shop_id
     JOIN owners o ON sub.owner_id = o.owner_id
     ORDER BY sub.created_at DESC LIMIT 100`,
  ).all<{
    subscription_id: string; shop_id: string; shop_name: string; mall_id: string;
    owner_email: string; plan: string; status: string;
    started_at: string | null; expires_at: string | null; created_at: string;
  }>();

  return c.html(
    <AdminSubscriptionsPage subscriptions={result.results ?? []} />
  );
});

// GET /admin/audit-log — 감사 로그
pages.get('/admin/audit-log', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 50;
  const offset = (page - 1) * limit;

  const actionFilter = c.req.query('action') || '';
  const fromFilter = c.req.query('from') || '';
  const toFilter = c.req.query('to') || '';

  let where = '';
  const params: (string | number)[] = [];

  if (actionFilter) {
    where += ' AND a.action = ?';
    params.push(actionFilter);
  }
  if (fromFilter) {
    where += ' AND a.created_at >= ?';
    params.push(fromFilter);
  }
  if (toFilter) {
    // to 날짜는 해당 일의 끝까지 포함하기 위해 다음 날 00:00 미만으로 처리
    const toNext = new Date(toFilter);
    toNext.setUTCDate(toNext.getUTCDate() + 1);
    where += ' AND a.created_at < ?';
    params.push(toNext.toISOString().slice(0, 10));
  }

  params.push(limit, offset);

  const result = await c.env.DB.prepare(
    `SELECT a.id, a.action, a.target_type, a.target_id, a.detail, a.created_at, o.email as actor_email
     FROM audit_logs a
     LEFT JOIN owners o ON a.actor_id = o.owner_id
     WHERE 1=1${where}
     ORDER BY a.created_at DESC LIMIT ? OFFSET ?`,
  )
    .bind(...params)
    .all<{
      id: string; action: string; target_type: string; target_id: string | null;
      detail: string | null; created_at: string; actor_email: string | null;
    }>();

  return c.html(
    <AdminAuditLogPage
      logs={result.results ?? []}
      page={page}
      limit={limit}
      currentAction={actionFilter || undefined}
      currentFrom={fromFilter || undefined}
      currentTo={toFilter || undefined}
    />
  );
});

// GET /admin/owners — 사용자(owner) 목록
pages.get('/admin/owners', async (c) => {
  const page = Math.max(1, parseInt(c.req.query('page') || '1') || 1);
  const limit = 20;
  const offset = (page - 1) * limit;
  const search = c.req.query('search') || '';

  const escapedSearch = search ? escapeLike(search) : '';

  let query =
    `SELECT o.owner_id, o.email, o.name, o.role, o.created_at,
      (SELECT COUNT(*) FROM shops s WHERE s.owner_id = o.owner_id AND s.deleted_at IS NULL) as shop_count
     FROM owners o WHERE 1=1`;
  const params: string[] = [];

  if (search) {
    query += " AND (o.email LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\')";
    params.push(`%${escapedSearch}%`, `%${escapedSearch}%`);
  }

  query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(String(limit), String(offset));

  const countQuery = search
    ? "SELECT COUNT(*) as total FROM owners o WHERE (o.email LIKE ? ESCAPE '\\' OR o.name LIKE ? ESCAPE '\\')"
    : 'SELECT COUNT(*) as total FROM owners';

  const [ownersResult, countResult] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all<{
      owner_id: string; email: string; name: string; role: string;
      created_at: string; shop_count: number;
    }>(),
    search
      ? c.env.DB.prepare(countQuery).bind(`%${escapedSearch}%`, `%${escapedSearch}%`).first<{ total: number }>()
      : c.env.DB.prepare(countQuery).first<{ total: number }>(),
  ]);

  const total = countResult?.total ?? 0;

  return c.html(
    <AdminOwnersPage
      owners={ownersResult.results ?? []}
      pagination={{ page, pages: Math.ceil(total / limit), total }}
      search={search}
    />
  );
});

export default pages;
