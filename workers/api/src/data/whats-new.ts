/**
 * What's New 인디케이터 — KV 키 패턴 및 비교 기준 시각 정의.
 *
 * KV 키 패턴: seen:{owner_id}:{key}
 * 값: ISO 8601 UTC 시각 (마지막 방문 시각)
 *
 * NEW 표시 조건: KV 값이 없거나, 값이 비교 기준 시각보다 이전이면 NEW.
 */

/**
 * 가장 최근 로그인 디자인 페이지 신기능이 추가된 시각.
 * 1주차 출시: Plus 프리셋 6종 (2026-04-27)
 * v2.5.0 (2026-05-01): 아이콘 모드 프로바이더 + Plus 쿠폰팩 미리보기 추가
 * 신기능 추가 시마다 이 상수를 갱신해 사이드 메뉴 NEW 배지가 다시 표시되도록 함.
 */
export const LATEST_PLUS_PRESET_ADDED = '2026-05-01T00:00:00Z';

/**
 * AI 브리핑 What's New 인디케이터 기준.
 * DB의 최신 ai_briefings.created_at과 비교하므로 정적 상수가 아닌 런타임 조회가 필요함.
 * 이 함수는 운영자별 최신 브리핑 created_at을 DB에서 조회해 반환한다.
 */
export async function getLatestBriefingCreatedAt(
  db: D1Database,
  shopId: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT created_at FROM ai_briefings WHERE shop_id = ? ORDER BY created_at DESC LIMIT 1')
    .bind(shopId)
    .first<{ created_at: string }>();
  return row?.created_at ?? null;
}

/** KV 키 접두사 */
const SEEN_PREFIX = 'seen:';

/** seen KV 키를 조합 */
export function seenKey(ownerId: string, feature: string): string {
  return `${SEEN_PREFIX}${ownerId}:${feature}`;
}

/** KV에서 seen 시각 조회 (없으면 null) */
export async function getSeenAt(
  kv: KVNamespace,
  ownerId: string,
  feature: string,
): Promise<string | null> {
  return kv.get(seenKey(ownerId, feature));
}

/**
 * KV에 seen 시각을 현재 UTC 시각으로 갱신.
 * 실패해도 페이지 렌더링에는 영향 없음 (호출자에서 try/catch 또는 waitUntil 처리).
 */
export async function markSeen(
  kv: KVNamespace,
  ownerId: string,
  feature: string,
): Promise<void> {
  await kv.put(seenKey(ownerId, feature), new Date().toISOString());
}

/**
 * seen 시각과 비교 기준 시각을 비교하여 NEW 여부를 반환.
 *
 * @param seenAt KV에서 읽은 마지막 seen 시각 (null = 한 번도 방문 안 함)
 * @param referenceTime 비교 기준 시각 (ISO 8601 UTC)
 * @returns true면 NEW 표시가 필요함
 */
export function isNew(seenAt: string | null, referenceTime: string): boolean {
  if (!seenAt) return true;
  return seenAt < referenceTime;
}
