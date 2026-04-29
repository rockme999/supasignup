/**
 * 쿠폰팩 카드 렌더러 — BGWidget.prototype.renderCouponPackCard 정의
 *
 * buttons.ts WIDGET_JS IIFE 내부에 인라인 삽입됨.
 * 의존: BGWidget (IIFE 스코프)
 *
 * 렌더 방식: 서버측 렌더링 (buildCouponPackHtml)
 *   config.coupon_pack이 /api/widget/config에서 내려오면
 *   이탈 팝업 빌드 시점에 HTML 문자열로 조립되어 modal 안에 삽입됨.
 *   — IIFE 크기 비대화 없음, 디자인별 분기 코드는 서버 타임에 처리됨.
 *
 * 위젯 prefix 정책:
 *   모든 mask id: bg-cp-{design}{variant}  (예: bg-cp-1s, bg-cp-1a)
 *   모든 CSS 클래스: bg-cp- prefix
 *   style block id: bg-cp-style  (페이지 당 1회만 주입)
 *
 * funnel 이벤트:
 *   widget.coupon_pack_shown / widget.coupon_pack_clicked
 */

// ─── 서버측 HTML 빌드 (타입 및 함수) ─────────────────────────

export interface CouponPackRenderOpts {
  design: 'dark' | 'brand' | 'illust' | 'minimal';
  anim_mode: boolean;
  total_amount?: number;   // 기본 55000
  items_count?: number;    // 기본 5
  size?: 'lg' | 'md' | 'sm' | 'xs';  // 기본 'md' (0.85)
}

/**
 * 쿠폰팩 카드 HTML 문자열을 반환한다.
 * 이탈 팝업 모달에 삽입되거나 어드민 미리보기에서 사용된다.
 *
 * SVG mask, CSS keyframes, 인라인 스타일을 모두 포함한 self-contained HTML.
 * bg-cp- prefix로 외부 페이지 CSS와 충돌하지 않는다.
 */
/** size → scale 비율 매핑 */
const SIZE_SCALE: Record<string, number> = { lg: 1.0, md: 0.85, sm: 0.7, xs: 0.55 };

/** size → 카드 치수 (300×140 기준) */
function getSizeDimensions(size: string): { w: number; h: number; scale: number } {
  const scale = SIZE_SCALE[size] ?? 1.0;
  return { w: Math.round(300 * scale), h: Math.round(140 * scale), scale };
}

export function buildCouponPackHtml(opts: CouponPackRenderOpts): string {
  const design = opts.design ?? 'brand';
  const animMode = opts.anim_mode !== false;
  const totalAmount = opts.total_amount ?? 55000;
  const itemsCount = opts.items_count ?? 5;
  const size = opts.size ?? 'md';

  // 금액 포맷: minimal은 ₩55,000, 나머지는 "5만원 상당" 형식 (시안 텍스트 통일)
  const fmtAmountMoney = '₩' + totalAmount.toLocaleString('ko-KR');
  const fmtAmountWon = Math.floor(totalAmount / 10000) + '만원';

  // 각 디자인별로 mask id suffix를 고정 (정적: s, 반짝: a)
  const variant = animMode ? 'a' : 's';

  const { w, h } = getSizeDimensions(size);
  return buildCardHtml(design, variant, fmtAmountMoney, fmtAmountWon, itemsCount, w, h);
}

/** 디자인 번호 매핑 */
const DESIGN_NUM: Record<string, number> = { dark: 1, brand: 2, illust: 3, minimal: 4 };

/**
 * 디자인 × 변형별 카드 HTML
 *
 * 방안 A: SVG width/height를 직접 줄이고 viewBox는 300×140 유지.
 * SVG는 viewBox 비율을 유지하며 자동 스케일됨 → mask/gradient가 viewBox 좌표계 기준으로
 * 함께 스케일되어 깨짐 없음. CSS transform 사용 안 함.
 *
 * mask id에 size suffix(w) 포함 → 동일 페이지에 여러 size 카드가 동시 렌더되어도 충돌 없음.
 */
function buildCardHtml(
  design: 'dark' | 'brand' | 'illust' | 'minimal',
  variant: 's' | 'a',
  fmtAmountMoney: string,
  fmtAmountWon: string,
  itemsCount: number,
  w: number,
  h: number,
): string {
  // CSS 셀렉터 .bg-cp-card-{N}-anim 과 일치하도록 숫자 기반으로 생성
  const num = DESIGN_NUM[design];
  const animClass = variant === 'a' ? ` bg-cp-card-${num}-anim` : '';

  switch (design) {
    case 'dark':   return buildDarkCard(variant, animClass, fmtAmountWon, itemsCount, w, h);
    case 'brand':  return buildBrandCard(variant, animClass, fmtAmountWon, itemsCount, w, h);
    case 'illust': return buildIllustCard(variant, animClass, fmtAmountWon, itemsCount, w, h);
    case 'minimal':return buildMinimalCard(variant, animClass, fmtAmountMoney, itemsCount, w, h);
  }
}

// ────────────────────────────────────────────────────────────────
// #1 다크 — 검정 배경 + 금색 타이포
// ────────────────────────────────────────────────────────────────
function buildDarkCard(variant: string, animClass: string, fmtAmount: string, itemsCount: number, w: number, h: number): string {
  // mask id에 width suffix 추가 → 동일 페이지 다중 size 카드 간 id 충돌 방지
  const maskId = `bg-cp-1${variant}-${w}`;
  return `<div class="bg-cp-card bg-cp-card-1${animClass}" style="position:relative;width:${w}px;height:${h}px;flex-shrink:0">
  <svg class="bg-cp-svg-bg" width="${w}" height="${h}" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;display:block">
    <defs>
      <mask id="${maskId}">
        <rect width="300" height="140" fill="white"/>
        <circle cx="0" cy="70" r="13" fill="black"/>
        <circle cx="300" cy="70" r="13" fill="black"/>
      </mask>
    </defs>
    <rect width="300" height="140" rx="12" fill="#0f0f0f" mask="url(#${maskId})"/>
  </svg>
  <div class="bg-cp-inner bg-cp-inner-1" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">
    <div class="bg-cp-divider bg-cp-divider-1" style="position:absolute;inset:0;border-left:1.5px dashed rgba(255,255,255,0.13);border-right:1.5px dashed rgba(255,255,255,0.13);margin:0 11px;pointer-events:none;z-index:1"></div>
    <div class="bg-cp-amount" style="font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;position:relative;z-index:2;color:#f0d080">${fmtAmount} 상당</div>
    <div class="bg-cp-title" style="font-size:13px;font-weight:600;letter-spacing:0.2px;margin-bottom:4px;position:relative;z-index:2;color:#e5e7eb">신규 회원 웰컴 할인 쿠폰팩</div>
    <div class="bg-cp-desc" style="font-size:10px;font-weight:400;opacity:0.72;letter-spacing:0.1px;text-align:center;padding:0 20px;position:relative;z-index:2;color:#9ca3af">가입 즉시 ${itemsCount}장 자동 지급!</div>
  </div>
</div>`;
}

// ────────────────────────────────────────────────────────────────
// #2 번개가입 브랜드 — 핑크 그라디언트
// ────────────────────────────────────────────────────────────────
function buildBrandCard(variant: string, animClass: string, fmtAmount: string, itemsCount: number, w: number, h: number): string {
  const maskId = `bg-cp-2${variant}-${w}`;
  const gradId = `bg-cp-pg-${variant}-${w}`;

  // 정적 vs 반짝: gradStop 내 SMIL animate 유무
  const gradStops = variant === 'a'
    ? `<stop offset="0%" stop-color="#db2777">
        <animate attributeName="stop-color" values="#9d174d;#db2777;#ec4899;#db2777;#9d174d" dur="3s" repeatCount="indefinite"/>
      </stop>
      <stop offset="50%" stop-color="#ec4899">
        <animate attributeName="stop-color" values="#db2777;#ec4899;#f472b6;#ec4899;#db2777" dur="3s" repeatCount="indefinite"/>
      </stop>
      <stop offset="100%" stop-color="#f472b6">
        <animate attributeName="stop-color" values="#ec4899;#f472b6;#db2777;#9d174d;#ec4899" dur="3s" repeatCount="indefinite"/>
      </stop>`
    : `<stop offset="0%" stop-color="#db2777"/>
      <stop offset="50%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#f472b6"/>`;

  const starDots = variant === 'a'
    ? `<span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;pointer-events:none;z-index:5;top:13px;left:22px;animation-delay:0s">★</span>
       <span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;pointer-events:none;z-index:5;top:10px;left:88px;animation-delay:0.55s">✦</span>
       <span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;pointer-events:none;z-index:5;bottom:13px;right:68px;animation-delay:1.1s">★</span>
       <span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;pointer-events:none;z-index:5;bottom:11px;left:42px;animation-delay:1.65s">✦</span>`
    : '';

  return `<div class="bg-cp-card bg-cp-card-2${animClass}" style="position:relative;width:${w}px;height:${h}px;flex-shrink:0">
  <svg class="bg-cp-svg-bg" width="${w}" height="${h}" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;display:block">
    <defs>
      <linearGradient id="${gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        ${gradStops}
      </linearGradient>
      <mask id="${maskId}">
        <rect width="300" height="140" fill="white"/>
        <circle cx="0" cy="70" r="13" fill="black"/>
        <circle cx="300" cy="70" r="13" fill="black"/>
      </mask>
    </defs>
    <rect width="300" height="140" rx="12" fill="url(#${gradId})" mask="url(#${maskId})"/>
  </svg>
  <div class="bg-cp-inner" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">
    <div style="position:absolute;inset:0;border-left:1.5px dashed rgba(255,255,255,0.25);border-right:1.5px dashed rgba(255,255,255,0.25);margin:0 11px;pointer-events:none;z-index:1"></div>
    ${starDots}
    <div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:2;filter:drop-shadow(0 0 8px rgba(255,220,40,0.7)) drop-shadow(0 0 18px rgba(255,180,0,0.45))">
      <svg width="52" height="62" viewBox="0 0 52 62" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M30 2L6 34H22L18 60L46 26H30L34 2Z" fill="#FFE033" stroke="#FFB800" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
    </div>
    <div style="width:100%;padding-left:24px;padding-right:72px;position:relative;z-index:3">
      <div style="font-size:34px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;color:#fff">${fmtAmount} 상당</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:rgba(255,255,255,0.92)">신규 회원 웰컴 할인 쿠폰팩</div>
      <div style="font-size:10px;opacity:0.82;color:rgba(255,255,255,0.72)">번개가입, 번개지급 ${itemsCount}장</div>
    </div>
  </div>
</div>`;
}

// ────────────────────────────────────────────────────────────────
// #3 밝은 일러스트 — 흰 배경 + 민트/핑크 액센트
// ────────────────────────────────────────────────────────────────
function buildIllustCard(variant: string, animClass: string, fmtAmount: string, itemsCount: number, w: number, h: number): string {
  const maskId = `bg-cp-3${variant}-${w}`;
  // 반짝: 색띠 background-size/animation은 CSS keyframe에서 처리
  // (인라인 style에서는 animation 이름만 참조)
  return `<div class="bg-cp-card bg-cp-card-3${animClass}" style="position:relative;width:${w}px;height:${h}px;flex-shrink:0">
  <svg class="bg-cp-svg-bg" width="${w}" height="${h}" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;display:block">
    <defs>
      <mask id="${maskId}">
        <rect width="300" height="140" fill="white"/>
        <circle cx="0" cy="70" r="13" fill="black"/>
        <circle cx="300" cy="70" r="13" fill="black"/>
      </mask>
    </defs>
    <rect width="300" height="140" rx="12" fill="#ffffff" mask="url(#${maskId})"/>
    <path d="M 12 0 H 288 A 12 12 0 0 1 300 12 V 57 A 13 13 0 0 0 300 83 V 128 A 12 12 0 0 1 288 140 H 12 A 12 12 0 0 1 0 128 V 83 A 13 13 0 0 0 0 57 V 12 A 12 12 0 0 1 12 0 Z"
          fill="none" stroke="rgba(0,0,0,0.09)" stroke-width="1" stroke-linejoin="round"/>
  </svg>
  <div class="bg-cp-inner bg-cp-inner-3${variant === 'a' ? ' bg-cp-inner-3-anim' : ''}" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">
    <div style="position:absolute;inset:0;border-left:1.5px dashed rgba(0,0,0,0.09);border-right:1.5px dashed rgba(0,0,0,0.09);margin:0 11px;pointer-events:none;z-index:1"></div>
    <svg style="position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:1"
         width="42" height="46" viewBox="0 0 42 46" fill="none" aria-hidden="true">
      <rect x="3" y="17" width="36" height="25" rx="3" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.4"/>
      <rect x="1" y="13" width="40" height="7" rx="2" fill="#fbcfe8" stroke="#f9a8d4" stroke-width="1.4"/>
      <rect x="18" y="13" width="6" height="29" rx="1.5" fill="#f472b6" opacity="0.65"/>
      <rect x="1" y="16" width="40" height="5" rx="1.5" fill="#f472b6" opacity="0.45"/>
      <circle cx="21" cy="13" r="4" fill="#ec4899"/>
      <text x="8" y="31" font-size="7" fill="#f472b6" opacity="0.8">&#9829;</text>
      <text x="29" y="37" font-size="6" fill="#a78bfa" opacity="0.7">&#9829;</text>
    </svg>
    <svg style="position:absolute;left:9px;top:9px;pointer-events:none;z-index:1"
         width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="5" r="4" fill="#6ee7b7" opacity="0.55"/>
      <circle cx="17" cy="11" r="4" fill="#a78bfa" opacity="0.45"/>
      <circle cx="11" cy="17" r="4" fill="#fca5a5" opacity="0.45"/>
      <circle cx="5" cy="11" r="4" fill="#fcd34d" opacity="0.45"/>
      <circle cx="11" cy="11" r="3" fill="#fff"/>
    </svg>
    <div style="position:relative;z-index:2;text-align:center">
      <div style="font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;color:#059669">${fmtAmount} 상당</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#374151">신규 회원 웰컴 할인 쿠폰팩</div>
      <div style="font-size:10px;opacity:0.72;color:#6b7280">가입 즉시 ${itemsCount}장 사용 가능해요!</div>
    </div>
  </div>
</div>`;
}

// ────────────────────────────────────────────────────────────────
// #4 미니멀 — 회색 배경 + 검정 아웃라인 + 큰 타이포
// ────────────────────────────────────────────────────────────────
function buildMinimalCard(variant: string, animClass: string, fmtAmount: string, _itemsCount: number, w: number, h: number): string {
  const maskId = `bg-cp-4${variant}-${w}`;
  return `<div class="bg-cp-card bg-cp-card-4${animClass}" style="position:relative;width:${w}px;height:${h}px;flex-shrink:0">
  <svg class="bg-cp-svg-bg" width="${w}" height="${h}" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" overflow="visible" style="position:absolute;inset:0;display:block">
    <defs>
      <mask id="${maskId}">
        <rect width="300" height="140" fill="white"/>
        <circle cx="0" cy="70" r="13" fill="black"/>
        <circle cx="300" cy="70" r="13" fill="black"/>
      </mask>
    </defs>
    <rect width="300" height="140" rx="12" fill="#f8fafc" mask="url(#${maskId})"/>
    <path class="${variant === 'a' ? 'bg-cp-stroke-anim4' : ''}" d="M 12 0 H 288 A 12 12 0 0 1 300 12 V 57 A 13 13 0 0 0 300 83 V 128 A 12 12 0 0 1 288 140 H 12 A 12 12 0 0 1 0 128 V 83 A 13 13 0 0 0 0 57 V 12 A 12 12 0 0 1 12 0 Z"
          fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/>
  </svg>
  <div class="bg-cp-inner" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">
    <div style="position:absolute;inset:0;border-left:1.5px dashed rgba(0,0,0,0.15);border-right:1.5px dashed rgba(0,0,0,0.15);margin:0 11px;pointer-events:none;z-index:1"></div>
    <div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;position:relative;z-index:2;color:#0f172a">
      <span style="display:inline-block;border-bottom:2.5px solid #0f172a;padding-bottom:2px">${fmtAmount}</span>
    </div>
    <div style="font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;margin-top:8px;margin-bottom:4px;position:relative;z-index:2;color:#374151">WELCOME COUPON PACK</div>
    <div style="font-size:10px;opacity:0.72;color:#94a3b8;margin-top:5px;position:relative;z-index:2">신규 회원 가입 즉시 지급</div>
  </div>
</div>`;
}

// ─── CSS keyframes 문자열 ────────────────────────────────────────

/**
 * 쿠폰팩 공통 CSS keyframes + 공유 스타일.
 * 위젯 이탈 팝업이 처음 열릴 때 1회만 <style id="bg-cp-style">로 주입됨.
 */
export const COUPON_PACK_CSS = `
@keyframes bg-cp-sweep1{0%{transform:translateX(-180%) skewX(-22deg);opacity:0}8%{opacity:0.8}42%{opacity:0.8}52%{transform:translateX(180%) skewX(-22deg);opacity:0}100%{transform:translateX(180%) skewX(-22deg);opacity:0}}
@keyframes bg-cp-goldGlow{0%,100%{text-shadow:0 0 5px rgba(240,208,128,0.35)}50%{text-shadow:0 0 16px rgba(240,208,128,0.85),0 0 30px rgba(240,208,128,0.35)}}
@keyframes bg-cp-starPop{0%,75%,100%{opacity:0;transform:scale(0.4)}38%{opacity:1;transform:scale(1)}}
@keyframes bg-cp-cardPop3{0%,100%{transform:scale(1)}50%{transform:scale(1.014)}}
@keyframes bg-cp-stripScroll{0%{background-position:0% 50%}100%{background-position:200% 50%}}
@keyframes bg-cp-shadowPulse3{0%,100%{filter:drop-shadow(0 1px 2px rgba(15,23,42,0.04))}50%{filter:drop-shadow(0 6px 14px rgba(15,23,42,0.16))}}
@keyframes bg-cp-strokeShift4{0%,100%{stroke:#cbd5e1}50%{stroke:#1e293b}}
@keyframes bg-cp-shadowPulse4{0%,100%{filter:drop-shadow(0 1px 2px rgba(15,23,42,0.05))}50%{filter:drop-shadow(0 6px 16px rgba(15,23,42,0.20))}}
.bg-cp-card-1-anim .bg-cp-inner-1::after{content:'';position:absolute;inset:0;background:linear-gradient(105deg,transparent 28%,rgba(255,255,255,0.16) 50%,transparent 72%);animation:bg-cp-sweep1 2.2s ease-in-out infinite;pointer-events:none;z-index:4}
.bg-cp-card-1-anim .bg-cp-amount{animation:bg-cp-goldGlow 2s ease-in-out infinite}
.bg-cp-inner-3-anim{animation:bg-cp-cardPop3 2s ease-in-out infinite,bg-cp-shadowPulse3 2s ease-in-out infinite}
.bg-cp-card-4-anim .bg-cp-stroke-anim4{animation:bg-cp-strokeShift4 2s ease-in-out infinite}
.bg-cp-card-4-anim{animation:bg-cp-shadowPulse4 2s ease-in-out infinite}
`;

// ─── 위젯 IIFE 내 BGWidget.prototype.renderCouponPackCard 정의 ──

/**
 * 위젯 IIFE에 인라인 삽입할 JS 문자열을 반환한다.
 * live-counter.ts의 getLiveCounterJs() 패턴 참고.
 *
 * renderCouponPackCard(opts) → HTML 문자열 반환 + CSS 1회 주입
 * opts: { design, anim_mode, total_amount, items_count }
 *
 * 실제 카드 빌드는 서버에서 buildCouponPackHtml()로 이미 완성된 HTML을
 * config.coupon_pack._html 필드로 내려줄 수 있지만,
 * 현재 구현에서는 위젯이 config.coupon_pack 메타데이터를 받아 exitPopup 안에서
 * 카드 HTML을 직접 삽입하는 방식으로 통합됨.
 * (실제 HTML 조립은 서버 빌드 타임이 아닌 이탈 팝업 표시 시점)
 */
export function getCouponPackJs(): string {
  return [
    '  // ─── 쿠폰팩 카드 렌더러 ─────────────────────────────────',
    '  BGWidget.prototype.renderCouponPackCard = function(cp) {',
    '    // CSS keyframes 1회만 주입',
    '    if (!document.getElementById("bg-cp-style")) {',
    '      var cpSt = document.createElement("style");',
    '      cpSt.id = "bg-cp-style";',
    `      cpSt.textContent = ${JSON.stringify(COUPON_PACK_CSS)};`,
    '      document.head.appendChild(cpSt);',
    '    }',
    '    var design = cp.design || "brand";',
    '    var animMode = cp.anim_mode !== false;',
    '    var totalAmount = cp.total_amount || 55000;',
    '    var itemsCount = cp.items_count || 5;',
    '    // minimal: ₩55,000 / 나머지: 5만원 상당 (시안 텍스트 통일 2026-04-29)',
    '    var fmtAmountMoney = "\\u20a9" + totalAmount.toLocaleString();',
    '    var fmtAmountWon = Math.floor(totalAmount / 10000) + "\\ub9cc\\uc6d0";',
    '    var fmtAmount = (design === "minimal") ? fmtAmountMoney : fmtAmountWon;',
    '    var variant = animMode ? "a" : "s";',
    '',
    '    var wrap = document.createElement("div");',
    '    wrap.style.cssText = "display:flex;justify-content:center;margin:16px 0 8px";',
    '',
    '    // 디자인별 카드 HTML 조립',
    '    var cardHtml = "";',
    '    var maskId = "bg-cp-" + design.charAt(0).replace("d","1").replace("b","2").replace("i","3").replace("m","4") + variant;',
    '',
    '    if (design === "dark") {',
    '      maskId = "bg-cp-1" + variant;',
    '      var animClass = animMode ? " bg-cp-card-1-anim" : "";',
    `      cardHtml = '<div class="bg-cp-card bg-cp-card-1' + animClass + '" style="position:relative;width:300px;height:140px;flex-shrink:0">'`,
    `        + '<svg class="bg-cp-svg-bg" width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;display:block">'`,
    `        + '<defs><mask id="' + maskId + '"><rect width="300" height="140" fill="white"/><circle cx="0" cy="70" r="13" fill="black"/><circle cx="300" cy="70" r="13" fill="black"/></mask></defs>'`,
    `        + '<rect width="300" height="140" rx="12" fill="#0f0f0f" mask="url(#' + maskId + ')"/>'`,
    `        + '</svg>'`,
    `        + '<div class="bg-cp-inner bg-cp-inner-1" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">'`,
    `        + '<div style="position:absolute;inset:0;border-left:1.5px dashed rgba(255,255,255,0.13);border-right:1.5px dashed rgba(255,255,255,0.13);margin:0 11px;pointer-events:none;z-index:1"></div>'`,
    `        + '<div class="bg-cp-amount" style="font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;position:relative;z-index:2;color:#f0d080">' + fmtAmount + ' \\uc0c1\\ub2f9</div>'`,
    `        + '<div style="font-size:13px;font-weight:600;margin-bottom:4px;position:relative;z-index:2;color:#e5e7eb">\\uc2e0\\uaddc \\ud68c\\uc6d0 \\uc6f0\\ucf64 \\ud560\\uc778 \\ucfe0\\ud3f0\\ud329</div>'`,
    `        + '<div style="font-size:10px;opacity:0.72;text-align:center;padding:0 20px;position:relative;z-index:2;color:#9ca3af">\\uac00\\uc785 \\uc989\\uc2dc ' + itemsCount + '\\uc7a5 \\uc790\\ub3d9 \\uc9c0\\uae09!</div>'`,
    `        + '</div></div>';`,
    '',
    '    } else if (design === "brand") {',
    '      maskId = "bg-cp-2" + variant;',
    '      var gradId = "bg-cp-pg-" + variant;',
    '      var animClass2 = animMode ? " bg-cp-card-2-anim" : "";',
    '      var gradStops = animMode',
    `        ? '<stop offset="0%" stop-color="#db2777"><animate attributeName="stop-color" values="#9d174d;#db2777;#ec4899;#db2777;#9d174d" dur="3s" repeatCount="indefinite"/></stop>'`,
    `          + '<stop offset="50%" stop-color="#ec4899"><animate attributeName="stop-color" values="#db2777;#ec4899;#f472b6;#ec4899;#db2777" dur="3s" repeatCount="indefinite"/></stop>'`,
    `          + '<stop offset="100%" stop-color="#f472b6"><animate attributeName="stop-color" values="#ec4899;#f472b6;#db2777;#9d174d;#ec4899" dur="3s" repeatCount="indefinite"/></stop>'`,
    `        : '<stop offset="0%" stop-color="#db2777"/><stop offset="50%" stop-color="#ec4899"/><stop offset="100%" stop-color="#f472b6"/>';`,
    '      var starDots2 = animMode',
    `        ? '<span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;z-index:5;top:13px;left:22px">\\u2605</span>'`,
    `          + '<span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;animation-delay:0.55s;z-index:5;top:10px;left:88px">\\u2726</span>'`,
    `          + '<span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;animation-delay:1.1s;z-index:5;bottom:13px;right:68px">\\u2605</span>'`,
    `          + '<span style="position:absolute;font-size:9px;color:rgba(255,255,255,0.9);animation:bg-cp-starPop 2s ease-in-out infinite;animation-delay:1.65s;z-index:5;bottom:11px;left:42px">\\u2726</span>'`,
    `        : '';`,
    `      cardHtml = '<div class="bg-cp-card bg-cp-card-2' + animClass2 + '" style="position:relative;width:300px;height:140px;flex-shrink:0">'`,
    `        + '<svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;display:block">'`,
    `        + '<defs><linearGradient id="' + gradId + '" x1="0%" y1="0%" x2="100%" y2="100%">' + gradStops + '</linearGradient>'`,
    `        + '<mask id="' + maskId + '"><rect width="300" height="140" fill="white"/><circle cx="0" cy="70" r="13" fill="black"/><circle cx="300" cy="70" r="13" fill="black"/></mask></defs>'`,
    `        + '<rect width="300" height="140" rx="12" fill="url(#' + gradId + ')" mask="url(#' + maskId + ')"/></svg>'`,
    `        + '<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">'`,
    `        + '<div style="position:absolute;inset:0;border-left:1.5px dashed rgba(255,255,255,0.25);border-right:1.5px dashed rgba(255,255,255,0.25);margin:0 11px;pointer-events:none;z-index:1"></div>'`,
    `        + starDots2`,
    `        + '<div style="position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:2;filter:drop-shadow(0 0 8px rgba(255,220,40,0.7))">'`,
    `        + '<svg width="52" height="62" viewBox="0 0 52 62" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M30 2L6 34H22L18 60L46 26H30L34 2Z" fill="#FFE033" stroke="#FFB800" stroke-width="1.5" stroke-linejoin="round"/></svg></div>'`,
    `        + '<div style="width:100%;padding-left:24px;padding-right:72px;position:relative;z-index:3">'`,
    `        + '<div style="font-size:34px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;color:#fff">' + fmtAmount + ' \\uc0c1\\ub2f9</div>'`,
    `        + '<div style="font-size:13px;font-weight:600;margin-bottom:4px;color:rgba(255,255,255,0.92)">\\uc2e0\\uaddc \\ud68c\\uc6d0 \\uc6f0\\ucf64 \\ud560\\uc778 \\ucfe0\\ud3f0\\ud329</div>'`,
    `        + '<div style="font-size:10px;opacity:0.82;color:rgba(255,255,255,0.72)">\\ubc88\\uac1c\\uac00\\uc785, \\ubc88\\uac1c\\uc9c0\\uae09 ' + itemsCount + '\\uc7a5</div>'`,
    `        + '</div></div></div>';`,
    '',
    '    } else if (design === "illust") {',
    '      maskId = "bg-cp-3" + variant;',
    '      var animClass3 = animMode ? " bg-cp-card-3-anim" : "";',
    '      var innerAnim3 = animMode ? " bg-cp-inner-3-anim" : "";',
    `      cardHtml = '<div class="bg-cp-card bg-cp-card-3' + animClass3 + '" style="position:relative;width:300px;height:140px;flex-shrink:0">'`,
    `        + '<svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;display:block">'`,
    `        + '<defs><mask id="' + maskId + '"><rect width="300" height="140" fill="white"/><circle cx="0" cy="70" r="13" fill="black"/><circle cx="300" cy="70" r="13" fill="black"/></mask></defs>'`,
    `        + '<rect width="300" height="140" rx="12" fill="#ffffff" mask="url(#' + maskId + ')"/>'`,
    `        + '<path d="M 12 0 H 288 A 12 12 0 0 1 300 12 V 57 A 13 13 0 0 0 300 83 V 128 A 12 12 0 0 1 288 140 H 12 A 12 12 0 0 1 0 128 V 83 A 13 13 0 0 0 0 57 V 12 A 12 12 0 0 1 12 0 Z" fill="none" stroke="rgba(0,0,0,0.09)" stroke-width="1" stroke-linejoin="round"/></svg>'`,
    `        + '<div class="bg-cp-inner' + innerAnim3 + '" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">'`,
    `        + '<div style="position:absolute;inset:0;border-left:1.5px dashed rgba(0,0,0,0.09);border-right:1.5px dashed rgba(0,0,0,0.09);margin:0 11px;pointer-events:none;z-index:1"></div>'`,
    `        + '<svg style="position:absolute;right:13px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:1" width="42" height="46" viewBox="0 0 42 46" fill="none">'`,
    `        + '<rect x="3" y="17" width="36" height="25" rx="3" fill="#fce7f3" stroke="#f9a8d4" stroke-width="1.4"/>'`,
    `        + '<rect x="1" y="13" width="40" height="7" rx="2" fill="#fbcfe8" stroke="#f9a8d4" stroke-width="1.4"/>'`,
    `        + '<rect x="18" y="13" width="6" height="29" rx="1.5" fill="#f472b6" opacity="0.65"/>'`,
    `        + '<rect x="1" y="16" width="40" height="5" rx="1.5" fill="#f472b6" opacity="0.45"/>'`,
    `        + '<circle cx="21" cy="13" r="4" fill="#ec4899"/></svg>'`,
    `        + '<svg style="position:absolute;left:9px;top:9px;pointer-events:none;z-index:1" width="22" height="22" viewBox="0 0 22 22" fill="none">'`,
    `        + '<circle cx="11" cy="5" r="4" fill="#6ee7b7" opacity="0.55"/>'`,
    `        + '<circle cx="17" cy="11" r="4" fill="#a78bfa" opacity="0.45"/>'`,
    `        + '<circle cx="11" cy="17" r="4" fill="#fca5a5" opacity="0.45"/>'`,
    `        + '<circle cx="5" cy="11" r="4" fill="#fcd34d" opacity="0.45"/>'`,
    `        + '<circle cx="11" cy="11" r="3" fill="#fff"/></svg>'`,
    `        + '<div style="position:relative;z-index:2;text-align:center">'`,
    `        + '<div style="font-size:32px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;color:#059669">' + fmtAmount + ' \\uc0c1\\ub2f9</div>'`,
    `        + '<div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#374151">\\uc2e0\\uaddc \\ud68c\\uc6d0 \\uc6f0\\ucf64 \\ud560\\uc778 \\ucfe0\\ud3f0\\ud329</div>'`,
    `        + '<div style="font-size:10px;opacity:0.72;color:#6b7280">\\uac00\\uc785 \\uc989\\uc2dc ' + itemsCount + '\\uc7a5 \\uc0ac\\uc6a9 \\uac00\\ub2a5\\ud574\\uc694!</div>'`,
    `        + '</div></div></div>';`,
    '',
    '    } else {',
    '      // minimal',
    '      maskId = "bg-cp-4" + variant;',
    '      var animClass4 = animMode ? " bg-cp-card-4-anim" : "";',
    '      var strokeClass4 = animMode ? " bg-cp-stroke-anim4" : "";',
    `      cardHtml = '<div class="bg-cp-card bg-cp-card-4' + animClass4 + '" style="position:relative;width:300px;height:140px;flex-shrink:0">'`,
    `        + '<svg width="300" height="140" viewBox="0 0 300 140" xmlns="http://www.w3.org/2000/svg" overflow="visible" style="position:absolute;inset:0;width:100%;height:100%;display:block">'`,
    `        + '<defs><mask id="' + maskId + '"><rect width="300" height="140" fill="white"/><circle cx="0" cy="70" r="13" fill="black"/><circle cx="300" cy="70" r="13" fill="black"/></mask></defs>'`,
    `        + '<rect width="300" height="140" rx="12" fill="#f8fafc" mask="url(#' + maskId + ')"/>'`,
    `        + '<path class="' + strokeClass4 + '" d="M 12 0 H 288 A 12 12 0 0 1 300 12 V 57 A 13 13 0 0 0 300 83 V 128 A 12 12 0 0 1 288 140 H 12 A 12 12 0 0 1 0 128 V 83 A 13 13 0 0 0 0 57 V 12 A 12 12 0 0 1 12 0 Z" fill="none" stroke="#cbd5e1" stroke-width="1.5" stroke-linejoin="round"/></svg>'`,
    `        + '<div class="bg-cp-inner" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;border-radius:12px">'`,
    `        + '<div style="position:absolute;inset:0;border-left:1.5px dashed rgba(0,0,0,0.15);border-right:1.5px dashed rgba(0,0,0,0.15);margin:0 11px;pointer-events:none;z-index:1"></div>'`,
    `        + '<div style="font-size:36px;font-weight:800;letter-spacing:-0.5px;line-height:1;margin-bottom:6px;position:relative;z-index:2;color:#0f172a">'`,
    `        + '<span style="display:inline-block;border-bottom:2.5px solid #0f172a;padding-bottom:2px">' + fmtAmount + '</span></div>'`,
    `        + '<div style="font-size:11px;font-weight:600;letter-spacing:1.4px;text-transform:uppercase;margin-top:8px;margin-bottom:4px;position:relative;z-index:2;color:#374151">WELCOME COUPON PACK</div>'`,
    `        + '<div style="font-size:10px;opacity:0.72;color:#94a3b8;margin-top:5px;position:relative;z-index:2">\\uc2e0\\uaddc \\ud68c\\uc6d0 \\uac00\\uc785 \\uc989\\uc2dc \\uc9c0\\uae09</div>'`,
    `        + '</div></div>';`,
    '    }',
    '',
    '    wrap.innerHTML = cardHtml;',
    '    return wrap;',
    '  };',
  ].join('\n');
}

// ─── 단일 쿠폰 카드 렌더러 (coupon_mode='single') ────────────────

/**
 * 단일 쿠폰 그래픽 카드를 렌더링하는 위젯 IIFE 코드를 반환한다.
 *
 * BGWidget.prototype.renderSingleCouponCard(couponType, couponDef) → HTMLElement
 *   couponType: 'shipping' | 'amount' | 'rate'
 *   couponDef: 쿠폰 설정 객체 (discount_amount, discount_rate 등)
 *
 * Free 운영자도 사용 가능 (Free 플랜 단일 쿠폰 1장 발급 흐름과 일치).
 */
export function getSingleCouponCardJs(): string {
  return [
    '  BGWidget.prototype.renderSingleCouponCard = function(couponType, couponDef) {',
    '    var wrap = document.createElement("div");',
    '    wrap.style.cssText = "display:flex;justify-content:center;margin:16px 0 8px";',
    '',
    '    var couponLabel = "";',
    '    var accentColor = "#2563eb";',
    '    var bgColor = "#eff6ff";',
    '    var borderColor = "#bfdbfe";',
    '    var icon = "\\uD83C\\uDF81";', // 🎁
    '',
    '    if (couponType === "shipping") {',
    '      couponLabel = "\\ubb34\\ub8cc\\ubc30\\uc1a1 \\ucfe0\\ud3f0";', // 무료배송 쿠폰
    '      accentColor = "#059669";',
    '      bgColor = "#ecfdf5";',
    '      borderColor = "#a7f3d0";',
    '      icon = "\\uD83D\\uDE9A";', // 🚚
    '    } else if (couponType === "amount") {',
    '      var amt = couponDef && couponDef.discount_amount ? couponDef.discount_amount.toLocaleString() + "\\uc6d0" : "";', // 원
    '      couponLabel = amt ? amt + " \\ud560\\uc778 \\ucfe0\\ud3f0" : "\\ud560\\uc778 \\ucfe0\\ud3f0";', // 할인 쿠폰
    '      accentColor = "#ea580c";',
    '      bgColor = "#fff7ed";',
    '      borderColor = "#fed7aa";',
    '      icon = "\\uD83D\\uDCB0";', // 💰
    '    } else if (couponType === "rate") {',
    '      var rate = couponDef && couponDef.discount_rate ? couponDef.discount_rate + "%" : "";',
    '      couponLabel = rate ? rate + " \\ud560\\uc778 \\ucfe0\\ud3f0" : "\\ud560\\uc778 \\ucfe0\\ud3f0";',
    '      accentColor = "#7c3aed";',
    '      bgColor = "#f5f3ff";',
    '      borderColor = "#ddd6fe";',
    '      icon = "\\uD83C\\uDFF7";', // 🏷
    '    }',
    '',
    '    if (!couponLabel) { return null; }',
    '',
    '    wrap.innerHTML = \'<div style="position:relative;width:300px;height:100px;flex-shrink:0;background:\' + bgColor + \';border:1.5px solid \' + borderColor + \';border-radius:12px;display:flex;align-items:center;gap:16px;padding:0 20px;box-sizing:border-box;overflow:hidden"\'',
    '      + \'><div style="position:absolute;left:0;top:0;width:6px;height:100%;background:\' + accentColor + \';border-radius:12px 0 0 12px"></div>\'',
    '      + \'<div style="font-size:28px;flex-shrink:0">\' + icon + \'</div>\'',
    '      + \'<div><div style="font-size:15px;font-weight:700;color:\' + accentColor + \';margin-bottom:4px">\' + couponLabel + \'</div>\'',
    '      + \'<div style="font-size:11px;color:#6b7280">가입 즉시 자동 지급</div></div>\'',
    '      + \'<div style="position:absolute;right:0;top:0;bottom:0;width:3px;border-right:1.5px dashed \' + borderColor + \'"></div>\'',
    '      + \'</div>\';',
    '',
    '    return wrap;',
    '  };',
  ].join('\n');
}
