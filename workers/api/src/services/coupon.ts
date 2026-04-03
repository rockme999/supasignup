/**
 * 쿠폰 서비스 — 가입 시 카페24 쿠폰 자동 발급 + 혜택 기반 쿠폰 자동 생성.
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
  enabled: boolean;
  coupons: CouponItem[];
  multi_coupon: boolean;
}

export interface CouponItem {
  coupon_no: number;
  coupon_name?: string;
  benefit_type?: string;   // 'D' = 정액, 'R' = 정률
  discount_amount?: number;
  discount_rate?: number;
  benefit_text?: string;   // 원본 혜택 텍스트 (중복 생성 방지용)
  min_order?: number;
  expire_days?: number;
}

// ─── 혜택 텍스트 파싱 결과 ────────────────────────────────────

interface ParsedBenefit {
  type: 'amount' | 'rate';
  value: number;           // 정액: 원 단위 (3000), 정률: 퍼센트 (10)
  namePrefix?: string;     // '첫 구매' 등 prefix
  benefitText: string;     // 원본 텍스트
}

/**
 * 혜택 텍스트에서 쿠폰 생성에 필요한 정보를 파싱한다.
 *
 * 파싱 가능한 패턴:
 *   "3,000원 할인 쿠폰 즉시 지급" → { type: 'amount', value: 3000 }
 *   "10% 할인 쿠폰 즉시 지급"    → { type: 'rate',   value: 10 }
 *   "첫 구매 10% 추가 할인"      → { type: 'rate',   value: 10, namePrefix: '첫 구매' }
 *
 * 쿠폰이 아닌 항목(적립금, 생일 쿠폰 등)은 null 반환.
 */
export function parseBenefitText(text: string): ParsedBenefit | null {
  if (!text) return null;

  const trimmed = text.trim();

  // 정액 쿠폰: "X,000원 할인 쿠폰 즉시 지급"
  const amountMatch = trimmed.match(/^([\d,]+)원\s+할인\s*쿠폰/);
  if (amountMatch) {
    const value = parseInt(amountMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(value) && value > 0) {
      return { type: 'amount', value, benefitText: trimmed };
    }
  }

  // 정률 쿠폰: "X% 할인 쿠폰 즉시 지급"
  const rateMatch = trimmed.match(/^(\d+)%\s+할인\s*쿠폰/);
  if (rateMatch) {
    const value = parseInt(rateMatch[1], 10);
    if (!isNaN(value) && value > 0 && value <= 100) {
      return { type: 'rate', value, benefitText: trimmed };
    }
  }

  // 첫 구매 정률 쿠폰: "첫 구매 X% 추가 할인"
  const firstPurchaseMatch = trimmed.match(/^(첫\s*구매)\s+(\d+)%\s+추가\s*할인/);
  if (firstPurchaseMatch) {
    const value = parseInt(firstPurchaseMatch[2], 10);
    if (!isNaN(value) && value > 0 && value <= 100) {
      return { type: 'rate', value, namePrefix: '첫 구매', benefitText: trimmed };
    }
  }

  // 쿠폰이 아닌 항목 (적립금, 생일 쿠폰 등) → null
  return null;
}

// ─── 카페24 쿠폰 생성 ─────────────────────────────────────────

/**
 * 카페24 Admin API로 쿠폰을 생성하고 coupon_no를 반환한다.
 *
 * @returns coupon_no if successful, null otherwise
 */
async function createCafe24Coupon(
  mallId: string,
  accessToken: string,
  parsed: ParsedBenefit,
): Promise<{ coupon_no: number; status: number } | { ok: false; status: number }> {
  const couponName = parsed.namePrefix
    ? `번개가입 ${parsed.namePrefix} ${parsed.type === 'amount' ? parsed.value.toLocaleString() + '원' : parsed.value + '%'} 할인쿠폰`
    : `번개가입 ${parsed.type === 'amount' ? parsed.value.toLocaleString() + '원' : parsed.value + '%'} 할인쿠폰`;

  const benefitText = parsed.type === 'amount'
    ? `${parsed.value.toLocaleString()}원 할인`
    : `${parsed.value}% 할인`;

  const discountFields = parsed.type === 'amount'
    ? {
        discount_type: 'D',
        discount_amount: {
          benefit_price: String(parsed.value),
        },
      }
    : {
        discount_type: 'R',
        discount_rate: {
          benefit_percentage: String(parsed.value),
          benefit_percentage_round_unit: '10',
        },
      };

  const body = {
    shop_no: 1,
    request: {
      coupon_name: couponName,
      coupon_type: 'O',
      benefit_text: benefitText,
      issue_type: 'M',
      available_period_type: 'F',
      available_period_days_from_issue: 30,
      available_site: ['W', 'M'],
      ...discountFields,
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

// ─── 혜택 → 쿠폰 동기화 ──────────────────────────────────────

/**
 * shop_identity의 coupon_benefit + extra_benefits에서 자동 발급 가능한 항목을 파싱하여
 * 카페24에 쿠폰을 자동 생성하고 coupon_config에 저장한다.
 *
 * - 이미 동일 benefit_text의 쿠폰이 coupon_config에 있으면 중복 생성하지 않음
 * - 401 발생 시 토큰 갱신 후 1회 재시도
 * - 쿠폰 생성 후 coupon_config 업데이트 + KV 캐시 무효화
 * - 실패해도 에러 로그만 남기고 예외를 던지지 않음
 */
export async function syncBenefitsToCoupons(env: Env, shop: Shop): Promise<void> {
  // 1. platform_access_token 확인
  if (!shop.platform_access_token) {
    console.info(`[CouponSync] platform_access_token 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  // 2. shop_identity 파싱
  if (!shop.shop_identity) {
    console.info(`[CouponSync] shop_identity 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  let identity: Record<string, unknown>;
  try {
    identity = JSON.parse(shop.shop_identity as string) as Record<string, unknown>;
  } catch {
    console.error(`[CouponSync] shop_identity JSON 파싱 실패: mall=${shop.mall_id}`);
    return;
  }

  // 3. 혜택 텍스트 수집 (coupon_benefit + extra_benefits)
  const benefitTexts: string[] = [];
  if (typeof identity.coupon_benefit === 'string' && identity.coupon_benefit) {
    benefitTexts.push(identity.coupon_benefit);
  }
  if (Array.isArray(identity.extra_benefits)) {
    for (const b of identity.extra_benefits) {
      if (typeof b === 'string' && b) benefitTexts.push(b);
    }
  }

  if (benefitTexts.length === 0) {
    console.info(`[CouponSync] 혜택 텍스트 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  // 4. 파싱 가능한 쿠폰 항목만 필터링
  const parsedBenefits = benefitTexts
    .map((t) => parseBenefitText(t))
    .filter((p): p is ParsedBenefit => p !== null);

  if (parsedBenefits.length === 0) {
    console.info(`[CouponSync] 자동 생성 가능한 쿠폰 없음, 스킵: mall=${shop.mall_id}`);
    return;
  }

  // 5. 기존 coupon_config 파싱 (중복 방지용)
  let config: CouponConfig = { enabled: true, coupons: [], multi_coupon: false };
  if (shop.coupon_config) {
    try {
      config = JSON.parse(shop.coupon_config) as CouponConfig;
    } catch {
      // 파싱 실패 시 기본값 사용
    }
  }

  // 이미 저장된 benefit_text 목록
  const existingBenefitTexts = new Set(
    config.coupons
      .map((c) => c.benefit_text)
      .filter((t): t is string => typeof t === 'string'),
  );

  // 6. 토큰 복호화
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

  // 7. 각 혜택에 대해 쿠폰 생성 (중복 건너뜀)
  for (const parsed of parsedBenefits) {
    if (existingBenefitTexts.has(parsed.benefitText)) {
      console.info(`[CouponSync] 이미 존재, 스킵: mall=${shop.mall_id}, benefit="${parsed.benefitText}"`);
      continue;
    }

    let result = await createCafe24Coupon(shop.mall_id, accessToken, parsed);

    // 401: 토큰 갱신 후 1회 재시도
    if ('ok' in result && !result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await createCafe24Coupon(shop.mall_id, accessToken, parsed);
      }
    }

    if ('coupon_no' in result) {
      const couponName = parsed.namePrefix
        ? `번개가입 ${parsed.namePrefix} ${parsed.type === 'amount' ? parsed.value.toLocaleString() + '원' : parsed.value + '%'} 할인쿠폰`
        : `번개가입 ${parsed.type === 'amount' ? parsed.value.toLocaleString() + '원' : parsed.value + '%'} 할인쿠폰`;

      config.coupons.push({
        coupon_no: result.coupon_no,
        coupon_name: couponName,
        benefit_type: parsed.type === 'amount' ? 'D' : 'R',
        discount_amount: parsed.type === 'amount' ? parsed.value : undefined,
        discount_rate: parsed.type === 'rate' ? parsed.value : undefined,
        benefit_text: parsed.benefitText,
        expire_days: 30,
      });
      existingBenefitTexts.add(parsed.benefitText);
      configChanged = true;
    }
  }

  // 8. coupon_config 업데이트 + KV 캐시 무효화
  if (configChanged) {
    config.enabled = true;
    try {
      await env.DB
        .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
        .bind(JSON.stringify(config), shop.shop_id)
        .run();

      // KV 캐시 무효화
      await env.KV.delete(`widget_config:${shop.client_id}`);

      console.info(`[CouponSync] coupon_config 업데이트 완료: mall=${shop.mall_id}, 추가된 쿠폰=${config.coupons.length}개`);
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
