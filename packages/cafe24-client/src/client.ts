/**
 * Cafe24 Admin API client -- fetch-based (Cloudflare Workers compatible).
 *
 * TypeScript port of cafe24-common/client.py.
 */

import {
  Cafe24ApiError,
  Cafe24RateLimitError,
  Cafe24RefreshExpiredError,
  type Cafe24ClientConfig,
  type Customer,
  type ScriptTag,
  type StoreInfo,
  type TokenRefresher,
  type TokenResponse,
} from "./types";
import { verifyWebhookHmac } from "./hmac";

export class Cafe24Client {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly timeout: number;
  private readonly tokenRefresher?: TokenRefresher;

  constructor(
    clientId: string,
    clientSecret: string,
    options?: Cafe24ClientConfig,
  ) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.timeout = options?.timeout ?? 30_000;
    this.tokenRefresher = options?.tokenRefresher;
  }

  // ──────────────────────────────────────────────
  // URL helpers
  // ──────────────────────────────────────────────

  private apiBase(mallId: string): string {
    return `https://${mallId}.cafe24api.com/api/v2`;
  }

  private oauthUrl(mallId: string): string {
    return `https://${mallId}.cafe24api.com/api/v2/oauth/token`;
  }

  /** Build Basic auth header value from clientId:clientSecret. */
  private basicAuth(): string {
    const credentials = `${this.clientId}:${this.clientSecret}`;
    // btoa is available in Cloudflare Workers
    return `Basic ${btoa(credentials)}`;
  }

  // ──────────────────────────────────────────────
  // Internal fetch wrapper
  // ──────────────────────────────────────────────

  private async fetchWithTimeout(
    url: string,
    init: RequestInit,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeout);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  // ──────────────────────────────────────────────
  // Rate limit monitoring
  // ──────────────────────────────────────────────

  private checkRateLimit(resp: Response): void {
    const usage = resp.headers.get("X-Cafe24-Call-Usage");
    if (usage) {
      const current = parseInt(usage, 10);
      if (!isNaN(current) && current >= 80) {
        console.warn(`Cafe24 Rate Limit usage: ${current}%`);
      }
    }
  }

  // ──────────────────────────────────────────────
  // OAuth2 token exchange
  // ──────────────────────────────────────────────

  /**
   * Exchange an authorization code for access + refresh tokens.
   */
  async exchangeCode(
    code: string,
    mallId: string,
    redirectUri: string,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    });

    const resp = await this.fetchWithTimeout(this.oauthUrl(mallId), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.basicAuth(),
      },
      body: body.toString(),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Cafe24 token exchange failed: ${resp.status} ${text}`);
      throw new Cafe24ApiError(
        "Failed to exchange authorization code",
        resp.status,
        `HTTP ${resp.status}`,
      );
    }

    const data = await resp.json() as Record<string, unknown>;
    this.checkRateLimit(resp);

    if (typeof data.access_token !== "string" || !data.access_token) {
      throw new Cafe24ApiError(
        "Token exchange response missing access_token",
        resp.status,
        JSON.stringify(data).slice(0, 500),
      );
    }

    const now = new Date();

    // Compute expires_at
    let expiresAt: Date;
    if (typeof data.expires_in === "number") {
      expiresAt = new Date(now.getTime() + data.expires_in * 1000);
    } else if (typeof data.expires_at === "string") {
      expiresAt = new Date(data.expires_at);
    } else {
      expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // default 2h
    }

    // Compute refresh_token_expires_at
    let refreshExpiresAt: Date;
    if (typeof data.refresh_token_expires_in === "number") {
      refreshExpiresAt = new Date(
        now.getTime() + data.refresh_token_expires_in * 1000,
      );
    } else {
      refreshExpiresAt = new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000,
      ); // default 14d
    }

    return {
      access_token: data.access_token,
      refresh_token: typeof data.refresh_token === "string" ? data.refresh_token : "",
      expires_at: expiresAt,
      refresh_token_expires_at: refreshExpiresAt,
      scopes: Array.isArray(data.scopes) ? data.scopes : [],
      mall_id: typeof data.mall_id === "string" ? data.mall_id : mallId,
      user_id: typeof data.user_id === "string" ? data.user_id : "",
      client_id: typeof data.client_id === "string" ? data.client_id : this.clientId,
      issued_at: now,
    };
  }

  // ──────────────────────────────────────────────
  // Token refresh
  // ──────────────────────────────────────────────

  /**
   * Refresh an access token using a refresh token.
   */
  async refreshToken(
    mallId: string,
    refreshToken: string,
  ): Promise<TokenResponse> {
    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const resp = await this.fetchWithTimeout(this.oauthUrl(mallId), {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: this.basicAuth(),
      },
      body: body.toString(),
    });

    if (resp.status === 429) {
      throw new Cafe24RateLimitError(
        "Cafe24 rate limit exceeded during token refresh",
      );
    }

    if (!resp.ok) {
      const text = await resp.text();
      console.error(`Cafe24 token refresh failed: ${resp.status} ${text}`);
      throw new Cafe24RefreshExpiredError(
        "Failed to refresh token",
        `mall_id=${mallId}, HTTP ${resp.status}`,
      );
    }

    const data = await resp.json() as Record<string, unknown>;
    this.checkRateLimit(resp);

    if (typeof data.access_token !== "string" || !data.access_token) {
      throw new Cafe24ApiError(
        "Token refresh response missing access_token",
        resp.status,
        JSON.stringify(data).slice(0, 500),
      );
    }
    if (typeof data.refresh_token !== "string" || !data.refresh_token) {
      throw new Cafe24ApiError(
        "Token refresh response missing refresh_token",
        resp.status,
        JSON.stringify(data).slice(0, 500),
      );
    }

    const now = new Date();

    let expiresAt: Date;
    if (typeof data.expires_in === "number") {
      expiresAt = new Date(now.getTime() + data.expires_in * 1000);
    } else if (typeof data.expires_at === "string") {
      expiresAt = new Date(data.expires_at);
    } else {
      expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    }

    let refreshExpiresAt: Date;
    if (typeof data.refresh_token_expires_in === "number") {
      refreshExpiresAt = new Date(
        now.getTime() + data.refresh_token_expires_in * 1000,
      );
    } else {
      refreshExpiresAt = new Date(
        now.getTime() + 14 * 24 * 60 * 60 * 1000,
      );
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: expiresAt,
      refresh_token_expires_at: refreshExpiresAt,
    };
  }

  // ──────────────────────────────────────────────
  // Internal API request with 401 auto-retry
  // ──────────────────────────────────────────────

  private raiseForStatus(
    resp: Response,
    method: string,
    path: string,
    responseText: string,
  ): void {
    this.checkRateLimit(resp);

    if (resp.status === 429) {
      throw new Cafe24RateLimitError("Cafe24 rate limit exceeded");
    }

    if (resp.status >= 400) {
      console.error(
        `Cafe24 API ${method} ${path} failed: ${resp.status} ${responseText}`,
      );
      throw new Cafe24ApiError(
        `Cafe24 API error: ${path}`,
        resp.status,
        responseText.slice(0, 500),
      );
    }
  }

  private async apiRequest(
    method: string,
    mallId: string,
    accessToken: string,
    path: string,
    options?: {
      params?: Record<string, string>;
      jsonData?: unknown;
    },
  ): Promise<Response> {
    let url = `${this.apiBase(mallId)}${path}`;

    if (options?.params) {
      const qs = new URLSearchParams(options.params).toString();
      if (qs) {
        url += `?${qs}`;
      }
    }

    const doRequest = async (token: string): Promise<Response> => {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };

      const init: RequestInit = { method, headers };

      if (
        options?.jsonData !== undefined &&
        (method === "POST" || method === "PUT")
      ) {
        headers["Content-Type"] = "application/json";
        init.body = JSON.stringify(options.jsonData);
      }

      return this.fetchWithTimeout(url, init);
    };

    let resp = await doRequest(accessToken);

    // 401 + tokenRefresher => refresh and retry once
    if (resp.status === 401 && this.tokenRefresher) {
      console.warn(
        `Cafe24 API ${method} ${path} returned 401, attempting token refresh for mall=${mallId}`,
      );
      try {
        const newToken = await this.tokenRefresher(mallId);
        const retryResp = await doRequest(newToken);
        if (retryResp.status !== 401) {
          console.info(
            `Cafe24 API retry succeeded after token refresh: ${method} ${path}`,
          );
          resp = retryResp;
        }
      } catch (err) {
        console.error(`Token refresh failed for mall=${mallId}:`, err);
        // Fall through with original 401 response
      }
    }

    return resp;
  }

  // ──────────────────────────────────────────────
  // Generic API methods
  // ──────────────────────────────────────────────

  /** Cafe24 Admin API GET request. */
  async apiGet<T = Record<string, unknown>>(
    mallId: string,
    accessToken: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T> {
    const resp = await this.apiRequest("GET", mallId, accessToken, path, {
      params,
    });
    const text = await resp.text();
    this.raiseForStatus(resp, "GET", path, text);
    return JSON.parse(text) as T;
  }

  /** Cafe24 Admin API POST request. */
  async apiPost<T = Record<string, unknown>>(
    mallId: string,
    accessToken: string,
    path: string,
    jsonData?: unknown,
  ): Promise<T> {
    const resp = await this.apiRequest("POST", mallId, accessToken, path, {
      jsonData,
    });
    const text = await resp.text();
    this.raiseForStatus(resp, "POST", path, text);
    return JSON.parse(text) as T;
  }

  /** Cafe24 Admin API PUT request. */
  async apiPut<T = Record<string, unknown>>(
    mallId: string,
    accessToken: string,
    path: string,
    jsonData?: unknown,
  ): Promise<T> {
    const resp = await this.apiRequest("PUT", mallId, accessToken, path, {
      jsonData,
    });
    const text = await resp.text();
    this.raiseForStatus(resp, "PUT", path, text);
    return JSON.parse(text) as T;
  }

  /** Cafe24 Admin API DELETE request. Returns null on 204 No Content. */
  async apiDelete<T = Record<string, unknown>>(
    mallId: string,
    accessToken: string,
    path: string,
    params?: Record<string, string>,
  ): Promise<T | null> {
    const resp = await this.apiRequest("DELETE", mallId, accessToken, path, {
      params,
    });
    const text = await resp.text();
    this.raiseForStatus(resp, "DELETE", path, text);
    if (resp.status === 204) {
      return null;
    }
    try {
      return JSON.parse(text) as T;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // High-level API methods
  // ──────────────────────────────────────────────

  /**
   * Get the store name. Returns empty string on failure.
   */
  async getStoreName(mallId: string, accessToken: string): Promise<string> {
    try {
      const result = await this.apiGet<{ store?: Record<string, string> }>(
        mallId,
        accessToken,
        "/admin/store",
      );
      const store = result.store ?? {};
      return store.shop_name || store.mall_id || "";
    } catch (err) {
      if (
        err instanceof Cafe24RateLimitError ||
        err instanceof Cafe24RefreshExpiredError
      ) {
        throw err;
      }
      console.warn(`Failed to get store name: mall=${mallId}`, err);
      return "";
    }
  }

  /**
   * Get store name and domain.
   */
  async getStoreInfo(
    mallId: string,
    accessToken: string,
  ): Promise<StoreInfo> {
    try {
      const result = await this.apiGet<{
        store?: Record<string, string>;
      }>(mallId, accessToken, "/admin/store");
      const store = result.store ?? {};

      const primary = store.primary_domain ?? "";
      const mallUrl = store.mall_url ?? "";
      const base = store.base_domain ?? "";

      let domain: string;
      if (primary) {
        domain = `https://${primary}`;
      } else if (mallUrl) {
        let url = mallUrl.startsWith("http") ? mallUrl : `https://${mallUrl}`;
        if (url.startsWith("http://")) {
          url = "https://" + url.slice(7);
        }
        domain = url;
      } else {
        domain = base ? `https://${base}` : "";
      }

      return {
        shop_name: store.shop_name || store.mall_id || "",
        shop_domain: domain,
      };
    } catch (err) {
      if (
        err instanceof Cafe24RateLimitError ||
        err instanceof Cafe24RefreshExpiredError
      ) {
        throw err;
      }
      console.warn(`Failed to get store info: mall=${mallId}`, err);
      return { shop_name: "", shop_domain: "" };
    }
  }

  /**
   * Look up a customer by member ID. Returns null if not found.
   *
   * Tries the `customersprivacy` endpoint first (includes PII), then
   * falls back to the basic `customers` endpoint.
   */
  async getCustomerByMemberId(
    mallId: string,
    accessToken: string,
    memberId: string,
  ): Promise<Customer | null> {
    // 1st: customersprivacy (includes PII)
    try {
      const result = await this.apiGet<{
        customersprivacy?: Customer[];
      }>(mallId, accessToken, "/admin/customersprivacy", {
        member_id: memberId,
      });
      const customers = result.customersprivacy ?? [];
      if (customers.length > 0) {
        return customers[0];
      }
    } catch (err) {
      if (
        err instanceof Cafe24RateLimitError ||
        err instanceof Cafe24RefreshExpiredError
      ) {
        throw err;
      }
      // Fall through to basic endpoint
    }

    // 2nd: fallback -- basic customers endpoint
    try {
      const result = await this.apiGet<{
        customers?: Customer[];
      }>(mallId, accessToken, "/admin/customers", {
        member_id: memberId,
      });
      const customers = result.customers ?? [];
      return customers.length > 0 ? customers[0] : null;
    } catch (err) {
      if (
        err instanceof Cafe24RateLimitError ||
        err instanceof Cafe24RefreshExpiredError
      ) {
        throw err;
      }
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // ScriptTag management
  // ──────────────────────────────────────────────

  /**
   * Create a script tag.
   *
   * @param mallId - Mall identifier.
   * @param accessToken - Access token.
   * @param src - Script URL to inject.
   * @param display - Page display filter (default: all pages).
   * @returns Created ScriptTag data.
   */
  async createScriptTag(
    mallId: string,
    accessToken: string,
    src: string,
    displayLocation: string[] = [
      "member_login",
      "member_join",
    ],
  ): Promise<ScriptTag> {
    const result = await this.apiPost<{ scripttag: ScriptTag }>(
      mallId,
      accessToken,
      "/admin/scripttags",
      {
        request: { src, display_location: displayLocation },
      },
    );
    return result.scripttag;
  }

  /**
   * Delete a script tag by its script number.
   */
  async deleteScriptTag(
    mallId: string,
    accessToken: string,
    scriptNo: number,
  ): Promise<void> {
    await this.apiDelete(
      mallId,
      accessToken,
      `/admin/scripttags/${scriptNo}`,
    );
  }

  /**
   * List all script tags for the current app.
   */
  async listScriptTags(
    mallId: string,
    accessToken: string,
  ): Promise<ScriptTag[]> {
    const result = await this.apiGet<{ scripttags: ScriptTag[] }>(
      mallId,
      accessToken,
      "/admin/scripttags",
    );
    return result.scripttags ?? [];
  }

  // ──────────────────────────────────────────────
  // Webhook management
  // ──────────────────────────────────────────────

  /**
   * Register a webhook subscription.
   *
   * @see https://developers.cafe24.com/docs/api/admin/#webhooks
   */
  async createWebhook(
    mallId: string,
    accessToken: string,
    event: string,
    url: string,
  ): Promise<Record<string, unknown>> {
    const result = await this.apiPost<{ webhook: Record<string, unknown> }>(
      mallId,
      accessToken,
      '/admin/webhooks',
      {
        request: { event, url },
      },
    );
    return result.webhook;
  }

  // ──────────────────────────────────────────────
  // Appstore order (in-app payment)
  // ──────────────────────────────────────────────

  /**
   * Create an appstore order for in-app payment.
   *
   * @see https://developers.cafe24.com/docs/api/admin/#appstore-orders
   */
  async createAppstoreOrder(
    mallId: string,
    accessToken: string,
    orderName: string,
    orderAmount: number,
    returnUrl: string,
  ): Promise<{ order_id: string; confirmation_url: string }> {
    const result = await this.apiPost<{
      order: { order_id: string; confirmation_url: string };
    }>(mallId, accessToken, '/admin/appstore/orders', {
      request: {
        order_name: orderName,
        order_amount: String(orderAmount),
        return_url: returnUrl,
        automatic_payment: 'F',
      },
    });
    return result.order;
  }

  /**
   * Get an appstore order by order_id.
   */
  async getAppstoreOrder(
    mallId: string,
    accessToken: string,
    orderId: string,
  ): Promise<Record<string, unknown> | null> {
    try {
      const result = await this.apiGet<{
        order: Record<string, unknown>;
      }>(mallId, accessToken, `/admin/appstore/orders/${orderId}`);
      return result.order ?? null;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Webhook verification
  // ──────────────────────────────────────────────

  /**
   * Verify a payment webhook HMAC-SHA256 signature using the client secret.
   */
  async verifyPaymentWebhook(
    body: string | ArrayBuffer,
    signature: string,
  ): Promise<boolean> {
    return verifyWebhookHmac(body, signature, this.clientSecret);
  }
}
