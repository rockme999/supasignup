/**
 * OAuth Provider endpoints for Cafe24 SSO integration.
 *
 * GET  /oauth/authorize   → Start OAuth flow (redirect to social provider)
 * GET  /oauth/callback/:provider → Handle social provider callback
 * POST /oauth/token       → Exchange auth code for access token
 * GET  /oauth/userinfo    → Return user info for Cafe24 SSO
 */

import { Hono } from 'hono';
import type {
  Env,
  ProviderName,
  OAuthSession,
  AuthCodeData,
  AccessTokenData,
} from '@supasignup/bg-core';
import {
  generateId,
  generateSecret,
  generateCodeVerifier,
  generateCodeChallenge,
  decrypt,
  timingSafeEqual,
} from '@supasignup/bg-core';
import {
  getShopByClientId,
  getShopById,
  ensureShopUser,
  upsertUser,
  recordStat,
  isOverFreeLimit,
  getUserById,
} from '../db/queries';
import { buildSocialAuthUrl, exchangeSocialCode, getSocialUserInfo, verifyTelegramAuth, getTelegramUserInfo } from '../services/social';

const VALID_PROVIDERS: ProviderName[] = ['google', 'kakao', 'naver', 'apple', 'discord', 'facebook', 'x', 'line', 'telegram'];
const SESSION_TTL = 600; // 10 minutes
const AUTH_CODE_TTL = 300; // 5 minutes
const ACCESS_TOKEN_TTL = 7200; // 2 hours

/** signup 시 funnel_events에 signup_complete 이벤트 기록 (통계용) */
async function recordFunnelSignup(
  db: D1Database,
  shopId: string,
  provider: string,
  action: string,
  visitorId?: string,
  device?: string,
): Promise<void> {
  if (action !== 'signup') return;
  const eventData: Record<string, string> = { provider };
  if (visitorId) eventData.visitor_id = visitorId;
  if (device) eventData.device = device;
  await db.prepare(
    'INSERT INTO funnel_events (id, shop_id, event_type, event_data, page_url, visitor_id) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(
    generateId(),
    shopId,
    'signup_complete',
    JSON.stringify(eventData),
    '',
    visitorId || null,
  ).run();
}

const oauth = new Hono<{ Bindings: Env }>();

// ─── GET /authorize ──────────────────────────────────────────
oauth.get('/authorize', async (c) => {
  const t0 = performance.now();
  const clientId = c.req.query('client_id');
  const redirectUri = c.req.query('redirect_uri');
  let provider = c.req.query('provider') as ProviderName | undefined;
  const cafe24State = c.req.query('state'); // state from Cafe24

  if (!clientId || !redirectUri || !cafe24State) {
    return c.json({ error: 'missing_parameters', message: 'client_id, redirect_uri, state are required' }, 400);
  }

  // Look up shop
  const shop = await getShopByClientId(c.env.DB, clientId);
  const tShop = performance.now();

  if (!shop) {
    return c.json({ error: 'invalid_client', message: 'Unknown client_id' }, 400);
  }

  // Validate redirect_uri against whitelist
  const allowedUris: string[] = shop.allowed_redirect_uris
    ? JSON.parse(shop.allowed_redirect_uris)
    : [];
  if (allowedUris.length === 0) {
    return c.json({ error: 'invalid_redirect_uri', message: 'No redirect URIs configured for this shop' }, 400);
  }
  if (!allowedUris.includes(redirectUri)) {
    return c.json({ error: 'invalid_redirect_uri', message: 'redirect_uri is not registered' }, 400);
  }

  // sso_type 자동 감지는 제거됨.
  // SSO 슬롯 확정은 대시보드 "설정 확인" 버튼(POST /shops/:id/verify-sso) 또는
  // 카페24 앱 실행 시 백그라운드 프로빙(probeSsoType)에서 처리.

  // If no provider specified, check KV hint (set by widget before Cafe24 SSO trigger)
  const enabledProviders: string[] = JSON.parse(shop.enabled_providers);
  let hintVisitorId = '';
  let hintDevice = '';
  if (!provider) {
    // Check KV for provider hint (cross-domain safe, set via /api/widget/hint)
    const hintRaw = await c.env.KV.get(`provider_hint:${clientId}`);
    const tHint = performance.now();
    console.log(`[Phase A] KV hint: ${(tHint - tShop).toFixed(1)}ms`);
    // hint는 JSON { provider, visitor_id, device } 또는 레거시 문자열
    let hintProvider: ProviderName | null = null;
    if (hintRaw) {
      try {
        const hint = JSON.parse(hintRaw);
        hintProvider = hint.provider;
        hintVisitorId = hint.visitor_id || '';
        hintDevice = hint.device || '';
      } catch {
        hintProvider = hintRaw as ProviderName; // 레거시 문자열 호환
      }
    }
    if (hintProvider && VALID_PROVIDERS.includes(hintProvider) && enabledProviders.includes(hintProvider)) {
      provider = hintProvider;
    } else {
      // No hint found — show provider selection page
      const currentUrl = new URL(c.req.url);
      return c.html(renderProviderSelectPage(enabledProviders, currentUrl));
    }
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    return c.json({ error: 'invalid_provider', message: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, 400);
  }

  // Check provider is enabled for this shop
  if (!enabledProviders.includes(provider)) {
    return c.json({ error: 'provider_disabled', message: `${provider} is not enabled for this shop` }, 400);
  }

  // Check billing limit
  const overLimit = await isOverFreeLimit(c.env.DB, shop);
  const tLimit = performance.now();

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Generate separate state for social provider
  const socialState = generateSecret(16);

  // Store OAuth session in KV (visitor_id/device from widget hint)
  const session: OAuthSession = {
    shop_id: shop.shop_id,
    redirect_uri: redirectUri,
    provider,
    cafe24_state: cafe24State,
    social_state: socialState,
    visitor_id: hintVisitorId || undefined,
    device: hintDevice || undefined,
  };

  if (overLimit) {
    return c.json({ error: 'limit_exceeded', message: 'Monthly signup limit reached' }, 403);
  }

  // Telegram uses Login Widget — skip oauth_session/pkce, use dedicated telegram_session only
  if (provider === 'telegram') {
    const telegramSessionId = generateSecret(16);
    await c.env.KV.put(`telegram_session:${telegramSessionId}`, JSON.stringify(session), { expirationTtl: SESSION_TTL });
    return c.redirect(`${c.env.BASE_URL}/oauth/telegram-login?session=${telegramSessionId}`);
  }

  // waitUntil로 비동기화: 사용자가 소셜 로그인하는 데 최소 수 초 소요,
  // KV.put은 ~30ms이므로 콜백 전에 충분히 완료됨
  c.executionCtx.waitUntil(
    Promise.all([
      c.env.KV.put(`oauth_session:${socialState}`, JSON.stringify(session), { expirationTtl: SESSION_TTL }),
      c.env.KV.put(`pkce:${socialState}`, codeVerifier, { expirationTtl: SESSION_TTL }),
    ])
  );
  const tKv = performance.now();

  // Build social OAuth URL and redirect
  const authUrl = buildSocialAuthUrl(provider, {
    clientId: getSocialClientId(c.env, provider),
    redirectUri: `${c.env.BASE_URL}/oauth/callback/${provider}`,
    state: socialState,
    codeChallenge,
  });

  console.log(`[Phase A] authorize | provider=${provider} | getShop=${(tShop - t0).toFixed(1)}ms | freeLimit=${(tLimit - tShop).toFixed(1)}ms | KV write=${(tKv - tLimit).toFixed(1)}ms | total=${(tKv - t0).toFixed(1)}ms`);

  // Use JS redirect to reset Referer (required for Naver which checks Referer against service URL)
  return c.html(`<html><head><meta name="referrer" content="no-referrer"></head><body><script>window.location.href=${JSON.stringify(authUrl)};</script></body></html>`);
});

// ─── GET /callback/:provider ─────────────────────────────────
oauth.get('/callback/:provider', async (c) => {
  const t0 = performance.now();
  const provider = c.req.param('provider') as ProviderName;
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  if (error) {
    return c.json({ error: 'social_auth_error', message: c.req.query('error_description') ?? error }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'missing_parameters', message: 'code and state are required' }, 400);
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    return c.json({ error: 'invalid_provider' }, 400);
  }

  // Restore session and PKCE from KV
  const [sessionJson, codeVerifier] = await Promise.all([
    c.env.KV.get(`oauth_session:${state}`),
    c.env.KV.get(`pkce:${state}`),
  ]);
  const tSession = performance.now();

  if (!sessionJson || !codeVerifier) {
    return c.html('<html><body><script>window.close();if(!window.closed)window.location.href="/";</script></body></html>');
  }

  const session: OAuthSession = JSON.parse(sessionJson);

  if (session.provider !== provider || session.social_state !== state) {
    return c.json({ error: 'state_mismatch' }, 400);
  }

  // Exchange code for tokens at social provider
  const tokens = await exchangeSocialCode(provider, {
    code,
    clientId: getSocialClientId(c.env, provider),
    clientSecret: getSocialClientSecret(c.env, provider),
    redirectUri: `${c.env.BASE_URL}/oauth/callback/${provider}`,
    codeVerifier,
    state,
    ...(provider === 'apple' ? { teamId: c.env.APPLE_TEAM_ID, keyId: c.env.APPLE_KEY_ID } : {}),
  });
  const tTokenExchange = performance.now();

  // Get user info from social provider
  const userInfo = await getSocialUserInfo(provider, tokens, c.env);
  const tUserInfo = performance.now();

  // Upsert user in D1 (PII encrypted)
  const user = await upsertUser(c.env.DB, userInfo, c.env.ENCRYPTION_KEY);
  const tUpsert = performance.now();

  // ensureShopUser + auth_code 생성을 병렬 실행 (서로 의존성 없음)
  const authCode = generateSecret(16);
  const authCodeData: AuthCodeData = {
    user_id: user.user_id,
    shop_id: session.shop_id,
  };

  const [action] = await Promise.all([
    ensureShopUser(c.env.DB, session.shop_id, user.user_id),
    c.env.KV.put(`auth_code:${authCode}`, JSON.stringify(authCodeData), {
      expirationTtl: AUTH_CODE_TTL,
    }),
  ]);
  const tShopUser = performance.now();
  const tAuthCode = tShopUser;

  // Redirect back with auth code and original state
  const redirectUrl = new URL(session.redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', session.cafe24_state);
  const isSsoCallback = session.redirect_uri.includes('/OAuth2ClientCallback/');
  if (!isSsoCallback) {
    redirectUrl.searchParams.set('bg_provider', provider);
  }

  // Defer non-critical work to after response (recordStat + funnel + KV cleanup)
  c.executionCtx.waitUntil(
    Promise.all([
      recordStat(c.env.DB, session.shop_id, user.user_id, provider, action).catch(() => {}),
      recordFunnelSignup(c.env.DB, session.shop_id, provider, action, session.visitor_id, session.device).catch(() => {}),
      c.env.KV.delete(`oauth_session:${state}`).catch(() => {}),
      c.env.KV.delete(`pkce:${state}`).catch(() => {}),
    ]).then(() => {
      const tDone = performance.now();
      console.log(`[Phase B][waitUntil] recordStat+kvCleanup=${(tDone - tAuthCode).toFixed(1)}ms`);
    })
  );

  const tTotal = performance.now();
  console.log(`[Phase B] callback/${provider} | action=${action} | kvSession=${(tSession - t0).toFixed(1)}ms | tokenExchange=${(tTokenExchange - tSession).toFixed(1)}ms | userInfo=${(tUserInfo - tTokenExchange).toFixed(1)}ms | upsertUser=${(tUpsert - tUserInfo).toFixed(1)}ms | ensureShopUser+kvAuthCode=${(tShopUser - tUpsert).toFixed(1)}ms | total=${(tTotal - t0).toFixed(1)}ms`);

  return c.redirect(redirectUrl.toString());
});

// ─── POST /callback/apple (form_post) ────────────────────────
// Apple uses response_mode=form_post, sending code/state via POST body.
oauth.post('/callback/apple', async (c) => {
  const body = await c.req.parseBody();
  const code = body['code'] as string | undefined;
  const state = body['state'] as string | undefined;
  const error = body['error'] as string | undefined;
  const provider: ProviderName = 'apple';

  if (error) {
    return c.json({ error: 'social_auth_error', message: String(body['error_description'] ?? error) }, 400);
  }

  if (!code || !state) {
    return c.json({ error: 'missing_parameters', message: 'code and state are required' }, 400);
  }

  // Restore session and PKCE from KV
  const [sessionJson, codeVerifier] = await Promise.all([
    c.env.KV.get(`oauth_session:${state}`),
    c.env.KV.get(`pkce:${state}`),
  ]);

  if (!sessionJson || !codeVerifier) {
    // Session already consumed (duplicate callback) — close popup gracefully
    return c.html('<html><body><script>window.close();if(!window.closed)window.location.href="/";</script></body></html>');
  }

  const session: OAuthSession = JSON.parse(sessionJson);

  if (session.provider !== provider || session.social_state !== state) {
    return c.json({ error: 'state_mismatch' }, 400);
  }

  // Exchange code for tokens at Apple
  const tokens = await exchangeSocialCode(provider, {
    code,
    clientId: getSocialClientId(c.env, provider),
    clientSecret: getSocialClientSecret(c.env, provider),
    redirectUri: `${c.env.BASE_URL}/oauth/callback/${provider}`,
    codeVerifier,
    state,
    teamId: c.env.APPLE_TEAM_ID,
    keyId: c.env.APPLE_KEY_ID,
  });

  // Get user info from Apple id_token
  const userInfo = await getSocialUserInfo(provider, tokens, c.env);

  // Apple may send user info (name) in the POST body on first authorization
  const userField = body['user'] as string | undefined;
  if (userField && !userInfo.name) {
    try {
      const userData = JSON.parse(userField) as Record<string, unknown>;
      const nameObj = userData.name as Record<string, string> | undefined;
      if (nameObj) {
        const parts = [nameObj.lastName, nameObj.firstName].filter(Boolean);
        if (parts.length > 0) {
          userInfo.name = parts.join(' ');
        }
      }
    } catch {
      // Ignore parse errors for user field
    }
  }

  // Upsert user in D1 (PII encrypted)
  const user = await upsertUser(c.env.DB, userInfo, c.env.ENCRYPTION_KEY);

  // ensureShopUser + auth_code 생성을 병렬 실행
  const authCode = generateSecret(16);
  const authCodeData: AuthCodeData = {
    user_id: user.user_id,
    shop_id: session.shop_id,
  };

  const [action] = await Promise.all([
    ensureShopUser(c.env.DB, session.shop_id, user.user_id),
    c.env.KV.put(`auth_code:${authCode}`, JSON.stringify(authCodeData), {
      expirationTtl: AUTH_CODE_TTL,
    }),
  ]);

  // Redirect back with auth code and original state
  const redirectUrl = new URL(session.redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', session.cafe24_state);
  const isSsoCallback = session.redirect_uri.includes('/OAuth2ClientCallback/');
  if (!isSsoCallback) {
    redirectUrl.searchParams.set('bg_provider', provider);
  }

  // Defer non-critical work to after response
  c.executionCtx.waitUntil(
    Promise.all([
      recordStat(c.env.DB, session.shop_id, user.user_id, provider, action).catch(() => {}),
      recordFunnelSignup(c.env.DB, session.shop_id, provider, action, session.visitor_id, session.device).catch(() => {}),
      c.env.KV.delete(`oauth_session:${state}`).catch(() => {}),
      c.env.KV.delete(`pkce:${state}`).catch(() => {}),
    ])
  );

  return c.redirect(redirectUrl.toString());
});

// ─── GET /telegram-login ─────────────────────────────────────
// Telegram Login Widget 중간 페이지. Telegram Bot Widget을 렌더링하고
// 로그인 완료 시 POST /oauth/callback/telegram으로 데이터를 전송한다.
oauth.get('/telegram-login', async (c) => {
  const sessionId = c.req.query('session');
  if (!sessionId) {
    return c.text('Missing session', 400);
  }

  const sessionData = await c.env.KV.get(`telegram_session:${sessionId}`);
  if (!sessionData) {
    return c.text('Invalid or expired session', 400);
  }

  const botUsername = c.env.TELEGRAM_BOT_USERNAME;

  // XSS 방지: sessionId와 botUsername을 HTML attribute에 안전하게 삽입
  const safeSessionId = sessionId
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const safeBotUsername = botUsername
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Telegram 로그인 - 번개가입</title>
  <style>
    body { display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; font-family:-apple-system,sans-serif; background:#f5f5f5; }
    .container { text-align:center; padding:40px; background:#fff; border-radius:12px; box-shadow:0 2px 8px rgba(0,0,0,.1); }
    h2 { margin-bottom:20px; color:#333; }
    p { color:#666; font-size:14px; margin-top:16px; }
  </style>
</head>
<body>
  <div class="container" data-session="${safeSessionId}" data-bot="${safeBotUsername}">
    <h2>Telegram으로 계속하기</h2>
    <script async src="https://telegram.org/js/telegram-widget.js?22"
      data-telegram-login="${safeBotUsername}"
      data-size="large"
      data-onauth="onTelegramAuth(user)"
      data-request-access="write">
    </script>
    <p>Telegram 계정으로 로그인합니다</p>
  </div>
  <script>
    var container = document.querySelector('.container');
    var sessionId = container.getAttribute('data-session');
    var botUsername = container.getAttribute('data-bot');
    function onTelegramAuth(user) {
      var params = new URLSearchParams(user);
      params.append('session', sessionId);
      fetch('/oauth/callback/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
      }).then(function(resp) {
        return resp.json();
      }).then(function(data) {
        if (data.redirect_url) {
          window.location.href = data.redirect_url;
        }
      }).catch(function(err) {
        alert('로그인 실패: ' + err.message);
      });
    }
  </script>
</body>
</html>`);
});

// ─── POST /callback/telegram ─────────────────────────────────
// Telegram Login Widget 데이터 수신 및 HMAC-SHA-256 검증 후 auth code 발급.
oauth.post('/callback/telegram', async (c) => {
  const body = await c.req.parseBody();
  const sessionId = body['session'] as string | undefined;

  if (!sessionId) {
    return c.json({ error: 'missing_session' }, 400);
  }

  // KV에서 세션 복원
  const sessionData = await c.env.KV.get(`telegram_session:${sessionId}`);
  if (!sessionData) {
    return c.json({ error: 'invalid_session' }, 400);
  }
  const session: OAuthSession = JSON.parse(sessionData);
  await c.env.KV.delete(`telegram_session:${sessionId}`);

  // Telegram 데이터 추출 (session 필드 제외)
  const telegramData: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key !== 'session' && typeof value === 'string') {
      telegramData[key] = value;
    }
  }

  // HMAC 검증
  const isValid = await verifyTelegramAuth(telegramData, c.env.TELEGRAM_BOT_TOKEN);
  if (!isValid) {
    return c.json({ error: 'invalid_signature' }, 401);
  }

  // auth_date 검증 (5분 이내)
  const authDate = parseInt(telegramData['auth_date'] ?? '');
  if (isNaN(authDate) || Date.now() / 1000 - authDate > 300) {
    return c.json({ error: 'expired_auth' }, 401);
  }

  // 사용자 정보 추출
  const userInfo = getTelegramUserInfo(telegramData);

  // Shop 조회
  const shop = await getShopById(c.env.DB, session.shop_id);
  if (!shop) {
    return c.json({ error: 'shop_not_found' }, 400);
  }

  // Upsert user
  const user = await upsertUser(c.env.DB, userInfo, c.env.ENCRYPTION_KEY);

  // ensureShopUser + auth_code 생성을 병렬 실행
  const authCode = generateSecret(16);
  const authCodeData: AuthCodeData = { user_id: user.user_id, shop_id: shop.shop_id };
  const [action] = await Promise.all([
    ensureShopUser(c.env.DB, shop.shop_id, user.user_id),
    c.env.KV.put(`auth_code:${authCode}`, JSON.stringify(authCodeData), { expirationTtl: AUTH_CODE_TTL }),
  ]);

  // Build redirect URL
  const redirectUrl = new URL(session.redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', session.cafe24_state);
  const isSsoCallback = session.redirect_uri.includes('/OAuth2ClientCallback/');
  if (!isSsoCallback) {
    redirectUrl.searchParams.set('bg_provider', 'telegram');
  }

  // Defer non-critical work to after response
  c.executionCtx.waitUntil(
    Promise.all([
      recordStat(c.env.DB, shop.shop_id, user.user_id, 'telegram', action).catch(() => {}),
      recordFunnelSignup(c.env.DB, shop.shop_id, 'telegram', action).catch(() => {}),
    ])
  );

  return c.json({ redirect_url: redirectUrl.toString() });
});

// ─── POST /token ─────────────────────────────────────────────
oauth.post('/token', async (c) => {
  const t0 = performance.now();
  const body = await c.req.parseBody();
  const grantType = body['grant_type'];
  const code = body['code'] as string | undefined;
  const clientId = body['client_id'] as string | undefined;
  const clientSecret = body['client_secret'] as string | undefined;

  if (grantType !== 'authorization_code' || !code || !clientId || !clientSecret) {
    return c.json({ error: 'invalid_request', message: 'grant_type=authorization_code, code, client_id, client_secret required' }, 400);
  }

  // Shop 조회 + auth_code 조회를 병렬 실행 (서로 독립적)
  const [shop, authCodeJson] = await Promise.all([
    getShopByClientId(c.env.DB, clientId),
    c.env.KV.get(`auth_code:${code}`),
  ]);
  const tShop = performance.now();

  if (!shop || !(await timingSafeEqual(shop.client_secret, clientSecret))) {
    return c.json({ error: 'invalid_client' }, 401);
  }
  const tVerify = performance.now();
  const tGetCode = tShop; // 병렬 실행이므로 동일 시점
  if (!authCodeJson) {
    return c.json({ error: 'invalid_grant', message: 'Authorization code expired or already used' }, 400);
  }

  const authCodeData: AuthCodeData = JSON.parse(authCodeJson);

  // Verify auth_code was issued for this shop
  if (authCodeData.shop_id !== shop.shop_id) {
    return c.json({ error: 'invalid_grant', message: 'Authorization code was not issued for this client' }, 400);
  }

  // Generate access token + delete auth code in parallel
  const accessToken = generateSecret(32);
  const tokenData: AccessTokenData = {
    user_id: authCodeData.user_id,
    shop_id: authCodeData.shop_id,
  };

  await Promise.all([
    c.env.KV.delete(`auth_code:${code}`),
    c.env.KV.put(`access_token:${accessToken}`, JSON.stringify(tokenData), {
      expirationTtl: ACCESS_TOKEN_TTL,
    }),
  ]);
  const tKvOps = performance.now();

  console.log(`[Phase C] token | getShop=${(tShop - t0).toFixed(1)}ms | verify=${(tVerify - tShop).toFixed(1)}ms | kvGetCode=${(tGetCode - tVerify).toFixed(1)}ms | kvDelete+Put=${(tKvOps - tGetCode).toFixed(1)}ms | total=${(tKvOps - t0).toFixed(1)}ms`);

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
  });
});

// ─── /userinfo (GET with Bearer token OR POST with access_token body) ───
// Cafe24 SSO sends access_token as POST body parameter.

async function handleUserInfo(c: { env: Env; req: { header: (k: string) => string | undefined }; json: (body: unknown, status?: number) => Response }, accessToken: string) {
  const t0 = performance.now();
  const tokenJson = await c.env.KV.get(`access_token:${accessToken}`);
  const tGetToken = performance.now();
  if (!tokenJson) {
    return c.json({ error: 'invalid_token', message: 'Token expired or invalid' }, 401);
  }

  const tokenData: AccessTokenData = JSON.parse(tokenJson);
  const user = await getUserById(c.env.DB, tokenData.user_id);
  const tGetUser = performance.now();
  if (!user) {
    return c.json({ error: 'user_not_found' }, 404);
  }

  // Decrypt PII
  const [email, name, phone, birthday] = await Promise.all([
    user.email ? decrypt(user.email, c.env.ENCRYPTION_KEY) : Promise.resolve(null),
    user.name ? decrypt(user.name, c.env.ENCRYPTION_KEY) : Promise.resolve(null),
    user.phone ? decrypt(user.phone, c.env.ENCRYPTION_KEY) : Promise.resolve(null),
    user.birthday ? decrypt(user.birthday, c.env.ENCRYPTION_KEY) : Promise.resolve(null),
  ]);
  const tDecrypt = performance.now();

  // 이메일이 없는 프로바이더(Telegram, X 등)는 대체 이메일 생성
  // 카페24 SSO는 이메일 필수이므로 빈 값 전달 불가
  let finalEmail = email;
  if (!finalEmail) {
    const shop = await getShopById(c.env.DB, tokenData.shop_id);
    const shopHost = shop?.shop_url ? new URL(shop.shop_url).host : 'shop.local';
    const nameSlug = (name ?? user.provider).replace(/\s+/g, '_');
    finalEmail = `${nameSlug}@${shopHost}`;
  }
  const tDone = performance.now();

  console.log(`[Phase D] userinfo | provider=${user.provider} | kvGetToken=${(tGetToken - t0).toFixed(1)}ms | dbGetUser=${(tGetUser - tGetToken).toFixed(1)}ms | decrypt=${(tDecrypt - tGetUser).toFixed(1)}ms | total=${(tDone - t0).toFixed(1)}ms`);

  // Return in Cafe24 SSO standard format
  return c.json({
    id: user.user_id,
    email: finalEmail,
    name: name ?? '',
    phone: phone ?? '',
    birthday: birthday ?? '',
    gender: user.gender ?? '',
    profile_image: user.profile_image ?? '',
    provider: user.provider,
  });
}

oauth.get('/userinfo', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'invalid_token' }, 401);
  }
  return handleUserInfo(c, authHeader.slice(7));
});

oauth.post('/userinfo', async (c) => {
  const body = await c.req.parseBody();
  const accessToken = body['access_token'] as string | undefined;

  // Also check Authorization header as fallback
  if (!accessToken) {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      return handleUserInfo(c, authHeader.slice(7));
    }
    return c.json({ error: 'invalid_token', message: 'access_token is required' }, 401);
  }

  return handleUserInfo(c, accessToken);
});

// ─── Helper: get social client ID/secret from env ────────────

function getSocialClientId(env: Env, provider: ProviderName): string {
  switch (provider) {
    case 'google': return env.GOOGLE_CLIENT_ID;
    case 'kakao': return env.KAKAO_CLIENT_ID;
    case 'naver': return env.NAVER_CLIENT_ID;
    case 'apple': return env.APPLE_CLIENT_ID;
    case 'discord': return env.DISCORD_CLIENT_ID;
    case 'facebook': return env.FACEBOOK_APP_ID;
    case 'x': return env.X_CLIENT_ID;
    case 'line': return env.LINE_CHANNEL_ID;
    case 'telegram': return env.TELEGRAM_BOT_USERNAME;
  }
}

function getSocialClientSecret(env: Env, provider: ProviderName): string {
  switch (provider) {
    case 'google': return env.GOOGLE_CLIENT_SECRET;
    case 'kakao': return env.KAKAO_CLIENT_SECRET;
    case 'naver': return env.NAVER_CLIENT_SECRET;
    case 'apple': return env.APPLE_PRIVATE_KEY; // Apple uses private key as "secret"
    case 'discord': return env.DISCORD_CLIENT_SECRET;
    case 'facebook': return env.FACEBOOK_APP_SECRET;
    case 'x': return env.X_CLIENT_SECRET;
    case 'line': return env.LINE_CHANNEL_SECRET;
    case 'telegram': return env.TELEGRAM_BOT_TOKEN;
  }
}

// ─── Provider selection page (when provider param is missing) ──

const PROVIDER_STYLES: Record<string, { name: string; color: string; bg: string; icon: string }> = {
  google: { name: 'Google', color: '#fff', bg: '#4285f4', icon: 'G' },
  kakao: { name: '카카오', color: '#000', bg: '#fee500', icon: 'K' },
  naver: { name: '네이버', color: '#fff', bg: '#03c75a', icon: 'N' },
  apple: { name: 'Apple', color: '#fff', bg: '#000', icon: '' },
  discord: { name: 'Discord', color: '#fff', bg: '#5865F2', icon: 'D' },
  facebook: { name: 'Facebook', color: '#fff', bg: '#1877F2', icon: 'f' },
  x: { name: 'X', color: '#fff', bg: '#000000', icon: 'X' },
  line: { name: 'LINE', color: '#fff', bg: '#06C755', icon: 'L' },
  telegram: { name: 'Telegram', color: '#fff', bg: '#0088cc', icon: '' },
};

function renderProviderSelectPage(enabledProviders: string[], currentUrl: URL): string {
  const buttons = enabledProviders
    .filter((p) => PROVIDER_STYLES[p])
    .map((p) => {
      const s = PROVIDER_STYLES[p];
      const url = new URL(currentUrl.toString());
      url.searchParams.set('provider', p);
      return `<a href="${url.toString()}" class="btn" style="background:${s.bg};color:${s.color}">
        <span class="icon">${s.icon}</span>${s.name}로 계속하기
      </a>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>로그인 - 번개가입</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;display:flex;justify-content:center;align-items:center;min-height:100vh}
.card{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.08);padding:40px 32px;width:100%;max-width:380px;text-align:center}
.logo{font-size:32px;margin-bottom:4px}
h1{font-size:20px;color:#1e293b;margin-bottom:8px}
.sub{font-size:14px;color:#64748b;margin-bottom:28px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:14px;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;margin-bottom:10px;transition:opacity .15s}
.btn:hover{opacity:.9}
.icon{font-weight:700;font-size:18px}
.footer{margin-top:24px;font-size:12px;color:#94a3b8}
.footer a{color:#2563eb;text-decoration:none}
</style>
</head>
<body>
<div class="card">
  <div class="logo">⚡</div>
  <h1>번개가입</h1>
  <p class="sub">소셜 계정으로 간편하게 로그인하세요</p>
  ${buttons}
  <div class="footer">
    <a href="/privacy">개인정보 처리방침</a>
  </div>
</div>
</body>
</html>`;
}

export default oauth;
