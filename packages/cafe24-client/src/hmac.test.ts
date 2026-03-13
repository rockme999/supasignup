import { describe, it, expect } from "vitest";
import { verifyAppLaunchHmac, verifyWebhookHmac } from "./hmac";

const TEST_SECRET = "test_secret_key";

describe("verifyWebhookHmac", () => {
  it("returns true for matching signature", async () => {
    // Compute expected HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(TEST_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const body = '{"event":"test"}';
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const bytes = new Uint8Array(sig);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const expected = btoa(binary);

    const result = await verifyWebhookHmac(body, expected, TEST_SECRET);
    expect(result).toBe(true);
  });

  it("returns false for wrong signature", async () => {
    const result = await verifyWebhookHmac(
      '{"event":"test"}',
      "wrong_signature_base64",
      TEST_SECRET
    );
    expect(result).toBe(false);
  });

  it("returns false for tampered body", async () => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(TEST_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const originalBody = '{"amount":100}';
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(originalBody)
    );
    const bytes = new Uint8Array(sig);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const hmac = btoa(binary);

    const result = await verifyWebhookHmac('{"amount":999}', hmac, TEST_SECRET);
    expect(result).toBe(false);
  });
});

describe("verifyAppLaunchHmac", () => {
  it("returns false when hmac parameter is missing", async () => {
    const result = await verifyAppLaunchHmac(
      "mall_id=test&timestamp=12345",
      "somehash",
      TEST_SECRET
    );
    expect(result).toBe(false);
  });

  it("returns false when hmac is first parameter", async () => {
    const result = await verifyAppLaunchHmac(
      "hmac=abc123",
      "abc123",
      TEST_SECRET
    );
    expect(result).toBe(false);
  });

  it("verifies a valid app launch HMAC", async () => {
    const queryWithoutHmac = "mall_id=test&timestamp=12345";

    // Compute expected HMAC
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(TEST_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(queryWithoutHmac)
    );
    const bytes = new Uint8Array(sig);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const hmac = btoa(binary);

    const fullQuery = `${queryWithoutHmac}&hmac=${hmac}`;
    const result = await verifyAppLaunchHmac(fullQuery, hmac, TEST_SECRET);
    expect(result).toBe(true);
  });
});
