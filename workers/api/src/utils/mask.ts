/**
 * PII 마스킹 유틸리티 — 두 가지 강도.
 *
 * **maskName** (어드민용, 약한 마스킹) — 운영자가 자기 회원을 식별할 정도:
 *   - 1글자: 그대로
 *   - 2글자: 첫 + ***
 *   - 3글자 이상: 첫 + *** + 끝 글자
 *   예: '김철수' → '김***수', '박민' → '박***'
 *
 * **maskNamePublic** (고객 노출용, 강한 마스킹) — 첫 글자만 노출:
 *   - 1글자: 그대로
 *   - 2글자 이상: 첫 글자 + ***
 *   예: '김철수' → '김***', '박민' → '박***'
 *
 * 사용 구분:
 * - 어드민/운영자 화면(손실 회피 카드 등) → maskName
 * - 고객 노출(라이브 카운터 토스트 등) → maskNamePublic
 */
export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '***';
  return name[0] + '***' + name[name.length - 1];
}

export function maskNamePublic(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  return name[0] + '***';
}
