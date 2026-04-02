/**
 * AI 엔진 API 엔드포인트.
 *
 * 모든 라우트는 JWT 인증 필요 (대시보드 CORS 적용).
 *
 *   POST /api/ai/identity       - 쇼핑몰 정체성 자동 분석 및 저장
 *   POST /api/ai/briefing       - 주간 AI 브리핑 생성
 *   POST /api/ai/copy           - 맥락 카피 생성 (월 10회 제한)
 *   POST /api/ai/escalation-copy - 에스컬레이션 단계별 메시지 생성
 */

import { Hono } from 'hono';
import type { Env } from '@supasignup/bg-core';
import { authMiddleware } from '../middleware/auth';

// AI 응답 인터페이스 (Cloudflare Workers AI)
interface AiTextResponse {
  response?: string;
  result?: { response?: string };
}

type AiEnv = {
  Bindings: Env;
  Variables: { ownerId: string };
};

const ai = new Hono<AiEnv>();

// 모든 AI 라우트에 JWT 인증 적용
ai.use('*', authMiddleware);

// ─── Workers AI 호출 헬퍼 ─────────────────────────────────────
async function callAI(
  env: Env,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Workers AI 바인딩이 사용 가능한 경우 직접 호출
  if (env.AI) {
    try {
      const result = await env.AI.run('@cf/moonshotai/kimi-k2.5', { messages }) as AiTextResponse;
      return result?.response ?? result?.result?.response ?? '';
    } catch (e) {
      console.error('[AI] Workers AI binding error:', e);
    }
  }

  // 폴백: REST API 방식 (CF_ACCOUNT_ID, CF_AI_TOKEN 환경변수 필요)
  if (env.CF_ACCOUNT_ID && env.CF_AI_TOKEN) {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/moonshotai/kimi-k2.5`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.CF_AI_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
      }
    );

    if (!resp.ok) {
      throw new Error(`AI REST API error: ${resp.status}`);
    }

    const data = await resp.json() as { result?: { response?: string } };
    return data?.result?.response ?? '';
  }

  throw new Error('AI binding not available: set Workers AI binding or CF_ACCOUNT_ID + CF_AI_TOKEN');
}

// ─── shop 소유권 검증 헬퍼 ────────────────────────────────────
async function getOwnedShop(db: D1Database, shopId: string, ownerId: string) {
  const shop = await db.prepare(
    'SELECT * FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL'
  ).bind(shopId, ownerId).first();
  return shop;
}

// ═══════════════════════════════════════════════════════════════
// POST /identity — 쇼핑몰 정체성 자동 분석
// ═══════════════════════════════════════════════════════════════
ai.post('/identity', async (c) => {
  const ownerId = c.get('ownerId');
  let body: { shop_id?: string } = {};
  try { body = await c.req.json<{ shop_id?: string }>(); } catch { /* ignore */ }

  if (!body.shop_id) {
    return c.json({ error: 'bad_request', message: 'shop_id is required' }, 400);
  }

  // 소유권 검증
  const shop = await getOwnedShop(c.env.DB, body.shop_id, ownerId) as Record<string, unknown> | null;
  if (!shop) {
    return c.json({ error: 'not_found', message: 'Shop not found' }, 404);
  }

  const shopUrl = (shop.shop_url as string) || '';
  if (!shopUrl) {
    return c.json({ error: 'bad_request', message: 'Shop URL is not configured' }, 400);
  }

  // 쇼핑몰 HTML 가져오기 (메타데이터 위주, 최대 50KB)
  let htmlSnippet = '';
  try {
    const pageResp = await fetch(shopUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BunGaeBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (pageResp.ok) {
      const fullText = await pageResp.text();
      // 분석에 충분한 HEAD 부분만 사용 (토큰 절약)
      htmlSnippet = fullText.slice(0, 6000);
    }
  } catch (e) {
    console.warn('[AI/identity] Failed to fetch shop URL:', shopUrl, e);
  }

  // HTML 없어도 URL 기반으로 분석 시도
  const prompt = htmlSnippet
    ? `다음은 한국 쇼핑몰의 HTML 일부입니다. 이 쇼핑몰을 분석하여 JSON으로만 응답하세요.\n\nURL: ${shopUrl}\n\nHTML:\n${htmlSnippet}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n{"industry":"업종 (예: 패션, 뷰티, 식품, 잡화 등)","target":"타겟 고객 (예: 20-30대 여성, 40대 이상 남성 등)","tone":"톤앤매너 (예: 친근하고 캐주얼, 고급스럽고 전문적 등)","keywords":["핵심키워드1","핵심키워드2","핵심키워드3"],"summary":"한 줄 소개"}`
    : `URL만으로 한국 쇼핑몰을 추론하여 JSON으로만 응답하세요.\n\nURL: ${shopUrl}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n{"industry":"업종 (예: 패션, 뷰티, 식품, 잡화 등)","target":"타겟 고객","tone":"톤앤매너","keywords":["핵심키워드1","핵심키워드2","핵심키워드3"],"summary":"한 줄 소개"}`;

  let rawResponse = '';
  try {
    rawResponse = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean e-commerce analyst. Always respond with valid JSON only, no markdown, no explanation.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e) {
    console.error('[AI/identity] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable' }, 503);
  }

  // AI 응답 파싱 (방어 코드)
  let identity: Record<string, unknown> = {};
  try {
    // 마크다운 코드 블록 제거 후 파싱
    const cleaned = rawResponse.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      identity = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    }
  } catch (e) {
    console.warn('[AI/identity] Failed to parse AI response:', rawResponse);
    // 파싱 실패 시 raw 텍스트를 summary로 저장
    identity = { summary: rawResponse.slice(0, 200), parse_error: true };
  }

  // shops 테이블에 저장
  await c.env.DB.prepare(
    'UPDATE shops SET shop_identity = ?, updated_at = datetime(\'now\') WHERE shop_id = ?'
  ).bind(JSON.stringify(identity), body.shop_id).run();

  return c.json({ success: true, identity });
});

// ═══════════════════════════════════════════════════════════════
// POST /briefing — 주간 AI 브리핑 생성
// ═══════════════════════════════════════════════════════════════
ai.post('/briefing', async (c) => {
  const ownerId = c.get('ownerId');
  let body: { shop_id?: string } = {};
  try { body = await c.req.json<{ shop_id?: string }>(); } catch { /* ignore */ }

  if (!body.shop_id) {
    return c.json({ error: 'bad_request', message: 'shop_id is required' }, 400);
  }

  const shop = await getOwnedShop(c.env.DB, body.shop_id, ownerId) as Record<string, unknown> | null;
  if (!shop) {
    return c.json({ error: 'not_found', message: 'Shop not found' }, 404);
  }

  // 최근 7일 통계 조회
  const statsRows = await c.env.DB.prepare(`
    SELECT
      provider,
      action,
      COUNT(*) AS cnt
    FROM login_stats
    WHERE shop_id = ?
      AND created_at >= datetime('now', '-7 days')
    GROUP BY provider, action
    ORDER BY cnt DESC
  `).bind(body.shop_id).all();

  const stats = statsRows.results as Array<{ provider: string; action: string; cnt: number }>;

  // 통계 요약 텍스트 생성
  const statSummary = stats.length > 0
    ? stats.map(r => `${r.provider} ${r.action}: ${r.cnt}건`).join(', ')
    : '최근 7일 데이터 없음';

  // 쇼핑몰 정체성 파싱
  let identityText = '정보 없음';
  if (shop.shop_identity) {
    try {
      const id = JSON.parse(shop.shop_identity as string) as Record<string, unknown>;
      identityText = `업종: ${id.industry ?? ''}, 타겟: ${id.target ?? ''}, 톤: ${id.tone ?? ''}`;
    } catch {
      identityText = String(shop.shop_identity).slice(0, 200);
    }
  }

  const shopName = String(shop.shop_name ?? '쇼핑몰');

  const prompt = `당신은 한국 이커머스 전문 마케터입니다. 아래 데이터를 기반으로 쇼핑몰 운영자에게 도움이 되는 주간 브리핑을 작성하세요.

쇼핑몰: ${shopName}
쇼핑몰 정보: ${identityText}
최근 7일 소셜 로그인/가입 통계: ${statSummary}

브리핑에 포함할 내용:
1. 주간 성과 요약 (1-2문장)
2. 눈에 띄는 패턴 또는 인사이트 (있으면)
3. 다음 주 추천 액션 1-2가지

친근하고 실용적인 톤으로, 300자 내외로 작성하세요.`;

  let briefing = '';
  try {
    briefing = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean e-commerce marketing advisor. Respond in Korean, concise and actionable.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e) {
    console.error('[AI/briefing] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable' }, 503);
  }

  return c.json({
    success: true,
    briefing: briefing.trim(),
    period: '최근 7일',
    stats,
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /copy — 맥락 카피 생성 (월 10회 제한)
// ═══════════════════════════════════════════════════════════════
ai.post('/copy', async (c) => {
  const ownerId = c.get('ownerId');
  interface CopyBody { shop_id?: string; context?: string; tone_override?: string; }
  let body: CopyBody = {};
  try { body = await c.req.json<CopyBody>(); } catch { /* ignore */ }

  if (!body.shop_id || !body.context) {
    return c.json({ error: 'bad_request', message: 'shop_id and context are required' }, 400);
  }

  const shop = await getOwnedShop(c.env.DB, body.shop_id, ownerId) as Record<string, unknown> | null;
  if (!shop) {
    return c.json({ error: 'not_found', message: 'Shop not found' }, 404);
  }

  // 월 10회 사용량 제한 (KV: key = "ai_copy:{shop_id}:YYYY-MM")
  const now = new Date();
  const monthKey = `ai_copy:${body.shop_id}:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const currentUsage = parseInt((await c.env.KV.get(monthKey)) ?? '0', 10);
  const MONTHLY_LIMIT = 10;

  if (currentUsage >= MONTHLY_LIMIT) {
    return c.json({
      error: 'limit_exceeded',
      message: `월 AI 카피 생성은 ${MONTHLY_LIMIT}회까지 가능합니다. 다음 달에 초기화됩니다.`,
      usage: currentUsage,
      limit: MONTHLY_LIMIT,
    }, 429);
  }

  // 쇼핑몰 정체성 파싱
  let identityText = '';
  if (shop.shop_identity) {
    try {
      const id = JSON.parse(shop.shop_identity as string) as Record<string, unknown>;
      identityText = `업종: ${id.industry ?? ''}, 타겟: ${id.target ?? ''}, 톤앤매너: ${id.tone ?? ''}, 키워드: ${(id.keywords as string[] ?? []).join(', ')}`;
    } catch {
      identityText = String(shop.shop_identity).slice(0, 200);
    }
  }

  const tone = body.tone_override || '쇼핑몰의 기존 톤앤매너 유지';
  const shopName = String(shop.shop_name ?? '쇼핑몰');

  const prompt = `한국 온라인 쇼핑몰의 마케팅 카피를 작성해주세요.

쇼핑몰: ${shopName}
${identityText ? `쇼핑몰 정보: ${identityText}` : ''}
사용 목적: ${body.context}
톤: ${tone}

요청사항:
- 짧고 임팩트 있는 카피 3가지 제안
- 각 카피는 한 줄로 (최대 30자)
- 이모지 사용 가능

JSON으로만 응답: {"copies":["카피1","카피2","카피3"]}`;

  let rawResponse = '';
  try {
    rawResponse = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean copywriter. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e) {
    console.error('[AI/copy] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable' }, 503);
  }

  // 파싱
  let copies: string[] = [];
  try {
    const cleaned = rawResponse.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as { copies?: string[] };
      copies = parsed.copies ?? [];
    }
  } catch {
    // 파싱 실패 시 줄바꿈 기준으로 분리 시도
    copies = rawResponse
      .split('\n')
      .map(l => l.replace(/^[-\d.\s*]+/, '').trim())
      .filter(l => l.length > 0 && l.length <= 50)
      .slice(0, 3);
  }

  // 사용량 증가 (다음 달 초까지 TTL 설정)
  const nextMonth = new Date(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  const ttlSeconds = Math.floor((nextMonth.getTime() - now.getTime()) / 1000);
  await c.env.KV.put(monthKey, String(currentUsage + 1), { expirationTtl: ttlSeconds });

  return c.json({
    success: true,
    copies,
    usage: currentUsage + 1,
    limit: MONTHLY_LIMIT,
    remaining: MONTHLY_LIMIT - (currentUsage + 1),
  });
});

// ═══════════════════════════════════════════════════════════════
// POST /escalation-copy — 에스컬레이션 단계별 메시지 생성
// ═══════════════════════════════════════════════════════════════
ai.post('/escalation-copy', async (c) => {
  const ownerId = c.get('ownerId');
  let body: { shop_id?: string } = {};
  try { body = await c.req.json<{ shop_id?: string }>(); } catch { /* ignore */ }

  if (!body.shop_id) {
    return c.json({ error: 'bad_request', message: 'shop_id is required' }, 400);
  }

  const shop = await getOwnedShop(c.env.DB, body.shop_id, ownerId) as Record<string, unknown> | null;
  if (!shop) {
    return c.json({ error: 'not_found', message: 'Shop not found' }, 404);
  }

  // 쇼핑몰 정체성 파싱
  let identityText = '';
  let industryHint = '쇼핑몰';
  if (shop.shop_identity) {
    try {
      const id = JSON.parse(shop.shop_identity as string) as Record<string, unknown>;
      industryHint = String(id.industry ?? '쇼핑몰');
      identityText = `업종: ${id.industry ?? ''}, 타겟: ${id.target ?? ''}, 톤앤매너: ${id.tone ?? ''}`;
    } catch {
      identityText = String(shop.shop_identity).slice(0, 200);
    }
  }

  const shopName = String(shop.shop_name ?? '쇼핑몰');

  const prompt = `한국 온라인 쇼핑몰의 재방문 비회원 에스컬레이션 메시지를 작성해주세요.

쇼핑몰: ${shopName} (${industryHint})
${identityText ? `쇼핑몰 정보: ${identityText}` : ''}

에스컬레이션 단계별 메시지:
- visit_2: 2번째 방문자에게 부드럽게 안내하는 토스트 메시지 (1줄, 최대 25자, 이모지 포함 권장)
- visit_3_plus: 3회 이상 방문자에게 적극적으로 가입 유도하는 플로팅 배너 메시지 (최대 30자, 혜택 강조)

JSON으로만 응답: {"visit_2":"메시지","visit_3_plus":"메시지"}`;

  let rawResponse = '';
  try {
    rawResponse = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean e-commerce UX copywriter. Respond with valid JSON only.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e) {
    console.error('[AI/escalation-copy] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable' }, 503);
  }

  // 파싱 (방어 코드)
  let messages: { visit_2: string; visit_3_plus: string } = {
    visit_2: `이미 2번째 방문이에요 :) 가입하고 혜택 받아보세요!`,
    visit_3_plus: `회원가입하면 특별 혜택!`,
  };

  try {
    const cleaned = rawResponse.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      const parsed = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as typeof messages;
      if (parsed.visit_2) messages.visit_2 = parsed.visit_2;
      if (parsed.visit_3_plus) messages.visit_3_plus = parsed.visit_3_plus;
    }
  } catch {
    console.warn('[AI/escalation-copy] Parse failed, using defaults');
  }

  return c.json({ success: true, messages });
});

export default ai;
