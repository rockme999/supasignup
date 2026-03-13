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
  getShopUser,
  createShopUser,
  upsertUser,
  recordStat,
  isOverFreeLimit,
  getUserById,
} from '../db/queries';
import { buildSocialAuthUrl, exchangeSocialCode, getSocialUserInfo } from '../services/social';

const VALID_PROVIDERS: ProviderName[] = ['google', 'kakao', 'naver', 'apple'];
const SESSION_TTL = 600; // 10 minutes
const AUTH_CODE_TTL = 300; // 5 minutes
const ACCESS_TOKEN_TTL = 7200; // 2 hours

const oauth = new Hono<{ Bindings: Env }>();

// ─── GET /authorize ──────────────────────────────────────────
oauth.get('/authorize', async (c) => {
  const clientId = c.req.query('client_id');
  const redirectUri = c.req.query('redirect_uri');
  const provider = c.req.query('provider') as ProviderName | undefined;
  const cafe24State = c.req.query('state'); // state from Cafe24

  if (!clientId || !redirectUri || !provider || !cafe24State) {
    return c.json({ error: 'missing_parameters', message: 'client_id, redirect_uri, provider, state are required' }, 400);
  }

  if (!VALID_PROVIDERS.includes(provider)) {
    return c.json({ error: 'invalid_provider', message: `provider must be one of: ${VALID_PROVIDERS.join(', ')}` }, 400);
  }

  // Look up shop
  const shop = await getShopByClientId(c.env.DB, clientId);
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

  // Check provider is enabled for this shop
  const enabledProviders: string[] = JSON.parse(shop.enabled_providers);
  if (!enabledProviders.includes(provider)) {
    return c.json({ error: 'provider_disabled', message: `${provider} is not enabled for this shop` }, 400);
  }

  // Check billing limit
  const overLimit = await isOverFreeLimit(c.env.DB, shop);
  if (overLimit) {
    return c.json({ error: 'limit_exceeded', message: 'Monthly signup limit reached' }, 403);
  }

  // Generate PKCE
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  // Generate separate state for social provider
  const socialState = generateSecret(16);

  // Store OAuth session in KV
  const session: OAuthSession = {
    shop_id: shop.shop_id,
    redirect_uri: redirectUri,
    provider,
    cafe24_state: cafe24State,
    social_state: socialState,
  };

  await Promise.all([
    c.env.KV.put(`oauth_session:${socialState}`, JSON.stringify(session), { expirationTtl: SESSION_TTL }),
    c.env.KV.put(`pkce:${socialState}`, codeVerifier, { expirationTtl: SESSION_TTL }),
  ]);

  // Build social OAuth URL and redirect
  const authUrl = buildSocialAuthUrl(provider, {
    clientId: getSocialClientId(c.env, provider),
    redirectUri: `${c.env.BASE_URL}/oauth/callback/${provider}`,
    state: socialState,
    codeChallenge,
  });

  return c.redirect(authUrl);
});

// ─── GET /callback/:provider ─────────────────────────────────
oauth.get('/callback/:provider', async (c) => {
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

  if (!sessionJson || !codeVerifier) {
    return c.json({ error: 'session_expired', message: 'OAuth session expired or invalid state' }, 400);
  }

  const session: OAuthSession = JSON.parse(sessionJson);

  if (session.provider !== provider || session.social_state !== state) {
    return c.json({ error: 'state_mismatch' }, 400);
  }

  // Clean up KV (one-time use)
  await Promise.all([
    c.env.KV.delete(`oauth_session:${state}`),
    c.env.KV.delete(`pkce:${state}`),
  ]);

  // Exchange code for tokens at social provider
  const tokens = await exchangeSocialCode(provider, {
    code,
    clientId: getSocialClientId(c.env, provider),
    clientSecret: getSocialClientSecret(c.env, provider),
    redirectUri: `${c.env.BASE_URL}/oauth/callback/${provider}`,
    codeVerifier,
    state,
  });

  // Get user info from social provider
  const userInfo = await getSocialUserInfo(provider, tokens, c.env);

  // Upsert user in D1 (PII encrypted)
  const user = await upsertUser(c.env.DB, userInfo, c.env.ENCRYPTION_KEY);

  // Check if this is a new signup or returning login
  const existingShopUser = await getShopUser(c.env.DB, session.shop_id, user.user_id);
  let action: 'signup' | 'login';

  if (existingShopUser) {
    action = 'login';
  } else {
    await createShopUser(c.env.DB, session.shop_id, user.user_id);
    action = 'signup';
  }

  // Record stat
  await recordStat(c.env.DB, session.shop_id, user.user_id, provider, action);

  // Generate authorization code for Cafe24
  const authCode = generateSecret(16);
  const authCodeData: AuthCodeData = {
    user_id: user.user_id,
    shop_id: session.shop_id,
  };

  await c.env.KV.put(`auth_code:${authCode}`, JSON.stringify(authCodeData), {
    expirationTtl: AUTH_CODE_TTL,
  });

  // Redirect back to Cafe24 with auth code, original state, and provider hint
  const redirectUrl = new URL(session.redirect_uri);
  redirectUrl.searchParams.set('code', authCode);
  redirectUrl.searchParams.set('state', session.cafe24_state);
  redirectUrl.searchParams.set('bg_provider', provider);

  return c.redirect(redirectUrl.toString());
});

// ─── POST /token ─────────────────────────────────────────────
oauth.post('/token', async (c) => {
  const body = await c.req.parseBody();
  const grantType = body['grant_type'];
  const code = body['code'] as string | undefined;
  const clientId = body['client_id'] as string | undefined;
  const clientSecret = body['client_secret'] as string | undefined;

  if (grantType !== 'authorization_code' || !code || !clientId || !clientSecret) {
    return c.json({ error: 'invalid_request', message: 'grant_type=authorization_code, code, client_id, client_secret required' }, 400);
  }

  // Verify client credentials
  const shop = await getShopByClientId(c.env.DB, clientId);
  if (!shop || !(await timingSafeEqual(shop.client_secret, clientSecret))) {
    return c.json({ error: 'invalid_client' }, 401);
  }

  // Look up and delete auth code (one-time use)
  const authCodeJson = await c.env.KV.get(`auth_code:${code}`);
  if (!authCodeJson) {
    return c.json({ error: 'invalid_grant', message: 'Authorization code expired or already used' }, 400);
  }
  await c.env.KV.delete(`auth_code:${code}`);

  const authCodeData: AuthCodeData = JSON.parse(authCodeJson);

  // Verify auth_code was issued for this shop
  if (authCodeData.shop_id !== shop.shop_id) {
    return c.json({ error: 'invalid_grant', message: 'Authorization code was not issued for this client' }, 400);
  }

  // Generate access token
  const accessToken = generateSecret(32);
  const tokenData: AccessTokenData = {
    user_id: authCodeData.user_id,
    shop_id: authCodeData.shop_id,
  };

  await c.env.KV.put(`access_token:${accessToken}`, JSON.stringify(tokenData), {
    expirationTtl: ACCESS_TOKEN_TTL,
  });

  return c.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: ACCESS_TOKEN_TTL,
  });
});

// ─── GET /userinfo ───────────────────────────────────────────
oauth.get('/userinfo', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'invalid_token' }, 401);
  }

  const accessToken = authHeader.slice(7);
  const tokenJson = await c.env.KV.get(`access_token:${accessToken}`);
  if (!tokenJson) {
    return c.json({ error: 'invalid_token', message: 'Token expired or invalid' }, 401);
  }

  const tokenData: AccessTokenData = JSON.parse(tokenJson);
  const user = await getUserById(c.env.DB, tokenData.user_id);
  if (!user) {
    return c.json({ error: 'user_not_found' }, 404);
  }

  // Decrypt PII
  const email = user.email
    ? await decrypt(user.email, c.env.ENCRYPTION_KEY)
    : null;
  const name = user.name
    ? await decrypt(user.name, c.env.ENCRYPTION_KEY)
    : null;

  // Return in Cafe24 SSO standard format
  return c.json({
    id: user.user_id,
    email: email ?? '',
    name: name ?? '',
    profile_image: user.profile_image ?? '',
    provider: user.provider,
  });
});

// ─── Helper: get social client ID/secret from env ────────────

function getSocialClientId(env: Env, provider: ProviderName): string {
  switch (provider) {
    case 'google': return env.GOOGLE_CLIENT_ID;
    case 'kakao': return env.KAKAO_CLIENT_ID;
    case 'naver': return env.NAVER_CLIENT_ID;
    case 'apple': return env.APPLE_CLIENT_ID;
  }
}

function getSocialClientSecret(env: Env, provider: ProviderName): string {
  switch (provider) {
    case 'google': return env.GOOGLE_CLIENT_SECRET;
    case 'kakao': return env.KAKAO_CLIENT_SECRET;
    case 'naver': return env.NAVER_CLIENT_SECRET;
    case 'apple': return env.APPLE_PRIVATE_KEY; // Apple uses private key as "secret"
  }
}

export default oauth;
