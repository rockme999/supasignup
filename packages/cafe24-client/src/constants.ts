/**
 * Cafe24 webhook event type constants.
 *
 * TypeScript port of cafe24-common/constants.py.
 */

// ---------------------------------------------------------------------------
// Member events
// ---------------------------------------------------------------------------

/** Member signup -- new customer registered in shop. */
export const MEMBER_JOINED = 90032;

// ---------------------------------------------------------------------------
// App management events
// ---------------------------------------------------------------------------

/** App deleted -- shop operator deleted the app. */
export const APP_DELETED = 90077;

/** App expired -- paid app subscription expired. */
export const APP_EXPIRED = 90078;

/** App renewed -- paid app subscription renewed. */
export const APP_RENEWED = 90079;

/** Events that should deactivate the app. */
export const DEACTIVATE_EVENTS: ReadonlySet<number> = new Set([
  APP_DELETED,
  APP_EXPIRED,
]);

/** Events that should reactivate the app. */
export const REACTIVATE_EVENTS: ReadonlySet<number> = new Set([APP_RENEWED]);

// ---------------------------------------------------------------------------
// Appstore payment events
// ---------------------------------------------------------------------------

/** Payment complete -- appstore in-app payment completed. */
export const PAYMENT_COMPLETE = 90157;

/** Refund requested -- shop operator requested a refund. */
export const REFUND_REQUESTED = 90158;

/** Refund complete -- refund processing completed. */
export const REFUND_COMPLETE = 90159;

/** Refund rejected -- refund request was rejected. */
export const REFUND_REJECTED = 90160;

/** Events that indicate payment completion. */
export const PAYMENT_EVENTS: ReadonlySet<number> = new Set([PAYMENT_COMPLETE]);

/** Events that indicate refund completion. */
export const REFUND_EVENTS: ReadonlySet<number> = new Set([REFUND_COMPLETE]);

// ---------------------------------------------------------------------------
// Order-related events
// ---------------------------------------------------------------------------

/** Order placed. */
export const ORDER_PLACED = 90023;

/** Shipping status changed. */
export const SHIPPING_STATUS_CHANGED = 90024;

/** Shipping status changed (bulk). */
export const SHIPPING_STATUS_CHANGED_BULK = 90071;

/** Payment status changed. */
export const PAYMENT_STATUS_CHANGED = 90025;

/** Cancellation status changed. */
export const CANCEL_STATUS_CHANGED = 90026;

/** Cancellation status changed (bulk). */
export const CANCEL_STATUS_CHANGED_BULK = 90072;

/** Exchange status changed. */
export const EXCHANGE_STATUS_CHANGED = 90028;

/** Return status changed. */
export const RETURN_STATUS_CHANGED = 90027;

/** Return status changed (bulk). */
export const RETURN_STATUS_CHANGED_BULK = 90074;

/** Refund status changed. */
export const REFUND_STATUS_CHANGED = 90029;

/** Refund status changed (bulk). */
export const REFUND_STATUS_CHANGED_BULK = 90073;

/** Order item added. */
export const ORDER_ITEM_ADDED = 90031;

/** Recipient info changed. */
export const RECIPIENT_INFO_CHANGED = 90064;

/** Tracking number changed. */
export const TRACKING_NO_CHANGED = 90162;

/** All order-related events. */
export const ORDER_EVENTS: ReadonlySet<number> = new Set([
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
]);
