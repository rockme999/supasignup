/**
 * PII 마스킹 유틸리티.
 *
 * maskName: AES-GCM 복호화 후 이름의 중간 글자를 *** 으로 마스킹.
 *   - 1글자: 그대로 반환
 *   - 2글자: 첫 글자 + ***
 *   - 3글자 이상: 첫 글자 + *** + 끝 글자
 * 예시: '김철수' → '김***수', '이수진' → '이***진', '박민' → '박***', '홍' → '홍'
 *
 * 사용자 결정(2026-04-28): 첫·끝 글자만 노출하고 가운데는 *** 별 3개.
 */
export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + '***';
  return name[0] + '***' + name[name.length - 1];
}
