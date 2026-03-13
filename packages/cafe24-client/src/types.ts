/**
 * Cafe24 Client type definitions.
 *
 * TypeScript port of cafe24-common Python models and error types.
 */

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class Cafe24Error extends Error {
  public readonly detail?: string;

  constructor(message: string, detail?: string) {
    super(message);
    this.name = "Cafe24Error";
    this.detail = detail;
  }
}

export class Cafe24ApiError extends Cafe24Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number, detail?: string) {
    super(message, detail);
    this.name = "Cafe24ApiError";
    this.statusCode = statusCode;
  }
}

export class Cafe24RateLimitError extends Cafe24Error {
  constructor(message = "Cafe24 rate limit exceeded") {
    super(message);
    this.name = "Cafe24RateLimitError";
  }
}

export class Cafe24RefreshExpiredError extends Cafe24Error {
  constructor(message = "Failed to refresh token", detail?: string) {
    super(message, detail);
    this.name = "Cafe24RefreshExpiredError";
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Constructor options for Cafe24Client. */
export interface Cafe24ClientConfig {
  /** Request timeout in milliseconds (default: 30000). */
  timeout?: number;
  /** Callback invoked on 401 to obtain a fresh access token. */
  tokenRefresher?: TokenRefresher;
}

/**
 * Token refresher callback type.
 * Receives a mallId and must return a new access token string.
 */
export type TokenRefresher = (mallId: string) => Promise<string>;

// ---------------------------------------------------------------------------
// OAuth / Token
// ---------------------------------------------------------------------------

/** Response from OAuth token exchange or refresh. */
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: Date;
  refresh_token_expires_at: Date;
  scopes?: string[];
  mall_id?: string;
  user_id?: string;
  client_id?: string;
  issued_at?: Date;
}

// ---------------------------------------------------------------------------
// Customer / Member
// ---------------------------------------------------------------------------

/** Cafe24 customer (member) data.  Fields vary by endpoint scope. */
export interface Customer {
  member_id: string;
  name?: string;
  name_english?: string;
  email?: string;
  phone?: string;
  cellphone?: string;
  group_no?: number;
  join_date?: string;
  total_points?: string;
  available_points?: string;
  used_points?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// ScriptTag
// ---------------------------------------------------------------------------

/** Cafe24 ScriptTag resource. */
export interface ScriptTag {
  script_no: number;
  client_id: string;
  src: string;
  display: string[];
  exclude_path?: string[];
  skin_no?: number[];
  integrity?: string | null;
  created_date?: string;
  updated_date?: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

/** Store basic information. */
export interface StoreInfo {
  shop_name: string;
  shop_domain: string;
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------

/** Cafe24 webhook payload common fields. */
export interface WebhookPayload {
  event_no?: number;
  resource: Record<string, unknown>;
}
