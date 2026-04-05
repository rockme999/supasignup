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
export async function callAI(
  env: Env,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  // Workers AI 바인딩이 사용 가능한 경우 직접 호출
  if (env.AI) {
    try {
      // Kimi K2.5 우선, 실패 시 Gemma 4 fallback
      const models = ['@cf/moonshotai/kimi-k2.5', '@cf/google/gemma-4-26b-a4b-it'];
      let result: AiTextResponse | null = null;
      let usedModel = '';
      for (const model of models) {
        try {
          result = await env.AI.run(model, { messages }) as AiTextResponse;
          usedModel = model;
          break;
        } catch (modelErr: any) {
          console.warn(`[AI] ${model} failed:`, modelErr?.message || modelErr);
          // 마지막 모델이면 에러 상세를 throw
          if (model === models[models.length - 1]) {
            throw new Error(`All models failed. Last error (${model}): ${modelErr?.message || String(modelErr)}`);
          }
        }
      }
      if (!result) {
        throw new Error('All AI models failed. Check Cloudflare Workers AI dashboard for model availability.');
      }
      // Workers AI 응답 형식 대응: OpenAI chat completion 또는 단순 response
      let text = '';
      if (typeof result === 'string') {
        text = result;
      } else if (result?.response) {
        text = result.response;
      } else if (result?.result?.response) {
        text = result.result.response;
      } else if ((result as any)?.choices?.[0]?.message?.content) {
        // OpenAI-compatible chat completion format (Kimi K2.5 등)
        text = (result as any).choices[0].message.content;
      }
      if (text) return text;
      // 빈 응답이면 에러로 처리 (결과 상세 포함)
      throw new Error(`Workers AI (${usedModel}) returned empty response. Raw result: ${JSON.stringify(result)?.substring(0, 300)}`);
    } catch (e: any) {
      console.error('[AI] Workers AI binding error:', e?.message || e);
      // AI 바인딩이 있는데 모델 호출 실패 → 에러를 그대로 전파 (fallback 안 함)
      throw new Error(`Workers AI error: ${e?.message || String(e)}`);
    }
  } else {
    console.warn('[AI] env.AI binding is not available');
  }

  // 폴백: REST API 방식 (CF_ACCOUNT_ID, CF_AI_TOKEN 환경변수 필요)
  if (env.CF_ACCOUNT_ID && env.CF_AI_TOKEN) {
    console.log('[AI] Trying REST API fallback...');
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

    console.log('[AI] REST API status:', resp.status);
    const data = await resp.json() as { result?: { response?: string }; errors?: unknown[] };
    console.log('[AI] REST API response:', JSON.stringify(data)?.substring(0, 500));

    if (!resp.ok) {
      throw new Error(`AI REST API error: ${resp.status} ${JSON.stringify(data?.errors)}`);
    }

    return data?.result?.response ?? '';
  }

  const envKeys = Object.keys(env).filter(k => !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN') && !k.includes('PRIVATE') && !k.includes('PASSWORD'));
  console.error('[AI] No AI backend available: env.AI =', !!env.AI, 'CF_ACCOUNT_ID =', !!env.CF_ACCOUNT_ID, 'envKeys =', envKeys);
  throw new Error(`AI binding not available. env.AI=${!!env.AI}, envKeys=[${envKeys.join(',')}]`);
}

// ─── AI 일일 호출 제한 헬퍼 ──────────────────────────────────
// 반환값: true = 호출 허용, false = 한도 초과
async function checkAiRateLimit(env: Env, shopId: string, endpoint: string, dailyLimit: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const key = `ai_rate:${shopId}:${endpoint}:${today}`;
  const current = await env.KV.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= dailyLimit) return false;
  await env.KV.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}

// ─── shop 소유권 검증 헬퍼 ────────────────────────────────────
async function getOwnedShop(db: D1Database, shopId: string, ownerId: string) {
  const shop = await db.prepare(
    'SELECT * FROM shops WHERE shop_id = ? AND owner_id = ? AND deleted_at IS NULL'
  ).bind(shopId, ownerId).first();
  return shop;
}

// ═══════════════════════════════════════════════════════════════
// GET /identity — 기존 정체성 분석 결과 조회
// ═══════════════════════════════════════════════════════════════
ai.get('/identity', async (c) => {
  const ownerId = c.get('ownerId');
  const shopId = c.req.query('shop_id');
  if (!shopId) {
    return c.json({ error: 'bad_request', message: 'shop_id is required' }, 400);
  }

  const shop = await getOwnedShop(c.env.DB, shopId, ownerId) as Record<string, unknown> | null;
  if (!shop) {
    return c.json({ error: 'not_found' }, 404);
  }

  if (!shop.shop_identity) {
    return c.json({ identity: null });
  }

  try {
    return c.json({ identity: JSON.parse(shop.shop_identity as string) });
  } catch {
    return c.json({ identity: null });
  }
});

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

  // 일일 호출 제한: 3회
  const allowed = await checkAiRateLimit(c.env, body.shop_id, 'identity', 10);
  if (!allowed) {
    return c.json({ error: 'ai_rate_limit', message: '일일 호출 한도에 도달했습니다.' }, 429);
  }

  const shopUrl = (shop.shop_url as string) || (shop.mall_id ? `https://${shop.mall_id}.cafe24.com` : '');
  if (!shopUrl) {
    return c.json({ error: 'bad_request', message: 'Shop URL is not configured' }, 400);
  }

  // 쇼핑몰 HTML에서 의미 있는 콘텐츠 추출
  let htmlSnippet = '';
  try {
    const pageResp = await fetch(shopUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BunGaeBot/1.0)' },
      signal: AbortSignal.timeout(8000),
    });

    if (pageResp.ok) {
      const fullText = await pageResp.text();
      // 스크립트/스타일 태그 제거 후 의미 있는 콘텐츠 추출
      const cleaned = fullText
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

      // 메타태그 추출
      const titleMatch = fullText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const metaDesc = fullText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
      const metaKeywords = fullText.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)/i);
      const ogTitle = fullText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)/i);
      const ogDesc = fullText.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i);

      // 본문 텍스트 추출 (태그 제거)
      const bodyMatch = cleaned.match(/<body[\s\S]*?<\/body>/i);
      const bodyText = bodyMatch
        ? bodyMatch[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
        : '';

      // AI에게 보낼 요약 구성
      const parts = [
        `URL: ${shopUrl}`,
        titleMatch ? `페이지 제목: ${titleMatch[1].trim()}` : '',
        metaDesc ? `메타 설명: ${metaDesc[1]}` : '',
        metaKeywords ? `메타 키워드: ${metaKeywords[1]}` : '',
        ogTitle ? `OG 제목: ${ogTitle[1]}` : '',
        ogDesc ? `OG 설명: ${ogDesc[1]}` : '',
        bodyText ? `본문 텍스트 (일부): ${bodyText}` : '',
      ].filter(Boolean);

      htmlSnippet = parts.join('\n');
      console.log(`[AI/identity] Extracted content length: ${htmlSnippet.length}`);
    }
  } catch (e) {
    console.warn('[AI/identity] Failed to fetch shop URL:', shopUrl, e);
  }

  // 카페24 Admin API로 상품 정보 가져오기 (최대 5개)
  let productInfo = '';
  if (shop.platform_access_token) {
    try {
      const { decryptShopTokens } = await import('../db/queries');
      const tokens = await decryptShopTokens(shop as any, c.env.ENCRYPTION_KEY);
      if (tokens.access_token) {
        const mallId = shop.mall_id as string;
        const prodResp = await fetch(
          `https://${mallId}.cafe24api.com/api/v2/admin/products?limit=5&fields=product_name,price,summary_description,simple_description`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
              'X-Cafe24-Api-Version': '2026-03-01',
            },
            signal: AbortSignal.timeout(5000),
          }
        );
        if (prodResp.ok) {
          const prodData = await prodResp.json() as { products?: Array<{ product_name?: string; price?: string; summary_description?: string }> };
          if (prodData.products?.length) {
            productInfo = '\n상품 목록:\n' + prodData.products.map((p, i) =>
              `${i + 1}. ${p.product_name || '-'} (${p.price || '-'}원) ${p.summary_description || ''}`
            ).join('\n');
          }
        }
      }
    } catch (e) {
      console.warn('[AI/identity] 상품 정보 조회 실패:', e);
    }
  }

  // 쇼핑몰 정보 기반 분석 프롬프트
  const jsonFormat = '{"industry":"업종 (예: 패션, 뷰티, 식품, 잡화 등)","target":"타겟 고객 (예: 20-30대 여성)","tone":"톤앤매너 (예: 친근하고 캐주얼)","keywords":["키워드1","키워드2","키워드3"],"summary":"한 줄 소개"}';
  const prompt = htmlSnippet
    ? `다음은 한국 쇼핑몰에서 추출한 정보입니다. 이 쇼핑몰의 정체성을 분석하여 JSON으로만 응답하세요.\n\n${htmlSnippet}${productInfo}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n${jsonFormat}`
    : `URL만으로 한국 쇼핑몰을 추론하여 JSON으로만 응답하세요.\n\nURL: ${shopUrl}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n${jsonFormat}`;

  let rawResponse = '';
  try {
    rawResponse = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean e-commerce analyst. Always respond with valid JSON only, no markdown, no explanation.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e: any) {
    console.error('[AI/identity] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable', detail: e?.message || String(e) }, 503);
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

  // 일일 호출 제한: 5회
  const allowed = await checkAiRateLimit(c.env, body.shop_id, 'briefing', 5);
  if (!allowed) {
    return c.json({ error: 'ai_rate_limit', message: '일일 호출 한도에 도달했습니다.' }, 429);
  }

  // 최근 7일 통계 + 이전 7일 통계 (비교용)
  const [statsRows, prevStatsRows] = await Promise.all([
    c.env.DB.prepare(`
      SELECT provider, action, COUNT(*) AS cnt
      FROM login_stats
      WHERE shop_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY provider, action ORDER BY cnt DESC
    `).bind(body.shop_id).all(),
    c.env.DB.prepare(`
      SELECT provider, action, COUNT(*) AS cnt
      FROM login_stats
      WHERE shop_id = ? AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      GROUP BY provider, action ORDER BY cnt DESC
    `).bind(body.shop_id).all(),
  ]);

  const stats = statsRows.results as Array<{ provider: string; action: string; cnt: number }>;
  const prevStats = prevStatsRows.results as Array<{ provider: string; action: string; cnt: number }>;

  const statSummary = stats.length > 0
    ? stats.map(r => `${r.provider} ${r.action}: ${r.cnt}건`).join(', ')
    : '최근 7일 데이터 없음';
  const prevStatSummary = prevStats.length > 0
    ? prevStats.map(r => `${r.provider} ${r.action}: ${r.cnt}건`).join(', ')
    : '이전 7일 데이터 없음';

  // 쇼핑몰 정체성 + 회원혜택 전체 파싱
  let identityText = '정보 없음';
  let benefitsText = '설정된 혜택 없음';
  if (shop.shop_identity) {
    try {
      const id = JSON.parse(shop.shop_identity as string) as Record<string, unknown>;
      identityText = `업종: ${id.industry ?? '미설정'}, 타겟: ${id.target ?? '미설정'}, 톤앤매너: ${id.tone ?? '미설정'}, 키워드: ${Array.isArray(id.keywords) ? (id.keywords as string[]).join(', ') : '없음'}, 소개: ${id.summary ?? '없음'}`;
      const benefits: string[] = [];
      if (id.coupon_benefit) benefits.push(`쿠폰: ${id.coupon_benefit}`);
      if (id.free_shipping) benefits.push(`무료배송: ${id.free_shipping}`);
      if (Array.isArray(id.extra_benefits) && (id.extra_benefits as string[]).length > 0) benefits.push(`추가혜택: ${(id.extra_benefits as string[]).join(', ')}`);
      if (benefits.length > 0) benefitsText = benefits.join(' / ');
    } catch {
      identityText = String(shop.shop_identity).slice(0, 300);
    }
  }

  // 쿠폰 설정 파싱
  let couponText = '쿠폰 미설정';
  if (shop.coupon_config) {
    try {
      const cc = JSON.parse(shop.coupon_config as string) as { enabled: boolean; coupons: Array<{ coupon_name?: string; discount_amount?: number }> };
      if (cc.enabled && cc.coupons?.length > 0) {
        couponText = cc.coupons.map(c => `${c.coupon_name ?? '쿠폰'}${c.discount_amount ? ` ${c.discount_amount}원` : ''}`).join(', ');
      }
    } catch { /* ignore */ }
  }

  // 이전 보고서 참조 (최신 1건)
  const prevBriefing = await c.env.DB.prepare(
    `SELECT performance, strategy, actions, created_at FROM ai_briefings
     WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(body.shop_id).first<{ performance: string; strategy: string; actions: string; created_at: string }>();

  let prevBriefingText = '이전 보고서 없음 (첫 보고서)';
  if (prevBriefing) {
    let prevActions: string[] = [];
    try { prevActions = JSON.parse(prevBriefing.actions); } catch { /* ignore */ }
    prevBriefingText = `[${prevBriefing.created_at}] 성과: ${prevBriefing.performance} / 전략: ${prevBriefing.strategy} / 액션: ${prevActions.join(', ')}`;
  }

  const shopName = String(shop.shop_name ?? '쇼핑몰');

  const prompt = `당신은 "번개가입" 앱의 AI 어드바이저입니다. 번개가입은 카페24 쇼핑몰에 소셜 로그인(구글, 카카오, 네이버 등)을 통한 1클릭 회원가입 기능을 제공하는 서비스입니다.

아래 데이터를 기반으로 쇼핑몰 운영자에게 주간 브리핑을 작성하세요.

■ 쇼핑몰 기본 정보
- 이름: ${shopName}
- ${identityText}

■ 회원가입 혜택 설정
- ${benefitsText}
- 쿠폰 발급: ${couponText}

■ 이번 주 소셜 로그인/가입 통계 (최근 7일)
${statSummary}

■ 지난 주 통계 (이전 7일, 비교용)
${prevStatSummary}

■ 이전 보고서
${prevBriefingText}

■ 작성 규칙
1. "데이터 기반 분석"과 "AI 의견/제안"을 명확히 구분하세요.
2. 번개가입 앱의 범위(소셜 로그인, 회원가입 전환, 쿠폰 발급) 안에서 실행 가능한 액션만 제안하세요.
3. 이전 보고서가 있으면 변화 추이를 언급하세요.
4. 통계가 없으면 "데이터 부족"이라 쓰고, 억지로 분석하지 마세요.

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "performance": "지난주 성과 요약 — 데이터 기반 사실만 (2-3줄)",
  "strategy": "이번 주 전략 — 번개가입 기능 범위 내 제안 (2-3줄)",
  "actions": ["실행 가능한 액션 1", "실행 가능한 액션 2", "실행 가능한 액션 3"],
  "insight": "AI 의견 — 앱 범위 밖의 참고사항이나 트렌드 (1-2줄, 없으면 빈 문자열)"
}`;

  let rawBriefing = '';
  try {
    rawBriefing = await callAI(c.env, [
      { role: 'system', content: 'You are a Korean e-commerce marketing advisor. Always respond with valid JSON only, no markdown, no explanation.' },
      { role: 'user', content: prompt },
    ]);
  } catch (e) {
    console.error('[AI/briefing] AI call failed:', e);
    return c.json({ error: 'ai_error', message: 'AI service unavailable' }, 503);
  }

  // AI 응답에서 JSON 추출 및 구조화
  let parsed: { performance: string; strategy: string; actions: string[]; insight?: string } | null = null;
  try {
    const jsonMatch = rawBriefing.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch {
    console.warn('[AI/briefing] Failed to parse AI response:', rawBriefing);
  }

  if (!parsed || !parsed.performance) {
    parsed = {
      performance: rawBriefing.trim(),
      strategy: '',
      actions: [],
      insight: '',
    };
  }

  // DB에 브리핑 저장
  const briefingId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO ai_briefings (id, shop_id, performance, strategy, actions, insight, stats_json, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'manual')`
  ).bind(
    briefingId,
    body.shop_id,
    parsed.performance,
    parsed.strategy,
    JSON.stringify(parsed.actions),
    parsed.insight ?? null,
    JSON.stringify(stats),
  ).run();

  return c.json({
    success: true,
    briefing: parsed,
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

  // 일일 호출 제한: 5회
  const allowed = await checkAiRateLimit(c.env, body.shop_id, 'escalation-copy', 5);
  if (!allowed) {
    return c.json({ error: 'ai_rate_limit', message: '일일 호출 한도에 도달했습니다.' }, 429);
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
