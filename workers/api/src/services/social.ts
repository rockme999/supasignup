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
  /** Apple-specific: Team ID from Apple Developer account */
  teamId?: string;
  /** Apple-specific: Key ID for the private key */
  keyId?: string;
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
      return getAppleUserInfo(tokens, env.APPLE_CLIENT_ID);
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
// Apple – JWT client_secret generation & helpers
// ═══════════════════════════════════════════════════════════════

/** Base64url-encode a Uint8Array (no padding). */
function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < data.byteLength; i++) {
    binary += String.fromCharCode(data[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Base64url-encode a UTF-8 string. */
function base64urlEncodeString(str: string): string {
  return base64urlEncode(new TextEncoder().encode(str));
}

/**
 * Generate an Apple client_secret JWT signed with ES256.
 *
 * Apple requires client_secret to be a short-lived JWT:
 *   Header:  {"alg":"ES256","kid":"<KEY_ID>"}
 *   Payload: {"iss":"<TEAM_ID>","iat":<now>,"exp":<now+300>,
 *             "aud":"https://appleid.apple.com","sub":"<CLIENT_ID>"}
 *   Signed with the ECDSA P-256 private key from Apple (.p8 file).
 *
 * Uses Web Crypto API only (Cloudflare Workers compatible).
 */
async function generateAppleClientSecret(
  privateKeyPem: string,
  keyId: string,
  teamId: string,
  clientId: string,
): Promise<string> {
  // 1. Import PEM private key
  const pemBody = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer.buffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );

  // 2. Build JWT header + payload
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'ES256', kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 300, // 5 minutes
    aud: 'https://appleid.apple.com',
    sub: clientId,
  };

  const encodedHeader = base64urlEncodeString(JSON.stringify(header));
  const encodedPayload = base64urlEncodeString(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  // 3. Sign with ECDSA P-256 SHA-256
  // Web Crypto produces IEEE P1363 format (r||s, 64 bytes) which is what JWT expects.
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    new TextEncoder().encode(signingInput),
  );

  const encodedSignature = base64urlEncode(new Uint8Array(signature));
  return `${signingInput}.${encodedSignature}`;
}

// ═══════════════════════════════════════════════════════════════
// Apple – OAuth flow
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
  if (!p.teamId || !p.keyId) {
    throw new Error('Apple OAuth requires teamId and keyId');
  }

  // Generate ES256-signed JWT client_secret from APPLE_PRIVATE_KEY
  const clientSecret = await generateAppleClientSecret(
    p.clientSecret, // PEM private key
    p.keyId,
    p.teamId,
    p.clientId,
  );

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

async function getAppleUserInfo(
  tokens: OAuthTokenResponse,
  clientId?: string,
): Promise<OAuthUserInfo> {
  const idToken = tokens.id_token;
  if (!idToken) {
    throw new Error('Apple id_token missing from token response');
  }

  const payloadPart = idToken.split('.')[1];
  // Handle base64url → base64 for atob
  const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
  const payload = JSON.parse(atob(base64)) as Record<string, unknown>;

  // Validate id_token claims
  // The token came directly from Apple's token endpoint, so signature verification
  // is not strictly necessary, but we validate essential claims.
  if (payload.iss !== 'https://appleid.apple.com') {
    throw new Error(`Apple id_token invalid issuer: ${payload.iss}`);
  }

  if (clientId && payload.aud !== clientId) {
    throw new Error(`Apple id_token audience mismatch: expected ${clientId}, got ${payload.aud}`);
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) {
    throw new Error('Apple id_token has expired');
  }

  return {
    provider: 'apple',
    providerUid: String(payload.sub),
    email: payload.email as string | undefined,
    name: undefined, // Apple only sends name on first auth (via form_post user field)
    rawData: payload,
  };
}
