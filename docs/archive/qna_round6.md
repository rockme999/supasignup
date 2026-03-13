# 번개가입 Q&A Round 6 - Cloudflare Workers + D1 조사 결과

## 결론: Cloudflare Workers + D1로 구현 가능

### 기술적 가능 여부: YES

Cloudflare가 공식 OAuth Provider 라이브러리를 제공합니다:
- **`@cloudflare/workers-oauth-provider`** (2025년 1월 릴리스)
- OAuth 2.1 Authorization Server를 Workers 위에 바로 구현 가능
- KV를 스토리지 백엔드로 사용

---

## Workers 제약사항 vs 번개가입 요구사항

| 요구사항 | Workers 지원 | 비고 |
|---------|-------------|------|
| OAuth Provider (authorize/token/userinfo) | **가능** | 공식 라이브러리 존재 |
| 외부 OAuth Consumer (Google/Kakao 등) | **가능** | fetch() API로 처리 |
| HTML 인증 페이지 렌더링 | **가능** | SSR 또는 정적 HTML |
| 쿠키/세션 관리 | **가능** | JWT 또는 KV 기반 세션 |
| DB (사용자/쇼핑몰 데이터) | **가능** | D1 (SQLite 기반, GA 상태) |
| 토큰/세션 임시 저장 (TTL) | **가능** | KV (TTL 네이티브 지원) |

---

## TypeScript vs Python on Workers

### 결론: **Workers에서는 TypeScript 일택**

| 기준 | TypeScript | Python |
|------|-----------|--------|
| Workers 안정성 | **GA (프로덕션)** | **Beta (비권장)** |
| 콜드 스타트 | 매우 빠름 | ~1초 (스냅샷 시), ~10초 (없을 시) |
| OAuth 라이브러리 | **공식 존재** | authlib 미지원, 직접 구현 |
| cafe24-common 사용 | **불가** (TS 재작성 필요) | 일부 가능 (httpx/pydantic만) |
| 생태계/문서 | 풍부 | 제한적 |

**Python Workers의 치명적 문제:**
- 아직 Beta 상태
- authlib (OAuth 라이브러리) 미지원
- 콜드 스타트 느림
- cafe24-common도 완벽 호환 보장 안됨

---

## 비용 분석

| 항목 | Free Plan | Paid ($5/월) |
|------|-----------|-------------|
| Workers 요청 | 일 100,000건 | 월 10M건 포함 |
| Workers CPU/요청 | **10ms** | 5분 |
| D1 DB 크기 | 500MB | 10GB |
| D1 읽기 | 일 5M행 | 월 25B행 |
| D1 쓰기 | **일 100K행** | 월 50M행 |
| KV 읽기 | 일 100K | 월 10M |

**회원가입 1건 ≈ 5~10 요청** → Free Plan으로 일 10,000~20,000건 처리 가능
초기 서비스에 **무료로 충분합니다.**

---

## 권장 아키텍처: D1 + KV 하이브리드

```
D1 (영구 데이터 - 관계형)          KV (임시 데이터 - TTL 활용)
├── shops (쇼핑몰 정보)             ├── auth_codes (10분 TTL)
├── users (사용자 인증 정보)         ├── access_tokens (2시간 TTL)
├── shop_users (쇼핑몰-사용자 매핑)  └── sessions (세션 데이터)
└── plans (구독/과금 정보)
```

---

## 핵심 트레이드오프: Workers vs 로컬 서버

| 기준 | Workers + D1 (TS) | FastAPI + CF Tunnel (Python) |
|------|-------------------|------------------------------|
| 서버 관리 | **없음 (서버리스)** | 서버 유지보수 필요 |
| 가용성 | **99.99% (글로벌)** | 로컬 의존 (정전/네트워크 위험) |
| 비용 (초기) | **무료** | 전기세 + 인터넷 |
| 확장성 | **자동** | 수동 |
| cafe24-common 재사용 | **불가** (TS로 재작성) | **가능** |
| 개발 속도 | 보통 (새 코드) | 빠름 (기존 코드 활용) |
| 배포 | `wrangler deploy` | CF Tunnel 설정 + 프로세스 관리 |

---

## 추가 논의

### Q1. 기술 스택 최종 결정

두 가지 선택지입니다:

**(A) Cloudflare Workers + D1/KV + TypeScript**
- 장점: 서버리스, 무료, 글로벌, 자동 확장, 배포 간편
- 단점: cafe24-common을 TS로 재작성 필요, Workers 런타임 제약
- 적합: 서버 관리 부담 없이 서비스에 집중하고 싶을 때

**(B) Python FastAPI + 로컬 서버 + CF Tunnel**
- 장점: cafe24-common 재사용, Python 생태계 전체 사용, 개발 속도 빠름
- 단점: 서버 관리 필요, 로컬 장애 시 서비스 중단, 확장 어려움
- 적합: 빠른 MVP, 기존 코드 최대 활용

**(C) 하이브리드: Python 백엔드(로컬) + Workers(프론트 프록시)**
- 핵심 OAuth Provider 로직은 Python으로 구현 (cafe24-common 활용)
- Workers는 정적 인증 페이지 서빙 + 프록시 역할만
- 복잡도가 올라가는 단점

저는 **(A) Workers + TypeScript**를 추천합니다.
이유: cafe24-common에서 번개가입에 필요한 기능은 주로 `api_get/post` 정도이고, OAuth Provider 부분은 어차피 새로 만들어야 합니다. 서버 관리 없이 서비스에 집중하는 것이 장기적으로 유리합니다.

--> A

### Q2. cafe24-common TS 재작성 범위

Workers + TS로 가면, cafe24-common에서 필요한 기능만 TS로 포팅합니다:

| 기능 | 재작성 필요 | 난이도 | 비고 |
|------|-----------|--------|------|
| OAuth 토큰 교환 | O | 쉬움 | fetch()로 대체 |
| API 호출 (get/post/put/delete) | O | 쉬움 | fetch()로 대체 |
| 회원 조회 | O | 쉬움 | API 호출 래퍼 |
| HMAC 검증 | O | 쉬움 | Web Crypto API |
| 토큰 자동 갱신 | O | 보통 | 콜백 패턴 재구현 |
| 쿠폰 생성/발급 | 나중에 | - | MVP에 불필요 |
| FTP 업로드 | X | - | 번개가입에 불필요 |
| 앱스토어 결제 | 나중에 | - | 과금 시 필요 |

핵심 기능만 포팅하면 **2-3일** 수준으로 예상됩니다.

이 범위에 동의하시나요?

--> 동의
