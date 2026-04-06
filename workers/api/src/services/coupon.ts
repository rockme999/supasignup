/**
 * 쿠폰 서비스 — 가입 시 카페24 쿠폰 자동 발급 + 쿠폰 설정 기반 쿠폰 자동 생성.
 *
 * 카페24 쿠폰 발급 API:
 *   POST https://{mall_id}.cafe24api.com/api/v2/admin/coupons/{coupon_no}/issues
 *
 * 카페24 쿠폰 생성 API:
 *   POST https://{mall_id}.cafe24api.com/api/v2/admin/coupons
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
  shipping: {
    enabled: boolean;
    expire_days: number;       // 기본 30
  };
  amount: {
    enabled: boolean;
    expire_days: number;       // 기본 30
    discount_amount: number;   // 기본 3000
    min_order: number;         // 기본 0 (없음)
  };
  rate: {
    enabled: boolean;
    expire_days: number;       // 기본 7
    discount_rate: number;     // 기본 10
    min_order: number;         // 기본 0 (없음)
  };
  // 카페24에 생성된 쿠폰 번호 매핑 (생성 후 저장)
  cafe24_coupons?: {
    shipping_coupon_no?: number;
    amount_coupon_no?: number;
    rate_coupon_no?: number;
  };
}

export const DEFAULT_COUPON_CONFIG: CouponConfig = {
  shipping: { enabled: false, expire_days: 30 },
  amount: { enabled: true, expire_days: 30, discount_amount: 3000, min_order: 0 },
  rate: { enabled: false, expire_days: 7, discount_rate: 10, min_order: 0 },
};

// ─── 카페24 쿠폰 생성 ─────────────────────────────────────────

type CouponType = 'shipping' | 'amount' | 'rate';

interface CreateCouponParams {
  type: CouponType;
  expire_days: number;
  discount_amount?: number;   // type === 'amount' 일 때 필수
  discount_rate?: number;     // type === 'rate' 일 때 필수
  min_order?: number;         // 0이면 무제한
}

/**
 * 카페24 Admin API로 쿠폰을 생성하고 coupon_no를 반환한다.
 *
 * @returns coupon_no if successful, null otherwise
 */
async function createCafe24Coupon(
  mallId: string,
  accessToken: string,
  params: CreateCouponParams,
): Promise<{ coupon_no: number; status: number } | { ok: false; status: number }> {
  const { type, expire_days, discount_amount, discount_rate, min_order } = params;

  const couponName = type === 'shipping'
    ? '번개가입 무료배송 쿠폰'
    : type === 'amount'
      ? `번개가입 ${(discount_amount ?? 0).toLocaleString()}원 할인쿠폰`
      : `번개가입 ${discount_rate ?? 0}% 할인쿠폰`;

  const benefitText = type === 'shipping'
    ? '무료배송'
    : type === 'amount'
      ? `${(discount_amount ?? 0).toLocaleString()}원 할인`
      : `${discount_rate ?? 0}% 할인`;

  const discountFields = type === 'shipping'
    ? { discount_type: 'F' }
    : type === 'amount'
      ? {
          discount_type: 'D',
          discount_amount: {
            benefit_price: String(discount_amount ?? 0),
          },
        }
      : {
          discount_type: 'R',
          discount_rate: {
            benefit_percentage: String(discount_rate ?? 0),
            benefit_percentage_round_unit: '10',
          },
        };

  const minOrderFields = (min_order ?? 0) > 0
    ? { available_price_type: 'O', available_min_price: String(min_order) }
    : { available_price_type: 'U' };

  const body = {
    shop_no: 1,
    request: {
      coupon_name: couponName,
      coupon_type: 'O',
      benefit_text: benefitText,
      issue_type: 'M',
      available_period_type: 'F',
      available_period_days_from_issue: expire_days,
      available_site: ['W', 'M'],
      ...discountFields,
      ...minOrderFields,
    },
  };

  const resp = await fetch(
    `https://${mallId}.cafe24api.com/api/v2/admin/coupons`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': CAFE24_API_VERSION,
      },
      body: JSON.stringify(body),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    console.error(
      `[Coupon] 쿠폰 생성 실패: mall=${mallId}, name=${couponName}, status=${resp.status}, detail=${text}`,
    );
    return { ok: false, status: resp.status };
  }

  const data = await resp.json() as { coupon?: { coupon_no: number } };
  const couponNo = data?.coupon?.coupon_no;
  if (!couponNo) {
    console.error(`[Coupon] 쿠폰 생성 응답에 coupon_no 없음: mall=${mallId}`);
    return { ok: false, status: resp.status };
  }

  console.info(`[Coupon] 쿠폰 생성 성공: mall=${mallId}, name=${couponName}, coupon_no=${couponNo}`);
  return { coupon_no: couponNo, status: resp.status };
}

// ─── 쿠폰 설정 → 카페24 쿠폰 동기화 ────────────────────────

/**
 * coupon_config에서 enabled된 쿠폰들을 카페24에 생성하고
 * coupon_no를 cafe24_coupons에 저장한다.
 *
 * - 이미 coupon_no가 있으면 중복 생성하지 않음
 * - 401 발생 시 토큰 갱신 후 1회 재시도
 * - 쿠폰 생성 후 coupon_config 업데이트 + KV 캐시 무효화
 * - 실패해도 에러 로그만 남기고 예외를 던지지 않음
 */
export async function syncCouponConfig(env: Env, shop: Shop): Promise<void> {
  // 1. platform_access_token 확인
  if (!shop.platform_access_token) {
    console.info(`[CouponSync] platform_access_token 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  // 2. coupon_config 파싱
  let config: CouponConfig;
  if (shop.coupon_config) {
    try {
      config = JSON.parse(shop.coupon_config as string) as CouponConfig;
    } catch {
      console.error(`[CouponSync] coupon_config JSON 파싱 실패: mall=${shop.mall_id}`);
      return;
    }
  } else {
    config = { ...DEFAULT_COUPON_CONFIG };
  }

  // 3. enabled된 쿠폰 중 coupon_no가 없는 것만 생성 대상
  const cafe24 = config.cafe24_coupons ?? {};
  const needsCreate = {
    shipping: config.shipping.enabled && !cafe24.shipping_coupon_no,
    amount: config.amount.enabled && !cafe24.amount_coupon_no,
    rate: config.rate.enabled && !cafe24.rate_coupon_no,
  };

  if (!needsCreate.shipping && !needsCreate.amount && !needsCreate.rate) {
    console.info(`[CouponSync] 생성할 쿠폰 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  // 4. 토큰 복호화
  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[CouponSync] 토큰 복호화 실패: mall=${shop.mall_id}`, err);
    return;
  }

  if (!tokens.access_token) {
    console.error(`[CouponSync] 복호화된 access_token이 null: mall=${shop.mall_id}`);
    return;
  }

  let accessToken = tokens.access_token;
  let configChanged = false;

  // 5. 각 쿠폰 타입별로 생성
  const couponTasks: { key: 'shipping' | 'amount' | 'rate'; params: CreateCouponParams }[] = [];

  if (needsCreate.shipping) {
    couponTasks.push({
      key: 'shipping',
      params: { type: 'shipping', expire_days: config.shipping.expire_days },
    });
  }
  if (needsCreate.amount) {
    couponTasks.push({
      key: 'amount',
      params: {
        type: 'amount',
        expire_days: config.amount.expire_days,
        discount_amount: config.amount.discount_amount,
        min_order: config.amount.min_order,
      },
    });
  }
  if (needsCreate.rate) {
    couponTasks.push({
      key: 'rate',
      params: {
        type: 'rate',
        expire_days: config.rate.expire_days,
        discount_rate: config.rate.discount_rate,
        min_order: config.rate.min_order,
      },
    });
  }

  for (const task of couponTasks) {
    let result = await createCafe24Coupon(shop.mall_id, accessToken, task.params);

    // 401: 토큰 갱신 후 1회 재시도
    if ('ok' in result && !result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await createCafe24Coupon(shop.mall_id, accessToken, task.params);
      }
    }

    if ('coupon_no' in result) {
      if (!config.cafe24_coupons) config.cafe24_coupons = {};
      if (task.key === 'shipping') config.cafe24_coupons.shipping_coupon_no = result.coupon_no;
      if (task.key === 'amount') config.cafe24_coupons.amount_coupon_no = result.coupon_no;
      if (task.key === 'rate') config.cafe24_coupons.rate_coupon_no = result.coupon_no;
      configChanged = true;
    }
  }

  // 6. coupon_config 업데이트 + KV 캐시 무효화
  if (configChanged) {
    try {
      await env.DB
        .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(JSON.stringify(config), shop.shop_id)
        .run();

      // KV 캐시 무효화
      await env.KV.delete(`widget_config:${shop.client_id}`);

      console.info(`[CouponSync] coupon_config 업데이트 완료: mall=${shop.mall_id}`);
    } catch (err) {
      console.error(`[CouponSync] coupon_config 저장 실패: mall=${shop.mall_id}`, err);
    }
  }
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
 * - coupon_config가 null이면 스킵
 * - enabled된 쿠폰의 cafe24_coupons에서 coupon_no를 읽어 발급
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

  // 2. 발급할 coupon_no 목록 수집 (enabled + cafe24_coupons에 번호 있는 것만)
  const isFree = shop.plan === 'free';
  const cafe24 = config.cafe24_coupons ?? {};
  const couponNos: number[] = [];

  if (config.shipping.enabled && cafe24.shipping_coupon_no) {
    couponNos.push(cafe24.shipping_coupon_no);
  }
  if (config.amount.enabled && cafe24.amount_coupon_no) {
    couponNos.push(cafe24.amount_coupon_no);
  }
  // 정률할인: Plus 전용
  if (!isFree && config.rate.enabled && cafe24.rate_coupon_no) {
    couponNos.push(cafe24.rate_coupon_no);
  }

  // 무료 플랜: 1개만 발급
  const issuableNos = isFree ? couponNos.slice(0, 1) : couponNos;

  if (issuableNos.length === 0) {
    console.warn(`[Coupon] 발급할 쿠폰 없음: mall=${shop.mall_id}`);
    return;
  }

  // 3. platform_access_token 복호화
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

  // 4. 쿠폰 발급 (401 시 토큰 갱신 후 재시도)
  for (const couponNo of issuableNos) {
    try {
      let result = await issueSingleCoupon(shop.mall_id, accessToken, couponNo, memberId);

      // 401 전용: 토큰 만료 → 갱신 후 1회 재시도
      if (!result.ok && result.status === 401 && tokens.refresh_token) {
        const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
        if (newToken) {
          accessToken = newToken;
          result = await issueSingleCoupon(shop.mall_id, accessToken, couponNo, memberId);
        }
      }

      if (result.ok) {
        // 쿠폰 타입 결정
        let couponType = 'unknown';
        if (cafe24.shipping_coupon_no === couponNo) couponType = 'shipping';
        else if (cafe24.amount_coupon_no === couponNo) couponType = 'amount';
        else if (cafe24.rate_coupon_no === couponNo) couponType = 'rate';

        // DB에 발급 기록 저장
        try {
          await env.DB.prepare(
            'INSERT INTO coupon_issues (shop_id, member_id, coupon_type, coupon_no) VALUES (?, ?, ?, ?)',
          ).bind(shop.shop_id, memberId, couponType, couponNo).run();
        } catch (err) {
          console.error(`[Coupon] 발급 기록 저장 실패: mall=${shop.mall_id}, member=${memberId}`, err);
        }

        console.info(
          `[Coupon] 발급 성공: mall=${shop.mall_id}, coupon_no=${couponNo}, member=${memberId}`,
        );
      }
    } catch (err) {
      // 쿠폰 발급 실패해도 가입 플로우를 차단하지 않음
      console.error(
        `[Coupon] 예외 발생: mall=${shop.mall_id}, coupon_no=${couponNo}, member=${memberId}`,
        err,
      );
    }
  }
}
