# 번개가입 (BungaeGaib) - Product Requirements Document v1.2

**서비스명**: 번개가입
**영문 이니셜**: BG
**도메인**: bg.suparain.kr
**회사**: Suparain
**작성일**: 2026-03-12
**최종 수정**: 2026-03-12 (v1.2)
**상태**: Draft

---

## 1. 제품 개요

### 1.1 한 줄 요약
쇼핑몰 회원가입 페이지에서 소셜 로그인 버튼 **1번 클릭**으로 회원가입과 로그인이 동시에 완료되는 멀티 플랫폼 통합 서비스.

### 1.2 문제 정의
- 쇼핑몰 회원가입 과정이 복잡하면 이탈률이 높음 (이름, 이메일, 비밀번호, 전화번호, 약관 동의 등)
- 각 쇼핑몰 플랫폼마다 OAuth/소셜 로그인을 개별 구현하는 것은 비용과 기술적 부담이 큼
- 기존 서비스(1초가입 등)는 가격이 높고(월 49,000원~) 지원 플랫폼이 제한적
- 사용자가 어떤 소셜 서비스로 가입했는지 기억하기 어려워 재방문 시 혼란

### 1.3 솔루션
- 사용자는 이미 로그인된 소셜 계정의 버튼을 **1번 클릭**하면 즉시 가입+로그인
- **스마트 버튼**: 이전에 사용한 로그인 방법을 기억하여 자동 강조 표시
- 쇼핑몰 운영자는 간단한 설정만으로 다양한 소셜 가입 버튼을 추가
- **멀티 플랫폼 통합 관리**: 하나의 대시보드에서 카페24, 아임웹, 고도몰, 샵바이 등 모든 쇼핑몰 통합 관리
- 상세 정보(배송지, 연락처 등)는 주문 시점에 수집 (Progressive Profiling)

### 1.4 핵심 가치
- **사용자**: 클릭 1번으로 회원가입 완료. 이전 로그인 방법 자동 기억.
- **쇼핑몰 운영자**: 회원가입 전환율 극대화. 멀티 플랫폼 통합 관리.
- **차별점**: 스마트 버튼 + 더 많은 OAuth + 멀티 플랫폼 + 합리적 가격

---

## 2. 타겟 사용자

### 2.1 쇼핑몰 운영자 (B2B 고객)
- 카페24 기반 쇼핑몰 운영자 (MVP)
- 여러 플랫폼에서 쇼핑몰을 운영하는 운영자 (멀티 플랫폼)
- 회원가입 이탈률을 줄이고 싶은 운영자
- 소셜 로그인을 쉽게 도입하고 싶지만 개발 리소스가 없는 운영자

### 2.2 쇼핑몰 방문자 (최종 사용자)
- 한국 온라인 쇼핑몰 이용자
- 구글, 카카오, 네이버, 애플 계정을 이미 보유하고 있는 사용자
- 복잡한 회원가입 폼을 싫어하는 사용자

---

## 3. 핵심 기능

### 3.1 1-클릭 소셜 가입/로그인 (Core)

**사용자 플로우:**
```
1. 사용자가 쇼핑몰 로그인/회원가입 페이지 방문
2. 페이지에 소셜 가입 버튼들이 표시됨
   - 이전 방문 이력이 있으면 → 마지막 사용 방법에 ⚡ 마크 + 강조 표시
   - 첫 방문이면 → 모든 버튼 동일하게 표시
3. 사용자가 원하는 소셜 서비스 버튼 클릭 (1-클릭)
4. 해당 소셜 서비스로 리다이렉트 (이미 로그인 상태면 자동 통과)
5. 쇼핑몰에 회원 자동 생성 + 로그인 세션 생성
6. 사용자의 브라우저에 사용한 provider 기록 저장
7. 사용자는 쇼핑몰에 로그인된 상태로 돌아옴
```

**기술 동작 (카페24 SSO 기반 - 멀티 SSO 등록 방식):**

카페24 SSO는 최대 5개 항목 등록 가능. MVP에서 4개 소셜 프로바이더를 각각 별도 SSO로 등록 (1개 여유분).
각 SSO 항목이 카페24 로그인 페이지에 개별 버튼으로 표시됨.

```
1. 카페24 SSO에 4개 항목 등록 (Google/Kakao/Naver/Apple 각각)
   - 각 SSO의 Authorize URL: bg.suparain.kr/oauth/authorize?provider={provider}
2. 사용자가 카페24 로그인 페이지에서 "Google로 가입" SSO 버튼 클릭
3. 카페24 SSO가 bg.suparain.kr/oauth/authorize?provider=google 호출 (카페24가 state 관리)
4. 번개가입이 즉시 Google OAuth로 리다이렉트 (중간 페이지 없음)
5. Google 인증 완료 → 번개가입 콜백에서 사용자 정보 저장
6. 카페24 SSO 콜백으로 Authorization Code 반환
7. 카페24가 번개가입 Token/UserInfo API 호출
8. 카페24가 회원 자동 생성 + 로그인 세션 생성
```

> **참고**: Phase 2에서 추가되는 프로바이더(Toss, Discord, Telegram, TikTok)는 SSO 5개 제한을 초과하므로 ScriptTag 위젯 방식으로 구현 예정.

**최초 가입 시:**
- 카페24 약관 동의 팝업 1회 표시 (카페24 자체 기능)
- 사전 동의 설정 시 이 팝업도 생략 가능

**재로그인 시:**
- 이전 사용 방법 버튼이 강조되어 있으므로 바로 클릭
- 소셜 서비스에 이미 로그인 상태면 모든 과정 자동

### 3.2 스마트 버튼 (Smart Button) - 차별화 기능

사용자의 로그인 경험을 최적화하는 지능형 버튼 시스템.

#### 3.2.1 이전 로그인 방법 기억 (localStorage 기반)

**동작:**
- 사용자가 소셜 가입/로그인 성공 시 → localStorage에 `bg_last_provider` 저장
- 재방문 시 위젯 JS가 localStorage를 읽어서 해당 버튼을 강조

**UI 예시 (재방문 사용자):**
```
┌──────────────────────────────────────┐
│  ⚡ Google로 로그인 (지난번 사용)       │  ← 강조 + 번개마크 + 테두리 하이라이트
├──────────────────────────────────────┤
│  카카오로 가입                         │
├──────────────────────────────────────┤
│  네이버로 가입                         │
├──────────────────────────────────────┤
│  Apple로 가입                         │
└──────────────────────────────────────┘
```

**UI 예시 (첫 방문 사용자):**
```
┌──────────────────────────────────────┐
│  Google로 가입                        │
├──────────────────────────────────────┤
│  카카오로 가입                         │
├──────────────────────────────────────┤
│  네이버로 가입                         │
├──────────────────────────────────────┤
│  Apple로 가입                         │
└──────────────────────────────────────┘
```

#### 3.2.2 로그인 상태 감지 (가능한 범위)

브라우저 보안 정책상 외부 서비스의 로그인 상태를 직접 확인하는 것은 제한적이지만, 다음 방법으로 일부 구현 가능:

| 방법 | 지원 범위 | 설명 |
|------|----------|------|
| **Google One Tap** | Google 계정 | Google Identity Services API로 로그인 상태 감지 + 원탭 로그인 |
| **FedCM API** | Chrome 한정 | 브라우저가 연동 계정 정보를 제공 (실험적) |
| **Silent Auth (prompt=none)** | Google, 일부 | 백그라운드에서 로그인 상태 확인 시도 |

**MVP에서는 localStorage 기반 "이전 사용 방법 기억"을 우선 구현하고, Phase 2에서 Google One Tap 등을 추가합니다.**

#### 3.2.3 멀티 쇼핑몰 기억

사용자가 A쇼핑몰에서 구글로 가입하고 B쇼핑몰(같은 번개가입 사용)에 방문하면:
- localStorage의 `bg_last_provider`가 "google"이므로 B쇼핑몰에서도 구글 버튼 강조
- 쇼핑몰이 다르더라도 같은 도메인(bg.suparain.kr)의 위젯이므로 기억이 유지됨

### 3.3 MVP 지원 OAuth 프로바이더

| 프로바이더 | 한국 MAU | 상시 로그인 | 획득 가능 정보 |
|-----------|---------|-----------|--------------|
| **Google** | ~4,000만+ | 높음 (Android) | 이메일, 이름, 프로필사진 |
| **Kakao** | ~4,400만 | 매우 높음 | 이메일, 이름, 프로필사진, (동의 시) 전화번호/주소 |
| **Naver** | ~4,600만 | 매우 높음 | 이메일, 이름, 프로필사진, (동의 시) 전화번호/생일 |
| **Apple** | ~1,500만+ | 높음 (iOS) | 이메일(숨김 가능), 이름 |

**커버리지**: 한국 사용자 90% 이상

### 3.4 통합 관리자 대시보드

멀티 플랫폼을 전제로 설계된 운영자 대시보드.

#### 3.4.1 대시보드 구조

```
번개가입 대시보드 (bg.suparain.kr/dashboard)
│
├── 홈 (전체 요약)
│   ├── 전체 쇼핑몰 통합 가입 현황
│   ├── 오늘의 가입 수 / 이번 달 가입 수
│   └── 플랜 사용량 (이번 달 신규 가입: XX/100명)
│
├── 쇼핑몰 관리
│   ├── 쇼핑몰 목록 (카페24 쇼핑몰 A, 아임웹 쇼핑몰 B, ...)
│   ├── 쇼핑몰 등록 (플랫폼 선택 → 설정 가이드)
│   ├── 쇼핑몰별 설정
│   │   ├── 플랫폼 정보 (cafe24/imweb/godomall/shopby)
│   │   ├── SSO 연동 상태
│   │   ├── 활성화할 OAuth 프로바이더 선택
│   │   └── 버튼 스타일 커스터마이징
│   └── 쇼핑몰별 가입 통계
│
├── 통계
│   ├── 전체 통합 통계
│   │   ├── 소셜별 가입 수 (구글: XX명, 카카오: XX명, ...)
│   │   ├── 플랫폼별 가입 수 (카페24: XX명, 아임웹: XX명, ...)
│   │   ├── 일별/주별/월별 추이 차트
│   │   └── 가입 전환율 (버튼 노출 → 가입 완료)
│   └── 쇼핑몰별 상세 통계
│
├── 설정
│   ├── 계정 설정
│   ├── 플랜/과금 관리
│   └── API 키 관리
│
└── 도움말
    ├── SSO 설정 가이드 (플랫폼별)
    └── 설정 도우미 (단계별 스크린샷)
```

#### 3.4.2 플랫폼 통합 관리 (멀티 플랫폼 대응)

| 기능 | MVP (카페24) | Phase 3 (멀티 플랫폼) |
|------|-------------|---------------------|
| 쇼핑몰 등록 | 카페24만 | 카페24 + 아임웹 + 고도몰 + 샵바이 |
| SSO 설정 가이드 | 카페24용 | 플랫폼별 별도 가이드 |
| 통합 통계 | 카페24 쇼핑몰들 | 전체 플랫폼 쇼핑몰 통합 |
| 필터링 | 쇼핑몰별 | 쇼핑몰별 + 플랫폼별 |

**설계 원칙**: MVP부터 멀티 플랫폼 구조로 DB와 API를 설계하되, UI에서는 카페24만 노출. 플랫폼 추가 시 UI만 확장.

### 3.5 쇼핑몰 운영자 설정

**앱 설치 후 필요한 설정:**
1. 번개가입 대시보드에서 쇼핑몰 등록 (플랫폼 선택)
2. 사용할 소셜 로그인 선택 (구글, 카카오, 네이버, 애플)
3. 카페24 관리자에서 SSO 연동 설정 (가이드 문서 + 설정 도우미 제공)
4. 카페24 "SNS 가입 시 동일 이메일 계정 연동" 설정 활성화 (SSO 설정 가이드에 포함)

> **계정 연동**: 카페24에 내장된 "SNS 가입 시 동일 이메일 계정 연동" 기능을 활용. 번개가입 역할은 SSO 설정 가이드에 이 설정 활성화 단계를 포함시키는 것.

**운영자 지원 도구:**
- 상세 가이드 문서 (스크린샷 포함)
- 대시보드 내 "설정 도우미" (단계별 안내 + 복사 가능한 URL/키)

### 3.6 Progressive Profiling (점진적 프로필 수집)

- 가입 시점: OAuth에서 받은 최소 정보만 (유니크 ID, 이메일/이름 가능 시)
- 주문 시점: 배송지, 연락처, 상세 주소 등 추가 수집
- 수집된 정보는 카페24 회원 정보에 자동 업데이트

---

## 4. 비즈니스 모델

### 4.1 가격 정책

| 플랜 | 가격 | 포함 |
|------|------|------|
| **무료** | 0원 | 쇼핑몰당 매월 신규 가입 100명까지 |
| **월간** | 29,900원/월 | 무제한 |
| **연간** | 329,900원/년 | 무제한 (월 대비 ~8% 할인) |

※ 가격은 추후 변경될 수 있음
※ 무료 플랜 한도 초과 시 번개가입 버튼이 비활성화/숨김 처리됨. 기존 가입 회원은 카페24 일반 로그인으로 계속 이용 가능.

### 4.2 경쟁사 비교

| 항목 | 번개가입 | 1초가입 |
|------|---------|---------|
| 월 가격 | 29,900원 | 49,000~69,900원 + 부가세 |
| 지원 플랫폼 | 카페24 (→ 멀티플랫폼 확장) | 카페24만 |
| OAuth 지원 | 4개 (→ 8+개 확장) | 카카오 중심 |
| 스마트 버튼 | **이전 사용 방법 기억 + 강조** | 없음 |
| 통합 관리 | **멀티 플랫폼 통합 대시보드** | 단일 플랫폼 |
| 설치 난이도 | SSO 설정 필요 | 앱스토어 설치 |

### 4.3 결제 방식

카페24 수동 인앱결제 (모든 플랫폼 동일). automatic_payment="T" 자동결제는 별도 검토 후 적용 예정이며, 구현은 수동결제 기준으로 진행.

---

## 5. 기술 아키텍처

### 5.1 기술 스택

| 구성요소 | 기술 | 비고 |
|---------|------|------|
| **런타임** | Cloudflare Workers | 서버리스, 글로벌 엣지 |
| **언어** | TypeScript | Workers 공식 지원 |
| **DB (영구)** | Cloudflare D1 | SQLite 기반, GA |
| **DB (임시)** | Cloudflare KV | 토큰/세션/코드 (TTL 활용) |
| **OAuth Provider** | @cloudflare/workers-oauth-provider | 또는 커스텀 구현 |
| **카페24 연동** | cafe24-common TS 포팅 | 핵심 기능만 |
| **프론트 (위젯)** | Vanilla JS | ScriptTag로 삽입, localStorage 활용 |
| **대시보드** | Workers + D1 | SSR 또는 SPA, 멀티 플랫폼 구조 |

### 5.2 시스템 구성도

```
[쇼핑몰 방문자 브라우저]
    │
    ├─ 카페24/아임웹/고도몰/샵바이 로그인 페이지
    │   └─ 번개가입 위젯 (ScriptTag 또는 코드 삽입)
    │       ┌─────────────────────────────────────┐
    │       │ ⚡ Google로 로그인 (지난번 사용)       │ ← 스마트 버튼 (localStorage)
    │       │ 카카오로 가입                          │
    │       │ 네이버로 가입                          │
    │       │ Apple로 가입                          │
    │       └─────────────────────────────────────┘
    │
    ▼ (버튼 클릭)
[Cloudflare Workers - bg.suparain.kr]
    │
    ├─ /oauth/authorize?provider=google&shop=xxx
    │   └─ 즉시 Google OAuth로 리다이렉트 (중간 페이지 없음)
    │
    ├─ /oauth/callback/google
    │   ├─ Google에서 사용자 정보 수신
    │   ├─ D1에 사용자 정보 저장
    │   ├─ 리다이렉트 URL에 provider 정보 포함 (위젯에서 localStorage 저장용)
    │   └─ 카페24 SSO 콜백 URL로 Authorization Code와 함께 리다이렉트
    │
    ├─ /oauth/token (카페24가 호출)
    │   └─ Authorization Code → Access Token 교환
    │
    ├─ /oauth/userinfo (카페24가 호출)
    │   └─ 사용자 정보 JSON 반환
    │
    ├─ /dashboard/* (통합 관리자 대시보드)
    │   ├─ 홈 (전체 요약)
    │   ├─ 쇼핑몰 관리 (멀티 플랫폼)
    │   ├─ 통계 (통합 + 쇼핑몰별 + 플랫폼별)
    │   └─ 설정/과금
    │
    └─ /widget/buttons.js (ScriptTag용 JS - 스마트 버튼 포함)

    ▼
[Cloudflare D1]              [Cloudflare KV]
├── shops                    ├── auth_code:{code} (10분 TTL)
├── users                    ├── access_token:{token} (2시간 TTL)
├── shop_users               └── session:{id} (세션 TTL)
├── subscriptions
└── login_stats

    ▼
[쇼핑몰 플랫폼]
├── 카페24 → SSO 연동으로 회원 자동 생성 + 로그인 세션 생성
├── 아임웹 → (Phase 3: 플랫폼별 연동 방식 적용)
├── 고도몰 → (Phase 3)
└── 샵바이 → (Phase 3)
```

### 5.3 데이터 모델 (D1)

**shops** - 등록된 쇼핑몰 (멀티 플랫폼)
```sql
shop_id             TEXT PRIMARY KEY    -- 자동 생성
mall_id             TEXT NOT NULL       -- 플랫폼별 쇼핑몰 ID
platform            TEXT NOT NULL       -- 'cafe24' | 'imweb' | 'godomall' | 'shopby'
shop_name           TEXT                -- 쇼핑몰 이름
shop_url            TEXT                -- 쇼핑몰 URL
owner_id            TEXT NOT NULL       -- FK: 운영자 계정 (대시보드 로그인)
client_id           TEXT NOT NULL       -- 번개가입이 발급한 SSO Client ID
client_secret       TEXT NOT NULL       -- 번개가입이 발급한 SSO Client Secret
enabled_providers   TEXT NOT NULL       -- JSON: ["google","kakao","naver","apple"]
platform_access_token  TEXT             -- 플랫폼 Admin API 토큰 (암호화)
platform_refresh_token TEXT             -- 플랫폼 Refresh 토큰 (암호화)
allowed_redirect_uris TEXT             -- JSON: 허용된 redirect_uri 목록 (보안: 화이트리스트 검증용)
plan                TEXT DEFAULT 'free' -- free/monthly/yearly
monthly_signup_count INTEGER DEFAULT 0  -- 이번 달 신규 가입 수 (매월 리셋, API로 직접 수정 불가)
sso_configured      INTEGER DEFAULT 0   -- SSO 설정 완료 여부
is_deleted          INTEGER DEFAULT 0   -- 소프트 삭제 플래그
created_at          TEXT NOT NULL
updated_at          TEXT NOT NULL
```

> **monthly_signup_count 관리 정책**: API에서 직접 수정 차단. 신규 가입 vs 재로그인 구분은 shop_users 테이블에 해당 사용자 존재 여부로 판단. 쇼핑몰은 하드 삭제 대신 소프트 삭제(is_deleted) 처리.

**owners** - 쇼핑몰 운영자 (대시보드 계정)
```sql
owner_id        TEXT PRIMARY KEY    -- 자동 생성
email           TEXT NOT NULL UNIQUE
name            TEXT
password_hash   TEXT NOT NULL
created_at      TEXT NOT NULL
```

**users** - 소셜 인증 사용자
```sql
user_id         TEXT PRIMARY KEY    -- 자동 생성
provider        TEXT NOT NULL       -- google/kakao/naver/apple
provider_uid    TEXT NOT NULL       -- 소셜 서비스의 유니크 ID
email           TEXT                -- nullable
name            TEXT                -- nullable
profile_image   TEXT                -- nullable
raw_data        TEXT                -- JSON: OAuth에서 받은 원본 데이터 [암호화]
created_at      TEXT NOT NULL
updated_at      TEXT NOT NULL
UNIQUE(provider, provider_uid)
```

> **PII 암호화**: email, name, raw_data 필드는 AES-GCM으로 암호화 저장. 검색이 필요한 필드(email)는 해시 인덱스(email_hash) 추가하여 조회 가능하게 처리.

**shop_users** - 쇼핑몰-사용자 매핑
```sql
id                  TEXT PRIMARY KEY
shop_id             TEXT NOT NULL       -- FK: shops
user_id             TEXT NOT NULL       -- FK: users
platform_member_id  TEXT                -- 플랫폼에서 생성된 회원 ID
status              TEXT DEFAULT 'active'
created_at          TEXT NOT NULL
UNIQUE(shop_id, user_id)
```

**subscriptions** - 구독/과금
```sql
id              TEXT PRIMARY KEY
owner_id        TEXT NOT NULL       -- FK: owners (운영자 단위 과금)
plan            TEXT NOT NULL       -- monthly/yearly
status          TEXT NOT NULL       -- active/cancelled/expired
started_at      TEXT NOT NULL
expires_at      TEXT NOT NULL
```

**login_stats** - 가입/로그인 통계
```sql
id              TEXT PRIMARY KEY
shop_id         TEXT NOT NULL       -- FK: shops
user_id         TEXT NOT NULL       -- FK: users
provider        TEXT NOT NULL       -- 사용한 소셜 서비스
action          TEXT NOT NULL       -- 'signup' | 'login'
created_at      TEXT NOT NULL
```

### 5.4 cafe24-common TS 포팅 범위

| 기능 | 포팅 대상 | 우선순위 |
|------|----------|---------|
| API 호출 (get/post/put/delete) | O | MVP |
| OAuth 토큰 교환 | O | MVP |
| 토큰 자동 갱신 | O | MVP |
| HMAC 검증 (앱실행/웹훅) | O | MVP |
| 회원 조회 | O | MVP |
| ScriptTag API 호출 | O (신규) | MVP |
| 쿠폰 생성/발급 | 나중에 | Phase 2 |
| 앱스토어 결제 | 나중에 | Phase 2 |
| FTP 업로드 | X | 불필요 |

---

## 6. 서비스 확장 로드맵

### Phase 1 - MVP (카페24)
- 카페24 SSO 연동 (프로바이더별 개별 SSO 등록, 4개 사용 / 최대 5개 중 1개 여유)
- Google, Apple, Kakao, Naver 지원
- ScriptTag로 스마트 버튼 위젯 삽입
- **스마트 버튼** (이전 사용 방법 기억 + 강조)
- **통합 관리자 대시보드** (멀티 플랫폼 구조, 카페24만 활성)
- 가입/로그인 통계
- 과금 시스템 (무료: 쇼핑몰당 매월 100명 → 유료: 무제한)

### Phase 2 - OAuth 확장 + 고도화
- 토스 (Toss), Discord, Telegram, TikTok 추가
  - **SSO 5개 제한 초과**: 이 프로바이더들은 카페24 SSO 방식이 아닌 ScriptTag 위젯 방식으로 구현
- **Google One Tap** 연동 (로그인 상태 감지 + 원탭 가입)
- 카페24 앱스토어 등록
- 버튼 디자인 커스터마이징

### Phase 3 - 멀티 플랫폼
- 아임웹 지원
- 고도몰5 지원
- 샵바이 지원
- 대시보드에서 멀티 플랫폼 통합 관리 활성화
- (플랫폼별 API/웹훅은 VeriPack-Multi 프로젝트 참조)

### Phase 4 - 부가 기능
- 독립 앱 서비스 (고려 중)
- PASS 본인인증 (실명확인 필요 쇼핑몰용)
- Facebook, Microsoft 추가
- 등급/적립금/쿠폰 자동 발급 (경쟁사 대응)
- FedCM API 연동 (브라우저 기반 로그인 상태 감지)

---

## 7. 성공 지표 (KPI)

| 지표 | 목표 (MVP 출시 후 3개월) |
|------|------------------------|
| 등록 쇼핑몰 수 | 50개 |
| 총 회원가입 처리 수 | 5,000건 |
| 유료 전환율 | 10% (5개 쇼핑몰) |
| 가입 완료율 (클릭 → 가입 성공) | 90% 이상 |
| 평균 가입 소요 시간 | 5초 이내 |
| 스마트 버튼 활용률 (강조 버튼 클릭 비율) | 70% 이상 |

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 카페24 SSO API 변경 | 높음 | SSO 외 대안(ScriptTag + 폼 제출) 백업 |
| 카페24 SSO 자동설정 불가 → 운영자 이탈 | 중간 | 상세 가이드 + 설정 도우미로 최소화 |
| Workers Free Plan CPU 10ms 제약 | 낮음 | $5/월 Paid Plan으로 해결 |
| 소셜 서비스 OAuth 정책 변경 | 중간 | 다수 프로바이더 지원으로 분산 |
| 개인정보보호법 규제 | 높음 | 최소 정보만 수집, 개인정보 처리방침 준비 |
| localStorage 삭제/시크릿 모드 | 낮음 | 스마트 버튼은 UX 부가기능, 핵심 기능에 영향 없음 |
| redirect_uri 변조 공격 | 높음 | shops 테이블의 allowed_redirect_uris 화이트리스트로 검증. 미등록 URI 차단. |
| OAuth 코드 탈취 (CSRF/인터셉트) | 높음 | 소셜 OAuth 플로우에 PKCE (code_verifier/code_challenge) 적용 |
| PII 유출 (DB 접근 시) | 높음 | email, name, raw_data를 AES-GCM 암호화 저장. 검색 필드는 해시 인덱스 사용. |
| monthly_signup_count 조작 | 중간 | API에서 직접 수정 차단. 신규가입/재로그인 구분은 shop_users 존재 여부로 판단. |

---

## 9. 법적/규제 고려사항

- **개인정보 처리방침 문서 작성 필수 (런칭 전 완료)**
- 카페24 약관 동의는 카페24 SSO가 자체 처리 (최초 1회 팝업)
- OAuth로 수집하는 최소 정보에 대한 동의 처리
- 소셜 서비스별 개발자 약관 준수 (Google, Apple, Kakao, Naver)
- 카페24 앱스토어 등록 시 심사 기준 준수
- localStorage에 저장하는 데이터는 provider 이름만 (개인정보 아님)
- 카페24 앱 설치 플로우 (앱 설치 → OAuth → platform_access_token → ScriptTag 등록)는 테크 스펙에서 상세 정의

---

## 10. 일정 (예상)

| 단계 | 기간 | 내용 |
|------|------|------|
| 설계 | 1주 | 서비스 기획서 + 테크 스펙 확정 |
| cafe24-common TS 포팅 | 2-3일 | 핵심 기능 TypeScript 재작성 |
| OAuth Provider 구현 | 1주 | Workers + D1/KV, authorize/token/userinfo |
| 소셜 OAuth 연동 | 1주 | Google, Kakao, Naver, Apple |
| 스마트 버튼 위젯 | 4일 | 소셜 가입 버튼 JS + localStorage 로직 |
| 통합 관리자 대시보드 | 1.5주 | 멀티 플랫폼 구조, 쇼핑몰 관리, 통계 |
| 카페24 SSO 통합 테스트 | 1주 | 실제 쇼핑몰에서 E2E 테스트 |
| 과금 시스템 | 3일 | 무료/유료 전환, 사용량 체크 |
| **MVP 출시까지** | **약 6-7주** | |

---

## 부록

### A. 참조 프로젝트
- VeriPack-Multi: `/Users/happyyuna/MyWorks/Development/projects/VeriPack-Multi`
  - 4개 쇼핑몰 플랫폼 인증/웹훅/주문 API 구현 완료
  - 카페24 OAuth, 토큰 관리, 웹훅 검증 코드 참조
- cafe24-common: `/Users/happyyuna/MyWorks/Development/projects/cafe24-common`
  - 카페24 Admin API 클라이언트 (Python, v0.9.0)
  - TypeScript로 핵심 기능 포팅 예정

### B. 경쟁사 정보
- 1초가입: https://store.cafe24.com/kr/apps/4964
  - 제공사: 유니드컴즈(UNEEDCOMMS) / 킵그로우(KeepGrow)
  - 가격: 월 49,000~69,900원 + 부가세
  - 카카오싱크 기반, 카페24 전용

### C. Q&A 히스토리
- docs/qna_temp.md ~ docs/qna_round6.md 참조
