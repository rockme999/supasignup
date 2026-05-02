/**
 * 개발/테스트용 엔드포인트 — 프로덕션에서는 비활성화할 것.
 *
 * GET /test/store-info?mall_id=<mall_id>
 *   - DB에서 해당 mall_id의 access_token을 복호화하여
 *     카페24 Admin API 3개를 호출하고 응답을 JSON으로 반환.
 *   - 토큰 만료 시 자동 갱신 후 재시도.
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { encrypt } from '@supasignup/bg-core';
import { Cafe24Client } from '@supasignup/cafe24-client';
import { getShopByMallId, decryptShopTokens } from '../db/queries';

const test = new Hono<{ Bindings: Env }>();

// ─── GET /store-info ─────────────────────────────────────────
test.get('/store-info', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) {
    return c.json({ error: 'mall_id query parameter is required' }, 400);
  }

  // DB에서 shop 조회
  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop) {
    return c.json({ error: 'shop_not_found', mall_id: mallId }, 404);
  }

  if (!shop.platform_access_token) {
    return c.json({ error: 'no_access_token', mall_id: mallId }, 400);
  }

  // 암호화된 토큰 복호화
  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  if (!tokens.access_token) {
    return c.json({ error: 'token_decryption_failed', mall_id: mallId }, 500);
  }

  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;
  let tokenRefreshed = false;

  // 토큰 갱신 헬퍼
  async function ensureToken(): Promise<string> {
    if (tokenRefreshed) return accessToken;
    // 먼저 store API로 토큰 유효성 확인
    try {
      await client.apiGet(mallId!, accessToken, '/admin/store');
      return accessToken;
    } catch (err: any) {
      if (err?.statusCode === 401 && tokens.refresh_token) {
        console.info(`Token expired for mall=${mallId}, refreshing...`);
        const newTokens = await client.refreshToken(mallId!, tokens.refresh_token);
        accessToken = newTokens.access_token;
        tokenRefreshed = true;

        // DB에 새 토큰 저장
        const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
        const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
        await c.env.DB
          .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
          .bind(encAt, encRt, shop!.shop_id)
          .run();

        return accessToken;
      }
      throw err;
    }
  }

  try {
    const validToken = await ensureToken();

    // 3개 API 병렬 호출 (갱신된 토큰으로)
    const [storeResult, categoriesResult, productsCountResult] = await Promise.allSettled([
      client.apiGet(mallId, validToken, '/admin/store'),
      client.apiGet(mallId, validToken, '/admin/categories', { limit: '50' }),
      client.apiGet(mallId, validToken, '/admin/products/count'),
    ]);

    function formatResult(result: PromiseSettledResult<unknown>) {
      if (result.status === 'fulfilled') {
        return { ok: true, data: result.value };
      }
      const err = (result as PromiseRejectedResult).reason;
      return {
        ok: false,
        error: String(err),
        status: err?.statusCode ?? null,
        detail: err?.detail ?? null,
      };
    }

    return c.json({
      mall_id: mallId,
      shop_id: shop.shop_id,
      token_refreshed: tokenRefreshed,
      results: {
        store: formatResult(storeResult),
        categories: formatResult(categoriesResult),
        products_count: formatResult(productsCountResult),
      },
    });
  } catch (err: any) {
    return c.json({
      mall_id: mallId,
      shop_id: shop.shop_id,
      error: 'api_call_failed',
      message: String(err),
      status: err?.statusCode ?? null,
      detail: err?.detail ?? null,
    }, 500);
  }
});

// ─── GET /coupons/expire — 단일 쿠폰의 available_day_from_issued 변경 ─
// 진단용: 카페24가 active 쿠폰의 metadata-only 변경을 받는지 검증 (현재 정책상 거부 확인됨).
//   GET /test/coupons/expire?mall_id=<>&coupon_no=<>&days=<1~365>
// fix와 동일한 PUT body: { shop_no: 1, request: { available_day_from_issued: days } }
test.get('/coupons/expire', async (c) => {
  const mallId = c.req.query('mall_id');
  const couponNo = c.req.query('coupon_no');
  const days = parseInt(c.req.query('days') || '0', 10);
  if (!mallId || !couponNo || !days || days < 1 || days > 365) {
    return c.json({ error: 'mall_id, coupon_no, days(1-365) required' }, 400);
  }

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) return c.json({ error: 'shop_not_found_or_no_token' }, 404);

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  let accessToken = tokens.access_token as string;

  async function callExpire(token: string): Promise<Response> {
    return fetch(`https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2026-03-01',
      },
      // 카페24 API 2026-03-01: PUT body에 status 필드 필수.
      // active 쿠폰에 restart는 멱등 거부(422) 처리, available_day_from_issued 는 적용됨.
      body: JSON.stringify({
        shop_no: 1,
        request: {
          status: 'restart',
          immediate_issue_restart: 'I',
          available_day_from_issued: days,
        },
      }),
    });
  }

  let resp = await callExpire(accessToken);

  if (resp.status === 401 && tokens.refresh_token) {
    const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
    try {
      const newTokens = await client.refreshToken(mallId, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id).run();
      resp = await callExpire(accessToken);
    } catch (err) {
      console.error('[test/expire] refresh failed:', err);
    }
  }

  const respText = await resp.text();
  let respJson: unknown;
  try { respJson = JSON.parse(respText); } catch { respJson = respText; }

  // 멱등 가드: 422 'cannot be reactivated' (이미 active) → metadata는 적용됨, success로 처리
  const idempotent = !resp.ok
    && resp.status === 422
    && /cannot be (reactivated|paused)/i.test(respText);

  return c.json({
    ok: resp.ok || idempotent,
    status: resp.status,
    idempotent_already_active: idempotent || undefined,
    mall_id: mallId,
    coupon_no: couponNo,
    days_set: days,
    response: respJson,
  });
});

// ─── GET /coupons/toggle — 단일 쿠폰의 발급 상태 토글 (pause/restart) ─
// 진단용: 카페24 admin API의 발급 상태 변경이 정상 동작하는지 검증.
//   GET /test/coupons/toggle?mall_id=<>&coupon_no=<>&action=pause|restart
test.get('/coupons/toggle', async (c) => {
  const mallId = c.req.query('mall_id');
  const couponNo = c.req.query('coupon_no');
  const action = c.req.query('action') as 'pause' | 'restart' | undefined;
  if (!mallId || !couponNo || (action !== 'pause' && action !== 'restart')) {
    return c.json({ error: 'mall_id, coupon_no, action=pause|restart required' }, 400);
  }

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) return c.json({ error: 'shop_not_found_or_no_token' }, 404);

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  let accessToken = tokens.access_token as string;

  async function callToggle(token: string): Promise<Response> {
    const request: Record<string, string> = { status: action! };
    if (action === 'pause') request.immediate_issue_pause = 'I';
    else request.immediate_issue_restart = 'I';
    return fetch(`https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2026-03-01',
      },
      body: JSON.stringify({ shop_no: 1, request }),
    });
  }

  let resp = await callToggle(accessToken);

  if (resp.status === 401 && tokens.refresh_token) {
    const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
    try {
      const newTokens = await client.refreshToken(mallId, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id).run();
      resp = await callToggle(accessToken);
    } catch (err) {
      console.error('[test/toggle] refresh failed:', err);
    }
  }

  const respText = await resp.text();
  let respJson: unknown;
  try { respJson = JSON.parse(respText); } catch { respJson = respText; }

  // 카페24 멱등성 가드: 이미 desired state인 422 응답을 success로 처리
  const idempotent = !resp.ok
    && resp.status === 422
    && /cannot be (reactivated|paused)/i.test(respText);

  return c.json({
    ok: resp.ok || idempotent,
    status: resp.status,
    idempotent_already_in_state: idempotent || undefined,
    mall_id: mallId,
    coupon_no: couponNo,
    action_set: action,
    response: respJson,
  });
});

// ─── GET /coupons — 쿠폰 목록 조회 테스트 ────────────────────
test.get('/coupons', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) {
    return c.json({ error: 'shop_not_found_or_no_token' }, 404);
  }

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  // 토큰 갱신
  try {
    await client.apiGet(mallId!, accessToken, '/admin/store');
  } catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const newTokens = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id)
        .run();
    }
  }

  try {
    const coupons = await client.apiGet(mallId!, accessToken, '/admin/coupons');
    return c.json({ ok: true, data: coupons });
  } catch (err: any) {
    return c.json({ ok: false, error: String(err), status: err?.statusCode, detail: err?.detail }, 500);
  }
});

// ─── POST /coupons/create-and-issue — 쿠폰 생성 + 발급 테스트 ─
test.post('/coupons/create-and-issue', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);
  const body = await c.req.json<{ member_id?: string }>();
  const memberId = body.member_id;

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) {
    return c.json({ error: 'shop_not_found_or_no_token' }, 404);
  }

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  // 토큰 갱신
  try {
    await client.apiGet(mallId!, accessToken, '/admin/store');
  } catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const newTokens = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id)
        .run();
    }
  }

  const results: Record<string, unknown> = {};

  // Step 1: 쿠폰 생성
  try {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    // 카페24 API를 직접 fetch로 호출 (API 버전 헤더 추가)
    const couponBody = {
      shop_no: 1,
      request: {
        coupon_name: '번개가입 3000원 환영 쿠폰 (개인발급 테스트)',
        benefit_type: 'A',
        discount_amount: { benefit_price: 3000 },
        discount_rate: null,
        available_period_type: 'F',
        available_begin_datetime: '2026-04-01T00:00:00+09:00',
        available_end_datetime: '2026-05-02T23:00:00+09:00',
        available_site: ['W', 'M'],
        available_scope: 'O',
        available_amount_type: 'E',
        available_coupon_count_by_order: 1,
        available_price_type: 'U',
        available_payment_method: ['all'],
        issue_type: 'M',
        issue_reserved: 'F',
        issue_order_date: 'F',
      }
    };
    const couponResp = await fetch(`https://${mallId}.cafe24api.com/api/v2/admin/coupons`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Cafe24-Api-Version': '2026-03-01',
      },
      body: JSON.stringify(couponBody),
    });
    const couponText = await couponResp.text();
    let couponData: any;
    try { couponData = JSON.parse(couponText); } catch { couponData = couponText; }
    if (!couponResp.ok) throw { statusCode: couponResp.status, detail: couponText, message: 'coupon create failed' };
    results.step1_create = { ok: true, data: couponData };
  } catch (err: any) {
    results.step1_create = { ok: false, error: String(err), status: err?.statusCode, detail: err?.detail };
    return c.json({ mall_id: mallId, results });
  }

  // Step 2: 쿠폰 발급 (member_id가 있으면)
  const couponNo = (results.step1_create as any)?.data?.coupon?.coupon_no;
  if (couponNo && memberId) {
    try {
      const issueResp = await fetch(
        `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}/issues`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Cafe24-Api-Version': '2026-03-01',
          },
          body: JSON.stringify({
            shop_no: 1,
            request: {
              issued_member_scope: 'M',
              member_id: memberId,
              allow_duplication: 'T',
              single_issue_per_once: 'T',
              send_sms_for_issue: 'F',
            }
          }),
        }
      );
      const issueText = await issueResp.text();
      let issueData: any;
      try { issueData = JSON.parse(issueText); } catch { issueData = issueText; }
      results.step2_issue = { ok: issueResp.ok, status: issueResp.status, data: issueData };
    } catch (err: any) {
      results.step2_issue = { ok: false, error: String(err) };
    }
  } else if (!memberId) {
    results.step2_issue = { skipped: true, reason: 'member_id not provided. Send {"member_id":"xxx"} to issue.' };
  }

  return c.json({ mall_id: mallId, coupon_no: couponNo, results });
});

// ─── GET /scripttags — ScriptTag 목록 조회 ──────────────────
test.get('/scripttags', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);
  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) return c.json({ error: 'no_shop' }, 404);

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  try { await client.apiGet(mallId!, accessToken, '/admin/store'); }
  catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const nt = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = nt.access_token;
      const ea = await encrypt(nt.access_token, c.env.ENCRYPTION_KEY);
      const er = await encrypt(nt.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB.prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?').bind(ea, er, shop.shop_id).run();
    }
  }

  const tags = await client.listScriptTags(mallId!, accessToken);
  return c.json({ ok: true, tags });
});

// ─── DELETE /scripttags/:script_no — ScriptTag 삭제 ─────────
test.delete('/scripttags/:script_no', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);
  const scriptNo = parseInt(c.req.param('script_no'));
  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) return c.json({ error: 'no_shop' }, 404);

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  try { await client.apiGet(mallId!, accessToken, '/admin/store'); }
  catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const nt = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = nt.access_token;
      const ea = await encrypt(nt.access_token, c.env.ENCRYPTION_KEY);
      const er = await encrypt(nt.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB.prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?').bind(ea, er, shop.shop_id).run();
    }
  }

  await client.deleteScriptTag(mallId!, accessToken, scriptNo);
  return c.json({ ok: true, deleted: scriptNo });
});

// ─── DELETE /coupons/delete — 쿠폰 삭제 테스트 ─────────────────
test.delete('/coupons/delete', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);
  const couponNo = c.req.query('coupon_no');

  if (!couponNo) {
    return c.json({ error: 'coupon_no query parameter required' }, 400);
  }

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) {
    return c.json({ error: 'shop_not_found' }, 404);
  }

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  // 토큰 갱신
  try {
    await client.apiGet(mallId!, accessToken, '/admin/store');
  } catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const newTokens = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id)
        .run();
    }
  }

  // action: pause(일시정지), restart(재개), delete(삭제)
  const action = c.req.query('action') || 'delete';
  const memberId = c.req.query('member_id');
  const results: Record<string, unknown> = {};

  // 쿠폰 상태 변경 (PUT /admin/coupons/{coupon_no})
  const requestBody: Record<string, unknown> = {};
  if (action === 'pause') {
    requestBody.status = 'pause';
    requestBody.immediate_issue_pause = 'I';
  } else if (action === 'restart') {
    requestBody.status = 'restart';
    requestBody.immediate_issue_restart = 'I';
  } else {
    // delete
    requestBody.status = null;
    requestBody.deleted = 'D';
  }

  try {
    const putResp = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${couponNo}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2026-03-01',
        },
        body: JSON.stringify({ shop_no: 1, request: requestBody }),
      }
    );
    const text = await putResp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }
    results.coupon_action = { action, ok: putResp.ok, status: putResp.status, data };
  } catch (err: any) {
    results.coupon_action = { action, ok: false, error: String(err) };
  }

  // 회원별 발급 쿠폰 삭제 (DELETE /admin/customers/{member_id}/coupons/{coupon_no})
  if (memberId) {
    try {
      const delResp = await fetch(
        `https://${mallId}.cafe24api.com/api/v2/admin/customers/${memberId}/coupons/${couponNo}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Cafe24-Api-Version': '2026-03-01',
          },
        }
      );
      const text = await delResp.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = text; }
      results.member_coupon_delete = { ok: delResp.ok, status: delResp.status, data };
    } catch (err: any) {
      results.member_coupon_delete = { ok: false, error: String(err) };
    }
  }

  return c.json({ coupon_no: couponNo, action, results });
});

// ─── POST /coupons/issue — 기존 쿠폰을 회원에게 발급 ──────────
test.post('/coupons/issue', async (c) => {
  const mallId = c.req.query('mall_id');
  if (!mallId) return c.json({ error: 'mall_id query parameter is required' }, 400);
  const body = await c.req.json<{ coupon_no: string; member_id: string }>();

  if (!body.coupon_no || !body.member_id) {
    return c.json({ error: 'coupon_no and member_id required' }, 400);
  }

  const shop = await getShopByMallId(c.env.DB, mallId, 'cafe24');
  if (!shop?.platform_access_token) {
    return c.json({ error: 'shop_not_found' }, 404);
  }

  const tokens = await decryptShopTokens(shop, c.env.ENCRYPTION_KEY);
  const client = new Cafe24Client(c.env.CAFE24_CLIENT_ID, c.env.CAFE24_CLIENT_SECRET);
  let accessToken = tokens.access_token as string;

  // 토큰 갱신
  try {
    await client.apiGet(mallId!, accessToken, '/admin/store');
  } catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      const newTokens = await client.refreshToken(mallId!, tokens.refresh_token);
      accessToken = newTokens.access_token;
      const encAt = await encrypt(newTokens.access_token, c.env.ENCRYPTION_KEY);
      const encRt = await encrypt(newTokens.refresh_token, c.env.ENCRYPTION_KEY);
      await c.env.DB
        .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
        .bind(encAt, encRt, shop.shop_id)
        .run();
    }
  }

  // API 버전 헤더 포함하여 직접 호출
  try {
    const issueResp = await fetch(
      `https://${mallId}.cafe24api.com/api/v2/admin/coupons/${body.coupon_no}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Cafe24-Api-Version': '2026-03-01',
        },
        body: JSON.stringify({
          request: {
            issued_member_scope: 'A'
          }
        }),
      }
    );
    const text = await issueResp.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = text; }

    return c.json({
      ok: issueResp.ok,
      status: issueResp.status,
      coupon_no: body.coupon_no,
      member_id: body.member_id,
      data,
    });
  } catch (err: any) {
    return c.json({ ok: false, error: String(err) }, 500);
  }
});

export default test;
