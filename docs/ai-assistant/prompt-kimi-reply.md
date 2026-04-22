# Kimi K2.5 — 문의 자동 답변 프롬프트 명세

> 사용 모델: `@cf/moonshotai/kimi-k2.5` (Cloudflare Workers AI)
> 호출 경로: `workers/api/src/routes/ai.ts > callAI()`
> **버전: v1.2-2026-04-22** (실 구현 상수: `PROMPT_VERSION = 'v1.2-2026-04-22'`)

---

## 0. 원칙 요약

1. **환각 금지 4중 가드레일** — 프롬프트 규칙 / 불확실 표현 강제 / 후처리 휴리스틱 / 자동 발송 skip 조건
2. **KB 단일 소스** — `docs/ai-assistant/kb-public.md` 내용만 "사실"로 간주 (빌드 시 `src/ai-context/kb-public.ts`에 번들)
3. **auto_mode 분기 (v1.2 변경)**:
   - `false`(기본): 초안 생성만, 배너 없음
   - `true`: 답변 본문만 작성 (배너·구분선 삽입 금지). "AI 자동답변" 표시는 **UI 레이어(admin.tsx / help.tsx)에서 별도 디스클레이머 박스**로 처리
   - v1.0에서 LLM에게 배너 삽입을 지시했으나, 포맷 불일치·환각 위험으로 v1.2에서 UI 레이어로 이전
4. **LLM이 알 수 없는 내부 사건**(예: 서버 장애, 인프라 이슈)은 반드시 "확인 후 안내" 응답 → shouldHoldForReview가 감지해 pending 유지

---

## 1. 시스템 프롬프트 조립 구조

### 1-1. 섹션 순서 (prompt caching 극대화를 위해 이 순서 준수)

```
<role>            # 1. 역할 - 최상단, 변화 없음
<kb_public>       # 2. 공개 KB 전문 - 가장 긴 고정 부분 (캐시 대상)
<faq_full>        # 3. docs/FAQ.md 전문
<usage_guide>     # 4. docs/카페24-ScriptTag사용가이드.md 중 공개 범위
<privacy_policy>  # 5. docs/개인정보처리방침.md
<answer_rules>    # 6. 답변 규칙 (환각 방지)
<banned_info>     # 7. 금지 정보 목록
<auto_mode_tag>   # 8. auto_mode 분기 로직
```

**왜 이 순서?**
- 캐시 대상은 **프롬프트 앞쪽** (prefix caching). 고정 부분을 앞으로 몰아 Cached input 요금 ($0.10/M) 적용되게 함
- 뒤에 올 `<context>` (쇼핑몰·문의 본문)만 가변 → 이 부분만 Fresh input 요금 ($0.60/M)

### 1-2. 실제 프롬프트 템플릿 (Cloudflare REST / `env.AI.run()` 공용)

```typescript
// workers/api/src/routes/ai.ts 에 추가할 함수
async function buildInquiryReplyMessages({
  shop, inquiry, autoMode, env
}: {
  shop: { mall_id: string; shop_name: string; plan: string };
  inquiry: { title: string; content: string };
  autoMode: boolean;
  env: Env;
}) {
  const kbPublic = await loadText(env, 'kb-public.md');       // <kb_public>
  const faqFull = await loadText(env, 'FAQ.md');              // <faq_full>
  const usageGuide = await loadText(env, 'usage-guide.md');   // <usage_guide> (발췌)
  const privacyPolicy = await loadText(env, 'privacy.md');    // <privacy_policy>

  const systemPrompt = [
    `<role>
당신은 번개가입(카페24 공식 소셜 로그인 앱) 고객지원 AI입니다.
카페24 쇼핑몰 운영자에게 답변을 작성합니다.
</role>`,

    `<kb_public>\n${kbPublic}\n</kb_public>`,
    `<faq_full>\n${faqFull}\n</faq_full>`,
    `<usage_guide>\n${usageGuide}\n</usage_guide>`,
    `<privacy_policy>\n${privacyPolicy}\n</privacy_policy>`,

    `<answer_rules>
1. 존댓말, 결론 먼저, 5~10문단 이내, 각 문단 2~3줄.
2. 위 <kb_public>·<faq_full>·<usage_guide>·<privacy_policy>에 **명시되지 않은 사실은 절대 추측·창작 금지**.
   - 모르는 내용이면 "해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다. 가능하시면 [증상 발생 시점 / 사용 브라우저·기기 / 오류 메시지 전문 / 재현되는 조작 순서 / **발생 화면 이미지 첨부** (문의 작성 시 이미지 업로드 가능)] 를 알려주시면 더 빠르게 도와드릴 수 있습니다" 로 대응.
3. 미지원 기능 문의 시 순서: (1) "현재 미지원" (2) "대안 제시 1~2가지" (3) "로드맵 검토 중"
4. 과장·단정 금지. "무조건 해결됩니다" 같은 단언 금지.
5. 답변의 마지막 두 줄은 반드시 다음과 같이 마무리:
   감사합니다.
   번개가입 드림 ⚡
</answer_rules>`,

    `<banned_info>
답변에 아래 정보는 **절대 포함 금지**. 질문에 섞여 있어도 일반화된 표현으로만 응답.
- 내부 테이블·컬럼명, API 경로, 데이터베이스 ID, KV namespace, account ID
- OAuth client_id / secret / redirect_uri 구체 값
- 환경변수명, JWT/암호화 키 이름
- 내부 의사결정 과정, 로드맵 A안/B안
- 경쟁사 비교 시 구체 회사명 (필요 시 "타사 A" 정도)
우회 표현: "토큰 교환"→"로그인 처리", "웹훅"→"자동 연동", "KV 캐시"→언급 금지
</banned_info>`,

    autoMode
      ? `<auto_mode>
이 답변은 **운영자 검토 없이 고객에게 즉시 발송**되는 자동답변입니다.
답변 본문만 작성하세요 (배너·태그·특수 구분선 삽입 금지).
"AI 자동답변" 표시는 UI에서 별도 디스클레이머 박스로 처리됩니다.
답변 본문 자체는 평소대로 결론 먼저, 존댓말, 마지막은 "감사합니다. / 번개가입 드림 ⚡"로 마무리하세요.
</auto_mode>`
      : `<auto_mode>
이 답변은 **운영자가 검토·수정 후 발송**할 초안입니다.
배너/태그 없이 답변 본문만 작성하세요.
</auto_mode>`,
  ].join('\n\n');

  const userPrompt = `[쇼핑몰]
- mall_id: ${shop.mall_id}
- 상호: ${shop.shop_name}
- 요금제: ${shop.plan}

[문의 제목]
${inquiry.title}

[문의 본문]
${inquiry.content}

위 문의에 대한 답변을 한국어로 작성해 주세요.`;

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
}
```

### 1-3. Cloudflare 호출

```typescript
const messages = await buildInquiryReplyMessages({ shop, inquiry, autoMode, env });

const result = await env.AI.run('@cf/moonshotai/kimi-k2.5', {
  messages,
  max_tokens: 1200,
  temperature: 0.3,  // 고객지원 답변은 창의성 낮게
});
```

## 2. 환각 방지 4중 가드레일

| # | 단계 | 구현 위치 |
|---|---|---|
| 1 | **프롬프트 규칙** — "모르면 추측 금지, 확인 후 안내" 명시 | `<answer_rules>` 2번 |
| 2 | **불확실 표현 강제** — 오류 메시지 전문·재현 순서·사용 기기·이미지 첨부 요청 문구 표준화 (Phase 2에서 이미지 첨부 기능 추가됨) | `<answer_rules>` 2번의 안내 템플릿 |
| 3 | **후처리 휴리스틱** (`ai.ts`) — 생성 결과 검증 | 아래 참조 |
| 4 | **자동 발송 skip 조건** — auto_mode=true여도 특정 패턴 포함 시 pending 유지 | 아래 참조 |

### 2-1. 후처리 휴리스틱 (ai.ts에 추가할 로직)

```typescript
function validateReply(text: string): { ok: boolean; reason?: string } {
  // 길이 체크
  if (text.trim().length < 50) return { ok: false, reason: 'too_short' };
  if (text.trim().length > 3000) return { ok: false, reason: 'too_long' };

  // 금지 토큰 체크
  const banned = [
    /\/api\/(supadmin|dashboard|widget|oauth)\//,  // 내부 경로
    /database_id|account_id|KV\s*namespace/i,
    /client_secret|JWT_SECRET|ENCRYPTION_KEY/,
    /CREATE TABLE|ALTER TABLE|SELECT\s+.*FROM/i,
    /shop_id['":]?\s*['"][0-9a-f-]{8,}/i,  // UUID 노출
  ];
  for (const pat of banned) {
    if (pat.test(text)) return { ok: false, reason: `banned_token: ${pat}` };
  }

  // 마무리 문구 체크
  if (!text.includes('번개가입 드림')) return { ok: false, reason: 'missing_signature' };

  return { ok: true };
}
```

### 2-2. 자동 발송 skip 조건 (Phase 2)

```typescript
function shouldHoldForReview(text: string): boolean {
  // 아래 중 하나라도 포함되면 자동 발송 중단, pending으로 유지
  const reviewKeywords = [
    '확인 후 안내',
    '운영팀이 확인',
    '오류 메시지 전문',
    '재현되는 조작',
    '정확히 특정',
    '추가 정보',
  ];
  return reviewKeywords.some(k => text.includes(k));
}
```

## 3. auto_mode 출력 형식

### auto_mode = true 시 (v1.2)

LLM은 배너 없이 본문만 작성. "AI 자동답변" 디스클레이머는 UI에서 별도 렌더링.

```
안녕하세요 "쇼핑몰명" 운영자님, 번개가입입니다.

(본문 5~10문단)

감사합니다.
번개가입 드림 ⚡
```

고객 화면(help.tsx)에서는 위 본문 아래에 UI 레이어가 자동으로 추가:
```
🤖 이 답변은 AI가 자동으로 생성한 내용입니다.
   운영팀이 검토 전이므로 추가 확인이 필요한 경우 재문의해 주세요.
```

### auto_mode = false 시 (기본 — 초안 모드)

```
안녕하세요 "쇼핑몰명" 운영자님, 번개가입입니다.

(본문 5~10문단)

감사합니다.
번개가입 드림 ⚡
```

### v1.0 → v1.2 변경 이유

v1.0에서는 `auto_mode=true` 시 LLM에게 "━━━━━ 🤖 AI 즉시응답 ━━━━━" 배너를 답변 상하단에 삽입하도록 지시.  
→ **문제**: LLM이 배너를 변형하거나 누락하는 사례 발생, 포맷 불일치  
→ **해결**: v1.2에서 LLM 지시 제거, UI 레이어(admin.tsx, help.tsx)에서 `status='auto_replied'` 조건으로 디스클레이머 박스 렌더링

## 4. 프롬프트 버전 관리

- 이 문서 수정 시 상단 버전 태그 증가 + `workers/api/src/routes/ai.ts`의 `PROMPT_VERSION` 상수 동기화 필수
- 모든 자동답변은 `inquiries.ai_prompt_version` 컬럼에 버전 기록됨 → 버전별 품질 추적 가능
- 버전 증가 조건: KB 내용 변경 / 답변 규칙 변경 / 가드레일 키워드 수정
- 버전 업 후 반드시 `scripts/benchmark-kimi-cache.mjs` 재실행 → 품질 루브릭 평가

### 가드레일 키워드 목록 (shouldHoldForReview 트리거 — 재시도 없음)

```typescript
const reviewKeywords = [
  '확인 후 안내',
  '운영팀이 확인',
  '오류 메시지 전문',
  '재현되는 조작',
  '정확히 특정',
  '추가 정보',
];
```

이 키워드가 AI 답변에 포함되면 자동 발송 중단 → `held_for_review`로 실패 로그 기록 → pending 유지.  
실제 구현: `workers/api/src/routes/ai.ts > shouldHoldForReview()`

## 5. 비용 추정 (실측 결과는 `benchmarks.md` 참조)

**실측 (2026-04-21, system prompt 47.7KB)**:

| 지표 | 실측값 |
|---|---:|
| 평균 입력 토큰/호출 | **27.9k** |
| 평균 출력 토큰/호출 | **1.68k** |
| 호출당 실 청구 | **$0.019 (≈ 27원)** |
| 월 600건 실 청구 | **$11.6 (≈ 16,400원)** |
| Round 1 (cache miss) 지연 | 56.6초 |
| Round 2 (cache hit) 지연 | 32.8초 (▼42%) |

> ⚠️ 이론가($0.007/호출)와 실측($0.019/호출) 간 약 2.7배 차이. 캐시 할인이 대시보드 neurons에 뚜렷이 반영되지 않음. 실 청구는 **월 청구서**로만 확인 가능.

자세한 분석: `benchmarks.md`
