/**
 * 문의 첨부 이미지 API — Phase 2
 *
 * Dashboard (쇼핑몰 운영자):
 *   POST   /api/dashboard/inquiries/:id/attachments           - 이미지 업로드
 *   DELETE /api/dashboard/inquiries/:id/attachments/:key      - 이미지 삭제
 *   GET    /api/dashboard/inquiries/:id/attachments/:key      - 이미지 조회 (R2 프록시)
 *
 * Admin (수파레인 관리자):
 *   GET    /api/supadmin/inquiries/:id/attachments/:key       - 이미지 조회 (R2 프록시)
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { authMiddleware } from '../middleware/auth';
import { adminAuth } from '../middleware/admin';

// ─── 첨부파일 메타 타입 ─────────────────────────────────────────
export interface AttachmentMeta {
  key: string;       // R2 object key
  name: string;      // 원본 파일명 (sanitized)
  size: number;      // bytes
  mime: string;      // MIME type
  uploaded_at: string; // ISO 8601
}

// ─── 상수 ────────────────────────────────────────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_INQUIRY = 5;
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
// 파일 확장자 → 허용 MIME 교차 검증용
const EXT_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
};

// ─── Helper: 파일명 sanitize ────────────────────────────────────
function sanitizeFileName(name: string): string {
  return name
    .replace(/[/\\]/g, '-')   // 경로 구분자 제거
    .replace(/\.\./g, '-')    // 상위 디렉터리 이동 방지
    .replace(/\s+/g, '_')     // 공백 → 언더스코어
    .replace(/[^\w.\-]/g, '') // 영숫자·점·하이픈·언더스코어만 허용
    .slice(0, 200);            // 200자 이내
}

// ─── Helper: Content-Type 검증 (Content-Type 헤더 + 확장자 교차) ──
function validateMimeAndExt(contentType: string, fileName: string): string | null {
  // Content-Type에서 파라미터 제거 (예: "image/png; boundary=..." → "image/png")
  const mime = contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) return null;

  // 확장자 추출
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const expectedMime = EXT_TO_MIME[ext];

  // 확장자와 MIME 불일치 시 거부
  if (expectedMime && expectedMime !== mime) return null;

  return mime;
}

// ─── Helper: attachments JSON 파싱 ──────────────────────────────
function parseAttachments(raw: unknown): AttachmentMeta[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ─── Helper: R2 key에서 inquiry_id 검증 ─────────────────────────
// key 형식: inquiry/{shop_id}/{inquiry_id}/{uuid}.{ext}
function parseR2Key(key: string): { shopId: string; inquiryId: string } | null {
  const parts = key.split('/');
  if (parts.length !== 4 || parts[0] !== 'inquiry') return null;
  return { shopId: parts[1], inquiryId: parts[2] };
}

// ═══════════════════════════════════════════════════════════════
// Dashboard 라우터 — 운영자 전용
// ═══════════════════════════════════════════════════════════════

type DashboardEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

export const dashboardAttachmentRoutes = new Hono<DashboardEnv>();
dashboardAttachmentRoutes.use('*', authMiddleware);

// ─── POST /inquiries/:id/attachments — 이미지 업로드 ────────────
dashboardAttachmentRoutes.post('/inquiries/:id/attachments', async (c) => {
  const ownerId = c.get('ownerId');
  const inquiryId = c.req.param('id');

  // 문의 존재 및 소유권 확인
  const inquiry = await c.env.DB.prepare(
    'SELECT id, shop_id, attachments FROM inquiries WHERE id = ? AND owner_id = ?',
  )
    .bind(inquiryId, ownerId)
    .first<{ id: string; shop_id: string; attachments: string }>();

  if (!inquiry) return c.json({ error: 'not_found' }, 404);

  // multipart form 파싱
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch {
    return c.json({ error: 'invalid_form_data', message: 'multipart/form-data 형식이 필요합니다.' }, 400);
  }

  const fileEntry = formData.get('file');
  // Cloudflare Workers 환경에서 FormData의 파일 항목은 File/Blob 인터페이스를 가짐
  // instanceof File 대신 duck-type 체크 사용
  if (!fileEntry || typeof (fileEntry as { arrayBuffer?: unknown }).arrayBuffer !== 'function') {
    return c.json({ error: 'missing_file', message: 'file 필드가 필요합니다.' }, 400);
  }
  const file = fileEntry as unknown as File;

  // 파일 크기 검사
  if (file.size > MAX_FILE_SIZE) {
    return c.json({
      error: 'file_too_large',
      message: `파일 크기는 5MB 이하여야 합니다. (현재: ${(file.size / 1024 / 1024).toFixed(1)}MB)`,
    }, 400);
  }

  // 현재 첨부 개수 확인
  const existing = parseAttachments(inquiry.attachments);
  if (existing.length >= MAX_FILES_PER_INQUIRY) {
    return c.json({
      error: 'too_many_files',
      message: `첨부파일은 문의당 최대 ${MAX_FILES_PER_INQUIRY}개까지 가능합니다.`,
    }, 400);
  }

  // MIME + 확장자 교차 검증
  const validatedMime = validateMimeAndExt(file.type, file.name);
  if (!validatedMime) {
    return c.json({
      error: 'invalid_file_type',
      message: '허용된 이미지 형식: PNG, JPEG, WebP, GIF',
    }, 400);
  }

  const ext = MIME_TO_EXT[validatedMime];
  const safeName = sanitizeFileName(file.name);
  const uuid = crypto.randomUUID();
  const r2Key = `inquiry/${inquiry.shop_id}/${inquiryId}/${uuid}.${ext}`;

  // R2 업로드
  try {
    await c.env.INQUIRY_ATTACHMENTS.put(r2Key, await file.arrayBuffer(), {
      httpMetadata: { contentType: validatedMime },
    });
  } catch (e: unknown) {
    console.error('[inquiry-attachments] R2 put failed:', (e as Error)?.message || e);
    return c.json({ error: 'upload_failed', message: 'R2 업로드 중 오류가 발생했습니다.' }, 500);
  }

  // DB attachments JSON 배열 업데이트
  const newAttachment: AttachmentMeta = {
    key: r2Key,
    name: safeName,
    size: file.size,
    mime: validatedMime,
    uploaded_at: new Date().toISOString(),
  };
  const updated = [...existing, newAttachment];

  await c.env.DB.prepare(
    "UPDATE inquiries SET attachments = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(JSON.stringify(updated), inquiryId)
    .run();

  return c.json({ ok: true, attachment: newAttachment }, 201);
});

// ─── DELETE /inquiries/:id/attachments/:key — 이미지 삭제 ───────
// key는 URL인코딩되어 올 수 있으므로 decodeURIComponent 처리
dashboardAttachmentRoutes.delete('/inquiries/:id/attachments/:key{.+}', async (c) => {
  const ownerId = c.get('ownerId');
  const inquiryId = c.req.param('id');
  const rawKey = c.req.param('key');
  const r2Key = decodeURIComponent(rawKey);

  // R2 키 구조 검증
  const parsed = parseR2Key(r2Key);
  if (!parsed || parsed.inquiryId !== inquiryId) {
    return c.json({ error: 'invalid_key' }, 400);
  }

  // 문의 소유권 확인
  const inquiry = await c.env.DB.prepare(
    'SELECT id, attachments FROM inquiries WHERE id = ? AND owner_id = ?',
  )
    .bind(inquiryId, ownerId)
    .first<{ id: string; attachments: string }>();

  if (!inquiry) return c.json({ error: 'not_found' }, 404);

  // 첨부 목록에 해당 키가 있는지 확인
  const existing = parseAttachments(inquiry.attachments);
  const found = existing.find((a) => a.key === r2Key);
  if (!found) return c.json({ error: 'attachment_not_found' }, 404);

  // R2 삭제
  try {
    await c.env.INQUIRY_ATTACHMENTS.delete(r2Key);
  } catch (e: unknown) {
    console.error('[inquiry-attachments] R2 delete failed:', (e as Error)?.message || e);
    // R2 삭제 실패해도 DB에서는 제거 진행 (孤立 객체는 별도 cleanup)
  }

  // DB 배열에서 제거
  const updated = existing.filter((a) => a.key !== r2Key);
  await c.env.DB.prepare(
    "UPDATE inquiries SET attachments = ?, updated_at = datetime('now') WHERE id = ?",
  )
    .bind(JSON.stringify(updated), inquiryId)
    .run();

  return c.json({ ok: true });
});

// ─── GET /inquiries/:id/attachments/:key — 이미지 조회 (프록시) ─
dashboardAttachmentRoutes.get('/inquiries/:id/attachments/:key{.+}', async (c) => {
  const ownerId = c.get('ownerId');
  const inquiryId = c.req.param('id');
  const rawKey = c.req.param('key');
  const r2Key = decodeURIComponent(rawKey);

  // R2 키 구조 검증 (타 문의 키 접근 방지)
  const parsed = parseR2Key(r2Key);
  if (!parsed || parsed.inquiryId !== inquiryId) {
    return c.json({ error: 'invalid_key' }, 400);
  }

  // 문의 소유권 확인
  const inquiry = await c.env.DB.prepare(
    'SELECT id, attachments FROM inquiries WHERE id = ? AND owner_id = ?',
  )
    .bind(inquiryId, ownerId)
    .first<{ id: string; attachments: string }>();

  if (!inquiry) return c.json({ error: 'not_found' }, 404);

  // 첨부 목록에 해당 키가 있는지 확인
  const existing = parseAttachments(inquiry.attachments);
  const found = existing.find((a) => a.key === r2Key);
  if (!found) return c.json({ error: 'attachment_not_found' }, 404);

  // R2에서 객체 가져오기
  const obj = await c.env.INQUIRY_ATTACHMENTS.get(r2Key);
  if (!obj) return c.json({ error: 'object_not_found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': found.mime,
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${found.name}"`,
    },
  });
});

// ═══════════════════════════════════════════════════════════════
// Admin 라우터 — 수파레인 관리자 전용
// ═══════════════════════════════════════════════════════════════

type AdminEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

export const adminAttachmentRoutes = new Hono<AdminEnv>();
adminAttachmentRoutes.use('*', adminAuth);

// ─── GET /supadmin/inquiries/:id/attachments/:key — 관리자 이미지 조회 ─
adminAttachmentRoutes.get('/inquiries/:id/attachments/:key{.+}', async (c) => {
  const inquiryId = c.req.param('id');
  const rawKey = c.req.param('key');
  const r2Key = decodeURIComponent(rawKey);

  // R2 키 구조 검증
  const parsed = parseR2Key(r2Key);
  if (!parsed || parsed.inquiryId !== inquiryId) {
    return c.json({ error: 'invalid_key' }, 400);
  }

  // 문의 존재 확인 (관리자는 owner 상관없이 접근 가능)
  const inquiry = await c.env.DB.prepare(
    'SELECT id, attachments FROM inquiries WHERE id = ?',
  )
    .bind(inquiryId)
    .first<{ id: string; attachments: string }>();

  if (!inquiry) return c.json({ error: 'not_found' }, 404);

  // 첨부 목록에 해당 키가 있는지 확인
  const existing = parseAttachments(inquiry.attachments);
  const found = existing.find((a) => a.key === r2Key);
  if (!found) return c.json({ error: 'attachment_not_found' }, 404);

  // R2에서 객체 가져오기
  const obj = await c.env.INQUIRY_ATTACHMENTS.get(r2Key);
  if (!obj) return c.json({ error: 'object_not_found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': found.mime,
      'Cache-Control': 'private, max-age=300',
      'Content-Disposition': `inline; filename="${found.name}"`,
    },
  });
});
