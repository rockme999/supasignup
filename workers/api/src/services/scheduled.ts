import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { Env } from '@supasignup/bg-core';
import { callAI } from '../routes/ai';

export async function handleScheduled(env: Env): Promise<void> {
  // 1. 만료된 구독 처리
  await handleExpiredSubscriptions(env);

  // 2. 주간 AI 브리핑 자동 생성 (매주 월요일 KST 오전 9시 = UTC 0시)
  await handleWeeklyBriefings(env);
}

// ─── 만료 구독 처리 ──────────────────────────────────────────
async function handleExpiredSubscriptions(env: Env): Promise<void> {
  const expired = await env.DB.prepare(
    `SELECT s.id, s.shop_id FROM subscriptions s
     WHERE s.status = 'active' AND s.expires_at < datetime('now')`
  ).all();

  const results = expired.results ?? [];
  if (results.length === 0) return;

  const statements: D1PreparedStatement[] = [];
  for (const sub of results) {
    const record = sub as { id: string; shop_id: string };

    const otherActive = await env.DB
      .prepare("SELECT COUNT(*) as cnt FROM subscriptions WHERE shop_id = ? AND status = 'active' AND id != ?")
      .bind(record.shop_id, record.id)
      .first<{ cnt: number }>();

    statements.push(
      env.DB.prepare("UPDATE subscriptions SET status = 'expired' WHERE id = ?").bind(record.id),
    );

    if (!otherActive || otherActive.cnt === 0) {
      statements.push(
        env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(record.shop_id),
      );
    }
  }

  await env.DB.batch(statements);

  for (const sub of results) {
    const record = sub as { id: string; shop_id: string };
    const shop = await env.DB.prepare('SELECT client_id FROM shops WHERE shop_id = ?')
      .bind(record.shop_id).first<{ client_id: string }>();
    if (shop) {
      await env.KV.delete(`widget_config:${shop.client_id}`);
    }
  }
}

// ─── 주간 AI 브리핑 자동 생성 ────────────────────────────────
// cron: 매시간 실행, 매주 월요일 KST 09:00 (UTC 00:00)에만 동작
async function handleWeeklyBriefings(env: Env): Promise<void> {
  const now = new Date();
  // UTC 기준 월요일(1) 0시대에만 실행
  if (now.getUTCDay() !== 1 || now.getUTCHours() !== 0) return;

  // Plus 플랜 shop만 대상 (shop_identity가 있어야 의미 있는 브리핑 가능)
  const shops = await env.DB.prepare(
    `SELECT shop_id, shop_name, shop_identity FROM shops
     WHERE plan != 'free' AND deleted_at IS NULL AND shop_identity IS NOT NULL`
  ).all();

  const targets = (shops.results ?? []) as Array<{
    shop_id: string;
    shop_name: string;
    shop_identity: string;
  }>;

  if (targets.length === 0) return;

  console.log(`[Scheduled] Weekly briefing: ${targets.length} shops`);

  for (const shop of targets) {
    try {
      // 이번 주 이미 생성된 브리핑이 있으면 건너뜀
      const existing = await env.DB.prepare(
        `SELECT id FROM ai_briefings
         WHERE shop_id = ? AND created_at >= datetime('now', '-1 days')`
      ).bind(shop.shop_id).first();

      if (existing) continue;

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

      const prompt = `당신은 "번개가입" 앱의 AI 어드바이저입니다. 번개가입은 카페24 쇼핑몰에 소셜 로그인을 통한 1클릭 회원가입 기능을 제공합니다.

■ 쇼핑몰: ${shop.shop_name ?? '쇼핑몰'}
■ ${identityText}
■ 회원가입 혜택: ${benefitsText}
■ 이번 주 통계: ${statSummary}
■ 지난 주 통계: ${prevStatSummary}
■ 이전 보고서: ${prevBriefingText}

■ 규칙: 1) 데이터 기반 분석과 AI 의견 구분 2) 번개가입 범위 내 액션만 제안 3) 이전 보고서 대비 변화 언급 4) 데이터 부족 시 억지 분석 금지

JSON만 응답: {"performance":"성과 요약","strategy":"전략 제안","actions":["액션1","액션2","액션3"],"insight":"앱 범위 밖 참고사항"}`;

      const raw = await callAI(env, [
        { role: 'system', content: 'You are a Korean e-commerce marketing advisor. Always respond with valid JSON only, no markdown, no explanation.' },
        { role: 'user', content: prompt },
      ]);

      let parsed: { performance: string; strategy: string; actions: string[]; insight?: string } | null = null;
      try {
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch { /* ignore */ }

      if (!parsed || !parsed.performance) {
        parsed = { performance: raw.trim(), strategy: '', actions: [], insight: '' };
      }

      const briefingId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO ai_briefings (id, shop_id, performance, strategy, actions, insight, stats_json, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled')`
      ).bind(
        briefingId,
        shop.shop_id,
        parsed.performance,
        parsed.strategy,
        JSON.stringify(parsed.actions),
        parsed.insight ?? null,
        JSON.stringify(stats),
      ).run();

      console.log(`[Scheduled] Briefing created for ${shop.shop_name} (${shop.shop_id})`);
    } catch (e) {
      console.error(`[Scheduled] Briefing failed for ${shop.shop_id}:`, e);
    }
  }
}
