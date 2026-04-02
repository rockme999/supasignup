# 홍보 배너 구현 - 소스 코드

## 1. supaMov24 - 대시보드 홍보 배너 (dashboard.html)

### 위치
`/Users/happyyuna/MyWorks/Development/projects/supaMov24/app/templates/dashboard.html` (Line 34-40)

### 구현 코드

```html
<!-- 홍보 배너 (닫기 시 배너 ID 기억 → 새 배너 등록되면 다시 표시) -->
<div id="promo-banner"
     hx-get="/api/v1/banners/active/html?app=supamov"
     hx-trigger="load"
     hx-target="this"
     hx-swap="innerHTML">
</div>
```

**특징**:
- HTMX로 페이지 로드 시 자동 요청
- `id="promo-banner"` 고정 (dismiss 로직에서 참조)
- 응답은 HTML 파편이므로 `innerHTML` 삽입

---

## 2. supaMov24 - 배너 API (banner_api.py)

### 위치
`/Users/happyyuna/MyWorks/Development/projects/supaMov24/app/routers/banner_api.py`

### 전체 코드

```python
"""공개 배너 API — 크로스앱 소비용 (인증 불필요)."""

import json
from html import escape

from fastapi import APIRouter, Query, Request
from fastapi.responses import HTMLResponse, Response

from app.config import settings
from app.core.database import get_session
from app.repositories.banner_repo import BannerRepo

router = APIRouter(prefix="/api/v1/banners", tags=["banners"])

_ALLOWED_ORIGINS = (".suparain.co.kr", ".suparain.kr", ".cafe24.com")


def _cors_headers(request: Request | None = None) -> dict:
    origin = (request.headers.get("origin") or "") if request else ""
    # origin이 허용 도메인이면 그대로, 아니면 헤더 미반환
    if origin:
        from urllib.parse import urlparse
        host = urlparse(origin).hostname or ""
        for suffix in _ALLOWED_ORIGINS:
            if host == suffix.lstrip(".") or host.endswith(suffix):
                return {"Access-Control-Allow-Origin": origin}
    return {}


def _abs_url(url: str) -> str:
    """상대 경로를 절대 URL로 변환."""
    if url and url.startswith("/"):
        return settings.API_BASE_URL + url
    return url


@router.get("/active")
async def active_banners_json(
    request: Request,
    app: str = "supamov",
    limit: int = Query(default=5, le=20),
):
    """활성 배너 JSON (크로스앱 소비용)."""
    async with get_session() as session:
        repo = BannerRepo(session)
        banners = await repo.get_active_banners(target_app=app, limit=limit)

    return Response(
        content=json.dumps({
            "banners": [
                {
                    "id": b.id,
                    "title": b.title,
                    "image_url": _abs_url(b.image_url),
                    "link_url": b.link_url,
                    "alt_text": b.alt_text or "",
                }
                for b in banners
            ]
        }, ensure_ascii=False),
        media_type="application/json",
        headers=_cors_headers(request),
    )


@router.get("/active/html", response_class=HTMLResponse)
async def active_banners_html(
    request: Request,
    app: str = "supamov",
    limit: int = Query(default=5, le=20),
):
    """활성 배너 HTML 파편 (HTMX 삽입용)."""
    async with get_session() as session:
        repo = BannerRepo(session)
        banners = await repo.get_active_banners(target_app=app, limit=limit)

    cors = _cors_headers(request)

    if not banners:
        return HTMLResponse("", headers=cors)

    # 배너 ID 목록 (닫기 시 이 ID들을 localStorage에 저장)
    banner_ids = escape(",".join(str(b.id) for b in banners))
    dismiss_js = (
        f"this.closest('[id=promo-banner]')?.remove();"
        f"localStorage.setItem('supamov_banner_dismissed_ids','{banner_ids}')"
    )

    # 단일 배너
    if len(banners) == 1:
        b = banners[0]
        link = escape(b.link_url)
        img = escape(_abs_url(b.image_url))
        alt = escape(b.alt_text or b.title)
        html = f"""<div class="relative rounded-xl overflow-hidden mx-auto" style="max-width:970px;aspect-ratio:970/90"
     x-data x-init="if(localStorage.getItem('supamov_banner_dismissed_ids')==='{banner_ids}') $el.remove()">
    <a href="{link}" target="_blank" class="block w-full h-full">
        <img src="{img}" alt="{alt}" class="w-full h-full object-contain">
    </a>
    <button onclick="{dismiss_js}"
            class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center text-xs hover:bg-black/60">&times;</button>
</div>"""
        return HTMLResponse(html, headers=cors)

    # 여러 배너: Alpine.js 슬라이더
    slides_html = ""
    for i, b in enumerate(banners):
        link = escape(b.link_url)
        img = escape(_abs_url(b.image_url))
        alt = escape(b.alt_text or b.title)
        slides_html += f"""
        <a x-show="current === {i}" href="{link}" target="_blank"
           x-transition:enter="transition ease-out duration-300"
           x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100"
           x-transition:leave="transition ease-in duration-200"
           x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0"
           class="absolute inset-0 block">
            <img src="{img}" alt="{alt}" class="w-full h-full object-contain">
        </a>"""

    dots_html = "".join(
        f'<button @click="current={i}" class="w-2 h-2 rounded-full transition-colors" :class="current==={i} ? \'bg-white\' : \'bg-white/40\'"></button>'
        for i in range(len(banners))
    )

    html = f"""<div class="relative rounded-xl overflow-hidden mx-auto" style="max-width:970px;aspect-ratio:970/90"
     x-data="{{ current: 0, total: {len(banners)} }}"
     x-init="if(localStorage.getItem('supamov_banner_dismissed_ids')==='{banner_ids}') {{ $el.remove(); return }}; setInterval(() => {{ current = (current + 1) % total }}, 5000)">
    {slides_html}
    <div class="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {dots_html}
    </div>
    <button onclick="{dismiss_js}"
            class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/40 text-white flex items-center justify-center text-xs hover:bg-black/60">&times;</button>
</div>"""
    return HTMLResponse(html, headers=cors)
```

**핵심 로직**:
1. `target_app` 파라미터로 앱별 필터링
2. 배너 없으면 빈 HTML 반환
3. 단일 배너: 간단한 레이아웃
4. 여러 배너: Alpine.js 슬라이더 (5초 자동전환)
5. XSS 방지를 위해 `escape()` 사용
6. CORS 헤더 동적 추가

---

## 3. supaMov24 - base.html 세션 초기화 로직 (Line 477-482)

```html
<script>
// 새 세션(로그인) 시 배너 dismiss 초기화
if (new URLSearchParams(location.search).has('new_session')) {
    localStorage.removeItem('supamov_banner_dismissed_ids');
    history.replaceState(null, '', location.pathname);
}
</script>
```

**목적**: 새 배너 등록 시 기존 사용자도 볼 수 있도록 초기화

---

## 4. VeriPack-Multi - 대시보드 배너 프록시 (dashboard.py L830-842)

### 위치
`/Users/happyyuna/MyWorks/Development/projects/VeriPack-Multi/server/app/web/dashboard.py`

### 구현 코드

```python
# ---------- Promo Banner (proxy) ----------

@router.get("/promo-banner", response_class=HTMLResponse)
async def promo_banner():
    """supaMov 배너 HTML을 프록시로 전달 (HTMX 크로스오리진 제한 우회)."""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://sm.suparain.kr/api/v1/banners/active/html",
                params={"app": "veripack"},
            )
            return HTMLResponse(resp.text if resp.status_code == 200 else "")
    except Exception:
        return HTMLResponse("")
```

**특징**:
- httpx 비동기 HTTP 클라이언트 사용
- supaMov API 호출 후 응답 그대로 전달
- 예외 발생 시 빈 HTML 반환 (배너 없음)
- 타임아웃: 5초

---

## 5. VeriPack-Multi - 대시보드 배너 표시 (index.html L82-88)

### 위치
`/Users/happyyuna/MyWorks/Development/projects/VeriPack-Multi/server/app/templates/dashboard/index.html`

### 구현 코드

```html
<div class="space-y-6">
  <!-- supaMov 홍보 배너 (dismiss 로직은 API 응답 HTML에 포함) -->
  <div id="promo-banner"
       hx-get="/dashboard/promo-banner"
       hx-trigger="load"
       hx-target="this"
       hx-swap="innerHTML">
  </div>
```

**특징**:
- supaMov와 동일한 구조
- 자체 프록시 엔드포인트 사용
- `id="promo-banner"` 동일 (dismissal 로직 호환)

---

## 6. 어드민 배너 관리 UI (admin/banners.html)

### Alpine.js 데이터 구조

```javascript
x-data="{
    banners: [],
    total: 0,
    loading: true,
    showModal: false,
    editing: null,
    form: { 
        title: '', 
        image_url: '', 
        link_url: '', 
        alt_text: '', 
        is_active: 1, 
        display_order: 0, 
        target_app: 'all', 
        starts_at: '', 
        ends_at: '' 
    },
    uploading: false,
    saving: false,
    
    // 로드
    async init() { await this.loadBanners(); },
    async loadBanners() { ... },
    
    // 생성/수정
    openCreate() { ... },
    openEdit(b) { ... },
    async uploadImage(event) { ... },
    async save() { ... },
    
    // 활성화/삭제
    async toggleActive(b) { ... },
    async deleteBanner(id) { ... },
    
    // 유틸리티
    appLabel(app) { ... },
    formatDt(iso) { ... }
}"
```

### API 엔드포인트

```javascript
// 목록 조회
GET /supadmin/api/banners

// 이미지 업로드
POST /supadmin/api/banners/upload
  Content-Type: multipart/form-data
  Body: { file: File }

// 배너 추가
POST /supadmin/api/banners
  Content-Type: application/json
  Body: { title, image_url, link_url, alt_text, is_active, display_order, target_app, starts_at, ends_at }

// 배너 수정
PUT /supadmin/api/banners/{id}
  Content-Type: application/json

// 배너 삭제
DELETE /supadmin/api/banners/{id}
```

---

## 7. 설정 및 환경변수

### settings.py
```python
API_BASE_URL = "https://sm.suparain.kr"  # 절대 URL 생성용
```

### 배너 파일 경로
```python
BANNER_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "static" / "img" / "banners"
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
```

---

## 8. 데이터베이스 모델 (BannerModel)

```python
class Banner(Base):
    __tablename__ = "banners"
    
    id = Column(Integer, primary_key=True)
    title = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=False)
    link_url = Column(String(512), nullable=False)
    alt_text = Column(String(255), nullable=True)
    is_active = Column(Integer, default=1)  # 0=비활성, 1=활성
    display_order = Column(Integer, default=0)
    target_app = Column(String(50), default="all")  # all, supamov, veripack, supa24
    starts_at = Column(DateTime, nullable=True)
    ends_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

---

## 9. 구현 팁 & 문제 해결

### 배너 추가 체크리스트
1. 이미지 업로드 (PNG/JPG/GIF/WebP)
2. 클릭 URL 설정
3. 대상 앱 선택 (all/supamov/veripack/supa24)
4. 표시 기간 설정 (선택)
5. 활성화 토글
6. 저장

### XSS 방지
- Python: `html.escape()` 사용
- 템플릿: Jinja2 기본 자동 이스케이프

### CORS 문제
- 크로스 오리진 요청 시 Origin 헤더 검증
- 허용 도메인: `.suparain.co.kr`, `.suparain.kr`, `.cafe24.com`

### localStorage 저장소 용량
- 배너 ID 목록은 쉼표 구분 (예: "1,2,3")
- 일반적으로 3KB 미만으로 충분

---

## 10. 통합 예시

### supaMov24에서 veripack 앱 대상 배너 추가
1. 어드민 로그인
2. 배너 관리 → "배너 추가"
3. 이미지 업로드
4. `target_app` = "veripack" 선택
5. 저장

### VeriPack-Multi 대시보드에서 자동 표시
1. 페이지 로드 → `GET /dashboard/promo-banner`
2. 프록시가 supaMov API 호출
3. `app=veripack` 필터로 배너 조회
4. HTML 응답 → Alpine.js 슬라이더로 렌더링
5. 사용자가 닫으면 localStorage 저장

