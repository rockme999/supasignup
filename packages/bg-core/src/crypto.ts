/**
 * Crypto utilities using Web Crypto API (Cloudflare Workers compatible).
 * No Node.js crypto module dependencies.
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const binString = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  return btoa(binString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function importAesKey(keyHex: string): Promise<CryptoKey> {
  if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
    throw new Error('AES key must be exactly 64 hex characters (256 bits)');
  }
  const rawKey = hexToBytes(keyHex);
  return crypto.subtle.importKey('raw', rawKey, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

// ---------------------------------------------------------------------------
// AES-GCM encryption / decryption
// ---------------------------------------------------------------------------

/**
 * Encrypt plaintext with AES-256-GCM.
 * @param plaintext - The string to encrypt.
 * @param keyHex   - 256-bit key as a hex string (64 hex chars).
 * @returns Base64-encoded string containing the 12-byte IV prepended to the ciphertext.
 */
export async function encrypt(plaintext: string, keyHex: string): Promise<string> {
  const key = await importAesKey(keyHex);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  );

  // Combine IV + ciphertext into a single buffer
  const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(cipherBuf), iv.length);

  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt an AES-256-GCM ciphertext produced by `encrypt`.
 * @param ciphertext - Base64-encoded string (IV + ciphertext).
 * @param keyHex     - 256-bit key as a hex string (64 hex chars).
 * @returns The original plaintext string.
 */
export async function decrypt(ciphertext: string, keyHex: string): Promise<string> {
  const key = await importAesKey(keyHex);
  let decoded: string;
  try {
    decoded = atob(ciphertext);
  } catch {
    throw new Error('Invalid ciphertext: not valid Base64');
  }
  const combined = Uint8Array.from(decoded, (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data,
  );

  return new TextDecoder().decode(plainBuf);
}

// ---------------------------------------------------------------------------
// SHA-256 hashing
// ---------------------------------------------------------------------------

/**
 * Compute the SHA-256 hash of the input string.
 * @returns Hex-encoded hash string.
 */
export async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(hashBuf));
}

// ---------------------------------------------------------------------------
// PKCE utilities
// ---------------------------------------------------------------------------

/**
 * Generate a PKCE code_verifier (43-128 URL-safe characters).
 */
export function generateCodeVerifier(length = 64): string {
  const clamped = Math.max(43, Math.min(128, length));
  const bytes = crypto.getRandomValues(new Uint8Array(clamped));
  return bytesToBase64Url(bytes).slice(0, clamped);
}

/**
 * Generate a PKCE S256 code_challenge from a code_verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoded = new TextEncoder().encode(verifier);
  const hashBuf = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToBase64Url(new Uint8Array(hashBuf));
}

// ---------------------------------------------------------------------------
// ID / secret generation
// ---------------------------------------------------------------------------

/**
 * Generate a UUID v4 identifier.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Generate a random hex string suitable for use as a client_secret.
 * @param length - Number of random bytes (default 32 = 64 hex chars).
 */
export function generateSecret(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToHex(bytes);
}

// ---------------------------------------------------------------------------
// Timing-safe comparison
// ---------------------------------------------------------------------------

/**
 * Constant-time string comparison to prevent timing attacks.
 * Uses HMAC-based comparison via Web Crypto API.
 * Returns true if `a` and `b` are equal.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const keyData = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const [macA, macB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, encoder.encode(a)),
    crypto.subtle.sign('HMAC', key, encoder.encode(b)),
  ]);

  const viewA = new Uint8Array(macA);
  const viewB = new Uint8Array(macB);

  if (viewA.length !== viewB.length) return false;

  let result = 0;
  for (let i = 0; i < viewA.length; i++) {
    result |= viewA[i] ^ viewB[i];
  }
  return result === 0;
}
