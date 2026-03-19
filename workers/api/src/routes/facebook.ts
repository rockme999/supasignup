/**
 * Facebook Data Deletion Callback endpoints.
 *
 * Meta App Review에서 필수로 요구하는 "데이터 삭제 요청 콜백" 엔드포인트.
 *
 * POST /api/facebook/data-deletion        → Signed Request 검증 후 Facebook 사용자 데이터 삭제
 * GET  /api/facebook/data-deletion/status → 삭제 요청 상태 조회 (confirmation_code로 조회)
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { generateId } from '@supasignup/bg-core';

const facebook = new Hono<{ Bindings: Env }>();

// KV key prefix and TTL for deletion request records
const DELETION_KEY_PREFIX = 'fb_deletion:';
const DELETION_TTL = 60 * 60 * 24 * 90; // 90 days

interface DeletionRecord {
  status: 'pending' | 'completed' | 'not_found';
  facebook_user_id: string;
  requested_at: string;
  completed_at?: string;
}

// ─── Helper: base64url decode ─────────────────────────────────
function base64UrlDecode(input: string): Uint8Array {
  // Normalize base64url → standard base64
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ─── Helper: verify Facebook signed_request ───────────────────
// Facebook은 HMAC-SHA256(base64url_payload, APP_SECRET) == base64url_sig 형태로 서명
async function verifySignedRequest(
  signedRequest: string,
  appSecret: string,
): Promise<{ user_id: string; algorithm: string } | null> {
  const parts = signedRequest.split('.');
  if (parts.length !== 2) return null;

  const [encodedSig, encodedPayload] = parts;

  // C-2: HMAC 검증을 payload 파싱보다 먼저 수행 (신뢰되지 않은 데이터를 파싱하기 전에 검증)

  // Import app secret as HMAC key
  const keyBytes = new TextEncoder().encode(appSecret);
  let cryptoKey: CryptoKey;
  try {
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
  } catch {
    return null;
  }

  // Compute expected signature: HMAC-SHA256(encodedPayload, appSecret)
  const encodedPayloadBytes = new TextEncoder().encode(encodedPayload);
  const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, encodedPayloadBytes);
  const computedSigBytes = new Uint8Array(sigBuffer);

  // Decode provided signature
  const providedSigBytes = base64UrlDecode(encodedSig);

  // Timing-safe comparison
  if (computedSigBytes.length !== providedSigBytes.length) return null;
  let result = 0;
  for (let i = 0; i < computedSigBytes.length; i++) {
    result |= computedSigBytes[i] ^ providedSigBytes[i];
  }
  if (result !== 0) return null;

  // HMAC 검증 통과 후 payload 파싱
  let payload: { user_id?: string; algorithm?: string };
  try {
    const payloadBytes = base64UrlDecode(encodedPayload);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(payloadStr) as { user_id?: string; algorithm?: string };
  } catch {
    return null;
  }

  if (!payload.user_id || !payload.algorithm) return null;
  if (payload.algorithm !== 'HMAC-SHA256') return null;

  return { user_id: payload.user_id, algorithm: payload.algorithm };
}

// ─── POST /data-deletion ──────────────────────────────────────
// Facebook이 Signed Request를 POST body (application/x-www-form-urlencoded)로 전송.
// 검증 후 해당 Facebook 사용자 데이터를 삭제하고 confirmation_code 반환.
facebook.post('/data-deletion', async (c) => {
  // Parse form body
  let body: Record<string, string | File>;
  try {
    body = await c.req.parseBody();
  } catch {
    return c.json({ error: 'invalid_request', message: 'Failed to parse request body' }, 400);
  }

  const signedRequest = body['signed_request'];
  if (!signedRequest || typeof signedRequest !== 'string') {
    return c.json({ error: 'missing_signed_request', message: 'signed_request parameter is required' }, 400);
  }

  // Verify signed request using HMAC-SHA256
  const verified = await verifySignedRequest(signedRequest, c.env.FACEBOOK_APP_SECRET);
  if (!verified) {
    return c.json({ error: 'invalid_signature', message: 'Signed request verification failed' }, 400);
  }

  const facebookUserId = verified.user_id;

  // H-2: 중복 삭제 요청 캐싱 — 이전 삭제 기록이 있으면 기존 confirmation_code 반환
  const existingJson = await c.env.KV.get(`${DELETION_KEY_PREFIX}fb_user:${facebookUserId}`);
  if (existingJson) {
    const existing = JSON.parse(existingJson) as { confirmation_code: string };
    const statusUrl = `${c.env.BASE_URL}/api/facebook/data-deletion/status?code=${existing.confirmation_code}`;
    return c.json({
      url: statusUrl,
      confirmation_code: existing.confirmation_code,
    });
  }

  // Generate unique confirmation code
  const confirmationCode = generateId().replace(/-/g, '');

  // Store deletion request in KV (pending 상태로 시작)
  const now = new Date().toISOString();
  const deletionRecord: DeletionRecord = {
    status: 'pending',
    facebook_user_id: facebookUserId,
    requested_at: now,
  };
  await c.env.KV.put(
    `${DELETION_KEY_PREFIX}${confirmationCode}`,
    JSON.stringify(deletionRecord),
    { expirationTtl: DELETION_TTL },
  );

  // H-2: facebookUserId → confirmationCode 역방향 캐시 저장
  await c.env.KV.put(
    `${DELETION_KEY_PREFIX}fb_user:${facebookUserId}`,
    JSON.stringify({ confirmation_code: confirmationCode }),
    { expirationTtl: DELETION_TTL },
  );

  // DB에서 Facebook 데이터 삭제
  // 1. user_providers 테이블에서 facebook provider_uid 기준으로 user_id 조회
  const providerRow = await c.env.DB
    .prepare('SELECT user_id FROM user_providers WHERE provider = ? AND provider_uid = ?')
    .bind('facebook', facebookUserId)
    .first<{ user_id: string }>();

  // users 테이블에서도 provider='facebook', provider_uid 기준으로 조회 (계정 연결 미사용 사용자)
  const userRow = await c.env.DB
    .prepare('SELECT user_id FROM users WHERE provider = ? AND provider_uid = ?')
    .bind('facebook', facebookUserId)
    .first<{ user_id: string }>();

  // 삭제할 user_id 수집 (중복 제거)
  const userIds = new Set<string>();
  if (providerRow?.user_id) userIds.add(providerRow.user_id);
  if (userRow?.user_id) userIds.add(userRow.user_id);

  for (const userId of userIds) {
    // user_providers에서 facebook 레코드 삭제
    await c.env.DB
      .prepare('DELETE FROM user_providers WHERE user_id = ? AND provider = ?')
      .bind(userId, 'facebook')
      .run();

    // users 테이블에서 provider='facebook'인 사용자의 PII를 NULL 처리 (소프트 삭제)
    // provider='facebook'인 레코드만 PII 삭제 (다른 provider로 연결된 경우 그쪽은 유지)
    await c.env.DB
      .prepare(
        `UPDATE users
         SET email = NULL, email_hash = NULL, name = NULL,
             phone = NULL, birthday = NULL, gender = NULL,
             profile_image = NULL, raw_data = NULL,
             updated_at = datetime('now')
         WHERE user_id = ? AND provider = 'facebook'`,
      )
      .bind(userId)
      .run();

    // H-1: shop_users 테이블에서 해당 사용자 데이터 삭제
    await c.env.DB
      .prepare('DELETE FROM shop_users WHERE user_id = ?')
      .bind(userId)
      .run();

    // H-1: login_stats 테이블의 user_id를 'deleted'로 익명화 (통계 집계는 유지)
    await c.env.DB
      .prepare(`UPDATE login_stats SET user_id = 'deleted' WHERE user_id = ?`)
      .bind(userId)
      .run();
  }

  // KV 상태를 completed로 업데이트
  const completedRecord: DeletionRecord = {
    ...deletionRecord,
    status: userIds.size > 0 ? 'completed' : 'not_found',
    completed_at: new Date().toISOString(),
  };
  await c.env.KV.put(
    `${DELETION_KEY_PREFIX}${confirmationCode}`,
    JSON.stringify(completedRecord),
    { expirationTtl: DELETION_TTL },
  );

  // Facebook이 요구하는 형식으로 응답
  const statusUrl = `${c.env.BASE_URL}/api/facebook/data-deletion/status?code=${confirmationCode}`;
  return c.json({
    url: statusUrl,
    confirmation_code: confirmationCode,
  });
});

// ─── GET /data-deletion/status ────────────────────────────────
// KV에서 삭제 요청 상태를 조회하여 HTML 페이지로 표시.
facebook.get('/data-deletion/status', async (c) => {
  const code = c.req.query('code');

  if (!code) {
    return c.html(renderStatusPage('오류', ['코드가 제공되지 않았습니다.'], 'error'), 400);
  }

  // Sanitize code: 영숫자만 허용 (UUID hex 형식)
  if (!/^[a-f0-9]{32}$/.test(code)) {
    return c.html(renderStatusPage('오류', ['유효하지 않은 코드입니다.'], 'error'), 400);
  }

  const recordJson = await c.env.KV.get(`${DELETION_KEY_PREFIX}${code}`);
  if (!recordJson) {
    return c.html(renderStatusPage('확인 불가', ['해당 코드에 대한 삭제 요청을 찾을 수 없거나 만료되었습니다.'], 'not_found'), 404);
  }

  let record: DeletionRecord;
  try {
    record = JSON.parse(recordJson) as DeletionRecord;
  } catch {
    return c.html(renderStatusPage('오류', ['상태 정보를 읽을 수 없습니다.'], 'error'), 500);
  }

  // M-2: statusLabels는 하단의 단일 정의를 참조 (중복 제거)
  const detailParts = [
    `요청 시각: ${new Date(record.requested_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`,
    record.completed_at
      ? `처리 시각: ${new Date(record.completed_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`
      : null,
    `확인 코드: ${code}`,
  ].filter((v): v is string => v !== null);

  return c.html(renderStatusPage(
    `데이터 삭제 상태: ${statusLabels[record.status] ?? record.status}`,
    detailParts,
    record.status,
  ));
});

// ─── Helper: status page renderer ─────────────────────────────
// C-1: message를 string[] 로 받아 각 항목을 escapeHtml 처리 후 <br>로 조합 (XSS 방지)
function renderStatusPage(title: string, messageLines: string | string[], status: string): string {
  const statusColors: Record<string, string> = {
    completed: '#16a34a',
    pending: '#d97706',
    not_found: '#6b7280',
    error: '#dc2626',
  };
  const color = statusColors[status] ?? '#6b7280';

  // 각 줄을 개별적으로 escapeHtml 처리한 후 <br>로 조합
  const lines = Array.isArray(messageLines) ? messageLines : [messageLines];
  const safeMessage = lines.map(escapeHtml).join('<br>');

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Facebook 데이터 삭제 상태 - 번개가입</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f8fafc;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 24px;
    }
    .card {
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 4px 24px rgba(0, 0, 0, .08);
      padding: 40px 32px;
      width: 100%;
      max-width: 480px;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; color: #1e293b; margin-bottom: 16px; }
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 999px;
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      background: ${color};
      margin-bottom: 24px;
    }
    .details {
      font-size: 14px;
      color: #475569;
      line-height: 1.8;
      text-align: left;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 16px;
    }
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">🔒</div>
    <h1>${escapeHtml(title)}</h1>
    <div class="status-badge">${escapeHtml(statusLabels[status] ?? status)}</div>
    <div class="details">${safeMessage}</div>
    <div class="footer">
      번개가입 (Suparain) · Facebook 개인정보 처리방침 준수
    </div>
  </div>
</body>
</html>`;
}

const statusLabels: Record<string, string> = {
  completed: '삭제 완료',
  pending: '처리 중',
  not_found: '데이터 없음',
  error: '오류',
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export default facebook;
