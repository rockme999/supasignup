/**
 * 경량 마크다운 → HTML 변환기.
 *
 * 용도: 문의 답변(AI 생성 또는 운영자 수동 작성)을 렌더링할 때 기본 마크다운을 HTML로 변환.
 * 지원 요소 (운영 문의 답변에 필요한 최소):
 *   - 헤딩 ## / ###
 *   - 굵게 **text**, 기울임 *text*
 *   - 인라인 코드 `text`, 코드 블록 ```text```
 *   - 리스트 `- text`, 번호 리스트 `1. text`
 *   - 인용 `> text`
 *   - 링크 [text](https://...)
 *   - 단락 (빈 줄로 구분)
 *   - 줄바꿈 (단일 newline → <br>)
 *
 * 보안:
 *   - 입력 전체를 HTML escape 먼저 적용 → LLM이 생성한 `<script>` 등도 무력화
 *   - 링크 URL은 https?:// 프로토콜만 허용 (javascript:, data: 방지)
 *
 * 동일 로직의 브라우저 JS 버전은 layout.tsx의 `MD_TO_HTML_BROWSER_JS` 상수 참조.
 */

const ESCAPE: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ESCAPE[ch] ?? ch);
}

/** renderMarkdown: mdToHtml의 alias — changelog 페이지 등에서 사용 */
export const renderMarkdown = (md: string): string => mdToHtml(md);

export function mdToHtml(md: string): string {
  if (!md) return '';
  // 1) 전체 escape 선행
  let text = escapeHtml(md).replace(/\r\n?/g, '\n');

  // 2) 코드 블록 ```...``` (multiline, greedy-safe)
  text = text.replace(/```([\s\S]*?)```/g, (_, code) => `\n<pre><code>${code.trim()}</code></pre>\n`);

  // 3) 인라인 코드 `...`
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');

  // 4) 헤딩 (줄 시작)
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // 5) 굵게 / 기울임 (escape 된 상태라 텍스트만 매칭)
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/(?<![*\w])\*([^*\n]+)\*(?!\w)/g, '<em>$1</em>');

  // 6) 링크 [label](url) — https?:// 만 허용
  text = text.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_, label: string, url: string) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`,
  );

  // 7) 인용 (> text) — 연속된 줄을 하나의 blockquote로 묶음
  text = text.replace(/(?:^> (.+)(?:\n|$))+/gm, (block) => {
    const lines = block.trim().split(/\n/).map((l) => l.replace(/^> /, ''));
    return `<blockquote>${lines.join('<br>')}</blockquote>\n`;
  });

  // 8) 리스트 처리 — 줄 단위로 <li> 변환 후 연속된 <li> 를 <ul>/<ol>로 감싸기
  const lines = text.split('\n');
  const out: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  for (const line of lines) {
    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/);
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/);
    if (ulMatch) {
      if (listType !== 'ul') {
        if (listType) out.push(`</${listType}>`);
        out.push('<ul>');
        listType = 'ul';
      }
      out.push(`<li>${ulMatch[1]}</li>`);
    } else if (olMatch) {
      if (listType !== 'ol') {
        if (listType) out.push(`</${listType}>`);
        out.push('<ol>');
        listType = 'ol';
      }
      out.push(`<li>${olMatch[1]}</li>`);
    } else {
      if (listType) {
        out.push(`</${listType}>`);
        listType = null;
      }
      out.push(line);
    }
  }
  if (listType) out.push(`</${listType}>`);
  text = out.join('\n');

  // 9) 수평선 --- (줄 전체가 --- 만인 경우)
  text = text.replace(/^---+$/gm, '<hr>');

  // 10) 단락·줄바꿈: 빈 줄로 단락 분리, 단락 내 \n → <br>. 블록 태그는 감싸지 않음.
  const BLOCK_RE = /^<(ul|ol|pre|h[1-6]|blockquote|table|hr)[\s>/]/i;
  text = text
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (BLOCK_RE.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return text;
}
