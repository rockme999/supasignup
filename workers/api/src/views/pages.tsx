/**
 * Dashboard SSR page components.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';

// ─── Helper Components ──────────────────────────────────────

const providerColors: Record<string, string> = {
  google: '#4285f4',
  kakao: '#fee500',
  naver: '#03c75a',
  apple: '#000000',
  toss: '#0064ff',
  discord: '#5865f2',
  telegram: '#26a5e4',
  tiktok: '#000000',
};

const providerDisplayNames: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
  apple: 'Apple',
  toss: '토스',
  discord: 'Discord',
  telegram: 'Telegram',
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
    <div class="auth-page">
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
        <script>{`
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const resp = await apiCall('POST', '/api/dashboard/auth/login', {
              email: form.email.value,
              password: form.password.value,
            });
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              alert(data.error === 'rate_limited' ? '로그인 시도 횟수 초과. 5분 후 다시 시도하세요.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
            }
          });
        `}</script>
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
          <button type="submit" class="btn btn-primary">회원가입</button>
        </form>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:#64748b">
          이미 계정이 있으신가요? <a href="/dashboard/login">로그인</a>
        </p>
        <script>{`
          document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const resp = await apiCall('POST', '/api/dashboard/auth/register', {
              name: form.name.value,
              email: form.email.value,
              password: form.password.value,
            });
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              const messages = { email_exists: '이미 가입된 이메일입니다.', weak_password: '비밀번호는 8자 이상이어야 합니다.' };
              alert(messages[data.error] || '회원가입 중 오류가 발생했습니다.');
            }
          });
        `}</script>
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

type BillingShop = {
  shop_id: string;
  shop_name: string;
  plan: string;
  monthly_signups: number;
  usage_percent: number | null;
  needs_upgrade: boolean;
  is_over_limit: boolean;
};

export const HomePage: FC<{ stats: HomeStats; billingShops: BillingShop[] }> = ({ stats, billingShops }) => (
  <Layout title="대시보드" loggedIn currentPath="/dashboard">
    <h1>대시보드</h1>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="label">전체 가입</div>
        <div class="value">{stats.total_signups.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">전체 로그인</div>
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

    {billingShops.some((s) => s.needs_upgrade) && (
      <div class="alert alert-warn">
        무료 플랜 한도(100건/월)에 근접한 쇼핑몰이 있습니다. <a href="/dashboard/billing">과금 현황 확인 →</a>
      </div>
    )}

    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin-bottom:0">쇼핑몰 과금 현황</h2>
        <a href="/dashboard/billing" style="font-size:13px">자세히 보기 →</a>
      </div>
      {billingShops.length === 0 ? (
        <div class="empty-state">
          <p>등록된 쇼핑몰이 없습니다.</p>
          <a href="/dashboard/shops/new" class="btn btn-primary btn-sm">쇼핑몰 등록</a>
        </div>
      ) : (
        <>
          {billingShops.filter(s => s.plan === 'free').map((shop) => (
            <ProgressBar
              label={shop.shop_name || shop.shop_id}
              value={shop.monthly_signups}
              max={100}
              color={shop.is_over_limit ? '#ef4444' : shop.needs_upgrade ? '#f59e0b' : '#22c55e'}
            />
          ))}
          <table style="margin-top:12px">
            <thead><tr><th>쇼핑몰</th><th>플랜</th><th>이번 달 가입</th><th>상태</th></tr></thead>
            <tbody>
              {billingShops.map((shop) => (
                <tr>
                  <td><a href={`/dashboard/shops/${shop.shop_id}`}>{shop.shop_name || shop.shop_id}</a></td>
                  <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan}</span></td>
                  <td>{shop.monthly_signups}{shop.usage_percent !== null && <span style="color:#94a3b8"> / 100 ({shop.usage_percent}%)</span>}</td>
                  <td>
                    {shop.is_over_limit && <span class="badge badge-red">한도 초과</span>}
                    {!shop.is_over_limit && shop.needs_upgrade && <span class="badge badge-yellow">한도 근접</span>}
                    {!shop.is_over_limit && !shop.needs_upgrade && <span class="badge badge-green">정상</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  </Layout>
);

// ─── Shops List ──────────────────────────────────────────────

type ShopListItem = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  platform: string;
  plan: string;
  enabled_providers: string;
  created_at: string;
};

export const ShopsPage: FC<{ shops: ShopListItem[] }> = ({ shops }) => (
  <Layout title="쇼핑몰 관리" loggedIn currentPath="/dashboard/shops">
    <h1>쇼핑몰 관리</h1>
    <div style="margin-bottom: 16px;">
      <a href="/dashboard/shops/new" class="btn btn-primary btn-sm">+ 쇼핑몰 등록</a>
    </div>

    {shops.length === 0 ? (
      <div class="card">
        <div class="empty-state">
          <p>등록된 쇼핑몰이 없습니다.</p>
          <p style="font-size:13px">카페24 앱 설치를 통해 자동으로 등록되거나, 직접 등록할 수 있습니다.</p>
        </div>
      </div>
    ) : (
      <div class="card">
        <table>
          <thead><tr><th>쇼핑몰명</th><th>Mall ID</th><th>플랫폼</th><th>플랜</th><th>프로바이더</th><th></th></tr></thead>
          <tbody>
            {shops.map((shop) => {
              const providers = parseProviders(shop.enabled_providers);
              return (
                <tr>
                  <td>{shop.shop_name || '-'}</td>
                  <td>{shop.mall_id}</td>
                  <td>{shop.platform || 'cafe24'}</td>
                  <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan}</span></td>
                  <td>{(providers as string[]).join(', ') || '-'}</td>
                  <td><a href={`/dashboard/shops/${shop.shop_id}`}>설정</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </Layout>
);

// ─── Shop New ────────────────────────────────────────────────

export const ShopNewPage: FC = () => (
  <Layout title="쇼핑몰 등록" loggedIn currentPath="/dashboard/shops">
    <h1>쇼핑몰 등록</h1>
    <div class="card">
      <form id="newShopForm">
        <div class="form-group">
          <label>Mall ID (카페24 쇼핑몰 ID)</label>
          <input type="text" name="mall_id" required placeholder="예: myshop" />
        </div>
        <div class="form-group">
          <label>쇼핑몰명 (선택)</label>
          <input type="text" name="shop_name" placeholder="예: 마이쇼핑몰" />
        </div>
        <div class="form-group">
          <label>플랫폼</label>
          <select name="platform">
            <option value="cafe24">카페24</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary">등록</button>
      </form>
      <script>{`
        document.getElementById('newShopForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const resp = await apiCall('POST', '/api/dashboard/shops', {
            mall_id: form.mall_id.value,
            shop_name: form.shop_name.value || undefined,
            platform: form.platform.value,
          });
          if (resp.ok) {
            const data = await resp.json();
            window.location.href = '/dashboard/shops/' + data.shop.shop_id;
          } else {
            const data = await resp.json();
            alert(data.error === 'duplicate_mall_id' ? '이미 등록된 Mall ID입니다.' : '등록 중 오류가 발생했습니다.');
          }
        });
      `}</script>
    </div>
  </Layout>
);

// ─── Shop Detail ─────────────────────────────────────────────

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

export const ShopDetailPage: FC<{
  shop: ShopDetail;
  monthlySignups: number;
  baseUrl: string;
}> = ({ shop, monthlySignups, baseUrl }) => {
  const providers = parseProviders(shop.enabled_providers);

  return (
    <Layout title={shop.shop_name || shop.mall_id} loggedIn currentPath="/dashboard/shops">
      <h1>{shop.shop_name || shop.mall_id}</h1>

      <div class="tab-nav">
        <a href={`/dashboard/shops/${shop.shop_id}`} class="active">설정</a>
        <a href={`/dashboard/shops/${shop.shop_id}/providers`}>프로바이더</a>
        <a href={`/dashboard/shops/${shop.shop_id}/setup`}>SSO 가이드</a>
      </div>

      <div class="card">
        <h2>기본 정보</h2>
        <table>
          <tbody>
            <tr><th style="width:140px">Shop ID</th><td>{shop.shop_id}</td></tr>
            <tr><th>Mall ID</th><td>{shop.mall_id}</td></tr>
            <tr><th>플랫폼</th><td>{shop.platform || 'cafe24'}</td></tr>
            <tr><th>플랜</th><td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan}</span></td></tr>
            <tr><th>이번 달 가입</th><td>{monthlySignups}{shop.plan === 'free' && ' / 100'}</td></tr>
            <tr><th>Client ID</th><td>
              <code>{shop.client_id}</code>
              <button class="copy-btn" data-copy={shop.client_id} style="position:static; margin-left:8px">복사</button>
            </td></tr>
            <tr><th>Client Secret</th><td>
              <code>{shop.client_secret}</code>
              <span style="color:#94a3b8; font-size:12px; margin-left:8px">(마스킹됨)</span>
            </td></tr>
          </tbody>
        </table>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin-bottom:0">소셜 프로바이더</h2>
          <a href={`/dashboard/shops/${shop.shop_id}/providers`} class="btn btn-outline btn-sm">관리 →</a>
        </div>
        <p style="font-size:13px; color:#64748b">
          활성: {providers.length > 0 ? providers.map(p => providerDisplayNames[p] || p).join(', ') : '없음'}
        </p>
      </div>

      <div class="card" style={`border: 1px solid ${shop.sso_configured ? '#dcfce7' : '#fef3c7'}`}>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <h2 style="margin-bottom:4px">SSO 설정 {shop.sso_configured ? <span class="badge badge-green">완료</span> : <span class="badge badge-yellow">미완료</span>}</h2>
            <p style="font-size:13px;color:#64748b">카페24 관리자에서 SSO 연동 설정이 필요합니다.</p>
          </div>
          <a href={`/dashboard/shops/${shop.shop_id}/setup`} class="btn btn-primary btn-sm">SSO 설정 가이드</a>
        </div>
      </div>

      <div class="card" style="border: 1px solid #fee2e2">
        <h2 style="color:#991b1b">위험 영역</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:12px">쇼핑몰을 삭제하면 소셜 로그인이 비활성화됩니다.</p>
        <button id="deleteShopBtn" class="btn btn-danger btn-sm" data-shop-id={shop.shop_id}>쇼핑몰 삭제</button>
        <script>{`
          document.getElementById('deleteShopBtn').addEventListener('click', async function() {
            if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
            const resp = await apiCall('DELETE', '/api/dashboard/shops/' + this.dataset.shopId);
            if (resp.ok) { window.location.href = '/dashboard/shops'; }
            else { alert('삭제 중 오류가 발생했습니다.'); }
          });
        `}</script>
      </div>
    </Layout>
  );
};

// ─── Shop Setup (SSO Guide) ─────────────────────────────────

export const ShopSetupPage: FC<{
  shop: ShopDetail;
  clientId: string;
  baseUrl: string;
}> = ({ shop, clientId, baseUrl }) => (
  <Layout title="SSO 설정" loggedIn currentPath="/dashboard/shops">
    <h1>{shop.shop_name || shop.mall_id}</h1>

    <div class="tab-nav">
      <a href={`/dashboard/shops/${shop.shop_id}`}>설정</a>
      <a href={`/dashboard/shops/${shop.shop_id}/providers`}>프로바이더</a>
      <a href={`/dashboard/shops/${shop.shop_id}/setup`} class="active">SSO 가이드</a>
    </div>

    <div class="alert alert-info">
      카페24 쇼핑몰 관리자 &gt; 쇼핑몰 설정 &gt; 기본 설정 &gt; <strong>외부 로그인 설정</strong>에서 아래 정보를 등록하세요.
    </div>

    <div class="card">
      <h2>1. SSO 로그인 연동 등록</h2>
      <p style="font-size:13px; color:#64748b; margin-bottom:16px">외부 로그인 설정 &gt; SSO 로그인 연동 등록에서 아래 정보를 입력합니다.</p>

      <div style="margin-bottom:12px">
        <strong>연동 서비스명</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy="번개가입">복사</button>
          번개가입
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong>Client ID</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={clientId}>복사</button>
          {clientId}
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong>Client Secret</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={shop.client_secret}>복사</button>
          {shop.client_secret}
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong>Authorize Redirect URL</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/authorize`}>복사</button>
          {baseUrl}/oauth/authorize
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong>Access Token Return API</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/token`}>복사</button>
          {baseUrl}/oauth/token
        </div>
      </div>

      <div style="margin-bottom:12px">
        <strong>User info Return API</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/userinfo`}>복사</button>
          {baseUrl}/oauth/userinfo
        </div>
      </div>
    </div>

    <div class="card">
      <h2>2. 설정 확인</h2>
      <ol style="padding-left:20px; font-size:14px; line-height:1.8">
        <li>사용 여부: <strong>사용함</strong> 선택</li>
        <li>약관동의 사전 진행 여부: 체크 권장 (추가 팝업 생략)</li>
        <li>저장 후 쇼핑몰 로그인 페이지에서 번개가입 버튼 확인</li>
      </ol>
    </div>

    <div style="margin-top:16px">
      <a href={`/dashboard/shops/${shop.shop_id}`} class="btn btn-outline btn-sm">돌아가기</a>
    </div>
  </Layout>
);

// ─── Stats Page ─────────────────────────────────────────────

type StatsPageProps = {
  stats: HomeStats;
  daily: DailyData[];
  shops: { shop_id: string; shop_name: string }[];
  currentShopId: string | null;
  currentPeriod: string;
};

export const StatsPage: FC<StatsPageProps> = ({ stats, daily, shops, currentShopId, currentPeriod }) => {
  const periodOptions = [
    { value: '', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: '7d', label: '최근 7일' },
    { value: '30d', label: '최근 30일' },
    { value: 'month', label: '이번 달' },
  ];

  return (
    <Layout title="통합 통계" loggedIn currentPath="/dashboard/stats">
      <h1>통합 통계</h1>

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

      <script>{`
        function applyFilters() {
          const shop = document.getElementById('shopFilter').value;
          const period = document.getElementById('periodFilter').value;
          const params = new URLSearchParams();
          if (shop) params.set('shop_id', shop);
          if (period) params.set('period', period);
          const qs = params.toString();
          window.location.href = '/dashboard/stats' + (qs ? '?' + qs : '');
        }
      `}</script>
    </Layout>
  );
};

// ─── Billing Page ───────────────────────────────────────────

type BillingPageProps = {
  billingShops: BillingShop[];
  month: string;
  shops: { shop_id: string; shop_name: string; mall_id: string }[];
};

export const BillingPage: FC<BillingPageProps> = ({ billingShops, month, shops }) => {
  const hasOverLimit = billingShops.some(s => s.is_over_limit);
  const hasNearLimit = billingShops.some(s => s.needs_upgrade && !s.is_over_limit);

  return (
    <Layout title="플랜/과금" loggedIn currentPath="/dashboard/billing">
      <h1>플랜/과금</h1>

      {hasOverLimit && (
        <div class="alert alert-error">
          <div class="alert-banner">
            <span>무료 플랜 한도(100건/월)를 초과한 쇼핑몰이 있습니다. 소셜 로그인 버튼이 비활성화됩니다.</span>
            <a href="#plans" class="btn btn-primary btn-sm">유료 전환</a>
          </div>
        </div>
      )}
      {!hasOverLimit && hasNearLimit && (
        <div class="alert alert-warn">
          <div class="alert-banner">
            <span>무료 플랜 한도(100건/월)에 근접한 쇼핑몰이 있습니다.</span>
            <a href="#plans" class="btn btn-outline btn-sm">플랜 확인</a>
          </div>
        </div>
      )}

      <div class="card">
        <h2>{month} 사용 현황</h2>

        {billingShops.length === 0 ? (
          <div class="empty-state">
            <p>등록된 쇼핑몰이 없습니다.</p>
          </div>
        ) : (
          <>
            {billingShops.filter(s => s.plan === 'free').map((shop) => (
              <ProgressBar
                label={shop.shop_name || shop.shop_id}
                value={shop.monthly_signups}
                max={100}
                color={shop.is_over_limit ? '#ef4444' : shop.needs_upgrade ? '#f59e0b' : '#22c55e'}
              />
            ))}

            <table style="margin-top:16px">
              <thead><tr><th>쇼핑몰</th><th>플랜</th><th>이번 달 가입</th><th>한도</th><th>상태</th></tr></thead>
              <tbody>
                {billingShops.map((shop) => (
                  <tr>
                    <td><a href={`/dashboard/shops/${shop.shop_id}`}>{shop.shop_name || shop.shop_id}</a></td>
                    <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan}</span></td>
                    <td>{shop.monthly_signups}</td>
                    <td>{shop.plan === 'free' ? '100건/월' : '무제한'}</td>
                    <td>
                      {shop.is_over_limit && <span class="badge badge-red">한도 초과</span>}
                      {!shop.is_over_limit && shop.needs_upgrade && <span class="badge badge-yellow">한도 근접</span>}
                      {!shop.is_over_limit && !shop.needs_upgrade && <span class="badge badge-green">정상</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div id="plans">
        <h2 style="margin: 24px 0 16px">플랜 비교</h2>
        <div class="plan-grid">
          <div class="plan-card current">
            <h3>무료</h3>
            <div class="price">₩0<small>/월</small></div>
            <ul>
              <li>월 100건 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>기본 통계</li>
              <li>이메일 지원</li>
            </ul>
            <span class="badge badge-green">현재 플랜</span>
          </div>
          <div class="plan-card">
            <h3>월간</h3>
            <div class="price">₩29,900<small>/월</small></div>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>고급 통계</li>
              <li>우선 지원</li>
            </ul>
            <button class="btn btn-primary btn-sm subscribe-btn" data-plan="monthly">월간 플랜 전환</button>
          </div>
          <div class="plan-card">
            <h3>연간</h3>
            <div class="price">₩329,900<small>/년</small></div>
            <p style="font-size:12px;color:#22c55e;margin-bottom:8px">월 ₩27,492 (8% 할인)</p>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>고급 통계</li>
              <li>우선 지원</li>
            </ul>
            <button class="btn btn-primary btn-sm subscribe-btn" data-plan="yearly">연간 플랜 전환</button>
          </div>
        </div>
      </div>

      {shops.length > 0 && (
        <div class="card" style="margin-top:16px">
          <h2>결제할 쇼핑몰 선택</h2>
          <div class="form-group">
            <select id="billingShopSelect">
              {shops.map(s => (
                <option value={s.shop_id}>{s.shop_name || s.mall_id}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <script>{`
        document.querySelectorAll('.subscribe-btn').forEach(function(btn) {
          btn.addEventListener('click', async function() {
            var shopSelect = document.getElementById('billingShopSelect');
            if (!shopSelect) { alert('등록된 쇼핑몰이 없습니다.'); return; }
            var shopId = shopSelect.value;
            var plan = this.dataset.plan;
            var planName = plan === 'monthly' ? '월간 (₩29,900/월)' : '연간 (₩329,900/년)';
            if (!confirm(planName + ' 플랜으로 전환하시겠습니까?')) return;
            this.disabled = true;
            this.textContent = '처리 중...';
            try {
              var resp = await apiCall('POST', '/api/dashboard/billing/subscribe', { plan: plan, shop_id: shopId });
              if (resp.ok) {
                var data = await resp.json();
                window.open(data.confirmation_url, 'cafe24_payment', 'width=600,height=700');
              } else {
                var err = await resp.json();
                alert(err.message || '결제 주문 생성에 실패했습니다.');
              }
            } catch(e) {
              alert('네트워크 오류가 발생했습니다.');
            }
            this.disabled = false;
            this.textContent = plan === 'monthly' ? '월간 플랜 전환' : '연간 플랜 전환';
          });
        });

        window.addEventListener('message', function(e) {
          if (e.data === 'billing_complete') { location.reload(); }
        });
      `}</script>
    </Layout>
  );
};

// ─── Provider Management Page ───────────────────────────────

export const ProvidersPage: FC<{
  shop: ShopDetail;
  baseUrl: string;
}> = ({ shop, baseUrl }) => {
  const providers = parseProviders(shop.enabled_providers);
  const mvpProviders = ['google', 'kakao', 'naver', 'apple'];
  const phase2Providers = ['toss', 'discord', 'telegram', 'tiktok'];

  return (
    <Layout title="프로바이더 관리" loggedIn currentPath="/dashboard/shops">
      <h1>{shop.shop_name || shop.mall_id}</h1>

      <div class="tab-nav">
        <a href={`/dashboard/shops/${shop.shop_id}`}>설정</a>
        <a href={`/dashboard/shops/${shop.shop_id}/providers`} class="active">프로바이더</a>
        <a href={`/dashboard/shops/${shop.shop_id}/setup`}>SSO 가이드</a>
      </div>

      <div class="card">
        <h2>소셜 프로바이더 설정</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:16px">사용할 소셜 로그인 프로바이더를 선택하세요. 최소 1개 이상 활성화해야 합니다.</p>
        <form id="providerForm" data-shop-id={shop.shop_id}>
          {mvpProviders.map((p) => (
            <div class="provider-toggle">
              <label class="toggle">
                <input type="checkbox" name="providers" value={p} checked={providers.includes(p)} />
                <span class="toggle-slider"></span>
              </label>
              <span style={`font-weight:600;display:inline-flex;align-items:center;gap:8px`}>
                <span style={`display:inline-block;width:12px;height:12px;border-radius:50%;background:${providerColors[p]}`}></span>
                {providerDisplayNames[p]}
              </span>
            </div>
          ))}

          <h3 style="margin-top:24px;margin-bottom:12px;font-size:14px;color:#64748b">Phase 2 (준비 중)</h3>
          {phase2Providers.map((p) => (
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

          <div style="margin-top:16px">
            <button type="submit" class="btn btn-primary btn-sm">프로바이더 저장</button>
          </div>
        </form>
        <script>{`
          document.getElementById('providerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const checked = [...e.target.querySelectorAll('input[name=providers]:checked')].map(i => i.value);
            if (checked.length === 0) { alert('최소 1개의 프로바이더를 선택해야 합니다.'); return; }
            const shopId = e.target.dataset.shopId;
            const resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/providers', { providers: checked });
            if (resp.ok) { alert('프로바이더 설정이 저장되었습니다.'); location.reload(); }
            else { const data = await resp.json(); alert(data.error || '저장 중 오류가 발생했습니다.'); }
          });
        `}</script>
      </div>

      <div class="card">
        <h2>미리보기</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:16px">활성화된 프로바이더의 로그인 버튼 미리보기입니다.</p>
        <div class="preview-area" id="previewArea">
          {providers.length === 0 ? (
            <p style="color:#94a3b8">프로바이더를 선택하면 미리보기가 표시됩니다.</p>
          ) : (
            providers.map(p => (
              <span class={`preview-btn ${p === 'kakao' ? 'kakao-btn' : ''}`} style={`background:${providerColors[p]}`}>
                {providerDisplayNames[p]}로 시작
              </span>
            ))
          )}
        </div>
        <script>{`
          // Live preview update
          document.querySelectorAll('#providerForm input[name=providers]').forEach(cb => {
            cb.addEventListener('change', () => {
              const checked = [...document.querySelectorAll('#providerForm input[name=providers]:checked')].map(i => i.value);
              const colors = ${JSON.stringify(providerColors)};
              const names = ${JSON.stringify(providerDisplayNames)};
              const area = document.getElementById('previewArea');
              if (checked.length === 0) {
                area.textContent = '';
                var msg = document.createElement('p');
                msg.style.color = '#94a3b8';
                msg.textContent = '프로바이더를 선택하면 미리보기가 표시됩니다.';
                area.appendChild(msg);
              } else {
                area.textContent = '';
                checked.forEach(function(p) {
                  var span = document.createElement('span');
                  span.className = 'preview-btn' + (p === 'kakao' ? ' kakao-btn' : '');
                  span.style.background = colors[p] || '#999';
                  span.textContent = (names[p] || p) + '로 시작';
                  area.appendChild(span);
                });
              }
            });
          });
        `}</script>
      </div>
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
          <p><strong>수파레인 (suparain)</strong></p>
          <p><a href="https://bg.suparain.kr">https://bg.suparain.kr</a></p>
        </div>
      </div>
    </body>
  </html>
);

// ─── Settings ────────────────────────────────────────────────

export const SettingsPage: FC<{ email: string; name: string }> = ({ email, name }) => (
  <Layout title="계정 설정" loggedIn currentPath="/dashboard/settings">
    <h1>계정 설정</h1>

    <div class="card">
      <h2>프로필</h2>
      <table>
        <tbody>
          <tr><th style="width:120px">이름</th><td>{name || '-'}</td></tr>
          <tr><th>이메일</th><td>{email}</td></tr>
        </tbody>
      </table>
    </div>

    <div class="card">
      <h2>비밀번호 변경</h2>
      <form id="passwordForm">
        <div class="form-group">
          <label>현재 비밀번호</label>
          <input type="password" name="current" required />
        </div>
        <div class="form-group">
          <label>새 비밀번호</label>
          <input type="password" name="newpass" required minlength={8} placeholder="8자 이상" />
        </div>
        <button type="submit" class="btn btn-primary btn-sm">비밀번호 변경</button>
      </form>
      <script>{`
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          const resp = await apiCall('PUT', '/api/dashboard/settings/password', {
            current_password: form.current.value,
            new_password: form.newpass.value,
          });
          if (resp.ok) { alert('비밀번호가 변경되었습니다.'); form.reset(); }
          else { const data = await resp.json(); alert(data.error === 'wrong_password' ? '현재 비밀번호가 올바르지 않습니다.' : '변경 중 오류가 발생했습니다.'); }
        });
      `}</script>
    </div>
  </Layout>
);
