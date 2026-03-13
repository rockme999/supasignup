import { describe, it, expect, vi, beforeEach } from "vitest";
import { Cafe24Client } from "./client";
import { Cafe24ApiError, Cafe24RateLimitError } from "./types";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function textResponse(text: string, status: number) {
  return new Response(text, { status });
}

describe("Cafe24Client", () => {
  let client: Cafe24Client;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new Cafe24Client("test_client_id", "test_client_secret");
  });

  describe("exchangeCode", () => {
    it("returns TokenResponse on success", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_123",
          refresh_token: "rt_123",
          expires_in: 7200,
          refresh_token_expires_in: 1209600,
          scopes: ["mall.read_store"],
          mall_id: "testmall",
          user_id: "admin",
          client_id: "test_client_id",
        })
      );

      const result = await client.exchangeCode("code123", "testmall", "https://example.com/callback");

      expect(result.access_token).toBe("at_123");
      expect(result.refresh_token).toBe("rt_123");
      expect(result.expires_at).toBeInstanceOf(Date);
      expect(result.refresh_token_expires_at).toBeInstanceOf(Date);
      expect(result.scopes).toEqual(["mall.read_store"]);
      expect(result.mall_id).toBe("testmall");
    });

    it("throws Cafe24ApiError when access_token is missing", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ error: "invalid_grant" })
      );

      await expect(
        client.exchangeCode("bad_code", "testmall", "https://example.com/callback")
      ).rejects.toThrow(Cafe24ApiError);
    });

    it("throws on HTTP error", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Bad Request", 400));

      await expect(
        client.exchangeCode("code", "testmall", "https://example.com/callback")
      ).rejects.toThrow(Cafe24ApiError);
    });

    it("handles missing optional fields with defaults", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          access_token: "at_only",
        })
      );

      const result = await client.exchangeCode("code", "testmall", "https://example.com/cb");
      expect(result.access_token).toBe("at_only");
      expect(result.refresh_token).toBe("");
      expect(result.scopes).toEqual([]);
      expect(result.mall_id).toBe("testmall"); // fallback
    });
  });

  describe("refreshToken", () => {
    it("returns TokenResponse on success", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({
          access_token: "new_at",
          refresh_token: "new_rt",
          expires_in: 7200,
        })
      );

      const result = await client.refreshToken("testmall", "old_rt");
      expect(result.access_token).toBe("new_at");
      expect(result.refresh_token).toBe("new_rt");
    });

    it("throws when access_token missing in response", async () => {
      mockFetch.mockResolvedValueOnce(jsonResponse({}));

      await expect(
        client.refreshToken("testmall", "rt")
      ).rejects.toThrow("missing access_token");
    });

    it("throws when refresh_token missing in response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ access_token: "at" })
      );

      await expect(
        client.refreshToken("testmall", "rt")
      ).rejects.toThrow("missing refresh_token");
    });

    it("throws Cafe24RateLimitError on 429", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Too Many Requests", 429));

      await expect(
        client.refreshToken("testmall", "rt")
      ).rejects.toThrow(Cafe24RateLimitError);
    });
  });

  describe("apiGet", () => {
    it("returns parsed JSON response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ store: { shop_name: "테스트샵" } })
      );

      const result = await client.apiGet<{ store: { shop_name: string } }>(
        "testmall",
        "token",
        "/admin/store"
      );
      expect(result.store.shop_name).toBe("테스트샵");
    });

    it("throws on 4xx error", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Forbidden", 403));

      await expect(
        client.apiGet("testmall", "token", "/admin/store")
      ).rejects.toThrow(Cafe24ApiError);
    });

    it("retries on 401 with tokenRefresher", async () => {
      const refresher = vi.fn().mockResolvedValue("new_token");
      const clientWithRefresher = new Cafe24Client("cid", "cs", {
        tokenRefresher: refresher,
      });

      // First call: 401, second call after refresh: 200
      mockFetch
        .mockResolvedValueOnce(textResponse("Unauthorized", 401))
        .mockResolvedValueOnce(jsonResponse({ data: "ok" }));

      const result = await clientWithRefresher.apiGet("mall", "old_token", "/test");
      expect(result).toEqual({ data: "ok" });
      expect(refresher).toHaveBeenCalledWith("mall");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("apiPost", () => {
    it("sends JSON body and returns response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ scripttag: { script_no: 1 } })
      );

      const result = await client.apiPost<{ scripttag: { script_no: number } }>(
        "testmall",
        "token",
        "/admin/scripttags",
        { request: { src: "https://example.com/widget.js" } }
      );
      expect(result.scripttag.script_no).toBe(1);

      // Verify Content-Type was set
      const call = mockFetch.mock.calls[0];
      expect(call[1].headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("apiDelete", () => {
    it("returns null on 204 No Content", async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const result = await client.apiDelete("testmall", "token", "/admin/scripttags/1");
      expect(result).toBeNull();
    });
  });

  describe("getStoreName", () => {
    it("returns shop_name from store response", async () => {
      mockFetch.mockResolvedValueOnce(
        jsonResponse({ store: { shop_name: "마이샵", mall_id: "myshop" } })
      );

      const name = await client.getStoreName("myshop", "token");
      expect(name).toBe("마이샵");
    });

    it("returns empty string on failure", async () => {
      mockFetch.mockResolvedValueOnce(textResponse("Server Error", 500));

      const name = await client.getStoreName("myshop", "token");
      expect(name).toBe("");
    });
  });
});
