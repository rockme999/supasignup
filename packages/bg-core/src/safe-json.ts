/**
 * 안전한 JSON 파싱 유틸 — shops 테이블의 JSON 컬럼(enabled_providers, allowed_redirect_uris,
 * widget_style, banner_config, popup_config, escalation_config, coupon_config,
 * shop_identity, ai_suggested_copy 등)을 역직렬화할 때 사용한다.
 *
 * 깨진 JSON이 단 한 행만 있어도 해당 shop의 모든 로그인/위젯 응답이 500으로 다운되는 것을
 * 막기 위해, 실패 시 fallback을 반환하고 경고 로그를 남긴다.
 */

export function safeParseJsonArray<T = unknown>(
  raw: string | null | undefined,
  fallback: T[] = [],
  context?: string,
): T[] {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? (v as T[]) : fallback;
  } catch (err) {
    if (context) console.warn(`[safeParseJsonArray] invalid JSON at ${context}:`, err);
    return fallback;
  }
}

export function safeParseStringArray(
  raw: string | null | undefined,
  context?: string,
): string[] {
  const arr = safeParseJsonArray<unknown>(raw, [], context);
  return arr.filter((x): x is string => typeof x === 'string');
}

export function safeParseJsonObject<T extends object = Record<string, unknown>>(
  raw: string | null | undefined,
  fallback: T | null = null,
  context?: string,
): T | null {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object' && !Array.isArray(v)) return v as T;
    return fallback;
  } catch (err) {
    if (context) console.warn(`[safeParseJsonObject] invalid JSON at ${context}:`, err);
    return fallback;
  }
}
