/**
 * Social OAuth provider abstraction.
 *
 * Each provider implements buildAuthUrl / exchangeCode / getUserInfo.
 * Full provider implementations (Google, Kakao, Naver, Apple) will be
 * completed in Week 3. This module provides the common dispatch layer.
 */

import type { Env, OAuthTokenResponse, OAuthUserInfo, ProviderName } from '@supasignup/bg-core';

export interface SocialAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}

export interface SocialExchangeParams {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  codeVerifier: string;
  state?: string;
}

// ─── Build social OAuth authorization URL ────────────────────

export function buildSocialAuthUrl(
  provider: ProviderName,
  params: SocialAuthUrlParams,
): string {
  switch (provider) {
    case 'google':
      return buildGoogleAuthUrl(params);
    case 'kakao':
      return buildKakaoAuthUrl(params);
    case 'naver':
      return buildNaverAuthUrl(params);
    case 'apple':
      return buildAppleAuthUrl(params);
  }
}

// ─── Exchange authorization code for tokens ──────────────────

export async function exchangeSocialCode(
  provider: ProviderName,
  params: SocialExchangeParams,
): Promise<OAuthTokenResponse> {
  switch (provider) {
    case 'google':
      return exchangeGoogleCode(params);
    case 'kakao':
      return exchangeKakaoCode(params);
    case 'naver':
      return exchangeNaverCode(params);
    case 'apple':
      return exchangeAppleCode(params);
  }
}

// ─── Get user info from social provider ──────────────────────

export async function getSocialUserInfo(
  provider: ProviderName,
  tokens: OAuthTokenResponse,
  env: Env,
): Promise<OAuthUserInfo> {
  switch (provider) {
    case 'google':
      return getGoogleUserInfo(tokens);
    case 'kakao':
      return getKakaoUserInfo(tokens);
    case 'naver':
      return getNaverUserInfo(tokens);
    case 'apple':
      return getAppleUserInfo(tokens);
  }
}

// ═══════════════════════════════════════════════════════════════
// Google
// ═══════════════════════════════════════════════════════════════

function buildGoogleAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', p.state);
  url.searchParams.set('code_challenge', p.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  return url.toString();
}

async function exchangeGoogleCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      redirect_uri: p.redirectUri,
      code_verifier: p.codeVerifier,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getGoogleUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!resp.ok) {
    throw new Error(`Google userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  return {
    provider: 'google',
    providerUid: String(data.id),
    email: data.email as string | undefined,
    name: data.name as string | undefined,
    profileImage: data.picture as string | undefined,
    rawData: data,
  };
}

// ═══════════════════════════════════════════════════════════════
// Kakao
// ═══════════════════════════════════════════════════════════════

function buildKakaoAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile_nickname profile_image account_email');
  url.searchParams.set('state', p.state);
  // Kakao doesn't support PKCE natively, but we still track it server-side
  return url.toString();
}

async function exchangeKakaoCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const resp = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      client_id: p.clientId,
      client_secret: p.clientSecret,
      redirect_uri: p.redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Kakao token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getKakaoUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!resp.ok) {
    throw new Error(`Kakao userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  const account = (data.kakao_account ?? {}) as Record<string, unknown>;
  const profile = (account.profile ?? {}) as Record<string, unknown>;

  return {
    provider: 'kakao',
    providerUid: String(data.id),
    email: account.email as string | undefined,
    name: profile.nickname as string | undefined,
    profileImage: profile.profile_image_url as string | undefined,
    rawData: data,
  };
}

// ═══════════════════════════════════════════════════════════════
// Naver
// ═══════════════════════════════════════════════════════════════

function buildNaverAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://nid.naver.com/oauth2.0/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', p.state);
  return url.toString();
}

async function exchangeNaverCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const params: Record<string, string> = {
    grant_type: 'authorization_code',
    code: p.code,
    client_id: p.clientId,
    client_secret: p.clientSecret,
  };
  if (p.state) params.state = p.state;

  const resp = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Naver token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getNaverUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!resp.ok) {
    throw new Error(`Naver userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  const response = (data.response ?? {}) as Record<string, unknown>;

  return {
    provider: 'naver',
    providerUid: String(response.id),
    email: response.email as string | undefined,
    name: response.name as string | undefined,
    profileImage: response.profile_image as string | undefined,
    rawData: data,
  };
}

// ═══════════════════════════════════════════════════════════════
// Apple
// ═══════════════════════════════════════════════════════════════

function buildAppleAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://appleid.apple.com/auth/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'name email');
  url.searchParams.set('state', p.state);
  url.searchParams.set('response_mode', 'form_post');
  return url.toString();
}

async function exchangeAppleCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  // Apple requires a JWT client_secret signed with ES256
  // p.clientSecret here is the APPLE_PRIVATE_KEY
  // Full JWT generation will be implemented in Week 3
  const clientSecret = p.clientSecret; // TODO: generate JWT in Week 3

  const resp = await fetch('https://appleid.apple.com/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      client_id: p.clientId,
      client_secret: clientSecret,
      redirect_uri: p.redirectUri,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Apple token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getAppleUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  // Apple sends user info in id_token (JWT)
  // Decode JWT payload without verification (we already verified via token exchange)
  const idToken = tokens.id_token;
  if (!idToken) {
    throw new Error('Apple id_token missing from token response');
  }

  const payloadPart = idToken.split('.')[1];
  const payload = JSON.parse(atob(payloadPart)) as Record<string, unknown>;

  return {
    provider: 'apple',
    providerUid: String(payload.sub),
    email: payload.email as string | undefined,
    name: undefined, // Apple only sends name on first auth (via form_post user field)
    rawData: payload,
  };
}
