# AI 자동 문의 답변 시스템 — 구현 플레이북

> **적용 대상**: 카페24 앱 또는 Cloudflare Workers 기반 SaaS에서 운영자/고객 문의에 AI 답변을 도입하려는 프로젝트
> **레퍼런스 구현**: 번개가입 (SupaSignup) — 2026-04 도입, 프로덕션 운영 중
> **재사용 대상 프로젝트**: Vudrop, VeriPack-Multi 등
> **작성**: 2026-04-21 · **갱신**: 2026-04-22 v2.0

이 문서는 **복사해서 대상 프로젝트의 `docs/ai-assistant/reference/` 에 넣고 시작하도록** 설계되었습니다.  
일반화된 워크플로우·체크리스트·코드 스니펫을 제공합니다. 번개가입 특화 사례는 각주/부록에만 언급합니다.

---

## 목차

1. [개요 · 기대 효과](#1-개요--기대-효과)
2. [적용 전제 체크리스트](#2-적용-전제-체크리스트)
3. [아키텍처 도표](#3-아키텍처-도표)
4. [DB 스키마](#4-db-스키마)
5. [단계별 구현 가이드](#5-단계별-구현-가이드)
   - Phase 0: 공개 KB 정제
   - Phase 1: 프롬프트 엔지니어링
   - Phase 2: AI 호출 통합 (Cloudflare Workers AI)
   - Phase 3: 초안 생성 UI (수동 모드)
   - Phase 4: 자동응답 토글 (전역 자동 발송)
   - Phase 5: 실패 로그 & 재시도
   - Phase 6: 미열람 추적 시스템 (뱃지)
   - Phase 7: 마크다운 렌더링 유틸
   - Phase 8: AI 자동답변 디스클레이머
   - Phase 9: 이미지 첨부 (Phase 2 — R2)
   - Phase 10: 수동 정체성 분석
   - Phase 11: Danger Zone UI
6. [관리자 UI 전체 구조](#6-관리자-ui-전체-구조)
7. [비용·레이턴시 벤치마크](#7-비용레이턴시-벤치마크)
8. [리스크 & 완화책](#8-리스크--완화책)
9. [Bootstrap 체크리스트 (새 프로젝트 적용)](#9-bootstrap-체크리스트-새-프로젝트-적용)
10. [부록](#10-부록)

---

## 1. 개요 · 기대 효과

### 문제
SaaS 제품에는 고객 문의가 끊이지 않는다. 답변은 반복적 패턴이 많지만 사람이 직접 쓰면:
- 응답 지연 (수 시간~며칠)
- 답변 품질 편차 (담당자별)
- 운영 부담 증가 → 제품 개발 시간 잠식

### 솔루션 구조

```
[고객 문의 INSERT]
    ↓
[전역 토글 체크 (app_settings: ai_auto_reply_global)]
├ OFF: 운영자가 대시보드에서 "AI 초안 생성" 버튼 클릭 → 검토·수정 → 발송
└ ON: ctx.waitUntil 백그라운드 트리거 → autoReplyInquiry()
          ↓
    [AI 호출 (Kimi K2.5)]
          ↓
    [가드레일 1: validateReply — 길이·금지 토큰·서명]
          ↓
    [가드레일 2: shouldHoldForReview — 리스크 키워드 감지]
    ├ 통과 → UPDATE status='auto_replied' (고객에게 즉시 노출)
    └ 실패 → ai_auto_reply_failures 기록 + pending 유지 + 1회 재시도
```

### 기대 효과 (번개가입 실측 기준)
- **응답 시간**: 평균 수 시간 → **30~60초** (캐시 hit 기준)
- **비용**: 호출당 약 27원, 월 600건 기준 약 16,400원
- **품질**: 5/5 정확성·환각 없음 (가드레일로 리스크 문의는 pending 유지)

---

## 2. 적용 전제 체크리스트

- [ ] **Cloudflare Workers** 기반 백엔드 사용
- [ ] **문의 테이블** 존재 — 최소 컬럼: `id, shop_id, title, content, status, reply, created_at`
- [ ] **운영자 관리 화면** 존재 — 문의 목록/상세 페이지
- [ ] **공개해도 되는 사용자 가이드·FAQ** 문서 존재
- [ ] **민감 정보 분리** — 시크릿/스키마/인프라 정보가 공개 문서와 명확히 분리됨
- [ ] **Cloudflare Workers AI 바인딩** 사용 가능 (`wrangler.toml`에 `[ai]` 섹션)
- [ ] **R2 버킷** 준비 (Phase 9 이미지 첨부 구현 시)

---

## 3. 아키텍처 도표

```
┌─────────────────────────────────────────────────────────────────┐
│ 고객 (쇼핑몰 운영자)   쇼핑몰 대시보드                           │
│     문의 제출 ──────────────────────────────────────────────────┤
│                       POST /inquiries                           │
│                             │                                   │
│                    ┌────────▼────────┐                          │
│                    │ D1: inquiries   │                          │
│                    │ status='pending'│                          │
│                    └────────┬────────┘                          │
│                             │                                   │
│                    ┌────────▼────────────┐                      │
│                    │ app_settings 조회   │                      │
│                    │ ai_auto_reply_global│                      │
│                    └────┬────────────────┘                      │
│                     OFF │             ON │                      │
│                         │       waitUntil│                      │
│                    수동  │     ┌──────────▼──────────┐          │
│                   (버튼) │     │ autoReplyInquiry()  │          │
│                         │     │ Kimi K2.5 호출       │          │
│                         │     │ validateReply()      │          │
│                         │     │ shouldHoldForReview()│          │
│                         │     └──────────┬──────────┘          │
│                         │          통과  │  실패                 │
│                         │   ┌───────────┤  ┌──────────────┐    │
│                         │   │ UPDATE    │  │ failures 기록│    │
│                         │   │ auto_repl │  │ pending 유지 │    │
│                         │   │ ied       │  │ 1회 재시도   │    │
│                         │   └───────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘

관리자 UI (/supadmin/inquiries)
  ├ 전역 자동답변 토글 (app_settings 읽기/쓰기)
  ├ 문의 목록 — 미열람 뱃지 (🔴/🟠/👁)
  └ 문의 상세 모달
       ├ 기존 답변 + 마크다운 렌더링
       ├ AI 자동답변 디스클레이머 (auto_replied 시)
       ├ AI 답변 초안 생성 버튼 (수동 모드)
       └ 실패 이력 섹션 (ai_auto_reply_failures)
```

---

## 4. DB 스키마

### 4-1. inquiries 테이블 신규 컬럼 (마이그레이션 0021~0025)

```sql
-- 0021: status CHECK 확장 + AI 메타 컬럼
ALTER TABLE shops ADD COLUMN auto_reply_inquiries BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE inquiries (
  id               TEXT PRIMARY KEY,
  shop_id          TEXT NOT NULL REFERENCES shops(shop_id),
  owner_id         TEXT NOT NULL REFERENCES owners(owner_id),
  title            TEXT NOT NULL,
  content          TEXT NOT NULL,
  reply            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','replied','auto_replied','closed')),
  replied_at       TEXT,
  ai_prompt_version TEXT,   -- 예: 'v1.2-2026-04-22'
  ai_model         TEXT,    -- 예: '@cf/moonshotai/kimi-k2.5'
  ai_elapsed_ms    INTEGER,
  -- 0022: 이미지 첨부
  attachments      TEXT NOT NULL DEFAULT '[]',  -- R2 객체 메타 JSON 배열
  -- 0025: 미열람 추적
  customer_read_at TEXT,    -- 쇼핑몰 운영자(고객)가 답변을 처음 조회한 시각
  admin_read_at    TEXT,    -- 수파레인 관리자가 문의를 처음 열어본 시각
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_inquiries_admin_read_at    ON inquiries(admin_read_at);
CREATE INDEX idx_inquiries_customer_read_at ON inquiries(customer_read_at);
```

### 4-2. app_settings — 싱글톤 키-밸류 (마이그레이션 0023)

```sql
-- 전역 설정 싱글톤. key를 PK로 사용하여 각 설정은 한 행만 존재.
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_by TEXT,          -- 변경한 관리자 owner_id (감사 로그용)
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 기본값: 자동답변 OFF
INSERT OR IGNORE INTO app_settings (key, value) VALUES ('ai_auto_reply_global', '0');
```

**upsert 패턴** (변경 시):
```sql
INSERT INTO app_settings (key, value, updated_by, updated_at)
VALUES ('ai_auto_reply_global', ?, ?, datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_by = excluded.updated_by,
  updated_at = excluded.updated_at
```

### 4-3. ai_auto_reply_failures — 실패 로그 (마이그레이션 0024)

```sql
CREATE TABLE IF NOT EXISTS ai_auto_reply_failures (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  inquiry_id    TEXT NOT NULL REFERENCES inquiries(id),
  attempt       INTEGER NOT NULL DEFAULT 1,
  reason        TEXT NOT NULL CHECK (reason IN (
    'inquiry_not_found',  -- status='pending' 아님 (이미 처리됨)
    'shop_not_found',     -- DB에서 shop 못 찾음
    'ai_error',           -- Kimi 호출 자체 실패 → 1회 재시도
    'validation_failed',  -- 금지 토큰·길이 위반 → 1회 재시도
    'held_for_review',    -- 리스크 키워드 포함 → 재시도 없음
    'unexpected_error'    -- 예상치 못한 예외 → 재시도 없음
  )),
  detail        TEXT,          -- 에러 메시지 (최대 1000자)
  ai_elapsed_ms INTEGER,       -- 호출 소요시간 (실패 전 측정값)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_aarf_inquiry_id ON ai_auto_reply_failures(inquiry_id);
CREATE INDEX idx_aarf_created_at ON ai_auto_reply_failures(created_at);
CREATE INDEX idx_aarf_reason     ON ai_auto_reply_failures(reason);
```

### 4-4. attachments JSON 스키마

`inquiries.attachments` 컬럼 (TEXT, DEFAULT `'[]'`):

```json
[
  {
    "key": "inquiry/{shop_id}/{inquiry_id}/{uuid}.png",
    "name": "original-filename.png",
    "size": 123456,
    "mime": "image/png",
    "uploaded_at": "2026-04-21T10:00:00Z"
  }
]
```

---

## 5. 단계별 구현 가이드

### Phase 0 · 공개 KB 정제 (1~2일)

**목적**: LLM에 주입할 "프롬프트 단일 진실 소스" 만들기.

#### 작업 순서

1. **문서 인벤토리** — `docs/` 폴더의 모든 문서를 **공개 가능 / 내부 전용**으로 분류
2. **3-way 교차검증**:
   - 공개 문서(FAQ·사용가이드·정책)
   - 대시보드에 노출되는 UI 텍스트
   - 실제 구현 코드
   세 곳의 주장이 다른 지점(모순)을 리스트업

3. **민감정보 블랙리스트 확정**:
   ```
   절대 AI 프롬프트에 넣지 않는 파일:
   - .env*, .dev.vars, .secrets, credentials*.json
   - schema.sql / DB 마이그레이션 파일
   - security-audit, 인프라 설계도
   - 내부 테이블·컬럼명, API 경로, 식별자(account_id, database_id, namespace_id)
   - OAuth client_id/secret/redirect_uri 구체 값
   - 경쟁사 분석, 서비스 전략, PRD 내부 버전
   ```

4. **정제 KB 작성** (`docs/ai-assistant/kb-public.md`):
   - 서비스 정체성 (한 문단)
   - 핵심 기능 (구체 숫자 포함)
   - 요금제별 기능 차이
   - 자주 묻는 운영 이슈의 표준 답변 패턴
   - "LLM 금지 사항" 섹션 — 답변에 절대 포함 금지 항목 명시

5. **모순 해결 원칙**: "코드 + 내부 문서"가 그라운드 트루스. 공개 문서나 대시보드가 틀어졌으면 **공개 쪽을 코드에 맞춰 수정**

#### 산출물
- `doc-audit-report.md` — 교차검증 리포트
- `kb-public.md` — 정제된 공개 KB

---

### Phase 1 · 프롬프트 엔지니어링 (1일)

**목적**: LLM이 환각 없이 일관된 톤으로 답변하게 하는 프롬프트 조립.

#### 환각 방지 4중 가드레일

1. **프롬프트 규칙** — `<answer_rules>`에 "KB에 없는 내용은 추측 금지, '확인 후 안내'로 응답" 명시
2. **불확실 표현 강제** — 증상/기기/오류메시지 전문/재현 순서 요청 문구 템플릿 제공
3. **후처리 휴리스틱 (`validateReply`)** — 금지 토큰·길이·서명 검증
4. **자동 발송 skip 조건 (`shouldHoldForReview`)** — 리스크 문구 포함 시 pending 유지

#### 프롬프트 섹션 순서 (Prompt caching 극대화)

```
<role>              # 고정 (가장 짧음)
<kb_public>         # 고정 · 가장 긴 블록 — 캐시 핵심
<faq_full>          # 고정
<usage_guide>       # 고정
<privacy_policy>    # 고정
<answer_rules>      # 고정
<banned_info>       # 고정
<auto_mode_tag>     # 2가지 값 (true/false) — prefix 여기까지 캐시
--- system 끝 ---
[user: 쇼핑몰 컨텍스트 + 문의 제목/본문] (가변)
```

**왜 이 순서?** 캐시는 prefix 단위로 적용. 고정 부분을 앞으로 몰아야 Cached input 요금 적용.

> **auto_mode = true 주의 (v1.2 변경사항)**  
> v1.0에서는 AI에게 "AI 배너를 답변 상하단에 삽입하라"고 지시했으나,  
> v1.2부터는 UI 레이어(admin.tsx, help.tsx)에서 디스클레이머 박스를 별도 렌더링하는 방식으로 변경.  
> LLM이 배너를 직접 생성하면 포맷 불일치·환각 위험이 있으므로 UI 레이어 처리가 우수함.

---

### Phase 2 · AI 호출 통합 (0.5일)

#### wrangler.toml

```toml
[ai]
binding = "AI"
```

#### callAI 헬퍼 (실제 구현 — `workers/api/src/routes/ai.ts`)

```typescript
export async function callAI(
  env: Env,
  messages: Array<{ role: string; content: string }>
): Promise<string> {
  if (env.AI) {
    // Kimi K2.5 우선, 실패 시 Gemma 4 fallback
    const models = ['@cf/moonshotai/kimi-k2.5', '@cf/google/gemma-4-26b-a4b-it'];
    let result: AiTextResponse | null = null;
    for (const model of models) {
      try {
        result = await env.AI.run(model, { messages }) as AiTextResponse;
        break;
      } catch (modelErr: any) {
        if (model === models[models.length - 1]) throw modelErr;
      }
    }
    // OpenAI-compatible chat completion 또는 단순 response 형식 대응
    const text =
      (result as any)?.choices?.[0]?.message?.content ||
      result?.response ||
      result?.result?.response ||
      '';
    if (text) return text;
    throw new Error(`Workers AI returned empty response`);
  }

  // 폴백: REST API (CF_ACCOUNT_ID, CF_AI_TOKEN 환경변수 필요)
  if (env.CF_ACCOUNT_ID && env.CF_AI_TOKEN) {
    const resp = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/moonshotai/kimi-k2.5`,
      { method: 'POST', headers: { 'Authorization': `Bearer ${env.CF_AI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }) }
    );
    const data = await resp.json() as { result?: { response?: string } };
    return data?.result?.response ?? '';
  }

  throw new Error(`AI binding not available`);
}
```

#### 호출 제한 (KV rate limit)

```typescript
async function checkAiRateLimit(env: Env, shopId: string, endpoint: string, dailyLimit: number): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  const key = `ai_rate:${shopId}:${endpoint}:${today}`;
  const count = parseInt((await env.KV.get(key)) ?? '0');
  if (count >= dailyLimit) return false;
  await env.KV.put(key, String(count + 1), { expirationTtl: 86400 });
  return true;
}
```

---

### Phase 3 · 초안 생성 UI (1일)

**목적**: 수동 모드 기본 플로우. 운영자가 클릭 → AI 초안 → 검토·수정 → 발송.

#### 백엔드 엔드포인트

```typescript
// POST /api/supadmin/inquiries/:id/draft-reply
admin.post('/inquiries/:id/draft-reply', async (c) => {
  const id = c.req.param('id');
  const inquiry = await getInquiry(c.env, id);
  const shop = await getShop(c.env, inquiry.shop_id);

  const { text, elapsedMs } = await draftInquiryReply(c.env, {
    shop: { mall_id: shop.mall_id, shop_name: shop.shop_name, plan: shop.plan },
    inquiry: { title: inquiry.title, content: inquiry.content },
    autoMode: false,
  });

  const validation = validateReply(text);
  if (!validation.ok) return c.json({ error: 'validation_failed', reason: validation.reason }, 500);

  return c.json({ draft: text, elapsedMs });
});
```

#### 프론트엔드 패턴
- 답변 `<textarea>` 위에 "⚡ AI 답변 초안 생성" 버튼
- 클릭 → POST → 응답 받아 textarea에 삽입 (기존 내용 있으면 confirm 덮어쓰기)

---

### Phase 4 · 자동응답 토글 (0.5일)

**목적**: 품질 검증 후 운영자 개입 없이 즉시 발송 모드 도입.

#### 전역 토글 조회 헬퍼 (실제 구현 — `workers/api/src/routes/admin.ts`)

```typescript
export async function getGlobalAutoReplyEnabled(env: Env): Promise<boolean> {
  const row = await env.DB.prepare(
    "SELECT value FROM app_settings WHERE key = 'ai_auto_reply_global'"
  ).first<{ value: string }>();
  return row?.value === '1';
}
```

#### 문의 INSERT 트리거 (실제 구현 — `workers/api/src/routes/dashboard.ts`)

```typescript
// POST /api/dashboard/inquiries
dashboard.post('/inquiries', authMiddleware, async (c) => {
  const body = await c.req.json<{ title?: string; content?: string; shop_id?: string }>();

  // ... 유효성 검사 및 INSERT ...
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO inquiries (id, shop_id, owner_id, title, content, status)
     VALUES (?, ?, ?, ?, ?, 'pending')`
  ).bind(id, shopId, ownerId, body.title.trim(), body.content.trim()).run();

  // 전역 AI 자동답변이 ON이면 백그라운드로 답변 생성
  const autoReplyEnabled = await getGlobalAutoReplyEnabled(c.env);
  if (autoReplyEnabled) {
    c.executionCtx.waitUntil(autoReplyInquiry(c.env, id));  // 🔑 비동기 백그라운드
  }

  return c.json({ ok: true, id }, 201);
});
```

**`ctx.waitUntil` 패턴이 필수인 이유**: Kimi K2.5 응답 시간이 17~56초(캐시 미스 기준)이므로 HTTP 응답을 먼저 반환하고 백그라운드에서 AI 처리.

#### 토글 변경 엔드포인트

```typescript
// PUT /api/supadmin/settings/auto-reply
admin.put('/settings/auto-reply', async (c) => {
  const body = await c.req.json<{ enabled?: boolean }>();
  if (typeof body.enabled !== 'boolean') {
    return c.json({ error: 'bad_request', message: 'enabled (boolean) is required' }, 400);
  }

  await c.env.DB.prepare(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES ('ai_auto_reply_global', ?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET value = excluded.value,
       updated_by = excluded.updated_by, updated_at = excluded.updated_at`
  ).bind(body.enabled ? '1' : '0', c.get('ownerId')).run();

  // 감사 로그 기록 필수
  await recordAuditLog(c.env.DB, c.get('ownerId'), 'toggle_global_auto_reply',
    'app_settings', 'ai_auto_reply_global', `→ ${body.enabled ? 'ON' : 'OFF'}`);

  return c.json({ ok: true });
});
```

---

### Phase 5 · 실패 로그 & 재시도 (0.5일)

**핵심 함수 전문 (`workers/api/src/routes/ai.ts`)**:

```typescript
export const PROMPT_VERSION = 'v1.2-2026-04-22';
export const AI_MODEL = '@cf/moonshotai/kimi-k2.5';

export async function autoReplyInquiry(env: Env, inquiryId: string, attempt: number = 1): Promise<void> {
  try {
    // 1. 문의 로드 (status='pending' 조건 — race 방지)
    const inquiry = await env.DB.prepare(
      'SELECT id, shop_id, title, content FROM inquiries WHERE id = ? AND status = ?'
    ).bind(inquiryId, 'pending').first<{ id: string; shop_id: string; title: string; content: string }>();
    if (!inquiry) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'inquiry_not_found', null, null);
      return;
    }

    // 2. shop 로드
    const shop = await env.DB.prepare(
      'SELECT shop_id, mall_id, shop_name, plan FROM shops WHERE shop_id = ?'
    ).bind(inquiry.shop_id).first<{ shop_id: string; mall_id: string; shop_name: string | null; plan: string }>();
    if (!shop) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'shop_not_found', null, null);
      return;
    }

    // 3. AI 호출 (실패 시 ai_error 기록 + 첫 시도면 3초 후 1회 재시도)
    let text: string;
    let elapsedMs: number;
    try {
      const result = await draftInquiryReply(env, {
        shop: { mall_id: shop.mall_id, shop_name: shop.shop_name ?? shop.mall_id, plan: shop.plan },
        inquiry: { title: inquiry.title, content: inquiry.content },
        autoMode: true,
      });
      text = result.text;
      elapsedMs = result.elapsedMs;
    } catch (e: any) {
      const errMsg = (e?.message || String(e)).slice(0, 1000);
      await logAutoReplyFailure(env, inquiryId, attempt, 'ai_error', errMsg, null);
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 3000));
        await autoReplyInquiry(env, inquiryId, 2);  // 1회 재시도
      }
      return;
    }

    // 4. 가드레일 1: validateReply
    const validation = validateReply(text);
    if (!validation.ok) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'validation_failed', validation.reason ?? null, elapsedMs);
      if (attempt === 1) {
        await new Promise(r => setTimeout(r, 3000));
        await autoReplyInquiry(env, inquiryId, 2);
      }
      return;
    }

    // 5. 가드레일 2: shouldHoldForReview (재시도 없음 — 재시도해도 동일 결과 예상)
    if (shouldHoldForReview(text)) {
      await logAutoReplyFailure(env, inquiryId, attempt, 'held_for_review', 'keyword_match', elapsedMs);
      return;
    }

    // 6. UPDATE (WHERE status='pending' 로 race 방지)
    await env.DB.prepare(
      `UPDATE inquiries
       SET reply = ?, status = 'auto_replied', replied_at = datetime('now'),
           updated_at = datetime('now'), ai_prompt_version = ?, ai_model = ?, ai_elapsed_ms = ?
       WHERE id = ? AND status = 'pending'`
    ).bind(text, PROMPT_VERSION, AI_MODEL, elapsedMs, inquiryId).run();

  } catch (e: any) {
    const errMsg = (e?.message || String(e)).slice(0, 1000);
    await logAutoReplyFailure(env, inquiryId, attempt, 'unexpected_error', errMsg, null).catch(() => {});
  }
}

async function logAutoReplyFailure(
  env: Env, inquiryId: string, attempt: number,
  reason: string, detail: string | null, aiElapsedMs: number | null
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO ai_auto_reply_failures (inquiry_id, attempt, reason, detail, ai_elapsed_ms)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(inquiryId, attempt, reason, detail, aiElapsedMs).run();
  } catch (e) {
    console.error('[auto-reply] logAutoReplyFailure insert failed:', e);
  }
}
```

**재시도 정책 요약**:

| reason | 재시도 | 이유 |
|---|:---:|---|
| `ai_error` | 1회 | 일시적 모델 불가 가능성 |
| `validation_failed` | 1회 | 불운한 출력 가능성 |
| `held_for_review` | 없음 | 재시도해도 동일 출력 예상 (리스크 문의) |
| `inquiry_not_found` | 없음 | 이미 처리됨 |
| `shop_not_found` | 없음 | 데이터 이슈 |
| `unexpected_error` | 없음 | 디버그 필요 |

---

### Phase 6 · 미열람 추적 시스템 (뱃지) (0.5일)

**목적**: 운영자가 AI 자동답변 품질을 검수하고, 고객의 답변 확인 여부를 파악.

#### 3단계 뱃지 우선순위 (실제 구현 — `admin.tsx`)

```typescript
// 미열람 뱃지 (우선순위: AI 미검수 > 미확인 > 쇼핑몰 미열람)
if (inq.status === 'auto_replied' && !inq.admin_read_at) {
  return <span class="badge badge-red">🔴 AI 답변 미검수</span>;
}
if (inq.status === 'replied' && !inq.admin_read_at) {
  return <span class="badge badge-yellow">🟠 미확인</span>;
}
if (inq.reply && !inq.customer_read_at) {
  return <span class="badge badge-gray" title="쇼핑몰 운영자(고객)가 답변 페이지를 아직 방문하지 않음">
    👁 쇼핑몰 미열람</span>;
}
```

#### 읽음 처리 업데이트 쿼리

**admin_read_at** — 관리자가 문의 상세 모달 열 때:
```sql
UPDATE inquiries
SET admin_read_at = datetime('now')
WHERE id = ? AND admin_read_at IS NULL
```

**customer_read_at** — 고객(쇼핑몰 운영자)이 답변 상세 페이지 방문할 때:
```sql
UPDATE inquiries
SET customer_read_at = datetime('now')
WHERE id = ? AND customer_read_at IS NULL
```

#### 중요: 업데이트 위치 분리

- **admin_read_at** → `GET /api/supadmin/inquiries/:id` (관리자 API 라우트)에서 업데이트
- **customer_read_at** → `GET /dashboard/inquiries/:id` (페이지 라우트 `pages.tsx`)에서 `ctx.waitUntil`로 백그라운드 업데이트

> API 라우트와 페이지 라우트에서 각각 처리해야 한다. 한 곳에서만 처리하면 다른 진입 경로에서 업데이트가 누락됨.

---

### Phase 7 · 마크다운 렌더링 유틸 (0.5일)

**목적**: AI가 생성한 마크다운 답변을 서버·클라이언트 양쪽에서 동일하게 렌더링.

#### 서버 측 TypeScript (`workers/api/src/utils/markdown.ts`)

```typescript
export function mdToHtml(md: string): string {
  if (!md) return '';
  let text = escapeHtml(md).replace(/\r\n?/g, '\n');  // XSS 방어: 먼저 escape

  text = text.replace(/```([\s\S]*?)```/g, (_, code) => `\n<pre><code>${code.trim()}</code></pre>\n`);
  text = text.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  text = text.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  // ... (리스트, 링크, 단락 처리)
  return text;
}
```

#### 클라이언트 측 — `window.bgMdToHtml` (layout.tsx)

- `layout.tsx`의 `<script>` 블록에 동일 로직을 인라인 JS로 복제
- `const MD_TO_HTML_BROWSER_JS` 상수로 관리 → `layout.tsx` 수정 시 함께 업데이트 필수

```javascript
// admin.tsx 모달 JS에서 사용
document.getElementById('existingReplyContent').innerHTML =
  (window.bgMdToHtml ? window.bgMdToHtml(inq.reply) : inq.reply);
```

**주의**: 서버 TS와 클라이언트 JS가 **동일 로직을 중복 관리**한다. 규칙 변경 시 두 곳 모두 수정.

#### CSS 클래스 (`layout.tsx`)

```css
.md-reply h2, .md-reply h3 { margin: 12px 0 6px; font-size: 15px; }
.md-reply ul, .md-reply ol { padding-left: 20px; margin: 6px 0; }
.md-reply pre { background: #f8fafc; border-radius: 6px; padding: 10px; overflow-x: auto; }
.md-reply code { background: #f1f5f9; border-radius: 3px; padding: 1px 4px; font-size: 12px; }
```

---

### Phase 8 · AI 자동답변 디스클레이머 (0.5일)

**목적**: 고객(쇼핑몰 운영자)과 수파레인 관리자 모두에게 AI 자동답변임을 명시.

#### 방식: UI 레이어 렌더링 (LLM 배너 삽입 방식 대신)

v1.0에서 채택했다가 v1.2에서 폐기한 방식: *LLM에게 배너 텍스트를 직접 생성하도록 지시*  
→ 포맷 불일치, 환각으로 배너가 변형되거나 누락되는 문제 발생

**채택한 방식**: `status = 'auto_replied'`인 경우 UI에서 조건부 렌더링

```typescript
// admin.tsx — 관리자 모달
{/* AI 자동답변 디스클레이머 — status='auto_replied' 일 때만 표시 */}
<div id="autoReplyDisclaimer" style="display:none;...">
  🤖 <strong>AI 자동 답변</strong>입니다. 고객에게 동일 문구가 함께 표시됩니다.
  내용이 부정확할 경우 "답변 수정" 으로 덮어쓸 수 있습니다.
</div>

// JS에서 조건부 표시
autoReplyDisclaimer.style.display = (inq.status === 'auto_replied') ? 'block' : 'none';
```

```typescript
// help.tsx — 고객 답변 페이지
{inquiry.status === 'auto_replied' && (
  <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;padding:10px 12px;font-size:12px;color:#6b7280">
    🤖 이 답변은 AI가 자동으로 생성한 내용입니다.
    운영팀이 검토 전이므로 추가 확인이 필요한 경우 재문의해 주세요.
  </div>
)}
```

---

### Phase 9 · 이미지 첨부 (R2) (1일)

#### R2 버킷 설정

```bash
# 프로덕션
npx wrangler r2 bucket create {서비스명}-inquiry-attachments
# 스테이징
npx wrangler r2 bucket create {서비스명}-inquiry-attachments-dev
```

`wrangler.toml`:
```toml
[[r2_buckets]]
binding = "INQUIRY_ATTACHMENTS"
bucket_name = "{서비스명}-inquiry-attachments"

# [env.dev]
[[env.dev.r2_buckets]]
binding = "INQUIRY_ATTACHMENTS"
bucket_name = "{서비스명}-inquiry-attachments-dev"
```

버킷은 **Private** — 직접 공개 URL 없음, Worker 프록시 경유 접근만 허용.

#### 파일 정책

| 항목 | 정책 |
|---|---|
| 파일 최대 크기 | 5MB/파일 |
| 문의당 최대 개수 | 5개 |
| 허용 MIME | image/png, image/jpeg, image/webp, image/gif |
| 보안 | Content-Type + 확장자 교차 검증 (MIME 위장 방지) |

#### 접근 경로

```
POST   /api/dashboard/inquiries/:id/attachments         업로드
GET    /api/dashboard/inquiries/:id/attachments/:key    조회 (프록시)
DELETE /api/dashboard/inquiries/:id/attachments/:key    삭제
GET    /api/supadmin/inquiries/:id/attachments/:key      관리자 조회
```

모든 경로: JWT 인증 + 소유권 검증 필수. `:key`는 URL 인코딩 필요.

#### path traversal 방지

```typescript
// key 검증 (공격 패턴 차단)
if (!/^inquiry\/[^/]+\/[^/]+\/[^/]+$/.test(key)) {
  return c.json({ error: 'invalid_key' }, 400);
}
// MIME + 확장자 교차 검증
const EXT_TO_MIME: Record<string, string> = {
  'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
  'webp': 'image/webp', 'gif': 'image/gif',
};
const ext = filename.split('.').pop()?.toLowerCase() ?? '';
const expectedMime = EXT_TO_MIME[ext];
if (!expectedMime || expectedMime !== contentType) {
  return c.json({ error: 'mime_mismatch' }, 400);
}
```

---

### Phase 10 · 수동 정체성 분석 (0.5일)

**목적**: AI가 자동으로 쇼핑몰 정체성(업종·타겟·톤앤매너)을 분석하는 기능이 실패했을 때, 관리자가 수동으로 재트리거.

#### 엔드포인트

```typescript
// POST /api/supadmin/shops/:id/analyze-identity
admin.post('/shops/:id/analyze-identity', async (c) => {
  const shopId = c.req.param('id');
  const shop = await c.env.DB.prepare(
    'SELECT * FROM shops WHERE shop_id = ? AND deleted_at IS NULL'
  ).bind(shopId).first<Record<string, unknown>>();

  if (!shop) return c.json({ error: 'not_found' }, 404);

  try {
    const identity = await analyzeAndSaveShopIdentity(c.env, shop);
    return c.json({ ok: true, identity });
  } catch (e: any) {
    return c.json({ error: 'ai_error', message: e?.message }, 503);
  }
});
```

#### AI 리포트 페이지 (`/supadmin/ai-reports/:shop_id`)

- 각 쇼핑몰 카드에 🔄 분석 버튼
- 클릭 → POST → 결과 즉시 표시 (자동 분석 실패 시 수동 대안)

---

### Phase 11 · Danger Zone UI (0.5일)

**목적**: 쇼핑몰 정지/활성화 같은 되돌리기 어려운 조작에 Stripe-style 확인 입력 방지.

#### 패턴 (실제 구현 — `admin.tsx AdminShopDetailPage`)

```typescript
{/* 위험 구역 — 정지/활성화 (긴급 조치 전용) */}
<div style="background:#fef2f2;border:2px solid #fecaca;padding:16px;border-radius:8px">
  <h2 style="color:#991b1b">⚠️ 위험 구역</h2>
  <p>
    실수 방지를 위해 아래 입력란에 <strong>mall_id</strong>({shop.mall_id})를
    정확히 입력해야 버튼이 활성화됩니다.
  </p>
  <input
    type="text"
    id="dangerConfirmInput"
    data-mall-id={shop.mall_id}
    placeholder={`확인을 위해 "${shop.mall_id}" 입력`}
  />
  <button id="dangerSuspendBtn" data-shop-id={shop.shop_id} disabled>
    이 쇼핑몰 정지
  </button>
</div>

<script>{`
  var input = document.getElementById('dangerConfirmInput');
  var btn = document.getElementById('dangerSuspendBtn');
  var expected = input.dataset.mallId;
  input.addEventListener('input', function() {
    btn.disabled = (this.value.trim() !== expected);
  });
  btn.addEventListener('click', async function() {
    if (!confirm('정말 정지하시겠습니까? 모든 기능이 즉시 차단됩니다.')) return;
    const resp = await fetch('/api/supadmin/shops/' + this.dataset.shopId + '/status',
      { method: 'PUT', body: JSON.stringify({ action: 'suspend' }),
        headers: { 'Content-Type': 'application/json' } });
    if (resp.ok) location.reload();
  });
`}</script>
```

**핵심**: 리스트 페이지에서는 정지/활성화 버튼 제공하지 않음 (오조작 방지). 상세 페이지에서만 Danger Zone 노출.

---

## 6. 관리자 UI 전체 구조

### 문의 상세 모달 (`admin.tsx AdminInquiriesPage`)

```
[문의 제목 + 내용]
    ↓
[기존 답변 영역 (.md-reply 클래스)]
  - 마크다운 렌더링 (bgMdToHtml)
  - AI 자동답변 디스클레이머 박스 (status='auto_replied' 시)
    ↓
[전역 자동답변 상태 뱃지 (읽기 전용)]
    ↓
[답변 textarea + 전송 버튼]
  - ⚡ AI 답변 초안 생성 버튼 (수동 모드)
    ↓
[실패 이력 섹션]
  - GET /api/supadmin/inquiries/:id/auto-reply-failures
  - attempt, reason, detail, created_at 테이블 표시
```

### 전역 토글 섹션

```
[⚠️ 경고 박스]
  글로벌 AI 자동답변 ON/OFF 토글
  현재 상태: pending N건 / auto_replied M건
```

---

## 7. 비용·레이턴시 벤치마크

자세한 실측 결과는 `docs/ai-assistant/benchmarks.md` 참조.

### 실측 요약 (번개가입, 2026-04-21, Kimi K2.5, system prompt 47.7KB)

| 구분 | 수치 |
|---|---:|
| Round 1 (cache miss) 평균 지연 | **56.6초** |
| Round 2 (cache hit) 평균 지연 | **32.8초** (▼42%) |
| 호출당 평균 입력 토큰 | 27.9k |
| 호출당 평균 출력 토큰 | 1.68k |
| 호출당 실 청구 | **$0.019 (≈ 27원)** |
| 월 600건 실 청구 | **$11.6 (≈ 16,400원)** |

### 시사점 (다른 프로젝트 적용 시)

- **첫 호출 30~90초** → `ctx.waitUntil` 비동기 패턴 필수. 동기 호출 불가.
- **캐시 hit 시에도 30초 내외** → 자동응답 안내는 "30초~1분 이내 답변"
- 토큰 예상은 KB의 UTF-8 한글 비율 감안해 **실측 대비 1.4배 버퍼** 권장
- 비용 판정은 **월 청구서**로만 가능 (대시보드 neurons 집계는 캐시 할인 반영 불명확)

### 예산 가이드

| 예상 문의량 | 월 비용 (실측 기반) |
|---|---:|
| 하루 20건 (월 600) | **약 16,000원** |
| 하루 100건 (월 3,000) | 약 81,000원 |
| 하루 500건 (월 15,000) | 약 404,000원 |

초기 운영 1~2개월은 **1.5배** 예산 확보 권장.

---

## 8. 리스크 & 완화책

| 리스크 | 확률 | 영향 | 완화책 |
|---|---|---|---|
| 환각으로 잘못된 정보 답변 | 중 | 고객 혼란 | 4중 가드레일, held_for_review 패턴 |
| 민감정보 유출 (내부 경로·스키마) | 저 | 보안 사고 | KB 정제(Phase 0) + validateReply 정규식 |
| Kimi 모델 변경/단종 | 저 | 서비스 중단 | callAI 내 폴백 모델 체인 |
| 고객 오남용 (프롬프트 인젝션) | 저 | 부적절 답변 | system 프롬프트 우선, 후처리 필터 |
| AI 비용 급증 | 중 | 예산 초과 | 일일 호출 제한 (KV rate limit) + 월 모니터링 |
| 캐시 미동작 | 중 | 비용 2~3배 | benchmarks.md 측정, KB 크기 조정 |

---

## 9. Bootstrap 체크리스트 (새 프로젝트 적용)

### 0. 준비
- [ ] `docs/ai-assistant/` 폴더 생성
- [ ] 이 플레이북을 복사해 `reference/auto-inquiry-reply-playbook.md` 배치

### 1. DB 마이그레이션
- [ ] `inquiries` 테이블에 `status CHECK`, `ai_prompt_version`, `ai_model`, `ai_elapsed_ms` 추가
- [ ] `attachments TEXT DEFAULT '[]'` 추가 (Phase 9 선택)
- [ ] `customer_read_at`, `admin_read_at` 추가
- [ ] `app_settings` 싱글톤 테이블 생성 + 기본값 INSERT
- [ ] `ai_auto_reply_failures` 테이블 생성

### 2. KB 정제
- [ ] 공개 문서 리스트 확정
- [ ] 내부 전용 문서 블랙리스트 작성
- [ ] 3-way 교차검증 수행 (문서 ↔ 대시보드 ↔ 코드)
- [ ] `kb-public.md` 작성
- [ ] AI 컨텍스트 번들 빌드 스크립트 (`build-ai-context.mjs`) 작성

### 3. 프롬프트 조립
- [ ] `prompt-{모델명}-reply.md` 작성 (섹션 순서 준수)
- [ ] `PROMPT_VERSION` / `AI_MODEL` 상수 정의
- [ ] `validateReply` 함수 — 서비스명 서명·금지 토큰 패턴 맞춤 수정
- [ ] `shouldHoldForReview` 함수 — 리스크 키워드 목록 확인

### 4. 백엔드
- [ ] `wrangler.toml`에 `[ai]` 바인딩 추가
- [ ] `callAI()` — 모델 fallback 체인 설정
- [ ] `draftInquiryReply()` — 프롬프트 조립 함수
- [ ] `autoReplyInquiry()` — 실패 로그 + 1회 재시도 포함
- [ ] `logAutoReplyFailure()` 헬퍼
- [ ] `getGlobalAutoReplyEnabled()` — app_settings 조회
- [ ] `POST /inquiries` — `ctx.waitUntil(autoReplyInquiry(...))` 트리거
- [ ] `POST /admin/inquiries/:id/draft-reply` — 수동 초안
- [ ] `GET /admin/settings/auto-reply` + `PUT /admin/settings/auto-reply`
- [ ] `GET /admin/inquiries/:id/auto-reply-failures`
- [ ] admin_read_at / customer_read_at 업데이트 로직

### 5. 프론트엔드
- [ ] 문의 목록 — 3단계 미열람 뱃지
- [ ] 문의 상세 모달 — 기존 답변 + 마크다운 렌더링 + 디스클레이머
- [ ] AI 초안 생성 버튼 (수동 모드)
- [ ] 전역 자동답변 토글 UI (경고 문구 포함)
- [ ] 실패 이력 섹션
- [ ] `utils/markdown.ts` + `window.bgMdToHtml` (동일 로직 2벌)
- [ ] `.md-reply` CSS

### 6. 이미지 첨부 (Phase 9 선택)
- [ ] R2 버킷 생성 (프로덕션·스테이징)
- [ ] `wrangler.toml` 바인딩
- [ ] `inquiry-attachments.ts` 라우트 (업로드·조회·삭제)
- [ ] MIME + 확장자 교차 검증
- [ ] path traversal 방지 regex

### 7. Danger Zone
- [ ] 쇼핑몰 상세 페이지에 정지/활성화 구역 추가
- [ ] `{식별자}` 타이핑 확인 패턴 구현
- [ ] 리스트 페이지에서 직접 정지 버튼 제거

### 8. 테스트
- [ ] 샘플 문의 5~10건 선정
- [ ] 4축 루브릭 (정확성·톤·환각 금지·완결성) 평가
- [ ] Go/No-Go 기준: 80% 이상 3점, 환각 축 4점 이상

### 9. 배포 & 운영
- [ ] 스테이징 배포 → 수동 모드로 운영자 검토
- [ ] 프로덕션 배포 (수동 모드만)
- [ ] 1~2주 운영 후 자동응답 토글 단계적 활성화
- [ ] Cloudflare AI Usage 주간 모니터링

---

## 10. 부록

### 부록 A · validateReply / shouldHoldForReview (실제 구현)

```typescript
// workers/api/src/routes/ai.ts
export function validateReply(text: string): { ok: boolean; reason?: string } {
  if (text.trim().length < 50) return { ok: false, reason: 'too_short' };
  if (text.trim().length > 3000) return { ok: false, reason: 'too_long' };

  // 금지 토큰 (내부 경로·스키마·시크릿 패턴)
  // ⚠️ 다른 프로젝트 적용 시 내부 경로 패턴을 해당 프로젝트에 맞게 수정
  const banned = [
    /\/api\/(supadmin|dashboard|widget|oauth)\//,
    /database_id|account_id|KV\s*namespace/i,
    /client_secret|JWT_SECRET|ENCRYPTION_KEY/,
    /CREATE TABLE|ALTER TABLE|SELECT\s+.*FROM/i,
    /shop_id['":]?\s*['"][0-9a-f-]{8,}/i,
  ];
  for (const pat of banned) {
    if (pat.test(text)) return { ok: false, reason: `banned_token: ${pat}` };
  }

  // 서명 체크 — 다른 프로젝트는 각 서비스 서명으로 교체
  if (!text.includes('{서비스명} 드림')) return { ok: false, reason: 'missing_signature' };

  return { ok: true };
}

export function shouldHoldForReview(text: string): boolean {
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

### 부록 B · 4축 평가 루브릭

| 축 | 0점 | 5점 | Go 기준 |
|---|---|---|---|
| **정확성** | KB 사실 완전 틀림 | 팩트 완벽 | 3점 이상 |
| **톤** | 불친절·반말 | 자연스럽고 따뜻 | 3점 이상 |
| **환각 금지** | 지어냄 | "확인 후 안내"로 안전 처리 | 4점 이상 필수 |
| **완결성** | 단편적 | 결론+대안+마무리 완결 | 3점 이상 |

샘플 80% 이상 충족 시 자동응답 모드 활성화.

### 부록 C · 알려진 에러 사례 & 학습

| 사례 | 원인 | 교훈 |
|---|---|---|
| 번개가입: 초기 프롬프트에 서비스 계획서 포함 → Kimi가 로드맵 노출 | 내부 문서 분리 미흡 | Phase 0 공개/내부 분리 필수 |
| 번개가입: "프리셋 5종"이라 써놓고 코드엔 7종 | UI 노출 기준과 코드 상수 불일치 | 3-way 교차검증의 "대시보드 UI" 축 중요 |
| 번개가입: 서버 장애 원인 문의에 LLM이 추측 시도 가능성 | 내부 사건은 KB에 없음 | shouldHoldForReview로 pending 유지 |
| 번개가입: v1.0 auto_mode 배너를 LLM이 변형하거나 누락 | LLM 출력 포맷 불안정 | v1.2: UI 레이어 디스클레이머로 전환 |

### 부록 D · 다른 프로젝트 적용 시 변경할 것

- `<role>` 섹션의 **서비스명·운영사·톤**
- KB의 **기능 명세 전부** (숫자·리스트)
- FAQ·사용가이드 교체
- 답변 마무리 서명 (`번개가입 드림 ⚡` → 각 서비스 시그니처)
- `validateReply` 내 금지 패턴 — 내부 API 경로 패턴 맞춤 수정
- 일일 호출 제한 숫자 (서비스 규모에 따라)
- 자동응답 토글의 경고 문구

### 부록 E · Phase 6 (향후) — 문의로 KB 자동 업데이트

```
[주 1회 cron trigger]
    ↓
[최근 7일치 replied 문의 전부 로드]
    ↓
[Kimi: "현재 FAQ에 없는 신규 주제 3개 추출 + Q&A 초안"]
    ↓
[운영자 검토 UI — /admin/faq-candidates]
    ↓
[승인 시 FAQ.md + kb-public.md 업데이트]
    ↓
[PROMPT_VERSION v1.x → v1.(x+1) 증가]
```

필요 테이블:
```sql
CREATE TABLE faq_candidates (
  id TEXT PRIMARY KEY,
  generated_at TEXT NOT NULL,
  source_inquiry_ids TEXT NOT NULL,  -- JSON array
  category TEXT,
  question TEXT NOT NULL,
  answer_draft TEXT NOT NULL,
  cluster_size INTEGER,
  status TEXT CHECK (status IN ('pending','approved','rejected','applied')),
  reviewed_by TEXT,
  reviewed_at TEXT,
  applied_commit_hash TEXT
);
```

### 부록 F · 참고 링크

- Cloudflare Workers AI: https://developers.cloudflare.com/workers-ai/
- Kimi K2.5 모델: https://developers.cloudflare.com/workers-ai/models/kimi-k2.5/
- Prompt caching 가격: https://developers.cloudflare.com/workers-ai/platform/pricing/
- 번개가입 레퍼런스 구현:
  - `kb-public.md` — 공개 KB 정제 예시
  - `prompt-kimi-reply.md` — 프롬프트 조립 예시 (v1.2)
  - `benchmarks.md` — 실측 결과
