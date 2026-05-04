/**
 * cafe24-client -- Cafe24 Admin API client for Cloudflare Workers.
 *
 * TypeScript port of the Python cafe24-common library.
 */

// Client
export { Cafe24Client } from "./client";

// Types & Errors
export {
  // Errors
  Cafe24Error,
  Cafe24ApiError,
  Cafe24RateLimitError,
  Cafe24RefreshExpiredError,
  // Types
  type Cafe24ClientConfig,
  type TokenResponse,
  type TokenRefresher,
  type Customer,
  type ScriptTag,
  type StoreInfo,
  type StoreContact,
  type WebhookPayload,
} from "./types";

// HMAC
export { verifyAppLaunchHmac, verifyWebhookHmac } from "./hmac";

// Constants -- Member / App management
export {
  // Member
  MEMBER_JOINED,
  // App lifecycle
  APP_DELETED,
  APP_EXPIRED,
  APP_RENEWED,
  DEACTIVATE_EVENTS,
  REACTIVATE_EVENTS,
  // Appstore payment
  PAYMENT_COMPLETE,
  PAYMENT_EVENTS,
  REFUND_REQUESTED,
  REFUND_COMPLETE,
  REFUND_REJECTED,
  REFUND_EVENTS,
  // Order
  ORDER_PLACED,
  SHIPPING_STATUS_CHANGED,
  SHIPPING_STATUS_CHANGED_BULK,
  PAYMENT_STATUS_CHANGED,
  CANCEL_STATUS_CHANGED,
  CANCEL_STATUS_CHANGED_BULK,
  EXCHANGE_STATUS_CHANGED,
  RETURN_STATUS_CHANGED,
  RETURN_STATUS_CHANGED_BULK,
  REFUND_STATUS_CHANGED,
  REFUND_STATUS_CHANGED_BULK,
  ORDER_ITEM_ADDED,
  RECIPIENT_INFO_CHANGED,
  TRACKING_NO_CHANGED,
  ORDER_EVENTS,
} from "./constants";
