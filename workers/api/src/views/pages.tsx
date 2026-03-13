/**
 * Dashboard SSR page components.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';

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
        <h2>소셜별 가입 현황</h2>
        <table>
          <thead><tr><th>프로바이더</th><th>가입 수</th><th>비율</th></tr></thead>
          <tbody>
            {Object.entries(stats.by_provider).map(([provider, count]) => (
              <tr>
                <td>{provider}</td>
                <td>{count}</td>
                <td>{stats.total_signups > 0 ? Math.round((count / stats.total_signups) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}

    {billingShops.some((s) => s.needs_upgrade) && (
      <div class="alert alert-warn">
        무료 플랜 한도(100건/월)에 근접한 쇼핑몰이 있습니다. 쇼핑몰 관리에서 확인하세요.
      </div>
    )}

    <div class="card">
      <h2>쇼핑몰 과금 현황</h2>
      {billingShops.length === 0 ? (
        <div class="empty-state">
          <p>등록된 쇼핑몰이 없습니다.</p>
          <a href="/dashboard/shops/new" class="btn btn-primary btn-sm">쇼핑몰 등록</a>
        </div>
      ) : (
        <table>
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
              const providers = (() => { try { return JSON.parse(shop.enabled_providers || '[]'); } catch { return []; } })();
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
};

export const ShopDetailPage: FC<{
  shop: ShopDetail;
  monthlySignups: number;
  baseUrl: string;
}> = ({ shop, monthlySignups, baseUrl }) => {
  const providers = (() => { try { return JSON.parse(shop.enabled_providers || '[]') as string[]; } catch { return [] as string[]; } })();
  const allProviders = ['kakao', 'naver', 'google', 'apple'];

  return (
    <Layout title={shop.shop_name || shop.mall_id} loggedIn currentPath="/dashboard/shops">
      <h1>{shop.shop_name || shop.mall_id} 설정</h1>

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
        <h2>소셜 프로바이더 설정</h2>
        <form id="providerForm">
          {allProviders.map((p) => (
            <div class="provider-toggle">
              <label class="toggle">
                <input type="checkbox" name="providers" value={p} checked={providers.includes(p)} />
                <span class="toggle-slider"></span>
              </label>
              <span style="font-weight:600; text-transform:capitalize">{p}</span>
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
            const resp = await apiCall('PUT', '/api/dashboard/shops/${shop.shop_id}/providers', { providers: checked });
            if (resp.ok) { alert('프로바이더 설정이 저장되었습니다.'); location.reload(); }
            else { const data = await resp.json(); alert(data.error || '저장 중 오류가 발생했습니다.'); }
          });
        `}</script>
      </div>

      <div class="card">
        <h2>SSO 설정 가이드</h2>
        <a href={`/dashboard/shops/${shop.shop_id}/setup`} class="btn btn-outline btn-sm">SSO 설정 보기</a>
      </div>

      <div class="card" style="border: 1px solid #fee2e2">
        <h2 style="color:#991b1b">위험 영역</h2>
        <p style="font-size:13px; color:#64748b; margin-bottom:12px">쇼핑몰을 삭제하면 소셜 로그인이 비활성화됩니다.</p>
        <button id="deleteShopBtn" class="btn btn-danger btn-sm">쇼핑몰 삭제</button>
        <script>{`
          document.getElementById('deleteShopBtn').addEventListener('click', async () => {
            if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;
            const resp = await apiCall('DELETE', '/api/dashboard/shops/${shop.shop_id}');
            if (resp.ok) { window.location.href = '/dashboard/shops'; }
            else { alert('삭제 중 오류가 발생했습니다.'); }
          });
        `}</script>
      </div>
    </Layout>
  );
};

// ─── Shop Setup (SSO Guide) ─────────────────────────────────

type SsoEntry = {
  provider: string;
  authorize_url: string;
};

export const ShopSetupPage: FC<{
  shop: ShopDetail;
  clientId: string;
  ssoEntries: SsoEntry[];
  baseUrl: string;
}> = ({ shop, clientId, ssoEntries, baseUrl }) => (
  <Layout title="SSO 설정" loggedIn currentPath="/dashboard/shops">
    <h1>{shop.shop_name || shop.mall_id} - SSO 설정 가이드</h1>

    <div class="alert alert-info">
      카페24 쇼핑몰 관리자 &gt; 앱 &gt; SSO(Single Sign-On) 설정에서 아래 정보를 등록하세요.
    </div>

    <div class="card">
      <h2>1. Client 정보</h2>
      <div class="code-block">
        <button class="copy-btn" data-copy={clientId}>복사</button>
        Client ID: {clientId}
      </div>
    </div>

    <div class="card">
      <h2>2. SSO 항목 등록 (프로바이더별)</h2>
      <p style="font-size:13px; color:#64748b; margin-bottom:16px">활성화된 프로바이더마다 아래 URL을 등록합니다.</p>

      {ssoEntries.map((entry) => (
        <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #f1f5f9">
          <strong style="text-transform:capitalize">{entry.provider}</strong>
          <div class="code-block" style="margin-top:8px">
            <button class="copy-btn" data-copy={entry.authorize_url}>복사</button>
            Authorize URL: {entry.authorize_url}
          </div>
        </div>
      ))}
    </div>

    <div class="card">
      <h2>3. 공통 URL</h2>
      <div style="margin-bottom:12px">
        <strong>Token URL</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/token`}>복사</button>
          {baseUrl}/oauth/token
        </div>
      </div>
      <div>
        <strong>UserInfo URL</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/userinfo`}>복사</button>
          {baseUrl}/oauth/userinfo
        </div>
      </div>
    </div>

    <div class="card">
      <h2>4. Account Linking 활성화</h2>
      <ol style="padding-left:20px; font-size:14px; line-height:1.8">
        <li>카페24 관리자 &gt; 앱 &gt; SSO 설정으로 이동</li>
        <li>Account Linking 옵션을 <strong>활성화</strong></li>
        <li>이메일 기반 매칭 활성화 (동일 이메일 → 기존 회원 연결)</li>
      </ol>
    </div>

    <div style="margin-top:16px">
      <a href={`/dashboard/shops/${shop.shop_id}`} class="btn btn-outline btn-sm">돌아가기</a>
    </div>
  </Layout>
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
