# 대시보드 & 어드민 페이지 구조 분석

## 1. supaMov24 프로젝트

### 1.1 사용자 대시보드 구조

#### 레이아웃 (base.html)
- **Framework**: Jinja2 템플릿 + Tailwind CSS + Alpine.js + HTMX
- **디렉토리**: `/app/templates/`
- **주요 파일**: `base.html`, `dashboard.html`

#### 네비게이션 구조
```
메인 메뉴:
├── 대시보드 (/)
├── 내 모델 (/models)
├── 상품 관리 (/products) [cafe24/표준에만]
├── 일괄 처리 (/batch) [cafe24/표준에만]
├── 이미지 업로드 (/upload) [standalone만]
├── 룩북 (/lookbook)
├── 비디오 (/video)
├── 템플릿 (/template) [Beta 기능]
├── 갤러리 (/gallery)
└── 크레딧&충전 (/credits)

도움말 & 설정:
├── 사용 가이드 (/guide)
├── 자주 묻는 질문 (/faq)
├── 문의하기 (/inquiries)
└── 설정 (/settings) [cafe24/표준만]
```

#### 대시보드 페이지 구성 (dashboard.html)
```
1. 홍보 배너 섹션
   - HTMX로 동적 로드: GET /api/v1/banners/active/html?app=supamov
   - Alpine.js 슬라이더 지원 (여러 배너 시)
   - 닫기 시 localStorage에 배너 ID 저장 (다시 표시 안 함)

2. 요약 카드 (3열)
   - 크레딧 잔액 (충전 버튼)
   - 내 모델 수
   - 생성된 이미지 수

3. 퀵 액션 (5개 버튼)
   - AI 모델 만들기 (coral)
   - 착용 이미지 (green)
   - 배치 생성 (amber)
   - 룩북 생성 (amber)
   - 비디오 생성 (rose)

4. 최근 생성 이미지
   - HTMX로 동적 로드: GET /api/v1/gallery/recent
```

#### 사이드바 위젯
- **크레딧 잔액**: 실시간 HTMX 업데이트 (creditUpdate 이벤트)
- **버전**: supaMov v1.3

#### 스타일 시스템
- **컬러 토큰** (Warm Editorial Design):
  - 주요 액센트: coral (#D0472F)
  - 텍스트: warm brown (#2D1F14)
  - 배경: #F5F0EA (warm beige)
  - 사이드바: dark brown (#1C1410)

---

### 1.2 관리자 페이지 구조

#### 위치 & 인증
- **라우터**: `/supadmin/` 프리픽스
- **파일**: `/app/templates/admin/`
- **인증**: `require_admin` 데코레이터 (admin_auth.py)

#### 어드민 네비게이션
```
대시보드 (/supadmin/)
├── 쇼핑몰 관리 (/supadmin/shops)
├── 스토리지 (/supadmin/storage)
├── 배너 관리 (/supadmin/banners) ⭐
├── 문의 관리 (/supadmin/inquiries)
├── 플랫폼 정산 (/supadmin/settlement)
└── 다른 서비스 링크 (VeriPack Admin 등)
```

#### 홍보 배너 관리 (banners.html)
**기능**:
- 배너 목록 조회 (GET /supadmin/api/banners)
- 배너 추가 (POST /supadmin/api/banners)
- 배너 수정 (PUT /supadmin/api/banners/{id})
- 배너 삭제 (DELETE /supadmin/api/banners/{id})
- 배너 활성/비활성 토글

**배너 데이터 구조**:
```json
{
  "id": "배너ID",
  "title": "배너 제목",
  "image_url": "이미지 경로",
  "link_url": "클릭 시 이동 URL",
  "alt_text": "대체 텍스트",
  "is_active": 1,
  "display_order": 0,
  "target_app": "all|supamov|veripack|supa24",
  "starts_at": "2026-03-15T10:00:00",
  "ends_at": "2026-04-15T10:00:00"
}
```

**이미지 업로드**:
- 엔드포인트: POST /supadmin/api/banners/upload
- 파일 저장 위치: `/app/static/img/banners/`
- 지원 형식: .png, .jpg, .jpeg, .gif, .webp

#### 쇼핑몰 관리 (shops.html)
**기능**:
- 전체 쇼핑몰 목록 (GET /supadmin/api/shops)
- 개별 쇼핑몰 상세 (GET /supadmin/api/shops/{shop_id})
- 쇼핑몰별 크레딧 히스토리 조회
- 크레딧 조정 (수동 추가/차감)

**상세 패널 탭**:
```
1. 정보 (info)
   - 쇼핑몰명, 플랫폼, 상태, 가입일

2. 크레딧 히스토리
   - 트랜잭션 목록 (pagination)
   - 크레딧 조정 폼

3. 미디어 갤러리
   - 생성된 이미지/영상 조회
   - 타입별 필터 (image, video 등)
   - Lightbox 뷰어
```

#### 플랫폼 정산 (settlement.html)
- 플랫폼 정산 통계
- 정산 기간별 데이터
- 쇼핑몰별 정산 상세

---

### 1.3 홍보 배너 API 구조

#### 엔드포인트 (banner_api.py)
```
GET /api/v1/banners/active          → JSON 응답
GET /api/v1/banners/active/html     → HTML 파편 (HTMX 용)
```

#### HTML 렌더링 로직
**단일 배너**:
```html
<div class="relative rounded-xl overflow-hidden mx-auto" style="max-width:970px;aspect-ratio:970/90">
  <a href="{link}" target="_blank">
    <img src="{image_url}" alt="{alt}">
  </a>
  <button onclick="dismiss_js" class="absolute top-2 right-2">×</button>
</div>
```

**여러 배너** (Alpine.js 슬라이더):
- 5초 자동 전환
- 하단 도트 네비게이션
- x-show & x-transition 사용

#### Dismiss 로직
```javascript
// localStorage에 배너 ID 저장
localStorage.setItem('supamov_banner_dismissed_ids', 'id1,id2,id3')

// 새 세션 시 dismiss 초기화
if (new URLSearchParams(location.search).has('new_session')) {
    localStorage.removeItem('supamov_banner_dismissed_ids');
}
```

#### CORS 설정
- 허용 도메인: `.suparain.co.kr`, `.suparain.kr`, `.cafe24.com`
- Origin 검증 후 응답 헤더에 추가

---

## 2. VeriPack-Multi 프로젝트

### 2.1 사용자 대시보드 구조

#### 레이아웃 (dashboard/base.html)
- **Framework**: Jinja2 + Tailwind CSS + Alpine.js
- **디렉토리**: `/server/app/templates/dashboard/`

#### 네비게이션 구조
```
대시보드 (/dashboard)
├── 대시보드 (/)
├── 클립 관리 (/clips)
├── 기기 관리 (/devices)
└── 플랜 & 크레딧 (/credits)

설정 & 도움말:
├── 빌링 (/billing)
├── 설정 (/settings)
├── 사용 가이드 (/guide)
└── 자주 묻는 질문 (/faq)
```

#### 대시보드 페이지 구성 (index.html)
```
1. 퀵스타트 팝업 (첫 방문 시)
   - 4단계 온보딩
   - localStorage로 한 번만 표시

2. 홍보 배너 섹션
   - HTMX로 프록시 로드: GET /dashboard/promo-banner
   - supaMov 배너 HTML을 중계 제공

3. 앱 다운로드 안내
   - iOS/Android 앱 설치 가이드

4. 핵심 지표
   - 클립 수, 기기 수, 크레딧 잔액 등

5. 최근 활동
```

#### 배너 프록시 (dashboard.py - L831)
```python
@router.get("/promo-banner", response_class=HTMLResponse)
async def promo_banner():
    """supaMov 배너 HTML을 프록시로 전달"""
    async with httpx.AsyncClient(timeout=5.0) as client:
        resp = await client.get(
            "https://sm.suparain.kr/api/v1/banners/active/html",
            params={"app": "veripack"},
        )
        return HTMLResponse(resp.text if resp.status_code == 200 else "")
```

**목적**: 크로스 오리진 HTMX 요청 제한 우회

---

### 2.2 관리자 페이지 구조

#### 위치 & 인증
- **라우터**: `/admin/` 프리픽스
- **파일**: `/server/app/templates/admin/`

#### 어드민 네비게이션
```
대시보드 (/admin/)
├── 대시보드 (/)
├── 쇼핑몰 (/shops)
├── 클립 (/clips)
├── 청구 (/billing)
├── 통계 (/stats)
└── 로그 (/logs)
```

#### 쇼핑몰별 데이터 조회 (admin/shops.html)
- 쇼핑몰 목록 조회
- 개별 쇼핑몰 상세 정보 (shop_detail.html)
  - 기본 정보
  - 클립 히스토리
  - 기기 정보
  - 청구 내역

#### 클립 관리 (admin/clips.html)
- 전체 클립 목록
- 쇼핑몰별 필터
- 클립 상세 조회
- 상태별 통계

---

## 3. 비교 분석

### 대시보드 홍보 배너

| 항목 | supaMov24 | VeriPack-Multi |
|------|----------|----------------|
| 배너 소스 | 자체 API | supaMov 프록시 |
| 로드 방식 | HTMX (직접) | HTMX (프록시) |
| 슬라이더 | Alpine.js 지원 | 단순 HTML |
| Dismiss 저장소 | localStorage | localStorage |
| 다중 앱 지원 | ✓ (app 파라미터) | ✓ (veripack 타겟) |

### 네비게이션 메뉴

| supaMov24 | VeriPack-Multi |
|-----------|----------------|
| 10개 메뉴 항목 | 6개 메뉴 항목 |
| 플랫폼별 조건 분기 (cafe24/imweb/nhn/standalone) | 단일 플랫폼 (모바일 우선) |
| 템플릿 기능 포함 | 없음 |
| 룩북 & 비디오 | 클립 & 기기 |

### 어드민 기능

| 항목 | supaMov24 | VeriPack-Multi |
|------|----------|----------------|
| 배너 관리 | ✓ (전체 CRUD) | ✗ |
| 쇼핑몰 관리 | ✓ | ✓ |
| 크레딧 조정 | ✓ | 부분 |
| 미디어 갤러리 | ✓ | ✗ |
| 정산 관리 | ✓ | ✗ |
| 통계 & 로그 | 대시보드에만 | ✓ |

---

## 4. 사용 가이드/도움말 페이지

### supaMov24
- **/guide** (사용 가이드)
  - 기능별 상세 설명
  - 스크린샷 포함
  - HTML 형식 (guide.html)

- **/faq** (자주 묻는 질문)
  - Q&A 포맷
  - Accordion 레이아웃 (faq.html)

- **/inquiries** (문의하기)
  - 문의 폼 제출
  - 문의 히스토리 조회

### VeriPack-Multi
- **/dashboard/guide** (사용 가이드)
  - 4단계 온보딩 포함
  - QR 스티커, 앱 설치, 녹화, 관리 단계별 설명

- **/dashboard/faq** (자주 묻는 질문)
  - FAQ 페이지

---

## 5. 핵심 기술 스택

### Frontend
- Tailwind CSS (유틸리티 CSS)
- Alpine.js (경량 인터랙션)
- HTMX (부분 갱신)
- Iconify (아이콘)

### Backend (supaMov24)
- FastAPI + Jinja2
- SQLAlchemy ORM
- Pydantic (데이터 검증)

### Backend (VeriPack-Multi)
- FastAPI + Jinja2
- SQLAlchemy ORM
- 모바일-first 설계

---

## 6. 개발 및 유지보수 팁

### 홍보 배너 추가 방법
1. **supaMov24**:
   - 관리자 로그인 → 배너 관리 페이지
   - 이미지 업로드 → 제목, URL, 기간, 대상앱 설정
   - 저장하면 자동으로 클라이언트에 반영

2. **VeriPack-Multi**:
   - VeriPack에는 배너 관리 기능 없음
   - supaMov 배너를 프록시로 표시
   - supaMov에서 "veripack" 앱 타겟 배너 추가 시 자동 반영

### 네비게이션 추가
1. `base.html` 사이드바에 링크 추가
2. 대상 페이지에서 `active_page` 변수로 활성 상태 표시
3. 필요하면 조건부 분기 추가 (예: `{% if platform_type == 'cafe24' %}`)

### 새 페이지 추가
1. `/app/templates/` (또는 `/server/app/templates/dashboard/`)에 HTML 생성
2. 라우터에 엔드포인트 추가
3. 네비게이션 메뉴 업데이트
4. 가이드/FAQ 업데이트
