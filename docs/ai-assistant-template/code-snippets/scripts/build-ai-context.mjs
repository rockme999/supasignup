#!/usr/bin/env node
/**
 * AI 컨텍스트 빌드 스크립트
 * docs/ 폴더의 마크다운 문서를 workers/api/src/ai-context/ TS 상수 파일로 변환합니다.
 *
 * 사용: node scripts/build-ai-context.mjs
 * 또는:  npm run build:ai-context (package.json에 등록 후)
 *
 * 백틱(`)과 템플릿 리터럴 시작(`${`) 자동 이스케이프 처리.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DOCS = resolve(ROOT, 'docs');
const OUT_DIR = resolve(ROOT, 'workers/api/src/ai-context');

// 변환할 문서 목록: [소스 경로, 출력 파일명, export 상수명]
const FILES = [
  ['ai-assistant/kb-public.md', 'kb-public.ts', 'KB_PUBLIC'],
  ['FAQ.md',                    'faq.ts',        'FAQ'],
  ['개인정보처리방침.md',         'privacy.ts',    'PRIVACY'],
  ['카페24-ScriptTag사용가이드.md', 'usage-guide.ts', 'USAGE_GUIDE'],
];

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`[build-ai-context] Created directory: ${OUT_DIR}`);
}

for (const [srcRelPath, outFile, exportName] of FILES) {
  const srcPath = resolve(DOCS, srcRelPath);
  const outPath = resolve(OUT_DIR, outFile);

  let content;
  try {
    content = readFileSync(srcPath, 'utf-8');
  } catch (e) {
    console.error(`[build-ai-context] ERROR: Cannot read ${srcPath}`);
    process.exit(1);
  }

  // 백틱과 ${ 이스케이프 (TS 템플릿 리터럴 안에서 깨지지 않도록)
  const escaped = content
    .replace(/\\/g, '\\\\')   // 기존 백슬래시 먼저 이스케이프
    .replace(/`/g, '\\`')     // 백틱 이스케이프
    .replace(/\$\{/g, '\\${'); // 템플릿 표현식 이스케이프

  const ts = `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// 소스: docs/${srcRelPath}
// 재생성: node scripts/build-ai-context.mjs

export const ${exportName} = \`${escaped}\`;
`;

  writeFileSync(outPath, ts, 'utf-8');
  const sizeKB = (content.length / 1024).toFixed(1);
  console.log(`[build-ai-context] ${outFile} (${sizeKB} KB) → ${outPath}`);
}

console.log('[build-ai-context] Done.');
