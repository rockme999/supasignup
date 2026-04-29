import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { handleScheduled, generateBriefingForShop } from './services/scheduled';
import { BUILD_COMMIT_SHA } from './data/build-info';

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
import { dashboardAttachmentRoutes, adminAttachmentRoutes } from './routes/inquiry-attachments';
import { adminAuth } from './middleware/admin';
import { WIDGET_JS } from './widget/buttons';
import { TEST_DOM_JS } from './widget/test-dom';
import { TEST_STORAGE_JS } from './widget/test-storage';
import { TEST_SHADOW_IO_JS } from './widget/test-shadow-io';
import { TEST_FRONT_API_JS } from './widget/test-front-api';
import { TEST_EVENTS_JS } from './widget/test-events';

const app = new Hono<{ Bindings: Env }>();

// ── Security headers: Global ─────────────────────────────────
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// ── Security headers: Dashboard / Admin routes ───────────────
// Widget 라우트(/api/widget/*)는 iframe 허용 필요 → X-Frame-Options 제외
const PROTECTED_ROUTE_PATTERNS = ['/dashboard/', '/supadmin/', '/api/dashboard/', '/api/supadmin/'];
app.use('*', async (c, next) => {
  await next();
  const path = c.req.path;
  const isProtected = PROTECTED_ROUTE_PATTERNS.some((p) => path === p.slice(0, -1) || path.startsWith(p));
  if (isProtected) {
    c.header('X-Frame-Options', 'DENY');
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'"
    );
  }
});

// ── CORS: Widget routes (public) ─────────────────────────────
app.use('/api/widget/*', cors({
  origin: (origin) => origin || '',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
  credentials: true,
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
app.use('/api/supadmin/*', cors({
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
  allowMethods: ['GET', 'POST'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Global error handler (prevent stack trace leaks) ─────────
app.onError((err, c) => {
  console.error('Unhandled error:', err.message, err.stack);
  return c.json({ error: 'internal_server_error', message: 'An unexpected error occurred' }, 500);
});

// ── Health check (DB / KV / R2 실시간 probe) ─────────────────
app.get('/health', async (c) => {
  const TIMEOUT_MS = 5000;

  // DB probe: SELECT 1 (가장 가벼운 쿼리)
  type CheckResult = { ok: boolean; ms: number; error?: string };

  async function checkDB(): Promise<CheckResult> {
    const t = Date.now();
    try {
      await c.env.DB.prepare('SELECT 1').first();
      return { ok: true, ms: Date.now() - t };
    } catch (e) {
      return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // KV probe: get 호출 (값 null이어도 호출 자체가 성공이면 통과)
  async function checkKV(): Promise<CheckResult> {
    const t = Date.now();
    try {
      await c.env.KV.get('__healthcheck');
      return { ok: true, ms: Date.now() - t };
    } catch (e) {
      return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // R2 probe: head 호출 (객체 없어도 OK, 네트워크/권한 오류만 실패)
  async function checkR2(): Promise<CheckResult> {
    const t = Date.now();
    try {
      await c.env.INQUIRY_ATTACHMENTS.head('__healthcheck');
      return { ok: true, ms: Date.now() - t };
    } catch (e) {
      return { ok: false, ms: Date.now() - t, error: e instanceof Error ? e.message : String(e) };
    }
  }

  // 각 체크를 timeout과 경쟁 (어느 쪽이든 먼저 끝나면 resolve)
  function withTimeout(p: Promise<CheckResult>): Promise<CheckResult> {
    return Promise.race([
      p,
      new Promise<CheckResult>((resolve) =>
        setTimeout(() => resolve({ ok: false, ms: TIMEOUT_MS, error: 'timeout' }), TIMEOUT_MS)
      ),
    ]);
  }

  const [db, kv, r2] = await Promise.all([
    withTimeout(checkDB()),
    withTimeout(checkKV()),
    withTimeout(checkR2()),
  ]);

  const allOk = db.ok && kv.ok && r2.ok;
  const commit = c.env.COMMIT_SHA || BUILD_COMMIT_SHA || 'unknown';
  const env = c.env.BASE_URL?.includes('-dev') ? 'staging' : 'production';

  return c.json(
    {
      ok: allOk,
      env,
      commit,
      checks: { db, kv, r2 },
      checked_at: new Date().toISOString(),
    },
    allOk ? 200 : 503
  );
});

// ── Version / build metadata ─────────────────────────────────
// 배포된 코드의 정체(어느 commit, 언제 빌드, 어느 env)를 외부에서 검증.
// wrangler deployments list가 commit hash를 안 박으므로 이 엔드포인트가
// "지금 프로덕션이 어느 코드?"의 단일 답변 출처(SSOT)이다.
app.get('/version', (c) => {
  return c.json({
    service: 'bg-api',
    env: c.env.BASE_URL?.includes('-dev') ? 'staging' : 'production',
    version: c.env.VERSION || 'unknown',
    commit: c.env.COMMIT_SHA || 'unknown',
    built_at: c.env.BUILD_TIME || 'unknown',
  });
});

// ── Widget JS serving (ETag-based caching) ──────────────────
// WIDGET_JS는 배포 시 고정되므로 빌드 타임에 해시를 생성하여 ETag로 사용.
// 코드가 바뀌면 새 배포 → 새 ETag → 브라우저 캐시 자동 무효화.
const WIDGET_ETAG = `"bg-${Array.from(new TextEncoder().encode(WIDGET_JS)).reduce((h, b) => ((h << 5) - h + b) | 0, 0).toString(36)}"`;

app.get('/widget/buttons.js', (c) => {
  // If-None-Match → 304 (변경 없으면 본문 전송 생략)
  const ifNoneMatch = c.req.header('If-None-Match');
  if (ifNoneMatch === WIDGET_ETAG) {
    return new Response(null, {
      status: 304,
      headers: {
        'ETag': WIDGET_ETAG,
        'Cache-Control': 'public, max-age=300, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // BASE_URL을 JS에 런타임 주입
  const js = WIDGET_JS.replace(
    "var __MY_BASE_URL__ = '';",
    `var __MY_BASE_URL__ = '${c.env.BASE_URL}';`
  );

  return c.body(js, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'public, max-age=300, must-revalidate',
    'ETag': WIDGET_ETAG,
    'Access-Control-Allow-Origin': '*',
  });
});

// ── Dev-only guard: /widget/test*.js, /test/* ────────────────
// BASE_URL에 '-dev.'가 포함된 dev 환경에서만 접근 허용.
// 프로덕션(bg.suparain.kr)에서는 404 반환.
const devOnly: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  if (!(c.env as Env).BASE_URL.includes('-dev.')) {
    return c.notFound();
  }
  await next();
};

// ── ScriptTag DOM 조작 테스트 (개발용) ──────────────────────
app.get('/widget/test.js', devOnly, (c) => {
  return c.body(TEST_DOM_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag localStorage 검증 테스트 (개발용) ────────────
app.get('/widget/test-storage.js', devOnly, (c) => {
  return c.body(TEST_STORAGE_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag Shadow DOM + IntersectionObserver 테스트 (개발용)
app.get('/widget/test-shadow-io.js', devOnly, (c) => {
  return c.body(TEST_SHADOW_IO_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── ScriptTag Front API 검증 테스트 (개발용) ───────────────
app.get('/widget/test-front-api.js', devOnly, (c) => {
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
app.get('/widget/test-events.js', devOnly, (c) => {
  return c.body(TEST_EVENTS_JS, 200, {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    'Access-Control-Allow-Origin': '*',
  });
});

// ── Mount routes ─────────────────────────────────────────────
app.route('/oauth', oauthRoutes);
app.route('/api/widget', widgetRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/api/dashboard', statsRoutes);
app.route('/api/cafe24', cafe24Routes);
app.route('/api/facebook', facebookRoutes);
app.route('/api/dashboard/billing', billingRoutes);
app.route('/api/supadmin', adminRoutes);
app.route('/api/ai', aiRoutes);
// 문의 첨부 이미지 (Phase 2)
app.route('/api/dashboard', dashboardAttachmentRoutes);
app.route('/api/supadmin', adminAttachmentRoutes);

// ── Dev-only + admin-only: /test/* 라우트 ────────────────────
// 프로덕션에서는 devOnly가 404 반환.
// dev에서도 adminAuth를 통과한 관리자만 접근 가능 — 실 고객 토큰을 오용한 쿠폰 발급·위젯 제거 등을 차단.
app.use('/test/*', devOnly, adminAuth);
app.route('/test', testRoutes);

app.route('/', pageRoutes);

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleScheduled(env));
  },
  async queue(batch: MessageBatch<{ shop_id: string; shop_name: string }>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      try {
        await generateBriefingForShop(env, msg.body.shop_id);
        msg.ack();
        console.log(`[Queue] Briefing completed: ${msg.body.shop_name} (${msg.body.shop_id})`);
      } catch (err) {
        console.error(`[Queue] Briefing failed: ${msg.body.shop_name} (${msg.body.shop_id})`, err);
        msg.retry();
      }
    }
  },
};
