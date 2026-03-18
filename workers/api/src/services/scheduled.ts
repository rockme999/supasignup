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

  // batch로 subscription/shop 상태 일괄 업데이트
  const statements: D1PreparedStatement[] = [];
  for (const sub of results) {
    const record = sub as { id: string; shop_id: string };
    statements.push(
      env.DB.prepare("UPDATE subscriptions SET status = 'expired' WHERE id = ?").bind(record.id),
      env.DB.prepare("UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?").bind(record.shop_id),
    );
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
