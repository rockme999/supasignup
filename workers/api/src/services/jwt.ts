/**
 * Minimal JWT implementation using Web Crypto API (HMAC-SHA256).
 */

import { timingSafeEqual } from '@supasignup/bg-core';

const encoder = new TextEncoder();

function base64UrlEncode(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): string {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4);
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const bytes = new Uint8Array(sig);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64UrlEncode(binary);
}

export interface JwtPayload {
  sub: string; // owner_id
  iat: number;
  exp: number;
}

const JWT_EXPIRY = 24 * 60 * 60; // 24 hours

export async function createToken(ownerId: string, secret: string): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: ownerId,
    iat: now,
    exp: now + JWT_EXPIRY,
  };
  const payloadStr = base64UrlEncode(JSON.stringify(payload));
  const signature = await sign(`${header}.${payloadStr}`, secret);
  return `${header}.${payloadStr}.${signature}`;
}

export async function verifyToken(token: string, secret: string): Promise<JwtPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expectedSig = await sign(`${header}.${payload}`, secret);

  if (!(await timingSafeEqual(signature, expectedSig))) return null;

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return null;
    return decoded;
  } catch {
    return null;
  }
}
