/**
 * Shared layout for dashboard SSR pages.
 */
import type { FC, PropsWithChildren } from 'hono/jsx';

type LayoutProps = PropsWithChildren<{
  title: string;
  loggedIn?: boolean;
  currentPath?: string;
  isAdmin?: boolean;
  isCafe24?: boolean;
}>;

// SVG icon components (Heroicons outline style)
const IconGrid = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
  </svg>
);
const IconStorefront = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v4M12 14v4M16 14v4"/>
  </svg>
);
const IconChartBar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/>
  </svg>
);
const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
  </svg>
);
const IconCog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconKey = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
);
const IconBuilding = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconCurrencyDollar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);
const IconClipboard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
    <rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14h6M9 18h6"/>
  </svg>
);

const navItems = [
  { path: '/dashboard', label: '홈', icon: <IconGrid /> },
  { path: '/dashboard/shops', label: '쇼핑몰 관리', icon: <IconStorefront /> },
  { path: '/dashboard/stats', label: '통합 통계', icon: <IconChartBar /> },
  { path: '/dashboard/billing', label: '플랜/과금', icon: <IconCreditCard /> },
  { path: '/dashboard/settings', label: '계정 설정', icon: <IconCog /> },
];

const adminNavItems = [
  { path: '/admin', label: '관리자 홈', icon: <IconKey /> },
  { path: '/admin/shops', label: '전체 쇼핑몰', icon: <IconBuilding /> },
  { path: '/admin/owners', label: '사용자 관리', icon: <IconUsers /> },
  { path: '/admin/subscriptions', label: '구독 현황', icon: <IconCurrencyDollar /> },
  { path: '/admin/audit-log', label: '감사 로그', icon: <IconClipboard /> },
];

export const Layout: FC<LayoutProps> = ({ title, loggedIn, currentPath, isAdmin, isCafe24, children }) => {
  const visibleNavItems = isCafe24
    ? navItems.filter((item) => item.path !== '/dashboard/settings')
    : navItems;
  return (
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} - 번개가입</title>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; color: #333; min-height: 100vh; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }

        .app { display: flex; min-height: 100vh; }
        .sidebar { width: 240px; background: #1e293b; color: #e2e8f0; padding: 20px 0; flex-shrink: 0; }
        .sidebar-logo { padding: 0 20px 20px; font-size: 18px; font-weight: 700; border-bottom: 1px solid #334155; margin-bottom: 12px; }
        .sidebar-logo span { color: #fbbf24; }
        .sidebar nav a { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: #94a3b8; font-size: 14px; transition: background 0.15s; }
        .sidebar nav a:hover, .sidebar nav a.active { background: #334155; color: #f1f5f9; text-decoration: none; }
        .sidebar-footer { padding: 16px 20px; border-top: 1px solid #334155; margin-top: auto; }
        .sidebar-footer a { color: #94a3b8; font-size: 13px; }

        .main { flex: 1; padding: 32px; max-width: 960px; }
        .main h1 { font-size: 24px; margin-bottom: 24px; }

        .auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f5; }
        .auth-card { background: #fff; border-radius: 12px; padding: 40px; width: 100%; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        .auth-card h1 { text-align: center; margin-bottom: 8px; }
        .auth-card p.sub { text-align: center; color: #64748b; margin-bottom: 24px; font-size: 14px; }

        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #475569; }
        .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        .btn { display: inline-flex; align-items: center; justify-content: center; padding: 10px 20px; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .btn-primary { background: #2563eb; color: #fff; width: 100%; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-sm { padding: 6px 14px; font-size: 13px; }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; }
        .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #475569; }
        .btn-outline:hover { background: #f8fafc; }

        .card { background: #fff; border-radius: 12px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .card h2 { font-size: 18px; margin-bottom: 16px; }

        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        th { font-weight: 600; color: #64748b; font-size: 12px; text-transform: uppercase; }

        .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
        .badge-green { background: #dcfce7; color: #166534; }
        .badge-yellow { background: #fef9c3; color: #854d0e; }
        .badge-red { background: #fee2e2; color: #991b1b; }
        .badge-gray { background: #f1f5f9; color: #475569; }

        .alert { padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
        .alert-info { background: #dbeafe; color: #1e40af; }
        .alert-warn { background: #fef3c7; color: #92400e; }
        .alert-error { background: #fee2e2; color: #991b1b; }

        .provider-toggle { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
        .provider-toggle:last-child { border-bottom: none; }
        .toggle { position: relative; width: 70px; height: 34px; flex-shrink: 0; }
        .toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
        .toggle-slider { position: absolute; inset: 0; background: linear-gradient(to bottom, #c8c8c8, #d8d8d8); border-radius: 17px; cursor: pointer; transition: background 0.3s ease; box-shadow: inset 0 2px 4px rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1); overflow: hidden; }
        .toggle-slider::before { content: ''; position: absolute; width: 28px; height: 28px; left: 3px; top: 3px; background: linear-gradient(to bottom, #fff, #f0f0f0); border-radius: 50%; transition: transform 0.3s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.25); z-index: 2; }
        .toggle-slider::after { content: 'OFF'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); font-size: 10px; font-weight: 700; color: rgba(0,0,0,0.3); letter-spacing: 0.5px; z-index: 1; transition: opacity 0.2s; }
        .toggle input:checked + .toggle-slider { background: linear-gradient(to bottom, #4cd964, #5de076); }
        .toggle input:checked + .toggle-slider::before { transform: translateX(36px); }
        .toggle input:checked + .toggle-slider::after { content: 'ON'; left: 12px; right: auto; color: rgba(255,255,255,0.8); }

        .code-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; overflow-x: auto; position: relative; }
        .copy-btn { position: absolute; top: 8px; right: 8px; background: #334155; color: #e2e8f0; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .copy-btn:hover { background: #475569; }

        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
        .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; }
        .stat-card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }

        .empty-state { text-align: center; padding: 48px 20px; color: #94a3b8; }
        .empty-state p { font-size: 15px; margin-bottom: 16px; }

        /* Progress bar */
        .progress-bar { background: #e5e7eb; border-radius: 8px; height: 24px; overflow: hidden; position: relative; }
        .progress-bar-fill { height: 100%; border-radius: 8px; transition: width 0.3s; display: flex; align-items: center; padding: 0 8px; }
        .progress-bar-label { font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; }
        .progress-bar-outer { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .progress-bar-name { font-size: 13px; font-weight: 600; min-width: 64px; }
        .progress-bar-value { font-size: 12px; color: #64748b; min-width: 60px; text-align: right; }

        /* SVG Chart */
        .chart-container { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.06); margin-bottom: 16px; }
        .chart-container h3 { font-size: 16px; margin-bottom: 16px; }

        /* Filter controls */
        .filter-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .filter-bar select, .filter-bar input[type="date"] { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; background: #fff; cursor: pointer; }
        .filter-bar select:focus, .filter-bar input[type="date"]:focus { outline: none; border-color: #2563eb; }

        /* Tab navigation */
        .tab-nav { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; gap: 0; }
        .tab-nav a { padding: 10px 20px; font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
        .tab-nav a:hover { color: #1e293b; text-decoration: none; }
        .tab-nav a.active { color: #2563eb; border-bottom-color: #2563eb; }

        /* Alert banner with action button */
        .alert-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .alert-banner .btn { flex-shrink: 0; }

        /* Plan cards */
        .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .plan-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; transition: border-color 0.15s; }
        .plan-card.current { border-color: #2563eb; background: #eff6ff; }
        .plan-card h3 { font-size: 18px; margin-bottom: 4px; }
        .plan-card .price { font-size: 28px; font-weight: 700; margin: 12px 0; }
        .plan-card .price small { font-size: 14px; font-weight: 400; color: #64748b; }
        .plan-card ul { list-style: none; text-align: left; font-size: 13px; margin: 16px 0; }
        .plan-card ul li { padding: 4px 0; }
        .plan-card ul li::before { content: '✓ '; color: #22c55e; font-weight: 700; }

        /* Provider colors */
        .provider-google { background: #4285f4; }
        .provider-kakao { background: #fee500; }
        .provider-naver { background: #03c75a; }
        .provider-apple { background: #000000; }
        .provider-toss { background: #0064ff; }
        .provider-discord { background: #5865f2; }
        .provider-telegram { background: #26a5e4; }
        .provider-tiktok { background: #000000; }

        /* Provider preview */
        .preview-area { border: 2px dashed #d1d5db; border-radius: 12px; padding: 32px; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .preview-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #fff; border: none; cursor: default; }
        .preview-btn.kakao-btn { color: #191919; }

        /* Mobile hamburger menu */
        .mobile-header { display: none; align-items: center; justify-content: space-between; padding: 12px 16px; background: #1e293b; color: #e2e8f0; }
        .mobile-logo { font-size: 16px; font-weight: 700; }
        .mobile-logo span { color: #fbbf24; }
        .hamburger { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; gap: 5px; padding: 4px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: #e2e8f0; border-radius: 2px; transition: all 0.2s; }
        .mobile-nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; }
        .mobile-nav-overlay.open { display: block; }
        .mobile-nav-drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 240px; background: #1e293b; z-index: 101; transform: translateX(-100%); transition: transform 0.25s ease; padding: 20px 0; }
        .mobile-nav-drawer.open { transform: translateX(0); }
        .mobile-nav-drawer .sidebar-logo { padding: 0 20px 20px; font-size: 18px; font-weight: 700; border-bottom: 1px solid #334155; margin-bottom: 12px; }
        .mobile-nav-drawer .sidebar-logo span { color: #fbbf24; }
        .mobile-nav-drawer nav a { display: flex; align-items: center; gap: 10px; padding: 10px 20px; color: #94a3b8; font-size: 14px; }
        .mobile-nav-drawer nav a:hover, .mobile-nav-drawer nav a.active { background: #334155; color: #f1f5f9; text-decoration: none; }
        .mobile-nav-drawer .sidebar-footer { padding: 16px 20px; border-top: 1px solid #334155; margin-top: auto; }
        .mobile-nav-drawer .sidebar-footer a { color: #94a3b8; font-size: 13px; }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-header { display: flex; }
          .main { padding: 16px; }
          .stat-grid { grid-template-columns: 1fr 1fr; }
          .filter-bar { flex-direction: column; }
          .plan-grid { grid-template-columns: 1fr; }
          .alert-banner { flex-direction: column; align-items: flex-start; }
          .tab-nav { overflow-x: auto; }
        }

        /* Site footer */
        .site-footer {
          margin-top: 48px;
          padding: 24px 0;
          border-top: 1px solid #e5e7eb;
          font-size: 12px;
          color: #94a3b8;
          line-height: 1.8;
        }
        .site-footer a { color: #94a3b8; }
        .site-footer a:hover { color: #64748b; text-decoration: underline; }

        /* Toast notification */
        .toast-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .toast {
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: toast-in 0.3s ease;
          max-width: 360px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .toast-success { background: #dcfce7; color: #166534; border-left: 4px solid #22c55e; }
        .toast-error { background: #fee2e2; color: #991b1b; border-left: 4px solid #ef4444; }
        .toast-warn { background: #fef3c7; color: #92400e; border-left: 4px solid #f59e0b; }
        .toast-info { background: #dbeafe; color: #1e40af; border-left: 4px solid #2563eb; }
        @keyframes toast-in { from { opacity:0; transform:translateX(100px); } to { opacity:1; transform:translateX(0); } }
        @keyframes toast-out { from { opacity:1; } to { opacity:0; transform:translateY(-20px); } }
      `}</style>
    </head>
    <body>
      {loggedIn ? (
        <div class="app">
          {/* Mobile header (visible only on small screens) */}
          <div class="mobile-header">
            <div class="mobile-logo">⚡ <span>번개가입</span></div>
            <button class="hamburger" id="hamburger-btn" aria-label="메뉴 열기">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>

          {/* Mobile nav overlay + drawer */}
          <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
          <div class="mobile-nav-drawer" id="mobile-nav-drawer">
            <div class="sidebar-logo">⚡ <span>번개가입</span></div>
            <nav>
              {visibleNavItems.map((item) => (
                <a
                  href={item.path}
                  class={currentPath === item.path || (item.path !== '/dashboard' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                >
                  {item.icon} {item.label}
                </a>
              ))}
              {isAdmin && (
                <>
                  <div style="border-top:1px solid #334155;margin:12px 0"></div>
                  <div style="padding:4px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">관리자</div>
                  {adminNavItems.map((item) => (
                    <a
                      href={item.path}
                      class={currentPath === item.path || (item.path !== '/admin' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                    >
                      {item.icon} {item.label}
                    </a>
                  ))}
                </>
              )}
            </nav>
            {!isCafe24 && (
              <div class="sidebar-footer">
                <a href="/dashboard/logout">로그아웃</a>
              </div>
            )}
          </div>

          <aside class="sidebar">
            <div class="sidebar-logo">⚡ <span>번개가입</span></div>
            <nav>
              {visibleNavItems.map((item) => (
                <a
                  href={item.path}
                  class={currentPath === item.path || (item.path !== '/dashboard' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                >
                  {item.icon} {item.label}
                </a>
              ))}
              {isAdmin && (
                <>
                  <div style="border-top:1px solid #334155;margin:12px 0"></div>
                  <div style="padding:4px 20px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em">관리자</div>
                  {adminNavItems.map((item) => (
                    <a
                      href={item.path}
                      class={currentPath === item.path || (item.path !== '/admin' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                    >
                      {item.icon} {item.label}
                    </a>
                  ))}
                </>
              )}
            </nav>
            {!isCafe24 && (
              <div class="sidebar-footer">
                <a href="/dashboard/logout">로그아웃</a>
              </div>
            )}
          </aside>
          <main class="main">
            {children}
            <footer class="site-footer">
              <div>주식회사 수파레인 | 대표이사 임호빈 | 사업자등록번호 716-88-01081</div>
              <div>경기도 김포시 태장로 789 금광하이테크시티 465호</div>
              <div>전화 031-992-5988 | 이메일 help@suparain.com</div>
              <div style="margin-top:4px"><a href="/privacy">개인정보처리방침</a></div>
            </footer>
          </main>
        </div>
      ) : (
        <>{children}</>
      )}

      <script dangerouslySetInnerHTML={{__html: `
        // Mobile hamburger menu handler
        (function() {
          var btn = document.getElementById('hamburger-btn');
          var overlay = document.getElementById('mobile-nav-overlay');
          var drawer = document.getElementById('mobile-nav-drawer');
          if (!btn) return;
          function openNav() {
            overlay.classList.add('open');
            drawer.classList.add('open');
            document.body.style.overflow = 'hidden';
          }
          function closeNav() {
            overlay.classList.remove('open');
            drawer.classList.remove('open');
            document.body.style.overflow = '';
          }
          btn.addEventListener('click', openNav);
          overlay.addEventListener('click', closeNav);
        })();

        // Copy button handler
        function copyText(text, btn) {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
              btn.textContent = '복사됨!';
              setTimeout(function() { btn.textContent = '복사'; }, 1500);
            }).catch(function() { fallbackCopy(text, btn); });
          } else {
            fallbackCopy(text, btn);
          }
        }
        function fallbackCopy(text, btn) {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          try { document.execCommand('copy'); btn.textContent = '복사됨!'; }
          catch(e) { btn.textContent = '실패'; }
          document.body.removeChild(ta);
          setTimeout(function() { btn.textContent = '복사'; }, 1500);
        }

        // Form API helper
        async function apiCall(method, url, body, submitBtn) {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn._originalText = submitBtn.textContent;
            submitBtn.textContent = '처리 중...';
          }
          try {
            var resp = await fetch(url, {
              method: method,
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: body ? JSON.stringify(body) : undefined,
            });
            return resp;
          } finally {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = submitBtn._originalText;
            }
          }
        }

        // Global toast notification
        function showToast(type, message, duration) {
          duration = duration || 3000;
          var container = document.getElementById('toast-container');
          if (!container) return;
          var toast = document.createElement('div');
          toast.className = 'toast toast-' + type;
          toast.textContent = message;
          container.appendChild(toast);
          setTimeout(function() {
            toast.style.animation = 'toast-out 0.3s ease forwards';
            setTimeout(function() { toast.remove(); }, 300);
          }, duration);
        }
      `}} />
      <div id="toast-container" class="toast-container"></div>
    </body>
  </html>
  );
};
