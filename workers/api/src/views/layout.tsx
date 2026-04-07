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
const IconChartBar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8" rx="1"/><rect x="14" y="6" width="3" height="12" rx="1"/>
  </svg>
);
const IconSparkle = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);
const IconCog = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconBook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
  </svg>
);
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconPalette = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="13.5" cy="6.5" r="1.5"/><circle cx="17.5" cy="10.5" r="1.5"/>
    <circle cx="8.5" cy="7.5" r="1.5"/><circle cx="6.5" cy="12.5" r="1.5"/>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.042a1.65 1.65 0 0 1 1.648-1.648h1.99c3.029 0 5.589-2.56 5.589-5.589C22 6.5 17.5 2 12 2z"/>
  </svg>
);
const IconTicket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    <path d="M13 5v2M13 17v2M13 11v2"/>
  </svg>
);
const IconFlag = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
    <line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconTrending = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconChat = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
const IconHelp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"/>
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
    <line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);
const IconCreditCard = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
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

type NavItem = {
  path: string;
  label: string;
  icon: unknown;
  plus?: boolean;
};

const mainNavItems: NavItem[] = [
  { path: '/dashboard', label: '홈', icon: <IconGrid /> },
  { path: '/dashboard/stats', label: '통계', icon: <IconChartBar /> },
];

const settingNavItems: NavItem[] = [
  { path: '/dashboard/settings/general', label: '기본 설정', icon: <IconCog /> },
  { path: '/dashboard/settings/sso-guide', label: 'SSO 설정 가이드', icon: <IconBook /> },
  { path: '/dashboard/settings/providers', label: '로그인 디자인', icon: <IconPalette /> },
  { path: '/dashboard/settings/coupon', label: '쿠폰 현황', icon: <IconTicket /> },
  { path: '/dashboard/settings/banner', label: '미니배너', icon: <IconFlag />, plus: true },
  { path: '/dashboard/settings/escalation', label: '에스컬레이션', icon: <IconTrending />, plus: true },
  { path: '/dashboard/settings/popup', label: '이탈 감지 팝업', icon: <IconBell />, plus: true },
  { path: '/dashboard/settings/kakao', label: '카카오 채널', icon: <IconChat />, plus: true },
  { path: '/dashboard/ai-reports', label: 'AI 보고서', icon: <IconSparkle />, plus: true },
];

const etcNavItems: NavItem[] = [
  { path: '/dashboard/billing', label: '플랜 & 결제', icon: <IconCreditCard /> },
  { path: '/dashboard/quickstart', label: '퀵스타트', icon: <IconSparkle /> },
  { path: '/dashboard/guide', label: '사용 가이드', icon: <IconHelp /> },
  { path: '/dashboard/faq', label: 'FAQ', icon: <IconClipboard /> },
  { path: '/dashboard/inquiries', label: '문의하기', icon: <IconChat /> },
];

const adminNavItems = [
  { path: '/supadmin', label: '대시보드', icon: <IconGrid /> },
  { path: '/supadmin/shops', label: '쇼핑몰 관리', icon: <IconBuilding /> },
  { path: '/supadmin/subscriptions', label: '구독/결제', icon: <IconCurrencyDollar /> },
  { path: '/supadmin/ai-reports', label: 'AI 보고서', icon: <IconSparkle /> },
  { path: '/supadmin/inquiries', label: '문의 관리', icon: <IconChat /> },
  { path: '/supadmin/monitoring', label: '시스템 모니터링', icon: <IconClipboard /> },
];

export const Layout: FC<LayoutProps> = ({ title, loggedIn, currentPath, isAdmin, isCafe24, children }) => {
  const isActive = (item: NavItem) =>
    item.path === '/dashboard'
      ? currentPath === '/dashboard'
      : currentPath?.startsWith(item.path) ?? false;

  const renderNavLink = (item: NavItem) => (
    <a href={item.path} class={isActive(item) ? 'active' : ''}>
      {item.icon} {item.label}
      {item.plus && <span class="nav-plus-badge">Plus</span>}
    </a>
  );

  const visibleSettingNavItems = settingNavItems;

  return (
  <html lang="ko">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>{title} - 번개가입</title>
      {/* 인라인 CSS 사유: (1) Workers에 static_assets 미설정으로 별도 CSS 파일 서빙 불가
          (2) Hono JSX가 CSS content 속성의 특수문자를 HTML 엔티티로 이스케이프하여 dangerouslySetInnerHTML 필수 (commit 4dd85a9) */}
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css');

        :root {
          --color-primary: #2563EB;
          --color-primary-light: #EFF6FF;
          --color-primary-hover: #1D4ED8;
          --color-bg: #F8FAFC;
          --color-sidebar-bg: #FFFFFF;
          --color-sidebar-border: #E2E8F0;
          --color-text: #1E293B;
          --color-text-secondary: #64748B;
          --color-card-bg: #FFFFFF;
          --color-card-border: #E2E8F0;
          --color-success: #059669;
          --color-warning: #F59E0B;
          --color-danger: #EF4444;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Pretendard', 'Segoe UI', sans-serif; background: #f8fafc; color: #1e293b; min-height: 100vh; }
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
        h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }
        h2 { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }

        .app { display: flex; min-height: 100vh; }

        /* ── Sidebar ─────────────────────────────── */
        .sidebar {
          width: 240px;
          background: linear-gradient(180deg, #f0f4ff 0%, #f8fafc 40%, #ffffff 100%);
          border-right: 1px solid #e2e8f0;
          color: #64748b;
          padding: 20px 0;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }
        .sidebar-logo {
          padding: 0 20px 16px;
          font-size: 18px;
          font-weight: 700;
          border-bottom: 1px solid #dbeafe;
          margin-bottom: 12px;
          color: #1e3a5f;
        }
        .sidebar-logo span { color: #2563eb; }
        .sidebar nav { flex: 1; }
        .sidebar nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          margin: 2px 8px;
          color: #475569;
          font-size: 14px;
          border-radius: 8px;
          transition: all 0.15s;
        }
        .sidebar nav a:hover { background: rgba(37,99,235,0.06); color: #1e3a5f; text-decoration: none; }
        .sidebar nav a.active {
          background: rgba(37,99,235,0.1);
          color: #2563eb;
          font-weight: 600;
          border-left: 3px solid #2563eb;
          padding-left: 9px;
        }
        .sidebar nav a svg { opacity: 0.6; }
        .sidebar nav a.active svg { opacity: 1; color: #2563eb; }
        .sidebar-footer {
          border-top: 1px solid #dbeafe;
          padding: 12px 20px;
          margin-top: auto;
        }
        .sidebar-footer a { color: #94a3b8; font-size: 13px; }

        /* ── Main content ────────────────────────── */
        .main { flex: 1; padding: 24px; max-width: 960px; background: #f8fafc; }
        .main h1 { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 16px; }

        /* ── Auth pages ──────────────────────────── */
        .auth-page { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8fafc; }
        .auth-card { background: #fff; border-radius: 12px; padding: 40px; width: 100%; max-width: 400px; border: 1px solid #e2e8f0; }
        .auth-card h1 { text-align: center; margin-bottom: 8px; }
        .auth-card p.sub { text-align: center; color: #64748b; margin-bottom: 24px; font-size: 14px; }

        /* ── Form ────────────────────────────────── */
        .form-group { margin-bottom: 16px; }
        .form-group label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #475569; }
        .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }

        /* ── Buttons ─────────────────────────────── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-primary { background: #2563eb; color: #fff; width: auto; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-sm { padding: 6px 12px; font-size: 12px; }
        .btn-danger { background: #ef4444; color: #fff; }
        .btn-danger:hover { background: #dc2626; }
        .btn-outline { background: transparent; border: 1px solid #d1d5db; color: #374151; }
        .btn-outline:hover { background: #f9fafb; border-color: #9ca3af; }

        /* ── Cards ───────────────────────────────── */
        .card {
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: none;
          padding: 24px;
          margin-bottom: 16px;
        }
        .card h2 { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 12px; }

        /* ── Table ───────────────────────────────── */
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th {
          text-align: left;
          padding: 10px 12px;
          background: #f8fafc;
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          border-bottom: 1px solid #e2e8f0;
        }
        td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; color: #374151; }
        tr:hover { background: #f8fafc; }

        /* ── Badges ──────────────────────────────── */
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }
        .badge-green { background: #ecfdf5; color: #059669; }
        .badge-yellow { background: #fffbeb; color: #d97706; }
        .badge-red { background: #fef2f2; color: #ef4444; }
        .badge-gray { background: #f1f5f9; color: #64748b; }
        .badge-blue { background: #eff6ff; color: #2563eb; }

        /* ── Alerts ──────────────────────────────── */
        .alert { padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
        .alert-info { background: #dbeafe; color: #1e40af; }
        .alert-warn { background: #fef3c7; color: #92400e; }
        .alert-error { background: #fee2e2; color: #991b1b; }

        /* ── Toggle switch ───────────────────────── */
        .provider-toggle { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid #f1f5f9; }
        .provider-toggle:last-child { border-bottom: none; }
        .toggle { position: relative; display: inline-block; width: 28px; height: 16px; flex-shrink: 0; }
        .toggle input { display: none; }
        .toggle-slider { position: absolute; inset: 0; background: #d1d5db; border-radius: 16px; cursor: pointer; transition: 0.3s; }
        .toggle-slider::before { content: ''; position: absolute; height: 12px; width: 12px; left: 2px; bottom: 2px; background: white; border-radius: 50%; transition: 0.3s; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
        .toggle input:checked + .toggle-slider { background: #2563eb; }
        .toggle input:checked + .toggle-slider::before { transform: translateX(12px); }

        /* ── Code block ──────────────────────────── */
        .code-block { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; font-family: 'SF Mono', Monaco, 'Fira Code', monospace; font-size: 13px; overflow-x: auto; position: relative; }
        .copy-btn { position: absolute; top: 8px; right: 8px; background: #334155; color: #e2e8f0; border: none; padding: 4px 10px; border-radius: 4px; font-size: 12px; cursor: pointer; }
        .copy-btn:hover { background: #475569; }

        /* ── Stat cards ──────────────────────────── */
        .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
        .stat-card {
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          padding: 20px;
        }
        .stat-card .label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em; }
        .stat-card .value { font-size: 28px; font-weight: 700; color: #1e293b; margin-top: 4px; }

        /* ── Empty state ─────────────────────────── */
        .empty-state { text-align: center; padding: 48px 20px; color: #94a3b8; }
        .empty-state p { font-size: 15px; margin-bottom: 16px; }

        /* ── Progress bar ────────────────────────── */
        .progress-bar { background: #e5e7eb; border-radius: 8px; height: 24px; overflow: hidden; position: relative; }
        .progress-bar-fill { height: 100%; border-radius: 8px; transition: width 0.3s; display: flex; align-items: center; padding: 0 8px; }
        .progress-bar-label { font-size: 11px; font-weight: 600; color: #fff; white-space: nowrap; }
        .progress-bar-outer { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }
        .progress-bar-name { font-size: 13px; font-weight: 600; min-width: 64px; }
        .progress-bar-value { font-size: 12px; color: #64748b; min-width: 60px; text-align: right; }

        /* ── Chart container ─────────────────────── */
        .chart-container { background: #fff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 16px; }
        .chart-container h3 { font-size: 16px; margin-bottom: 16px; }

        /* ── Filter controls ─────────────────────── */
        .filter-bar { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; align-items: center; }
        .filter-bar select, .filter-bar input[type="date"] { padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 13px; background: #fff; cursor: pointer; }
        .filter-bar select:focus, .filter-bar input[type="date"]:focus { outline: none; border-color: #2563eb; }

        /* ── Tab navigation ──────────────────────── */
        .tab-nav { display: flex; border-bottom: 2px solid #e5e7eb; margin-bottom: 24px; gap: 0; }
        .tab-nav a { padding: 10px 20px; font-size: 14px; font-weight: 600; color: #64748b; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all 0.15s; }
        .tab-nav a:hover { color: #1e293b; text-decoration: none; }
        .tab-nav a.active { color: #2563eb; border-bottom-color: #2563eb; }

        /* ── Alert banner ────────────────────────── */
        .alert-banner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .alert-banner .btn { flex-shrink: 0; }

        /* ── Plan cards ──────────────────────────── */
        .plan-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
        .plan-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 24px; text-align: center; transition: border-color 0.15s; }
        .plan-card.current { border-color: #2563eb; background: #eff6ff; }
        .plan-card h3 { font-size: 18px; margin-bottom: 4px; }
        .plan-card .price { font-size: 28px; font-weight: 700; margin: 12px 0; }
        .plan-card .price small { font-size: 14px; font-weight: 400; color: #64748b; }
        .plan-card ul { list-style: none; text-align: left; font-size: 13px; margin: 16px 0; }
        .plan-card ul li { padding: 4px 0; }
        .plan-card ul li::before { content: '✓ '; color: #22c55e; font-weight: 700; }

        /* ── Provider colors ─────────────────────── */
        .provider-google { background: #4285f4; }
        .provider-kakao { background: #fee500; }
        .provider-naver { background: #03c75a; }
        .provider-apple { background: #000000; }
        .provider-toss { background: #0064ff; }
        .provider-discord { background: #5865f2; }
        .provider-telegram { background: #26a5e4; }
        .provider-tiktok { background: #000000; }

        /* ── Provider preview ────────────────────── */
        .preview-area { border: 2px dashed #d1d5db; border-radius: 12px; padding: 32px; text-align: center; min-height: 120px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; }
        .preview-btn { display: inline-flex; align-items: center; gap: 8px; padding: 10px 20px; border-radius: 8px; font-size: 14px; font-weight: 600; color: #fff; border: none; cursor: default; }
        .preview-btn.kakao-btn { color: #191919; }

        /* ── Widget customization ────────────────── */
        .preset-card { border:2px solid #e5e7eb; border-radius:8px; padding:12px 8px; text-align:center; cursor:pointer; background:#fff; transition:all 0.2s; font-size:12px; }
        .preset-card:hover { border-color:#93c5fd; }
        .preset-card.active { border-color:#2563eb; background:#eff6ff; }
        .preset-card .preset-preview { font-size:11px; color:#64748b; margin-bottom:4px; }
        .align-btn { padding:6px 16px; border:1px solid #d1d5db; border-radius:6px; background:#fff; cursor:pointer; font-size:13px; transition:all 0.2s; }
        .align-btn:hover { border-color:#93c5fd; }
        .align-btn.active { background:#2563eb; color:#fff; border-color:#2563eb; }
        input[type=range] { -webkit-appearance:none; height:6px; background:#e5e7eb; border-radius:3px; outline:none; }
        input[type=range]::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:#2563eb; cursor:pointer; }
        input[type=range]:disabled { opacity:0.4; cursor:not-allowed; }
        .order-btn { background:none; border:1px solid #d1d5db; border-radius:4px; width:24px; height:24px; cursor:pointer; font-size:11px; color:#64748b; display:flex; align-items:center; justify-content:center; transition:all 0.15s; padding:0; }
        .order-btn:hover:not(:disabled) { background:#f1f5f9; border-color:#93c5fd; color:#2563eb; }
        .order-btn:disabled { opacity:0.3; cursor:not-allowed; }
        @media (max-width: 600px) {
          .preset-grid-2x2 { grid-template-columns: repeat(2, 1fr) !important; }
        }

        /* ── Mobile header & drawer ──────────────── */
        .mobile-header {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          color: #1e293b;
        }
        .mobile-logo { font-size: 16px; font-weight: 700; color: #1e293b; }
        .mobile-logo span { color: #1e293b; }
        .hamburger { background: none; border: none; cursor: pointer; display: flex; flex-direction: column; gap: 5px; padding: 4px; }
        .hamburger span { display: block; width: 22px; height: 2px; background: #64748b; border-radius: 2px; transition: all 0.2s; }
        .mobile-nav-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 100; }
        .mobile-nav-overlay.open { display: block; }
        .mobile-nav-drawer {
          position: fixed; top: 0; left: 0; bottom: 0; width: 240px;
          background: linear-gradient(180deg, #f0f4ff 0%, #f8fafc 40%, #ffffff 100%);
          border-right: 1px solid #e2e8f0;
          z-index: 101; transform: translateX(-100%); transition: transform 0.25s ease; padding: 20px 0;
          display: flex; flex-direction: column;
        }
        .mobile-nav-drawer.open { transform: translateX(0); }
        .mobile-nav-drawer .sidebar-logo { padding: 0 20px 16px; font-size: 18px; font-weight: 700; border-bottom: 1px solid #dbeafe; margin-bottom: 12px; color: #1e3a5f; }
        .mobile-nav-drawer .sidebar-logo span { color: #2563eb; }
        .mobile-nav-drawer nav a { display: flex; align-items: center; gap: 10px; padding: 8px 12px; margin: 2px 8px; color: #475569; font-size: 14px; border-radius: 8px; transition: all 0.15s; }
        .mobile-nav-drawer nav a:hover { background: rgba(37,99,235,0.06); color: #1e3a5f; text-decoration: none; }
        .mobile-nav-drawer nav a.active { background: rgba(37,99,235,0.1); color: #2563eb; font-weight: 600; border-left: 3px solid #2563eb; padding-left: 9px; }
        .mobile-nav-drawer .sidebar-footer { border-top: 1px solid #dbeafe; padding: 12px 20px; margin-top: auto; }
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
          .provider-layout { grid-template-columns: 1fr !important; }
        }

        /* ── Nav section label ───────────────────── */
        .nav-section-label {
          padding: 16px 20px 6px;
          font-size: 10px;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        /* ── Plus badge ──────────────────────────── */
        .nav-plus-badge {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 4px;
          background: #ec4899;
          color: #fff;
          margin-left: auto;
          font-weight: 600;
          flex-shrink: 0;
        }

        /* ── Site footer ─────────────────────────── */
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

        /* ── Toast notification ──────────────────── */
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.12);
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
      `}} />
    </head>
    <body>
      {loggedIn ? (
        <div class="app">
          {/* Mobile header (visible only on small screens) */}
          <div class="mobile-header">
            <div class="mobile-logo">⚡ 번개가입</div>
            <button class="hamburger" id="hamburger-btn" aria-label="메뉴 열기">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>

          {/* Mobile nav overlay + drawer */}
          <div class="mobile-nav-overlay" id="mobile-nav-overlay"></div>
          <div class="mobile-nav-drawer" id="mobile-nav-drawer">
            <div class="sidebar-logo">⚡ {isAdmin ? '번개가입 관리자' : '번개가입'}</div>
            <nav>
              {isAdmin ? (
                <>
                  {adminNavItems.map((item) => (
                    <a
                      href={item.path}
                      class={currentPath === item.path || (item.path !== '/supadmin' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                    >
                      {item.icon} {item.label}
                    </a>
                  ))}
                </>
              ) : (
                <>
                  {mainNavItems.map(renderNavLink)}
                  <div class="nav-section-label">설정</div>
                  {visibleSettingNavItems.map(renderNavLink)}
                  <div class="nav-section-label">기타</div>
                  {etcNavItems.map(renderNavLink)}
                </>
              )}
            </nav>
            <div class="sidebar-footer">
              {isAdmin
                ? <a href="/supadmin/logout" style="color:#ef4444">로그아웃</a>
                : !isCafe24 && <a href="/dashboard/logout">로그아웃</a>}
            </div>
          </div>

          <aside class="sidebar">
            <div class="sidebar-logo">⚡ {isAdmin ? '번개가입 관리자' : '번개가입'}</div>
            <nav>
              {isAdmin ? (
                <>
                  {adminNavItems.map((item) => (
                    <a
                      href={item.path}
                      class={currentPath === item.path || (item.path !== '/supadmin' && currentPath?.startsWith(item.path)) ? 'active' : ''}
                    >
                      {item.icon} {item.label}
                    </a>
                  ))}
                </>
              ) : (
                <>
                  {mainNavItems.map(renderNavLink)}
                  <div class="nav-section-label">설정</div>
                  {visibleSettingNavItems.map(renderNavLink)}
                  <div class="nav-section-label">기타</div>
                  {etcNavItems.map(renderNavLink)}
                </>
              )}
            </nav>
            {!isAdmin && (
              <div style="padding:0 8px;margin:8px 0 4px">
                <div style="padding:12px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;font-size:11px;color:#166534;line-height:1.5">
                  <strong>Coming Soon</strong><br />
                  AI 쇼핑몰 운영 자동화 — <strong>오팀장</strong>이 곧 찾아옵니다
                </div>
              </div>
            )}
            <div class="sidebar-footer">
              {isAdmin
                ? <a href="/supadmin/logout" style="color:#ef4444">로그아웃</a>
                : !isCafe24 && <a href="/dashboard/logout">로그아웃</a>}
            </div>
          </aside>
          <main class="main">
            {/* 홍보 배너 영역 */}
            {!isAdmin && <div id="promoBannerArea" style="margin-bottom:16px"></div>}

            {children}
            <footer class="site-footer" style="display:flex;gap:16px;align-items:center">
              <a href="/privacy">개인정보처리방침</a>
              <span style="color:#d1d5db">|</span>
              <a href="mailto:help@suparain.com">이메일 문의</a>
              <span style="color:#d1d5db">|</span>
              <a href="/dashboard/inquiries">문의하기</a>
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

        // 홍보 배너 로드
        (function() {
          var area = document.getElementById('promoBannerArea');
          if (!area) return;

          fetch('/api/dashboard/promo-banner', { credentials: 'same-origin' })
            .then(function(r) {
              if (!r.ok) return '';
              return r.text();
            })
            .then(function(html) {
              if (!html || !html.trim()) return;
              area.innerHTML = html;

              // 닫기 버튼 이벤트 바인딩
              var closeBtn = area.querySelector('[data-dismiss-banner]');
              if (closeBtn) {
                var bannerId = closeBtn.dataset.dismissBanner || 'default';
                // 이미 닫은 배너인지 확인
                if (localStorage.getItem('promo_banner_dismissed_' + bannerId)) {
                  area.style.display = 'none';
                  return;
                }
                closeBtn.addEventListener('click', function() {
                  localStorage.setItem('promo_banner_dismissed_' + bannerId, '1');
                  area.style.display = 'none';
                });
              }
            })
            .catch(function() {});
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

        // data-value attribute에서 값을 읽어 복사 (onclick 인라인에 민감값 노출 방지)
        function copyFromAttr(btn) {
          var text = btn.getAttribute('data-value') || '';
          copyText(text, btn);
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
