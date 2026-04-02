# 번개가입 (BungaeGaib) - Product Requirements Document v2.0

**서비스명**: 번개가입
**영문 이니셜**: BG
**도메인**: bg.suparain.kr
**회사**: Suparain
**작성일**: 2026-04-02
**최종 수정**: 2026-04-02 (v2.0)
**상태**: Draft
**이전 버전**: PRD_v1.2 (2026-03-12)

---

## v1 → v2 주요 변경 요약

| 항목 | v1 | v2 |
|------|----|----|
| **미션** | 소셜 로그인 통합 서비스 | **"회원을 모은다"** — 비회원 → 회원 전환 집중 |
| **가격** | 무료(월100명) / 월 29,900원 / 연 329,900원 | **Free(0원) / Plus(월 6,900원 또는 연 79,000원)** |
| **무료 범위** | 월 100명 제한 소셜 로그인 | 소셜 로그인 9종 **무제한** + 가입 쿠폰 1종 |
| **서비스 경계** | 소셜 로그인 통합만 | 번개가입(유입) vs otj-shop(운영) 역할 분리 |
| **Phase 1** | 소셜 로그인 + 대시보드 | 소셜 로그인 + 쿠폰 + 배너 + 팝업 + AI 4종(정체성/브리핑/카피/재방문메시지) + 카카오 채널 + 에스컬레이션 + 전환 통계 |
| **KPI** | 등록 50개 / 가입 5,000건 / 유료 10% | 등록 100개 / 가입 10,000건 / Plus 전환 15% / otj-shop 업셀 5% |

---

## 1. 제품 개요

### 1.1 한 줄 요약

쇼핑몰에서 **비회원을 회원으로 전환**하는 서비스 — 소셜 로그인 9종 무료 제공 + 가입 유도 도구(배너/팝업/쿠폰/에스컬레이션)로 회원 유치에만 집중.

### 1.2 미션 (v1 대비 변경)

> **"회원을 모은다"**

v1의 "소셜 로그인 통합"에서 **"회원 유치/가입률"** 에 집중하는 서비스로 포지셔닝을 재정의한다.

번개가입은 **매장 앞 직원** — "어서오세요! 회원가입하면 3,000원 할인이에요!"라고 말하며 방문자를 회원으로 전환시키는 역할.

매장 안에서 "이거 어떠세요? 오늘만 특가예요!"라고 말하며 구매를 유도하는 역할은 **otj-shop(오팀장)** 의 영역이다.

### 1.3 서비스 영역 구분 (v2 신규)

| 서비스 | 역할 | 집중 지표 |
|--------|------|----------|
| **번개가입** | 비회원 → 회원 전환 (유입 퍼널) | 가입 전환율, 가입자 수 |
| **otj-shop** | 회원 → 구매 전환 + 운영 전반 | 구매 전환율, 객단가, 재구매율 |

번개가입은 otj-shop의 **사용자 유입 퍼널** 역할을 하며, 무료 사용자를 확보하여 Plus 유료 전환 후 otj-shop으로 업셀하는 구조다.

### 1.4 문제 정의

- 쇼핑몰 회원가입 과정이 복잡하면 이탈률이 높음 (이름, 이메일, 비밀번호, 전화번호, 약관 동의 등)
- 각 쇼핑몰 플랫폼마다 OAuth/소셜 로그인을 개별 구현하는 것은 비용과 기술적 부담이 큼
- 기존 서비스(1초가입 등)는 가격이 높고(월 49,900원~) 지원 플랫폼이 제한적
- 비회원이 재방문해도 가입을 유도할 수단이 없음 (이탈 감지, 에스컬레이션 부재)
- 사용자가 어떤 소셜 서비스로 가입했는지 기억하기 어려워 재방문 시 혼란

### 1.5 솔루션

- 소셜 로그인 9종 **무료** 제공 → 진입 장벽 제거, 가입 완료율 극대화
- **스마트 버튼**: 이전 사용 로그인 방법 기억 + 자동 강조
- **가입 쿠폰 자동 발급**: 가입 즉시 혜택 제공으로 전환율 상승
- **미니 배너**: "회원가입하면 3,000원 할인!" 배너로 비회원 유도
- **이탈 감지 팝업**: 이탈 직전 마지막 가입 유도
- **재방문 비회원 에스컬레이션**: 방문 횟수가 늘수록 점점 강해지는 가입 유도
- **AI 4종 기능**: 쇼핑몰 정체성 자동 설정 + 주간 AI 브리핑 + 맥락 기반 카피 자동 생성 + 재방문 메시지 자동 생성

### 1.6 핵심 가치

- **방문자**: 1클릭으로 가입 완료 + 즉시 쿠폰 지급. 이전 로그인 방법 자동 기억.
- **쇼핑몰 운영자**: 회원 유치 자동화. 소셜 로그인 9종 무료. 가입 전환 퍼널 시각화.
- **차별점**: 무료 소셜 9종 + 가입 유도 도구 통합 + 합리적 Plus 가격(월 6,900원)

---

## 2. 타겟 사용자

### 2.1 쇼핑몰 운영자 (B2B 고객)

- 카페24 기반 쇼핑몰 운영자 (MVP)
- 회원 수를 늘리고 싶지만 개발 리소스가 없는 운영자
- 소셜 로그인을 무료로 도입하고 싶은 운영자
- 1초가입(월 49,900원)의 가격 부담을 느끼는 운영자
- 여러 플랫폼에서 쇼핑몰을 운영하는 운영자 (Phase 3)

### 2.2 쇼핑몰 방문자 (최종 사용자)

- 한국 온라인 쇼핑몰 이용자
- 구글, 카카오, 네이버, 애플 등 소셜 계정 보유자
- 복잡한 회원가입 폼을 싫어하는 사용자
- 할인/쿠폰을 보고 가입을 결심하는 사용자

---

## 3. 핵심 기능

### 3.1 소셜 로그인 9종 (Free — 무료)

#### 지원 프로바이더

| 프로바이더 | 한국 MAU | 상시 로그인 | 획득 가능 정보 |
|-----------|---------|-----------|--------------|
| **Google** | ~4,000만+ | 높음 (Android) | 이메일, 이름, 프로필사진 |
| **Kakao** | ~4,400만 | 매우 높음 | 이메일, 이름, 프로필사진, (동의 시) 전화번호/주소 |
| **Naver** | ~4,600만 | 매우 높음 | 이메일, 이름, 프로필사진, (동의 시) 전화번호/생일 |
| **Apple** | ~1,500만+ | 높음 (iOS) | 이메일(숨김 가능), 이름 |
| **Discord** | ~300만+ | 높음 (MZ세대) | 사용자명, 이메일 |
| **Facebook** | ~1,000만+ | 보통 | 이름, 이메일 |
| **LINE** | ~300만+ | 보통 | 이름, 프로필사진 |
| **X (Twitter)** | ~500만+ | 보통 | 사용자명 |
| **Telegram** | ~200만+ | 보통 | 이름, 사용자명 |

**커버리지**: 한국 사용자 95% 이상 (v1: 90%)

#### 기술 동작 (카페24 SSO 기반)

카페24 SSO는 최대 5개 항목 등록 가능. Google/Kakao/Naver/Apple 4개를 SSO로 등록하고, 나머지 5개(Discord, Facebook, LINE, X, Telegram)는 ScriptTag 위젯 방식으로 구현.

```
[Google/Kakao/Naver/Apple] → 카페24 SSO 등록 방식
1. 각 SSO의 Authorize URL: bg.suparain.kr/oauth/authorize?provider={provider}
2. 사용자가 카페24 로그인 페이지에서 소셜 SSO 버튼 클릭
3. bg.suparain.kr/oauth/authorize?provider={provider} 호출
4. 즉시 소셜 OAuth로 리다이렉트 (중간 페이지 없음)
5. 소셜 인증 완료 → 사용자 정보 저장
6. 카페24 SSO 콜백으로 Authorization Code 반환
7. 카페24가 Token/UserInfo API 호출
8. 카페24가 회원 자동 생성 + 로그인 세션 생성

[Discord/Facebook/LINE/X/Telegram] → ScriptTag 위젯 방식
- SSO 5개 제한 초과 → 위젯 JS에서 직접 OAuth 처리
```

### 3.2 스마트 버튼 (Free — 무료)

#### 이전 로그인 방법 기억

- 가입/로그인 성공 시 → localStorage에 `bg_last_provider` 저장
- 재방문 시 해당 버튼을 강조 (⚡ 마크 + 테두리 하이라이트)
- 멀티 쇼핑몰 기억: 같은 번개가입(bg.suparain.kr)을 사용하는 모든 쇼핑몰에서 기억 유지

**UI 예시 (재방문 사용자):**
```
┌──────────────────────────────────────┐
│  ⚡ Google로 로그인 (지난번 사용)       │  ← 강조
├──────────────────────────────────────┤
│  카카오로 가입                         │
├──────────────────────────────────────┤
│  네이버로 가입                         │
│  ... (9종 전체 표시)                  │
└──────────────────────────────────────┘
```

### 3.3 가입 즉시 쿠폰 자동 발급 (Free — 1종)

#### 동작

- 소셜 가입 완료 즉시 쿠폰 1종 자동 발급
- 운영자가 대시보드에서 쿠폰 금액/조건 설정
- 카페24 쿠폰 API 연동으로 즉시 발급

#### 가입 유도 효과

```
소셜 가입 버튼 클릭 → 1클릭 가입 완료 → "3,000원 쿠폰이 발급되었습니다!" 팝업
→ 바로 쇼핑 동기 생성
```

#### Free 제한

- 쿠폰 1종만 설정 가능
- 쿠폰 발급 통계는 기본 대시보드에서 확인 가능

### 3.4 통합 관리자 대시보드 (Free — 기본 통계)

#### 구조

```
번개가입 대시보드 (bg.suparain.kr/dashboard)
│
├── 홈 (전체 요약)
│   ├── 오늘/이번 달 가입 수
│   ├── 프로바이더별 가입 수 (Google: N명, Kakao: N명, ...)
│   └── 플랜 상태
│
├── 쇼핑몰 관리
│   ├── 쇼핑몰 등록 (카페24 → Phase 3: 멀티 플랫폼)
│   ├── 소셜 프로바이더 선택/활성화
│   ├── 가입 쿠폰 설정
│   └── SSO 연동 상태
│
├── 통계 (Free: 기본 / Plus: 전환 퍼널 포함)
│   ├── [Free] 일별 가입 수, 프로바이더별 비율
│   └── [Plus] 배너 노출 → 클릭 → 가입 완료율 퍼널
│
├── 부가기능 (Plus 전용)
│   ├── 미니 배너 설정
│   ├── 이탈 감지 팝업 설정
│   ├── AI 기능 (주간 브리핑 / 카피 생성 / 재방문 메시지)
│   ├── 카카오 채널 연동
│   └── 재방문 에스컬레이션 설정
│
└── 설정
    ├── 계정/플랜 관리
    └── "Powered by 번개가입" 브랜딩 설정
```

#### Free vs Plus 기본 통계 비교

| 통계 항목 | Free | Plus |
|----------|------|-----|
| 일별 신규 가입 수 | O | O |
| 프로바이더별 가입 수 | O | O |
| 쿠폰 발급 수 | O | O |
| 배너 노출 수 | - | O |
| 배너 클릭 수 | - | O |
| 가입 전환율 퍼널 | - | O |
| 이탈 감지 팝업 전환율 | - | O |
| 재방문 에스컬레이션 전환율 | - | O |

---

## 4. Plus 기능 (월 6,900원)

### 4.1 가입 유도 미니 배너

- 로그인/회원가입 페이지 상단 또는 하단에 고정 배너 표시
- 예시: "회원가입하면 3,000원 할인! → [지금 가입하기]"
- 운영자가 문구, 색상, CTA 버튼 커스터마이징
- 슬라이드 카드 형태: 혜택 카드 최대 4종 표시

### 4.2 이탈 감지 → 가입 팝업

- **PC**: mouseout 이벤트 감지 (마우스가 화면 위쪽으로 이탈 시)
- **모바일**: scroll-up 이벤트 감지 (빠른 위로 스크롤 = 뒤로가기 의도)
- 이탈 직전 팝업: "잠깐! 가입하고 3,000원 받아가세요"
- 쿠폰과 연동하여 즉각적인 혜택 강조
- 쿠키 기반 팝업 노출 제어 (하루 1회 등 설정 가능)

### 4.3 AI 기능 (4가지 — Plus 전용)

AI 엔진: **Cloudflare Workers AI — Kimi K2.5 (Moonshot AI)**
256k 컨텍스트, Function calling, Vision 지원. 무료 할당: 일 10,000 Neurons.

#### (1) 쇼핑몰 정체성 자동 설정 (앱 설치 시 1회)

- AI가 쇼핑몰 URL/상품 데이터를 분석하여 업종, 타겟 고객, 톤앤매너를 자동 파악
- 예: "여성 패션 쇼핑몰, 20~30대 타겟, 트렌디하고 친근한 톤"
- 이후 모든 카피/전략의 기반으로 활용
- 운영자가 확인/수정 가능

#### (2) 주간 AI 브리핑 (매주 1회 자동 생성)

전략 수립과 성과 리포트를 하나로 통합:

```
번개가입 주간 브리핑 (4/1 ~ 4/7)

[지난주 성과]
- 신규 가입 47명 (전주 대비 +12%)
- 카카오 28명 | 구글 11명 | 네이버 8명
- 미니배너 클릭률 14.2% → 가입 전환 8명
- 이탈 팝업에서 5명 전환

[이번 주 전략]
- 봄 신상품 입고 시즌 → "신상품 알림 받기" 카피로 변경 권장
- 네이버 가입 저조 → 버튼 순서를 카카오/네이버/구글로 조정 제안
- 재방문 비회원 23명 감지 → 에스컬레이션 3단계 메시지 갱신

[AI 추천 액션]
- 미니배너 카피: "봄 신상 10% 할인, 회원만 가능!"
- 이탈 팝업: "지금 가입하면 무료배송 쿠폰 즉시 지급"

→ 매출 증진 AI 분석은 오팀장(otj-shop)에서
```

#### (3) 맥락 기반 가입 유도 카피 생성 (월 10회)

- 미니배너, 이탈 팝업 카피를 쇼핑몰 톤에 맞게 AI 생성
- 페이지별 맥락 반영: 상품 상세 → "이 상품 3,000원 할인받고 구매하기"
- 계절/이벤트 자동 반영
- 월 10회 생성 (주간 브리핑에서 자동 제안 + 수동 요청)
- 운영자가 '🤖 AI로 생성' 클릭 → 카피 3~5개 제안 → 선택만 하면 배너/팝업에 즉시 적용

**예시 생성 카피:**
```
"지금 가입하면 첫 구매 15% 할인 + 5,000원 쿠폰!"
"카카오로 3초 가입 → 즉시 3,000원 적립!"
"회원 전용 특가 상품, 지금 가입하고 확인하세요"
```

#### (4) 재방문 비회원 맞춤 메시지 자동 생성

- 방문 횟수별 에스컬레이션 메시지를 AI가 쇼핑몰 톤에 맞게 생성
- 1회차: 부드러운 안내 → 3회차: "벌써 3번째 방문이에요! 회원이 되면..."
- 쇼핑몰 정체성 기반 자연스러운 톤 유지

### 4.4 카카오 채널 연동

- 소셜 가입 완료 시 카카오 채널 자동 친구 추가 (동의 시)
- 운영자의 카카오 비즈채널과 연동
- 카카오 채널 친구 수 증가 → 마케팅 메시지 발송 채널 확보
- 경쟁사(1초가입, 해피싱크, 알파푸시) 모두 제공하는 필수 기능

### 4.5 재방문 비회원 에스컬레이션

- 비회원이 쇼핑몰을 재방문할 때마다 점점 강도 높은 가입 유도
- 방문 횟수별 메시지 강도 조절:

| 방문 횟수 | 노출 방식 | 예시 메시지 |
|----------|----------|------------|
| 1~2회 | 작은 배너 (무시 가능) | "회원이 되면 더 많은 혜택이 있어요" |
| 3~4회 | 중간 배너 + 쿠폰 강조 | "3,000원 쿠폰이 기다리고 있어요!" |
| 5회 이상 | 풀스크린 팝업 (1회/방문) | "오늘만 5,000원 쿠폰! 지금 가입하지 않으면 사라져요" |

- 쿠키로 방문 횟수 추적 (localStorage 보완)
- 운영자가 강도 단계별 메시지/조건 커스터마이징 가능

### 4.6 가입 전환 퍼널 통계

- 배너 노출 → 클릭 → 소셜 인증 시작 → 가입 완료 → 쿠폰 발급의 단계별 전환율
- 이탈 감지 팝업 노출 수 / 팝업에서 가입 전환율
- 에스컬레이션 방문 횟수별 전환율
- 프로바이더별 가입 완료율 비교

### 4.7 "Powered by 번개가입" 브랜딩 제거

- Free: 위젯 하단에 "Powered by 번개가입" 표시 (브랜딩)
- Plus: 브랜딩 완전 제거, 운영자 쇼핑몰 전용 위젯으로 표시

---

## 5. 비즈니스 모델

### 5.1 가격 정책 (v1 대비 변경)

| 플랜 | 가격 | 포함 기능 |
|------|------|----------|
| **Free** | 0원 (영구 무료) | 소셜 로그인 9종, 스마트 버튼, 가입 쿠폰 1종, 기본 통계, "Powered by 번개가입" 브랜딩 |
| **Plus 월간** | 월 6,900원 | 미니 배너, 이탈 감지 팝업, **AI 기능 4종**(쇼핑몰 정체성 설정 + 주간 AI 브리핑 + 맥락 카피 생성 월 10회 + 재방문 메시지 자동 생성), 카카오 채널 연동, 재방문 에스컬레이션, 전환 퍼널 통계, 브랜딩 제거 |
| **Plus 연간** | 연 79,000원 (월 환산 ~6,583원) | Plus 월간과 동일 기능 + 약 5% 할인 혜택 |

> **가격 전략 배경**: v1의 "무료 월 100명 제한"에서 "무료 무제한"으로 전환. 경쟁사 알파푸시가 무료 모델로 6개월 만에 6,000개 쇼핑몰을 확보한 사례를 참고. 소셜 로그인 자체는 영구 무료로 진입 장벽을 없애고, 수익은 가입 유도 부가기능(Plus)에서 창출.

### 5.2 수익 구조

```
[무료 사용자 대규모 확보]
    ↓
[Plus 유료 전환 — 월 6,900원]
    ↓
[otj-shop 업셀 — 회원 → 구매 전환 솔루션]
```

- Free 사용자: 소셜 로그인 설치 후 가입 수 증가 → "더 올리고 싶다"는 니즈 생성
- Plus 전환: 배너/팝업/AI 카피로 가입률 추가 향상 → ROI 명확 (월 6,900원 대비 가입자 1명의 LTV)
- otj-shop 업셀: 회원이 늘면 "이제 이들에게 어떻게 팔지"의 문제 → otj-shop으로 연결

### 5.3 경쟁사 가격 비교 (v1 대비 업데이트)

| 앱 | 가격 | 소셜 종류 | 번개가입 대응 |
|----|------|----------|-------------|
| **1초가입** | 월 49,900~69,900원 | 카카오싱크 1종 | 소셜 로그인 무료 (9종), Plus 6,900원 |
| **해피싱크** | 월 33,000원 | 카카오, 네이버 2종 | 소셜 로그인 무료 (9종) |
| **오모조인** | 월 55,000원 | 카카오 1종 | 소셜 로그인 무료 (9종) |
| **알파푸시** | 무료 / 프리미엄 39,000원 | 카카오, 네이버, 토스, PASS 4종 | 동일 무료 진입 + 9종 소셜 |
| **번개가입** | **Free 0원 / Plus 6,900원** | **9종** | - |

### 5.4 포지셔닝 맵

```
            [가격]
             높음
              |
    1초가입   |   오모조인
    (49,900~) |   (55,000)
              |
   해피싱크   |
   (33,000)  |
              |
              |
    ----------+---------------------------------------- [소셜 다양성 + 가입 유도 기능]
              |  적음/단순                     많음/강력
              |
    알파푸시   |                        ★ 번개가입
    (무료~    |                          (Free 0원 +
     39,000)  |                           Plus 6,900원)
              |
             낮음
```

### 5.5 결제 방식

카페24 수동 인앱결제. automatic_payment="T" 자동결제는 별도 검토 후 적용 예정.

### 5.6 AI 비용 분석

**AI 엔진**: Cloudflare Workers AI — Kimi K2.5 (Moonshot AI)
- 256k 컨텍스트, Function calling, Vision 지원
- 무료 할당: 일 10,000 Neurons

**쇼핑몰 1개당 월간 AI 사용량 (Plus 기준):**

| AI 기능 | 횟수/월 | Input tokens | Output tokens |
|---------|---------|-------------|--------------|
| 쇼핑몰 정체성 설정 | 초기 1회 (월할) | 3,000 | 1,000 |
| 주간 AI 브리핑 | 4회 | 40,000 | 16,000 |
| 가입 유도 카피 생성 | 10회 | 15,000 | 5,000 |
| 재방문 메시지 템플릿 | 3회 | 6,000 | 3,000 |
| **합계** | **~18회** | **~64,000** | **~25,000** |

**월 비용**: ~$0.12/쇼핑몰 (~170원)

**규모별 수익성 (Plus 월 6,900원 기준):**

| 쇼핑몰 수 | AI 월 비용 | Plus 월 수익 | AI 비용 비율 |
|----------|-----------|------------|------------|
| 100개 | ~17,000원 | 690,000원 | 2.5% |
| 1,000개 | ~170,000원 | 6,900,000원 | 2.5% |
| 10,000개 | ~1,700,000원 | 69,000,000원 | 2.5% |

> AI 비용이 Plus 수익의 2.5% 수준으로, 수익성에 거의 영향 없음. 규모 확장 시에도 고정 비율 유지.

---

## 6. otj-shop 연동 전략 (v2 신규)

### 6.1 서비스 관계 정의

```
[쇼핑몰 방문자]
      ↓
[번개가입] ← "비회원 → 회원" 전환 담당
      ↓ (회원 확보 완료)
[otj-shop] ← "회원 → 구매" 전환 담당
```

### 6.2 퍼널 역할 분담

| 단계 | 담당 서비스 | 주요 기능 |
|------|-----------|----------|
| 비회원 방문 → 가입 | **번개가입** | 소셜 로그인, 배너, 팝업, 에스컬레이션 |
| 가입 완료 → 첫 구매 | **번개가입** (쿠폰) + **otj-shop** | 가입 쿠폰 → 즉시 구매 유도 |
| 재방문 회원 → 구매 | **otj-shop** | AI 상품 추천, 타이밍 최적화, CRM |
| 운영 전반 | **otj-shop** | 주문/CS/상품 관리, AI 운영 |

### 6.3 otj-shop 업셀 시나리오

```
[번개가입 Free 사용자]
  → "소셜 로그인 9종 무료 설치" → 가입자 증가 확인

[번개가입 Plus 전환]
  → "배너/팝업으로 가입률 더 높이기" → 월 6,900원

[otj-shop 업셀]
  → "이제 회원 N명이 생겼는데, 이들에게 어떻게 팔지?"
  → otj-shop: 회원 → 구매 전환, AI 운영, 재구매 전략
```

### 6.4 기술 연동 구조 (Phase 4)

- otj-shop이 번개가입의 ScriptTag를 원격 제어하는 미래 연동 구조
- 번개가입의 가입 전환 데이터 → otj-shop AI 운영 제안 입력값
- **별도 ScriptTag로 분리 운영** (번개가입 ScriptTag ≠ otj-shop ScriptTag)

### 6.5 번개가입 범위 외 기능 (otj-shop 영역)

번개가입은 "회원 유치"에만 집중하며, 아래는 포함하지 않는다:

- AI 최적화 (타이밍, 배치, A/B 테스트) — Phase 3 이후 재검토
- 고객 세그먼트/행동 분석 (구매 데이터 기반)
- 구매 촉진 효과 (할인 뱃지, 가격 카운트다운, 재고 긴급)
- 장바구니 회수/재참여 기능
- 프로바이더별 차등 쿠폰/프로모션 자동화 (복잡도 높음)
- 고급 AI 리포트/인사이트 (구매 전환 데이터 필요)
- 주문/CS/상품 관리

---

## 7. 기술 아키텍처

### 7.1 기술 스택 (v1과 동일)

| 구성요소 | 기술 | 비고 |
|---------|------|------|
| **런타임** | Cloudflare Workers | 서버리스, 글로벌 엣지 |
| **언어** | TypeScript | Workers 공식 지원 |
| **DB (영구)** | Cloudflare D1 | SQLite 기반 |
| **DB (임시)** | Cloudflare KV | 토큰/세션/코드 (TTL 활용) |
| **카페24 연동** | cafe24-common TS 포팅 | 핵심 기능만 |
| **프론트 (위젯)** | Vanilla JS | ScriptTag로 삽입, localStorage 활용 |
| **대시보드** | Workers + D1 | SSR 또는 SPA |
| **AI 기능** | Cloudflare Workers AI (Kimi K2.5) | 정체성 설정, 주간 브리핑, 카피 생성(월 10회), 재방문 메시지 |

### 7.2 인프라 구성 (스테이징/프로덕션 분리)

| 환경 | 도메인 | 용도 |
|------|--------|------|
| **스테이징** | bg-dev.suparain.kr | 개발/테스트 |
| **프로덕션** | bg.suparain.kr | 실서비스 |

Cloudflare Workers 환경별 분리: 단일 `wrangler.toml` + `--env dev` 분기 방식으로 스테이징/프로덕션 분리

### 7.3 시스템 구성도

```
[쇼핑몰 방문자 브라우저]
    │
    ├─ 카페24 로그인/회원가입 페이지
    │   └─ 번개가입 위젯 (ScriptTag)
    │       ┌───────────────────────────────────────────┐
    │       │  [미니 배너] "회원가입하면 3,000원 할인!"   │  ← Plus
    │       ├───────────────────────────────────────────┤
    │       │  ⚡ Google로 로그인 (지난번 사용)            │  ← Free (스마트 버튼)
    │       │  카카오로 가입                              │
    │       │  네이버로 가입 / Apple / Discord / ...     │
    │       ├───────────────────────────────────────────┤
    │       │  Powered by 번개가입                       │  ← Free (Plus에서 제거)
    │       └───────────────────────────────────────────┘
    │
    ▼ (이탈 감지 — Plus)
    ┌─────────────────────────────────────────┐
    │  잠깐! 가입하고 3,000원 받아가세요          │
    │  [Google로 가입]  [카카오로 가입]          │
    └─────────────────────────────────────────┘
    │
    ▼ (버튼 클릭)
[Cloudflare Workers — bg.suparain.kr]
    │
    ├─ /oauth/authorize?provider=google&shop=xxx
    │   └─ 즉시 소셜 OAuth로 리다이렉트
    │
    ├─ /oauth/callback/{provider}
    │   ├─ 소셜에서 사용자 정보 수신
    │   ├─ D1에 사용자 정보 저장 (PII AES-GCM 암호화)
    │   ├─ 가입 쿠폰 자동 발급 (카페24 쿠폰 API)
    │   ├─ 카카오 채널 친구 추가 요청 (Plus — 동의 시)
    │   └─ 카페24 SSO 콜백으로 Authorization Code 반환
    │
    ├─ /oauth/token, /oauth/userinfo (카페24가 호출)
    │
    ├─ /api/ai/identity (Plus — 쇼핑몰 정체성 설정)
    ├─ /api/ai/briefing (Plus — 주간 AI 브리핑 자동 생성)
    ├─ /api/ai/copy (Plus — 맥락 기반 카피 생성)
    │   └─ Cloudflare Workers AI (Kimi K2.5) → 배너/팝업 카피 반환
    ├─ /api/ai/escalation-copy (Plus — 재방문 메시지 자동 생성)
    │
    ├─ /api/dashboard/stats/funnel (Plus — 전환 퍼널 통계)
    │
    ├─ /dashboard/* (통합 관리자 대시보드)
    │
    └─ /widget/buttons.js (ScriptTag용 JS)

[Cloudflare D1]              [Cloudflare KV]
├── owners                   ├── auth_code:{code} (5분 TTL)
├── shops                    ├── access_token:{token} (2시간 TTL)
├── users                    └── session:{id} (세션 TTL)
├── shop_users
├── subscriptions
├── login_stats
├── user_providers
└── audit_logs
```

### 7.4 현재 구현된 데이터 모델 (D1 — schema.sql 기준)

**owners** — 쇼핑몰 운영자 계정
```sql
owner_id   TEXT PRIMARY KEY
email      TEXT NOT NULL UNIQUE
name       TEXT
password_hash TEXT NOT NULL
role       TEXT NOT NULL DEFAULT 'user'  -- 'user' | 'admin'
deleted_at TEXT                          -- 계정 탈퇴 soft delete
created_at TEXT NOT NULL DEFAULT (datetime('now'))
updated_at TEXT NOT NULL DEFAULT (datetime('now'))
```

**shops** — 등록된 쇼핑몰
```sql
shop_id                TEXT PRIMARY KEY
mall_id                TEXT NOT NULL
platform               TEXT NOT NULL   -- 'cafe24' | 'imweb' | 'godomall' | 'shopby'
shop_name              TEXT
shop_url               TEXT
owner_id               TEXT NOT NULL   -- FK: owners
client_id              TEXT NOT NULL UNIQUE
client_secret          TEXT NOT NULL
enabled_providers      TEXT NOT NULL DEFAULT '["google","kakao","naver","apple"]'
platform_access_token  TEXT
platform_refresh_token TEXT
allowed_redirect_uris  TEXT            -- JSON: 화이트리스트
plan                   TEXT NOT NULL DEFAULT 'free'  -- 'free' | 'plus'
sso_configured         INTEGER NOT NULL DEFAULT 0
widget_style           TEXT            -- JSON: 버튼 스타일 커스터마이징
sso_type               TEXT NOT NULL DEFAULT 'sso'  -- 카페24 SSO 슬롯 (sso, sso1, ...)
deleted_at             TEXT
created_at             TEXT NOT NULL DEFAULT (datetime('now'))
updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
```

**users** — 소셜 인증 사용자 (PII 암호화)
```sql
user_id       TEXT PRIMARY KEY
provider      TEXT NOT NULL
provider_uid  TEXT NOT NULL
email         TEXT      -- AES-GCM 암호화
email_hash    TEXT      -- SHA-256 해시 (검색용)
name          TEXT      -- AES-GCM 암호화
profile_image TEXT
raw_data      TEXT      -- AES-GCM 암호화 JSON
phone         TEXT      -- AES-GCM 암호화
birthday      TEXT      -- AES-GCM 암호화
gender        TEXT      -- 평문 (민감도 낮음)
created_at    TEXT NOT NULL DEFAULT (datetime('now'))
updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
UNIQUE(provider, provider_uid)
```

**shop_users** — 쇼핑몰-사용자 매핑
```sql
id                 TEXT PRIMARY KEY
shop_id            TEXT NOT NULL  -- FK: shops
user_id            TEXT NOT NULL  -- FK: users
platform_member_id TEXT
status             TEXT NOT NULL DEFAULT 'active'
created_at         TEXT NOT NULL DEFAULT (datetime('now'))
UNIQUE(shop_id, user_id)
```

**subscriptions** — 구독/과금
```sql
id            TEXT PRIMARY KEY
owner_id      TEXT NOT NULL  -- FK: owners
shop_id       TEXT NOT NULL  -- FK: shops
plan          TEXT NOT NULL  -- 'plus'
billing_cycle TEXT NOT NULL  -- 'monthly' | 'yearly'
status        TEXT NOT NULL  -- 'pending' | 'active' | 'cancelled' | 'expired'
payment_id    TEXT
started_at    TEXT NOT NULL DEFAULT (datetime('now'))
expires_at    TEXT NOT NULL
created_at    TEXT NOT NULL DEFAULT (datetime('now'))
```

**login_stats** — 가입/로그인 통계
```sql
id         TEXT PRIMARY KEY
shop_id    TEXT NOT NULL  -- FK: shops
user_id    TEXT NOT NULL
provider   TEXT NOT NULL
action     TEXT NOT NULL  -- 'signup' | 'login'
created_at TEXT NOT NULL DEFAULT (datetime('now'))
```

**user_providers** — 멀티 프로바이더 연동
```sql
id           TEXT PRIMARY KEY
user_id      TEXT NOT NULL  -- FK: users
provider     TEXT NOT NULL
provider_uid TEXT NOT NULL
linked_at    TEXT NOT NULL DEFAULT (datetime('now'))
UNIQUE(provider, provider_uid)
```

**audit_logs** — 관리자 감사 로그
```sql
id          TEXT PRIMARY KEY
actor_id    TEXT NOT NULL
action      TEXT NOT NULL
target_type TEXT NOT NULL
target_id   TEXT
detail      TEXT
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### 7.5 보안 설계

| 위협 | 대응 |
|------|------|
| redirect_uri 변조 공격 | shops.allowed_redirect_uris 화이트리스트 검증 |
| OAuth 코드 탈취 (CSRF) | PKCE (code_verifier/code_challenge) 적용 |
| PII 유출 (DB 접근 시) | email/name/raw_data AES-GCM 암호화 저장 |
| 관리자 권한 남용 | audit_logs 감사 추적 + role 기반 접근 제어 |
| 쿠폰 중복 발급 | shop_users 테이블 UNIQUE(shop_id, user_id)로 신규 가입 판별 |

---

## 8. 서비스 확장 로드맵 (v1 대비 변경)

### Phase 1 — MVP (카페24, 현재 진행 중)

**Free 기능:**
- 소셜 로그인 9종 (Google, Kakao, Naver, Apple, Discord, Facebook, LINE, X, Telegram)
- 스마트 버튼 (이전 사용 방법 기억 + 강조)
- 가입 즉시 쿠폰 1종 자동 발급
- 기본 대시보드 (일별 가입 수, 프로바이더별 통계)
- "Powered by 번개가입" 브랜딩

**Plus 기능 (월 6,900원):**
- 가입 유도 미니 배너
- 이탈 감지 → 가입 팝업 (PC: mouseout / 모바일: scroll-up)
- AI 기능 4종 (Cloudflare Workers AI — Kimi K2.5):
  - 쇼핑몰 정체성 자동 설정 (앱 설치 시 1회)
  - 주간 AI 브리핑 (성과 리포트 + 이번 주 전략 + AI 추천 액션, 매주 자동 생성)
  - 맥락 기반 가입 유도 카피 생성 (월 10회)
  - 재방문 비회원 맞춤 메시지 자동 생성
- 카카오 채널 연동
- 재방문 비회원 에스컬레이션
- 가입 전환 퍼널 통계
- "Powered by" 브랜딩 제거

### Phase 2 — 고도화 (구현계획서 Phase 4에 해당)

- 카페24 앱스토어 정식 등록
- 위젯 커스터마이징 (색상, 레이아웃, 버튼 순서)
- Google One Tap 연동 (로그인 상태 감지 + 원탭 가입)
- 소셜 프루프 위젯 ("방금 N명이 카카오로 가입했어요")

### Phase 3 — 멀티 플랫폼

- 아임웹, 고도몰5, 샵바이 지원
- 멀티 플랫폼 통합 대시보드 활성화

### Phase 4 — otj-shop 연동

- otj-shop 연동 API
- 번개가입 가입 전환 데이터 → otj-shop AI 운영 제안 연계
- ScriptTag 원격 제어 구조 (otj-shop ↔ 번개가입 분리 운영)
- 수파레인 크레딧 쿠폰 시스템 (생태계 연동)

---

## 9. 성공 지표 (KPI) (v1 대비 변경)

| 지표 | 목표 (출시 후 3개월) | v1 목표 | 변경 이유 |
|------|--------------------|---------|---------  |
| 등록 쇼핑몰 수 | **100개** | 50개 | 무료 진입으로 설치 장벽 제거 |
| 총 회원가입 처리 수 | **10,000건** | 5,000건 | 쇼핑몰 수 증가 + 9종 소셜 |
| Plus 유료 전환율 | **15%** | 10% (유료 전환) | 명확한 ROI로 전환 동기 강화 |
| otj-shop 업셀률 | **5%** | 없음 (v2 신규) | 번개가입 → otj-shop 퍼널 |
| 가입 완료율 (클릭 → 성공) | 90% 이상 | 90% | 동일 |
| 평균 가입 소요 시간 | 5초 이내 | 5초 이내 | 동일 |
| 스마트 버튼 활용률 | 70% 이상 | 70% | 동일 |

---

## 10. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 카페24 SSO API 변경 | 높음 | ScriptTag + 폼 제출 방식 백업 |
| 카페24 앱스토어 심사 지연 | 중간 | Phase 2에서 등록, MVP는 직접 설치 가이드로 배포 |
| Workers Free Plan CPU 10ms 제약 | 낮음 | $5/월 Paid Plan으로 해결 |
| 소셜 서비스 OAuth 정책 변경 | 중간 | 9종 분산으로 리스크 분산 |
| 개인정보보호법 규제 | 높음 | 최소 정보만 수집, PII 암호화, 개인정보처리방침 준비 |
| 쿠폰 API 오류 시 가입 차단 | 중간 | 쿠폰 발급 실패는 가입 완료와 비동기 처리 (가입 우선) |
| AI 기능 응답 지연 (브리핑/카피 등) | 낮음 | 비동기 처리, 대시보드에서 별도 요청 방식. 주간 브리핑은 스케줄러 사전 생성 |
| redirect_uri 변조 공격 | 높음 | allowed_redirect_uris 화이트리스트 검증 |
| OAuth 코드 탈취 | 높음 | PKCE 적용 |
| PII 유출 | 높음 | AES-GCM 암호화 저장 |
| 무료 남용 (스팸 쇼핑몰) | 낮음 | 이메일 인증 + 카페24 앱 설치 기반이므로 자연 제한 |

---

## 11. 법적/규제 고려사항

- **개인정보 처리방침 문서 작성 필수 (런칭 전 완료)** — `docs/개인정보처리방침.md` 기존 작성 중
- 카페24 약관 동의는 카페24 SSO가 자체 처리 (최초 1회 팝업)
- OAuth로 수집하는 최소 정보에 대한 동의 처리
- 소셜 서비스별 개발자 약관 준수 (Google, Apple, Kakao, Naver, Discord, Facebook, LINE, X, Telegram)
- 카페24 앱스토어 심사 기준 준수
- localStorage에 저장하는 데이터는 provider 이름만 (개인정보 아님)
- AI 기능 사용 시 개인정보 입력 방지 (쇼핑몰 정보/통계만 프롬프트에 사용, 개인 식별 정보 제외)

---

## 12. 일정 (예상)

| 단계 | 기간 | 내용 |
|------|------|------|
| 기획/설계 완료 | 완료 | PRD v2, 기술 스펙, 구현 계획 |
| cafe24-common TS 포팅 | 완료 | 카페24 API 클라이언트 |
| OAuth Provider 구현 | 완료 | authorize/token/userinfo |
| 소셜 OAuth 연동 (9종) | ~1주 | Google/Kakao/Naver/Apple 완료, 5종 추가 |
| 가입 쿠폰 API | ~3일 | 카페24 쿠폰 API 연동 |
| 스마트 버튼 위젯 | 완료 | ScriptTag JS + localStorage |
| 미니 배너 (Plus) | ~4일 | 슬라이드 카드 + AI 카피 연동 |
| 이탈 감지 팝업 (Plus) | ~3일 | mouseout/scroll-up 이벤트 |
| AI 기능 4종 (Plus) | ~5일 | 정체성 설정 + 주간 브리핑 + 카피 생성 + 재방문 메시지 |
| 카카오 채널 연동 (Plus) | ~3일 | 카카오 채널 API |
| 에스컬레이션 (Plus) | ~3일 | 방문 횟수 기반 강도 조절 |
| 통합 대시보드 | ~1.5주 | 기본 통계 + Plus 전환 퍼널 |
| 과금 시스템 | ~3일 | Free/Plus 플랜 전환 |
| E2E 테스트 | ~1주 | 실제 카페24 쇼핑몰 테스트 |
| **MVP 출시까지** | **약 4주 (구현계획서 v2 기준 약 19일)** | ※ 구 v1 기준 6-7주에서 단축 |

---

## 부록

### A. 참조 프로젝트

- **VeriPack-Multi**: `/Users/happyyuna/MyWorks/Development/projects/VeriPack-Multi`
  - 4개 쇼핑몰 플랫폼 인증/웹훅/주문 API 구현 완료
  - 카페24 OAuth, 토큰 관리, 웹훅 검증 코드 참조
- **cafe24-common**: `/Users/happyyuna/MyWorks/Development/projects/cafe24-common`
  - 카페24 Admin API 클라이언트 (Python, v0.9.0)
  - TypeScript 포팅 진행 중

### B. 관련 문서 (docs/)

| 문서 | 설명 |
|------|------|
| `PRD_v1.md` | 이전 버전 PRD (참조용) |
| `schema.sql` | D1 데이터베이스 스키마 (Single Source of Truth) |
| `전략_및_MVP.md` | 수익 모델 및 시장 진입 전략 상세 |
| `경쟁사_분석.md` | 1초가입, 해피싱크, 알파푸시 상세 분석 |
| `구현계획서_v2.md` | Phase별 구현 세부 계획 |
| `기술스펙_v1.md` | API 엔드포인트, 인증 플로우 기술 스펙 |
| `카페24_기술검증_명세서.md` | ScriptTag, SSO, 쿠폰 API 검증 결과 |
| `인프라_스테이징_프로덕션_설계.md` | Cloudflare 인프라 구성 |
| `개인정보처리방침.md` | 개인정보 처리방침 (작성 중) |

### C. 경쟁사 상세 정보

- **1초가입**: https://store.cafe24.com/kr/apps/4964 — 유니드컴즈, 설치 13,856+, 카카오싱크 1종, 월 49,900~69,900원
- **해피싱크**: https://store.cafe24.com/kr/apps/15700 — 블룸에이아이, 카카오+네이버 2종, 월 33,000원
- **알파푸시**: 샐러드랩, 무료+프리미엄 39,000원, 설치 6,000+(6개월), 카카오/네이버/토스/PASS 4종
