#!/usr/bin/env node
/**
 * Kimi K2.5 Prompt Caching 실측 스크립트
 *
 * 목적: Cloudflare Workers AI의 Kimi K2.5가 실제로 prompt caching을 동작시키는지 확인.
 *       동일한 system prompt로 N번 호출 후, neurons 사용량·지연시간을 기록.
 *
 * 실행 전 준비:
 *   1. Cloudflare API Token 발급 (Workers AI Read 권한)
 *      → https://dash.cloudflare.com/profile/api-tokens
 *   2. scripts/.env.bench 파일에 다음 추가:
 *        CF_ACCOUNT_ID=51d87fbebaf2f828db870031426ed63f
 *        CF_API_TOKEN=<발급받은 토큰>
 *
 * 실행:
 *   node scripts/benchmark-kimi-cache.mjs
 *
 * 결과: docs/ai-assistant/benchmarks.md 에 자동 추기(append)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

// ─── 환경변수 로드 (.env.bench 에서) ───────────────────────────
const envPath = path.join(__dirname, '.env.bench');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] ??= m[2];
  }
}

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;

if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
  console.error('❌ CF_ACCOUNT_ID / CF_API_TOKEN 이 필요합니다.');
  console.error('   scripts/.env.bench 에 설정하거나 환경변수로 주입하세요.');
  process.exit(1);
}

const MODEL = '@cf/moonshotai/kimi-k2.5';
const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${MODEL}`;

// ─── 공개 KB 로드 (실제 프롬프트와 동일 조건) ───────────────────
function loadText(relPath) {
  return fs.readFileSync(path.join(rootDir, relPath), 'utf-8');
}

const kbPublic = loadText('docs/ai-assistant/kb-public.md');
const faqFull = loadText('docs/FAQ.md');
const privacy = loadText('docs/개인정보처리방침.md');
// 카페24-ScriptTag사용가이드.md 는 40KB로 큰데, 실제 프롬프트에서는 발췌본을 쓴다.
// 여기선 캐시 효과를 제대로 보기 위해 전체 로드 (실 서비스에선 더 큼)
const usageGuide = loadText('docs/카페24-ScriptTag사용가이드.md');

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
2. 위 문서에 명시되지 않은 사실은 절대 추측 금지. 모르면 "해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다"로 대응.
3. 미지원 기능 문의 시: "현재 미지원" → "대안 제시" → "로드맵 검토 중" 순서.
4. 마지막 두 줄은 반드시 "감사합니다.\\n번개가입 드림 ⚡"
</answer_rules>

<banned_info>
내부 테이블·컬럼명, API 경로, database_id, OAuth client_secret 등 절대 포함 금지.
</banned_info>

<auto_mode>
이 답변은 운영자가 검토·수정 후 발송할 초안입니다. 배너 없이 답변 본문만 작성하세요.
</auto_mode>`;

// ─── 테스트 케이스 (과거 replied 문의 5건) ────────────────────────
const TEST_CASES = [
  {
    id: 'q1-group',
    title: '소셜가입 회원등급 설정 관련',
    content: '안녕하세요, 저희 쇼핑몰은 가입시 사업자회원/일반회원 두가지로 나뉘어 가입할 수 있도록 되어 있습니다. 그런데 소셜 가입을 하면 무조건 일반회원으로 가입되는데 사업자 회원으로도 가입할 수 있도록 하려면 어떻게 해야 하나요?',
  },
  {
    id: 'q2-move',
    title: '"번개가입으로 이동" 문구',
    content: 'powered by 번개가입은 결제 하면 없애는 옵션이 있는것 확인했습니다.\n그것 말고,\n구글이나 네이버 로그인 선택했을때, 번개가입으로 이동이라고 표시되는 것도 바뀔 수 있는건가요?',
  },
  {
    id: 'q3-mobile',
    title: '컴퓨터에서는 로긴이 되는데, 휴대폰에서 안됩니다.',
    content: '휴대폰에서 로긴 하려고 하면, 여기 자사몰 주소로 리디렉 되면서, 유효하지 않은 값이라고 영어로 나오네요. 구글, 애플, 네이버, 카톡 전체 다 그렇게 떠요 . 컴퓨터는 됩니다.',
  },
  {
    id: 'q4-invalid',
    title: '연동 후, 실제로 로그인이 안되네요',
    content: '로그인 버튼을 누르면 유효하지 않은 값이라고 뜨는데 설정 후 일정 시간 이상 지난 후 적용이 되나요 ?',
  },
  {
    id: 'q5-position',
    title: '위치 변경',
    content: '현재 커스텀 제작 사이트에서 SNS연동을 추가하려고 하는데, 위치를 별도로 조정하고 싶은데, 어떻게 조정할까요? 현재는 로그인 창 위에 SNS 로그인 섹션이 있는데, 이것을 하단으로 내리고 싶습니다.',
  },
];

function buildUserPrompt(q) {
  return `[쇼핑몰]
- mall_id: testshop
- 상호: 테스트 쇼핑몰
- 요금제: free

[문의 제목]
${q.title}

[문의 본문]
${q.content}

위 문의에 대한 답변을 한국어로 작성해 주세요.`;
}

// ─── 호출 루틴 ──────────────────────────────────────────────
async function callKimi(userPrompt) {
  const body = {
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: 1200,
    temperature: 0.3,
  };

  const t0 = Date.now();
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const elapsed = Date.now() - t0;
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(`API Error: ${res.status} ${JSON.stringify(json.errors ?? json)}`);
  }

  // neurons usage는 응답 헤더 또는 body.result 에 있을 수 있음
  const usage = json.result?.usage ?? {};
  const neuronsHeader = res.headers.get('cf-ai-neurons');
  return {
    elapsed_ms: elapsed,
    response: json.result?.response ?? json.result?.text ?? '',
    prompt_tokens: usage.prompt_tokens,
    completion_tokens: usage.completion_tokens,
    cached_tokens: usage.cached_tokens ?? usage.prompt_tokens_cached,
    total_tokens: usage.total_tokens,
    neurons_header: neuronsHeader,
  };
}

// ─── 메인 ──────────────────────────────────────────────────
async function main() {
  console.log(`🚀 Kimi K2.5 Prompt Caching 실측 시작`);
  console.log(`   System prompt: ${(SYSTEM_PROMPT.length / 1024).toFixed(1)} KB`);
  console.log(`   Test cases: ${TEST_CASES.length}\n`);

  const results = [];

  // Round 1: 첫 호출 (cache miss 예상)
  console.log('📍 Round 1 (cache miss 예상)');
  for (const q of TEST_CASES) {
    try {
      const r = await callKimi(buildUserPrompt(q));
      results.push({ round: 1, id: q.id, ...r });
      console.log(`  ✓ ${q.id}: ${r.elapsed_ms}ms, prompt=${r.prompt_tokens}, cached=${r.cached_tokens ?? 'n/a'}, out=${r.completion_tokens}`);
    } catch (e) {
      console.error(`  ✗ ${q.id}: ${e.message}`);
      results.push({ round: 1, id: q.id, error: e.message });
    }
  }

  console.log('\n⏸  5초 대기...\n');
  await new Promise(r => setTimeout(r, 5000));

  // Round 2: 반복 호출 (cache hit 예상)
  console.log('📍 Round 2 (cache hit 예상)');
  for (const q of TEST_CASES) {
    try {
      const r = await callKimi(buildUserPrompt(q));
      results.push({ round: 2, id: q.id, ...r });
      console.log(`  ✓ ${q.id}: ${r.elapsed_ms}ms, prompt=${r.prompt_tokens}, cached=${r.cached_tokens ?? 'n/a'}, out=${r.completion_tokens}`);
    } catch (e) {
      console.error(`  ✗ ${q.id}: ${e.message}`);
      results.push({ round: 2, id: q.id, error: e.message });
    }
  }

  // ─── 결과 기록 ────────────────────────────────────────────
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' KST';
  const benchPath = path.join(rootDir, 'docs/ai-assistant/benchmarks.md');

  const r1 = results.filter(r => r.round === 1 && !r.error);
  const r2 = results.filter(r => r.round === 2 && !r.error);

  const avgLatency = (arr) => arr.length ? Math.round(arr.reduce((s, x) => s + x.elapsed_ms, 0) / arr.length) : 0;
  const avgPrompt = (arr) => arr.length ? Math.round(arr.reduce((s, x) => s + (x.prompt_tokens ?? 0), 0) / arr.length) : 0;
  const avgCached = (arr) => arr.length ? Math.round(arr.reduce((s, x) => s + (x.cached_tokens ?? 0), 0) / arr.length) : 0;
  const avgOut = (arr) => arr.length ? Math.round(arr.reduce((s, x) => s + (x.completion_tokens ?? 0), 0) / arr.length) : 0;

  const costPerCall = ({ prompt, cached, out }) => {
    const fresh = Math.max(0, prompt - cached);
    return (fresh / 1e6) * 0.60 + (cached / 1e6) * 0.10 + (out / 1e6) * 3.00;
  };

  const r1Summary = { prompt: avgPrompt(r1), cached: avgCached(r1), out: avgOut(r1), latency: avgLatency(r1) };
  const r2Summary = { prompt: avgPrompt(r2), cached: avgCached(r2), out: avgOut(r2), latency: avgLatency(r2) };

  const report = `
## 실측 ${now}

- **System prompt 길이**: ${(SYSTEM_PROMPT.length / 1024).toFixed(1)} KB
- **테스트 케이스**: ${TEST_CASES.length}건 × 2 라운드 = ${TEST_CASES.length * 2}회 호출

### 라운드별 평균

| 라운드 | 평균 지연 | 평균 prompt_tokens | 평균 cached_tokens | 평균 output | 추정 비용/호출 |
|---|---:|---:|---:|---:|---:|
| 1 (cache miss) | ${r1Summary.latency}ms | ${r1Summary.prompt} | ${r1Summary.cached} | ${r1Summary.out} | $${costPerCall(r1Summary).toFixed(5)} |
| 2 (cache hit 예상) | ${r2Summary.latency}ms | ${r2Summary.prompt} | ${r2Summary.cached} | ${r2Summary.out} | $${costPerCall(r2Summary).toFixed(5)} |

**캐시 동작 판단**: ${
  r2Summary.cached > r1Summary.cached
    ? '✅ Round 2에서 cached_tokens 증가 — Prompt caching 동작 확인'
    : r2Summary.cached === 0 && r1Summary.cached === 0
    ? '⚠️ cached_tokens 가 양 라운드 모두 0 — Cloudflare가 필드로 반환하지 않거나 캐싱 미적용. Cloudflare 대시보드 > AI > Usage 확인 필요.'
    : '❓ 반응 불명확 — 대시보드 교차확인 필요'
}

**절감률 (비용 기준)**: ${
  r1Summary.prompt > 0 && r2Summary.cached > 0
    ? `${((1 - costPerCall(r2Summary) / costPerCall(r1Summary)) * 100).toFixed(1)}%`
    : 'n/a (cached_tokens 미반환)'
}

### 개별 호출 상세

| 라운드 | ID | 지연 | prompt | cached | output |
|---|---|---:|---:|---:|---:|
${results.map(r => r.error
  ? `| ${r.round} | ${r.id} | ❌ ${r.error.slice(0, 60)} |`
  : `| ${r.round} | ${r.id} | ${r.elapsed_ms}ms | ${r.prompt_tokens ?? '-'} | ${r.cached_tokens ?? '-'} | ${r.completion_tokens ?? '-'} |`
).join('\n')}

### 답변 샘플 (Round 2 - 각 케이스 첫 200자)

${r2.slice(0, 3).map(r => `**${r.id}**\n> ${(r.response ?? '').slice(0, 200).replace(/\n/g, ' ')}...\n`).join('\n')}

---
`;

  // 기존 파일에 append (없으면 헤더 포함 새로 생성)
  let existing = '';
  if (fs.existsSync(benchPath)) {
    existing = fs.readFileSync(benchPath, 'utf-8');
  } else {
    existing = `# Kimi K2.5 캐시·비용 실측 벤치마크

> 자동 문의 답변용 프롬프트의 실제 Cloudflare Workers AI 동작 기록.
> 새 실측을 돌릴 때마다 \`scripts/benchmark-kimi-cache.mjs\` 를 실행하면 이 파일 아래에 추가됩니다.

`;
  }
  fs.writeFileSync(benchPath, existing + report, 'utf-8');

  console.log(`\n✅ 결과 기록 완료: ${benchPath}`);
  console.log(`\n📊 최종 요약`);
  console.log(`   Round 1 → Round 2 지연 변화: ${r1Summary.latency}ms → ${r2Summary.latency}ms`);
  console.log(`   Round 1 → Round 2 cached_tokens 변화: ${r1Summary.cached} → ${r2Summary.cached}`);
  console.log(`   Round 1 → Round 2 비용 변화: $${costPerCall(r1Summary).toFixed(5)} → $${costPerCall(r2Summary).toFixed(5)}`);
}

main().catch(e => {
  console.error('❌ Fatal:', e);
  process.exit(1);
});
