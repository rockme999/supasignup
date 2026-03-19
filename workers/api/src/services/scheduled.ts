import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { Env } from '@supasignup/bg-core';

export async function handleScheduled(env: Env): Promise<void> {
  // 1. 만료된 구독 처리
  const expired = await env.DB.prepare(
    `SELECT s.id, s.shop_id FROM subscriptions s
     WHERE s.status = 'active' AND s.expires_at < datetime('now')`
  ).all();

  const results = expired.results ?? [];
  if (results.length === 0) return;

  // 각 만료 구독에 대해 다른 active 구독 여부 확인 후 일괄 업데이트
  const statements: D1PreparedStatement[] = [];
  for (const sub of results) {
    const record = sub as { id: string; shop_id: string };

    // 동일 shop의 다른 active 구독이 있는지 확인 (환불 로직과 동일 패턴)
    const otherActive = await env.DB
      .prepare("SELECT COUNT(*) as cnt FROM subscriptions WHERE shop_id = ? AND status = 'active' AND id != ?")
      .bind(record.shop_id, record.id)
      .first<{ cnt: number }>();

    statements.push(
      env.DB.prepare("UPDATE subscriptions SET status = 'expired' WHERE id = ?").bind(record.id),
    );

    // 다른 active 구독이 없을 때만 free로 다운그레이드
    if (!otherActive || otherActive.cnt === 0) {
      statements.push(
        env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(record.shop_id),
      );
    }
  }

  await env.DB.batch(statements);

  // KV 캐시 무효화 (batch 불가, 개별 처리)
  for (const sub of results) {
    const record = sub as { id: string; shop_id: string };
    const shop = await env.DB.prepare('SELECT client_id FROM shops WHERE shop_id = ?')
      .bind(record.shop_id).first<{ client_id: string }>();
    if (shop) {
      await env.KV.delete(`widget_config:${shop.client_id}`);
    }
  }
}
