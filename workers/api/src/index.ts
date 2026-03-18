import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '@supasignup/bg-core';

import oauthRoutes from './routes/oauth';
import widgetRoutes from './routes/widget';
import dashboardRoutes from './routes/dashboard';
import statsRoutes from './routes/stats';
import cafe24Routes from './routes/cafe24';
import billingRoutes from './routes/billing';
import pageRoutes from './routes/pages';
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
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── Mount routes ─────────────────────────────────────────────
app.route('/oauth', oauthRoutes);
app.route('/api/widget', widgetRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/dashboard', statsRoutes);
app.route('/api/cafe24', cafe24Routes);
app.route('/api/dashboard/billing', billingRoutes);
app.route('/', pageRoutes);

export default app;
