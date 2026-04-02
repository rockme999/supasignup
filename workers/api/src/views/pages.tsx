/**
 * Dashboard SSR page components.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';

// ─── Helper Components ──────────────────────────────────────

const providerColors: Record<string, string> = {
  google: '#f2f2f2',
  kakao: '#fee500',
  naver: '#03c75a',
  apple: '#000000',
  discord: '#5865f2',
  facebook: '#1877f2',
  x: '#000000',
  line: '#06c755',
  telegram: '#26a5e4',
  toss: '#0064ff',
  tiktok: '#000000',
};

const providerDisplayNames: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
  apple: 'Apple',
  discord: 'Discord',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  line: 'LINE',
  telegram: 'Telegram',
  toss: '토스',
  tiktok: 'TikTok',
};

function parseProviders(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

const ProgressBar: FC<{ label: string; value: number; max: number; color?: string }> = ({ label, value, max, color }) => {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const barColor = color || '#2563eb';
  return (
    <div class="progress-bar-outer">
      <span class="progress-bar-name">{label}</span>
      <div class="progress-bar" style="flex:1">
        <div class="progress-bar-fill" style={`width:${Math.max(percent, 2)}%;background:${barColor}`}>
          {percent >= 15 && <span class="progress-bar-label">{percent}%</span>}
        </div>
      </div>
      <span class="progress-bar-value">{value} ({percent}%)</span>
    </div>
  );
};

type DailyData = { day: string; action: string; cnt: number };

const LineChart: FC<{ data: DailyData[]; width?: number; height?: number }> = ({ data, width = 700, height = 200 }) => {
  if (data.length === 0) {
    return <div class="empty-state" style="padding:24px"><p>데이터가 없습니다.</p></div>;
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Aggregate by day
  const dayMap = new Map<string, { signup: number; login: number }>();
  for (const d of data) {
    if (!dayMap.has(d.day)) dayMap.set(d.day, { signup: 0, login: 0 });
    const entry = dayMap.get(d.day)!;
    if (d.action === 'signup') entry.signup += d.cnt;
    else if (d.action === 'login') entry.login += d.cnt;
  }

  const days = Array.from(dayMap.keys()).sort();
  const maxVal = Math.max(1, ...days.map(d => {
    const e = dayMap.get(d)!;
    return Math.max(e.signup, e.login);
  }));

  const xScale = (i: number) => padding.left + (days.length > 1 ? (i / (days.length - 1)) * chartW : chartW / 2);
  const yScale = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  const signupPoints = days.map((d, i) => `${xScale(i)},${yScale(dayMap.get(d)!.signup)}`).join(' ');
  const loginPoints = days.map((d, i) => `${xScale(i)},${yScale(dayMap.get(d)!.login)}`).join(' ');

  // Y-axis labels (5 ticks)
  const yTicks = [0, 1, 2, 3, 4].map(i => Math.round((maxVal / 4) * i));

  // X-axis labels (show every ~5th day)
  const xStep = Math.max(1, Math.floor(days.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style="width:100%;max-width:700px;height:auto">
      {/* Grid lines */}
      {yTicks.map(v => (
        <line x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#e5e7eb" stroke-width="1" />
      ))}
      {/* Y-axis labels */}
      {yTicks.map(v => (
        <text x={padding.left - 8} y={yScale(v) + 4} text-anchor="end" font-size="11" fill="#94a3b8">{v}</text>
      ))}
      {/* X-axis labels */}
      {days.map((d, i) => i % xStep === 0 ? (
        <text x={xScale(i)} y={height - 8} text-anchor="middle" font-size="10" fill="#94a3b8">{d.slice(5)}</text>
      ) : null)}
      {/* Lines */}
      <polyline points={signupPoints} fill="none" stroke="#2563eb" stroke-width="2" />
      <polyline points={loginPoints} fill="none" stroke="#22c55e" stroke-width="2" />
      {/* Dots */}
      {days.map((d, i) => (
        <circle cx={xScale(i)} cy={yScale(dayMap.get(d)!.signup)} r="3" fill="#2563eb" />
      ))}
      {days.map((d, i) => (
        <circle cx={xScale(i)} cy={yScale(dayMap.get(d)!.login)} r="3" fill="#22c55e" />
      ))}
      {/* Legend */}
      <rect x={width - 160} y={4} width="10" height="10" fill="#2563eb" rx="2" />
      <text x={width - 146} y={13} font-size="11" fill="#475569">가입</text>
      <rect x={width - 100} y={4} width="10" height="10" fill="#22c55e" rx="2" />
      <text x={width - 86} y={13} font-size="11" fill="#475569">로그인</text>
    </svg>
  );
};

// ─── Login / Register ────────────────────────────────────────

export const LoginPage: FC<{ error?: string }> = ({ error }) => (
  <Layout title="로그인" loggedIn={false}>
    <div class="auth-page" style="flex-direction:column">
      <div class="auth-card">
        <h1>⚡ 번개가입</h1>
        <p class="sub">관리자 대시보드 로그인</p>
        {error && <div class="alert alert-error">{error}</div>}
        <form id="loginForm">
          <div class="form-group">
            <label>이메일</label>
            <input type="email" name="email" required placeholder="admin@example.com" />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input type="password" name="password" required placeholder="8자 이상" />
          </div>
          <button type="submit" class="btn btn-primary">로그인</button>
        </form>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:#64748b">
          계정이 없으신가요? <a href="/dashboard/register">회원가입</a>
        </p>
        <script dangerouslySetInnerHTML={{__html: `
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            var btn = form.querySelector('button[type=submit]');
            const resp = await apiCall('POST', '/api/dashboard/auth/login', {
              email: form.email.value,
              password: form.password.value,
            }, btn);
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              showToast('error', data.error === 'rate_limited' ? '로그인 시도 횟수 초과. 5분 후 다시 시도하세요.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
            }
          });
        `}} />
      </div>
      <div style="margin-top:32px; text-align:center; font-size:11px; color:#94a3b8; line-height:1.8">
        <div>주식회사 수파레인 | 대표이사 임호빈 | 사업자등록번호 716-88-01081</div>
        <div>경기도 김포시 태장로 789 금광하이테크시티 465호</div>
        <div>전화 031-992-5988 | 이메일 help@suparain.com</div>
        <div><a href="/privacy" style="color:#94a3b8">개인정보처리방침</a></div>
      </div>
    </div>
  </Layout>
);

export const RegisterPage: FC<{ error?: string }> = ({ error }) => (
  <Layout title="회원가입" loggedIn={false}>
    <div class="auth-page">
      <div class="auth-card">
        <h1>⚡ 번개가입</h1>
        <p class="sub">관리자 계정 생성</p>
        {error && <div class="alert alert-error">{error}</div>}
        <form id="registerForm">
          <div class="form-group">
            <label>이름</label>
            <input type="text" name="name" required placeholder="운영자 이름" />
          </div>
          <div class="form-group">
            <label>이메일</label>
            <input type="email" name="email" required placeholder="admin@example.com" />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input type="password" name="password" required placeholder="8자 이상" minlength={8} />
          </div>
          <div class="form-group">
            <label>비밀번호 확인</label>
            <input type="password" name="password_confirm" required placeholder="비밀번호 재입력" minlength={8} />
          </div>
          <button type="submit" class="btn btn-primary">회원가입</button>
        </form>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:#64748b">
          이미 계정이 있으신가요? <a href="/dashboard/login">로그인</a>
        </p>
        <script dangerouslySetInnerHTML={{__html: `
          document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            if (form.password.value !== form.password_confirm.value) {
              showToast('error', '비밀번호가 일치하지 않습니다.');
              return;
            }
            var btn = form.querySelector('button[type=submit]');
            const resp = await apiCall('POST', '/api/dashboard/auth/register', {
              name: form.name.value,
              email: form.email.value,
              password: form.password.value,
            }, btn);
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              const messages = { email_exists: '이미 가입된 이메일입니다.', weak_password: '비밀번호는 8자 이상이어야 합니다.' };
              showToast('error', messages[data.error] || '회원가입 중 오류가 발생했습니다.');
            }
          });
        `}} />
      </div>
    </div>
  </Layout>
);

// ─── Dashboard Home ──────────────────────────────────────────

type HomeStats = {
  total_signups: number;
  total_logins: number;
  today_signups: number;
  month_signups: number;
  by_provider: Record<string, number>;
};

type HomeShop = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  plan: string;
  sso_configured: number;
  monthly_signups: number;
  coupon_enabled: boolean;
};

export const HomePage: FC<{
  shop: HomeShop | null;
  stats: HomeStats | null;
  isCafe24?: boolean;
}> = ({ shop, stats, isCafe24 }) => {
  // 앱 미설치 상태
  if (!shop) {
    return (
      <Layout title="대시보드" loggedIn currentPath="/dashboard" isCafe24={isCafe24}>
        <h1>대시보드</h1>
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:48px;margin-bottom:16px">📦</div>
          <h2 style="margin-bottom:8px">앱 설치를 기다리고 있습니다</h2>
          <p style="font-size:14px;color:#64748b;margin-bottom:8px">카페24 앱스토어에서 번개가입을 설치하면 자동으로 연결됩니다.</p>
          <p style="font-size:13px;color:#94a3b8">앱 설치 후 이 페이지를 새로고침 하거나, 카페24 쇼핑몰 관리자에서 번개가입 앱을 실행하세요.</p>
        </div>
      </Layout>
    );
  }

  const isPlus = shop.plan !== 'free';

  return (
    <Layout title="대시보드" loggedIn currentPath="/dashboard" isCafe24={isCafe24}>
      <h1>대시보드</h1>

      {/* SSO 미설정 경고 */}
      {!shop.sso_configured && (
        <div class="alert alert-warn alert-banner" style="margin-bottom:16px">
          <span>SSO 연동이 아직 설정되지 않았습니다. 설정하지 않으면 쇼핑몰 로그인 페이지에 번개가입 버튼이 표시되지 않습니다.</span>
          <a href="/dashboard/settings/sso-guide" class="btn btn-sm btn-outline" style="white-space:nowrap">SSO 설정 가이드</a>
        </div>
      )}

      {/* 쇼핑몰 요약 */}
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin-bottom:4px">{shop.shop_name || shop.mall_id}</h2>
            <p style="font-size:13px;color:#64748b">Mall ID: {shop.mall_id}</p>
          </div>
          <div style="display:flex;gap:8px;align-items:center">
            <span class={`badge ${isPlus ? 'badge-green' : 'badge-gray'}`}>{isPlus ? 'Plus' : 'Free'}</span>
            {!isPlus && (
              <a href="/dashboard/billing" class="btn btn-sm btn-outline" style="white-space:nowrap">업그레이드</a>
            )}
          </div>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">전체 가입</div>
          <div class="value">{(stats?.total_signups ?? 0).toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="label">전체 로그인</div>
          <div class="value">{(stats?.total_logins ?? 0).toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="label">오늘 가입</div>
          <div class="value">{stats?.today_signups ?? 0}</div>
        </div>
        <div class="stat-card">
          <div class="label">이번 달 가입</div>
          <div class="value">{stats?.month_signups ?? 0}</div>
        </div>
      </div>

      {stats && Object.keys(stats.by_provider).length > 0 && (
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <h2 style="margin-bottom:0">소셜별 가입 현황</h2>
            <a href="/dashboard/stats" style="font-size:13px">자세히 보기 →</a>
          </div>
          {Object.entries(stats.by_provider).map(([provider, count]) => (
            <ProgressBar
              label={providerDisplayNames[provider] || provider}
              value={count}
              max={stats.total_signups}
              color={providerColors[provider]}
            />
          ))}
        </div>
      )}

      {/* 빠른 바로가기 */}
      <div class="card">
        <h2 style="margin-bottom:16px">빠른 바로가기</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
          <a href="/dashboard/settings/providers" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">🎨</span>
            <span style="font-size:13px;font-weight:600">로그인 디자인</span>
          </a>
          <a href="/dashboard/settings/sso-guide" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">🔑</span>
            <span style="font-size:13px;font-weight:600">SSO 설정 가이드</span>
          </a>
          <a href="/dashboard/settings/coupon" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">🎟️</span>
            <span style="font-size:13px;font-weight:600">쿠폰 설정{shop.coupon_enabled ? ' ✓' : ''}</span>
          </a>
          <a href="/dashboard/stats" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">📊</span>
            <span style="font-size:13px;font-weight:600">통계 보기</span>
          </a>
          {isPlus && (
            <a href="/dashboard/ai-reports" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
              <span style="font-size:28px">🤖</span>
              <span style="font-size:13px;font-weight:600">AI 보고서</span>
            </a>
          )}
        </div>
      </div>
    </Layout>
  );
};

// ─── Shop types (used by SsoGuidePage, ProvidersPage, etc.) ──

type ShopDetail = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  client_id: string;
  client_secret: string;
  platform: string;
  plan: string;
  enabled_providers: string;
  created_at: string;
  sso_configured: number;
};

// NOTE: ShopsPage, ShopNewPage, ShopDetailPage removed (단일 쇼핑몰 구조 전환)

// ─── SSO Guide Page ──────────────────────────────────────────

export const SsoGuidePage: FC<{
  shop: ShopDetail;
  clientId: string;
  baseUrl: string;
  isCafe24?: boolean;
}> = ({ shop, clientId, baseUrl, isCafe24 }) => (
  <Layout title="SSO 설정 가이드" loggedIn currentPath="/dashboard/settings/sso-guide" isCafe24={isCafe24}>
    <h1>SSO 설정 가이드</h1>

    <div class="alert alert-info">
      카페24 쇼핑몰 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>SSO 로그인 연동 관리</strong> &gt; 연동 등록에서 아래 값을 입력하세요.
    </div>

    <div class="card" style="padding:0; overflow:hidden">
      <div style="padding:16px 24px; background:#f8fafc; border-bottom:1px solid #e5e7eb">
        <h2 style="margin:0; font-size:16px">기본 설정</h2>
      </div>
      <div style="overflow-x:auto">
        <table style="margin:0; border-collapse:collapse; width:100%">
          <tbody>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="width:180px; padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                사용 여부
              </th>
              <td style="padding:14px 20px">
                <label style="font-size:14px; cursor:pointer"><input type="radio" checked disabled style="margin-right:4px" /> <strong>사용함</strong></label>
                <label style="font-size:14px; margin-left:16px; color:#94a3b8; cursor:default"><input type="radio" disabled style="margin-right:4px" /> 사용안함</label>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                연동 서비스명 <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value="번개가입" readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:280px; background:#f9fafb; color:#374151" />
                  <button class="copy-btn" onclick="copyText('번개가입',this)" style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                Client ID <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value={clientId} readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:420px; background:#f9fafb; color:#374151; font-family:monospace" />
                  <button class="copy-btn" onclick={`copyText('${clientId}',this)`} style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                Client Secret <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value={shop.client_secret} readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:420px; background:#f9fafb; color:#374151; font-family:monospace" />
                  <button class="copy-btn" onclick={`copyText('${shop.client_secret}',this)`} style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                Authorize Redirect URL <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value={`${baseUrl}/oauth/authorize`} readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:420px; background:#f9fafb; color:#374151; font-family:monospace" />
                  <button class="copy-btn" onclick={`copyText('${baseUrl}/oauth/authorize',this)`} style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                Access Token Return API <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value={`${baseUrl}/oauth/token`} readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:420px; background:#f9fafb; color:#374151; font-family:monospace" />
                  <button class="copy-btn" onclick={`copyText('${baseUrl}/oauth/token',this)`} style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #e5e7eb">
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:middle; text-align:left; border-right:1px solid #e5e7eb">
                User info Return API <span style="color:#ef4444; font-size:11px; font-weight:700">필수</span>
              </th>
              <td style="padding:14px 20px">
                <div style="display:flex; align-items:center; gap:8px">
                  <input type="text" value={`${baseUrl}/oauth/userinfo`} readonly style="padding:8px 12px; border:1px solid #d1d5db; border-radius:6px; font-size:14px; width:420px; background:#f9fafb; color:#374151; font-family:monospace" />
                  <button class="copy-btn" onclick={`copyText('${baseUrl}/oauth/userinfo',this)`} style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
                </div>
              </td>
            </tr>
            <tr>
              <th style="padding:14px 20px; background:#f8fafc; font-size:13px; font-weight:600; color:#374151; vertical-align:top; text-align:left; border-right:1px solid #e5e7eb">
                약관동의 사전 진행 여부
              </th>
              <td style="padding:14px 20px">
                <label style="font-size:13px; color:#475569; cursor:pointer; display:flex; align-items:flex-start; gap:6px">
                  <input type="checkbox" checked disabled style="margin-top:2px" />
                  사전에 연동 서비스 회원 대상으로 쇼핑몰 이용약관과 개인정보 수집 및 이용 동의가 포함된 추가 정보 입력이 완료되어 추가 팝업 노출을 생략합니다.
                </label>
                <p style="font-size:12px; color:#22c55e; margin-top:8px">* 체크 권장 — 소셜 로그인 시 추가 팝업을 생략하여 UX가 개선됩니다.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2>설정 방법</h2>
      <ol style="padding-left:20px; font-size:14px; line-height:2">
        <li>카페24 쇼핑몰 관리자에서 <strong>쇼핑몰 설정 &gt; 고객 설정 &gt; SSO 로그인 연동 관리</strong>로 이동</li>
        <li><strong>SSO 로그인 연동 등록</strong> 버튼 클릭</li>
        <li>위 표의 각 항목 옆 <span style="display:inline-block; background:#2563eb; color:#fff; padding:1px 8px; border-radius:4px; font-size:12px">복사</span> 버튼으로 값을 복사하여 카페24 입력란에 붙여넣기</li>
        <li><strong>저장</strong> 클릭</li>
        <li>쇼핑몰 로그인 페이지에서 번개가입 버튼이 나타나는지 확인</li>
      </ol>
    </div>

    <div style="margin-top:16px">
      <a href="/dashboard" class="btn btn-outline btn-sm">대시보드로 돌아가기</a>
    </div>
  </Layout>
);

// ─── Stats Page ─────────────────────────────────────────────

type FunnelEventRow = { event_type: string; cnt: number };

type StatsPageProps = {
  stats: HomeStats;
  daily: DailyData[];
  shops: { shop_id: string; shop_name: string }[];
  currentShopId: string | null;
  currentPeriod: string;
  funnelData?: FunnelEventRow[];
  isCafe24?: boolean;
};

export const StatsPage: FC<StatsPageProps> = ({ stats, daily, shops, currentShopId, currentPeriod, funnelData, isCafe24 }) => {
  const periodOptions = [
    { value: '', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: '7d', label: '최근 7일' },
    { value: '30d', label: '최근 30일' },
    { value: 'month', label: '이번 달' },
  ];

  return (
    <Layout title="통합 통계" loggedIn currentPath="/dashboard/stats" isCafe24={isCafe24}>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <h1 style="margin-bottom:0">통합 통계</h1>
        <div style="margin-left:auto">
          <a href="/api/dashboard/stats/export" class="btn btn-outline btn-sm" download>CSV 내보내기</a>
        </div>
      </div>

      <div class="filter-bar">
        <select id="shopFilter" onchange="applyFilters()">
          <option value="">전체 쇼핑몰</option>
          {shops.map(s => (
            <option value={s.shop_id} selected={currentShopId === s.shop_id}>{s.shop_name || s.shop_id}</option>
          ))}
        </select>
        <select id="periodFilter" onchange="applyFilters()">
          {periodOptions.map(opt => (
            <option value={opt.value} selected={currentPeriod === opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">가입</div>
          <div class="value">{stats.total_signups.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="label">로그인</div>
          <div class="value">{stats.total_logins.toLocaleString()}</div>
        </div>
        <div class="stat-card">
          <div class="label">오늘 가입</div>
          <div class="value">{stats.today_signups}</div>
        </div>
        <div class="stat-card">
          <div class="label">이번 달 가입</div>
          <div class="value">{stats.month_signups}</div>
        </div>
      </div>

      {Object.keys(stats.by_provider).length > 0 && (
        <div class="card">
          <h2>소셜별 가입 비율</h2>
          {Object.entries(stats.by_provider).map(([provider, count]) => (
            <ProgressBar
              label={providerDisplayNames[provider] || provider}
              value={count}
              max={stats.total_signups}
              color={providerColors[provider]}
            />
          ))}
        </div>
      )}

      <div class="chart-container">
        <h3>일별 추이</h3>
        <LineChart data={daily} />
      </div>

      {/* ─── 퍼널 차트 (쇼핑몰 선택 시만 표시) ─── */}
      {currentShopId && funnelData !== undefined && (() => {
        const counts: Record<string, number> = {};
        for (const row of funnelData) counts[row.event_type] = row.cnt;

        const steps = [
          { key: 'banner_show',     label: '배너 노출',   color: '#bfdbfe' },
          { key: 'banner_click',    label: '배너 클릭',   color: '#93c5fd' },
          { key: 'popup_show',      label: '팝업 노출',   color: '#60a5fa' },
          { key: 'popup_signup',    label: '팝업 가입',   color: '#3b82f6' },
          { key: 'signup_complete', label: '가입 완료',   color: '#1d4ed8' },
        ];

        const maxCnt = Math.max(1, ...steps.map(s => counts[s.key] ?? 0));

        const bannerShow  = counts['banner_show']   ?? 0;
        const bannerClick = counts['banner_click']  ?? 0;
        const popupSignup = counts['popup_signup']  ?? 0;
        const signupDone  = counts['signup_complete'] ?? 0;

        const bannerCtr = bannerShow  > 0 ? Math.round((bannerClick / bannerShow) * 100)  : 0;
        const popupCvr  = bannerClick > 0 ? Math.round((popupSignup / bannerClick) * 100) : 0;
        const overallCvr = bannerShow > 0 ? Math.round((signupDone  / bannerShow)  * 100) : 0;

        return (
          <div class="card" style="margin-top:16px">
            <h3 style="margin-bottom:16px">퍼널 분석 <span style="font-size:12px;color:#94a3b8;font-weight:400">(최근 7일)</span></h3>

            {funnelData.length === 0 ? (
              <div class="empty-state"><p>퍼널 이벤트 데이터가 없습니다.</p></div>
            ) : (
              <div>
                {steps.map(step => {
                  const val = counts[step.key] ?? 0;
                  const barPct = Math.max(Math.round((val / maxCnt) * 100), val > 0 ? 2 : 0);
                  return (
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                      <span style="width:84px;font-size:13px;color:#475569;flex-shrink:0">{step.label}</span>
                      <div style="flex:1;background:#f1f5f9;border-radius:4px;height:24px;overflow:hidden">
                        <div style={`width:${barPct}%;background:${step.color};height:100%;border-radius:4px;transition:width .3s`}></div>
                      </div>
                      <span style="width:52px;text-align:right;font-size:13px;font-weight:600;color:#1e293b">{val.toLocaleString()}</span>
                    </div>
                  );
                })}

                <div style="border-top:1px solid #f1f5f9;margin-top:12px;padding-top:12px;display:flex;gap:24px;flex-wrap:wrap">
                  <div style="font-size:12px;color:#64748b">
                    배너 CTR <strong style="color:#1e293b">{bannerCtr}%</strong>
                  </div>
                  <div style="font-size:12px;color:#64748b">
                    팝업 CVR <strong style="color:#1e293b">{popupCvr}%</strong>
                  </div>
                  <div style="font-size:12px;color:#64748b">
                    전체 전환율 <strong style="color:#1d4ed8">{overallCvr}%</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <script dangerouslySetInnerHTML={{__html: `
        function applyFilters() {
          const shop = document.getElementById('shopFilter').value;
          const period = document.getElementById('periodFilter').value;
          const params = new URLSearchParams();
          if (shop) params.set('shop_id', shop);
          if (period) params.set('period', period);
          const qs = params.toString();
          window.location.href = '/dashboard/stats' + (qs ? '?' + qs : '');
        }
      `}} />
    </Layout>
  );
};

// ─── Billing Page ───────────────────────────────────────────

type BillingShop = {
  shop_id: string;
  shop_name: string;
  plan: string;
  monthly_signups: number;
  usage_percent: number | null;
  needs_upgrade: boolean;
  is_over_limit: boolean;
};

type BillingPageProps = {
  billingShops: BillingShop[];
  month: string;
  shops: { shop_id: string; shop_name: string; mall_id: string }[];
  currentPlan: string;
  isCafe24?: boolean;
};

export const BillingPage: FC<BillingPageProps> = ({ billingShops, month, shops, currentPlan, isCafe24 }) => {
  return (
    <Layout title="플랜/과금" loggedIn currentPath="/dashboard/billing" isCafe24={isCafe24}>
      <h1>플랜/과금</h1>

      <div class="card">
        <h2>{month} 가입 현황</h2>

        {billingShops.length === 0 ? (
          <div class="empty-state">
            <p>등록된 쇼핑몰이 없습니다.</p>
          </div>
        ) : (
          <div style="overflow-x:auto">
            <table style="margin-top:4px">
              <thead><tr><th>쇼핑몰</th><th>플랜</th><th>이번 달 가입</th></tr></thead>
              <tbody>
                {billingShops.map((shop) => (
                  <tr>
                    <td><a href={`/dashboard/shops/${shop.shop_id}`}>{shop.shop_name || shop.shop_id}</a></td>
                    <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : 'Plus'}</span></td>
                    <td>{shop.monthly_signups} <span style="color:#94a3b8;font-size:12px">건</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div id="plans">
        <h2 style="margin: 24px 0 16px">플랜 비교</h2>
        <div class="plan-grid">
          <div class={`plan-card${currentPlan === 'free' ? ' current' : ''}`}>
            <h3>Free</h3>
            <div class="price">₩0<small>/월</small></div>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 6종</li>
              <li>기본 통계</li>
              <li>이메일 지원</li>
            </ul>
            {currentPlan === 'free' && <span class="badge badge-green">현재 플랜</span>}
          </div>
          <div class={`plan-card${currentPlan === 'monthly' ? ' current' : ''}`}>
            <h3>Plus 월간</h3>
            <div class="price">₩6,900<small>/월</small></div>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 6종</li>
              <li>쿠폰 자동 지급</li>
              <li>멀티 쿠폰 설정</li>
              <li>브랜딩 제거</li>
              <li>우선 지원</li>
            </ul>
            {currentPlan === 'monthly'
              ? <span class="badge badge-green">현재 플랜</span>
              : <button class="btn btn-primary btn-sm subscribe-btn" data-plan="monthly">Plus 월간 전환</button>
            }
          </div>
          <div class={`plan-card${currentPlan === 'yearly' ? ' current' : ''}`}>
            <h3>Plus 연간</h3>
            <div class="price">₩79,000<small>/년</small></div>
            <p style="font-size:12px;color:#22c55e;margin-bottom:8px">월 ₩6,584 (약 5% 할인)</p>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 6종</li>
              <li>쿠폰 자동 지급</li>
              <li>멀티 쿠폰 설정</li>
              <li>브랜딩 제거</li>
              <li>우선 지원</li>
            </ul>
            {currentPlan === 'yearly'
              ? <span class="badge badge-green">현재 플랜</span>
              : <button class="btn btn-primary btn-sm subscribe-btn" data-plan="yearly">Plus 연간 전환</button>
            }
          </div>
        </div>
      </div>

      {shops.length > 0 && billingShops.some(s => s.plan === 'free') && (
        <div class="card" style="margin-top:16px">
          <h2>결제할 쇼핑몰 선택</h2>
          <div class="form-group">
            <select id="billingShopSelect">
              {billingShops.filter(s => s.plan === 'free').map(s => (
                <option value={s.shop_id}>{s.shop_name || s.shop_id}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <script dangerouslySetInnerHTML={{__html: `
        document.querySelectorAll('.subscribe-btn').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            var shopSelect = document.getElementById('billingShopSelect');
            if (!shopSelect) { showToast('warn', '등록된 쇼핑몰이 없습니다.'); return; }
            var shopId = shopSelect.value;
            var plan = this.dataset.plan;
            var btnEl = this;
            var popup = window.open('about:blank', 'cafe24_payment', 'width=1280,height=680,scrollbars=yes');
            btnEl.disabled = true;
            btnEl.textContent = '처리 중...';
            try {
              var resp = await fetch('/api/dashboard/billing/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ plan: plan, shop_id: shopId })
              });
              if (resp.ok) {
                var data = await resp.json();
                var subId = data.subscription_id;
                if (popup && !popup.closed) { popup.location.href = data.confirmation_url; }
                else { window.location.href = data.confirmation_url; return; }

                var checkPopup = setInterval(function() {
                  if (!popup || popup.closed) {
                    clearInterval(checkPopup);
                    fetch('/api/dashboard/billing/status/' + subId, { credentials: 'same-origin' })
                      .then(function(r) { return r.json(); })
                      .then(function(s) {
                        if (s.status === 'active') {
                          location.reload();
                        } else {
                          btnEl.disabled = false;
                          btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
                        }
                      })
                      .catch(function() {
                        btnEl.disabled = false;
                        btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
                      });
                  }
                }, 1000);
              } else {
                var err = await resp.json();
                showToast('error', err.message || '결제 주문 생성에 실패했습니다.');
                if (popup && !popup.closed) popup.close();
                btnEl.disabled = false;
                btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
              }
            } catch(e) {
              showToast('error', '오류: ' + e.message);
              if (popup && !popup.closed) popup.close();
              btnEl.disabled = false;
              btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
            }
          });
        });
      `}} />

    </Layout>
  );
};

// ─── Provider Management Page ───────────────────────────────

const DEFAULT_WIDGET_STYLE = {
  preset: 'default',
  buttonWidth: 280,
  buttonHeight: 44,
  buttonGap: 8,
  borderRadius: 10,
  align: 'center',
  buttonLabel: '{name}로 시작하기',
  showIcon: true,
  iconGap: 8,
  paddingLeft: 16,
  showTitle: true,
  showPoweredBy: true,
};

type WidgetStyle = {
  preset: string;
  buttonWidth: number;
  buttonHeight?: number;
  buttonGap: number;
  borderRadius: number;
  align: string;
  buttonLabel?: string;
  showIcon?: boolean;
  iconGap?: number;
  paddingLeft?: number;
  showTitle?: boolean;
  showPoweredBy?: boolean;
};

export const ProvidersPage: FC<{
  shop: ShopDetail;
  baseUrl: string;
  isCafe24?: boolean;
  widgetStyle?: WidgetStyle;
}> = ({ shop, baseUrl, isCafe24, widgetStyle }) => {
  const providers = parseProviders(shop.enabled_providers);
  const allProviders = ['google', 'kakao', 'naver', 'apple', 'discord', 'telegram'];
  const futureProviders = ['facebook', 'x', 'line', 'toss', 'tiktok'];
  const ws = widgetStyle ?? DEFAULT_WIDGET_STYLE;

  return (
    <Layout title="소셜 프로바이더" loggedIn currentPath="/dashboard/settings/providers" isCafe24={isCafe24}>
      <h1>소셜 프로바이더</h1>

      <div class="provider-layout" style="display:grid; grid-template-columns:280px 1fr; gap:16px; align-items:start">
      <div class="card" style="margin-bottom:0">
        <h2 style="font-size:15px">프로바이더</h2>
        <form id="providerForm" data-shop-id={shop.shop_id}>
          {allProviders.map((p) => (
            <div class="provider-toggle" data-provider={p}>
              <label class="toggle">
                <input type="checkbox" name="providers" value={p} checked={providers.includes(p)} />
                <span class="toggle-slider"></span>
              </label>
              <span style={`font-weight:600;display:inline-flex;align-items:center;gap:8px`}>
                <span style={`display:inline-block;width:12px;height:12px;border-radius:50%;background:${providerColors[p]}`}></span>
                {providerDisplayNames[p]}
              </span>
              <div style="margin-left:auto; display:flex; gap:2px">
                <button class="order-btn" data-provider={p} data-dir="up" type="button">▲</button>
                <button class="order-btn" data-provider={p} data-dir="down" type="button">▼</button>
              </div>
            </div>
          ))}

          <h3 style="margin-top:24px;margin-bottom:12px;font-size:14px;color:#64748b">향후 지원 예정</h3>
          {futureProviders.map((p) => (
            <div class="provider-toggle" style="opacity:0.5">
              <label class="toggle">
                <input type="checkbox" disabled />
                <span class="toggle-slider" style="cursor:not-allowed"></span>
              </label>
              <span style="font-weight:600;display:inline-flex;align-items:center;gap:8px">
                <span style={`display:inline-block;width:12px;height:12px;border-radius:50%;background:${providerColors[p]}`}></span>
                {providerDisplayNames[p]}
                <span class="badge badge-gray">준비 중</span>
              </span>
            </div>
          ))}
        </form>
        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            var form = document.getElementById('providerForm');

            // 현재 활성 프로바이더 순서를 DOM에서 읽어 반환
            function getOrderedActiveProviders() {
              return [...form.querySelectorAll('.provider-toggle')].filter(function(row) {
                var cb = row.querySelector('input[name=providers]');
                return cb && cb.checked;
              }).map(function(row) { return row.dataset.provider; });
            }

            // 순서 버튼 활성화 상태 업데이트
            function updateOrderButtons() {
              var activeRows = [...form.querySelectorAll('.provider-toggle')].filter(function(row) {
                var cb = row.querySelector('input[name=providers]');
                return cb && cb.checked;
              });
              form.querySelectorAll('.order-btn').forEach(function(btn) {
                btn.disabled = true;
              });
              activeRows.forEach(function(row, idx) {
                var upBtn = row.querySelector('.order-btn[data-dir="up"]');
                var downBtn = row.querySelector('.order-btn[data-dir="down"]');
                if (upBtn) upBtn.disabled = idx === 0;
                if (downBtn) downBtn.disabled = idx === activeRows.length - 1;
              });
            }

            // 프로바이더 저장 (순서 포함)
            async function saveProviders() {
              var ordered = getOrderedActiveProviders();
              var shopId = form.dataset.shopId;
              var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/providers', { providers: ordered });
              if (resp.ok) { showToast('success', '저장되었습니다.'); }
              else { var data = await resp.json(); showToast('error', data.error || '저장 실패'); }
              return resp.ok;
            }

            // 토글 change 핸들러
            form.querySelectorAll('input[name=providers]').forEach(function(cb) {
              cb.addEventListener('change', async function() {
                var checked = getOrderedActiveProviders();
                if (checked.length === 0) {
                  cb.checked = true;
                  showToast('warn', '최소 1개의 프로바이더를 활성화해야 합니다.');
                  updateOrderButtons();
                  return;
                }
                var ok = await saveProviders();
                if (!ok) { cb.checked = !cb.checked; }
                updateOrderButtons();
                if (window.renderProviderPreview) { setTimeout(window.renderProviderPreview, 50); }
              });
            });

            // ▲/▼ 버튼 클릭 핸들러
            form.addEventListener('click', async function(e) {
              var btn = e.target.closest('.order-btn');
              if (!btn) return;
              var dir = btn.dataset.dir;
              var providerName = btn.dataset.provider;

              var allRows = [...form.querySelectorAll('.provider-toggle')];
              var activeRows = allRows.filter(function(row) {
                var cb = row.querySelector('input[name=providers]');
                return cb && cb.checked;
              });
              var currentRow = form.querySelector('.provider-toggle[data-provider="' + providerName + '"]');
              var idx = activeRows.indexOf(currentRow);
              if (idx === -1) return;

              if (dir === 'up' && idx > 0) {
                var prevRow = activeRows[idx - 1];
                prevRow.parentNode.insertBefore(currentRow, prevRow);
              } else if (dir === 'down' && idx < activeRows.length - 1) {
                var nextRow = activeRows[idx + 1];
                nextRow.parentNode.insertBefore(nextRow, currentRow);
              } else {
                return;
              }

              updateOrderButtons();
              if (window.renderProviderPreview) { window.renderProviderPreview(); }
              await saveProviders();
            });

            // 초기 버튼 상태 설정
            updateOrderButtons();
          })();
        `}} />
      </div>

      <div>
      {/* Widget preview */}
      <div class="card">
        <h2>위젯 미리보기</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:16px">쇼핑몰에 표시될 소셜 로그인 버튼의 실제 모습입니다.</p>
        <div id="previewFrame" style="background:#f8fafc; border:2px solid #e5e7eb; border-radius:12px; padding:32px; min-height:200px; display:flex; align-items:center; justify-content:center;">
          <div id="previewButtons" style="display:flex; flex-direction:column; align-items:center;"></div>
        </div>
      </div>

      {/* Widget design settings */}
      <div class="card">
        <h2>위젯 디자인</h2>

        {/* Preset cards */}
        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:20px" class="preset-grid-2x2">
          <button class="preset-card" data-preset="default" type="button">
            <div class="preset-preview">컬러 버튼</div>
            <span>기본</span>
          </button>
          <button class="preset-card" data-preset="mono" type="button">
            <div class="preset-preview">흑백</div>
            <span>모노톤</span>
          </button>
          <button class="preset-card" data-preset="outline" type="button">
            <div class="preset-preview">테두리</div>
            <span>호버 채움</span>
          </button>
          <button class="preset-card" data-preset="outline-mono" type="button">
            <div class="preset-preview">테두리 흑백</div>
            <span>호버 채움</span>
          </button>
          <button class="preset-card" data-preset="icon-only" type="button">
            <div class="preset-preview">아이콘만</div>
            <span>아이콘</span>
          </button>
        </div>

        {/* Detail sliders */}
        <div style="display:grid; gap:16px">
          <div>
            <div class="provider-toggle" style="border:none; padding:0">
              <label class="toggle">
                <input type="checkbox" id="showTitleToggle" checked={ws.showTitle !== false} />
                <span class="toggle-slider"></span>
              </label>
              <label style="font-size:13px; font-weight:600; color:#475569; cursor:pointer">상단 타이틀 표시</label>
              <span style="font-size:11px; color:#94a3b8; margin-left:4px">간편 로그인</span>
            </div>
          </div>
          <div>
            <div class="provider-toggle" style="border:none; padding:0">
              <label class="toggle">
                <input type="checkbox" id="showPoweredByToggle" checked={ws.showPoweredBy !== false} />
                <span class="toggle-slider"></span>
              </label>
              <label style="font-size:13px; font-weight:600; color:#475569; cursor:pointer">하단 브랜딩 표시</label>
              <span style="font-size:11px; color:#94a3b8; margin-left:4px">powered by 번개가입</span>
              {shop.plan === 'free' && <span class="badge badge-gray" style="margin-left:4px">무료 플랜 필수</span>}
            </div>
          </div>
          <div>
            <div class="provider-toggle" style="border:none; padding:0">
              <label class="toggle">
                <input type="checkbox" id="showIconToggle" checked={ws.showIcon !== false} />
                <span class="toggle-slider"></span>
              </label>
              <label style="font-size:13px; font-weight:600; color:#475569; cursor:pointer">버튼에 아이콘 표시</label>
            </div>
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:block; margin-bottom:6px">버튼 문구</label>
            <div style="display:flex; gap:8px; align-items:center">
              <select id="labelPreset" style="padding:6px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; flex:1">
                <option value="{name}로 시작하기">{'{name}'}로 시작하기</option>
                <option value="{name}로 로그인">{'{name}'}로 로그인</option>
                <option value="{name}로 계속하기">{'{name}'}로 계속하기</option>
                <option value="{name} 로그인">{'{name}'} 로그인</option>
                <option value="custom">직접 입력</option>
              </select>
            </div>
            <input type="text" id="labelCustom" placeholder="예: {name}로 시작하기 ({name}=프로바이더명)" style="display:none; margin-top:8px; padding:6px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; width:100%" value={ws.buttonLabel} />
            <p style="font-size:11px; color:#94a3b8; margin-top:4px">{'{name}'} 은 프로바이더명으로 대체됩니다</p>
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:block; margin-bottom:4px">정렬</label>
            <div style="display:flex; gap:8px; margin-top:4px">
              <button class="align-btn" data-align="left" type="button">왼쪽</button>
              <button class="align-btn" data-align="center" type="button">가운데</button>
              <button class="align-btn" data-align="right" type="button">오른쪽</button>
            </div>
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              버튼 너비 <span id="widthValue">{ws.buttonWidth}px</span>
            </label>
            <input type="range" id="btnWidth" min="120" max="500" value={String(ws.buttonWidth)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              버튼 높이 <span id="heightValue">{ws.buttonHeight ?? 44}px</span>
            </label>
            <input type="range" id="btnHeight" min="32" max="60" value={String(ws.buttonHeight ?? 44)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              버튼 간격 <span id="gapValue">{ws.buttonGap}px</span>
            </label>
            <input type="range" id="btnGap" min="0" max="24" value={String(ws.buttonGap)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              모서리 둥글기 <span id="radiusValue">{ws.borderRadius}px</span>
            </label>
            <input type="range" id="btnRadius" min="0" max="30" value={String(ws.borderRadius)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              아이콘-텍스트 간격 <span id="iconGapValue">{ws.showIcon !== false ? (ws as any).iconGap ?? 8 : 8}px</span>
            </label>
            <input type="range" id="btnIconGap" min="0" max="100" value={String((ws as any).iconGap ?? 8)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              왼쪽 여백 <span id="paddingLeftValue">{(ws as any).paddingLeft ?? 16}px</span>
            </label>
            <input type="range" id="btnPaddingLeft" min="0" max="150" value={String((ws as any).paddingLeft ?? 16)} style="width:100%" />
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:12px">
          <button id="resetStyleBtn" type="button" style="padding:8px 16px; font-size:13px; color:#64748b; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer">기본값으로 되돌리기</button>
          <button id="saveStyleBtn" type="button" disabled style="padding:8px 24px; font-size:13px; color:#fff; background:#2563eb; border:none; border-radius:6px; cursor:pointer; font-weight:600; opacity:0.5">디자인 저장</button>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          var widgetStyle = ${JSON.stringify(ws)};

          var providerColors = ${JSON.stringify(providerColors)};
          var providerNames = ${JSON.stringify(Object.fromEntries(Object.entries(providerDisplayNames).map(([k, v]) => [k, v])))};
          var providerTextColors = { kakao:'#191919', naver:'#fff', google:'#1f1f1f', apple:'#fff', discord:'#fff', facebook:'#fff', x:'#fff', line:'#fff', telegram:'#fff' };

          var style = {
            preset: widgetStyle.preset,
            buttonWidth: widgetStyle.buttonWidth,
            buttonHeight: widgetStyle.buttonHeight || 44,
            buttonGap: widgetStyle.buttonGap,
            borderRadius: widgetStyle.borderRadius,
            align: widgetStyle.align,
            buttonLabel: widgetStyle.buttonLabel || '{name}로 시작하기',
            showIcon: widgetStyle.showIcon !== false,
            iconGap: widgetStyle.iconGap || 8,
            paddingLeft: widgetStyle.paddingLeft || 16,
            showTitle: widgetStyle.showTitle !== false,
            showPoweredBy: widgetStyle.showPoweredBy !== false
          };
          var shopPlan = '${shop.plan}';

          var providerIcons = ${JSON.stringify(Object.fromEntries(
            ['google','kakao','naver','apple','discord','facebook','x','line','telegram'].map(p => {
              const info = { google: '<svg viewBox="0 0 48 48" width="16" height="16"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59A14.5 14.5 0 0 1 9.5 24c0-1.59.28-3.14.76-4.59l-7.98-6.19A23.99 23.99 0 0 0 0 24c0 3.77.9 7.35 2.56 10.52l7.97-5.93z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 5.93C6.51 42.62 14.62 48 24 48z"/></svg>', kakao: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#191919" d="M12 3c5.8 0 10.5 3.66 10.5 8.17 0 4.52-4.7 8.18-10.5 8.18-.63 0-1.25-.04-1.85-.12l-3.69 2.52c-.23.16-.54-.04-.47-.31l.88-3.3C3.84 16.46 1.5 14.02 1.5 11.17 1.5 6.66 6.2 3 12 3z"/></svg>', naver: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M16.27 12.27L7.44 3H3v18h4.73V12.73L16.56 21H21V3h-4.73z"/></svg>', apple: '<svg viewBox="2 2 20 20" width="18" height="18"><path fill="#fff" d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>', discord: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.11 13.11 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>', facebook: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>', x: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>', line: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>', telegram: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#fff" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>' };
              return [p, info[p as keyof typeof info] || ''];
            })
          ))};

          // 변경 추적 — 저장 버튼 활성화
          var styleChanged = false;
          function markChanged() {
            styleChanged = true;
            var saveBtn = document.getElementById('saveStyleBtn');
            if (saveBtn) { saveBtn.disabled = false; saveBtn.style.opacity = '1'; }
          }

          // 상단 타이틀 토글
          document.getElementById('showTitleToggle').addEventListener('change', function() {
            style.showTitle = this.checked;
            renderPreview();
            markChanged();
          });

          // 하단 브랜딩 토글
          document.getElementById('showPoweredByToggle').addEventListener('change', function() {
            if (shopPlan === 'free') {
              this.checked = true;
              showToast('warn', '무료 플랜에서는 브랜딩을 숨길 수 없습니다.');
              return;
            }
            style.showPoweredBy = this.checked;
            renderPreview();
            markChanged();
          });

          // 아이콘 토글 이벤트
          document.getElementById('showIconToggle').addEventListener('change', function() {
            style.showIcon = this.checked;
            renderPreview();
            markChanged();
          });

          // 버튼 문구 드롭다운 초기화
          var labelPreset = document.getElementById('labelPreset');
          var labelCustom = document.getElementById('labelCustom');
          var presetOptions = ['{name}로 시작하기', '{name}로 로그인', '{name}로 계속하기', '{name} 로그인'];
          if (presetOptions.indexOf(style.buttonLabel) >= 0) {
            labelPreset.value = style.buttonLabel;
          } else {
            labelPreset.value = 'custom';
            labelCustom.style.display = 'block';
            labelCustom.value = style.buttonLabel;
          }

          labelPreset.addEventListener('change', function() {
            if (this.value === 'custom') {
              labelCustom.style.display = 'block';
              labelCustom.focus();
            } else {
              labelCustom.style.display = 'none';
              style.buttonLabel = this.value;
              renderPreview();
              markChanged();
            }
          });
          labelCustom.addEventListener('input', function() {
            style.buttonLabel = this.value;
            renderPreview();
            markChanged();
          });

          function getEnabledProviders() {
            return [...document.querySelectorAll('#providerForm input[name=providers]:checked')].map(function(i) { return i.value; });
          }

          var renderPreview = window.renderProviderPreview = function() {
            var providers = getEnabledProviders();
            var container = document.getElementById('previewButtons');
            container.innerHTML = '';
            var justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' };
            container.style.gap = style.buttonGap + 'px';
            var justifyContent = justifyMap[style.align] || 'center';
            if (style.preset === 'icon-only') {
              container.style.flexDirection = 'row';
              container.style.flexWrap = 'wrap';
              container.style.justifyContent = 'center';
              container.style.alignItems = 'center';
            } else {
              container.style.flexDirection = 'column';
              container.style.flexWrap = 'nowrap';
              container.style.justifyContent = '';
              container.style.alignItems = 'center';
            }

            // 상단 타이틀
            if (style.showTitle) {
              var titleDiv = document.createElement('div');
              titleDiv.style.cssText = 'font-size:13px;color:#666;text-align:center;margin-bottom:6px;display:flex;align-items:center;justify-content:center;gap:4px;width:100%';
              titleDiv.innerHTML = '<span style="font-size:16px">\\u26A1</span><span>간편 로그인</span>';
              container.appendChild(titleDiv);
            }

            providers.forEach(function(p) {
              var btn = document.createElement('div');
              var color = providerColors[p] || '#999';
              var textColor = providerTextColors[p] || '#fff';
              var name = providerNames[p] || p;

              // 프리셋별 색상 결정
              var isMono = style.preset === 'mono';
              var isOutline = style.preset === 'outline';
              var isOutlineMono = style.preset === 'outline-mono';
              var originalColor = color;
              var border = '';

              if (isMono) {
                color = '#ffffff';
                textColor = '#333333';
                border = ';border:1px solid #d1d5db';
              } else if (isOutline) {
                textColor = '#333333';
                color = '#ffffff';
                border = ';border:2px solid ' + (originalColor === '#f2f2f2' ? '#d1d5db' : originalColor);
              } else if (isOutlineMono) {
                textColor = '#333333';
                color = '#ffffff';
                border = ';border:2px solid #d1d5db';
              }

              var btnHeight = style.buttonHeight || 44;

              if (style.preset === 'icon-only') {
                btn.style.cssText = 'width:44px;height:44px;border-radius:' + Math.min(style.borderRadius, 22) + 'px;background:' + color + ';display:flex;align-items:center;justify-content:center;color:' + textColor + ';font-weight:700;font-size:16px;cursor:pointer;flex-shrink:0;transition:all 0.3s' + border;
                if (style.showIcon && providerIcons[p]) {
                  btn.innerHTML = providerIcons[p];
                  if (isMono || isOutline || isOutlineMono) { btn.querySelectorAll('path').forEach(function(el) { el.setAttribute('fill', textColor); }); }
                } else {
                  btn.textContent = name.charAt(0);
                }
                if (isOutline) {
                  btn.setAttribute('data-bg', originalColor === '#f2f2f2' ? '#4285F4' : originalColor);
                  btn.setAttribute('data-tc', '#fff');
                  btn.setAttribute('data-oc', originalColor === '#f2f2f2' ? '#d1d5db' : originalColor);
                } else if (isOutlineMono) {
                  btn.setAttribute('data-bg', '#333333');
                  btn.setAttribute('data-tc', '#fff');
                  btn.setAttribute('data-oc', '#d1d5db');
                }
              } else {
                var w = style.buttonWidth;
                btn.style.cssText = 'width:' + w + 'px;height:' + btnHeight + 'px;padding:0 16px 0 ' + style.paddingLeft + 'px;border-radius:' + style.borderRadius + 'px;background:' + color + ';color:' + textColor + ';font-weight:600;font-size:14px;cursor:pointer;box-sizing:border-box;display:flex;align-items:center;gap:' + style.iconGap + 'px;justify-content:' + justifyContent + ';transition:all 0.3s' + border;
                if (style.showIcon && providerIcons[p]) {
                  var iconWrap = document.createElement('span');
                  iconWrap.style.cssText = 'flex-shrink:0;display:flex;align-items:center';
                  iconWrap.innerHTML = providerIcons[p];
                  if (isMono || isOutlineMono) {
                    iconWrap.querySelectorAll('path').forEach(function(el) { el.setAttribute('fill', '#333333'); });
                  } else if (isOutline) {
                    // outline: 모든 아이콘 fill을 소셜 배경색으로 통일 (구글은 4색 유지)
                    var fillColor = originalColor === '#f2f2f2' ? '#4285F4' : originalColor;
                    if (p !== 'google') {
                      iconWrap.querySelectorAll('path').forEach(function(el) { el.setAttribute('fill', fillColor); });
                    }
                  }
                  btn.appendChild(iconWrap);
                }
                var textSpan = document.createElement('span');
                textSpan.style.cssText = style.showIcon ? '' : 'width:100%;text-align:center';
                textSpan.textContent = style.buttonLabel.replace('{name}', name);
                btn.appendChild(textSpan);
                if (isOutline) {
                  btn.setAttribute('data-bg', originalColor === '#f2f2f2' ? '#4285F4' : originalColor);
                  btn.setAttribute('data-tc', '#333333');
                  btn.setAttribute('data-oc', originalColor === '#f2f2f2' ? '#d1d5db' : originalColor);
                } else if (isOutlineMono) {
                  btn.setAttribute('data-bg', '#333333');
                  btn.setAttribute('data-tc', '#333333');
                  btn.setAttribute('data-oc', '#d1d5db');
                }
              }
              // outline / outline-mono 호버 이벤트
              if (isOutline || isOutlineMono) {
                // 원본 아이콘 SVG HTML을 저장 (mouseleave 시 복원용)
                var iconEl = btn.querySelector('span');
                if (iconEl) btn.setAttribute('data-icon-html', iconEl.innerHTML);
                btn.addEventListener('mouseenter', function() {
                  var bg = this.getAttribute('data-bg');
                  this.style.background = bg;
                  this.style.color = '#fff';
                  this.style.borderColor = bg;
                  this.querySelectorAll('path').forEach(function(el) { el.setAttribute('fill', '#fff'); });
                });
                btn.addEventListener('mouseleave', function() {
                  var tc = this.getAttribute('data-tc');
                  var oc = this.getAttribute('data-oc') || tc;
                  this.style.background = '#ffffff';
                  this.style.color = tc;
                  this.style.borderColor = oc;
                  // 아이콘을 원본 SVG로 복원
                  var savedHtml = this.getAttribute('data-icon-html');
                  var iconSpan = this.querySelector('span');
                  if (savedHtml && iconSpan) { iconSpan.innerHTML = savedHtml; }
                });
              }
              container.appendChild(btn);
            });

            if (providers.length === 0) {
              var msg = document.createElement('p');
              msg.style.color = '#94a3b8';
              msg.textContent = '프로바이더를 선택하면 미리보기가 표시됩니다.';
              container.appendChild(msg);
            }

            // 하단 powered by
            if (style.showPoweredBy) {
              var poweredDiv = document.createElement('div');
              poweredDiv.style.cssText = 'text-align:center;margin-top:4px;font-size:11px;color:#aaa;width:100%';
              poweredDiv.textContent = 'powered by 번개가입';
              container.appendChild(poweredDiv);
            }
          }

          // Preset card click
          document.querySelectorAll('.preset-card').forEach(function(card) {
            card.addEventListener('click', function() {
              document.querySelectorAll('.preset-card').forEach(function(c) { c.classList.remove('active'); });
              this.classList.add('active');
              style.preset = this.dataset.preset;
              document.getElementById('btnWidth').disabled = style.preset === 'icon-only';
              renderPreview();
              markChanged();
            });
          });

          // Slider input
          ['btnWidth', 'btnHeight', 'btnGap', 'btnRadius', 'btnIconGap', 'btnPaddingLeft'].forEach(function(id) {
            var el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', function() {
              if (id === 'btnWidth') { style.buttonWidth = parseInt(this.value); document.getElementById('widthValue').textContent = this.value + 'px'; }
              if (id === 'btnHeight') { style.buttonHeight = parseInt(this.value); document.getElementById('heightValue').textContent = this.value + 'px'; }
              if (id === 'btnGap') { style.buttonGap = parseInt(this.value); document.getElementById('gapValue').textContent = this.value + 'px'; }
              if (id === 'btnRadius') { style.borderRadius = parseInt(this.value); document.getElementById('radiusValue').textContent = this.value + 'px'; }
              if (id === 'btnIconGap') { style.iconGap = parseInt(this.value); document.getElementById('iconGapValue').textContent = this.value + 'px'; }
              if (id === 'btnPaddingLeft') { style.paddingLeft = parseInt(this.value); document.getElementById('paddingLeftValue').textContent = this.value + 'px'; }
              renderPreview();
              markChanged();
            });
          });

          // Align buttons
          document.querySelectorAll('.align-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              document.querySelectorAll('.align-btn').forEach(function(b) { b.classList.remove('active'); });
              this.classList.add('active');
              style.align = this.dataset.align;
              renderPreview();
              markChanged();
            });
          });

          // Provider toggle -> re-render preview
          document.querySelectorAll('#providerForm input[name=providers]').forEach(function(cb) {
            cb.addEventListener('change', function() { setTimeout(renderPreview, 100); });
          });

          async function saveStyle() {
            var shopId = document.getElementById('providerForm').dataset.shopId;
            var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/widget-style', style);
            if (resp.ok) {
              styleChanged = false;
              var saveBtn = document.getElementById('saveStyleBtn');
              if (saveBtn) { saveBtn.disabled = true; saveBtn.style.opacity = '0.5'; }
              showToast('success', '디자인이 저장되었습니다.');
            } else {
              showToast('error', '저장에 실패했습니다.');
            }
          }

          // 저장 버튼
          var saveBtn = document.getElementById('saveStyleBtn');
          if (saveBtn) {
            saveBtn.addEventListener('click', function() { saveStyle(); });
          }

          // 기본값으로 되돌리기
          var resetBtn = document.getElementById('resetStyleBtn');
          if (resetBtn) {
            resetBtn.addEventListener('click', async function() {
              if (!confirm('위젯 디자인을 기본값으로 되돌리시겠습니까?')) return;
              var defaults = {preset:'outline-mono',buttonWidth:370,buttonHeight:45,buttonGap:6,borderRadius:5,align:'left',buttonLabel:'{name}로 시작하기',showIcon:true,iconGap:30,paddingLeft:100,showTitle:true,showPoweredBy:true};
              Object.assign(style, defaults);
              // UI 컨트롤 동기화
              document.getElementById('btnWidth').value = defaults.buttonWidth; document.getElementById('widthValue').textContent = defaults.buttonWidth + 'px';
              document.getElementById('btnHeight').value = defaults.buttonHeight; document.getElementById('heightValue').textContent = defaults.buttonHeight + 'px';
              document.getElementById('btnGap').value = defaults.buttonGap; document.getElementById('gapValue').textContent = defaults.buttonGap + 'px';
              document.getElementById('btnRadius').value = defaults.borderRadius; document.getElementById('radiusValue').textContent = defaults.borderRadius + 'px';
              document.getElementById('btnIconGap').value = defaults.iconGap; document.getElementById('iconGapValue').textContent = defaults.iconGap + 'px';
              document.getElementById('btnPaddingLeft').value = defaults.paddingLeft; document.getElementById('paddingLeftValue').textContent = defaults.paddingLeft + 'px';
              document.getElementById('showIconToggle').checked = true;
              document.getElementById('showTitleToggle').checked = true;
              document.getElementById('showPoweredByToggle').checked = true;
              document.getElementById('labelPreset').value = defaults.buttonLabel;
              document.getElementById('labelCustom').style.display = 'none';
              document.getElementById('btnWidth').disabled = false;
              document.querySelectorAll('.preset-card').forEach(function(c) { c.classList.remove('active'); });
              var defCard = document.querySelector('.preset-card[data-preset="outline-mono"]');
              if (defCard) defCard.classList.add('active');
              document.querySelectorAll('.align-btn').forEach(function(b) { b.classList.remove('active'); });
              var defAlign = document.querySelector('.align-btn[data-align="left"]');
              if (defAlign) defAlign.classList.add('active');
              renderPreview();
              markChanged();
              showToast('info', '기본값으로 되돌렸습니다. 저장 버튼을 눌러 적용하세요.');
            });
          }

          // Initial state
          try { renderPreview(); } catch(e) { console.error('renderPreview init error:', e); }

          // Activate preset card
          var activePreset = document.querySelector('.preset-card[data-preset="' + style.preset + '"]');
          if (activePreset) activePreset.classList.add('active');

          // Activate align button
          var activeAlign = document.querySelector('.align-btn[data-align="' + style.align + '"]');
          if (activeAlign) activeAlign.classList.add('active');

          // Disable width slider for icon-only
          if (style.preset === 'icon-only') {
            document.getElementById('btnWidth').disabled = true;
          }
        })();
      `}} />
      </div>{/* end right column */}
      </div>{/* end 2-column grid */}
    </Layout>
  );
};

// ─── Privacy Policy ─────────────────────────────────────────

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
          <p><strong>주식회사 수파레인</strong> | 대표이사 임호빈 | 사업자등록번호 716-88-01081</p>
          <p>경기도 김포시 태장로 789 금광하이테크시티 465호</p>
          <p>전화 031-992-5988 | 이메일 help@suparain.com</p>
          <p style="margin-top:8px"><a href="https://bg.suparain.kr">https://bg.suparain.kr</a></p>
        </div>
      </div>
    </body>
  </html>
);

// ─── Terms of Service Page ───────────────────────────────────

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
          <p><strong>주식회사 수파레인</strong> | 대표이사 임호빈 | 사업자등록번호 716-88-01081</p>
          <p>경기도 김포시 태장로 789 금광하이테크시티 465호</p>
          <p>전화 031-992-5988 | 이메일 help@suparain.com</p>
          <p style="margin-top:8px"><a href="https://bg.suparain.kr">https://bg.suparain.kr</a></p>
        </div>
      </div>
    </body>
  </html>
);

// ─── Admin Pages ─────────────────────────────────────────────

// --- Admin Home ---

type AdminStats = {
  total_shops: number;
  active_shops: number;
  total_signups: number;
  provider_distribution: { provider: string; cnt: number }[];
};

type AdminAuditLogEntry = {
  id: string;
  actor_email: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  detail: string | null;
  created_at: string;
};

export const AdminHomePage: FC<{
  stats: AdminStats;
  recentLogs: AdminAuditLogEntry[];
}> = ({ stats, recentLogs }) => (
  <Layout title="관리자 홈" loggedIn isAdmin currentPath="/admin">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <h1 style="margin-bottom:0">관리자 대시보드</h1>
      <span class="badge badge-red" style="font-size:13px">ADMIN</span>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a href="/api/admin/export/shops" class="btn btn-outline btn-sm" download>쇼핑몰 CSV</a>
        <a href="/api/admin/export/stats" class="btn btn-outline btn-sm" download>통계 CSV</a>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">전체 쇼핑몰</div>
        <div class="value">{stats.total_shops.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">활성 쇼핑몰</div>
        <div class="value">{stats.active_shops.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">전체 가입자</div>
        <div class="value">{stats.total_signups.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">정지된 쇼핑몰</div>
        <div class="value">{(stats.total_shops - stats.active_shops).toLocaleString()}</div>
      </div>
    </div>

    {stats.provider_distribution.length > 0 && (
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin-bottom:0">프로바이더별 가입 분포</h2>
        </div>
        {stats.provider_distribution.map((row) => (
          <ProgressBar
            label={providerDisplayNames[row.provider] || row.provider}
            value={row.cnt}
            max={stats.total_signups}
            color={providerColors[row.provider]}
          />
        ))}
      </div>
    )}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin-bottom:0">최근 감사 로그</h2>
        <a href="/admin/audit-log" style="font-size:13px">전체 보기 →</a>
      </div>
      {recentLogs.length === 0 ? (
        <div class="empty-state"><p>감사 로그가 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>시간</th>
                <th>관리자</th>
                <th>액션</th>
                <th>대상</th>
                <th>상세</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr>
                  <td style="white-space:nowrap;font-size:12px;color:#64748b">{log.created_at.slice(0, 16).replace('T', ' ')}</td>
                  <td style="font-size:13px">{log.actor_email || '-'}</td>
                  <td><span class="badge badge-gray">{log.action}</span></td>
                  <td style="font-size:13px">{log.target_type}{log.target_id ? ` / ${log.target_id.slice(0, 8)}…` : ''}</td>
                  <td style="font-size:13px;color:#64748b">{log.detail || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Layout>
);

// --- Admin Shops ---

type AdminShopRow = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  owner_email: string;
  plan: string;
  deleted_at: string | null;
  created_at: string;
};

type AdminShopsPagination = {
  page: number;
  pages: number;
  total: number;
};

export const AdminShopsPage: FC<{
  shops: AdminShopRow[];
  pagination: AdminShopsPagination;
  search: string;
}> = ({ shops, pagination, search }) => (
  <Layout title="전체 쇼핑몰" loggedIn isAdmin currentPath="/admin/shops">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h1 style="margin-bottom:0">전체 쇼핑몰 관리</h1>
      <div style="margin-left:auto">
        <a href="/api/admin/export/shops" class="btn btn-outline btn-sm" download>CSV 내보내기</a>
      </div>
    </div>

    <div class="filter-bar" style="margin-bottom:16px">
      <form id="searchForm" style="display:flex;gap:8px;flex:1">
        <input
          type="text"
          id="searchInput"
          placeholder="쇼핑몰명, Mall ID, 이메일 검색..."
          value={search}
          style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"
        />
        <button type="submit" class="btn btn-primary btn-sm" style="width:auto">검색</button>
        {search && <a href="/admin/shops" class="btn btn-outline btn-sm">초기화</a>}
      </form>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;color:#64748b">전체 {pagination.total}개</span>
        {pagination.pages > 1 && (
          <span style="font-size:13px;color:#64748b">{pagination.page} / {pagination.pages} 페이지</span>
        )}
      </div>

      {shops.length === 0 ? (
        <div class="empty-state"><p>쇼핑몰이 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>쇼핑몰명</th>
                <th>Mall ID</th>
                <th>소유자 이메일</th>
                <th>플랜</th>
                <th>상태</th>
                <th>등록일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr>
                  <td>{shop.shop_name || '-'}</td>
                  <td><code style="font-size:12px">{shop.mall_id}</code></td>
                  <td style="font-size:13px">{shop.owner_email}</td>
                  <td>
                    <select
                      class="plan-select"
                      data-shop-id={shop.shop_id}
                      style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"
                    >
                      <option value="free" selected={shop.plan === 'free'}>무료</option>
                      <option value="monthly" selected={shop.plan === 'monthly'}>월간</option>
                      <option value="yearly" selected={shop.plan === 'yearly'}>연간</option>
                    </select>
                  </td>
                  <td>
                    {shop.deleted_at
                      ? <span class="badge badge-red">정지</span>
                      : <span class="badge badge-green">활성</span>
                    }
                  </td>
                  <td style="font-size:12px;color:#64748b">{shop.created_at.slice(0, 10)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      <button
                        class="btn btn-outline btn-sm plan-save-btn"
                        data-shop-id={shop.shop_id}
                        style="font-size:11px;padding:4px 8px"
                      >
                        저장
                      </button>
                      {shop.deleted_at ? (
                        <button
                          class="btn btn-primary btn-sm status-btn"
                          data-shop-id={shop.shop_id}
                          data-action="activate"
                          style="font-size:11px;padding:4px 8px"
                        >
                          활성화
                        </button>
                      ) : (
                        <button
                          class="btn btn-danger btn-sm status-btn"
                          data-shop-id={shop.shop_id}
                          data-action="suspend"
                          style="font-size:11px;padding:4px 8px"
                        >
                          정지
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          {pagination.page > 1 && (
            <a href={`/admin/shops?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/admin/shops?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      // 검색 폼
      document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var q = document.getElementById('searchInput').value.trim();
        window.location.href = '/admin/shops' + (q ? '?search=' + encodeURIComponent(q) : '');
      });

      // 플랜 저장 버튼
      document.querySelectorAll('.plan-save-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var shopId = this.dataset.shopId;
          var row = this.closest('tr');
          var select = row.querySelector('.plan-select');
          var plan = select.value;
          var resp = await apiCall('PUT', '/api/admin/shops/' + shopId + '/plan', { plan: plan }, this);
          if (resp.ok) {
            this.textContent = '저장됨!';
            setTimeout(function() { btn.textContent = '저장'; }, 1500);
          } else {
            var data = await resp.json();
            showToast('error', data.error || '플랜 변경 중 오류가 발생했습니다.');
          }
        });
      });

      // 정지/활성화 버튼
      document.querySelectorAll('.status-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var shopId = this.dataset.shopId;
          var action = this.dataset.action;
          var label = action === 'suspend' ? '정지' : '활성화';
          if (!confirm('이 쇼핑몰을 ' + label + '하시겠습니까?')) return;
          var resp = await apiCall('PUT', '/api/admin/shops/' + shopId + '/status', { action: action }, this);
          if (resp.ok) {
            location.reload();
          } else {
            var data = await resp.json();
            showToast('error', data.error || '상태 변경 중 오류가 발생했습니다.');
          }
        });
      });
    `}} />
  </Layout>
);

// --- Admin Subscriptions ---

type AdminSubscriptionRow = {
  subscription_id: string;
  shop_id: string;
  shop_name: string;
  mall_id: string;
  owner_email: string;
  plan: string;
  status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export const AdminSubscriptionsPage: FC<{
  subscriptions: AdminSubscriptionRow[];
}> = ({ subscriptions }) => (
  <Layout title="구독 현황" loggedIn isAdmin currentPath="/admin/subscriptions">
    <h1>전체 구독 현황</h1>

    <div class="card">
      <div style="margin-bottom:16px">
        <span style="font-size:13px;color:#64748b">전체 {subscriptions.length}건</span>
      </div>

      {subscriptions.length === 0 ? (
        <div class="empty-state"><p>구독 내역이 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>쇼핑몰명</th>
                <th>Mall ID</th>
                <th>소유자</th>
                <th>플랜</th>
                <th>상태</th>
                <th>시작일</th>
                <th>만료일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((sub) => {
                let statusBadge: string;
                let badgeClass: string;
                if (sub.status === 'active') { statusBadge = '활성'; badgeClass = 'badge-green'; }
                else if (sub.status === 'pending') { statusBadge = '대기중'; badgeClass = 'badge-yellow'; }
                else if (sub.status === 'cancelled') { statusBadge = '취소'; badgeClass = 'badge-gray'; }
                else if (sub.status === 'expired') { statusBadge = '만료'; badgeClass = 'badge-red'; }
                else { statusBadge = sub.status; badgeClass = 'badge-gray'; }

                return (
                  <tr>
                    <td>{sub.shop_name || '-'}</td>
                    <td><code style="font-size:12px">{sub.mall_id}</code></td>
                    <td style="font-size:13px">{sub.owner_email}</td>
                    <td>
                      <span class={`badge ${sub.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>
                        {sub.plan === 'free' ? '무료' : sub.plan === 'monthly' ? '월간' : sub.plan === 'yearly' ? '연간' : sub.plan}
                      </span>
                    </td>
                    <td><span class={`badge ${badgeClass}`}>{statusBadge}</span></td>
                    <td style="font-size:12px;color:#64748b">{sub.started_at ? sub.started_at.slice(0, 10) : '-'}</td>
                    <td style="font-size:12px;color:#64748b">{sub.expires_at ? sub.expires_at.slice(0, 10) : '-'}</td>
                    <td>
                      {sub.status === 'active' && (
                        <button
                          class="btn btn-danger btn-sm sub-cancel-btn"
                          data-subscription-id={sub.subscription_id}
                          style="font-size:11px;padding:4px 8px"
                        >
                          취소
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      document.querySelectorAll('.sub-cancel-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var subId = this.dataset.subscriptionId;
          if (!confirm('이 구독을 취소하시겠습니까? 해당 쇼핑몰에 다른 활성 구독이 없으면 플랜이 무료로 다운그레이드됩니다.')) return;
          var resp = await apiCall('PUT', '/api/admin/subscriptions/' + subId + '/cancel', {}, this);
          if (resp.ok) {
            showToast('success', '구독이 취소되었습니다.');
            setTimeout(function() { location.reload(); }, 800);
          } else {
            var data = await resp.json();
            showToast('error', data.error || '구독 취소 중 오류가 발생했습니다.');
          }
        });
      });
    `}} />
  </Layout>
);

// --- Admin Audit Log ---

export const AdminAuditLogPage: FC<{
  logs: AdminAuditLogEntry[];
  page: number;
  limit: number;
  currentAction?: string;
  currentFrom?: string;
  currentTo?: string;
}> = ({ logs, page, limit, currentAction, currentFrom, currentTo }) => {
  // Build base query string for pagination links (preserve filters)
  const filterParams = [
    currentAction ? `action=${encodeURIComponent(currentAction)}` : '',
    currentFrom ? `from=${encodeURIComponent(currentFrom)}` : '',
    currentTo ? `to=${encodeURIComponent(currentTo)}` : '',
  ].filter(Boolean).join('&');
  const filterSuffix = filterParams ? `&${filterParams}` : '';

  return (
    <Layout title="감사 로그" loggedIn isAdmin currentPath="/admin/audit-log">
      <h1>감사 로그</h1>

      <div class="filter-bar">
        <select id="actionFilter" onchange="applyAuditFilters()">
          <option value="" selected={!currentAction}>전체 액션</option>
          <option value="change_plan" selected={currentAction === 'change_plan'}>플랜 변경</option>
          <option value="suspend" selected={currentAction === 'suspend'}>정지</option>
          <option value="activate" selected={currentAction === 'activate'}>활성화</option>
          <option value="suspend_owner" selected={currentAction === 'suspend_owner'}>사용자 정지</option>
          <option value="activate_owner" selected={currentAction === 'activate_owner'}>사용자 활성화</option>
        </select>
        <input type="date" id="dateFrom" value={currentFrom || ''} onchange="applyAuditFilters()" />
        <input type="date" id="dateTo" value={currentTo || ''} onchange="applyAuditFilters()" />
        {(currentAction || currentFrom || currentTo) && (
          <a href="/admin/audit-log" class="btn btn-outline btn-sm">초기화</a>
        )}
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <span style="font-size:13px;color:#64748b">{(page - 1) * limit + 1}–{(page - 1) * limit + logs.length}번째 항목</span>
          <span style="font-size:13px;color:#64748b">페이지 {page}</span>
        </div>

        {logs.length === 0 ? (
          <div class="empty-state"><p>조건에 맞는 감사 로그가 없습니다.</p></div>
        ) : (
          <div style="overflow-x:auto">
            <table>
              <thead>
                <tr>
                  <th>시간</th>
                  <th>관리자</th>
                  <th>액션</th>
                  <th>대상 유형</th>
                  <th>대상 ID</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr>
                    <td style="white-space:nowrap;font-size:12px;color:#64748b">{log.created_at.slice(0, 16).replace('T', ' ')}</td>
                    <td style="font-size:13px">{log.actor_email || <span style="color:#94a3b8">시스템</span>}</td>
                    <td><span class="badge badge-gray">{log.action}</span></td>
                    <td style="font-size:13px">{log.target_type}</td>
                    <td style="font-size:12px;font-family:monospace;color:#64748b">{log.target_id ? log.target_id.slice(0, 12) + '…' : '-'}</td>
                    <td style="font-size:13px;color:#64748b">{log.detail || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          {page > 1 && (
            <a href={`/admin/audit-log?page=${page - 1}${filterSuffix}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">페이지 {page}</span>
          {logs.length === limit && (
            <a href={`/admin/audit-log?page=${page + 1}${filterSuffix}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        function applyAuditFilters() {
          var action = document.getElementById('actionFilter').value;
          var from = document.getElementById('dateFrom').value;
          var to = document.getElementById('dateTo').value;
          var params = [];
          if (action) params.push('action=' + encodeURIComponent(action));
          if (from) params.push('from=' + encodeURIComponent(from));
          if (to) params.push('to=' + encodeURIComponent(to));
          var qs = params.length ? '?' + params.join('&') : '';
          window.location.href = '/admin/audit-log' + qs;
        }
      `}} />
    </Layout>
  );
};

// --- Admin Owners ---

type AdminOwnerRow = {
  owner_id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  shop_count: number;
};

type AdminOwnersPagination = {
  page: number;
  pages: number;
  total: number;
};

export const AdminOwnersPage: FC<{
  owners: AdminOwnerRow[];
  pagination: AdminOwnersPagination;
  search: string;
}> = ({ owners, pagination, search }) => (
  <Layout title="사용자 관리" loggedIn isAdmin currentPath="/admin/owners">
    <h1>사용자(Owner) 관리</h1>

    <div class="filter-bar" style="margin-bottom:16px">
      <form id="searchForm" style="display:flex;gap:8px;flex:1">
        <input
          type="text"
          id="searchInput"
          placeholder="이메일, 이름 검색..."
          value={search}
          style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"
        />
        <button type="submit" class="btn btn-primary btn-sm" style="width:auto">검색</button>
        {search && <a href="/admin/owners" class="btn btn-outline btn-sm">초기화</a>}
      </form>
    </div>

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;color:#64748b">전체 {pagination.total}명</span>
        {pagination.pages > 1 && (
          <span style="font-size:13px;color:#64748b">{pagination.page} / {pagination.pages} 페이지</span>
        )}
      </div>

      {owners.length === 0 ? (
        <div class="empty-state"><p>사용자가 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>이메일</th>
                <th>이름</th>
                <th>역할</th>
                <th>쇼핑몰 수</th>
                <th>가입일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {owners.map((owner) => (
                <tr>
                  <td style="font-size:13px">{owner.email}</td>
                  <td style="font-size:13px">{owner.name || '-'}</td>
                  <td>
                    <span class={`badge ${owner.role === 'admin' ? 'badge-red' : 'badge-gray'}`}>
                      {owner.role}
                    </span>
                  </td>
                  <td style="text-align:center">{owner.shop_count}</td>
                  <td style="font-size:12px;color:#64748b">{owner.created_at.slice(0, 10)}</td>
                  <td>
                    <div style="display:flex;gap:6px">
                      {owner.shop_count > 0 ? (
                        <button
                          class="btn btn-danger btn-sm owner-status-btn"
                          data-owner-id={owner.owner_id}
                          data-action="suspend"
                          style="font-size:11px;padding:4px 8px"
                        >
                          정지
                        </button>
                      ) : (
                        <button
                          class="btn btn-primary btn-sm owner-status-btn"
                          data-owner-id={owner.owner_id}
                          data-action="activate"
                          style="font-size:11px;padding:4px 8px"
                        >
                          활성화
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          {pagination.page > 1 && (
            <a href={`/admin/owners?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/admin/owners?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      // 검색 폼
      document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var q = document.getElementById('searchInput').value.trim();
        window.location.href = '/admin/owners' + (q ? '?search=' + encodeURIComponent(q) : '');
      });

      // 정지/활성화 버튼
      document.querySelectorAll('.owner-status-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var ownerId = this.dataset.ownerId;
          var action = this.dataset.action;
          var label = action === 'suspend' ? '정지' : '활성화';
          if (!confirm('이 사용자를 ' + label + '하시겠습니까?\\n' + (action === 'suspend' ? '해당 사용자의 모든 쇼핑몰이 비활성화됩니다.' : '해당 사용자의 모든 쇼핑몰이 복원됩니다.'))) return;
          var resp = await apiCall('PUT', '/api/admin/owners/' + ownerId + '/status', { action: action }, this);
          if (resp.ok) {
            showToast('success', '사용자 상태가 변경되었습니다.');
            setTimeout(function() { location.reload(); }, 800);
          } else {
            var data = await resp.json();
            showToast('error', data.error || '상태 변경 중 오류가 발생했습니다.');
          }
        });
      });
    `}} />
  </Layout>
);

// ─── Landing Page ─────────────────────────────────────────────

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
            <a href="/dashboard" class="btn-header">대시보드</a>
          </nav>
        </div>
      </header>

      <section class="lp-hero">
        <div class="lp-hero-badge">카페24 쇼핑몰 소셜 로그인 솔루션</div>
        <h1>소셜 로그인 1-클릭으로<br /><span>쇼핑몰 회원가입 완료</span></h1>
        <p>복잡한 회원가입 폼은 그만. 쇼핑몰 고객이 소셜 계정 하나로 바로 가입하고, 운영자는 위젯 설치만으로 바로 시작합니다.</p>
        <div class="lp-hero-cta">
          <a href="/dashboard" class="btn-primary">지금 시작하기</a>
          <a href="#about" class="btn-secondary">서비스 소개</a>
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
          <p class="lp-section-desc">국내외 주요 소셜 로그인 프로바이더를 모두 지원합니다. 새로운 프로바이더도 지속적으로 추가됩니다.</p>
          <div class="lp-providers-grid">
            <span class="lp-provider-badge">Google</span>
            <span class="lp-provider-badge">카카오</span>
            <span class="lp-provider-badge">네이버</span>
            <span class="lp-provider-badge">Apple</span>
            <span class="lp-provider-badge">Discord</span>
            <span class="lp-provider-badge">Facebook</span>
            <span class="lp-provider-badge">X (Twitter)</span>
            <span class="lp-provider-badge">LINE</span>
            <span class="lp-provider-badge">Telegram</span>
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
              <p>고객이 이미 사용 중인 소셜 계정으로 별도의 정보 입력 없이 즉시 쇼핑몰 회원가입을 완료합니다. 가입 전환율을 극적으로 높입니다.</p>
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
              <div class="lp-plan-price">29,900<span>원/월</span></div>
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
              <div class="lp-plan-price">329,900<span>원/년</span></div>
              <div class="lp-plan-limit">월 환산 27,492원 · 약 8% 할인</div>
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
              <a href="/dashboard">대시보드</a>
            </div>
          </div>
          <hr class="lp-footer-divider" />
          <div class="lp-footer-biz">
            <strong>주식회사 수파레인</strong> &nbsp;|&nbsp; 대표이사 임호빈 &nbsp;|&nbsp; 사업자등록번호 716-88-01081<br />
            경기도 김포시 태장로 789 금광하이테크시티 465호 &nbsp;|&nbsp; 전화 031-992-5988 &nbsp;|&nbsp; 이메일 help@suparain.com
          </div>
        </div>
      </footer>

    </body>
  </html>
);

// ─── AI Reports 페이지 ──────────────────────────────────────

export const AiReportsPage: FC<{
  shop: { shop_id: string; shop_name: string; mall_id: string; plan: string };
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  const isPlus = shop.plan !== 'free';

  return (
    <Layout title="AI 보고서" loggedIn currentPath="/dashboard/ai-reports" isCafe24={isCafe24}>
      <h1 style="margin-bottom:4px">AI 보고서</h1>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">지난 주 성과를 분석하고 이번 주 전략을 AI가 생성합니다.</p>

      {!isPlus ? (
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:40px;margin-bottom:16px">🔒</div>
          <h2 style="margin-bottom:8px">Plus 전용 기능</h2>
          <p style="font-size:14px;color:#64748b;margin-bottom:20px">AI 주간 브리핑은 Plus 플랜에서만 사용할 수 있습니다.</p>
          <a href="/dashboard/billing" class="btn btn-primary">Plus 업그레이드</a>
        </div>
      ) : (
        <div>
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div>
                <h2 style="margin-bottom:4px">브리핑 생성</h2>
                <p style="font-size:13px;color:#94a3b8">최근 7일 데이터를 기반으로 AI가 분석 리포트를 생성합니다.</p>
              </div>
              <button id="generateBriefingBtn" class="btn btn-primary" data-shop-id={shop.shop_id}>
                브리핑 생성하기
              </button>
            </div>
          </div>

          <div id="briefingLoading" style="display:none;text-align:center;padding:32px;color:#64748b;font-size:14px">
            AI가 분석 중입니다. 잠시 기다려주세요...
          </div>

          <div id="briefingResult" style="display:none">
            {/* 지난 주 성과 */}
            <div class="card" style="margin-bottom:16px">
              <h2 style="margin-bottom:12px;font-size:16px;color:#1e293b">지난 주 성과</h2>
              <div id="briefingPerformance" style="font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap"></div>
            </div>

            {/* 이번 주 전략 */}
            <div class="card" style="margin-bottom:16px">
              <h2 style="margin-bottom:12px;font-size:16px;color:#1e293b">이번 주 전략</h2>
              <div id="briefingStrategy" style="font-size:14px;color:#374151;line-height:1.7;white-space:pre-wrap"></div>
            </div>

            {/* AI 추천 액션 */}
            <div class="card">
              <h2 style="margin-bottom:12px;font-size:16px;color:#1e293b">AI 추천 액션</h2>
              <div id="briefingActions" style="font-size:14px;color:#374151;line-height:1.7"></div>
            </div>
          </div>

          <script dangerouslySetInnerHTML={{__html: `
            (function() {
              var shopId = '${shop.shop_id}';
              var btn = document.getElementById('generateBriefingBtn');
              var loadingEl = document.getElementById('briefingLoading');
              var resultEl = document.getElementById('briefingResult');

              btn.addEventListener('click', async function() {
                btn.disabled = true;
                btn.textContent = '생성 중...';
                loadingEl.style.display = 'block';
                resultEl.style.display = 'none';

                try {
                  var resp = await fetch('/api/ai/briefing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ shop_id: shopId })
                  });
                  var data = await resp.json();

                  if (resp.ok && data.briefing) {
                    var b = data.briefing;

                    document.getElementById('briefingPerformance').textContent = b.performance || '-';
                    document.getElementById('briefingStrategy').textContent = b.strategy || '-';

                    var actionsEl = document.getElementById('briefingActions');
                    if (Array.isArray(b.actions) && b.actions.length > 0) {
                      actionsEl.innerHTML = b.actions.map(function(a, i) {
                        return '<div style="display:flex;gap:10px;margin-bottom:10px"><span style="width:22px;height:22px;background:#dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#1d4ed8;flex-shrink:0">' + (i+1) + '</span><span>' + a + '</span></div>';
                      }).join('');
                    } else {
                      actionsEl.textContent = b.actions || '-';
                    }

                    loadingEl.style.display = 'none';
                    resultEl.style.display = 'block';
                    showToast('success', 'AI 브리핑이 생성되었습니다.');
                  } else {
                    loadingEl.style.display = 'none';
                    showToast('error', data.message || 'AI 브리핑 생성에 실패했습니다.');
                  }
                } catch(e) {
                  loadingEl.style.display = 'none';
                  showToast('error', '오류: ' + e.message);
                } finally {
                  btn.disabled = false;
                  btn.textContent = '브리핑 생성하기';
                }
              });
            })();
          `}} />
        </div>
      )}
    </Layout>
  );
};

// ─── Plus Lock Overlay ───────────────────────────────────────

const PlusLockOverlay: FC<{ feature: string }> = ({ feature }) => (
  <div class="card" style="text-align:center;padding:48px">
    <div style="font-size:48px;margin-bottom:16px">🔒</div>
    <h2>{feature}</h2>
    <p style="color:#64748b;margin:8px 0 24px">이 기능은 Plus 플랜에서 사용할 수 있습니다.</p>
    <a href="/dashboard/billing" class="btn btn-primary" style="display:inline-flex;width:auto">
      Plus로 업그레이드 (월 ₩6,900)
    </a>
  </div>
);

// ─── General Settings Page ───────────────────────────────────

type ShopSummary = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  plan: string;
  sso_configured: number;
  created_at: string;
};

export const GeneralSettingsPage: FC<{
  email: string;
  name: string;
  shop: ShopSummary | null;
  isCafe24?: boolean;
}> = ({ email, name, shop, isCafe24 }) => (
  <Layout title="기본 설정" loggedIn currentPath="/dashboard/settings/general" isCafe24={isCafe24}>
    <h1>기본 설정</h1>

    {shop && (
      <div class="card">
        <h2>쇼핑몰 정보</h2>
        <div style="overflow-x:auto">
          <table>
            <tbody>
              <tr><th style="width:140px">쇼핑몰명</th><td>{shop.shop_name || '-'}</td></tr>
              <tr><th>Mall ID</th><td><code>{shop.mall_id}</code></td></tr>
              <tr><th>플랜</th><td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : 'Plus'}</span></td></tr>
              <tr><th>SSO 연동</th><td>
                {shop.sso_configured
                  ? <span class="badge badge-green">완료</span>
                  : <span class="badge badge-yellow">미완료</span>}
                {!shop.sso_configured && (
                  <a href="/dashboard/settings/sso-guide" style="font-size:13px;margin-left:8px">설정 가이드 →</a>
                )}
              </td></tr>
              <tr><th>Shop ID</th><td><code style="font-size:12px;color:#64748b">{shop.shop_id}</code></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    )}

    {shop && (
      <div class="card">
        <h2>쇼핑몰 정체성 (AI 분석)</h2>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">
          <strong>AI가 이 정보를 활용합니다</strong> — 쇼핑몰 정체성과 혜택 정보를 기반으로 AI가 <strong>미니배너, 이탈 감지 팝업, 재방문 에스컬레이션</strong> 등의 가입 유도 카피를 자동 생성하고, <strong>주간 AI 브리핑</strong>에서 맞춤 전략을 제안합니다.
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button id="analyzeBtn" class="btn btn-primary btn-sm" data-shop-id={shop.shop_id}>AI 자동 분석하기</button>
          <button id="editIdentityBtn" class="btn btn-outline btn-sm" style="display:none">수정</button>
          <button id="saveIdentityBtn" class="btn btn-primary btn-sm" style="display:none">저장</button>
          <button id="cancelEditBtn" class="btn btn-outline btn-sm" style="display:none">취소</button>
        </div>

        {/* AI 분석 결과 읽기 전용 표시 */}
        <div id="identityReadonly" style="display:none;background:#f8fafc;border-radius:8px;padding:16px;font-size:13px;color:#374151;margin-bottom:16px">
          <div style="display:grid;gap:6px">
            <div><strong>업종:</strong> <span id="roIndustry">-</span></div>
            <div><strong>타겟 고객:</strong> <span id="roTarget">-</span></div>
            <div><strong>톤앤매너:</strong> <span id="roTone">-</span></div>
            <div><strong>한 줄 소개:</strong> <span id="roSummary">-</span></div>
            <div><strong>키워드:</strong> <span id="roKeywords">-</span></div>
          </div>
        </div>

        {/* 수정 모드 폼 (기본 숨김) */}
        <div id="identityEditForm" style="display:none;max-width:560px">
          <div style="display:grid;gap:12px">
            <div class="form-group" style="margin-bottom:0">
              <label>업종</label>
              <input type="text" id="idIndustry" placeholder="예: 패션/의류, 뷰티, 식품" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>타겟 고객</label>
              <input type="text" id="idTarget" placeholder="예: 20-30대 여성" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>톤앤매너</label>
              <input type="text" id="idTone" placeholder="예: 트렌디하고 캐주얼한" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>한 줄 소개</label>
              <input type="text" id="idSummary" placeholder="예: 스트리트 캐주얼 브랜드 중심의 패션 쇼핑몰" />
            </div>
            <div class="form-group" style="margin-bottom:0">
              <label>핵심 키워드 (쉼표 구분)</label>
              <input type="text" id="idKeywords" placeholder="예: 스트리트패션, 캐주얼, 보이런던" />
            </div>
          </div>
        </div>

        {/* 회원 가입 혜택 (항상 표시) */}
        <div style="border-top:1px solid #e5e7eb;padding-top:16px;margin-top:16px;max-width:560px">
          <h3 style="font-size:15px;margin-bottom:8px">회원 가입 혜택 <span style="font-size:12px;color:#64748b;font-weight:400">— AI가 이 혜택을 강조하여 가입 유도 카피를 생성합니다</span></h3>
          <p style="font-size:12px;color:#94a3b8;margin-bottom:12px">
            <span style="color:#2563eb;font-weight:600">[자동 발급]</span> 번개가입이 자동 처리 &nbsp;|&nbsp;
            <span style="color:#f59e0b;font-weight:600">[쇼핑몰 설정]</span> 카페24 관리자에서 직접 설정 필요
          </p>
          <div style="display:grid;gap:20px">
            {/* 가입 쿠폰 — 라디오 단일 선택 */}
            <div>
              <label style="display:block;font-size:13px;font-weight:600;color:#475569;margin-bottom:8px">가입 쿠폰 혜택 <span style="color:#2563eb;font-size:11px">[자동 발급]</span></label>
              <div id="couponRadios">
                <div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-bottom:4px">
                  {['1,000원', '2,000원', '3,000원', '5,000원', '10,000원'].map(amt => (
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;min-width:130px">
                      <input type="radio" name="couponBenefit" value={`${amt} 할인 쿠폰 즉시 지급`} style="margin:0" />
                      {amt}
                    </label>
                  ))}
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:4px 16px;margin-bottom:4px">
                  {['10%', '15%', '20%'].map(pct => (
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;min-width:130px">
                      <input type="radio" name="couponBenefit" value={`${pct} 할인 쿠폰 즉시 지급`} style="margin:0" />
                      {pct} 할인
                    </label>
                  ))}
                  <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;flex:1">
                    <input type="radio" name="couponBenefit" value="__custom__" style="margin:0" />
                    <input type="text" id="idCouponBenefitCustom" placeholder="직접 입력" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px" onfocus="this.previousElementSibling.checked=true" />
                  </label>
                </div>
              </div>
            </div>

            {/* 무료배송 — 라디오 단일 선택 */}
            <div>
              <label style="display:block;font-size:13px;font-weight:600;color:#475569;margin-bottom:8px">무료배송 기준 <span style="color:#f59e0b;font-size:11px">[쇼핑몰 설정]</span></label>
              <div id="shippingRadios" style="display:flex;flex-wrap:wrap;gap:4px 16px">
                {['전 상품', '3만원 이상', '5만원 이상', '7만원 이상', '10만원 이상'].map((label, i) => {
                  const values = ['전 상품 무료배송', '30,000원 이상 무료배송', '50,000원 이상 무료배송', '70,000원 이상 무료배송', '100,000원 이상 무료배송'];
                  return (
                    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;min-width:120px">
                      <input type="radio" name="freeShipping" value={values[i]} style="margin:0" />
                      {label}
                    </label>
                  );
                })}
                <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;flex:1">
                  <input type="radio" name="freeShipping" value="__custom__" style="margin:0" />
                  <input type="text" id="idFreeShippingCustom" placeholder="직접 입력" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px" onfocus="this.previousElementSibling.checked=true" />
                </label>
              </div>
            </div>

            {/* 추가 혜택 — 토글 다중 선택 (2열 그리드) */}
            <div>
              <label style="display:block;font-size:13px;font-weight:600;color:#475569;margin-bottom:8px">추가 혜택 (여러 개 선택 가능)</label>
              <div id="extraBenefitToggles" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 24px">
                {[
                  { value: '첫 구매 10% 추가 할인', label: '첫 구매 10% 할인', tag: '자동', tagColor: '#2563eb' },
                  { value: '적립금 1,000원 즉시 지급', label: '적립금 1,000원', tag: '쇼핑몰', tagColor: '#f59e0b' },
                  { value: '생일 쿠폰 자동 발급', label: '생일 쿠폰', tag: '쇼핑몰', tagColor: '#f59e0b' },
                  { value: '회원 등급별 추가 할인', label: '등급별 할인', tag: '쇼핑몰', tagColor: '#f59e0b' },
                  { value: '신상품 알림 우선 발송', label: '신상품 알림', tag: '쇼핑몰', tagColor: '#f59e0b' },
                ].map(item => (
                  <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer">
                    <span class="toggle" style="flex-shrink:0">
                      <input type="checkbox" name="extraBenefit" value={item.value} />
                      <span class="toggle-slider"></span>
                    </span>
                    <span>{item.label}</span>
                    <span style={`font-size:10px;color:${item.tagColor};font-weight:600`}>{item.tag}</span>
                  </label>
                ))}
                <label style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:13px;cursor:pointer;grid-column:1/-1">
                  <span class="toggle" style="flex-shrink:0">
                    <input type="checkbox" id="extraBenefitCustomToggle" />
                    <span class="toggle-slider"></span>
                  </span>
                  <input type="text" id="idExtraBenefitCustom" placeholder="직접 입력 (예: 회원 전용 할인 이벤트)" style="flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:13px" onfocus="document.getElementById('extraBenefitCustomToggle').checked=true" />
                </label>
              </div>
            </div>
          </div>
          <button id="saveBenefitsBtn" class="btn btn-primary btn-sm" style="margin-top:16px">혜택 저장</button>
        </div>

        <script dangerouslySetInnerHTML={{__html: `
          (function() {
            var shopId = document.getElementById('analyzeBtn').dataset.shopId;

            // DOM 참조
            var analyzeBtn = document.getElementById('analyzeBtn');
            var editBtn = document.getElementById('editIdentityBtn');
            var saveBtn = document.getElementById('saveIdentityBtn');
            var cancelBtn = document.getElementById('cancelEditBtn');
            var readonlyEl = document.getElementById('identityReadonly');
            var editForm = document.getElementById('identityEditForm');

            var roFields = { industry: document.getElementById('roIndustry'), target: document.getElementById('roTarget'), tone: document.getElementById('roTone'), summary: document.getElementById('roSummary'), keywords: document.getElementById('roKeywords') };
            var editFields = { industry: document.getElementById('idIndustry'), target: document.getElementById('idTarget'), tone: document.getElementById('idTone'), summary: document.getElementById('idSummary'), keywords: document.getElementById('idKeywords') };

            // 직접 입력 필드는 인라인이므로 별도 토글 불필요

            function getRadioValue(name) {
              var checked = document.querySelector('input[name="' + name + '"]:checked');
              if (!checked) return '';
              if (checked.value === '__custom__') {
                var customId = 'id' + name.charAt(0).toUpperCase() + name.slice(1) + 'Custom';
                return document.getElementById(customId).value.trim();
              }
              return checked.value;
            }

            function setRadioValue(name, val) {
              if (!val) return;
              var radios = document.querySelectorAll('input[name="' + name + '"]');
              var found = false;
              radios.forEach(function(r) { if (r.value === val) { r.checked = true; found = true; } });
              if (!found) {
                // 프리셋에 없는 값 → 직접 입력
                radios.forEach(function(r) { if (r.value === '__custom__') r.checked = true; });
                var customId = 'id' + name.charAt(0).toUpperCase() + name.slice(1) + 'Custom';
                document.getElementById(customId).value = val;
              }
            }

            function getExtraBenefits() {
              var values = [];
              document.querySelectorAll('input[name="extraBenefit"]:checked').forEach(function(cb) {
                values.push(cb.value);
              });
              var customToggle = document.getElementById('extraBenefitCustomToggle');
              var customInput = document.getElementById('idExtraBenefitCustom');
              if (customToggle.checked && customInput.value.trim()) {
                values.push(customInput.value.trim());
              }
              return values;
            }

            function setExtraBenefits(arr) {
              if (!Array.isArray(arr)) return;
              var knownValues = [];
              document.querySelectorAll('input[name="extraBenefit"]').forEach(function(cb) { knownValues.push(cb.value); });
              var customItems = [];
              arr.forEach(function(val) {
                var cb = document.querySelector('input[name="extraBenefit"][value="' + val + '"]');
                if (cb) { cb.checked = true; }
                else { customItems.push(val); }
              });
              if (customItems.length > 0) {
                document.getElementById('extraBenefitCustomToggle').checked = true;
                document.getElementById('idExtraBenefitCustom').value = customItems.join(', ');
              }
            }

            function showReadonly(id) {
              roFields.industry.textContent = id.industry || '-';
              roFields.target.textContent = id.target || id.target_audience || '-';
              roFields.tone.textContent = id.tone || '-';
              roFields.summary.textContent = id.summary || '-';
              roFields.keywords.textContent = Array.isArray(id.keywords) ? id.keywords.join(', ') : (id.keywords || '-');
              readonlyEl.style.display = 'block';
              editForm.style.display = 'none';
              editBtn.style.display = 'inline-flex';
              saveBtn.style.display = 'none';
              cancelBtn.style.display = 'none';
              analyzeBtn.textContent = 'AI 다시 분석하기';
            }

            function enterEditMode() {
              editFields.industry.value = roFields.industry.textContent !== '-' ? roFields.industry.textContent : '';
              editFields.target.value = roFields.target.textContent !== '-' ? roFields.target.textContent : '';
              editFields.tone.value = roFields.tone.textContent !== '-' ? roFields.tone.textContent : '';
              editFields.summary.value = roFields.summary.textContent !== '-' ? roFields.summary.textContent : '';
              editFields.keywords.value = roFields.keywords.textContent !== '-' ? roFields.keywords.textContent : '';
              readonlyEl.style.display = 'none';
              editForm.style.display = 'block';
              editBtn.style.display = 'none';
              saveBtn.style.display = 'inline-flex';
              cancelBtn.style.display = 'inline-flex';
            }

            // 기존 데이터 로드
            fetch('/api/ai/identity?shop_id=' + shopId, { credentials: 'same-origin' })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (d.identity && d.identity.industry) {
                  showReadonly(d.identity);
                  // 혜택 로드
                  setRadioValue('couponBenefit', d.identity.coupon_benefit || '');
                  setRadioValue('freeShipping', d.identity.free_shipping || '');
                  setExtraBenefits(d.identity.extra_benefits || []);
                }
              }).catch(function() {});

            // AI 분석
            analyzeBtn.addEventListener('click', async function() {
              analyzeBtn.disabled = true;
              analyzeBtn.textContent = '⏳ AI 분석 중... (30초 이상 소요)';
              analyzeBtn.style.opacity = '0.5';
              analyzeBtn.style.cursor = 'not-allowed';
              try {
                var resp = await fetch('/api/ai/identity', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  credentials: 'same-origin', body: JSON.stringify({ shop_id: shopId })
                });
                var data = await resp.json();
                if (resp.ok && data.identity) {
                  showReadonly(data.identity);
                  showToast('success', 'AI 분석 완료! 수정이 필요하면 수정 버튼을 클릭하세요.');
                } else {
                  showToast('error', data.message || 'AI 분석에 실패했습니다.');
                }
              } catch(e) {
                showToast('error', '오류: ' + e.message);
              } finally {
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'AI 다시 분석하기';
                analyzeBtn.style.opacity = '1';
                analyzeBtn.style.cursor = 'pointer';
              }
            });

            // 수정 모드
            editBtn.addEventListener('click', enterEditMode);

            // 취소
            cancelBtn.addEventListener('click', function() {
              readonlyEl.style.display = 'block';
              editForm.style.display = 'none';
              editBtn.style.display = 'inline-flex';
              saveBtn.style.display = 'none';
              cancelBtn.style.display = 'none';
            });

            // 정체성 저장
            saveBtn.addEventListener('click', async function() {
              var identity = {
                industry: editFields.industry.value.trim(),
                target: editFields.target.value.trim(),
                tone: editFields.tone.value.trim(),
                summary: editFields.summary.value.trim(),
                keywords: editFields.keywords.value.split(',').map(function(k) { return k.trim(); }).filter(Boolean),
              };
              saveBtn.disabled = true; saveBtn.textContent = '저장 중...';
              try {
                var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId, { shop_identity: JSON.stringify(identity) });
                if (resp.ok) {
                  showReadonly(identity);
                  showToast('success', '쇼핑몰 정체성이 저장되었습니다.');
                } else { showToast('error', '저장 중 오류가 발생했습니다.'); }
              } catch(e) { showToast('error', '오류: ' + e.message); }
              finally { saveBtn.disabled = false; saveBtn.textContent = '저장'; }
            });

            // 혜택 저장
            document.getElementById('saveBenefitsBtn').addEventListener('click', async function() {
              var btn = this;
              // 기존 정체성에 혜택 정보 병합
              var resp1 = await fetch('/api/ai/identity?shop_id=' + shopId, { credentials: 'same-origin' });
              var existing = {};
              try { var d = await resp1.json(); existing = d.identity || {}; } catch(e) {}
              existing.coupon_benefit = getRadioValue('couponBenefit');
              existing.free_shipping = getRadioValue('freeShipping');
              existing.extra_benefits = getExtraBenefits();
              btn.disabled = true; btn.textContent = '저장 중...';
              try {
                var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId, { shop_identity: JSON.stringify(existing) });
                if (resp.ok) { showToast('success', '혜택 정보가 저장되었습니다.'); }
                else { showToast('error', '저장 중 오류가 발생했습니다.'); }
              } catch(e) { showToast('error', '오류: ' + e.message); }
              finally { btn.disabled = false; btn.textContent = '혜택 저장'; }
            });
          })();
        `}} />
      </div>
    )}

    {!shop && (
      <div class="alert alert-info" style="margin-bottom:16px">
        아직 연결된 쇼핑몰이 없습니다. 카페24 앱스토어에서 번개가입을 설치하면 자동으로 연결됩니다.
      </div>
    )}

  </Layout>
);

// ─── Login Design Page (삭제됨 — ProvidersPage에 통합) ───────

// ─── Coupon Settings Page ────────────────────────────────────

type CouponConfig2 = {
  enabled: boolean;
  coupon_no: string;
  coupon_name?: string;
  multi_coupon: boolean;
};

export const CouponSettingsPage: FC<{
  shop: { shop_id: string; shop_name: string; plan: string };
  couponConfig: CouponConfig2 | null;
  isCafe24?: boolean;
}> = ({ shop, couponConfig, isCafe24 }) => {
  const isPlus = shop.plan !== 'free';
  const cc = couponConfig ?? { enabled: false, coupon_no: '', coupon_name: '', multi_coupon: false };

  return (
    <Layout title="쿠폰 설정" loggedIn currentPath="/dashboard/settings/coupon" isCafe24={isCafe24}>
      <h1>쿠폰 설정</h1>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">신규 가입 시 자동으로 지급할 쿠폰을 설정합니다.</p>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin-bottom:0">쿠폰 설정</h2>
          <div class="provider-toggle" style="border:none;padding:0;margin-bottom:0">
            <label class="toggle">
              <input type="checkbox" id="couponEnabled" checked={cc.enabled} />
              <span class="toggle-slider"></span>
            </label>
            <span style="font-size:13px;font-weight:600;color:#475569;margin-left:8px">쿠폰 활성화</span>
          </div>
        </div>

        <div id="couponFields" style={cc.enabled ? '' : 'display:none'}>
          <div class="form-group">
            <label style="font-size:13px;font-weight:600;color:#475569">쿠폰 번호 (coupon_no)</label>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="text" id="couponNo" value={cc.coupon_no} placeholder="카페24 쿠폰 번호 입력" style="flex:1;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px" />
            </div>
            <p id="couponNameDisplay" style={`font-size:12px;margin-top:4px;${cc.coupon_name ? 'color:#22c55e' : 'color:#94a3b8'}`}>
              {cc.coupon_name || ''}
            </p>
          </div>

          <div class="provider-toggle" style="border:none;padding:0;margin-top:12px">
            <label class="toggle">
              <input type="checkbox" id="multiCoupon" checked={cc.multi_coupon} disabled={!isPlus} />
              <span class="toggle-slider" style={isPlus ? '' : 'cursor:not-allowed;opacity:0.5'}></span>
            </label>
            <span style="font-size:13px;font-weight:600;color:#475569;margin-left:8px">멀티 쿠폰</span>
            {!isPlus && <span class="badge badge-gray" style="margin-left:8px">Plus 전용</span>}
            <span style="font-size:12px;color:#94a3b8;margin-left:8px">신규 가입 시 여러 쿠폰 동시 지급</span>
          </div>
        </div>

        <div style="margin-top:16px;display:flex;justify-content:flex-end">
          <button id="saveCouponBtn" class="btn btn-primary btn-sm">저장</button>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          var shopId = '${shop.shop_id}';
          var isPlus = ${JSON.stringify(isPlus)};

          var enabledToggle = document.getElementById('couponEnabled');
          var couponFields = document.getElementById('couponFields');
          var multiCouponToggle = document.getElementById('multiCoupon');

          enabledToggle.addEventListener('change', function() {
            couponFields.style.display = this.checked ? '' : 'none';
          });

          if (!isPlus) {
            multiCouponToggle.addEventListener('click', function(e) {
              e.preventDefault();
              showToast('warn', '멀티 쿠폰은 Plus 플랜에서만 사용할 수 있습니다.');
            });
          }

          document.getElementById('saveCouponBtn').addEventListener('click', async function() {
            var btn = this;
            var couponNo = document.getElementById('couponNo').value.trim();
            var enabled = enabledToggle.checked;
            var multiCoupon = multiCouponToggle.checked && isPlus;

            if (enabled && !couponNo) {
              showToast('warn', '쿠폰 번호를 입력해주세요.');
              return;
            }

            var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/coupon', {
              enabled: enabled,
              coupon_no: couponNo,
              multi_coupon: multiCoupon,
            }, btn);

            if (resp.ok) {
              var data = await resp.json();
              var nameEl = document.getElementById('couponNameDisplay');
              if (nameEl) {
                if (data.coupon_name) {
                  nameEl.textContent = data.coupon_name;
                  nameEl.style.color = '#22c55e';
                } else {
                  nameEl.textContent = '';
                }
              }
              showToast('success', '쿠폰 설정이 저장되었습니다.');
            } else {
              var err = await resp.json();
              showToast('error', err.error || '저장 중 오류가 발생했습니다.');
            }
          });
        })();
      `}} />
    </Layout>
  );
};

// ─── Banner Settings Page [Plus] ────────────────────────────

export const BannerSettingsPage: FC<{
  shop: { plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  // shop이 null이면 Plus가 아님 (null일 때 true가 되는 버그 수정)
  const isPlus = shop?.plan === 'plus';
  return (
    <Layout title="미니배너" loggedIn currentPath="/dashboard/settings/banner" isCafe24={isCafe24}>
      <h1>미니배너</h1>
      {!isPlus
        ? <PlusLockOverlay feature="미니배너" />
        : (
          <div class="card">
            <h2>미니배너 설정</h2>
            <p style="font-size:14px;color:#64748b">미니배너 설정 기능은 준비 중입니다.</p>
          </div>
        )
      }
    </Layout>
  );
};

// ─── Popup Settings Page [Plus] ─────────────────────────────

export const PopupSettingsPage: FC<{
  shop: { plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  // shop이 null이면 Plus가 아님 (null일 때 true가 되는 버그 수정)
  const isPlus = shop?.plan === 'plus';
  return (
    <Layout title="이탈 감지 팝업" loggedIn currentPath="/dashboard/settings/popup" isCafe24={isCafe24}>
      <h1>이탈 감지 팝업</h1>
      {!isPlus
        ? <PlusLockOverlay feature="이탈 감지 팝업" />
        : (
          <div class="card">
            <h2>이탈 감지 팝업 설정</h2>
            <p style="font-size:14px;color:#64748b">이탈 감지 팝업 설정 기능은 준비 중입니다.</p>
          </div>
        )
      }
    </Layout>
  );
};

// ─── Escalation Settings Page [Plus] ────────────────────────

export const EscalationSettingsPage: FC<{
  shop: { plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  // shop이 null이면 Plus가 아님 (null일 때 true가 되는 버그 수정)
  const isPlus = shop?.plan === 'plus';
  return (
    <Layout title="에스컬레이션" loggedIn currentPath="/dashboard/settings/escalation" isCafe24={isCafe24}>
      <h1>에스컬레이션</h1>
      {!isPlus
        ? <PlusLockOverlay feature="에스컬레이션" />
        : (
          <div class="card">
            <h2>에스컬레이션 설정</h2>
            <p style="font-size:14px;color:#64748b">에스컬레이션 설정 기능은 준비 중입니다.</p>
          </div>
        )
      }
    </Layout>
  );
};

// ─── Kakao Settings Page [Plus] ─────────────────────────────

export const KakaoSettingsPage: FC<{
  shop: { shop_id: string; plan: string };
  kakaoChannelId: string;
  isCafe24?: boolean;
}> = ({ shop, kakaoChannelId, isCafe24 }) => {
  const isPlus = shop.plan !== 'free';
  return (
    <Layout title="카카오 채널" loggedIn currentPath="/dashboard/settings/kakao" isCafe24={isCafe24}>
      <h1>카카오 채널</h1>
      {!isPlus
        ? <PlusLockOverlay feature="카카오 채널" />
        : (
          <div class="card">
            <h2>카카오 채널 ID</h2>
            <p style="font-size:13px;color:#64748b;margin-bottom:16px">신규 가입 시 카카오 채널 추가 유도에 사용됩니다.</p>
            <div class="form-group" style="max-width:360px">
              <input
                type="text"
                id="kakaoChannelId"
                value={kakaoChannelId}
                placeholder="예: @my-shop-kakao"
                style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"
              />
            </div>
            <button id="saveKakaoBtn" class="btn btn-primary btn-sm">저장</button>
            <script dangerouslySetInnerHTML={{__html: `
              document.getElementById('saveKakaoBtn').addEventListener('click', async function() {
                var channelId = document.getElementById('kakaoChannelId').value.trim();
                var resp = await apiCall('PUT', '/api/dashboard/shops/${shop.shop_id}/kakao-channel', { kakao_channel_id: channelId }, this);
                if (resp.ok) {
                  showToast('success', '카카오 채널 ID가 저장되었습니다.');
                } else {
                  var err = await resp.json();
                  showToast('error', err.error || '저장 중 오류가 발생했습니다.');
                }
              });
            `}} />
          </div>
        )
      }
    </Layout>
  );
};

// ─── AI Settings Page [Plus] ─────────────────────────────────

export const AiSettingsPage: FC<{
  shop: { shop_id?: string; plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  const isPlus = shop?.plan !== 'free';
  return (
    <Layout title="AI 설정" loggedIn currentPath="/dashboard/settings/ai" isCafe24={isCafe24}>
      <h1>AI 설정</h1>
      {!isPlus
        ? <PlusLockOverlay feature="AI 설정" />
        : (
          <div>
            <div class="card">
              <h2>AI 쇼핑몰 정체성 분석</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:16px">업종·타겟 고객·톤앤매너를 AI가 자동 분석합니다.</p>
              <button
                id="analyzeIdentityBtn"
                class="btn btn-outline btn-sm"
                data-shop-id={shop?.shop_id ?? ''}
              >
                쇼핑몰 분석하기
              </button>
              <div id="identityResult" style="display:none;margin-top:12px;background:#f8fafc;border-radius:8px;padding:12px;font-size:13px;color:#374151;white-space:pre-wrap"></div>
              <script dangerouslySetInnerHTML={{__html: `
                document.getElementById('analyzeIdentityBtn').addEventListener('click', async function() {
                  var btn = this;
                  var resultEl = document.getElementById('identityResult');
                  btn.disabled = true;
                  btn.textContent = '분석 중...';
                  resultEl.style.display = 'none';
                  try {
                    var resp = await fetch('/api/ai/identity', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'same-origin',
                      body: JSON.stringify({ shop_id: btn.dataset.shopId })
                    });
                    var data = await resp.json();
                    if (resp.ok && data.identity) {
                      var id = data.identity;
                      resultEl.textContent = ['업종: ' + (id.industry||'-'), '타겟: ' + (id.target_audience||'-'), '톤앤매너: ' + (id.tone||'-'), id.summary ? '\\n' + id.summary : ''].filter(Boolean).join('\\n');
                      resultEl.style.display = 'block';
                      showToast('success', 'AI 분석이 완료되었습니다.');
                    } else {
                      showToast('error', data.message || 'AI 분석에 실패했습니다.');
                    }
                  } catch(e) {
                    showToast('error', '오류: ' + e.message);
                  } finally {
                    btn.disabled = false;
                    btn.textContent = '쇼핑몰 분석하기';
                  }
                });
              `}} />
            </div>
          </div>
        )
      }
    </Layout>
  );
};

// ─── Guide Page ──────────────────────────────────────────────

export const GuidePage: FC<{ isCafe24?: boolean }> = ({ isCafe24 }) => (
  <Layout title="사용 가이드" loggedIn currentPath="/dashboard/guide" isCafe24={isCafe24}>
    <h1>사용 가이드</h1>

    <div class="card">
      <h2>시작하기</h2>
      <ol style="padding-left:20px;font-size:14px;line-height:2.2">
        <li>카페24 앱스토어에서 <strong>번개가입</strong>을 설치합니다.</li>
        <li>설치 완료 후 대시보드에서 <strong>SSO 설정 가이드</strong>를 확인하세요.</li>
        <li>카페24 쇼핑몰 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>SSO 로그인 연동 관리</strong>에서 설정합니다.</li>
        <li><strong>소셜 프로바이더</strong>에서 사용할 소셜 로그인 서비스를 활성화합니다.</li>
        <li>쇼핑몰 로그인 페이지에서 번개가입 버튼이 정상 표시되는지 확인합니다.</li>
      </ol>
    </div>

    <div class="card">
      <h2>SSO 설정</h2>
      <p style="font-size:14px;color:#64748b;margin-bottom:12px">카페24 SSO 연동을 위해 다음 값들이 필요합니다.</p>
      <ul style="padding-left:20px;font-size:14px;line-height:2">
        <li><strong>연동 서비스명</strong>: 번개가입</li>
        <li><strong>Client ID / Client Secret</strong>: 설정 &gt; SSO 설정 가이드에서 확인</li>
        <li><strong>Authorize Redirect URL</strong>: SSO 설정 가이드에서 복사</li>
        <li><strong>Access Token Return API</strong>: SSO 설정 가이드에서 복사</li>
        <li><strong>User info Return API</strong>: SSO 설정 가이드에서 복사</li>
      </ul>
      <a href="/dashboard/settings/sso-guide" class="btn btn-primary btn-sm" style="margin-top:12px;display:inline-flex;width:auto">SSO 설정 가이드 바로가기</a>
    </div>

    <div class="card">
      <h2>쿠폰 설정</h2>
      <p style="font-size:14px;color:#64748b;margin-bottom:12px">신규 가입 시 자동으로 쿠폰을 지급할 수 있습니다.</p>
      <ol style="padding-left:20px;font-size:14px;line-height:2">
        <li>카페24 쇼핑몰 관리자에서 발급할 쿠폰을 먼저 생성합니다.</li>
        <li>대시보드 &gt; 설정 &gt; 쿠폰 설정에서 쿠폰 번호를 입력합니다.</li>
        <li>쿠폰 활성화 토글을 켭니다.</li>
      </ol>
      <a href="/dashboard/settings/coupon" class="btn btn-outline btn-sm" style="margin-top:12px;display:inline-flex;width:auto">쿠폰 설정 바로가기</a>
    </div>

    <div class="card">
      <h2>Plus 기능</h2>
      <ul style="padding-left:20px;font-size:14px;line-height:2">
        <li><strong>미니배너</strong>: 쇼핑몰 내 소셜 가입 유도 배너</li>
        <li><strong>이탈 감지 팝업</strong>: 페이지 이탈 시 소셜 가입 유도</li>
        <li><strong>에스컬레이션</strong>: 특정 조건 달성 시 자동 혜택 제공</li>
        <li><strong>카카오 채널</strong>: 신규 가입 시 카카오 채널 추가 유도</li>
        <li><strong>AI 설정</strong>: 쇼핑몰 맞춤 AI 분석</li>
        <li><strong>AI 보고서</strong>: 주간 성과 분석 AI 리포트</li>
        <li><strong>멀티 쿠폰</strong>: 여러 쿠폰 동시 지급</li>
      </ul>
      <a href="/dashboard/billing" class="btn btn-primary btn-sm" style="margin-top:12px;display:inline-flex;width:auto">Plus 업그레이드</a>
    </div>
  </Layout>
);

// ─── Inquiries Page ──────────────────────────────────────────

type InquiryRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  replied_at: string | null;
  shop_name: string | null;
  mall_id: string;
};

const inquiryStatusLabel = (status: string) => {
  if (status === 'pending') return { label: '접수됨', cls: 'badge-yellow' };
  if (status === 'replied') return { label: '답변완료', cls: 'badge-green' };
  if (status === 'closed') return { label: '종료', cls: 'badge-gray' };
  return { label: status, cls: 'badge-gray' };
};

export const InquiriesPage: FC<{
  isCafe24?: boolean;
  inquiries: InquiryRow[];
}> = ({ isCafe24, inquiries }) => (
  <Layout title="문의하기" loggedIn currentPath="/dashboard/inquiries" isCafe24={isCafe24}>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">
      <h1 style="margin-bottom:0">문의하기</h1>
      <button
        id="openInquiryForm"
        class="btn btn-primary"
        style="width:auto"
      >
        + 문의 작성
      </button>
    </div>

    {/* 문의 작성 폼 (기본 숨김) */}
    <div id="inquiryForm" class="card" style="display:none;margin-bottom:24px">
      <h2 style="margin-bottom:16px">새 문의 작성</h2>
      <div class="form-group">
        <label for="inquiryTitle">제목</label>
        <input type="text" id="inquiryTitle" placeholder="문의 제목을 입력해 주세요" maxlength={200} />
      </div>
      <div class="form-group">
        <label for="inquiryContent">내용</label>
        <textarea
          id="inquiryContent"
          placeholder="문의 내용을 자세히 작성해 주세요"
          rows={6}
          style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical"
        />
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button id="cancelInquiry" class="btn btn-outline" style="width:auto">취소</button>
        <button id="submitInquiry" class="btn btn-primary" style="width:auto">제출</button>
      </div>
    </div>

    {/* 문의 목록 */}
    <div class="card">
      <h2 style="margin-bottom:16px">내 문의 목록</h2>
      {inquiries.length === 0 ? (
        <div class="empty-state">
          <p style="color:#64748b;font-size:14px">아직 문의 내역이 없습니다. 위 버튼을 눌러 문의를 남겨보세요.</p>
          <p style="font-size:13px;color:#94a3b8;margin-top:8px">
            긴급 문의: <a href="mailto:help@suparain.com">help@suparain.com</a> / 031-992-5988
          </p>
        </div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>쇼핑몰</th>
                <th>상태</th>
                <th>작성일</th>
                <th>답변일</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const st = inquiryStatusLabel(inq.status);
                return (
                  <tr style="cursor:pointer" onclick={`window.location.href='/dashboard/inquiries/${inq.id}'`}>
                    <td style="font-size:13px;font-weight:500">{inq.title}</td>
                    <td style="font-size:12px;color:#64748b">{inq.shop_name || inq.mall_id}</td>
                    <td><span class={`badge ${st.cls}`}>{st.label}</span></td>
                    <td style="font-size:12px;color:#64748b;white-space:nowrap">{inq.created_at.slice(0, 10)}</td>
                    <td style="font-size:12px;color:#64748b;white-space:nowrap">{inq.replied_at ? inq.replied_at.slice(0, 10) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      var form = document.getElementById('inquiryForm');
      document.getElementById('openInquiryForm').addEventListener('click', function() {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('cancelInquiry').addEventListener('click', function() {
        form.style.display = 'none';
        document.getElementById('inquiryTitle').value = '';
        document.getElementById('inquiryContent').value = '';
      });
      document.getElementById('submitInquiry').addEventListener('click', async function() {
        var title = document.getElementById('inquiryTitle').value.trim();
        var content = document.getElementById('inquiryContent').value.trim();
        if (!title) { showToast('error', '제목을 입력해 주세요.'); return; }
        if (!content) { showToast('error', '내용을 입력해 주세요.'); return; }
        var btn = this;
        btn.disabled = true;
        btn.textContent = '제출 중...';
        try {
          var resp = await apiCall('POST', '/api/dashboard/inquiries', { title: title, content: content }, btn);
          if (resp.ok) {
            showToast('success', '문의가 접수되었습니다.');
            setTimeout(function() { location.reload(); }, 1000);
          } else {
            var data = await resp.json();
            showToast('error', data.error || '문의 제출 중 오류가 발생했습니다.');
          }
        } finally {
          btn.disabled = false;
          btn.textContent = '제출';
        }
      });
    `}} />
  </Layout>
);

// ─── Inquiry Detail Page ──────────────────────────────────────

type InquiryDetail = {
  id: string;
  title: string;
  content: string;
  status: string;
  reply: string | null;
  replied_at: string | null;
  created_at: string;
  shop_name: string | null;
  mall_id: string;
};

export const InquiryDetailPage: FC<{
  isCafe24?: boolean;
  inquiry: InquiryDetail;
}> = ({ isCafe24, inquiry }) => {
  const st = inquiryStatusLabel(inquiry.status);
  return (
    <Layout title="문의 상세" loggedIn currentPath="/dashboard/inquiries" isCafe24={isCafe24}>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <a href="/dashboard/inquiries" style="color:#64748b;font-size:14px">← 목록으로</a>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
          <h1 style="font-size:20px;margin-bottom:0">{inquiry.title}</h1>
          <span class={`badge ${st.cls}`}>{st.label}</span>
        </div>
        <div style="font-size:12px;color:#94a3b8;margin-bottom:16px">
          {inquiry.shop_name || inquiry.mall_id} · {inquiry.created_at.slice(0, 16).replace('T', ' ')}
        </div>
        <div style="font-size:14px;line-height:1.8;white-space:pre-wrap;border-top:1px solid #f1f5f9;padding-top:16px">
          {inquiry.content}
        </div>
      </div>

      {inquiry.reply ? (
        <div class="card" style="border-left:4px solid #2563eb">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-weight:700;font-size:14px;color:#2563eb">관리자 답변</span>
            <span style="font-size:12px;color:#94a3b8">{inquiry.replied_at ? inquiry.replied_at.slice(0, 16).replace('T', ' ') : ''}</span>
          </div>
          <div style="font-size:14px;line-height:1.8;white-space:pre-wrap">{inquiry.reply}</div>
        </div>
      ) : (
        <div class="card" style="text-align:center;padding:32px;color:#94a3b8;font-size:14px">
          아직 답변이 등록되지 않았습니다. 영업일 기준 1~2일 내에 답변드립니다.
        </div>
      )}
    </Layout>
  );
};

// ─── Admin Inquiries Page ─────────────────────────────────────

type AdminInquiryRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  replied_at: string | null;
  owner_email: string;
  shop_name: string | null;
  mall_id: string;
};

export const AdminInquiriesPage: FC<{
  inquiries: AdminInquiryRow[];
  pagination: { page: number; pages: number; total: number };
  statusFilter: string;
}> = ({ inquiries, pagination, statusFilter }) => (
  <Layout title="문의 관리" loggedIn isAdmin currentPath="/admin/inquiries">
    <h1>문의 관리</h1>

    <div class="filter-bar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      {['', 'pending', 'replied', 'closed'].map((s) => {
        const labels: Record<string, string> = { '': '전체', pending: '미답변', replied: '답변완료', closed: '종료' };
        const active = statusFilter === s;
        return (
          <a
            href={s ? `/admin/inquiries?status=${s}` : '/admin/inquiries'}
            class={`btn btn-sm ${active ? 'btn-primary' : 'btn-outline'}`}
            style="width:auto"
          >
            {labels[s]}
          </a>
        );
      })}
      <span style="margin-left:auto;font-size:13px;color:#64748b;align-self:center">전체 {pagination.total}건</span>
    </div>

    <div class="card">
      {inquiries.length === 0 ? (
        <div class="empty-state"><p>문의가 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>사용자</th>
                <th>쇼핑몰</th>
                <th>상태</th>
                <th>작성일</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const st = inquiryStatusLabel(inq.status);
                return (
                  <tr>
                    <td style="font-size:13px;font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      {inq.title}
                    </td>
                    <td style="font-size:12px;color:#64748b">{inq.owner_email}</td>
                    <td style="font-size:12px;color:#64748b">{inq.shop_name || inq.mall_id}</td>
                    <td><span class={`badge ${st.cls}`}>{st.label}</span></td>
                    <td style="font-size:12px;color:#64748b;white-space:nowrap">{inq.created_at.slice(0, 10)}</td>
                    <td>
                      <button
                        class="btn btn-primary btn-sm reply-btn"
                        data-id={inq.id}
                        data-title={inq.title}
                        style="font-size:11px;padding:4px 8px;width:auto"
                      >
                        답변
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {pagination.pages > 1 && (
        <div style="display:flex;gap:8px;justify-content:center;margin-top:16px">
          {pagination.page > 1 && (
            <a href={`/admin/inquiries?page=${pagination.page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/admin/inquiries?page=${pagination.page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      )}
    </div>

    {/* 답변 모달 */}
    <div id="replyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:12px;padding:32px;width:100%;max-width:560px;margin:24px">
        <h2 style="margin-bottom:8px;font-size:18px">답변 작성</h2>
        <p id="replyModalTitle" style="font-size:13px;color:#64748b;margin-bottom:16px"></p>
        <textarea
          id="replyContent"
          placeholder="답변 내용을 입력해 주세요"
          rows={6}
          style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical"
        />
        <input type="hidden" id="replyTargetId" />
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button id="cancelReply" class="btn btn-outline" style="width:auto">취소</button>
          <button id="submitReply" class="btn btn-primary" style="width:auto">답변 등록</button>
        </div>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      var modal = document.getElementById('replyModal');
      document.querySelectorAll('.reply-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          document.getElementById('replyTargetId').value = this.dataset.id;
          document.getElementById('replyModalTitle').textContent = this.dataset.title;
          document.getElementById('replyContent').value = '';
          modal.style.display = 'flex';
        });
      });
      document.getElementById('cancelReply').addEventListener('click', function() {
        modal.style.display = 'none';
      });
      document.getElementById('submitReply').addEventListener('click', async function() {
        var id = document.getElementById('replyTargetId').value;
        var reply = document.getElementById('replyContent').value.trim();
        if (!reply) { showToast('error', '답변 내용을 입력해 주세요.'); return; }
        var btn = this;
        btn.disabled = true; btn.textContent = '등록 중...';
        try {
          var resp = await apiCall('PUT', '/api/admin/inquiries/' + id + '/reply', { reply: reply }, btn);
          if (resp.ok) {
            showToast('success', '답변이 등록되었습니다.');
            modal.style.display = 'none';
            setTimeout(function() { location.reload(); }, 1000);
          } else {
            var data = await resp.json();
            showToast('error', data.error || '답변 등록 중 오류가 발생했습니다.');
          }
        } finally {
          btn.disabled = false; btn.textContent = '답변 등록';
        }
      });
      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.style.display = 'none';
      });
    `}} />
  </Layout>
);

// ─── Admin AI Reports Page ────────────────────────────────────

type AdminAiReportRow = {
  shop_id: string;
  shop_name: string | null;
  mall_id: string;
  plan: string;
  shop_identity: string | null;
  briefing_id: string | null;
  briefing_type: string | null;
  summary: string | null;
  briefing_created_at: string | null;
};

export const AdminAiReportsPage: FC<{
  shops: AdminAiReportRow[];
}> = ({ shops }) => (
  <Layout title="AI 보고서" loggedIn isAdmin currentPath="/admin/ai-reports">
    <h1>AI 보고서 현황</h1>
    <p style="font-size:14px;color:#64748b;margin-bottom:24px">
      전체 쇼핑몰의 AI 주간 브리핑 최신 현황입니다.
    </p>

    <div class="card">
      {shops.length === 0 ? (
        <div class="empty-state"><p>쇼핑몰 데이터가 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>쇼핑몰</th>
                <th>Mall ID</th>
                <th>플랜</th>
                <th>정체성 설정</th>
                <th>최근 브리핑</th>
                <th>브리핑 요약</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((row) => (
                <tr>
                  <td style="font-size:13px;font-weight:500">{row.shop_name || '-'}</td>
                  <td style="font-size:12px;color:#64748b">{row.mall_id}</td>
                  <td>
                    <span class={`badge ${row.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>
                      {row.plan}
                    </span>
                  </td>
                  <td style="font-size:12px;color:#64748b">
                    {row.shop_identity ? (
                      <span style="color:#16a34a">설정됨</span>
                    ) : (
                      <span style="color:#dc2626">미설정</span>
                    )}
                  </td>
                  <td style="font-size:12px;color:#64748b;white-space:nowrap">
                    {row.briefing_created_at ? row.briefing_created_at.slice(0, 10) : '-'}
                  </td>
                  <td style="font-size:12px;color:#64748b;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {row.summary || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </Layout>
);
