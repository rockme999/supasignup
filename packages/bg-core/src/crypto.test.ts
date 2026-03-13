import { describe, it, expect } from "vitest";
import {
  encrypt,
  decrypt,
  sha256,
  generateCodeVerifier,
  generateCodeChallenge,
  generateId,
  generateSecret,
} from "./crypto";

// Valid 256-bit key (64 hex chars)
const TEST_KEY = "a".repeat(64);

describe("encrypt / decrypt", () => {
  it("round-trips plaintext correctly", async () => {
    const plaintext = "hello 번개가입";
    const ciphertext = await encrypt(plaintext, TEST_KEY);
    const decrypted = await decrypt(ciphertext, TEST_KEY);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext each time (random IV)", async () => {
    const plaintext = "test";
    const a = await encrypt(plaintext, TEST_KEY);
    const b = await encrypt(plaintext, TEST_KEY);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with wrong key", async () => {
    const ciphertext = await encrypt("secret", TEST_KEY);
    const wrongKey = "b".repeat(64);
    await expect(decrypt(ciphertext, wrongKey)).rejects.toThrow();
  });

  it("rejects invalid key length", async () => {
    await expect(encrypt("test", "abcd")).rejects.toThrow(
      "AES key must be exactly 64 hex characters"
    );
  });

  it("rejects non-hex key", async () => {
    await expect(encrypt("test", "g".repeat(64))).rejects.toThrow(
      "AES key must be exactly 64 hex characters"
    );
  });

  it("rejects invalid Base64 ciphertext", async () => {
    await expect(decrypt("not!valid!base64!!!", TEST_KEY)).rejects.toThrow(
      "not valid Base64"
    );
  });

  it("handles empty string", async () => {
    const ciphertext = await encrypt("", TEST_KEY);
    const decrypted = await decrypt(ciphertext, TEST_KEY);
    expect(decrypted).toBe("");
  });
});

describe("sha256", () => {
  it("produces correct hash for known input", async () => {
    const hash = await sha256("hello");
    expect(hash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
    );
  });

  it("produces consistent output", async () => {
    const a = await sha256("test@example.com");
    const b = await sha256("test@example.com");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await sha256("alice");
    const b = await sha256("bob");
    expect(a).not.toBe(b);
  });
});

describe("PKCE", () => {
  it("generateCodeVerifier returns string of correct length", () => {
    const verifier = generateCodeVerifier(64);
    expect(verifier.length).toBe(64);
  });

  it("generateCodeVerifier clamps length to [43, 128]", () => {
    expect(generateCodeVerifier(10).length).toBe(43);
    expect(generateCodeVerifier(200).length).toBe(128);
  });

  it("generateCodeVerifier uses URL-safe characters", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("generateCodeChallenge produces deterministic output for same verifier", async () => {
    const verifier = "testverifier1234567890123456789012345678901234";
    const a = await generateCodeChallenge(verifier);
    const b = await generateCodeChallenge(verifier);
    expect(a).toBe(b);
  });

  it("code challenge differs from verifier", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    expect(challenge).not.toBe(verifier);
  });
});

describe("generateId", () => {
  it("returns a valid UUID v4 format", () => {
    const id = generateId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("generateSecret", () => {
  it("returns hex string of correct length", () => {
    const secret = generateSecret(32);
    expect(secret.length).toBe(64); // 32 bytes = 64 hex chars
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it("generates unique secrets", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(a).not.toBe(b);
  });
});
