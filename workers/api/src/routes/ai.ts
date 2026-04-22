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
import { applyAiCopyToConfigs } from '../services/ai-copy';
import type { AiCopy } from '../services/ai-copy';

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
// 분석 + 저장 핵심 로직 (라우트와 백그라운드 트리거에서 공용)
// ═══════════════════════════════════════════════════════════════
export async function analyzeAndSaveShopIdentity(
  env: Env,
  shop: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const shopId = shop.shop_id as string;
  const shopUrl = (shop.shop_url as string) || (shop.mall_id ? `https://${shop.mall_id}.cafe24.com` : '');
  if (!shopUrl) {
    throw new Error('Shop URL is not configured');
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
      const cleaned = fullText
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<noscript[\s\S]*?<\/noscript>/gi, '');

      const titleMatch = fullText.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const metaDesc = fullText.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)/i);
      const metaKeywords = fullText.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)/i);
      const ogTitle = fullText.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)/i);
      const ogDesc = fullText.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']*)/i);

      const bodyMatch = cleaned.match(/<body[\s\S]*?<\/body>/i);
      const bodyText = bodyMatch
        ? bodyMatch[0].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 3000)
        : '';

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
      const tokens = await decryptShopTokens(shop as any, env.ENCRYPTION_KEY);
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

  const jsonFormat = '{"industry":"업종 (예: 패션, 뷰티, 식품, 잡화 등)","target":"타겟 고객 (예: 20-30대 여성)","tone":"톤앤매너 (예: 친근하고 캐주얼)","keywords":["키워드1","키워드2","키워드3"],"summary":"한 줄 소개"}';
  const prompt = htmlSnippet
    ? `다음은 한국 쇼핑몰에서 추출한 정보입니다. 이 쇼핑몰의 정체성을 분석하여 JSON으로만 응답하세요.\n\n${htmlSnippet}${productInfo}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n${jsonFormat}`
    : `URL만으로 한국 쇼핑몰을 추론하여 JSON으로만 응답하세요.\n\nURL: ${shopUrl}\n\n반드시 아래 JSON 형식으로만 응답 (다른 텍스트 없이):\n${jsonFormat}`;

  const rawResponse = await callAI(env, [
    { role: 'system', content: 'You are a Korean e-commerce analyst. Always respond with valid JSON only, no markdown, no explanation.' },
    { role: 'user', content: prompt },
  ]);

  let identity: Record<string, unknown> = {};
  try {
    const cleaned = rawResponse.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    const jsonStart = cleaned.indexOf('{');
    const jsonEnd = cleaned.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      identity = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1));
    }
  } catch (e) {
    console.warn('[AI/identity] Failed to parse AI response:', rawResponse);
  }

  // 의미 있는 필드(industry 또는 summary)가 없으면 저장하지 않고 실패 처리
  // — 빈 객체를 DB에 박으면 다음 백그라운드 진입에서 영구 잠김 (`!shop.shop_identity` false 처리)
  if (!identity.industry && !identity.summary) {
    throw new Error(`AI returned empty or invalid identity. Raw: ${rawResponse.slice(0, 200)}`);
  }

  await env.DB.prepare(
    'UPDATE shops SET shop_identity = ?, updated_at = datetime(\'now\') WHERE shop_id = ?'
  ).bind(JSON.stringify(identity), shopId).run();

  return identity;
}

// ═══════════════════════════════════════════════════════════════
// 백그라운드 트리거: 락 + 실패 카운터 + 토큰 포함 shop 조회
// dashboard 진입 시 c.executionCtx.waitUntil()로 호출됨
// ═══════════════════════════════════════════════════════════════
export async function maybeTriggerIdentityAnalysis(env: Env, shopId: string): Promise<void> {
  // 1. 실패 카운터 (3회 연속 실패 시 24시간 차단) — 무한 재시도 방지
  const failKey = `identity_fail:${shopId}`;
  const failCount = parseInt((await env.KV.get(failKey)) ?? '0', 10);
  if (failCount >= 3) return;

  // 2. 락 (TTL 120s) — 같은 사용자 새로고침/멀티탭 중복 호출 방지
  // 주의: KV get/put은 atomic이 아니므로 거의 동시 요청 시 드물게 중복 가능. 비용 미미해 감수.
  const lockKey = `identity_running:${shopId}`;
  if (await env.KV.get(lockKey)) return;

  // 3. shop 전체 + 토큰 조회 (이 시점에만 토큰 노출)
  const shop = await env.DB.prepare(
    `SELECT shop_id, mall_id, shop_url, shop_identity, platform_access_token, platform_refresh_token
     FROM shops WHERE shop_id = ? AND deleted_at IS NULL`
  ).bind(shopId).first<Record<string, unknown>>();
  if (!shop) return;

  // 4. 이미 의미 있는 identity가 있으면 스킵 (다른 경로가 먼저 채웠을 수 있음)
  const existing = shop.shop_identity as string | null;
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as Record<string, unknown>;
      if (parsed && (parsed.industry || parsed.summary)) return;
    } catch { /* 깨진 JSON이면 재분석 */ }
  }

  // 5. 락 설정 후 분석 실행
  await env.KV.put(lockKey, '1', { expirationTtl: 120 });

  try {
    await analyzeAndSaveShopIdentity(env, shop);
    // 성공 → 실패 카운터 리셋
    await env.KV.delete(failKey);
  } catch (err) {
    console.error(`[identity-bg] analysis failed for shop ${shopId}:`, err);
    // 실패 카운터 증가 (24시간 TTL — 누적 카운팅 윈도)
    await env.KV.put(failKey, String(failCount + 1), { expirationTtl: 86400 });
  }
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

  // 일일 호출 제한: 10회
  const allowed = await checkAiRateLimit(c.env, body.shop_id, 'identity', 10);
  if (!allowed) {
    return c.json({ error: 'ai_rate_limit', message: '일일 호출 한도에 도달했습니다.' }, 429);
  }

  try {
    const identity = await analyzeAndSaveShopIdentity(c.env, shop);
    return c.json({ success: true, identity });
  } catch (e: any) {
    console.error('[AI/identity] failed:', e);
    if (e?.message === 'Shop URL is not configured') {
      return c.json({ error: 'bad_request', message: e.message }, 400);
    }
    return c.json({ error: 'ai_error', message: 'AI service unavailable', detail: e?.message || String(e) }, 503);
  }
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
      const cc = JSON.parse(shop.coupon_config as string) as {
        shipping: { enabled: boolean; expire_days: number };
        amount: { enabled: boolean; expire_days: number; discount_amount: number; min_order: number };
        rate: { enabled: boolean; expire_days: number; discount_rate: number; min_order: number };
      };
      const couponParts: string[] = [];
      if (cc.shipping?.enabled) couponParts.push(`무료배송 쿠폰 (${cc.shipping.expire_days}일)`);
      if (cc.amount?.enabled) couponParts.push(`${cc.amount.discount_amount.toLocaleString()}원 할인 쿠폰 (${cc.amount.expire_days}일${cc.amount.min_order > 0 ? `, 최소 ${cc.amount.min_order.toLocaleString()}원` : ''})`);
      if (cc.rate?.enabled) couponParts.push(`${cc.rate.discount_rate}% 할인 쿠폰 (${cc.rate.expire_days}일${cc.rate.min_order > 0 ? `, 최소 ${cc.rate.min_order.toLocaleString()}원` : ''})`);
      couponText = couponParts.length > 0 ? couponParts.join(', ') : '쿠폰 미설정';
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
5. 금기어: "1초 가입", "1초가입" — 경쟁사 서비스명이므로 절대 사용 금지. 우리 서비스명은 "번개가입"입니다.

■ 추가로, 이 쇼핑몰의 정체성과 혜택에 맞는 마케팅 문구를 생성해주세요:
  - banner: 미니배너에 표시할 한 줄 문구 (30자 이내, 가입 유도)
  - toast: 재방문 고객에게 보여줄 토스트 메시지 (30자 이내, {n}은 방문횟수로 치환됨)
  - floating: 플로팅 배너 문구 (30자 이내, 가입 혜택 강조)
  - floatingBtn: 플로팅 배너 버튼 텍스트 (20자 이내)
  - popupTitle: 이탈 감지 팝업 제목 (20자 이내, 주의를 끄는 문구)
  - popupBody: 이탈 감지 팝업 본문 (100자 이내, 혜택과 긴급성 강조)
  - popupCta: 팝업 CTA 버튼 텍스트 (20자 이내)

반드시 다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{"performance":"지난주 성과 요약 — 데이터 기반 사실만 (2-3줄)","strategy":"이번 주 전략 — 번개가입 기능 범위 내 제안 (2-3줄)","actions":["실행 가능한 액션 1","실행 가능한 액션 2","실행 가능한 액션 3"],"insight":"AI 의견 — 앱 범위 밖의 참고사항이나 트렌드 (1-2줄, 없으면 빈 문자열)","copy":{"banner":"...","toast":"...","floating":"...","floatingBtn":"...","popupTitle":"...","popupBody":"...","popupCta":"..."}}`;

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
  let parsed: { performance: string; strategy: string; actions: string[]; insight?: string; copy?: AiCopy } | null = null;
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

  // AI 추천 문구 저장 + 자동 적용 처리
  if (parsed.copy) {
    const shopId = body.shop_id!;
    await c.env.DB.prepare(
      "UPDATE shops SET ai_suggested_copy = ?, updated_at = datetime('now') WHERE shop_id = ?"
    ).bind(JSON.stringify(parsed.copy), shopId).run();

    // 자동 적용이 켜져 있으면 각 config에 copy 반영
    let identity: Record<string, unknown> = {};
    try { identity = JSON.parse(String(shop.shop_identity ?? '{}')); } catch { /* ignore */ }
    if (identity.auto_apply_ai_copy) {
      await applyAiCopyToConfigs(
        c.env,
        {
          shop_id: shopId,
          client_id: String(shop.client_id),
          banner_config: shop.banner_config as string | null | undefined,
          popup_config: shop.popup_config as string | null | undefined,
          escalation_config: shop.escalation_config as string | null | undefined,
        },
        parsed.copy as AiCopy,
      );
    }
  }

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

// ═══════════════════════════════════════════════════════════════
// AI 문의 자동답변 — 프롬프트 조립 및 헬퍼 함수
// 설계 명세: docs/ai-assistant/prompt-kimi-reply.md
// ═══════════════════════════════════════════════════════════════

import { KB_PUBLIC } from '../ai-context/kb-public';
import { FAQ } from '../ai-context/faq';
import { PRIVACY } from '../ai-context/privacy';
import { USAGE_GUIDE } from '../ai-context/usage-guide';

// 프롬프트 버전 및 모델 상수
export const PROMPT_VERSION = 'v1.2-2026-04-22';
export const AI_MODEL = '@cf/moonshotai/kimi-k2.5';

/**
 * 문의 답변 메시지 조립
 * prompt-kimi-reply.md 섹션 1-2의 buildInquiryReplyMessages 명세 구현
 */
function buildInquiryReplyMessages(params: {
  shop: { mall_id: string; shop_name: string; plan: string };
  inquiry: { title: string; content: string };
  autoMode: boolean;
}): Array<{ role: string; content: string }> {
  const { shop, inquiry, autoMode } = params;

  const systemPrompt = [
    `<role>
당신은 번개가입(카페24 공식 소셜 로그인 앱) 고객지원 AI입니다.
카페24 쇼핑몰 운영자에게 답변을 작성합니다.
</role>`,

    `<kb_public>\n${KB_PUBLIC}\n</kb_public>`,
    `<faq_full>\n${FAQ}\n</faq_full>`,
    `<usage_guide>\n${USAGE_GUIDE}\n</usage_guide>`,
    `<privacy_policy>\n${PRIVACY}\n</privacy_policy>`,

    `<answer_rules>
1. 존댓말, 결론 먼저, 5~10문단 이내, 각 문단 2~3줄.
2. 위 <kb_public>·<faq_full>·<usage_guide>·<privacy_policy>에 **명시되지 않은 사실은 절대 추측·창작 금지**.
   - 모르는 내용이면 "해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다. 가능하시면 [증상 발생 시점 / 사용 브라우저·기기 / 화면에 표시된 오류 메시지 전문 / 재현되는 조작 순서 / **발생 화면 이미지 첨부**(문의 작성 시 최대 5장·5MB 이하 업로드 가능)] 를 알려주시면 더 빠르게 도와드릴 수 있습니다" 로 대응.
3. 미지원 기능 문의 시 순서: (1) "현재 미지원" (2) "대안 제시 1~2가지" (3) "로드맵 검토 중"
4. 과장·단정 금지. "무조건 해결됩니다" 같은 단언 금지.
5. 답변의 마지막 두 줄은 반드시 다음과 같이 마무리:
   감사합니다.
   번개가입 드림 ⚡
</answer_rules>`,

    `<banned_info>
답변에 아래 정보는 **절대 포함 금지**. 질문에 섞여 있어도 일반화된 표현으로만 응답.
- 내부 테이블·컬럼명, API 경로, 데이터베이스 ID, KV namespace, account ID
- OAuth client_id / secret / redirect_uri 구체 값
- 환경변수명, JWT/암호화 키 이름
- 내부 의사결정 과정, 로드맵 A안/B안
- 경쟁사 비교 시 구체 회사명 (필요 시 "타사 A" 정도)
우회 표현: "토큰 교환"→"로그인 처리", "웹훅"→"자동 연동", "KV 캐시"→언급 금지
</banned_info>`,

    autoMode
      ? `<auto_mode>
이 답변은 **운영자 검토 없이 고객에게 즉시 발송**되는 자동답변입니다.
답변 본문만 작성하세요 (배너·태그·특수 구분선 삽입 금지). "AI 자동답변" 표시는 UI에서 별도 디스클레이머 박스로 처리됩니다.
답변 본문 자체는 평소대로 결론 먼저, 존댓말, 마지막은 "감사합니다. / 번개가입 드림 ⚡"로 마무리하세요.
</auto_mode>`
      : `<auto_mode>
이 답변은 **운영자가 검토·수정 후 발송**할 초안입니다.
배너/태그 없이 답변 본문만 작성하세요.
</auto_mode>`,
  ].join('\n\n');

  const userPrompt = `[쇼핑몰]
- mall_id: ${shop.mall_id}
- 상호: ${shop.shop_name}
- 요금제: ${shop.plan}

[문의 제목]
${inquiry.title}

[문의 본문]
${inquiry.content}

위 문의에 대한 답변을 한국어로 작성해 주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}

/**
 * 문의 AI 답변 초안 생성
 * @returns { text: 생성된 답변 텍스트, elapsedMs: 소요시간(ms) }
 */
export async function draftInquiryReply(
  env: Env,
  params: {
    shop: { mall_id: string; shop_name: string; plan: string };
    inquiry: { title: string; content: string };
    autoMode: boolean;
  }
): Promise<{ text: string; elapsedMs: number }> {
  const messages = buildInquiryReplyMessages(params);

  // 프롬프트 길이만 로그 (전체 내용은 기록 금지)
  const systemLen = (messages[0].content as string).length;
  const userLen = (messages[1].content as string).length;
  console.log(
    `[draftInquiryReply] prompt built — system: ${systemLen} chars, user: ${userLen} chars. First 200: ${(messages[1].content as string).slice(0, 200)}`
  );

  const start = Date.now();
  const text = await callAI(env, messages);
  const elapsedMs = Date.now() - start;

  console.log(`[draftInquiryReply] AI responded in ${elapsedMs}ms, output length: ${text.length}`);

  return { text, elapsedMs };
}

/**
 * 후처리 휴리스틱 — prompt-kimi-reply.md 섹션 2-1
 * 생성된 답변에 금지 토큰이 없는지, 마무리 문구가 있는지 검증
 */
export function validateReply(text: string): { ok: boolean; reason?: string } {
  // 길이 체크
  if (text.trim().length < 50) return { ok: false, reason: 'too_short' };
  if (text.trim().length > 3000) return { ok: false, reason: 'too_long' };

  // 금지 토큰 체크
  const banned = [
    /\/api\/(supadmin|dashboard|widget|oauth)\//,  // 내부 경로
    /database_id|account_id|KV\s*namespace/i,
    /client_secret|JWT_SECRET|ENCRYPTION_KEY/,
    /CREATE TABLE|ALTER TABLE|SELECT\s+.*FROM/i,
    /shop_id['":]?\s*['"][0-9a-f-]{8,}/i,  // UUID 노출
  ];
  for (const pat of banned) {
    if (pat.test(text)) return { ok: false, reason: `banned_token: ${pat}` };
  }

  // 마무리 문구 체크
  if (!text.includes('번개가입 드림')) return { ok: false, reason: 'missing_signature' };

  return { ok: true };
}

/**
 * 자동 발송 skip 조건 — prompt-kimi-reply.md 섹션 2-2
 * 답변에 리뷰가 필요한 문구가 포함되면 true 반환 (자동 발송 중단)
 */
export function shouldHoldForReview(text: string): boolean {
  const reviewKeywords = [
    '확인 후 안내',
    '운영팀이 확인',
    '오류 메시지 전문',
    '재현되는 조작',
    '정확히 특정',
    '추가 정보',
  ];
  return reviewKeywords.some(k => text.includes(k));
}

/**
 * 문의 AI 자동답변 실행 (Phase 4+ — 글로벌 자동 발송 + 실패 로그 + 1회 재시도)
 * dashboard POST /inquiries 직후 c.executionCtx.waitUntil()로 호출됨.
 * 실패해도 pending 상태 유지 → 운영자 수동 처리.
 * 실패 이력은 ai_auto_reply_failures 테이블에 영구 기록.
 */
export async function autoReplyInquiry(env: Env, inquiryId: string, attempt: number = 1): Promise<void> {
  try {
    // 1. 문의 로드 (status='pending' 조건 — race 방지)
    const inquiry = await env.DB.prepare(
      'SELECT id, shop_id, title, content FROM inquiries WHERE id = ? AND status = ?'
    ).bind(inquiryId, 'pending').first<{ id: string; shop_id: string; title: string; content: string }>();
    if (!inquiry) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'inquiry_not_found', null, null);
      return;
    }

    // 2. shop 로드
    const shop = await env.DB.prepare(
      'SELECT shop_id, mall_id, shop_name, plan FROM shops WHERE shop_id = ?'
    ).bind(inquiry.shop_id).first<{ shop_id: string; mall_id: string; shop_name: string | null; plan: string }>();
    if (!shop) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'shop_not_found', null, null);
      return;
    }

    // 3. AI 호출 (실패 시 ai_error 기록 + 첫 시도면 3초 후 1회 재시도)
    let text: string;
    let elapsedMs: number;
    try {
      const result = await draftInquiryReply(env, {
        shop: { mall_id: shop.mall_id, shop_name: shop.shop_name ?? shop.mall_id, plan: shop.plan },
        inquiry: { title: inquiry.title, content: inquiry.content },
        autoMode: true,
      });
      text = result.text;
      elapsedMs = result.elapsedMs;
    } catch (e: any) {
      const errMsg = (e?.message || String(e)).slice(0, 1000); // 너무 길면 자름
      await logAutoReplyFailure(env, inquiryId, attempt, 'ai_error', errMsg, null);
      if (attempt === 1) {
        console.log(`[auto-reply] retry ${inquiryId} (attempt 2) after ai_error`);
        // 짧은 대기로 일시적 이슈 회복 기회 제공 (Workers AI 내부 load balancing 등)
        await new Promise(r => setTimeout(r, 3000));
        await autoReplyInquiry(env, inquiryId, 2);
      }
      return;
    }

    // 4. 가드레일 1: validateReply (금지 토큰, 길이, 서명)
    const validation = validateReply(text);
    if (!validation.ok) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'validation_failed', validation.reason ?? null, elapsedMs);
      if (attempt === 1) {
        console.log(`[auto-reply] retry ${inquiryId} (attempt 2) after validation_failed: ${validation.reason}`);
        await new Promise(r => setTimeout(r, 3000));
        await autoReplyInquiry(env, inquiryId, 2);
      }
      return;
    }

    // 5. 가드레일 2: shouldHoldForReview (리스크 키워드)
    // → 의도된 skip. 재시도해도 같은 결과 예상 → 재시도 안 함.
    if (shouldHoldForReview(text)) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'held_for_review', 'keyword_match', elapsedMs);
      console.log(`[auto-reply] held_for_review ${inquiryId} — 운영자 수동 처리`);
      return;
    }

    // 6. UPDATE (WHERE status='pending' 로 race 방지)
    await env.DB.prepare(
      `UPDATE inquiries
       SET reply = ?, status = 'auto_replied', replied_at = datetime('now'),
           updated_at = datetime('now'),
           ai_prompt_version = ?, ai_model = ?, ai_elapsed_ms = ?
       WHERE id = ? AND status = 'pending'`
    ).bind(text, PROMPT_VERSION, AI_MODEL, elapsedMs, inquiryId).run();

    console.log(`[auto-reply] ✅ sent for ${inquiryId} (attempt=${attempt}, ${elapsedMs}ms)`);
  } catch (e: any) {
    // 예상치 못한 에러
    console.error(`[auto-reply] ❌ unexpected error for ${inquiryId}:`, e?.message || e);
    const errMsg = (e?.message || String(e)).slice(0, 1000);
    await logAutoReplyFailure(env, inquiryId, attempt, 'unexpected_error', errMsg, null).catch(() => {});
    // 예상치 못한 에러는 재시도해도 같은 결과일 가능성 크므로 재시도 안 함.
  }
}

// ─── 실패 로그 헬퍼 (non-exported) ──────────────────────────────
// logAutoReplyFailure 자체 실패는 main flow에 영향 없도록 호출 측에서 .catch(() => {}) 처리.
async function logAutoReplyFailure(
  env: Env,
  inquiryId: string,
  attempt: number,
  reason: string,
  detail: string | null,
  aiElapsedMs: number | null,
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO ai_auto_reply_failures (inquiry_id, attempt, reason, detail, ai_elapsed_ms)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(inquiryId, attempt, reason, detail, aiElapsedMs).run();
  } catch (e) {
    console.error('[auto-reply] logAutoReplyFailure insert failed:', e);
  }
}

export default ai;
