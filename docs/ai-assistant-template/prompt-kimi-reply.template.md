# {{서비스명}} 자동 답변 프롬프트 — 템플릿

> **이 파일을 작성하는 방법**
> - 아래 구조를 유지하면서 `{{플레이스홀더}}` 채움
> - 프롬프트 version 은 `workers/api/src/routes/ai.ts` 의 `PROMPT_VERSION` 상수와 일치
> - 내용 변경 시 PROMPT_VERSION 증가 + `npm run build:ai-context` 재빌드

버전: v1.0 ({{YYYY-MM-DD}})
연관 모델: `{{AI_MODEL}}` (예: `@cf/moonshotai/kimi-k2.5`)

---

## 0. 원칙 요약

1. **환각 금지 4중 가드레일** — 프롬프트 규칙 / 불확실 표현 강제 / 후처리 휴리스틱 / 자동 발송 skip 조건
2. **KB 단일 소스** — `kb-public.md` 내용만 "사실"로 간주
3. **auto_mode 분기** — `false`(기본)면 초안 생성만, `true`면 UI 레이어에서 "🤖 AI 자동응답" 디스클레이머 박스 표시 (답변 본문에 배너 삽입 금지)
4. **LLM이 알 수 없는 내부 사건**(예: 서버 장애·인프라 이슈)은 반드시 "확인 후 안내" 응답 → 운영자 수동 대응

---

## 1. 시스템 프롬프트 조립 구조 (Prompt caching 최적화)

```
<role>            # 1. 역할 - 최상단, 변하지 않음
<kb_public>       # 2. 공개 KB 전문 - 가장 긴 고정 부분 (캐시 대상)
<faq_full>        # 3. docs/FAQ.md 전문
<usage_guide>     # 4. 사용 가이드 공개 범위
<privacy_policy>  # 5. 개인정보처리방침
<answer_rules>    # 6. 답변 규칙 (환각 방지)
<banned_info>     # 7. 금지 정보 목록
<auto_mode_tag>   # 8. auto_mode 분기 로직
```

**왜 이 순서**: prefix caching 적용되는 고정 부분을 앞으로 몰아 cached input 요금($0.10/M) 활용.

---

## 2. `<role>` 섹션

```
당신은 {{서비스명}}({{서비스 한 줄 설명}}) 고객지원 AI입니다.
{{플랫폼 주체}} 운영자에게 답변을 작성합니다.
```

**번개가입 예시**:
```
당신은 번개가입(카페24 공식 소셜 로그인 앱) 고객지원 AI입니다.
카페24 쇼핑몰 운영자에게 답변을 작성합니다.
```

---

## 3. `<answer_rules>` 섹션

```
1. 존댓말, 결론 먼저, 5~10문단 이내, 각 문단 2~3줄.
2. 위 <kb_public>·<faq_full>·<usage_guide>·<privacy_policy> 에 **명시되지 않은 사실은 절대 추측·창작 금지**.
   - 모르는 내용이면 "해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다. 가능하시면 [증상 발생 시점 / 사용 브라우저·기기 / 화면에 표시된 오류 메시지 전문 / 재현되는 조작 순서{{첨부기능이 있으면 " / 발생 화면 이미지 첨부"}}] 를 알려주시면 더 빠르게 도와드릴 수 있습니다" 로 대응.
3. 미지원 기능 문의 시 순서: (1) "현재 미지원" (2) "대안 제시 1~2가지" (3) "로드맵 검토 중"
4. 과장·단정 금지. "무조건 해결됩니다" 같은 단언 금지.
5. 답변의 마지막 두 줄은 반드시 다음과 같이 마무리:
   감사합니다.
   {{서비스명}} 드림 {{이모지}}
```

---

## 4. `<banned_info>` 섹션

```
답변에 아래 정보는 **절대 포함 금지**. 질문에 섞여 있어도 일반화된 표현으로만 응답.
- 내부 테이블·컬럼명, API 경로, 데이터베이스 ID, KV namespace, 계정 ID
- OAuth client_id / secret / redirect_uri 구체 값
- 환경변수명, JWT/암호화 키 이름
- 내부 의사결정 과정, 로드맵 A안/B안
- 경쟁사 비교 시 구체 회사명 (필요 시 "타사 A" 정도)
- TODO: {{서비스 고유 금지 항목}}
우회 표현:
- "토큰 교환" → "로그인 처리"
- "웹훅" → "자동 연동"
- "KV 캐시" → 언급 금지
- TODO: {{서비스별 추가 우회 표현}}
```

---

## 5. `<auto_mode>` 분기

### autoMode = true (전역 자동답변 ON 상태의 실 발송)
```
이 답변은 **운영자 검토 없이 고객에게 즉시 발송**되는 자동답변입니다.
답변 본문만 작성하세요 (배너·태그·특수 구분선 삽입 금지). "AI 자동답변" 표시는
UI에서 별도 디스클레이머 박스로 처리됩니다.
답변 본문 자체는 평소대로 결론 먼저, 존댓말, 마지막은 마무리 서명으로.
```

### autoMode = false (운영자 수동 검토용 초안)
```
이 답변은 **운영자가 검토·수정 후 발송**할 초안입니다.
배너/태그 없이 답변 본문만 작성하세요.
```

⚠️ **중요**: 초기 설계(v1.0)는 autoMode=true 시 LLM이 본문에 `━━━ AI 즉시응답 ━━━` 배너를 삽입하도록 지시했으나, 비결정성(LLM이 배너 형식을 틀리거나 빼먹음) 때문에 **UI 레이어 디스클레이머 박스**로 교체(v1.2). LLM에게 배너 삽입시키지 말 것.

---

## 6. 환각 방지 4중 가드레일 구현

### 6-1. 프롬프트 규칙 (위 `<answer_rules>` 2번)

### 6-2. 불확실 표현 강제
표준 안내 문구: `해당 부분은 운영팀이 확인 후 정확히 안내드리겠습니다...`

### 6-3. 후처리 휴리스틱 (`validateReply`)
```typescript
export function validateReply(text: string): { ok: boolean; reason?: string } {
  if (text.trim().length < 50) return { ok: false, reason: 'too_short' };
  if (text.trim().length > 3000) return { ok: false, reason: 'too_long' };

  const banned = [
    /\/api\/(supadmin|dashboard|widget|oauth)\//,   // 내부 경로
    /database_id|account_id|KV\s*namespace/i,
    /client_secret|JWT_SECRET|ENCRYPTION_KEY/,
    /CREATE TABLE|ALTER TABLE|SELECT\s+.*FROM/i,
    /shop_id['":]?\s*['"][0-9a-f-]{8,}/i,           // UUID 노출
    // TODO: {{서비스 고유 금지 패턴 추가}}
  ];
  for (const pat of banned) {
    if (pat.test(text)) return { ok: false, reason: `banned_token: ${pat}` };
  }

  if (!text.includes('{{서비스명}} 드림')) return { ok: false, reason: 'missing_signature' };
  return { ok: true };
}
```

### 6-4. 자동 발송 skip 조건 (`shouldHoldForReview`)
```typescript
export function shouldHoldForReview(text: string): boolean {
  const reviewKeywords = [
    '확인 후 안내',
    '운영팀이 확인',
    '오류 메시지 전문',
    '재현되는 조작',
    '정확히 특정',
    '추가 정보',
    // TODO: 서비스 고유 리스크 키워드
  ];
  return reviewKeywords.some(k => text.includes(k));
}
```

이 키워드 중 하나라도 생성된 답변에 있으면 자동 발송 중단 → `pending` 유지 → 운영자 수동 처리.

---

## 7. Cloudflare 호출

```typescript
const result = await env.AI.run('{{AI_MODEL}}', {
  messages,
  max_tokens: 1200,
  temperature: 0.3,  // 고객지원 답변은 창의성 낮게
});
```

---

## 8. 비용 추정 (실측은 `benchmarks.md`)

| 시나리오 | 토큰 (추정) | 비용/호출 (cache hit) |
|---|---|---|
| 시스템 프롬프트 (KB+FAQ+가이드+방침) | {{?}}K | ${{?}} |
| 유저 프롬프트 (문의) | ~500 | ${{?}} |
| 출력 (답변 500~1000) | ~800 | ${{?}} |
| **합계 / 호출** | ~{{?}}K | **~${{?}}** |

실제 수치는 프로젝트 KB 길이에 따라 다름. 배포 전 `benchmarks.md` 로 실측 필수.
