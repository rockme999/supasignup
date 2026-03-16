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
        <button class="copy-btn" data-copy={clientId} onclick="navigator.clipboard.writeText(this.dataset.copy);this.textContent='복사됨!';setTimeout(()=>this.textContent='복사',1500)">복사</button>
        Client ID: {clientId}
      </div>
      <div class="code-block" style="margin-top:8px">
        <button class="copy-btn" data-copy={shop.client_secret} onclick="navigator.clipboard.writeText(this.dataset.copy);this.textContent='복사됨!';setTimeout(()=>this.textContent='복사',1500)">복사</button>
        Client Secret: {shop.client_secret}
      </div>
    </div>

    <div class="card">
      <h2>2. SSO 항목 등록 (프로바이더별)</h2>
      <p style="font-size:13px; color:#64748b; margin-bottom:16px">활성화된 프로바이더마다 아래 URL을 등록합니다.</p>

      {ssoEntries.map((entry) => (
        <div style="margin-bottom:16px; padding-bottom:16px; border-bottom:1px solid #f1f5f9">
          <strong style="text-transform:capitalize">{entry.provider}</strong>
          <div class="code-block" style="margin-top:8px">
            <button class="copy-btn" data-copy={entry.authorize_url} onclick="navigator.clipboard.writeText(this.dataset.copy);this.textContent='복사됨!';setTimeout(()=>this.textContent='복사',1500)">복사</button>
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
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/token`} onclick="navigator.clipboard.writeText(this.dataset.copy);this.textContent='복사됨!';setTimeout(()=>this.textContent='복사',1500)">복사</button>
          {baseUrl}/oauth/token
        </div>
      </div>
      <div>
        <strong>UserInfo URL</strong>
        <div class="code-block">
          <button class="copy-btn" data-copy={`${baseUrl}/oauth/userinfo`} onclick="navigator.clipboard.writeText(this.dataset.copy);this.textContent='복사됨!';setTimeout(()=>this.textContent='복사',1500)">복사</button>
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
