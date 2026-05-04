import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { Env } from '@supasignup/bg-core';
import { callAI } from '../routes/ai';
import { applyAiCopyToConfigs, buildActiveFeaturesContext } from './ai-copy';
import type { AiCopy } from './ai-copy';
import { pauseCouponPack } from './coupon-pack';
import type { CouponPackConfig, CouponPackState } from './coupon-pack';

export async function handleScheduled(env: Env): Promise<void> {
  // 1. 만료된 구독 처리
  await handleExpiredSubscriptions(env);

  // 2. 주간 AI 브리핑 자동 생성 (매주 월요일 KST 오전 9시 = UTC 0시)
  await handleWeeklyBriefings(env);
}

// ─── 만료 구독 처리 ──────────────────────────────────────────
async function handleExpiredSubscriptions(env: Env): Promise<void> {
  // 만료 구독 + 동일 shop의 비만료 active 구독 수 + client_id를 단일 쿼리로 조회.
  // other_active_count는 이번에 함께 만료될 구독(expires_at < now)을 제외하여
  // 동시 만료 시에도 plan 미전환 버그가 발생하지 않도록 처리.
  const expired = await env.DB.prepare(
    `SELECT s.id, s.shop_id, sh.client_id,
       (SELECT COUNT(*) FROM subscriptions s2
        WHERE s2.shop_id = s.shop_id
          AND s2.status = 'active'
          AND s2.id != s.id
          AND s2.expires_at >= datetime('now')
       ) AS other_active_count
     FROM subscriptions s
     JOIN shops sh ON s.shop_id = sh.shop_id
     WHERE s.status = 'active' AND s.expires_at < datetime('now')`
  ).all<{ id: string; shop_id: string; client_id: string; other_active_count: number }>();

  const results = expired.results ?? [];
  if (results.length === 0) return;

  // batch statements 구성
  const statements: D1PreparedStatement[] = [];

  // 모든 만료 구독을 expired로 전환
  for (const record of results) {
    statements.push(
      env.DB.prepare("UPDATE subscriptions SET status = 'expired' WHERE id = ?").bind(record.id),
    );
  }

  // other_active_count가 0인 shop만 plan을 free로 전환 (shop_id 중복 방지)
  const shopsToDowngrade = new Set<string>();
  for (const record of results) {
    if (record.other_active_count === 0) {
      shopsToDowngrade.add(record.shop_id);
    }
  }
  for (const shopId of shopsToDowngrade) {
    statements.push(
      env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(shopId),
    );
  }

  await env.DB.batch(statements);

  // 쿠폰팩 정지 (state: active → paused) — 다운그레이드된 shop에 대해서만 호출
  // batch 후에 호출 (DB가 이미 plan=free로 갱신된 상태에서 shop을 다시 읽음)
  for (const shopId of shopsToDowngrade) {
    try {
      const shopForPause = await env.DB.prepare('SELECT * FROM shops WHERE shop_id = ?')
        .bind(shopId)
        .first<{ shop_id: string; coupon_config: string | null; platform_access_token: string | null; platform_refresh_token: string | null; owner_id: string; mall_id: string }>();
      if (!shopForPause) continue;
      const pauseResult = await pauseCouponPack(env, shopForPause as any);
      if (pauseResult.success) {
        await scheduledUpdateCouponPackState(env.DB, shopId, shopForPause.coupon_config, 'paused');
      }
    } catch (e) {
      console.error(`[CouponPack] 정지 예외 (scheduled expire): shop=${shopId}`, e);
    }
  }

  // KV 캐시 삭제 — client_id는 1단계에서 이미 조회했으므로 추가 DB 호출 없음
  const clientIdsSeen = new Set<string>();
  for (const record of results) {
    if (record.client_id && !clientIdsSeen.has(record.client_id)) {
      clientIdsSeen.add(record.client_id);
      await env.KV.delete(`widget_config:${record.client_id}`);
    }
  }
}

// ─── Helper: coupon_config.pack.state 갱신 ───────────────────
async function scheduledUpdateCouponPackState(
  db: D1Database,
  shopId: string,
  couponConfigRaw: string | null,
  newState: CouponPackState,
): Promise<void> {
  if (!couponConfigRaw) return;
  try {
    const config = JSON.parse(couponConfigRaw) as { pack?: CouponPackConfig };
    if (!config.pack) return;
    config.pack.state = newState;
    config.pack.enabled = newState === 'active';
    await db
      .prepare("UPDATE shops SET coupon_config = ?, updated_at = datetime('now') WHERE shop_id = ?")
      .bind(JSON.stringify(config), shopId)
      .run();
  } catch (err) {
    console.error(`[CouponPack] coupon_config state 갱신 실패 (scheduled): shop_id=${shopId}`, err);
  }
}

// ─── 주간 AI 브리핑 자동 생성 ────────────────────────────────
// cron: 매시간 실행, 매주 월요일 KST 09:00 (UTC 00:00)에만 동작
// 대상 쇼핑몰을 조회하여 Queue에 메시지만 전송 — AI 호출은 Queue consumer에서 처리
async function handleWeeklyBriefings(env: Env): Promise<void> {
  const now = new Date();
  // UTC 기준 월요일(1) 0시대에만 실행
  if (now.getUTCDay() !== 1 || now.getUTCHours() !== 0) return;

  // 모든 플랜 shop 대상 (Free도 인사이트 노출 — Plus는 더 풍부한 브리핑)
  const shops = await env.DB.prepare(
    `SELECT shop_id, shop_name FROM shops
     WHERE deleted_at IS NULL`
  ).all<{ shop_id: string; shop_name: string }>();

  const targets = shops.results ?? [];
  if (targets.length === 0) return;

  console.log(`[Scheduled] Queuing weekly briefings: ${targets.length} shops`);

  // 각 쇼핑몰을 Queue에 전송 (sendBatch 최대 100개씩)
  const messages = targets.map(shop => ({
    body: { shop_id: shop.shop_id, shop_name: shop.shop_name },
  }));

  for (let i = 0; i < messages.length; i += 100) {
    await env.BRIEFING_QUEUE.sendBatch(messages.slice(i, i + 100));
  }

  console.log(`[Scheduled] Queued ${targets.length} briefing jobs`);
}

// ─── AI 브리핑 생성 (Queue consumer에서 호출) ────────────────
export async function generateBriefingForShop(env: Env, shopId: string): Promise<void> {
  // 쇼핑몰 전체 정보 조회 (identity, banner_config 등 포함)
  // 0033: 발송용 컬럼(store_email/admin_name/auto_briefing_email)도 SELECT
  const shop = await env.DB.prepare(
    `SELECT shop_id, shop_name, shop_identity, banner_config, popup_config, escalation_config,
            widget_style, coupon_config, kakao_channel_id, live_counter_config, plan, client_id,
            store_email, store_admin_name, auto_briefing_email
     FROM shops WHERE shop_id = ? AND deleted_at IS NULL`
  ).bind(shopId).first<{
    shop_id: string;
    shop_name: string;
    shop_identity: string;
    banner_config: string | null;
    popup_config: string | null;
    escalation_config: string | null;
    widget_style: string | null;
    coupon_config: string | null;
    kakao_channel_id: string | null;
    live_counter_config: string | null;
    plan: string;
    client_id: string;
    store_email: string | null;
    store_admin_name: string | null;
    auto_briefing_email: number;
  }>();

  if (!shop) {
    console.log(`[Queue] Skipping ${shopId}: shop not found`);
    return;
  }

  // 이번 주 이미 생성된 브리핑이 있으면 건너뜀
  const existing = await env.DB.prepare(
    `SELECT id FROM ai_briefings
     WHERE shop_id = ? AND created_at >= datetime('now', '-1 days')`
  ).bind(shop.shop_id).first();

  if (existing) {
    console.log(`[Queue] Skipping ${shop.shop_name}: briefing already exists this week`);
    return;
  }

  // 최근 7일 + 이전 7일 통계 (비교용)
  const [statsRows, prevStatsRows] = await Promise.all([
    env.DB.prepare(`
      SELECT provider, action, COUNT(*) AS cnt FROM login_stats
      WHERE shop_id = ? AND created_at >= datetime('now', '-7 days')
      GROUP BY provider, action ORDER BY cnt DESC
    `).bind(shop.shop_id).all(),
    env.DB.prepare(`
      SELECT provider, action, COUNT(*) AS cnt FROM login_stats
      WHERE shop_id = ? AND created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')
      GROUP BY provider, action ORDER BY cnt DESC
    `).bind(shop.shop_id).all(),
  ]);

  const stats = (statsRows.results ?? []) as Array<{ provider: string; action: string; cnt: number }>;
  const prevStats = (prevStatsRows.results ?? []) as Array<{ provider: string; action: string; cnt: number }>;
  const statSummary = stats.length > 0 ? stats.map(r => `${r.provider} ${r.action}: ${r.cnt}건`).join(', ') : '최근 7일 데이터 없음';
  const prevStatSummary = prevStats.length > 0 ? prevStats.map(r => `${r.provider} ${r.action}: ${r.cnt}건`).join(', ') : '이전 7일 데이터 없음';

  // 정체성 + 회원혜택 파싱
  let identityText = '정보 없음';
  let benefitsText = '설정된 혜택 없음';
  try {
    const id = JSON.parse(shop.shop_identity) as Record<string, unknown>;
    identityText = `업종: ${id.industry ?? '미설정'}, 타겟: ${id.target ?? '미설정'}, 톤앤매너: ${id.tone ?? '미설정'}, 키워드: ${Array.isArray(id.keywords) ? (id.keywords as string[]).join(', ') : '없음'}`;
    const benefits: string[] = [];
    if (id.coupon_benefit) benefits.push(`쿠폰: ${id.coupon_benefit}`);
    if (id.free_shipping) benefits.push(`무료배송: ${id.free_shipping}`);
    if (Array.isArray(id.extra_benefits) && (id.extra_benefits as string[]).length > 0) benefits.push(`추가혜택: ${(id.extra_benefits as string[]).join(', ')}`);
    if (benefits.length > 0) benefitsText = benefits.join(' / ');
  } catch {
    identityText = shop.shop_identity.slice(0, 300);
  }

  // 이전 보고서 참조
  const prevBriefing = await env.DB.prepare(
    `SELECT performance, strategy, actions, created_at FROM ai_briefings WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1`
  ).bind(shop.shop_id).first<{ performance: string; strategy: string; actions: string; created_at: string }>();

  let prevBriefingText = '이전 보고서 없음 (첫 보고서)';
  if (prevBriefing) {
    let pa: string[] = [];
    try { pa = JSON.parse(prevBriefing.actions); } catch { /* ignore */ }
    prevBriefingText = `[${prevBriefing.created_at}] 성과: ${prevBriefing.performance} / 전략: ${prevBriefing.strategy} / 액션: ${pa.join(', ')}`;
  }

  const activeFeatures = buildActiveFeaturesContext({
    plan: shop.plan ?? 'free',
    coupon_config: shop.coupon_config,
    banner_config: shop.banner_config,
    popup_config: shop.popup_config,
    escalation_config: shop.escalation_config,
    widget_style: shop.widget_style,
    kakao_channel_id: shop.kakao_channel_id,
    live_counter_config: shop.live_counter_config,
  });

  const prompt = `당신은 "번개가입" 앱의 AI 어드바이저입니다. 번개가입은 카페24 쇼핑몰에 소셜 로그인(구글, 카카오, 네이버, 애플, 디스코드, 텔레그램)을 통한 1클릭 회원가입 기능을 제공합니다.

■ 쇼핑몰: ${shop.shop_name ?? '쇼핑몰'}
■ ${identityText}
■ 회원가입 혜택: ${benefitsText}
■ 현재 활성 기능 (반드시 이 기능들에만 맞춰 카피를 생성하세요)
${activeFeatures}
■ 이번 주 통계: ${statSummary}
■ 지난 주 통계: ${prevStatSummary}
■ 이전 보고서: ${prevBriefingText}

■ 규칙
1) 데이터 기반 분석과 AI 의견 구분
2) 번개가입 범위 내 액션만 제안 (소셜 로그인, 회원가입 전환, 쿠폰 발급)
3) 이전 보고서 대비 변화 언급
4) 데이터 부족 시 억지 분석 금지
5) 금기어: "1초 가입", "1초가입" 절대 사용 금지 (경쟁사 서비스명). 우리 서비스명은 "번개가입"
6) **카피 정확성 (매우 중요)** — "현재 활성 기능"에 명시된 혜택만 사용. 활성 기능에 없는 혜택을 임의로 만들어내지 마세요.
   - 쿠폰팩(5장 ₩55,000)이 활성이면: "쿠폰팩 증정", "5장 쿠폰", "₩55,000 가치" 같은 표현 권장. "3천원 할인 쿠폰" 같은 *임의 단일 쿠폰* 표현 금지.
   - 단일 쿠폰만 활성이면 그 쿠폰 종류·금액·할인율만 사용.
   - 카카오 채널 ID가 비어 있으면 카카오 채널 관련 카피 금지.

■ 추가로, 이 쇼핑몰의 정체성·혜택·활성 기능에 맞는 마케팅 문구를 생성해주세요:
  - banner: 미니배너에 표시할 한 줄 문구 (30자 이내, 가입 유도)
  - toast: 재방문 고객에게 보여줄 토스트 메시지 (30자 이내, {n}은 방문횟수로 치환됨)
  - floating: 플로팅 배너 문구 (30자 이내, 가입 혜택 강조)
  - floatingBtn: 플로팅 배너 버튼 텍스트 (20자 이내)
  - popupTitle: 이탈 감지 팝업 제목 (20자 이내, 주의를 끄는 문구)
  - popupBody: 이탈 감지 팝업 본문 (100자 이내, 혜택과 긴급성 강조)
  - popupCta: 팝업 CTA 버튼 텍스트 (20자 이내)
  - widgetText1: 위젯 상단 타이틀 아래 *작은* 안내 문구 (가입/로그인 편의성 강조, 30자 이내). 예: "아이디 비밀번호 입력없이 번개가입! 번개로그인!"
  - widgetText2: 위젯의 소셜 버튼과 쿠폰팩 사이 *임팩트* 문구 (큰 볼드, 25자 이내). 쿠폰팩이 활성이면 쿠폰팩 증정 강조 권장. 예: "회원가입 즉시 사용가능한 쿠폰팩 증정", "5만원 상당 신규 회원 쿠폰팩 증정"

JSON만 응답: {"performance":"성과 요약","strategy":"전략 제안","actions":["액션1","액션2","액션3"],"insight":"앱 범위 밖 참고사항","headline":"홈 카드 한 줄 요약 (예: '신규 가입 47명 (+12%) · 이번 주 전략 3가지 도착', 40자 이내)","copy":{"banner":"...","toast":"...","floating":"...","floatingBtn":"...","popupTitle":"...","popupBody":"...","popupCta":"...","widgetText1":"...","widgetText2":"..."}}`;

  const raw = await callAI(env, [
    { role: 'system', content: 'You are a Korean e-commerce marketing advisor. Always respond with valid JSON only, no markdown, no explanation.' },
    { role: 'user', content: prompt },
  ]);

  let parsed: { performance: string; strategy: string; actions: string[]; insight?: string; headline?: string; copy?: AiCopy } | null = null;
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
  } catch { /* ignore */ }

  if (!parsed || !parsed.performance) {
    parsed = { performance: raw.trim(), strategy: '', actions: [], insight: '' };
  }

  const briefingId = crypto.randomUUID();
  await env.DB.prepare(
    `INSERT INTO ai_briefings (id, shop_id, performance, strategy, actions, insight, stats_json, source, headline)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?)`
  ).bind(
    briefingId,
    shop.shop_id,
    parsed.performance,
    parsed.strategy,
    JSON.stringify(parsed.actions),
    parsed.insight ?? null,
    JSON.stringify(stats),
    parsed.headline ?? null,
  ).run();

  // AI 추천 문구 저장 + 자동 적용 처리
  if (parsed.copy) {
    await env.DB.prepare(
      "UPDATE shops SET ai_suggested_copy = ?, updated_at = datetime('now') WHERE shop_id = ?"
    ).bind(JSON.stringify(parsed.copy), shop.shop_id).run();

    let identity: Record<string, unknown> = {};
    try { identity = JSON.parse(shop.shop_identity); } catch { /* ignore */ }
    if (identity.auto_apply_ai_copy) {
      await applyAiCopyToConfigs(env, shop, parsed.copy as AiCopy);
    }
  }

  console.log(`[Queue] Briefing created for ${shop.shop_name} (${shop.shop_id})`);

  // ── AI 주간 브리핑 이메일 자동 발송 (0033) ──
  // 조건: 토글 ON (default 1) + store_email 채워짐 (NULL/cafe24.auto는 sync 시점에 이미 거름).
  // 실패해도 throw 안 함 — 브리핑 생성은 이미 성공이라 발송 실패는 별도 추적 (console.error만).
  if (shop.auto_briefing_email !== 0 && shop.store_email) {
    try {
      const { sendBriefingEmail } = await import('./email');
      const baseUrl = env.BASE_URL ?? 'https://bg.suparain.kr';
      // 이번 주 KST 월요일~일요일 표기 (브리핑 본문에서 사용된 것과 동일 규칙)
      const now = new Date();
      const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const dow = kst.getUTCDay();
      const daysSinceMonday = dow === 0 ? 6 : dow - 1;
      const monday = new Date(kst.getTime() - daysSinceMonday * 86400000);
      const sunday = new Date(monday.getTime() + 6 * 86400000);
      const fmt = (d: Date) => `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
      const weekRange = `${fmt(monday)} ~ ${fmt(sunday)}`;

      const result = await sendBriefingEmail(env, {
        toEmail: shop.store_email,
        shopName: shop.shop_name || shop.shop_id,
        adminName: shop.store_admin_name,
        headline: parsed.headline ?? null,
        performance: parsed.performance,
        briefingUrl: `${baseUrl}/dashboard/ai-briefing`,
        weekRange,
      });

      if (result.ok) {
        console.log(`[email] Briefing sent: ${shop.shop_name} → ${shop.store_email}`);
      } else {
        console.error(`[email] Briefing send failed: ${shop.shop_name} → ${shop.store_email}: ${result.error}`);
      }
    } catch (err: any) {
      console.error(`[email] Briefing send threw: ${shop.shop_name}`, err?.message ?? err);
    }
  } else {
    const reason = shop.auto_briefing_email === 0 ? 'toggle OFF' : 'no store_email';
    console.log(`[email] Briefing send skipped (${reason}): ${shop.shop_name}`);
  }
}
