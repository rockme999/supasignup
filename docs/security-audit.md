# 보안 감사 보고서 — SupaSignup (번개가입)

> **작성일:** 2026-04-08 KST  
> **검토 방식:** 시스템 공격자 관점 (Attacker's Perspective) 코드 리뷰  
> **검토 범위:** workers/api, packages/bg-core, packages/cafe24-client 전체 소스코드  
> **상태:** 토의 진행 중 (각 항목별 결론 대기)

---

## 목차

1. [요약](#1-요약)
2. [CRITICAL — 즉시 대응 필요](#2-critical--즉시-대응-필요)
3. [HIGH — 빠른 수정 필요](#3-high--빠른-수정-필요)
4. [MEDIUM — 계획적 수정 필요](#4-medium--계획적-수정-필요)
5. [LOW — 개선 권장](#5-low--개선-권장)
6. [긍정적 보안 사항 (잘 된 부분)](#6-긍정적-보안-사항)
7. [토의 기록](#7-토의-기록)

---

## 1. 요약

| 심각도 | 건수 | 주요 내용 |
|--------|------|-----------|
| **CRITICAL** | 1 | 이메일 자동 연결을 통한 계정 탈취 |
| **HIGH** | 3 | Auth Code Race Condition, 세션 저장 미대기, 에러 정보 노출 |
| **MEDIUM** | 10 | JWT 토큰 구분 부재, Origin 검증 우회, CSP unsafe-inline 등 |
| **LOW** | 9 | JWT 헤더 미검증, SameSite 불일치, Config 정보 노출 등 |

---

## 2. CRITICAL — 즉시 대응 필요

### C-1. 이메일 자동 연결을 통한 계정 탈취 (Account Takeover)

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/db/queries.ts:249-277` |
| **심각도** | CRITICAL |
| **상태** | 미정 (토의 필요) |

**현재 동작:**  
소셜 로그인 시 `email_hash`(SHA-256)가 기존 사용자와 일치하면 자동으로 계정을 연결(upsert)합니다. 이때 프로바이더가 반환한 이메일의 검증 여부(`email_verified`)를 확인하지 않습니다.

**공격 시나리오:**
1. 피해자가 Google로 `victim@gmail.com` 가입
2. 공격자가 이메일 검증이 느슨한 프로바이더(예: Kakao, Discord)에서 동일 이메일로 로그인
3. 시스템이 `email_hash` 일치 → 기존 계정에 자동 연결
4. 공격자가 피해자의 쇼핑몰 데이터에 접근 가능

**영향:** 공격자가 다른 사용자의 계정을 완전히 탈취할 수 있음

**수정안:**
- 각 프로바이더별 `email_verified` 필드를 확인 (Google, Discord는 API 응답에 포함)
- 미검증 이메일은 자동 연결하지 않고 별도 사용자로 생성
- 또는, 사용자에게 "이 계정을 연결하시겠습니까?" 확인 단계 추가

**토의 메모:**  
- **결론: 해당 없음 (N/A)** — 2026-04-08
- 카페24 SSO 회원 매칭은 카페24가 이메일 기준으로 자체 수행하며, 우리 `user_id`는 매칭 키로 사용되지 않음
- 우리 내부 email_hash 자동 연결은 통계 정확성을 위한 것이며, 카페24 회원 탈취로 이어지지 않음
- 부산물: 카페24 `member_id` 관리를 위한 `cafe24_members` 테이블 신설 (별도 구현)

---

## 3. HIGH — 빠른 수정 필요

### H-1. Auth Code 소비 시 Race Condition (토큰 이중 발급)

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/oauth.ts:556-587` |
| **심각도** | HIGH |
| **상태** | 미정 (토의 필요) |

**현재 동작:**  
`/token` 엔드포인트에서 KV의 auth code를 읽고 삭제하는 과정이 원자적(atomic)이지 않습니다.

```
읽기: c.env.KV.get(`auth_code:${code}`)     ← 두 요청 모두 성공 가능
삭제: c.env.KV.delete(`auth_code:${code}`)   ← eventually consistent
```

**공격 시나리오:**
1. 공격자가 auth code를 인터셉트 (브라우저 히스토리, Referer 헤더 등)
2. 서로 다른 지역에서 동시에 2개 `/token` 요청 전송
3. KV eventual consistency로 인해 두 요청 모두 auth code 읽기 성공
4. 하나의 auth code로 access token 2개 발급

**수정안:**
- **권장:** Cloudflare Durable Objects로 원자적 read-and-delete 구현
- **차선:** 삭제를 먼저 실행 후 토큰 발급 (창은 좁아지지만 완전히 제거되지 않음)
- **현실적:** auth code에 짧은 TTL(현재 5분) + 단일 IP 바인딩 추가

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### H-2. OAuth 세션 KV 쓰기 미대기 (waitUntil)

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/oauth.ts:172-178` |
| **심각도** | HIGH |
| **상태** | 미정 (토의 필요) |

**현재 동작:**  
세션과 PKCE verifier를 `waitUntil`(fire-and-forget)로 KV에 저장한 뒤 곧바로 소셜 프로바이더로 리다이렉트합니다. 코드 주석에는 "KV.put은 ~30ms이므로 callback 전에 완료"라고 되어 있으나 보장되지 않습니다.

**문제:**
- 사용자가 이미 소셜 프로바이더에 로그인되어 있으면 callback이 매우 빠르게 돌아옴
- KV 전파 지연 시 세션이 아직 저장되지 않아 "session not found" 에러 발생
- `waitUntil` 내부 에러는 catch되지 않아 조용히 실패

**수정안:**
- `waitUntil` 대신 `await`로 변경 (성능 영향 미미: ~30ms)
- 또는 최소한 에러 핸들링 추가

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### H-3. Cafe24 Callback 에러 메시지를 통한 내부 정보 노출

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/cafe24.ts:257-264` |
| **심각도** | HIGH |
| **상태** | 미정 (토의 필요) |

**현재 동작:**
```typescript
return c.json({
  error: 'callback_failed',
  message: err?.message ?? String(err),  // 내부 에러 메시지 그대로 노출
  detail: err?.detail ?? null,           // 추가 상세 정보까지 노출
}, 500);
```

**공격 시나리오:**
- 공격자가 조작된 OAuth callback 요청을 보내 의도적으로 에러 유발
- 응답에서 Cafe24 API URL, DB 컬럼명, 내부 인프라 정보 수집 가능
- 글로벌 에러 핸들러(`index.ts:88-91`)가 스택 트레이스를 숨기지만, 이 라우트는 자체 catch에서 우회

**수정안:**
- 클라이언트에는 일반적 에러 메시지만 반환
- 상세 에러는 `console.error`로 서버 로그에만 기록

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

## 4. MEDIUM — 계획적 수정 필요

### M-1. JWT 토큰 타입 미구분 (일반 사용자 ↔ 관리자)

| 항목 | 내용 |
|------|------|
| **위치** | `middleware/auth.ts:18`, `middleware/admin.ts:47` |
| **심각도** | MEDIUM |

**현재 동작:**  
일반 사용자 JWT와 관리자 JWT가 같은 `JWT_SECRET`과 같은 구조를 사용합니다. 관리자 인증은 오직 DB의 `role` 필드 조회에만 의존합니다.

**위험:**  
일반 사용자 JWT가 유출되면 `Authorization: Bearer` 헤더로 관리자 엔드포인트에 접근 시도 가능 (DB role 체크가 유일한 방어선).

**수정안:** JWT payload에 `type: 'user' | 'admin'` claim 추가, 또는 별도 시크릿 사용

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-2. Widget Origin 검증 — substring 매칭 우회 가능

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/widget.ts:212-235` |
| **심각도** | MEDIUM |

**현재 동작:**
```typescript
if (shop.mall_id && originHeader.includes(shop.mall_id)) { ... }
```

**공격 시나리오:**  
`mall_id`가 "abc"일 때, `https://abc.evil.com`이나 `https://evil-abc-shop.com`도 통과합니다.

**수정안:** `new URL(originHeader).hostname` 으로 정확한 호스트명 비교

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-3. CSP `unsafe-inline` — XSS 확대 가능

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/index.ts:43-46` |
| **심각도** | MEDIUM |

**현재 동작:**
```
script-src 'self' 'unsafe-inline'
```

**위험:** XSS 주입점이 하나라도 있으면 CSP가 방어하지 못합니다. M-4(shop_identity XSS)와 결합 시 실질적 위험이 됩니다.

**수정안:** nonce 기반 CSP로 전환 (`'nonce-{random}'`)

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-4. `shop_identity` 필드 무검증 저장 → Stored XSS 가능성

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/dashboard.ts:135-152` |
| **심각도** | MEDIUM |

**현재 동작:**  
`PUT /shops/:id`에서 `shop_identity` 필드가 검증 없이 DB에 저장됩니다. 이 값이 관리자 대시보드에서 렌더링될 때 XSS 가능.

**수정안:** JSON 스키마 검증 + HTML 태그 제거 (sanitize)

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-5. 프로모 배너 프록시 — SSRF 및 HTML 주입

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/dashboard.ts:1010-1034` |
| **심각도** | MEDIUM |

**현재 동작:**  
`/api/dashboard/promo-banner`가 외부 서버(`sm.suparain.kr`)의 HTML을 그대로 프록시합니다. **인증 없이** 접근 가능하며, 대시보드와 같은 origin에서 서빙됩니다.

**위험:** 외부 서버가 탈취되면 대시보드 세션 탈취 가능

**수정안:** iframe + sandbox 속성으로 격리, 또는 클라이언트에서 직접 fetch

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-6. Widget CORS `origin: '*'` + 분석 데이터 오염

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/index.ts:51-55` |
| **심각도** | MEDIUM |

**현재 동작:**  
`/api/widget/*` CORS가 모든 Origin 허용 → 아무 사이트에서 `/api/widget/event`에 POST 가능

**위험:** 가짜 `page_view`, `signup_complete` 이벤트를 대량 주입하여 분석 데이터 오염

**수정안:** POST `/event` 엔드포인트에서 Origin/Referer를 쇼핑몰 등록 URL과 대조

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-7. LINE/Apple id_token 서명 미검증

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/services/social.ts:693-699, 812-814` |
| **심각도** | MEDIUM |

**현재 동작:**  
"TLS로 직접 받았으므로 서명 검증 생략"이라는 주석이 있습니다. OAuth 스펙상 허용되지만 방어 심층(defense-in-depth) 부재.

**수정안:** LINE JWKS, Apple JWKS로 서명 검증 추가

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-8. Telegram 세션 브라우저 미바인딩 (Login CSRF)

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/routes/oauth.ts:165-168, 467-481` |
| **심각도** | MEDIUM |

**현재 동작:**  
Telegram 세션이 브라우저에 바인딩되지 않아, 공격자가 시작한 세션을 피해자가 완료할 수 있습니다.

**수정안:** 세션 시작 시 쿠키에 nonce 설정 → callback 시 매칭 검증

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-9. Apple `aud` 검증 조건부 스킵

| 항목 | 내용 |
|------|------|
| **위치** | `workers/api/src/services/social.ts:823-825` |
| **심각도** | MEDIUM |

**현재 동작:**
```typescript
if (clientId && payload.aud !== clientId) { throw ... }
```

`clientId`(= `APPLE_CLIENT_ID` 환경변수)가 undefined이면 `aud` 검증을 건너뜁니다.

**수정안:** `clientId`를 필수 파라미터로 변경, falsy일 경우 에러 throw

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

### M-10. Provider Hint 쇼핑몰 전체 공유 (사용자별 미분리)

| 항목 | 내용 |
|------|------|
| **위치** | `widget.ts:260`, `oauth.ts:110-122` |
| **심각도** | MEDIUM |

**현재 동작:**  
`provider_hint:{client_id}` 키가 쇼핑몰별 공유 → 다른 사용자가 프로바이더 선택을 덮어쓸 수 있음 (TTL 120초)

**수정안:** `client_id` + `visitor_id` 조합 키, 또는 Cafe24 SSO state 파라미터 활용

**토의 메모:**  
_(결정 사항을 여기에 기록)_

---

## 5. LOW — 개선 권장

### L-1. JWT 헤더 `alg` 미검증
- **위치:** `services/jwt.ts:56-73`
- 현재 HMAC-SHA256 고정이므로 algorithm confusion 공격은 불가하나, 향후 리팩토링 시 위험
- **수정안:** 헤더 파싱 후 `alg === "HS256"` 확인

### L-2. 소셜 프로바이더 에러 메시지 내부 정보 포함
- **위치:** `services/social.ts` 다수
- `throw new Error(\`Google token exchange failed: ${resp.status} ${text}\`)` 형태
- **수정안:** 상세 에러는 서버 로그, 클라이언트에는 일반 메시지

### L-3. KV 기반 Widget Rate Limit Race Condition
- **위치:** `widget.ts:128-132`
- KV eventual consistency로 동시 요청 시 제한 우회 가능
- **수정안:** Cloudflare WAF Rate Limiting 또는 Durable Objects 사용

### L-4. `bg_token` 쿠키 SameSite=Lax (관리자는 Strict)
- **위치:** `cafe24.ts:245`
- 관리자 쿠키(`bg_admin_token`)는 `Strict`인데 일반 쿠키는 `Lax` — 불일치
- **수정안:** Cafe24 OAuth redirect 호환성 확인 후 `Strict`로 통일

### L-5. getCookie 함수 Regex Injection 가능성
- **위치:** `middleware/auth.ts:36`
- `name` 파라미터가 regex에 직접 삽입 (현재 하드코딩이라 실제 위험은 낮음)
- **수정안:** 정규식 리터럴 사용 (admin.ts 패턴과 통일)

### L-6. `sso_configured` 수동 설정 가능
- **위치:** `dashboard.ts:135`
- 쇼핑몰 오너가 `PUT /shops/:id`로 `sso_configured = 1` 수동 설정 가능
- **수정안:** `allowed` 목록에서 제거, 프로그래밍 방식으로만 설정

### L-7. Widget Config에 불필요한 정보 노출
- **위치:** `widget.ts:95-108`
- 인증 없이 `plan`, `base_url`, `sso_type`, `sso_callback_uri` 노출
- **수정안:** 클라이언트에 불필요한 필드 제거 (특히 `plan`, `base_url`)

### L-8. Auth Code가 URL 쿼리 파라미터로 전달
- **위치:** `oauth.ts:261-279`
- 브라우저 히스토리, Referer 헤더로 누출 가능 (OAuth 표준 동작이지만 주의 필요)
- **완화:** 현재 5분 TTL + 일회용으로 부분 완화됨

### L-9. Rate Limit IP — X-Forwarded-For 폴백
- **위치:** `middleware/auth.ts:48`
- `CF-Connecting-IP` 없을 때 `X-Forwarded-For` 사용 → 스푸핑 가능
- **수정안:** Cloudflare Workers 환경에서는 `CF-Connecting-IP`만 신뢰, 폴백 제거

---

## 6. 긍정적 보안 사항

현재 코드에서 잘 구현된 보안 패턴들입니다:

| 항목 | 구현 위치 | 설명 |
|------|-----------|------|
| **AES-256-GCM PII 암호화** | `bg-core/crypto.ts` | 이메일, 이름, 전화번호 등 개인정보 암호화 저장 |
| **PBKDF2 100K 패스워드 해싱** | `services/password.ts` | 충분한 iteration + 랜덤 salt |
| **Timing-safe comparison** | `bg-core/crypto.ts:162-188` | HMAC 기반 비교로 타이밍 공격 방어 |
| **Parameterized queries** | `db/queries.ts` 전체 | SQL injection 원천 차단 |
| **IDOR 방어** | `routes/dashboard.ts` | 모든 shop 엔드포인트에서 `owner_id` 검증 |
| **Mass assignment 방어** | `db/queries.ts:122-137` | `ALLOWED_UPDATE_COLUMNS` 화이트리스트 |
| **Webhook HMAC 검증** | `cafe24-client/hmac.ts` | timing-safe + timestamp freshness (±5분) |
| **devOnly 미들웨어** | `index.ts:134-139` | 테스트 엔드포인트 프로덕션 차단 |
| **CSV Injection 방어** | `routes/stats.ts` | `=`, `+`, `-`, `@` 셀 이스케이프 |
| **OAuth PKCE** | `routes/oauth.ts` | code_verifier/challenge로 code interception 방어 |
| **CSRF state 토큰** | `routes/cafe24.ts` | KV 기반 일회용 state + 즉시 삭제 |
| **redirect_uri 화이트리스트** | `routes/oauth.ts` | 정확한 매칭 (regex 아님) |

---

## 7. 토의 기록

> 각 항목 검토 후 여기에 결론을 기록합니다.

| 항목 | 검토일 | 결론 | 조치 방향 |
|------|--------|------|-----------|
| C-1 | 2026-04-08 | N/A (카페24 자체 매칭, 우리 영향 없음) | cafe24_members 테이블 신설 (설계 개선) |
| H-1 | 2026-04-08 | LOW로 하향 (/token 호출 주체가 카페24 서버, TLS 통신이라 인터셉트 불가) | 현재 상태 유지 |
| H-2 | 2026-04-08 | LOW로 하향 (콜백까지 최소 ~350ms, KV.put ~30ms로 충분) | 현재 상태 유지 |
| H-3 | 2026-04-08 | 수정 완료 — 일반 메시지만 반환, 상세는 서버 로그에만 기록 | 배포 완료 (dev+prod) |
| M-1 | 2026-04-08 | LOW로 하향 (DB role 매 요청 조회, role 변경 API 없음, 실질 위험 없음) | 현재 상태 유지 |
| M-2 | 2026-04-08 | LOW로 하향 (힌트 저장뿐, 데이터 유출 불가) | 현재 상태 유지 |
| M-3 | 2026-04-08 | LOW로 하향 (JSX 렌더러가 기본 이스케이프, XSS 성립 안 됨) | 현재 상태 유지 |
| M-4 | 2026-04-08 | LOW로 하향 (JSX 이스케이프로 Stored XSS 차단됨) | 현재 상태 유지 |
| M-5 | 2026-04-08 | LOW로 하향 (sm.suparain.kr은 자사 서버, 외부 탈취 전제 필요) | 현재 상태 유지 |
| M-6 | 2026-04-08 | LOW로 하향 (rate limit 60/min 존재, 실질 영향은 통계 오염 정도) | 현재 상태 유지 |
| M-7 | 2026-04-08 | LOW (OAuth 스펙 허용, TLS 직접 수신, 실질 위험 없음) | 현재 상태 유지 |
| M-8 | 2026-04-08 | LOW (피해 = 원치 않는 가입 정도, 데이터 탈취 불가, Telegram 사용 비율 낮음) | 현재 상태 유지 |
| M-9 | 2026-04-08 | N/A (APPLE_CLIENT_ID 없으면 로그인 자체 불가, 발생 불가능) | 현재 상태 유지 |
| M-10 | 2026-04-08 | LOW (편의 기능, 잘못되면 프로바이더 재선택뿐, 보안 영향 없음) | 현재 상태 유지 |
| L-1 ~ L-9 | 2026-04-08 | 전체 보류 (실질 위험 낮음, 현재 악용 어려움) | 현재 상태 유지, 추후 재검토 |

---

_이 문서는 코드 리뷰 기반 정적 분석 결과입니다. 실제 침투 테스트(penetration testing)는 별도로 진행이 필요합니다._
