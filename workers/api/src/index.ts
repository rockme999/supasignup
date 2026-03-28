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
import { WIDGET_JS } from './widget/buttons';

const app = new Hono<{ Bindings: Env }>();

// ── CORS: Widget routes (public, GET only) ──────────────────
app.use('/api/widget/*', cors({
  origin: '*',
  allowMethods: ['GET'],
}));

// ── CORS: Dashboard routes (restricted origin) ──────────────
app.use('/api/dashboard/*', cors({
  origin: 'https://bg.suparain.kr',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── CORS: Admin API routes (restricted origin) ───────────────
app.use('/api/admin/*', cors({
  origin: 'https://bg.suparain.kr',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global error handler (prevent stack trace leaks) ─────────
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json({ error: 'internal_server_error', message: 'An unexpected error occurred' }, 500);
});

// ── Root / Health check ──────────────────────────────────────
app.get('/', (c) => c.redirect('/dashboard'));

app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'bg-api' });
});

// ── Widget JS serving ────────────────────────────────────────
app.get('/widget/buttons.js', (c) => {
  return c.body(WIDGET_JS, 200, {
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
app.route('/', pageRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
};
