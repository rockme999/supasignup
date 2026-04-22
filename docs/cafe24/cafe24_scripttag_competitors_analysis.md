# 카페24 ScriptTag API — 경쟁사 앱 분석 & 기술 구현 방식

**작성일**: 2026-03-31  
**목적**: SupaSignup 소셜 로그인 위젯의 ScriptTag 기반 배포 전략 수립을 위한 경쟁사 기술 분석

---

## 1. 카페24 ScriptTag API 공식 스펙

### 1.1 API 기본 정보

**엔드포인트**
```
POST https://{mall_id}.cafe24api.com/api/v2/admin/scripttags
```

**인증 방식**: OAuth 2.0 Bearer Token
```
Authorization: Bearer {access_token}
```

**요청 포맷**: JSON
```json
{
  "shop_no": "1",
  "src": "https://yourdomain.com/script.js",
  "display_location": ["PRODUCT_LIST", "PRODUCT_DETAIL"],
  "skin_no": ["1", "2"]
}
```

**응답**: 201 Created (성공 시)

### 1.2 display_location 파라미터

`display_location`은 스크립트가 노출될 쇼핑몰 페이지 위치를 지정하는 배열 파라미터입니다.

**알려진 값:**
- `PRODUCT_LIST` — 상품 목록 페이지
- `PRODUCT_DETAIL` — 상품 상세 페이지
- 기타 값들은 공식 카페24 API 문서 참조 필요

### 1.3 핵심 기술 제약사항

| 제약사항 | 설명 |
|---------|------|
| **데이터 전달 경로 부재** | API는 스크립트 src URL만 지정 가능하며, 추가 데이터 전달 수단 없음 |
| **해결 방법** | Query String을 통해 동적 설정값 전달 (예: `?left=11&bottom=75&opacity=1`) |
| **CORS 요구사항** | 스크립트 호스팅 서버는 반드시 `Access-Control-Allow-Origin: *` 설정 필요 |
| **자기참조 방식** | 주입된 스크립트는 `document.getElementsByTagName("script")`로 자신의 위치 파악 후 URL 파싱 |

### 1.4 주의사항

- 템플릿 리터럴(`backtick`) 사용 금지 → 422 에러 발생 가능
- 문자열 연결(String concatenation) 권장
- 스크립트 src URL에 공백/특수문자 포함 시 인코딩 필수

---

## 2. 경쟁사별 ScriptTag 구현 분석

### 2.1 "1초가입" — 회원가입 흐름 통합

**서비스 특징**
- KakaoSync, Naver ID 기반의 소셜 연동형 원클릭 회원가입
- 회원가입 중도이탈 93% 감소 실적
- 월 49,900원부터 시작하는 유료 서비스

**ScriptTag 배포 방식**
- **관리형 서비스**: 자동 설치 지원 ("신청만 하면 100% 설치 지원")
- **개발 지식 불필요**: 개발/디자인 인력 없어도 쇼핑몰 맞춤 적용 가능
- **유지보수 포함**: 설치 후 디자인 변경 시 무료 유지보수 서비스 제공

**기술 구현 포인트**
- UI 위치: 회원가입 페이지에 배너/팝업으로 삽입
- 기능 범위: 회원가입 폼 대체 (입력값 사전 채움, 자동 로그인)
- 배포: Partner-managed deployment model (사용자가 직접 설정하지 않음)

**우리 프로젝트 시사점**
- ✓ 사용자 직접 설정 대신 백엔드 자동 배포 가능
- ✓ 쇼핑몰별 커스터마이징 후 무료 설치 지원 모델 가능
- ✓ 소셜 연동 + 회원가입 통합 가치 극대화

---

### 2.2 "알파푸시" — CRM 배너 자동 설치

**서비스 특징**
- 카페24 CRM 푸시 솔루션
- 배너/푸시 알림 기반 고객 재참여(re-engagement) 마케팅

**ScriptTag 배포 방식**

#### A. 자동 설치 배너 기능 (2024년 7월 신기능)
- **특징**: HTML 코드 수동 삽입 불필요
- **방식**: 이미지/동영상 업로드 후 자동 렌더링
- **On/Off**: 관리자 대시보드에서 즉시 토글 가능
- **비용**: 카페24 사용자면 무료 제공

**기술 구현 포인트**
- 배너 렌더링: 이미지/영상 URL → 자동 DOM 생성
- 위치 지정: display_location으로 상품 목록/상세 페이지 구분
- 인터랙션: 클릭 이벤트 추적 및 고객 세그먼트 연동

**우리 프로젝트 시사점**
- ✓ 비개발자도 사용 가능한 배너 관리 UI 필수
- ✓ 스크립트 on/off 토글 기능 필수
- ✓ 배너 위치/스타일 실시간 수정 지원 필요

---

### 2.3 "채널톡" — 채팅 위젯 주입

**서비스 특징**
- 실시간 고객 상담 채팅 솔루션
- 고객 정보(구매이력, 카트, 마일리지 등) 자동 동기화
- 카페24 공식 빌더 파트너

**ScriptTag 배포 방식**

#### A. 카페24 앱 스토어 설치 (권장)
```
1. 앱 스토어 [설치] 클릭
2. 권한 동의 화면 [동의함]
3. [연동 시작하기] → 자동 설치 (3분 소요)
```

**자동 처리 사항**
- 채널톡 스크립트 자동 주입
- 고객 정보 자동 동기화:
  - 기존 회원 로그인 시 프로필 정보 전송
  - 신규 회원 가입 시 즉시 동기화
  - 구매이력, 카트, 마일리지 실시간 연동

#### B. 자체 홈페이지 설치 (DIY)
```html
<!-- 채널톡 위젯 스크립트 -->
<script>
  // 채널톡 SDK 로드
  window.ChannelIO||function(){...}()
</script>

<!-- 회원정보 연동 스크립트 (별도) -->
<script>
  ChannelIO('setProfile', {
    email: 'user@example.com',
    name: '고객명'
  });
</script>
```

**기술 구현 포인트**
- 위젯 자동 주입: 스크립트 로드만으로 우측 하단에 채팅 버튼 표시
- 이벤트 훅: 사용자 로그인 시 `ChannelIO('setProfile', {...})` 호출
- 데이터 싱크: CRM 고객 데이터와 실시간 양방향 연동
- 다중 채널: 복수 쇼핑몰 운영 시 각각 채널톡 인스턴스 생성

**우리 프로젝트 시사점**
- ✓ 공식 앱 스토어 등록으로 원클릭 설치 신뢰도 확보
- ✓ 고객 정보 자동 동기화 → SupaSignup 회원과 연동 가능
- ✓ 이벤트 훅 기반 동적 UI 업데이트 필수 구현

---

### 2.4 "크리마" — 상품 리뷰 위젯

**서비스 특징**
- UGC(사용자 생성 콘텐츠) 기반 상품 리뷰 플랫폼
- 다양한 위젯 스타일 (리스트, 갤러리, 평점 표시 등)
- 카페24, 아임웹, 메이크샵, 고도몰 등 다중 플랫폼 지원

**ScriptTag 배포 방식**

#### A. HTML 컨테이너 기반 삽입
```html
<div id="crema-product-reviews" 
     class="crema-product-reviews" 
     data-product-code="{product_code}">
</div>
```

#### B. ScriptTag 로드
```html
<script src="https://widget.cre.ma/v3/crema-reviews.js"></script>
```

**기술 구현 포인트**
- **컨테이너 ID 기반**: `id="crema-product-reviews"` 자동 감지
- **Data Attributes**: `data-product-code` 로 상품 식별
- **옵션 설정**:
  - `data-widget-id`: 추가 리뷰 보드 링크
  - `data-no-auto-scroll`: 무한스크롤 비활성화
- **마이그레이션**: 기존 리뷰 섹션에 `crema-hide` 클래스 추가 → 자동 숨김

**우리 프로젝트 시사점**
- ✓ DOM 컨테이너 선택자 기반 위젯 마운팅 패턴 참고
- ✓ Data attributes로 동적 설정값 전달 (ScriptTag의 query string 대체 방안)
- ✓ 기존 UI와의 점진적 마이그레이션 지원 필수

---

## 3. ScriptTag 기술 패턴 비교표

| 구분 | 1초가입 | 알파푸시 | 채널톡 | 크리마 |
|------|--------|---------|--------|--------|
| **설치 난이도** | 매우 낮음<br>(전문가 지원) | 낮음<br>(자동 설치) | 낮음<br>(앱스토어) | 중간<br>(HTML 수정) |
| **배포 방식** | 관리형<br>(Partner-managed) | 자동화<br>(API 기반) | 앱스토어<br>(One-click) | DIY<br>(수동 삽입) |
| **주요 UI** | 회원가입 팝업/배너 | 이미지/영상 배너 | 채팅 위젯 | 리뷰 위젯 |
| **고객 데이터 연동** | 회원정보만 | 푸시 구독자 | 전체 고객정보 | 리뷰 데이터만 |
| **실시간 수정** | 불가<br>(재설치) | 가능<br>(대시보드) | 가능<br>(채널 설정) | 가능<br>(위젯 설정) |
| **On/Off 토글** | 불가 | 가능 | 가능 | 가능 |
| **Multi-Mall** | 미지원 | 미지원 | 지원<br>(채널별) | 지원<br>(인스턴스별) |

---

## 4. SupaSignup ScriptTag 구현 전략

### 4.1 우리의 위치

SupaSignup은 **1초가입 + 채널톡 + 크리마**의 하이브리드 모델 가능:
- 1초가입처럼: 회원가입 흐름 통합 + 쇼핑몰별 커스터마이징
- 채널톡처럼: 고객 정보 자동 동기화 + 이벤트 훅
- 크리마처럼: DOM 컨테이너 기반 유연한 위젯 마운팅

### 4.2 권장 구현 방식

#### A. ScriptTag 배포 (자동)
```json
{
  "src": "https://widget.supasignup.com/v1/script.js?shop_id={shop_id}&api_key={api_key}",
  "display_location": ["PRODUCT_LIST", "PRODUCT_DETAIL", "CATEGORY"],
  "skin_no": ["1", "2"]
}
```

#### B. 스크립트 로드 & 자기참조
```javascript
// 1. 자신의 <script> 태그 찾기
(function() {
  const scripts = document.getElementsByTagName('script');
  const currentScript = scripts[scripts.length - 1];
  const src = currentScript.src;
  
  // 2. Query string 파싱
  const url = new URL(src);
  const shopId = url.searchParams.get('shop_id');
  const apiKey = url.searchParams.get('api_key');
  
  // 3. 위젯 초기화
  window.SupaSignup = {
    shopId: shopId,
    apiKey: apiKey
  };
  
  // 4. 마운팅 지점 찾기
  const container = document.querySelector('[data-supasignup-widget]');
  if (container) {
    renderWidget(container, { shopId, apiKey });
  }
})();
```

#### C. 고객 정보 동기화
```javascript
// 채널톡처럼 이벤트 기반 동기화
document.addEventListener('customer:signin', (event) => {
  const customer = event.detail;
  fetch('https://api.supasignup.com/v1/sync', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      shop_id: shopId,
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        tier: customer.tier,
        mileage: customer.mileage
      }
    })
  });
});
```

#### D. 관리자 대시보드 (알파푸시처럼)
```
SupaSignup 관리자 > 위젯 설정
├─ 일반 설정
│  ├─ 위젯 활성화 (On/Off)
│  ├─ 표시 위치 선택 (상품목록/상세/카테고리)
│  └─ 스킨 번호 선택
├─ UI 커스터마이징
│  ├─ 배너 이미지 업로드
│  ├─ 버튼 색상/크기 설정
│  └─ 포지션 (좌상/우하 등) 조정
└─ 고급 설정
   ├─ 콜백 URL 설정
   └─ 이벤트 훅 매핑
```

### 4.3 핵심 체크리스트

- [ ] CORS 설정: `Access-Control-Allow-Origin: *` 적용
- [ ] Query String 파싱: 동적 설정값 지원
- [ ] 자기참조 패턴: `getElementsByTagName('script')` 사용
- [ ] 이벤트 훅: 고객 로그인/가입 시 CRM 연동
- [ ] On/Off 토글: 대시보드에서 실시간 제어
- [ ] 다중 쇼핑몰: shop_id별 독립 인스턴스
- [ ] 점진적 마이그레이션: 기존 회원가입 UI와 공존

---

## 5. 참고 자료

**공식 문서**
- [Cafe24 Developers - ScriptTag API](https://developers.cafe24.com/docs/api/admin/)
- [Cafe24 Developers - REST API Documentation](https://developers.cafe24.com/docs/en/api/admin/)

**경쟁사 서비스**
- [1초가입 카페24 앱](https://store.cafe24.com/kr/apps/4964)
- [알파푸시 설치 가이드](https://guide.alph.kr/24e46f3e-549c-8036-8aeb-f5e7eb7fb48f)
- [채널톡 개발자 문서](https://developers.channel.io/docs/cafe24-app)
- [크리마 위젯 문서](https://dev.cre.ma/crema-widgets/mobile-product-reviews)

**기술 참고**
- [ScriptTag를 이용한 플로팅 버튼 설치 (Velog)](https://velog.io/@crab4862/cafe24-scripttags%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%9C-%ED%94%8C%EB%A1%9C%ED%8C%85%EB%B2%84%ED%8A%BC-%EC%84%A4%EC%B9%98-with-getElementsByTagName)

