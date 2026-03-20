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

type BillingShop = {
  shop_id: string;
  shop_name: string;
  plan: string;
  monthly_signups: number;
  usage_percent: number | null;
  needs_upgrade: boolean;
  is_over_limit: boolean;
};

export const HomePage: FC<{ stats: HomeStats; billingShops: BillingShop[]; isCafe24?: boolean }> = ({ stats, billingShops, isCafe24 }) => (
  <Layout title="대시보드" loggedIn currentPath="/dashboard" isCafe24={isCafe24}>
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
          <div style="overflow-x:auto">
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
          </div>
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

export const ShopsPage: FC<{ shops: ShopListItem[]; currentSearch?: string; isCafe24?: boolean }> = ({ shops, currentSearch, isCafe24 }) => (
  <Layout title="쇼핑몰 관리" loggedIn currentPath="/dashboard/shops" isCafe24={isCafe24}>
    <h1>쇼핑몰 관리</h1>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
      <a href="/dashboard/shops/new" class="btn btn-primary btn-sm">+ 쇼핑몰 등록</a>
      <div class="filter-bar" style="flex:1;min-width:200px">
        <input
          type="text"
          id="shopSearch"
          placeholder="쇼핑몰명 또는 Mall ID 검색"
          value={currentSearch || ''}
          onkeyup="if(event.key==='Enter')applySearch()"
          style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;flex:1;max-width:300px"
        />
        <button onclick="applySearch()" class="btn btn-outline btn-sm">검색</button>
        {currentSearch && <a href="/dashboard/shops" class="btn btn-outline btn-sm">초기화</a>}
      </div>
    </div>

    {shops.length === 0 ? (
      <div class="card">
        <div class="empty-state">
          <p>{currentSearch ? '검색 결과가 없습니다.' : '등록된 쇼핑몰이 없습니다.'}</p>
          {!currentSearch && <p style="font-size:13px">카페24 앱 설치를 통해 자동으로 등록되거나, 직접 등록할 수 있습니다.</p>}
        </div>
      </div>
    ) : (
      <div class="card">
        <div style="overflow-x:auto">
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
      </div>
    )}

    <script dangerouslySetInnerHTML={{__html: `
      function applySearch() {
        var q = document.getElementById('shopSearch').value.trim();
        window.location.href = '/dashboard/shops' + (q ? '?search=' + encodeURIComponent(q) : '');
      }
    `}} />
  </Layout>
);

// ─── Shop New ────────────────────────────────────────────────

export const ShopNewPage: FC<{ isCafe24?: boolean }> = ({ isCafe24 }) => (
  <Layout title="쇼핑몰 등록" loggedIn currentPath="/dashboard/shops" isCafe24={isCafe24}>
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
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('newShopForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          var btn = form.querySelector('button[type=submit]');
          const resp = await apiCall('POST', '/api/dashboard/shops', {
            mall_id: form.mall_id.value,
            shop_name: form.shop_name.value || undefined,
            platform: form.platform.value,
          }, btn);
          if (resp.ok) {
            const data = await resp.json();
            window.location.href = '/dashboard/shops/' + data.shop.shop_id;
          } else {
            const data = await resp.json();
            showToast('error', data.error === 'duplicate_mall_id' ? '이미 등록된 Mall ID입니다.' : '등록 중 오류가 발생했습니다.');
          }
        });
      `}} />
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
  isCafe24?: boolean;
}> = ({ shop, monthlySignups, baseUrl, isCafe24 }) => {
  const providers = parseProviders(shop.enabled_providers);

  return (
    <Layout title={shop.shop_name || shop.mall_id} loggedIn currentPath="/dashboard/shops" isCafe24={isCafe24}>
      <h1>{shop.shop_name || shop.mall_id}</h1>

      <div class="tab-nav">
        <a href={`/dashboard/shops/${shop.shop_id}`} class="active">설정</a>
        <a href={`/dashboard/shops/${shop.shop_id}/providers`}>프로바이더</a>
        <a href={`/dashboard/shops/${shop.shop_id}/setup`}>SSO 가이드</a>
      </div>

      <div class="card">
        <h2>기본 정보</h2>
        <div style="overflow-x:auto">
          <table>
            <tbody>
              <tr><th style="width:140px">Shop ID</th><td>{shop.shop_id}</td></tr>
              <tr><th>Mall ID</th><td>{shop.mall_id}</td></tr>
              <tr><th>플랫폼</th><td>{shop.platform || 'cafe24'}</td></tr>
              <tr><th>플랜</th><td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan}</span></td></tr>
              <tr><th>이번 달 가입</th><td>{monthlySignups}{shop.plan === 'free' && ' / 100'}</td></tr>
              <tr><th>Client ID</th><td>
                <code>{shop.client_id}</code>
                <button class="copy-btn" onclick={`copyText('${shop.client_id}',this)`} style="position:static; margin-left:8px">복사</button>
              </td></tr>
              <tr><th>Client Secret</th><td>
                <code>{shop.client_secret}</code>
                <span style="color:#94a3b8; font-size:12px; margin-left:8px">(마스킹됨)</span>
              </td></tr>
            </tbody>
          </table>
        </div>
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
        <script dangerouslySetInnerHTML={{__html: `
          document.getElementById('deleteShopBtn').addEventListener('click', async function() {
            if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
            var btn = this;
            const resp = await apiCall('DELETE', '/api/dashboard/shops/' + this.dataset.shopId, undefined, btn);
            if (resp.ok) { window.location.href = '/dashboard/shops'; }
            else { showToast('error', '삭제 중 오류가 발생했습니다.'); }
          });
        `}} />
      </div>
    </Layout>
  );
};

// ─── Shop Setup (SSO Guide) ─────────────────────────────────

export const ShopSetupPage: FC<{
  shop: ShopDetail;
  clientId: string;
  baseUrl: string;
  isCafe24?: boolean;
}> = ({ shop, clientId, baseUrl, isCafe24 }) => (
  <Layout title="SSO 설정" loggedIn currentPath="/dashboard/shops" isCafe24={isCafe24}>
    <h1>{shop.shop_name || shop.mall_id}</h1>

    <div class="tab-nav">
      <a href={`/dashboard/shops/${shop.shop_id}`}>설정</a>
      <a href={`/dashboard/shops/${shop.shop_id}/providers`}>프로바이더</a>
      <a href={`/dashboard/shops/${shop.shop_id}/setup`} class="active">SSO 가이드</a>
    </div>

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
  isCafe24?: boolean;
};

export const StatsPage: FC<StatsPageProps> = ({ stats, daily, shops, currentShopId, currentPeriod, isCafe24 }) => {
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

type BillingPageProps = {
  billingShops: BillingShop[];
  month: string;
  shops: { shop_id: string; shop_name: string; mall_id: string }[];
  currentPlan: string;
  isCafe24?: boolean;
};

export const BillingPage: FC<BillingPageProps> = ({ billingShops, month, shops, currentPlan, isCafe24 }) => {
  const hasOverLimit = billingShops.some(s => s.is_over_limit);
  const hasNearLimit = billingShops.some(s => s.needs_upgrade && !s.is_over_limit);

  return (
    <Layout title="플랜/과금" loggedIn currentPath="/dashboard/billing" isCafe24={isCafe24}>
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

            <div style="overflow-x:auto">
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
            </div>
          </>
        )}
      </div>

      <div id="plans">
        <h2 style="margin: 24px 0 16px">플랜 비교</h2>
        <div class="plan-grid">
          <div class={`plan-card${currentPlan === 'free' ? ' current' : ''}`}>
            <h3>무료</h3>
            <div class="price">₩0<small>/월</small></div>
            <ul>
              <li>월 100건 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>기본 통계</li>
              <li>이메일 지원</li>
            </ul>
            {currentPlan === 'free' && <span class="badge badge-green">현재 플랜</span>}
          </div>
          <div class={`plan-card${currentPlan === 'monthly' ? ' current' : ''}`}>
            <h3>월간</h3>
            <div class="price">₩29,900<small>/월</small></div>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>고급 통계</li>
              <li>우선 지원</li>
            </ul>
            {currentPlan === 'monthly'
              ? <span class="badge badge-green">현재 플랜</span>
              : <button class="btn btn-primary btn-sm subscribe-btn" data-plan="monthly">월간 플랜 전환</button>
            }
          </div>
          <div class={`plan-card${currentPlan === 'yearly' ? ' current' : ''}`}>
            <h3>연간</h3>
            <div class="price">₩329,900<small>/년</small></div>
            <p style="font-size:12px;color:#22c55e;margin-bottom:8px">월 ₩27,492 (8% 할인)</p>
            <ul>
              <li>무제한 신규 가입</li>
              <li>소셜 로그인 4종</li>
              <li>고급 통계</li>
              <li>우선 지원</li>
            </ul>
            {currentPlan === 'yearly'
              ? <span class="badge badge-green">현재 플랜</span>
              : <button class="btn btn-primary btn-sm subscribe-btn" data-plan="yearly">연간 플랜 전환</button>
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

                // 팝업 닫힘 감지
                var checkPopup = setInterval(function() {
                  if (!popup || popup.closed) {
                    clearInterval(checkPopup);
                    // 구독 상태 확인
                    fetch('/api/dashboard/billing/status/' + subId, { credentials: 'same-origin' })
                      .then(function(r) { return r.json(); })
                      .then(function(s) {
                        if (s.status === 'active') {
                          // 결제 완료 → 페이지 새로고침
                          location.reload();
                        } else {
                          // 결제 미완료 → 버튼 복원
                          btnEl.disabled = false;
                          btnEl.textContent = plan === 'monthly' ? '월간 플랜 전환' : '연간 플랜 전환';
                        }
                      })
                      .catch(function() {
                        btnEl.disabled = false;
                        btnEl.textContent = plan === 'monthly' ? '월간 플랜 전환' : '연간 플랜 전환';
                      });
                  }
                }, 1000);
              } else {
                var err = await resp.json();
                showToast('error', err.message || '결제 주문 생성에 실패했습니다.');
                if (popup && !popup.closed) popup.close();
                btnEl.disabled = false;
                btnEl.textContent = plan === 'monthly' ? '월간 플랜 전환' : '연간 플랜 전환';
              }
            } catch(e) {
              showToast('error', '오류: ' + e.message);
              if (popup && !popup.closed) popup.close();
              btnEl.disabled = false;
              btnEl.textContent = plan === 'monthly' ? '월간 플랜 전환' : '연간 플랜 전환';
            }
          });
        });
      `}} />

    </Layout>
  );
};

// ─── Provider Management Page ───────────────────────────────

export const ProvidersPage: FC<{
  shop: ShopDetail;
  baseUrl: string;
  isCafe24?: boolean;
}> = ({ shop, baseUrl, isCafe24 }) => {
  const providers = parseProviders(shop.enabled_providers);
  const allProviders = ['google', 'kakao', 'naver', 'apple', 'discord', 'facebook', 'x', 'line', 'telegram'];
  const futureProviders = ['toss', 'tiktok'];

  return (
    <Layout title="프로바이더 관리" loggedIn currentPath="/dashboard/shops" isCafe24={isCafe24}>
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
          {allProviders.map((p) => (
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
          document.querySelectorAll('#providerForm input[name=providers]').forEach(function(cb) {
            cb.addEventListener('change', async function() {
              var form = document.getElementById('providerForm');
              var checked = [...form.querySelectorAll('input[name=providers]:checked')].map(function(i) { return i.value; });
              if (checked.length === 0) {
                cb.checked = true;
                showToast('warn', '최소 1개의 프로바이더를 활성화해야 합니다.');
                return;
              }
              var shopId = form.dataset.shopId;
              var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/providers', { providers: checked });
              if (resp.ok) { showToast('success', '저장되었습니다.'); }
              else { var data = await resp.json(); showToast('error', data.error || '저장 실패'); cb.checked = !cb.checked; }
            });
          });
        `}} />
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
        <script dangerouslySetInnerHTML={{__html: `
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
        `}} />
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

// ─── Settings ────────────────────────────────────────────────

export const SettingsPage: FC<{ email: string; name: string }> = ({ email, name }) => (
  <Layout title="계정 설정" loggedIn currentPath="/dashboard/settings">
    <h1>계정 설정</h1>

    <div class="card">
      <h2>프로필</h2>
      <div style="overflow-x:auto">
        <table>
          <tbody>
            <tr><th style="width:120px">이름</th><td>{name || '-'}</td></tr>
            <tr><th>이메일</th><td>{email}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="card">
      <h2>이름 변경</h2>
      <form id="nameForm">
        <div class="form-group">
          <label>이름</label>
          <input type="text" name="newName" required placeholder="새 이름" value={name || ''} />
        </div>
        <button type="submit" class="btn btn-primary btn-sm">이름 변경</button>
      </form>
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('nameForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          var form = e.target;
          var btn = form.querySelector('button[type=submit]');
          var resp = await apiCall('PUT', '/api/dashboard/settings/profile', { name: form.newName.value }, btn);
          if (resp.ok) { showToast('success', '이름이 변경되었습니다.'); setTimeout(function(){ location.reload(); }, 1000); }
          else { showToast('error', '이름 변경 중 오류가 발생했습니다.'); }
        });
      `}} />
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
        <div class="form-group">
          <label>새 비밀번호 확인</label>
          <input type="password" name="newpass_confirm" required minlength={8} placeholder="새 비밀번호 재입력" />
        </div>
        <button type="submit" class="btn btn-primary btn-sm">비밀번호 변경</button>
      </form>
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const form = e.target;
          if (form.newpass.value !== form.newpass_confirm.value) {
            showToast('error', '새 비밀번호가 일치하지 않습니다.');
            return;
          }
          var btn = form.querySelector('button[type=submit]');
          const resp = await apiCall('PUT', '/api/dashboard/settings/password', {
            current_password: form.current.value,
            new_password: form.newpass.value,
          }, btn);
          if (resp.ok) { showToast('success', '비밀번호가 변경되었습니다.'); form.reset(); }
          else { const data = await resp.json(); showToast('error', data.error === 'wrong_password' ? '현재 비밀번호가 올바르지 않습니다.' : '변경 중 오류가 발생했습니다.'); }
        });
      `}} />
    </div>

    <div class="card" style="border: 1px solid #fee2e2">
      <h2 style="color:#991b1b">계정 탈퇴</h2>
      <p style="font-size:13px; color:#64748b; margin-bottom:12px">
        계정을 탈퇴하면 모든 쇼핑몰의 소셜 로그인이 비활성화됩니다. 이 작업은 되돌릴 수 없습니다.
      </p>
      <form id="deleteAccountForm">
        <div class="form-group">
          <label>비밀번호 확인</label>
          <input type="password" name="confirmPassword" required placeholder="현재 비밀번호 입력" />
        </div>
        <button type="submit" class="btn btn-danger btn-sm">계정 탈퇴</button>
      </form>
      <script dangerouslySetInnerHTML={{__html: `
        document.getElementById('deleteAccountForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!confirm('정말로 계정을 탈퇴하시겠습니까?\\n모든 쇼핑몰 데이터가 비활성화되며 이 작업은 되돌릴 수 없습니다.')) return;
          var form = e.target;
          var btn = form.querySelector('button[type=submit]');
          var resp = await apiCall('DELETE', '/api/dashboard/settings/account', { password: form.confirmPassword.value }, btn);
          if (resp.ok) {
            showToast('success', '계정이 탈퇴되었습니다.');
            setTimeout(function(){ window.location.href = '/dashboard/login'; }, 1000);
          } else {
            var data = await resp.json();
            showToast('error', data.error === 'wrong_password' ? '비밀번호가 올바르지 않습니다.' : '탈퇴 중 오류가 발생했습니다.');
          }
        });
      `}} />
    </div>
  </Layout>
);
