import { describe, it, expect } from "vitest";
import { PROVIDER_INFO, DEFAULT_PROVIDER_ORDER } from "./providers";
import type { ProviderName } from "./types";

describe("PROVIDER_INFO", () => {
  const allProviders: ProviderName[] = ["google", "kakao", "naver", "apple", "discord", "facebook", "x", "line", "telegram"];

  it("contains all 9 providers", () => {
    expect(Object.keys(PROVIDER_INFO).sort()).toEqual(allProviders.sort());
  });

  it.each(allProviders)("%s has required fields", (name) => {
    const info = PROVIDER_INFO[name];
    expect(info.name).toBe(name);
    expect(info.displayName).toBeTruthy();
    expect(info.icon).toBeTruthy();
    expect(info.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(info.bgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(info.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

describe("DEFAULT_PROVIDER_ORDER", () => {
  it("contains all 9 providers", () => {
    expect(DEFAULT_PROVIDER_ORDER).toHaveLength(9);
    expect(new Set(DEFAULT_PROVIDER_ORDER).size).toBe(9);
  });

  it("starts with kakao (Korean market priority)", () => {
    expect(DEFAULT_PROVIDER_ORDER[0]).toBe("kakao");
  });
});
