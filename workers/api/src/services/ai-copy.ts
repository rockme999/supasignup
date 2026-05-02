/**
 * AI 추천 카피 자동 적용 공유 함수.
 *
 * ai.ts(브리핑 수동 생성)와 scheduled.ts(주간 자동 생성) 양쪽에서
 * 동일하게 사용하는 로직을 중복 없이 한 곳에서 관리한다.
 */

import type { Env } from '@supasignup/bg-core';

/**
 * AI 브리핑 / 카피 생성 프롬프트에 주입할 "현재 활성 기능" 컨텍스트 빌더.
 *
 * 목적: AI가 *실제로 켜져 있는* 기능을 정확히 알고 카피를 생성하게 한다.
 *   - 부정확 사례(v2.5.0 이전): 쿠폰팩이 활성인데 AI가 "3천원 할인 쿠폰" 같은 단일 쿠폰 카피 생성.
 *   - 해결: 쇼핑몰별로 켜져 있는 기능을 명시적으로 프롬프트에 적어 AI가 그것에 맞는 문구만 생성하도록 강제.
 *
 * 반환값은 프롬프트의 "■ 현재 활성 기능" 섹션 본문에 그대로 삽입할 한국어 텍스트.
 */
export function buildActiveFeaturesContext(shop: {
  plan: string;
  coupon_config?: string | null;
  banner_config?: string | null;
  popup_config?: string | null;
  escalation_config?: string | null;
  widget_style?: string | null;
  kakao_channel_id?: string | null;
  live_counter_config?: string | null;
}): string {
  const isPlus = shop.plan !== 'free';
  const lines: string[] = [];
  lines.push(`- 플랜: ${isPlus ? 'Plus' : 'Free'}`);

  // 쿠폰 / 쿠폰팩
  // Plus 쿠폰팩(5장 ₩55,000)은 항상 자동 발급. 쿠폰팩 카드는 위젯/이탈팝업에서 노출.
  if (isPlus) {
    lines.push('- 쿠폰팩(Plus 전용): 신규 가입 시 5장 단계별 쿠폰 자동 발급 — 총 ₩55,000 가치. 위젯과 이탈 감지 팝업 양쪽에서 카드로 노출 가능.');
  }
  if (shop.coupon_config) {
    try {
      const cc = JSON.parse(shop.coupon_config) as Record<string, { enabled?: boolean; discount_amount?: number; discount_rate?: number; expire_days?: number; min_order?: number }>;
      const parts: string[] = [];
      if (cc.shipping?.enabled) parts.push(`무료배송 쿠폰 (${cc.shipping.expire_days ?? 0}일)`);
      if (cc.amount?.enabled) parts.push(`${(cc.amount.discount_amount ?? 0).toLocaleString()}원 정액 할인 쿠폰`);
      if (cc.rate?.enabled) parts.push(`${cc.rate.discount_rate ?? 0}% 정률 할인 쿠폰`);
      if (parts.length > 0) lines.push(`- 단일 가입 쿠폰 발급: ${parts.join(', ')}`);
    } catch { /* ignore */ }
  }

  // 미니배너
  if (isPlus && shop.banner_config) {
    try {
      const bc = JSON.parse(shop.banner_config) as Record<string, unknown>;
      if (bc.enabled) lines.push('- 미니배너: 활성 (가입 유도 슬라이드 카드)');
    } catch { /* ignore */ }
  }

  // 이탈 감지 팝업
  if (isPlus && shop.popup_config) {
    try {
      const pc = JSON.parse(shop.popup_config) as Record<string, unknown>;
      if (pc.enabled) lines.push('- 이탈 감지 팝업: 활성 (PC: 마우스 이탈 / 모바일: 급격한 스크롤 업)');
    } catch { /* ignore */ }
  }

  // 에스컬레이션
  if (isPlus && shop.escalation_config) {
    try {
      const ec = JSON.parse(shop.escalation_config) as Record<string, unknown>;
      if (ec.enabled) lines.push('- 재방문 에스컬레이션: 활성 (visit_2 토스트 + visit_3+ 플로팅 배너)');
    } catch { /* ignore */ }
  }

  // 위젯 안내 텍스트 1·2 (Plus 전용)
  if (isPlus && shop.widget_style) {
    try {
      const ws = JSON.parse(shop.widget_style) as Record<string, unknown>;
      const t1On = ws.customText1Enabled !== false;
      const t2On = ws.customText2Enabled !== false;
      if (t1On || t2On) {
        const t1 = t1On ? `텍스트1(상단 타이틀 아래 작은 안내) ON` : '텍스트1 OFF';
        const t2 = t2On ? `텍스트2(소셜~쿠폰팩 사이 큰 볼드) ON` : '텍스트2 OFF';
        lines.push(`- 위젯 안내 텍스트: ${t1} / ${t2}`);
      }
    } catch { /* ignore */ }
  }

  // 라이브 가입자 카운터 (Plus 전용, NULL 또는 enabled 미명시면 기본 활성)
  if (isPlus) {
    let liveOn = true; // 기본값: 활성
    if (shop.live_counter_config) {
      try {
        const lc = JSON.parse(shop.live_counter_config) as Record<string, unknown>;
        if (lc.enabled === false) liveOn = false;
      } catch { /* keep default */ }
    }
    if (liveOn) {
      lines.push('- 라이브 가입자 카운터: 활성 (위젯에 실시간 가입자 수 + 신규 가입 토스트. 일 평균 가입자 ≥ 3명 임계값 통과 시 자동 활성)');
    }
  }

  // 카카오 채널 (v2.5.0+ Free에서도 사용 가능)
  if (shop.kakao_channel_id) {
    lines.push(`- 카카오 채널 연결: 활성 (가입 완료 후 채널 추가 유도)`);
  }

  return lines.join('\n');
}

export type AiCopy = {
  banner?: string;
  toast?: string;
  floating?: string;
  floatingBtn?: string;
  popupTitle?: string;
  popupBody?: string;
  popupCta?: string;
  // v2.5.1+ — 위젯 안내 텍스트 (Plus 전용)
  widgetText1?: string;  // 상단 타이틀 아래 작은 안내 (한 줄, 30자 내외)
  widgetText2?: string;  // 소셜~쿠폰팩 사이 큰 임팩트 문구 (볼드)
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
    widget_style?: string | null;
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

  // v2.5.1+ — 위젯 안내 텍스트 1·2 자동 적용 (운영자가 끄지 않은 경우만)
  // customText1Enabled / customText2Enabled 가 명시적으로 false면 운영자가 비활성화한 것으로 간주, 덮어쓰지 않음.
  if (shop.widget_style && (copy.widgetText1 || copy.widgetText2)) {
    try {
      const ws = JSON.parse(shop.widget_style) as Record<string, unknown>;
      let changed = false;
      if (copy.widgetText1 && ws.customText1Enabled !== false) {
        ws.customText1 = copy.widgetText1;
        changed = true;
      }
      if (copy.widgetText2 && ws.customText2Enabled !== false) {
        ws.customText2 = copy.widgetText2;
        changed = true;
      }
      if (changed) {
        updates.push('widget_style = ?');
        values.push(JSON.stringify(ws));
      }
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
