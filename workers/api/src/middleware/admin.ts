/**
 * Admin authentication middleware.
 * Verifies JWT and checks owner role = 'admin' in DB.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '@supasignup/bg-core';
import { verifyToken } from '../services/jwt';

export const adminAuth = createMiddleware<{
  Bindings: Env;
  Variables: { ownerId: string };
}>(async (c, next) => {
  // Try Authorization header first, then cookie
  const headerToken = c.req.header('Authorization')?.startsWith('Bearer ')
    ? c.req.header('Authorization')!.slice(7)
    : undefined;
  const cookieToken = !headerToken ? getCookieToken(c.req.header('Cookie')) : undefined;
  const jwt = headerToken || cookieToken;

  if (!jwt) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const payload = await verifyToken(jwt, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'unauthorized' }, 401);
  }

  const ownerId = payload.sub;

  // DB에서 role 확인
  const owner = await c.env.DB.prepare('SELECT role FROM owners WHERE owner_id = ?')
    .bind(ownerId)
    .first<{ role: string }>();

  if (!owner || owner.role !== 'admin') {
    return c.json({ error: 'forbidden', message: 'Admin access required' }, 403);
  }

  c.set('ownerId', ownerId);
  await next();
});

function getCookieToken(cookie: string | undefined): string | undefined {
  if (!cookie) return undefined;
  const match = cookie.match(/bg_admin_token=([^;]+)/);
  return match?.[1];
}
