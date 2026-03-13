/**
 * Authentication middleware for dashboard routes.
 */

import { createMiddleware } from 'hono/factory';
import type { Env } from '@supasignup/bg-core';
import { verifyToken } from '../services/jwt';

type Variables = {
  ownerId: string;
};

export const authMiddleware = createMiddleware<{
  Bindings: Env;
  Variables: Variables;
}>(async (c, next) => {
  // Try cookie first, then Authorization header
  const cookieToken = getCookie(c.req.header('Cookie') ?? '', 'bg_token');
  const headerToken = c.req.header('Authorization')?.replace('Bearer ', '');
  const token = cookieToken || headerToken;

  if (!token) {
    return c.json({ error: 'unauthorized', message: 'Authentication required' }, 401);
  }

  const payload = await verifyToken(token, c.env.JWT_SECRET);
  if (!payload) {
    return c.json({ error: 'unauthorized', message: 'Invalid or expired token' }, 401);
  }

  c.set('ownerId', payload.sub);
  await next();
});

function getCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Rate limiting middleware ────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_TTL = 300; // 5 minutes

export const rateLimitMiddleware = createMiddleware<{
  Bindings: Env;
}>(async (c, next) => {
  const ip = c.req.header('CF-Connecting-IP') ?? c.req.header('X-Forwarded-For') ?? 'unknown';
  const key = `login_attempt:${ip}`;

  const attemptsStr = await c.env.KV.get(key);
  const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

  if (attempts >= MAX_ATTEMPTS) {
    return c.json({
      error: 'rate_limited',
      message: 'Too many login attempts. Please try again in 5 minutes.',
    }, 429);
  }

  await next();

  // If login failed (non-2xx), increment counter
  if (c.res.status >= 400) {
    await c.env.KV.put(key, String(attempts + 1), { expirationTtl: LOCKOUT_TTL });
  } else {
    // Reset on success
    await c.env.KV.delete(key);
  }
});
