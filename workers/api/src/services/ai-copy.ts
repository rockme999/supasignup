/**
 * AI 추천 카피 자동 적용 공유 함수.
 *
 * ai.ts(브리핑 수동 생성)와 scheduled.ts(주간 자동 생성) 양쪽에서
 * 동일하게 사용하는 로직을 중복 없이 한 곳에서 관리한다.
 */

import type { Env } from '@supasignup/bg-core';

export type AiCopy = {
  banner?: string;
  toast?: string;
  floating?: string;
  floatingBtn?: string;
  popupTitle?: string;
  popupBody?: string;
  popupCta?: string;
};

/**
 * AI 추천 카피를 각 config(banner_config, popup_config, escalation_config)에 반영하고
 * DB를 업데이트한다. KV 캐시도 무효화한다.
 *
 * - copy 객체의 각 필드가 있을 때만 해당 config를 수정한다.
 * - config JSON 파싱 실패는 무시하고 계속 진행한다.
 * - updates가 없으면 DB 쿼리를 실행하지 않는다.
 */
export async function applyAiCopyToConfigs(
  env: Env,
  shop: {
    shop_id: string;
    client_id: string;
    banner_config?: string | null;
    popup_config?: string | null;
    escalation_config?: string | null;
  },
  copy: AiCopy,
): Promise<void> {
  const updates: string[] = [];
  const values: unknown[] = [];

  if (copy.banner && shop.banner_config) {
    try {
      const bc = JSON.parse(shop.banner_config) as Record<string, unknown>;
      bc.text = copy.banner;
      updates.push('banner_config = ?');
      values.push(JSON.stringify(bc));
    } catch { /* ignore */ }
  }

  if (shop.popup_config && (copy.popupTitle || copy.popupBody || copy.popupCta)) {
    try {
      const pc = JSON.parse(shop.popup_config) as Record<string, unknown>;
      if (copy.popupTitle) pc.title = copy.popupTitle;
      if (copy.popupBody) pc.body = copy.popupBody;
      if (copy.popupCta) pc.ctaText = copy.popupCta;
      updates.push('popup_config = ?');
      values.push(JSON.stringify(pc));
    } catch { /* ignore */ }
  }

  if (shop.escalation_config && (copy.toast || copy.floating || copy.floatingBtn)) {
    try {
      const ec = JSON.parse(shop.escalation_config) as Record<string, unknown>;
      if (copy.toast) ec.toastText = copy.toast;
      if (copy.floating) ec.floatingText = copy.floating;
      if (copy.floatingBtn) ec.floatingBtnText = copy.floatingBtn;
      updates.push('escalation_config = ?');
      values.push(JSON.stringify(ec));
    } catch { /* ignore */ }
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(shop.shop_id);
    await env.DB.prepare(
      `UPDATE shops SET ${updates.join(', ')} WHERE shop_id = ?`,
    ).bind(...values).run();
    await env.KV.delete(`widget_config:${shop.client_id}`);
  }
}
