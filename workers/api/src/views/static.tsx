/**
 * Static pages: LandingPage, PrivacyPage, TermsPage (standalone HTML).
 */
import type { FC } from 'hono/jsx';

export const LandingPage: FC = () => (
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>번개가입 - 소셜 로그인 1-클릭 쇼핑몰 회원가입</title>
      <meta name="description" content="쇼핑몰 고객이 소셜 계정으로 복잡한 회원가입 폼 없이 1-클릭으로 가입하는 서비스. 카페24 등 쇼핑몰 플랫폼에 위젯 설치만으로 바로 사용하세요." />
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif; background: #fff; color: #1e293b; line-height: 1.6; }
        a { text-decoration: none; color: inherit; }

        /* Header */
        .lp-header { position: sticky; top: 0; z-index: 100; background: rgba(255,255,255,0.95); backdrop-filter: blur(8px); border-bottom: 1px solid #e5e7eb; }
        .lp-header-inner { max-width: 1100px; margin: 0 auto; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 60px; }
        .lp-logo { font-size: 20px; font-weight: 800; color: #2563eb; letter-spacing: -0.5px; }
        .lp-header-nav { display: flex; align-items: center; gap: 16px; }
        .lp-header-nav a { font-size: 14px; color: #64748b; }
        .lp-header-nav a:hover { color: #2563eb; }
        .btn-header { background: #2563eb; color: #fff !important; padding: 8px 18px; border-radius: 8px; font-size: 14px; font-weight: 600; transition: background 0.15s; }
        .btn-header:hover { background: #1d4ed8 !important; }

        /* Hero */
        .lp-hero { background: linear-gradient(135deg, #eff6ff 0%, #f8fafc 60%, #f0fdf4 100%); padding: 100px 24px 80px; text-align: center; }
        .lp-hero-badge { display: inline-block; background: #dbeafe; color: #2563eb; font-size: 13px; font-weight: 600; padding: 4px 14px; border-radius: 100px; margin-bottom: 24px; }
        .lp-hero h1 { font-size: 52px; font-weight: 900; letter-spacing: -1.5px; color: #0f172a; margin-bottom: 20px; line-height: 1.15; }
        .lp-hero h1 span { color: #2563eb; }
        .lp-hero p { font-size: 20px; color: #475569; max-width: 560px; margin: 0 auto 40px; line-height: 1.65; }
        .lp-hero-cta { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
        .btn-primary { background: #2563eb; color: #fff; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; transition: background 0.15s, transform 0.1s; display: inline-block; }
        .btn-primary:hover { background: #1d4ed8; transform: translateY(-1px); }
        .btn-secondary { background: #fff; color: #2563eb; border: 2px solid #2563eb; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 700; transition: background 0.15s; display: inline-block; }
        .btn-secondary:hover { background: #eff6ff; }

        /* Section common */
        .lp-section { padding: 80px 24px; }
        .lp-section-inner { max-width: 1100px; margin: 0 auto; }
        .lp-section-label { font-size: 13px; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .lp-section-title { font-size: 36px; font-weight: 800; color: #0f172a; margin-bottom: 16px; letter-spacing: -0.8px; line-height: 1.25; }
        .lp-section-desc { font-size: 17px; color: #64748b; max-width: 600px; line-height: 1.7; }
        .section-bg-gray { background: #f8fafc; }

        /* About */
        .lp-about-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; margin-top: 48px; }
        .lp-about-text p { font-size: 16px; color: #475569; line-height: 1.8; margin-bottom: 16px; }
        .lp-about-text p:last-child { margin-bottom: 0; }
        .lp-about-visual { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 32px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
        .lp-about-step { display: flex; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
        .lp-about-step:last-child { margin-bottom: 0; }
        .lp-step-num { width: 32px; height: 32px; min-width: 32px; background: #2563eb; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; }
        .lp-step-content strong { display: block; font-size: 15px; color: #1e293b; margin-bottom: 4px; }
        .lp-step-content span { font-size: 14px; color: #64748b; }

        /* Providers */
        .lp-providers-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 36px; }
        .lp-provider-badge { padding: 8px 20px; border-radius: 100px; font-size: 14px; font-weight: 600; border: 1.5px solid #e5e7eb; background: #fff; color: #334155; }

        /* Features */
        .lp-features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 48px; }
        .lp-feature-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 16px; padding: 28px; transition: box-shadow 0.2s, transform 0.2s; }
        .lp-feature-card:hover { box-shadow: 0 8px 32px rgba(37,99,235,0.1); transform: translateY(-2px); }
        .lp-feature-icon { width: 44px; height: 44px; background: #eff6ff; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .lp-feature-icon svg { width: 22px; height: 22px; stroke: #2563eb; fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
        .lp-feature-card h3 { font-size: 17px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
        .lp-feature-card p { font-size: 14px; color: #64748b; line-height: 1.7; }

        /* Pricing */
        .lp-pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 48px; }
        .lp-plan-card { background: #fff; border: 1.5px solid #e5e7eb; border-radius: 16px; padding: 32px 28px; position: relative; transition: box-shadow 0.2s; }
        .lp-plan-card:hover { box-shadow: 0 8px 32px rgba(0,0,0,0.08); }
        .lp-plan-card.featured { border-color: #2563eb; box-shadow: 0 4px 24px rgba(37,99,235,0.15); }
        .lp-plan-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #2563eb; color: #fff; font-size: 12px; font-weight: 700; padding: 3px 14px; border-radius: 100px; white-space: nowrap; }
        .lp-plan-name { font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 8px; }
        .lp-plan-price { font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: -1px; margin-bottom: 4px; }
        .lp-plan-price span { font-size: 16px; font-weight: 500; color: #64748b; }
        .lp-plan-limit { font-size: 13px; color: #94a3b8; margin-bottom: 24px; }
        .lp-plan-divider { border: none; border-top: 1px solid #f1f5f9; margin-bottom: 20px; }
        .lp-plan-features { list-style: none; }
        .lp-plan-features li { font-size: 14px; color: #475569; padding: 6px 0; display: flex; align-items: center; gap: 8px; }
        .lp-plan-features li::before { content: ''; display: inline-block; width: 16px; height: 16px; min-width: 16px; background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%232563eb' d='M13.5 2.5L6 10l-3.5-3.5L1 8l5 5 9-9z'/%3E%3C/svg%3E") center/contain no-repeat; }

        /* Footer */
        .lp-footer { background: #f8fafc; border-top: 1px solid #e5e7eb; padding: 40px 24px; }
        .lp-footer-inner { max-width: 1100px; margin: 0 auto; }
        .lp-footer-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 32px; flex-wrap: wrap; }
        .lp-footer-brand { font-size: 20px; font-weight: 800; color: #2563eb; margin-bottom: 8px; }
        .lp-footer-tagline { font-size: 13px; color: #94a3b8; }
        .lp-footer-links { display: flex; gap: 20px; }
        .lp-footer-links a { font-size: 14px; color: #64748b; }
        .lp-footer-links a:hover { color: #2563eb; }
        .lp-footer-divider { border: none; border-top: 1px solid #e5e7eb; margin-bottom: 20px; }
        .lp-footer-biz { font-size: 13px; color: #94a3b8; line-height: 1.9; }
        .lp-footer-biz strong { color: #64748b; }

        /* Responsive */
        @media (max-width: 768px) {
          .lp-hero h1 { font-size: 36px; }
          .lp-hero p { font-size: 17px; }
          .lp-section-title { font-size: 28px; }
          .lp-about-grid { grid-template-columns: 1fr; }
          .lp-features-grid { grid-template-columns: 1fr; }
          .lp-pricing-grid { grid-template-columns: 1fr; }
          .lp-header-nav .nav-hide { display: none; }
          .lp-footer-top { flex-direction: column; }
        }
        @media (max-width: 480px) {
          .lp-hero { padding: 72px 20px 60px; }
          .lp-hero h1 { font-size: 30px; }
          .lp-section { padding: 60px 20px; }
        }
      `}</style>
    </head>
    <body>

      <header class="lp-header">
        <div class="lp-header-inner">
          <div class="lp-logo">번개가입</div>
          <nav class="lp-header-nav">
            <a href="#features" class="nav-hide">기능</a>
            <a href="#pricing" class="nav-hide">요금제</a>
          </nav>
        </div>
      </header>

      <section class="lp-hero">
        <div class="lp-hero-badge">카페24 쇼핑몰 소셜 로그인 솔루션</div>
        <h1>소셜 로그인 1-클릭으로<br /><span>쇼핑몰 회원가입 완료</span></h1>
        <p>복잡한 회원가입 폼은 그만. 쇼핑몰 고객이 소셜 계정 하나로 바로 가입하고, 운영자는 위젯 설치만으로 바로 시작합니다.</p>
        <div class="lp-hero-cta">
          <a href="#about" class="btn-primary">서비스 소개</a>
        </div>
      </section>

      <section class="lp-section" id="about">
        <div class="lp-section-inner">
          <div class="lp-section-label">서비스 소개</div>
          <h2 class="lp-section-title">번개가입이란?</h2>
          <p class="lp-section-desc">쇼핑몰 고객의 이탈을 막는 가장 빠른 방법. 소셜 계정으로 단 한 번의 클릭으로 회원가입을 완료하는 SaaS 솔루션입니다.</p>
          <div class="lp-about-grid">
            <div class="lp-about-text">
              <p>온라인 쇼핑몰에서 회원가입 과정의 복잡함은 고객 이탈의 주요 원인입니다. 번개가입은 Google, Kakao, Naver, Apple 등 고객이 이미 사용 중인 소셜 계정으로 별도의 폼 입력 없이 즉시 가입을 완료할 수 있도록 합니다.</p>
              <p>쇼핑몰 운영자는 간단한 위젯 코드를 쇼핑몰에 삽입하는 것만으로 모든 소셜 로그인 인증을 번개가입이 처리합니다. 직접 OAuth 개발 없이 검증된 소셜 로그인 서비스를 즉시 제공하세요.</p>
            </div>
            <div class="lp-about-visual">
              <div class="lp-about-step">
                <div class="lp-step-num">1</div>
                <div class="lp-step-content">
                  <strong>대시보드에서 쇼핑몰 등록</strong>
                  <span>쇼핑몰 URL과 기본 정보를 입력하고 원하는 소셜 프로바이더를 선택합니다.</span>
                </div>
              </div>
              <div class="lp-about-step">
                <div class="lp-step-num">2</div>
                <div class="lp-step-content">
                  <strong>위젯 코드 설치</strong>
                  <span>발급된 위젯 코드를 쇼핑몰 회원가입 페이지에 붙여넣기합니다.</span>
                </div>
              </div>
              <div class="lp-about-step">
                <div class="lp-step-num">3</div>
                <div class="lp-step-content">
                  <strong>고객이 1-클릭으로 가입 완료</strong>
                  <span>쇼핑몰 고객은 소셜 버튼 클릭 한 번으로 회원가입을 마칩니다.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="lp-section section-bg-gray">
        <div class="lp-section-inner">
          <div class="lp-section-label">지원 프로바이더</div>
          <h2 class="lp-section-title">고객이 선호하는 모든 소셜 계정 지원</h2>
          <p class="lp-section-desc">국내외 주요 소셜 로그인 프로바이더를 지원합니다. 새로운 프로바이더도 지속적으로 추가됩니다.</p>
          <div class="lp-providers-grid">
            <span class="lp-provider-badge">Google</span>
            <span class="lp-provider-badge">카카오</span>
            <span class="lp-provider-badge">네이버</span>
            <span class="lp-provider-badge">Apple</span>
            <span class="lp-provider-badge">Discord</span>
            <span class="lp-provider-badge">Telegram</span>
            <span class="lp-provider-badge" style="opacity:0.5;font-size:12px">Facebook <small style="font-size:10px">(예정)</small></span>
            <span class="lp-provider-badge" style="opacity:0.5;font-size:12px">X (Twitter) <small style="font-size:10px">(예정)</small></span>
            <span class="lp-provider-badge" style="opacity:0.5;font-size:12px">LINE <small style="font-size:10px">(예정)</small></span>
          </div>
        </div>
      </section>

      <section class="lp-section" id="features">
        <div class="lp-section-inner">
          <div class="lp-section-label">주요 기능</div>
          <h2 class="lp-section-title">필요한 모든 기능을 갖춘 솔루션</h2>
          <p class="lp-section-desc">설치부터 운영까지 번개가입 하나로 해결합니다.</p>
          <div class="lp-features-grid">
            <div class="lp-feature-card">
              <div class="lp-feature-icon">
                <svg viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3>1-클릭 소셜 회원가입</h3>
              <p>고객이 이미 사용 중인 소셜 계정으로 별도의 정보 입력 없이 즉시 쇼핑몰 회원가입을 완료합니다. 가입률을 극적으로 높입니다.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">
                <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" /></svg>
              </div>
              <h3>커스터마이징 가능한 위젯</h3>
              <p>버튼 스타일, 색상, 표시할 프로바이더를 대시보드에서 자유롭게 설정합니다. 쇼핑몰 디자인에 맞게 위젯을 최적화하세요.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">
                <svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
              </div>
              <h3>실시간 가입 통계 대시보드</h3>
              <p>소셜 로그인 유형별, 일자별 가입 및 로그인 현황을 실시간으로 확인합니다. CSV 내보내기로 외부 분석 도구와 연동하세요.</p>
            </div>
            <div class="lp-feature-card">
              <div class="lp-feature-icon">
                <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
              </div>
              <h3>카페24 쇼핑몰 플랫폼 연동</h3>
              <p>카페24 쇼핑몰과 SSO(Single Sign-On)로 완벽하게 연동됩니다. 소셜 로그인 후 자동으로 쇼핑몰 회원가입 및 로그인이 처리됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="lp-section section-bg-gray" id="pricing">
        <div class="lp-section-inner">
          <div class="lp-section-label">요금제</div>
          <h2 class="lp-section-title">합리적인 가격으로 시작하세요</h2>
          <p class="lp-section-desc">규모에 맞는 요금제를 선택하고, 언제든 변경할 수 있습니다.</p>
          <div class="lp-pricing-grid">
            <div class="lp-plan-card">
              <div class="lp-plan-name">무료</div>
              <div class="lp-plan-price">0<span>원</span></div>
              <div class="lp-plan-limit">월 100명까지</div>
              <hr class="lp-plan-divider" />
              <ul class="lp-plan-features">
                <li>소셜 로그인 월 100건</li>
                <li>쇼핑몰 1개</li>
                <li>모든 소셜 프로바이더</li>
                <li>기본 통계</li>
              </ul>
            </div>
            <div class="lp-plan-card featured">
              <div class="lp-plan-badge">인기</div>
              <div class="lp-plan-name">월간 구독</div>
              <div class="lp-plan-price">6,900<span>원/월</span></div>
              <div class="lp-plan-limit">월 무제한</div>
              <hr class="lp-plan-divider" />
              <ul class="lp-plan-features">
                <li>소셜 로그인 무제한</li>
                <li>쇼핑몰 무제한</li>
                <li>모든 소셜 프로바이더</li>
                <li>상세 통계 및 CSV 내보내기</li>
              </ul>
            </div>
            <div class="lp-plan-card">
              <div class="lp-plan-name">연간 구독</div>
              <div class="lp-plan-price">79,000<span>원/년</span></div>
              <div class="lp-plan-limit">월 환산 6,583원 · 약 5% 할인</div>
              <hr class="lp-plan-divider" />
              <ul class="lp-plan-features">
                <li>소셜 로그인 무제한</li>
                <li>쇼핑몰 무제한</li>
                <li>모든 소셜 프로바이더</li>
                <li>상세 통계 및 CSV 내보내기</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <footer class="lp-footer">
        <div class="lp-footer-inner">
          <div class="lp-footer-top">
            <div>
              <div class="lp-footer-brand">번개가입</div>
              <div class="lp-footer-tagline">소셜 로그인 1-클릭 쇼핑몰 회원가입 솔루션</div>
            </div>
            <div class="lp-footer-links">
              <a href="/privacy">개인정보처리방침</a>
              <a href="/terms">이용약관</a>
            </div>
          </div>
          <hr class="lp-footer-divider" />
          <div class="lp-footer-biz">
            이메일 help@suparain.com
          </div>
        </div>
      </footer>

    </body>
  </html>
);

export const PrivacyPage: FC = () => (
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>개인정보 처리방침 - 번개가입</title>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #333; line-height: 1.7; }
        .privacy-wrap { max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
        .privacy-header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
        .privacy-header h1 { font-size: 28px; margin-bottom: 8px; }
        .privacy-header .service { color: #2563eb; font-weight: 600; font-size: 15px; }
        .privacy-header .date { color: #64748b; font-size: 14px; margin-top: 8px; }
        .privacy-intro { font-size: 15px; color: #475569; margin-bottom: 32px; }
        .privacy-section { margin-bottom: 32px; }
        .privacy-section h2 { font-size: 18px; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
        .privacy-section h3 { font-size: 15px; color: #334155; margin: 16px 0 8px; }
        .privacy-section p, .privacy-section li { font-size: 14px; color: #475569; }
        .privacy-section ul, .privacy-section ol { padding-left: 20px; margin: 8px 0; }
        .privacy-section li { margin-bottom: 6px; }
        .privacy-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .privacy-table th, .privacy-table td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
        .privacy-table th { background: #f8fafc; color: #334155; font-weight: 600; }
        .privacy-table td { color: #475569; }
        .privacy-footer { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 14px; color: #64748b; }
        .privacy-footer a { color: #2563eb; text-decoration: none; }
        .privacy-footer a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
          .privacy-wrap { padding: 24px 16px 60px; }
          .privacy-header h1 { font-size: 22px; }
          .privacy-table { font-size: 12px; }
          .privacy-table th, .privacy-table td { padding: 8px 6px; }
        }
      `}</style>
    </head>
    <body>
      <div class="privacy-wrap">
        <div class="privacy-header">
          <h1>개인정보 처리방침</h1>
          <div class="service">번개가입 (BungaeGaib)</div>
          <div class="date">시행일: 2026년 3월 13일</div>
        </div>

        <p class="privacy-intro">
          수파레인(이하 "회사")은 「개인정보 보호법」 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.
        </p>

        <div class="privacy-section">
          <h2>제1조 (개인정보의 처리 목적)</h2>
          <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.</p>
          <ol>
            <li><strong>쇼핑몰 운영자 서비스 제공</strong>: 번개가입 관리자 대시보드 회원가입 및 로그인, 서비스 이용 관리</li>
            <li><strong>쇼핑몰 고객 소셜 로그인 제공</strong>: 카페24 쇼핑몰 고객의 소셜 로그인(Google, Kakao, Naver, Apple) 인증 처리 및 회원 연동</li>
            <li><strong>서비스 운영 및 개선</strong>: 로그인 통계 분석, 서비스 안정성 확보</li>
          </ol>
        </div>

        <div class="privacy-section">
          <h2>제2조 (처리하는 개인정보의 항목)</h2>
          <h3>1. 쇼핑몰 운영자 (대시보드 사용자)</h3>
          <table class="privacy-table">
            <thead><tr><th>구분</th><th>항목</th><th>수집 방법</th></tr></thead>
            <tbody>
              <tr><td>필수</td><td>이메일, 이름, 비밀번호(해시 저장)</td><td>회원가입 시 직접 입력</td></tr>
            </tbody>
          </table>
          <h3>2. 쇼핑몰 고객 (소셜 로그인 사용자)</h3>
          <table class="privacy-table">
            <thead><tr><th>구분</th><th>항목</th><th>수집 방법</th></tr></thead>
            <tbody>
              <tr><td>필수</td><td>소셜 프로바이더 고유 ID, 이메일, 닉네임/이름</td><td>소셜 로그인 시 프로바이더로부터 자동 수집</td></tr>
              <tr><td>선택</td><td>프로필 사진 URL</td><td>소셜 로그인 시 프로바이더로부터 자동 수집</td></tr>
            </tbody>
          </table>
          <h3>3. 자동 수집 항목</h3>
          <table class="privacy-table">
            <thead><tr><th>항목</th><th>수집 방법</th></tr></thead>
            <tbody>
              <tr><td>로그인/가입 일시, 소셜 프로바이더 종류</td><td>서비스 이용 시 자동 생성</td></tr>
            </tbody>
          </table>
        </div>

        <div class="privacy-section">
          <h2>제3조 (개인정보의 처리 및 보유 기간)</h2>
          <p>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 개인정보를 수집 시에 동의받은 개인정보 보유·이용 기간 내에서 개인정보를 처리·보유합니다.</p>
          <table class="privacy-table">
            <thead><tr><th>구분</th><th>보유 기간</th><th>근거</th></tr></thead>
            <tbody>
              <tr><td>쇼핑몰 운영자 계정 정보</td><td>회원 탈퇴 시까지</td><td>서비스 이용 계약</td></tr>
              <tr><td>쇼핑몰 고객 소셜 로그인 정보</td><td>쇼핑몰 서비스 이용 종료 시까지</td><td>서비스 제공 목적</td></tr>
              <tr><td>로그인 통계 데이터</td><td>수집일로부터 1년</td><td>서비스 운영 및 개선</td></tr>
            </tbody>
          </table>
        </div>

        <div class="privacy-section">
          <h2>제4조 (개인정보의 제3자 제공)</h2>
          <p>회사는 정보주체의 개인정보를 제1조에서 명시한 범위 내에서만 처리하며, 다음의 경우에 한하여 개인정보를 제3자에게 제공합니다.</p>
          <table class="privacy-table">
            <thead><tr><th>제공받는 자</th><th>제공 목적</th><th>제공 항목</th><th>보유 기간</th></tr></thead>
            <tbody>
              <tr><td>카페24 쇼핑몰 플랫폼</td><td>SSO 연동을 통한 회원 정보 전달</td><td>이메일, 이름, 소셜 프로바이더 ID</td><td>쇼핑몰 회원 탈퇴 시까지</td></tr>
              <tr><td>소셜 로그인 프로바이더 (Google, Kakao, Naver, Apple)</td><td>OAuth 인증 과정</td><td>인증 토큰</td><td>인증 완료 시 즉시 파기</td></tr>
            </tbody>
          </table>
        </div>

        <div class="privacy-section">
          <h2>제5조 (개인정보의 파기절차 및 파기방법)</h2>
          <p>회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 지체 없이 해당 개인정보를 파기합니다.</p>
          <ol>
            <li><strong>파기절차</strong>: 불필요한 개인정보는 개인정보의 처리가 불필요한 것으로 인정되는 날로부터 5일 이내에 파기합니다.</li>
            <li><strong>파기방법</strong>: 전자적 파일 형태의 정보는 복구 및 재생이 불가능한 방법으로 영구 삭제합니다.</li>
          </ol>
        </div>

        <div class="privacy-section">
          <h2>제6조 (정보주체의 권리·의무 및 행사방법)</h2>
          <p>정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
          <ol>
            <li>개인정보 열람 요구</li>
            <li>오류 등이 있을 경우 정정 요구</li>
            <li>삭제 요구</li>
            <li>처리 정지 요구</li>
          </ol>
          <p>위 권리 행사는 이메일(privacy@suparain.kr)을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.</p>
        </div>

        <div class="privacy-section">
          <h2>제7조 (개인정보의 안전성 확보조치)</h2>
          <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
          <ol>
            <li><strong>개인정보 암호화</strong>: 개인식별정보(PII)인 이메일과 이름은 AES-GCM 알고리즘으로 암호화하여 저장합니다.</li>
            <li><strong>비밀번호 해시 처리</strong>: 비밀번호는 PBKDF2 알고리즘(100,000회 반복)으로 해시 처리하여 저장하며, 원본 비밀번호는 저장하지 않습니다.</li>
            <li><strong>회원 매칭용 해시</strong>: 이메일 해시(SHA-256)를 회원 매칭 목적으로 별도 저장합니다.</li>
            <li><strong>전송 구간 암호화</strong>: 모든 데이터 전송은 HTTPS(TLS)를 통해 암호화됩니다.</li>
            <li><strong>서버리스 아키텍처</strong>: Cloudflare Workers 서버리스 환경에서 운영되어 물리적 서버 관리로 인한 보안 위험을 최소화합니다.</li>
            <li><strong>데이터 저장소</strong>: 데이터는 Cloudflare D1 데이터베이스에 저장되며, Cloudflare 글로벌 네트워크를 통해 보호됩니다.</li>
          </ol>
        </div>

        <div class="privacy-section">
          <h2>제8조 (개인정보 보호책임자)</h2>
          <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만 처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
          <ul>
            <li><strong>개인정보 보호책임자</strong>: 수파레인 대표</li>
            <li><strong>연락처</strong>: privacy@suparain.kr</li>
          </ul>
        </div>

        <div class="privacy-section">
          <h2>제9조 (개인정보의 국외 이전)</h2>
          <p>회사는 서비스 제공을 위해 다음과 같이 개인정보를 국외로 이전하고 있습니다.</p>
          <table class="privacy-table">
            <thead><tr><th>이전받는 자</th><th>이전 국가</th><th>이전 항목</th><th>이전 목적</th><th>보유 기간</th></tr></thead>
            <tbody>
              <tr><td>Cloudflare, Inc.</td><td>미국 (글로벌 네트워크)</td><td>암호화된 개인정보 전체</td><td>데이터 저장 및 서비스 호스팅</td><td>서비스 이용 기간</td></tr>
              <tr><td>Google LLC</td><td>미국</td><td>OAuth 인증 정보</td><td>소셜 로그인 인증</td><td>인증 완료 시 파기</td></tr>
              <tr><td>Apple Inc.</td><td>미국</td><td>OAuth 인증 정보</td><td>소셜 로그인 인증</td><td>인증 완료 시 파기</td></tr>
            </tbody>
          </table>
          <p style="font-size:13px; color:#94a3b8; margin-top:8px">※ Kakao, Naver의 경우 국내 사업자로서 국외 이전에 해당하지 않습니다.</p>
        </div>

        <div class="privacy-section">
          <h2>제10조 (개인정보 자동 수집 장치의 설치·운영 및 거부)</h2>
          <ol>
            <li><strong>쿠키의 사용 목적</strong>: 관리자 대시보드 로그인 상태 유지 (인증 토큰 저장)</li>
            <li><strong>쿠키의 설치·운영 및 거부</strong>: 웹 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으나, 이 경우 대시보드 로그인 기능을 이용하실 수 없습니다.</li>
          </ol>
        </div>

        <div class="privacy-section">
          <h2>제11조 (권익침해 구제방법)</h2>
          <p>정보주체는 개인정보침해로 인한 구제를 받기 위하여 아래 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
          <ul>
            <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
            <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
            <li>대검찰청: (국번없이) 1301 (www.spo.go.kr)</li>
            <li>경찰청: (국번없이) 182 (ecrm.police.go.kr)</li>
          </ul>
        </div>

        <div class="privacy-section">
          <h2>제12조 (개인정보 처리방침의 변경)</h2>
          <p>이 개인정보 처리방침은 2026년 3월 13일부터 적용됩니다.</p>
        </div>

        <div class="privacy-footer">
          <p><strong>주식회사 수파레인</strong> | 사업자등록번호 716-88-01081 | 이메일 help@suparain.com</p>
          <p style="margin-top:8px"><a href="https://bg.suparain.kr">https://bg.suparain.kr</a></p>
        </div>
      </div>
    </body>
  </html>
);

export const TermsPage: FC = () => (
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>서비스 이용약관 - 번개가입</title>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #333; line-height: 1.7; }
        .terms-wrap { max-width: 800px; margin: 0 auto; padding: 40px 24px 80px; }
        .terms-header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
        .terms-header h1 { font-size: 28px; margin-bottom: 8px; }
        .terms-header .service { color: #2563eb; font-weight: 600; font-size: 15px; }
        .terms-header .date { color: #64748b; font-size: 14px; margin-top: 8px; }
        .terms-intro { font-size: 15px; color: #475569; margin-bottom: 32px; }
        .terms-section { margin-bottom: 32px; }
        .terms-section h2 { font-size: 18px; color: #1e293b; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
        .terms-section h3 { font-size: 15px; color: #334155; margin: 16px 0 8px; }
        .terms-section p, .terms-section li { font-size: 14px; color: #475569; }
        .terms-section ul, .terms-section ol { padding-left: 20px; margin: 8px 0; }
        .terms-section li { margin-bottom: 6px; }
        .terms-table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
        .terms-table th, .terms-table td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; }
        .terms-table th { background: #f8fafc; color: #334155; font-weight: 600; }
        .terms-table td { color: #475569; }
        .terms-footer { margin-top: 40px; padding-top: 24px; border-top: 2px solid #e5e7eb; text-align: center; font-size: 14px; color: #64748b; }
        .terms-footer a { color: #2563eb; text-decoration: none; }
        .terms-footer a:hover { text-decoration: underline; }
        @media (max-width: 600px) {
          .terms-wrap { padding: 24px 16px 60px; }
          .terms-header h1 { font-size: 22px; }
          .terms-table { font-size: 12px; }
          .terms-table th, .terms-table td { padding: 8px 6px; }
        }
      `}</style>
    </head>
    <body>
      <div class="terms-wrap">
        <div class="terms-header">
          <h1>서비스 이용약관</h1>
          <div class="service">번개가입 (BungaeGaib)</div>
          <div class="date">시행일: 2026년 3월 30일</div>
        </div>

        <p class="terms-intro">
          본 약관은 주식회사 수파레인(이하 "회사")이 제공하는 번개가입 서비스(이하 "서비스")의 이용 조건 및 절차, 회사와 이용자의 권리·의무 및 책임사항 등을 규정함을 목적으로 합니다.
        </p>

        <div class="terms-section">
          <h2>제1조 (목적)</h2>
          <p>본 약관은 회사가 제공하는 번개가입 서비스의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </div>

        <div class="terms-section">
          <h2>제2조 (정의)</h2>
          <ol>
            <li><strong>"서비스"</strong>란 회사가 제공하는 소셜 로그인 기반 쇼핑몰 회원가입 솔루션으로, 쇼핑몰 고객이 소셜 계정(Google, Kakao, Naver, Apple 등)을 통해 1-클릭으로 회원가입 및 로그인을 완료할 수 있도록 하는 서비스를 말합니다.</li>
            <li><strong>"이용자"</strong>란 본 약관에 따라 서비스를 이용하는 자를 말하며, 다음과 같이 구분합니다.
              <ul>
                <li><strong>운영자</strong>: 서비스에 가입하여 자신의 쇼핑몰에 번개가입을 설치·운영하는 쇼핑몰 사업자</li>
                <li><strong>고객</strong>: 번개가입이 설치된 쇼핑몰에서 소셜 로그인을 이용하는 쇼핑몰 방문자</li>
              </ul>
            </li>
            <li><strong>"쇼핑몰 플랫폼"</strong>이란 카페24, 아임웹, 고도몰, 샵바이 등 서비스가 연동되는 전자상거래 플랫폼을 말합니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제3조 (약관의 효력 및 변경)</h2>
          <ol>
            <li>본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
            <li>회사는 관련 법령을 위반하지 않는 범위에서 본 약관을 개정할 수 있으며, 개정 약관은 적용일 7일 전부터 서비스 내 공지합니다.</li>
            <li>이용자가 개정 약관의 적용에 동의하지 않는 경우 서비스 이용을 중단하고 이용 계약을 해지할 수 있습니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제4조 (서비스의 내용)</h2>
          <p>회사가 제공하는 서비스는 다음과 같습니다.</p>
          <ol>
            <li><strong>소셜 로그인 위젯</strong>: 쇼핑몰 회원가입 페이지에 설치되는 소셜 로그인 버튼 위젯</li>
            <li><strong>SSO 연동</strong>: 쇼핑몰 플랫폼과 소셜 로그인 프로바이더 간 인증 중개</li>
            <li><strong>관리자 대시보드</strong>: 운영자를 위한 가입 통계 조회, 프로바이더 설정, 위젯 커스터마이징 기능</li>
            <li><strong>마이페이지 소셜 연동</strong>: 고객이 여러 소셜 계정을 하나의 쇼핑몰 계정에 연결할 수 있는 기능</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제5조 (이용 계약의 성립)</h2>
          <ol>
            <li>운영자의 이용 계약은 운영자가 대시보드에서 회원가입을 완료하고 쇼핑몰을 등록한 시점에 성립합니다.</li>
            <li>고객의 이용은 번개가입이 설치된 쇼핑몰에서 소셜 로그인 버튼을 클릭하여 인증을 완료한 시점에 개시됩니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제6조 (요금 및 결제)</h2>
          <table class="terms-table">
            <thead><tr><th>요금제</th><th>월 가입 한도</th><th>가격</th></tr></thead>
            <tbody>
              <tr><td>무료</td><td>100명</td><td>무료</td></tr>
              <tr><td>월간 구독</td><td>무제한</td><td>월 29,900원 (부가세 별도)</td></tr>
              <tr><td>연간 구독</td><td>무제한</td><td>연 329,900원 (부가세 별도)</td></tr>
            </tbody>
          </table>
          <ol>
            <li>유료 요금제의 결제는 카페24 결제 시스템을 통해 처리됩니다.</li>
            <li>월간 구독은 매월 자동 갱신되며, 연간 구독은 만료일 전에 갱신 안내를 드립니다.</li>
            <li>환불은 관련 법령 및 회사의 환불 정책에 따릅니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제7조 (이용자의 의무)</h2>
          <ol>
            <li>이용자는 관계 법령, 본 약관의 규정, 이용 안내 및 서비스와 관련하여 공지한 주의사항을 준수하여야 합니다.</li>
            <li>운영자는 자신의 쇼핑몰에서 번개가입 서비스를 이용함에 있어 관련 법령(전자상거래법, 개인정보 보호법 등)을 준수할 의무가 있습니다.</li>
            <li>이용자는 다음 행위를 하여서는 안 됩니다.
              <ul>
                <li>타인의 정보를 도용하여 서비스를 이용하는 행위</li>
                <li>서비스의 안정적 운영을 방해하는 행위</li>
                <li>서비스를 이용하여 불법적인 목적으로 개인정보를 수집하는 행위</li>
                <li>회사의 지식재산권을 침해하는 행위</li>
              </ul>
            </li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제8조 (회사의 의무)</h2>
          <ol>
            <li>회사는 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
            <li>회사는 이용자의 개인정보를 「개인정보 보호법」 등 관련 법령에 따라 보호합니다.</li>
            <li>회사는 서비스 장애 발생 시 신속하게 복구하기 위해 노력합니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제9조 (서비스의 중단)</h2>
          <ol>
            <li>회사는 시스템 점검, 교체 및 고장, 통신 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있습니다.</li>
            <li>제1항에 의한 서비스 중단의 경우 회사는 사전에 서비스 화면 또는 이메일로 이용자에게 통지합니다. 다만, 불가피한 사유로 사전 통지가 불가능한 경우 사후에 통지할 수 있습니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제10조 (이용 계약의 해지)</h2>
          <ol>
            <li>운영자는 대시보드의 설정 메뉴에서 언제든지 서비스 이용 계약을 해지할 수 있습니다.</li>
            <li>회사는 이용자가 본 약관을 위반한 경우, 시정을 요구하고 시정되지 않을 경우 이용 계약을 해지할 수 있습니다.</li>
            <li>이용 계약이 해지되면 운영자의 쇼핑몰에 설치된 번개가입 위젯은 비활성화되며, 관련 데이터는 개인정보 처리방침에 따라 처리됩니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제11조 (면책조항)</h2>
          <ol>
            <li>회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
            <li>회사는 쇼핑몰 플랫폼(카페24 등)의 장애, 정책 변경 등으로 인한 서비스 제한에 대해 책임을 지지 않습니다.</li>
            <li>회사는 소셜 로그인 프로바이더(Google, Kakao 등)의 서비스 장애 또는 정책 변경으로 인한 서비스 제한에 대해 책임을 지지 않습니다.</li>
            <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대해 책임을 지지 않습니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>제12조 (분쟁 해결)</h2>
          <ol>
            <li>본 약관에 명시되지 않은 사항은 관련 법령 및 상관례에 따릅니다.</li>
            <li>서비스 이용으로 발생한 분쟁에 대해 소송이 제기되는 경우 회사의 본사 소재지를 관할하는 법원을 관할 법원으로 합니다.</li>
          </ol>
        </div>

        <div class="terms-section">
          <h2>부칙</h2>
          <p>본 약관은 2026년 3월 30일부터 시행합니다.</p>
        </div>

        <div class="terms-footer">
          <p><strong>주식회사 수파레인</strong> | 사업자등록번호 716-88-01081 | 이메일 help@suparain.com</p>
          <p style="margin-top:8px"><a href="https://bg.suparain.kr">https://bg.suparain.kr</a></p>
        </div>
      </div>
    </body>
  </html>
);

