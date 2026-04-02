/**
 * 쿠폰 발급 서비스 — 가입 시 카페24 쿠폰 자동 발급.
 *
 * 카페24 쿠폰 발급 API:
 *   POST https://{mall_id}.cafe24api.com/api/v2/admin/coupons/{coupon_no}/issues
 *
 * 참고:
 *   - 토큰 갱신 포함 (401 발생 시 refresh_token으로 재발급 후 DB 저장)
 *   - 에러는 로깅만 하고 가입 플로우를 차단하지 않음
 */

import type { Env, Shop } from '@supasignup/bg-core';
import { encrypt } from '@supasignup/bg-core';
import { Cafe24Client } from '@supasignup/cafe24-client';
import { decryptShopTokens } from '../db/queries';

// ─── 쿠폰 설정 타입 ──────────────────────────────────────────

export interface CouponConfig {
  enabled: boolean;
  coupons: CouponItem[];
  multi_coupon: boolean;
}

export interface CouponItem {
  coupon_no: number;
  coupon_name?: string;
  benefit_type?: string;
  discount_amount?: number;
  min_order?: number;
  expire_days?: number;
}

// ─── 카페24 쿠폰 발급 API 버전 ────────────────────────────────

const CAFE24_API_VERSION = '2026-03-01';

// ─── 단일 쿠폰 발급 ───────────────────────────────────────────

/**
 * 카페24 Admin API로 특정 쿠폰을 회원에게 발급한다.
 *
 * @returns true if successful, false otherwise
 */
async function issueSingleCoupon(
  mallId: string,
  accessToken: string,
  couponNo: number,
  memberId: string,
): Promise<{ ok: boolean; status: number }> {
  const resp = await fetch(
    `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': CAFE24_API_VERSION,
      },
      body: JSON.stringify({
        shop_no: 1,
        request: {
          issued_member_scope: 'M',
          member_id: memberId,
          allow_duplication: 'T',
          single_issue_per_once: 'T',
          send_sms_for_issue: 'F',
        },
      }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error(
      `[Coupon] 발급 실패: mall=${mallId}, coupon_no=${couponNo}, member=${memberId}, status=${resp.status}, detail=${text}`,
    );
    return { ok: false, status: resp.status };
  }

  return { ok: true, status: resp.status };
}

// ─── 토큰 갱신 + DB 저장 ─────────────────────────────────────

/**
 * access_token 갱신 후 DB에 저장한다.
 * 갱신 성공 시 새 access_token을 반환하고, 실패 시 null 반환.
 */
async function refreshAndSaveToken(
  env: Env,
  shop: Shop,
  refreshToken: string,
): Promise<string | null> {
  try {
    const client = new Cafe24Client(env.CAFE24_CLIENT_ID, env.CAFE24_CLIENT_SECRET);
    const newTokens = await client.refreshToken(shop.mall_id, refreshToken);

    // 갱신된 토큰 암호화 후 DB 저장
    const encAt = await encrypt(newTokens.access_token, env.ENCRYPTION_KEY);
    const encRt = await encrypt(newTokens.refresh_token, env.ENCRYPTION_KEY);
    await env.DB
      .prepare(
        "UPDATE shops SET platform_access_token = ?, platform_refresh_token = ?, updated_at = datetime('now') WHERE shop_id = ?",
      )
      .bind(encAt, encRt, shop.shop_id)
      .run();

    console.info(`[Coupon] 토큰 갱신 성공: mall=${shop.mall_id}`);
    return newTokens.access_token;
  } catch (err) {
    console.error(`[Coupon] 토큰 갱신 실패: mall=${shop.mall_id}`, err);
    return null;
  }
}

// ─── 메인 함수 ────────────────────────────────────────────────

/**
 * 가입 시 쿠폰 자동 발급.
 *
 * - coupon_config가 null이거나 enabled=false이면 스킵
 * - multi_coupon=false이면 첫 번째 쿠폰만 발급
 * - 401 발생 시 토큰 갱신 후 재시도
 * - 에러는 로깅만 하고 호출부 플로우를 차단하지 않음 (try-catch 필수)
 *
 * @param env - Cloudflare Workers 환경 바인딩
 * @param shop - 쿠폰 설정을 포함한 shop 레코드
 * @param memberId - 쿠폰을 발급받을 카페24 회원 ID
 */
export async function issueCouponOnSignup(
  env: Env,
  shop: Shop,
  memberId: string,
): Promise<void> {
  // 1. coupon_config 파싱
  if (!shop.coupon_config) {
    return; // 쿠폰 설정 없음, 스킵
  }

  let config: CouponConfig;
  try {
    config = JSON.parse(shop.coupon_config) as CouponConfig;
  } catch {
    console.error(`[Coupon] coupon_config JSON 파싱 실패: mall=${shop.mall_id}`);
    return;
  }

  // 2. enabled 체크
  if (!config.enabled) {
    return; // 쿠폰 발급 비활성화
  }

  // 3. 발급할 쿠폰 목록 결정 (multi_coupon=false이면 첫 번째만)
  const couponsToIssue = config.multi_coupon
    ? config.coupons
    : config.coupons.slice(0, 1);

  if (couponsToIssue.length === 0) {
    console.warn(`[Coupon] 발급할 쿠폰 없음: mall=${shop.mall_id}`);
    return;
  }

  // 4. platform_access_token 복호화
  if (!shop.platform_access_token) {
    console.error(`[Coupon] access_token 없음: mall=${shop.mall_id}`);
    return;
  }

  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[Coupon] 토큰 복호화 실패: mall=${shop.mall_id}`, err);
    return;
  }

  if (!tokens.access_token) {
    console.error(`[Coupon] 복호화된 access_token이 null: mall=${shop.mall_id}`);
    return;
  }

  let accessToken = tokens.access_token;

  // 5. 쿠폰 발급 (401 시 토큰 갱신 후 재시도)
  for (const coupon of couponsToIssue) {
    try {
      let result = await issueSingleCoupon(shop.mall_id, accessToken, coupon.coupon_no, memberId);

      // 401 전용: 토큰 만료 → 갱신 후 1회 재시도
      if (!result.ok && result.status === 401 && tokens.refresh_token) {
        const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
        if (newToken) {
          accessToken = newToken;
          result = await issueSingleCoupon(shop.mall_id, accessToken, coupon.coupon_no, memberId);
        }
      }

      if (result.ok) {
        console.info(
          `[Coupon] 발급 성공: mall=${shop.mall_id}, coupon_no=${coupon.coupon_no}, member=${memberId}`,
        );
      }
    } catch (err) {
      // 쿠폰 발급 실패해도 가입 플로우를 차단하지 않음
      console.error(
        `[Coupon] 예외 발생: mall=${shop.mall_id}, coupon_no=${coupon.coupon_no}, member=${memberId}`,
        err,
      );
    }
  }
}
