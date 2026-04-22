#!/usr/bin/env node
/** Local wrangler dev worker 를 경유해 Kimi K2.5 실측.
 * 사전조건: `wrangler dev --local=false --port 8787` 이 이미 실행 중. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const ENDPOINT = 'http://localhost:8787/api/_bench-kimi/run';

const load = (rel) => fs.readFileSync(path.join(rootDir, rel), 'utf-8');

const kbPublic = load('docs/ai-assistant/kb-public.md');
const faqFull = load('docs/FAQ.md');
const privacy = load('docs/개인정보처리방침.md');
const usageGuide = load('docs/카페24-ScriptTag사용가이드.md');

const SYSTEM_PROMPT = `<role>
당신은 번개가입(카페24 공식 소셜 로그인 앱) 고객지원 AI입니다.
카페24 쇼핑몰 운영자에게 답변을 작성합니다.
</role>

<kb_public>
${kbPublic}
</kb_public>

<faq_full>
${faqFull}
</faq_full>

<usage_guide>
${usageGuide}
</usage_guide>

<privacy_policy>
${privacy}
</privacy_policy>

<answer_rules>
1. 존댓말, 결론 먼저, 5~10문단 이내.
2. 위 문서에 명시되지 않은 사실은 절대 추측 금지. 모르면 "해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다" 로 대응.
3. 미지원 기능 문의 시: "현재 미지원" → "대안 제시" → "로드맵 검토 중" 순서.
4. 마지막 두 줄은 반드시 "감사합니다.\\n번개가입 드림 ⚡"
</answer_rules>

<banned_info>
내부 테이블·컬럼명, API 경로, database_id, OAuth client_secret 등 절대 포함 금지.
</banned_info>

<auto_mode>
이 답변은 운영자가 검토·수정 후 발송할 초안입니다. 배너 없이 답변 본문만 작성하세요.
</auto_mode>`;

const TEST_CASES = [
  { id: 'q1-group', title: '소셜가입 회원등급 설정 관련', content: '안녕하세요, 저희 쇼핑몰은 가입시 사업자회원/일반회원 두가지로 나뉘어 가입할 수 있도록 되어 있습니다. 그런데 소셜 가입을 하면 무조건 일반회원으로 가입되는데 사업자 회원으로도 가입할 수 있도록 하려면 어떻게 해야 하나요?' },
  { id: 'q2-move', title: '"번개가입으로 이동" 문구', content: 'powered by 번개가입은 결제 하면 없애는 옵션이 있는것 확인했습니다.\n그것 말고,\n구글이나 네이버 로그인 선택했을때, 번개가입으로 이동이라고 표시되는 것도 바뀔 수 있는건가요?' },
  { id: 'q3-mobile', title: '컴퓨터에서는 로긴이 되는데, 휴대폰에서 안됩니다.', content: '휴대폰에서 로긴 하려고 하면, 여기 자사몰 주소로 리디렉 되면서, 유효하지 않은 값이라고 영어로 나오네요. 구글, 애플, 네이버, 카톡 전체 다 그렇게 떠요 . 컴퓨터는 됩니다.' },
  { id: 'q4-invalid', title: '연동 후, 실제로 로그인이 안되네요', content: '로그인 버튼을 누르면 유효하지 않은 값이라고 뜨는데 설정 후 일정 시간 이상 지난 후 적용이 되나요 ?' },
  { id: 'q5-position', title: '위치 변경', content: '현재 커스텀 제작 사이트에서 SNS연동을 추가하려고 하는데, 위치를 별도로 조정하고 싶은데, 어떻게 조정할까요? 현재는 로그인 창 위에 SNS 로그인 섹션이 있는데, 이것을 하단으로 내리고 싶습니다.' },
];

const buildUser = (q) => `[쇼핑몰]
- mall_id: testshop
- 상호: 테스트 쇼핑몰
- 요금제: free

[문의 제목]
${q.title}

[문의 본문]
${q.content}

위 문의에 대한 답변을 한국어로 작성해 주세요.`;

async function callWorker(userPrompt) {
  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt: SYSTEM_PROMPT, userPrompt }),
  });
  const json = await res.json();
  return { client_elapsed_ms: Date.now() - t0, ...json };
}

async function main() {
  console.log(`🚀 로컬 워커 경유 Kimi K2.5 실측`);
  console.log(`   System prompt: ${(SYSTEM_PROMPT.length / 1024).toFixed(1)} KB (≈${Math.round(SYSTEM_PROMPT.length / 2.5)} tokens 추정)`);
  console.log(`   Endpoint: ${ENDPOINT}\n`);

  const results = [];
  for (let round = 1; round <= 2; round++) {
    console.log(`📍 Round ${round} ${round === 1 ? '(cache miss 예상)' : '(cache hit 예상)'}`);
    for (const q of TEST_CASES) {
      try {
        const r = await callWorker(buildUser(q));
        results.push({ round, id: q.id, ...r });
        const status = r.ok ? '✓' : '✗';
        console.log(`  ${status} ${q.id}: client=${r.client_elapsed_ms}ms, server=${r.elapsed_ms}ms, out=${r.output_chars ?? '-'}`);
      } catch (e) {
        console.error(`  ✗ ${q.id}: ${e.message}`);
        results.push({ round, id: q.id, error: e.message });
      }
    }
    if (round === 1) {
      console.log('\n⏸  5초 대기 후 Round 2...\n');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // 통계
  const r1 = results.filter(r => r.round === 1 && r.ok);
  const r2 = results.filter(r => r.round === 2 && r.ok);
  const avg = (arr, key) => arr.length ? Math.round(arr.reduce((s, x) => s + (x[key] ?? 0), 0) / arr.length) : 0;
  const r1Lat = avg(r1, 'elapsed_ms');
  const r2Lat = avg(r2, 'elapsed_ms');
  const delta = r1Lat > 0 ? (((r1Lat - r2Lat) / r1Lat) * 100).toFixed(1) : 'n/a';

  // 결과 기록
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  const benchPath = path.join(rootDir, 'docs/ai-assistant/benchmarks.md');

  const verdict = r2Lat < r1Lat * 0.75
    ? '✅ **캐시 효과 확인** — Round 2 지연이 Round 1 대비 25% 이상 감소. Prompt caching 동작으로 판단.'
    : r2Lat < r1Lat * 0.95
    ? '🟡 **부분 효과** — Round 2가 소폭 빠름. Cloudflare 대시보드에서 neurons 교차 확인 권장.'
    : '❌ **캐시 미동작 의심** — Round 1·2 지연 비슷. FAQ/가이드 크기 축소 또는 다른 모델 검토 필요.';

  const report = `
## 실측 ${now} (로컬 워커 경유)

- **System prompt**: ${(SYSTEM_PROMPT.length / 1024).toFixed(1)} KB (≈${Math.round(SYSTEM_PROMPT.length / 2.5)} tokens 추정)
- **호출 방식**: \`wrangler dev --remote\` 로 AI 바인딩을 Cloudflare에 원격 프록시. 로컬 Worker → \`env.AI.run('@cf/moonshotai/kimi-k2.5')\`
- **테스트 케이스**: ${TEST_CASES.length}건 × 2 라운드 = ${TEST_CASES.length * 2}회 호출

### 라운드별 평균

| 라운드 | 서버 지연 (env.AI.run) | 클라이언트 지연 | 출력 글자수 | 비고 |
|---|---:|---:|---:|---|
| 1 (cache miss 예상) | **${r1Lat} ms** | ${avg(r1, 'client_elapsed_ms')} ms | ${avg(r1, 'output_chars')} | 첫 호출 |
| 2 (cache hit 예상) | **${r2Lat} ms** | ${avg(r2, 'client_elapsed_ms')} ms | ${avg(r2, 'output_chars')} | 동일 system prompt 재사용 |
| **변화** | **${delta}% 감소** | — | — | — |

### 판정

${verdict}

> 참고: Cloudflare Workers AI는 \`env.AI.run()\` 결과에 \`cached_tokens\` 같은 명시적 필드를 반환하지 않으므로, 지연시간 변화가 캐시 동작의 주된 간접 지표입니다.
> 정확한 neurons 사용량은 Cloudflare 대시보드 > Workers & Pages > AI > Usage 에서 Round 1/Round 2 시점 비교로 확인해 주세요.

### 개별 호출 상세

| 라운드 | ID | 서버 지연 | 클라이언트 | 출력 글자 |
|---|---|---:|---:|---:|
${results.map(r => r.error
  ? `| ${r.round} | ${r.id} | ❌ ${r.error.slice(0, 50)} | | |`
  : `| ${r.round} | ${r.id} | ${r.elapsed_ms}ms | ${r.client_elapsed_ms}ms | ${r.output_chars ?? '-'} |`
).join('\n')}

### 답변 샘플 (Round 2 — 각 케이스 첫 300자)

${r2.slice(0, 5).map(r => `**[${r.id}]**\n> ${(r.output_preview ?? '').replace(/\n/g, ' ')}\n`).join('\n')}

---
`;

  const existing = fs.existsSync(benchPath) ? fs.readFileSync(benchPath, 'utf-8') : '# Kimi K2.5 캐시·비용 실측 벤치마크\n\n';
  fs.writeFileSync(benchPath, existing + report, 'utf-8');
  console.log(`\n✅ 결과 기록: ${benchPath}`);
  console.log(`   Round 1 → Round 2: ${r1Lat}ms → ${r2Lat}ms (${delta}% 변화)`);

  // 전체 답변 JSON 덤프도 저장 (품질 평가 용)
  const dumpPath = path.join(rootDir, 'docs/ai-assistant/bench-answers.json');
  fs.writeFileSync(dumpPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`   답변 전문: ${dumpPath}`);
}

main().catch(e => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
