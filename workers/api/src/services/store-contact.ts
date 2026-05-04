/**
 * 카페24 운영자 연락처 sync (0033 마이그레이션 후속).
 *
 * - syncStoreContactByMallId: /admin/store API 호출 → shops.store_email/phone/admin_name/synced_at 갱신.
 *   토큰 만료 시 refresh 자동 시도. 실패 시 false 반환 (caller 가 로그/skip 결정).
 * - pickEmail / pickPhone: StoreContact 11개 필드에서 발송 가능한 1개씩만 우선순위로 선택.
 *   - 이메일: notification_only_email > email > customer_service_email (단, @cafe24.auto 더미는 제외)
 *   - 핸드폰: phone > customer_service_phone > privacy_officer_phone (010 패턴만 인정)
 *
 * 호출 위치:
 * - /api/cafe24/callback 신규 install 시점 (자동)
 * - /test/backfill-store-contact 운영자 수동 backfill (스테이징/프로덕션 일회성)
 * - 향후 lazy refresh: store_synced_at이 N일 이상 지난 쇼핑몰을 cron에서 점진 갱신 가능
 */

import type { Env } from '@supasignup/bg-core';
import { encrypt } from '@supasignup/bg-core';
import { Cafe24Client, type StoreContact } from '@supasignup/cafe24-client';
import { getShopByMallId, decryptShopTokens } from '../db/queries';

export interface SyncResult {
  ok: boolean;
  contact?: StoreContact;
  email?: string | null;          // pickEmail 결과 (DB에 저장된 값)
  phone?: string | null;          // pickPhone 결과
  admin_name?: string | null;
  reason?: string;                // 실패 사유
  token_refreshed?: boolean;
}

export async function syncStoreContactByMallId(
  env: Env,
  mallId: string,
): Promise<SyncResult> {
  const shop = await getShopByMallId(env.DB, mallId, 'cafe24');
  if (!shop) return { ok: false, reason: 'shop_not_found' };
  if (!shop.platform_access_token) return { ok: false, reason: 'no_access_token' };

  const tokens = await decryptShopTokens(shop, env.ENCRYPTION_KEY);
  if (!tokens.access_token) return { ok: false, reason: 'token_decrypt_failed' };

  const client = new Cafe24Client(env.CAFE24_CLIENT_ID, env.CAFE24_CLIENT_SECRET);
  let accessToken: string = tokens.access_token;
  let tokenRefreshed = false;

  let contact: StoreContact;
  try {
    contact = await client.getStoreContact(mallId, accessToken);
  } catch (err: any) {
    if (err?.statusCode === 401 && tokens.refresh_token) {
      try {
        const newTokens = await client.refreshToken(mallId, tokens.refresh_token);
        accessToken = newTokens.access_token;
        tokenRefreshed = true;
        const encAt = await encrypt(newTokens.access_token, env.ENCRYPTION_KEY);
        const encRt = await encrypt(newTokens.refresh_token, env.ENCRYPTION_KEY);
        await env.DB
          .prepare('UPDATE shops SET platform_access_token = ?, platform_refresh_token = ? WHERE shop_id = ?')
          .bind(encAt, encRt, shop.shop_id)
          .run();
        contact = await client.getStoreContact(mallId, accessToken);
      } catch (refreshErr: any) {
        return {
          ok: false,
          reason: `refresh_failed: ${refreshErr?.message ?? refreshErr}`,
          token_refreshed: false,
        };
      }
    } else {
      return {
        ok: false,
        reason: `api_failed: ${err?.message ?? err}`,
        token_refreshed: false,
      };
    }
  }

  const email = pickEmail(contact);
  const phone = pickPhone(contact);
  const adminName = contact.admin_name ?? contact.president_name;

  await env.DB
    .prepare(`UPDATE shops SET
                store_email = ?,
                store_phone = ?,
                store_admin_name = ?,
                store_synced_at = datetime('now'),
                updated_at = datetime('now')
              WHERE shop_id = ?`)
    .bind(email, phone, adminName, shop.shop_id)
    .run();

  return {
    ok: true,
    contact,
    email,
    phone,
    admin_name: adminName,
    token_refreshed: tokenRefreshed,
  };
}

/**
 * 발송 가능한 이메일 1개 선택. @cafe24.auto 도메인은 카페24 가입 시 자동 생성된 더미라 제외.
 * 우선순위: notification_only_email (관리자가 명시 등록한 알림 전용) > email (대표) > customer_service_email
 */
export function pickEmail(c: StoreContact): string | null {
  const candidates = [c.notification_only_email, c.email, c.customer_service_email];
  for (const v of candidates) {
    if (v && !v.toLowerCase().endsWith('@cafe24.auto')) return v;
  }
  return null;
}

/**
 * 발송 가능한 핸드폰 1개 선택. 알림톡/SMS 모두 010 한국 핸드폰만 의미 있음.
 * 02-/070-/070 등 일반 전화는 알림톡 불가 → 패턴 검증으로 제외.
 * 우선순위: phone > customer_service_phone > privacy_officer_phone
 */
export function pickPhone(c: StoreContact): string | null {
  const candidates = [c.phone, c.customer_service_phone, c.privacy_officer_phone];
  for (const v of candidates) {
    if (v && /^01[016789]-?\d{3,4}-?\d{4}$/.test(v)) {
      // 하이픈 제거해서 정규화 (저장 형식 통일)
      return v.replace(/-/g, '');
    }
  }
  return null;
}
