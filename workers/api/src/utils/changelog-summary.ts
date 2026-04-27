/**
 * changelog-summary.ts
 *
 * PUBLIC_CHANGELOG.md에서 최신 섹션의 상위 N개 bullet을 추출한다.
 * 대시보드 홈의 "최신 업데이트" 카드에 사용.
 *
 * 알고리즘:
 *   1. 첫 번째 `## ` 섹션 헤더를 찾는다 (릴리즈 섹션)
 *   2. 해당 섹션에서 `- ` 로 시작하는 bullet 줄을 순서대로 추출
 *   3. maxBullets 개수만큼 반환 (마크다운 문자열)
 *   4. 섹션 헤더(첫 번째 ## 줄)도 함께 반환해서 어느 버전인지 표시
 */

/**
 * markdown에서 첫 번째 ## 섹션 제목을 추출한다.
 * 예: "## 2026년 4월 (v2.0.0) — 카페24 공식 앱 정식 출시 🎉"
 */
export function extractLatestSectionTitle(md: string): string {
  const lines = md.split('\n');
  for (const line of lines) {
    // [Unreleased] 계열이 아닌 실제 릴리즈 섹션만 찾기
    if (line.startsWith('## ') && !line.includes('Unreleased') && !line.includes('예정')) {
      return line.replace(/^## /, '').trim();
    }
  }
  return '';
}

/**
 * markdown에서 최신 릴리즈 섹션의 bullet 항목을 최대 maxBullets개 추출한다.
 * 반환값은 plain text 배열 (마크다운 인라인 기호 제거).
 */
export function extractRecentHighlights(md: string, maxBullets = 5): string[] {
  const lines = md.split('\n');
  const bullets: string[] = [];
  let inTargetSection = false;

  for (const line of lines) {
    // [Unreleased] 계열이 아닌 첫 번째 ## 섹션 진입
    if (line.startsWith('## ') && !line.includes('Unreleased') && !line.includes('예정')) {
      if (!inTargetSection) {
        inTargetSection = true;
        continue;
      } else {
        // 다음 ## 섹션 시작 → 종료
        break;
      }
    }

    if (!inTargetSection) continue;

    // 다음 ## 섹션이 시작되면 중단 (위에서 처리하지만 방어)
    if (line.startsWith('## ')) break;

    // bullet 줄: `- ` 또는 `* ` 로 시작
    const bulletMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (bulletMatch) {
      // 마크다운 인라인 기호 제거 (**bold**, `code`, 이모지는 유지)
      const text = bulletMatch[1]
        .replace(/\*\*([^*]+)\*\*/g, '$1')  // **bold** → bold
        .replace(/`([^`]+)`/g, '$1')         // `code` → code
        .trim();
      if (text) {
        bullets.push(text);
        if (bullets.length >= maxBullets) break;
      }
    }
  }

  return bullets;
}
