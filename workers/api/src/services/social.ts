/**
 * Social OAuth provider abstraction.
 *
 * Each provider implements buildAuthUrl / exchangeCode / getUserInfo.
 * Full provider implementations (Google, Kakao, Naver, Apple) will be
 * completed in Week 3. This module provides the common dispatch layer.
 */

import type { Env, OAuthTokenResponse, OAuthUserInfo, ProviderName } from '@supasignup/bg-core';

/** 이름이 유효하지 않으면(마스킹, 빈값 등) 이메일 앞부분으로 대체 */
function fallbackName(name: string | undefined, email: string | undefined): string | undefined {
  if (name && name !== '…' && name !== '...' && name.trim().length > 0) {
    return name;
  }
  if (email) {
    return email.split('@')[0];
  }
  return name;
}

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
    case 'discord':
      return buildDiscordAuthUrl(params);
    case 'facebook':
      return buildFacebookAuthUrl(params);
    case 'x':
      return buildXAuthUrl(params);
    case 'line':
      return buildLineAuthUrl(params);
    case 'telegram':
      // Telegram uses Login Widget, not a standard OAuth authorize URL
      return '';
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
    case 'discord':
      return exchangeDiscordCode(params);
    case 'facebook':
      return exchangeFacebookCode(params);
    case 'x':
      return exchangeXCode(params);
    case 'line':
      return exchangeLineCode(params);
    case 'telegram':
      throw new Error('Telegram does not use code exchange; use verifyTelegramAuth instead');
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
    case 'discord':
      return getDiscordUserInfo(tokens);
    case 'facebook':
      return getFacebookUserInfo(tokens);
    case 'x':
      return getXUserInfo(tokens);
    case 'line':
      return getLineUserInfo(tokens);
    case 'telegram':
      throw new Error('Telegram does not use token-based userinfo; use getTelegramUserInfo instead');
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
    phone: undefined,
    birthday: undefined,
    gender: undefined,
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

  const email = account.email as string | undefined;
  return {
    provider: 'kakao',
    providerUid: String(data.id),
    email,
    name: fallbackName(profile.nickname as string | undefined, email),
    profileImage: profile.profile_image_url as string | undefined,
    rawData: data,
    phone: account.phone_number as string | undefined,
    birthday: account.birthyear && account.birthday
      ? `${account.birthyear}-${account.birthday}`
      : undefined,
    gender: account.gender as string | undefined,
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
    phone: response.mobile as string | undefined,
    birthday: response.birthyear && response.birthday
      ? `${response.birthyear}-${response.birthday}`
      : undefined,
    gender: response.gender as string | undefined,
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

// ═══════════════════════════════════════════════════════════════
// Discord
// ═══════════════════════════════════════════════════════════════

function buildDiscordAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify email');
  url.searchParams.set('state', p.state);
  url.searchParams.set('code_challenge', p.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function exchangeDiscordCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const resp = await fetch('https://discord.com/api/oauth2/token', {
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
    throw new Error(`Discord token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getDiscordUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!resp.ok) {
    throw new Error(`Discord userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  const avatar = data.avatar as string | null | undefined;
  const profileImage = avatar
    ? `https://cdn.discordapp.com/avatars/${data.id}/${avatar}.png`
    : undefined;

  return {
    provider: 'discord',
    providerUid: String(data.id),
    email: data.email as string | undefined,
    name: (data.global_name ?? data.username) as string | undefined,
    profileImage,
    rawData: data,
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Facebook
// ═══════════════════════════════════════════════════════════════

const FB_API_VERSION = 'v25.0';

function buildFacebookAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL(`https://www.facebook.com/${FB_API_VERSION}/dialog/oauth`);
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'email,public_profile');
  url.searchParams.set('state', p.state);
  // Facebook does not officially support PKCE; no code_challenge sent
  return url.toString();
}

async function exchangeFacebookCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const resp = await fetch(`https://graph.facebook.com/${FB_API_VERSION}/oauth/access_token`, {
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
    throw new Error(`Facebook token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getFacebookUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch(
    'https://graph.facebook.com/me?fields=id,name,email,picture.type(large)',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );

  if (!resp.ok) {
    throw new Error(`Facebook userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;
  const picture = (data.picture ?? {}) as Record<string, unknown>;
  const pictureData = (picture.data ?? {}) as Record<string, unknown>;

  return {
    provider: 'facebook',
    providerUid: String(data.id),
    email: data.email as string | undefined,
    name: data.name as string | undefined,
    profileImage: pictureData.url as string | undefined,
    rawData: data,
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// X (Twitter)
// ═══════════════════════════════════════════════════════════════

function buildXAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://x.com/i/oauth2/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'users.read users.email offline.access');
  url.searchParams.set('state', p.state);
  url.searchParams.set('code_challenge', p.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function exchangeXCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const basicAuth = btoa(`${p.clientId}:${p.clientSecret}`);
  const resp = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: p.code,
      redirect_uri: p.redirectUri,
      code_verifier: p.codeVerifier,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`X token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getXUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch(
    'https://api.x.com/2/users/me?user.fields=id,name,username,profile_image_url',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } },
  );

  if (!resp.ok) {
    throw new Error(`X userinfo failed: ${resp.status}`);
  }

  const body = await resp.json() as { data: Record<string, unknown> };
  if (!body.data) throw new Error('X userinfo: unexpected response format');
  const data = body.data;

  return {
    provider: 'x',
    providerUid: String(data.id),
    email: undefined, // X requires elevated access for email; treat as null
    name: data.name as string | undefined,
    profileImage: data.profile_image_url as string | undefined,
    rawData: body as Record<string, unknown>,
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// LINE
// ═══════════════════════════════════════════════════════════════

function buildLineAuthUrl(p: SocialAuthUrlParams): string {
  const url = new URL('https://access.line.me/oauth2/v2.1/authorize');
  url.searchParams.set('client_id', p.clientId);
  url.searchParams.set('redirect_uri', p.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'profile openid email');
  url.searchParams.set('state', p.state);
  url.searchParams.set('code_challenge', p.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return url.toString();
}

async function exchangeLineCode(p: SocialExchangeParams): Promise<OAuthTokenResponse> {
  const resp = await fetch('https://api.line.me/oauth2/v2.1/token', {
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
    throw new Error(`LINE token exchange failed: ${resp.status} ${text}`);
  }

  return resp.json() as Promise<OAuthTokenResponse>;
}

async function getLineUserInfo(tokens: OAuthTokenResponse): Promise<OAuthUserInfo> {
  const resp = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!resp.ok) {
    throw new Error(`LINE userinfo failed: ${resp.status}`);
  }

  const data = await resp.json() as Record<string, unknown>;

  // Extract email from id_token (JWT) if available
  let email: string | undefined;
  if (tokens.id_token) {
    try {
      const payloadPart = (tokens.id_token as string).split('.')[1];
      // Handle base64url → base64 for atob
      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64)) as Record<string, unknown>;

      // Validate id_token claims (iss, exp)
      if (payload.iss !== 'https://access.line.me') {
        throw new Error(`LINE id_token invalid issuer: ${payload.iss}`);
      }
      const now = Math.floor(Date.now() / 1000);
      if (typeof payload.exp === 'number' && payload.exp < now) {
        throw new Error('LINE id_token has expired');
      }

      email = payload.email as string | undefined;
    } catch {
      // Ignore JWT decode errors; email remains undefined
    }
  }

  return {
    provider: 'line',
    providerUid: String(data.userId),
    email,
    name: data.displayName as string | undefined,
    profileImage: data.pictureUrl as string | undefined,
    rawData: data,
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// Telegram Login Widget
// ═══════════════════════════════════════════════════════════════

/**
 * Verify Telegram Login Widget data using HMAC-SHA-256.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
export async function verifyTelegramAuth(
  data: Record<string, string>,
  botToken: string,
): Promise<boolean> {
  // 1. hash 필드를 분리
  const hash = data.hash;
  if (!hash) return false;

  // 2. 나머지 필드를 알파벳순 정렬, "key=value" 형식으로 \n 연결
  const checkFields = Object.keys(data)
    .filter(k => k !== 'hash')
    .sort()
    .map(k => `${k}=${data[k]}`)
    .join('\n');

  // 3. SHA-256(botToken)을 secret key로 사용
  const encoder = new TextEncoder();
  const secretKeyData = await crypto.subtle.digest('SHA-256', encoder.encode(botToken));
  const secretKey = await crypto.subtle.importKey(
    'raw', secretKeyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );

  // 4. HMAC-SHA-256 계산
  const signature = await crypto.subtle.sign('HMAC', secretKey, encoder.encode(checkFields));
  const computedHash = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // 5. timing-safe 비교 (length가 달라도 항상 64자와 비교하여 timing leak 방지)
  const HASH_LEN = 64;
  const expected = computedHash.padEnd(HASH_LEN, '0');
  const received = hash.padEnd(HASH_LEN, '0');
  let result = computedHash.length ^ hash.length; // length 차이도 XOR로
  for (let i = 0; i < HASH_LEN; i++) {
    result |= expected.charCodeAt(i) ^ received.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract user info from verified Telegram auth data.
 */
export function getTelegramUserInfo(data: Record<string, string>): OAuthUserInfo {
  return {
    provider: 'telegram',
    providerUid: String(data.id),
    email: undefined, // Telegram doesn't provide email
    name: [data.first_name, data.last_name].filter(Boolean).join(' ') || undefined,
    profileImage: data.photo_url || undefined,
    rawData: data as unknown as Record<string, unknown>,
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
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
    phone: undefined,
    birthday: undefined,
    gender: undefined,
  };
}
