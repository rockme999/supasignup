/**
 * PII 마스킹 유틸리티.
 *
 * maskName: AES-GCM 복호화 후 이름의 중간 글자를 마스킹하여 개인정보 보호.
 *   - 1글자: 그대로 반환
 *   - 2글자: 첫 글자 + 'O'
 *   - 3글자 이상: 첫 글자 + 'O' + 세 번째 글자부터
 * 예시: '김철수' → '김O수', '이수진' → '이O진', '박민' → '박O'
 */
export function maskName(name: string): string {
  if (!name) return '';
  if (name.length === 1) return name;
  if (name.length === 2) return name[0] + 'O';
  return name[0] + 'O' + name.slice(2);
}
