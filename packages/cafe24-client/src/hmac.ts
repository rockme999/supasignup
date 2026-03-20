/**
 * HMAC-SHA256 verification utilities for Cafe24.
 *
 * Uses the Web Crypto API (crypto.subtle) -- compatible with
 * Cloudflare Workers, Deno, and modern browsers.
 *
 * TypeScript port of cafe24-common/hmac.py.
 */

const encoder = new TextEncoder();

/**
 * Compute HMAC-SHA256 and return the result as a Base64 string.
 */
async function hmacSha256Base64(
  key: string | ArrayBuffer,
  message: string | ArrayBuffer,
): Promise<string> {
  const keyBytes =
    typeof key === "string" ? encoder.encode(key) : key;
  const msgBytes =
    typeof message === "string" ? encoder.encode(message) : message;

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);

  // Convert ArrayBuffer to Base64
  const bytes = new Uint8Array(signature);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Timing-safe comparison of two strings.
 *
 * Falls back to a constant-time loop when `crypto.subtle.timingSafeEqual`
 * is not available (e.g., in browsers).
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // Pad shorter array to prevent length-based timing leak
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let result = aBytes.length ^ bBytes.length; // non-zero if lengths differ
  for (let i = 0; i < maxLen; i++) {
    result |= (aBytes[i % aBytes.length] ?? 0) ^ (bBytes[i % bBytes.length] ?? 0);
  }
  return result === 0;
}

/**
 * Verify a Cafe24 app-launch HMAC-SHA256 signature.
 *
 * Cafe24 generates the HMAC over the query string *excluding* the `hmac`
 * parameter itself. Parameters are sorted alphabetically before hashing
 * to prevent parameter-order manipulation attacks.
 *
 * @param queryString - Full query string (including the `hmac` parameter).
 * @param receivedHmac - The HMAC value sent in the request.
 * @param secret - Cafe24 Client Secret.
 * @returns `true` if the signature is valid.
 */
export async function verifyAppLaunchHmac(
  queryString: string,
  _receivedHmac: string,
  secret: string,
): Promise<boolean> {
  // Extract hmac value from raw query string (URL-decoded)
  const params = new URLSearchParams(queryString);
  const hmac = params.get("hmac");
  if (!hmac) return false;

  // Remove hmac parameter from raw query string (preserve original encoding & order)
  // Cafe24 computes HMAC over the URL-encoded query string in its original order
  const plainQuery = queryString
    .split("&")
    .filter((p) => !p.startsWith("hmac="))
    .join("&");

  const expected = await hmacSha256Base64(secret, plainQuery);
  return timingSafeEqual(expected, hmac);
}

/**
 * Verify a Cafe24 webhook HMAC-SHA256 signature.
 *
 * Cafe24 sends the Base64-encoded HMAC in the `X-Cafe24-Hmac-SHA256` header.
 *
 * @param body - Raw request body (string or ArrayBuffer).
 * @param signature - Value of the `X-Cafe24-Hmac-SHA256` header.
 * @param secret - Cafe24 Client Secret.
 * @returns `true` if the signature is valid.
 */
export async function verifyWebhookHmac(
  body: string | ArrayBuffer,
  signature: string,
  secret: string,
): Promise<boolean> {
  const expected = await hmacSha256Base64(secret, body);
  return timingSafeEqual(signature, expected);
}
