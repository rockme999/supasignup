import type { Env } from '@supasignup/bg-core';

export async function handleScheduled(env: Env): Promise<void> {
  // 1. 만료된 구독 처리
  const expired = await env.DB.prepare(
    `SELECT s.id, s.shop_id, s.owner_id FROM subscriptions s
     WHERE s.status = 'active' AND s.expires_at < datetime('now')`
  ).all();

  for (const sub of expired.results ?? []) {
    const record = sub as { id: string; shop_id: string; owner_id: string };
    // subscription → expired
    await env.DB.prepare(
      `UPDATE subscriptions SET status = 'expired' WHERE id = ?`
    ).bind(record.id).run();
    // shop → free plan
    await env.DB.prepare(
      `UPDATE shops SET plan = 'free', updated_at = datetime('now') WHERE shop_id = ?`
    ).bind(record.shop_id).run();
    // KV 위젯 캐시 무효화
    const shop = await env.DB.prepare('SELECT client_id FROM shops WHERE shop_id = ?').bind(record.shop_id).first<{ client_id: string }>();
    if (shop) {
      await env.KV.delete(`widget_config:${shop.client_id}`);
    }
  }
}
