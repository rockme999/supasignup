/**
 * 쿠폰팩 서비스 — Plus 플랜 웰컴 쿠폰팩 (5장, ₩55,000 가치)
 *
 * 옵션 X — 카페24 자동 발급 이벤트 방식:
 *   issue_type='A', issue_sub_type='J', issue_member_join='T'
 *   카페24가 신규 회원 가입 시 자자체적으로 5장 발급 — 우리 호출 0
 *
 * 우리 책임:
 *   - registerCouponPack:   5개 쿠폰 사전 등록 (카페24 API POST /coupons)
 *   - unregisterCouponPack: 등록된 쿠폰 자동 발급 중지 (PUT /coupons/{no})
 *
 * 참고: 기존 coupon.ts의 auth·retry 패턴 그대로 따름.
 */

import type { Env, Shop } from '@supasignup/bg-core';
import { encrypt } from '@supasignup/bg-core';
import { Cafe24Client } from '@supasignup/cafe24-client';
import { decryptShopTokens } from '../db/queries';
import type { CouponConfig } from './coupon';

// ─── 상수 ────────────────────────────────────────────────────

const CAFE24_API_VERSION = '2026-03-01';

/** 쿠폰팩 5장 정의 (불변 — 운영자 편집 불가, Phase A) */
export const COUPON_PACK_DEFINITIONS = [
  { min_order: 3000,   discount: 3000,  label: '1' },
  { min_order: 50000,  discount: 5000,  label: '2' },
  { min_order: 70000,  discount: 7000,  label: '3' },
  { min_order: 100000, discount: 10000, label: '4' },
  { min_order: 200000, discount: 30000, label: '5' },
] as const;

// ─── 타입 ─────────────────────────────────────────────────────

/** coupon_config.pack.items 단건 */
export interface PackItem {
  min_order: number;
  discount: number;
  cafe24_coupon_no?: string;   // 등록 성공 후 채워짐 (카페24 coupon_no는 문자열)
}

/**
 * 쿠폰팩 상태 (3-state 모델)
 *
 * - 'active'        : 등록되어 자동 발급 활성 (issue_member_join='T')
 * - 'paused'        : Plus 만료/다운그레이드로 자동 정지 (issue_member_join='F')
 *                     → Plus 복귀 시 자동 재개 대상
 * - 'unregistered'  : 운영자가 명시적으로 OFF 또는 미등록
 *                     → 자동 재개 대상 아님
 */
export type CouponPackState = 'active' | 'paused' | 'unregistered';

/** coupon_config.pack 전체 */
export interface CouponPackConfig {
  /** @deprecated enabled 대신 state를 사용. 읽기 시 state로 변환. */
  enabled?: boolean;
  /** 진실 소스 (state가 없는 구 데이터는 enabled→state 변환으로 읽음) */
  state?: CouponPackState;
  registered_at: string | null;  // ISO 8601 — 마지막 등록 시각
  expire_days: number;           // 기본 30
  items: PackItem[];
}

/** registerCouponPack 반환 타입 */
export interface RegisterCouponPackResult {
  success: boolean;
  items: PackItem[];     // 등록 성공한 항목 (cafe24_coupon_no 포함)
  failures: PackItem[];  // 등록 실패한 항목
}

/** pauseCouponPack / resumeCouponPack 반환 타입 */
export interface ToggleCouponPackResult {
  success: boolean;
  failures: string[];  // 실패한 cafe24_coupon_no 목록
}

// ─── 내부 유틸 ───────────────────────────────────────────────

/**
 * 기존 CouponPackConfig에서 state를 읽는다.
 * state 필드가 없는 구 데이터는 enabled 값으로 변환:
 *   enabled=true  → 'active'
 *   enabled=false → 'unregistered'
 */
export function resolveCouponPackState(pack: CouponPackConfig): CouponPackState {
  if (pack.state) return pack.state;
  return pack.enabled ? 'active' : 'unregistered';
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────

/**
 * 카페24 Admin API로 웰컴팩 단건 쿠폰을 생성하고 coupon_no를 반환한다.
 * 자동 발급(issue_type='A', issue_sub_type='J') 트리거로 등록한다.
 */
async function createPackCoupon(
  mallId: string,
  accessToken: string,
  item: { min_order: number; discount: number; label: string },
  expireDays: number,
): Promise<{ coupon_no: string; status: number } | { ok: false; status: number; error: string }> {
  const formatKRW = (n: number) => n.toLocaleString('ko-KR');
  const couponName = `신규 가입 웰컴 쿠폰 ${item.label} - ${formatKRW(item.discount)}원 할인 (${formatKRW(item.min_order)}원 이상)`;

  const body = {
    shop_no: 1,
    request: {
      coupon_name: couponName,
      benefit_type: 'A',                    // A = 정액 할인
      discount_amount: {
        benefit_price: item.discount,        // 정수
      },
      available_period_type: 'R',           // R = 발급일로부터 N일 (자동발급이라 발급일 기준 필수)
      available_day_from_issued: expireDays, // 30일
      available_site: ['W', 'M'],
      available_scope: 'O',                 // O = 주문쿠폰
      available_amount_type: 'E',
      available_coupon_count_by_order: 1,
      available_price_type: 'O',            // O = 주문금액 기준
      available_min_price: item.min_order,  // 최소 주문 금액
      available_payment_method: ['all'],
      issue_type: 'A',                      // A = 자동 발급
      issue_sub_type: 'J',                  // J = 가입 시
      issue_member_join: 'T',               // 활성화
      issue_member_join_recommend: 'F',
      issue_member_join_type: 'N',          // N = 제한 없음
      issue_count_per_once: 1,
      issue_reserved: 'F',
      issue_order_date: 'F',
      send_sms_for_issue: 'F',
    },
  };

  let resp: Response;
  try {
    resp = await fetch(
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
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, status: 0, error: `fetch 오류: ${msg}` };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error(
      `[CouponPack] 쿠폰 생성 실패: mall=${mallId}, label=${item.label}, status=${resp.status}, detail=${text}`,
    );
    return { ok: false, status: resp.status, error: text };
  }

  const data = await resp.json() as { coupon?: { coupon_no: string | number } };
  const couponNo = data?.coupon?.coupon_no;
  if (!couponNo) {
    console.error(`[CouponPack] 쿠폰 생성 응답에 coupon_no 없음: mall=${mallId}, label=${item.label}`);
    return { ok: false, status: resp.status, error: 'coupon_no 없음' };
  }

  const couponNoStr = String(couponNo);
  console.info(
    `[CouponPack] 쿠폰 생성 성공: mall=${mallId}, label=${item.label}, coupon_no=${couponNoStr}`,
  );
  return { coupon_no: couponNoStr, status: resp.status };
}

/**
 * 등록된 쿠폰의 자동 발급을 일시 중지한다.
 * PUT /api/v2/admin/coupons/{coupon_no} + status=pause
 */
async function pausePackCoupon(
  mallId: string,
  accessToken: string,
  couponNo: string,
): Promise<{ ok: boolean; status: number }> {
  let resp: Response;
  try {
    resp = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': CAFE24_API_VERSION,
        },
        body: JSON.stringify({
          shop_no: 1,
          request: {
            status: 'pause',
            immediate_issue_pause: 'I',  // 즉시 발급 중지
          },
        }),
      },
    );
  } catch (err) {
    console.error(`[CouponPack] 쿠폰 일시정지 fetch 오류: mall=${mallId}, coupon_no=${couponNo}`, err);
    return { ok: false, status: 0 };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error(
      `[CouponPack] 쿠폰 일시정지 실패: mall=${mallId}, coupon_no=${couponNo}, status=${resp.status}, detail=${text}`,
    );
    return { ok: false, status: resp.status };
  }

  console.info(`[CouponPack] 쿠폰 일시정지 성공: mall=${mallId}, coupon_no=${couponNo}`);
  return { ok: true, status: resp.status };
}

/**
 * issue_member_join 값을 토글한다 (정지: 'F' / 재개: 'T').
 * PUT /api/v2/admin/coupons/{coupon_no}
 */
async function toggleMemberJoin(
  mallId: string,
  accessToken: string,
  couponNo: string,
  issueMemberJoin: 'T' | 'F',
): Promise<{ ok: boolean; status: number }> {
  let resp: Response;
  try {
    resp = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': CAFE24_API_VERSION,
        },
        body: JSON.stringify({
          shop_no: 1,
          request: { issue_member_join: issueMemberJoin },
        }),
      },
    );
  } catch (err) {
    console.error(
      `[CouponPack] issue_member_join 토글 fetch 오류: mall=${mallId}, coupon_no=${couponNo}`, err,
    );
    return { ok: false, status: 0 };
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error(
      `[CouponPack] issue_member_join 토글 실패: mall=${mallId}, coupon_no=${couponNo}, status=${resp.status}, detail=${text}`,
    );
    return { ok: false, status: resp.status };
  }

  console.info(
    `[CouponPack] issue_member_join=${issueMemberJoin} 토글 성공: mall=${mallId}, coupon_no=${couponNo}`,
  );
  return { ok: true, status: resp.status };
}

/** 토큰 갱신 + DB 저장 (coupon.ts의 refreshAndSaveToken과 동일 패턴) */
async function refreshAndSaveToken(
  env: Env,
  shop: Shop,
  refreshToken: string,
): Promise<string | null> {
  try {
    const client = new Cafe24Client(env.CAFE24_CLIENT_ID, env.CAFE24_CLIENT_SECRET);
    const newTokens = await client.refreshToken(shop.mall_id, refreshToken);

    const encAt = await encrypt(newTokens.access_token, env.ENCRYPTION_KEY);
    const encRt = await encrypt(newTokens.refresh_token, env.ENCRYPTION_KEY);
    await env.DB
      .prepare(
        "UPDATE shops SET platform_access_token = ?, platform_refresh_token = ?, updated_at = datetime('now') WHERE shop_id = ?",
      )
      .bind(encAt, encRt, shop.shop_id)
      .run();

    console.info(`[CouponPack] 토큰 갱신 성공: mall=${shop.mall_id}`);
    return newTokens.access_token;
  } catch (err) {
    console.error(`[CouponPack] 토큰 갱신 실패: mall=${shop.mall_id}`, err);
    return null;
  }
}

// ─── 공개 함수 ───────────────────────────────────────────────

/**
 * Plus 웰컴 쿠폰팩 5장을 카페24에 등록한다 (자동 발급 트리거).
 *
 * - 각 쿠폰을 순차 직렬 호출 (병렬은 token 갱신 레이스 위험)
 * - 401 시 토큰 갱신 후 1회 재시도
 * - 부분 실패 허용: 성공한 것만 items, 실패한 것은 failures에 반환
 * - 호출 후 coupon_config.pack 업데이트 + KV 캐시 무효화는 **호출부 책임**
 *
 * @param env  Cloudflare Workers 환경 바인딩
 * @param shop 대상 shop 레코드 (plan === 'plus' 검증은 호출부 책임)
 * @returns    { success, items, failures }
 */
export async function registerCouponPack(
  env: Env,
  shop: Shop,
): Promise<RegisterCouponPackResult> {
  if (!shop.platform_access_token) {
    console.error(`[CouponPack] access_token 없음: mall=${shop.mall_id}`);
    return {
      success: false,
      items: [],
      failures: COUPON_PACK_DEFINITIONS.map(d => ({ min_order: d.min_order, discount: d.discount })),
    };
  }

  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[CouponPack] 토큰 복호화 실패: mall=${shop.mall_id}`, err);
    return {
      success: false,
      items: [],
      failures: COUPON_PACK_DEFINITIONS.map(d => ({ min_order: d.min_order, discount: d.discount })),
    };
  }

  if (!tokens.access_token) {
    console.error(`[CouponPack] 복호화된 access_token이 null: mall=${shop.mall_id}`);
    return {
      success: false,
      items: [],
      failures: COUPON_PACK_DEFINITIONS.map(d => ({ min_order: d.min_order, discount: d.discount })),
    };
  }

  let accessToken = tokens.access_token;

  // 기존 pack config 파싱 (재시도 시 이미 등록된 항목 스킵)
  let existingPack: CouponPackConfig | null = null;
  if (shop.coupon_config) {
    try {
      const config = JSON.parse(shop.coupon_config) as CouponConfig & { pack?: CouponPackConfig };
      existingPack = config.pack ?? null;
    } catch { /* 무시 */ }
  }

  const expireDays = existingPack?.expire_days ?? 30;

  const successItems: PackItem[] = [];
  const failureItems: PackItem[] = [];

  // 5개 쿠폰 순차 직렬 등록
  for (const def of COUPON_PACK_DEFINITIONS) {
    // 이미 등록된 항목은 스킵 (재시도 안전성)
    const existing = existingPack?.items?.find(
      i => i.min_order === def.min_order && i.discount === def.discount && i.cafe24_coupon_no,
    );
    if (existing?.cafe24_coupon_no) {
      console.info(
        `[CouponPack] 이미 등록됨, 스킵: mall=${shop.mall_id}, label=${def.label}, coupon_no=${existing.cafe24_coupon_no}`,
      );
      successItems.push({ min_order: def.min_order, discount: def.discount, cafe24_coupon_no: existing.cafe24_coupon_no });
      continue;
    }

    let result = await createPackCoupon(shop.mall_id, accessToken, def, expireDays);

    // 401: 토큰 갱신 후 1회 재시도
    if ('ok' in result && !result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await createPackCoupon(shop.mall_id, accessToken, def, expireDays);
      }
    }

    if ('coupon_no' in result) {
      successItems.push({ min_order: def.min_order, discount: def.discount, cafe24_coupon_no: result.coupon_no });
    } else {
      failureItems.push({ min_order: def.min_order, discount: def.discount });
      // audit_logs에 실패 기록
      try {
        await env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 'coupon_pack_register_fail', 'shop', ?, ?, datetime('now'))",
        ).bind(
          crypto.randomUUID(),
          shop.owner_id,
          shop.shop_id,
          JSON.stringify({ min_order: def.min_order, discount: def.discount, error: 'ok' in result ? result.error : '' }),
        ).run();
      } catch (err) {
        console.error(`[CouponPack] audit_log 저장 실패: mall=${shop.mall_id}`, err);
      }
    }
  }

  const success = failureItems.length === 0;
  console.info(
    `[CouponPack] 등록 완료: mall=${shop.mall_id}, 성공=${successItems.length}, 실패=${failureItems.length}`,
  );

  return { success, items: successItems, failures: failureItems };
}

/**
 * Plus 플랜 만료/다운그레이드 시 쿠폰팩 자동 발급을 정지한다.
 *
 * 정지 방식 (A): issue_member_join을 'T' → 'F'로 토글만.
 * 카페24 쿠폰 자체(cafe24_coupon_no)는 보존 — 재개 시 'T'로 토글하면 즉시 부활.
 *
 * - state: 'active' → 'paused' 갱신
 * - state가 이미 'paused'이거나 'unregistered'면 no-op
 * - coupon_config 업데이트는 **호출부 책임**
 * - 부분 실패: audit_logs에 'coupon_pack_pause_fail' 기록
 *
 * @returns { success, failures: 실패한 coupon_no 목록 }
 */
export async function pauseCouponPack(
  env: Env,
  shop: Shop,
): Promise<ToggleCouponPackResult> {
  // 현재 state 확인
  let pack: CouponPackConfig | null = null;
  if (shop.coupon_config) {
    try {
      const config = JSON.parse(shop.coupon_config) as { pack?: CouponPackConfig };
      pack = config.pack ?? null;
    } catch { /* 무시 */ }
  }

  if (!pack) {
    console.info(`[CouponPack] pack 없음, 정지 스킵: mall=${shop.mall_id}`);
    return { success: true, failures: [] };
  }

  const currentState = resolveCouponPackState(pack);
  if (currentState !== 'active') {
    console.info(
      `[CouponPack] state=${currentState}, 정지 스킵 (active 아님): mall=${shop.mall_id}`,
    );
    return { success: true, failures: [] };
  }

  const couponNos = (pack.items ?? [])
    .map(i => i.cafe24_coupon_no)
    .filter((n): n is string => !!n);

  if (couponNos.length === 0) {
    console.info(`[CouponPack] 등록된 coupon_no 없음, 정지 스킵: mall=${shop.mall_id}`);
    return { success: true, failures: [] };
  }

  if (!shop.platform_access_token) {
    console.error(`[CouponPack] access_token 없음 (정지): mall=${shop.mall_id}`);
    return { success: false, failures: couponNos };
  }

  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[CouponPack] 토큰 복호화 실패 (정지): mall=${shop.mall_id}`, err);
    return { success: false, failures: couponNos };
  }

  if (!tokens.access_token) {
    console.error(`[CouponPack] 복호화된 access_token이 null (정지): mall=${shop.mall_id}`);
    return { success: false, failures: couponNos };
  }

  let accessToken = tokens.access_token;
  const failedNos: string[] = [];

  for (const couponNo of couponNos) {
    let result = await toggleMemberJoin(shop.mall_id, accessToken, couponNo, 'F');

    if (!result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await toggleMemberJoin(shop.mall_id, accessToken, couponNo, 'F');
      }
    }

    if (!result.ok) {
      failedNos.push(couponNo);
      try {
        await env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 'coupon_pack_pause_fail', 'shop', ?, ?, datetime('now'))",
        ).bind(
          crypto.randomUUID(),
          shop.owner_id,
          shop.shop_id,
          JSON.stringify({ coupon_no: couponNo, status: result.status }),
        ).run();
      } catch (err) {
        console.error(`[CouponPack] audit_log 저장 실패 (정지): mall=${shop.mall_id}`, err);
      }
    }
  }

  console.info(
    `[CouponPack] 정지 완료: mall=${shop.mall_id}, 성공=${couponNos.length - failedNos.length}, 실패=${failedNos.length}`,
  );
  return { success: failedNos.length === 0, failures: failedNos };
}

/**
 * Plus 플랜 복귀 시 쿠폰팩 자동 발급을 재개한다.
 *
 * 재개 방식 (X): issue_member_join을 'F' → 'T'로 토글.
 * state가 'unregistered'(운영자 명시적 OFF)면 no-op.
 * state가 'paused'인 경우에만 재개.
 *
 * - state: 'paused' → 'active' 갱신
 * - coupon_config 업데이트는 **호출부 책임**
 * - 부분 실패: audit_logs에 'coupon_pack_resume_fail' 기록
 *
 * @returns { success, failures: 실패한 coupon_no 목록 }
 */
export async function resumeCouponPack(
  env: Env,
  shop: Shop,
): Promise<ToggleCouponPackResult> {
  let pack: CouponPackConfig | null = null;
  if (shop.coupon_config) {
    try {
      const config = JSON.parse(shop.coupon_config) as { pack?: CouponPackConfig };
      pack = config.pack ?? null;
    } catch { /* 무시 */ }
  }

  if (!pack) {
    console.info(`[CouponPack] pack 없음, 재개 스킵: mall=${shop.mall_id}`);
    return { success: true, failures: [] };
  }

  const currentState = resolveCouponPackState(pack);
  if (currentState === 'unregistered') {
    // 운영자가 명시적으로 OFF한 경우 — 자동 재개 대상 아님
    console.info(
      `[CouponPack] state=unregistered, 재개 스킵 (운영자 명시 OFF): mall=${shop.mall_id}`,
    );
    return { success: true, failures: [] };
  }

  if (currentState !== 'paused') {
    console.info(
      `[CouponPack] state=${currentState}, 재개 스킵 (paused 아님): mall=${shop.mall_id}`,
    );
    return { success: true, failures: [] };
  }

  const couponNos = (pack.items ?? [])
    .map(i => i.cafe24_coupon_no)
    .filter((n): n is string => !!n);

  if (couponNos.length === 0) {
    console.info(`[CouponPack] 등록된 coupon_no 없음, 재개 스킵: mall=${shop.mall_id}`);
    return { success: true, failures: [] };
  }

  if (!shop.platform_access_token) {
    console.error(`[CouponPack] access_token 없음 (재개): mall=${shop.mall_id}`);
    return { success: false, failures: couponNos };
  }

  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[CouponPack] 토큰 복호화 실패 (재개): mall=${shop.mall_id}`, err);
    return { success: false, failures: couponNos };
  }

  if (!tokens.access_token) {
    console.error(`[CouponPack] 복호화된 access_token이 null (재개): mall=${shop.mall_id}`);
    return { success: false, failures: couponNos };
  }

  let accessToken = tokens.access_token;
  const failedNos: string[] = [];

  for (const couponNo of couponNos) {
    let result = await toggleMemberJoin(shop.mall_id, accessToken, couponNo, 'T');

    if (!result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await toggleMemberJoin(shop.mall_id, accessToken, couponNo, 'T');
      }
    }

    if (!result.ok) {
      failedNos.push(couponNo);
      try {
        await env.DB.prepare(
          "INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?, ?, 'coupon_pack_resume_fail', 'shop', ?, ?, datetime('now'))",
        ).bind(
          crypto.randomUUID(),
          shop.owner_id,
          shop.shop_id,
          JSON.stringify({ coupon_no: couponNo, status: result.status }),
        ).run();
      } catch (err) {
        console.error(`[CouponPack] audit_log 저장 실패 (재개): mall=${shop.mall_id}`, err);
      }
    }
  }

  console.info(
    `[CouponPack] 재개 완료: mall=${shop.mall_id}, 성공=${couponNos.length - failedNos.length}, 실패=${failedNos.length}`,
  );
  return { success: failedNos.length === 0, failures: failedNos };
}

/**
 * Plus 웰컴 쿠폰팩 자동 발급을 중지한다.
 *
 * - coupon_config.pack.items에서 cafe24_coupon_no 추출
 * - 각 쿠폰 일시 중지 (PUT + status=pause)
 * - coupon_config.pack.enabled = false 업데이트는 **호출부 책임**
 * - 일부 중지 실패해도 예외를 던지지 않음 (로그만)
 *
 * @param env  Cloudflare Workers 환경 바인딩
 * @param shop 대상 shop 레코드 (coupon_config.pack.items 포함)
 */
export async function unregisterCouponPack(
  env: Env,
  shop: Shop,
): Promise<void> {
  if (!shop.coupon_config) {
    console.info(`[CouponPack] coupon_config 없음, 해제 스킵: mall=${shop.mall_id}`);
    return;
  }

  let pack: CouponPackConfig | null = null;
  try {
    const config = JSON.parse(shop.coupon_config) as CouponConfig & { pack?: CouponPackConfig };
    pack = config.pack ?? null;
  } catch {
    console.error(`[CouponPack] coupon_config JSON 파싱 실패: mall=${shop.mall_id}`);
    return;
  }

  if (!pack?.items?.length) {
    console.info(`[CouponPack] pack.items 없음, 해제 스킵: mall=${shop.mall_id}`);
    return;
  }

  const couponNos = pack.items.map(i => i.cafe24_coupon_no).filter((n): n is string => !!n);
  if (couponNos.length === 0) {
    console.info(`[CouponPack] 등록된 coupon_no 없음, 해제 스킵: mall=${shop.mall_id}`);
    return;
  }

  if (!shop.platform_access_token) {
    console.error(`[CouponPack] access_token 없음 (해제): mall=${shop.mall_id}`);
    return;
  }

  let tokens: { access_token: string | null; refresh_token: string | null };
  try {
    tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  } catch (err) {
    console.error(`[CouponPack] 토큰 복호화 실패 (해제): mall=${shop.mall_id}`, err);
    return;
  }

  if (!tokens.access_token) {
    console.error(`[CouponPack] 복호화된 access_token이 null (해제): mall=${shop.mall_id}`);
    return;
  }

  let accessToken = tokens.access_token;

  for (const couponNo of couponNos) {
    let result = await pausePackCoupon(shop.mall_id, accessToken, couponNo);

    // 401: 토큰 갱신 후 1회 재시도
    if (!result.ok && result.status === 401 && tokens.refresh_token) {
      const newToken = await refreshAndSaveToken(env, shop, tokens.refresh_token);
      if (newToken) {
        accessToken = newToken;
        result = await pausePackCoupon(shop.mall_id, accessToken, couponNo);
      }
    }

    if (!result.ok) {
      console.error(
        `[CouponPack] 쿠폰 중지 실패 (계속 진행): mall=${shop.mall_id}, coupon_no=${couponNo}`,
      );
    }
  }
}
