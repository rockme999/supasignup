import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '@supasignup/bg-core';
import { handleScheduled } from './services/scheduled';

import oauthRoutes from './routes/oauth';
import widgetRoutes from './routes/widget';
import dashboardRoutes from './routes/dashboard';
import statsRoutes from './routes/stats';
import cafe24Routes from './routes/cafe24';
import billingRoutes from './routes/billing';
import pageRoutes from './routes/pages';
import adminRoutes from './routes/admin';
import facebookRoutes from './routes/facebook';
import testRoutes from './routes/test';
import aiRoutes from './routes/ai';
import { WIDGET_JS } from './widget/buttons';
import { TEST_DOM_JS } from './widget/test-dom';
import { TEST_STORAGE_JS } from './widget/test-storage';
import { TEST_SHADOW_IO_JS } from './widget/test-shadow-io';
import { TEST_FRONT_API_JS } from './widget/test-front-api';
import { TEST_EVENTS_JS } from './widget/test-events';

const app = new Hono<{ Bindings: Env }>();

// ── CORS: Widget routes (public, GET only) ──────────────────
app.use('/api/widget/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST'],
}));

// ── CORS: Dashboard routes (restricted origin) ──────────────
app.use('/api/dashboard/*', cors({
  origin: (origin, c) => {
    const baseUrl = (c.env as Env).BASE_URL.replace(/\/+$/, '');
    return origin === baseUrl ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── CORS: Admin API routes (restricted origin) ───────────────
app.use('/api/admin/*', cors({
  origin: (origin, c) => {
    const baseUrl = (c.env as Env).BASE_URL.replace(/\/+$/, '');
    return origin === baseUrl ? origin : '';
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── CORS: AI API routes (대시보드와 동일 — restricted origin) ─
app.use('/api/ai/*', cors({
  origin: (origin, c) => {
    const baseUrl = (c.env as Env).BASE_URL.replace(/\/+$/, '');
    return origin === baseUrl ? origin : '';
  },
  allowMethods: ['POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global error handler (prevent stack trace leaks) ─────────
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json({ error: 'internal_server_error', message: 'An unexpected error occurred' }, 500);
});

// ── Health check ─────────────────────────────────────────────
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bg-api' });
});

// ── Widget JS serving (ETag-based caching) ──────────────────
// WIDGET_JS는 배포 시 고정되므로 빌드 타임에 해시를 생성하여 ETag로 사용.
// 코드가 바뀌면 새 배포 → 새 ETag → 브라우저 캐시 자동 무효화.
const WIDGET_ETAG = `"bg-${Array.from(new TextEncoder().encode(WIDGET_JS)).reduce((h, b) => ((h << 5) - h + b) | 0, 0).toString(36)}"`;

app.get('/widget/buttons.js', (c) => {
  // BASE_URL을 JS에 런타임 주입
  const js = WIDGET_JS.replace(
    "var __MY_BASE_URL__ = '';",
    `var __MY_BASE_URL__ = '${c.env.BASE_URL}';`
  );

  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag DOM 조작 테스트 (개발용) ──────────────────────
app.get('/widget/test.js', (c) => {
  return c.body(TEST_DOM_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag localStorage 검증 테스트 (개발용) ────────────
app.get('/widget/test-storage.js', (c) => {
  return c.body(TEST_STORAGE_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag Shadow DOM + IntersectionObserver 테스트 (개발용)
app.get('/widget/test-shadow-io.js', (c) => {
  return c.body(TEST_SHADOW_IO_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag Front API 검증 테스트 (개발용) ───────────────
app.get('/widget/test-front-api.js', (c) => {
  // client_id를 런타임에 주입
  const js = TEST_FRONT_API_JS.replace(
    "var CLIENT_ID  = '';",
    `var CLIENT_ID  = '${c.env.CAFE24_CLIENT_ID}';`
  );
  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag 이벤트 감지 테스트 (개발용) ──────────────────
app.get('/widget/test-events.js', (c) => {
  return c.body(TEST_EVENTS_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── 소셜 연동 완료 페이지 (팝업에서 표시) ──────────────────
app.get('/link/complete', (c) => {
  return c.html(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>연동 완료</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc}
  .done{text-align:center;padding:40px}
  .icon{font-size:48px;margin-bottom:16px}
  h2{color:#333;margin-bottom:8px}
  p{color:#666;font-size:14px}
</style></head>
<body><div class="done">
  <div class="icon">\\u2705</div>
  <h2>소셜 계정 연동 완료</h2>
  <p>이 창은 자동으로 닫힙니다.</p>
</div>
<script>setTimeout(function(){window.close()},1500)</script>
</body></html>`);
});

// ── Mount routes ─────────────────────────────────────────────
app.route('/oauth', oauthRoutes);
app.route('/api/widget', widgetRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/dashboard', statsRoutes);
app.route('/api/cafe24', cafe24Routes);
app.route('/api/facebook', facebookRoutes);
app.route('/api/dashboard/billing', billingRoutes);
app.route('/api/admin', adminRoutes);
app.route('/api/ai', aiRoutes);
app.route('/test', testRoutes);

app.route('/', pageRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
};
