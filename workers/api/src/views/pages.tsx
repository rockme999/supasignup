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
  funnelSummary?: Record<string, number>;
  isCafe24?: boolean;
}> = ({ shop, stats, funnelSummary, isCafe24 }) => {
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
      <p style="font-size:14px;color:#64748b;margin-bottom:16px">쇼핑몰 현황을 한눈에 확인하세요.</p>

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

      {/* 핵심 지표 요약 */}
      {(() => {
        const bannerShow = funnelSummary?.['banner_show'] ?? 0;
        const signupComplete = funnelSummary?.['signup_complete'] ?? 0;
        const overallCvr = bannerShow > 0 ? Math.round((signupComplete / bannerShow) * 100) : 0;
        return (
          <div class="stat-grid">
            <div class="stat-card">
              <div class="label">오늘 가입</div>
              <div class="value">{stats?.today_signups ?? 0}</div>
            </div>
            <div class="stat-card">
              <div class="label">이번 달 가입</div>
              <div class="value">{stats?.month_signups ?? 0}</div>
            </div>
            <div class="stat-card">
              <div class="label">누적 가입</div>
              <div class="value">{(stats?.total_signups ?? 0).toLocaleString()}</div>
            </div>
            <div class="stat-card">
              <div class="label">전환율 <span style="font-size:10px;color:#94a3b8">(7일)</span></div>
              <div class="value" style={overallCvr > 0 ? 'color:var(--color-primary)' : ''}>{overallCvr}%</div>
            </div>
          </div>
        );
      })()}

      {/* 소셜별 가입 현황 요약 */}
      {stats && Object.keys(stats.by_provider).length > 0 && (
        <div class="card">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              <h2 style="margin-bottom:2px">프로바이더별 가입 현황</h2>
              <p style="font-size:12px;color:#94a3b8;margin:0">누적 기준 요약 — 상세 분석은 통계 페이지에서 확인하세요</p>
            </div>
            <a href="/dashboard/stats" style="font-size:13px;white-space:nowrap">상세 통계 →</a>
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

      {/* 트리거 클릭 분포 요약 (7일) */}
      {funnelSummary && (() => {
        const triggers = [
          { label: '배너', value: funnelSummary['banner_click'] ?? 0, color: '#3b82f6' },
          { label: '팝업', value: funnelSummary['popup_signup'] ?? 0, color: '#8b5cf6' },
          { label: '에스컬레이션', value: funnelSummary['escalation_click'] ?? 0, color: '#f59e0b' },
          { label: '카카오 채널', value: funnelSummary['kakao_channel_click'] ?? 0, color: '#fee500' },
        ].filter(t => t.value > 0);
        const total = triggers.reduce((s, t) => s + t.value, 0);
        if (total === 0) return null;
        return (
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <h2 style="margin-bottom:0">트리거 클릭 분포 <span style="font-size:12px;color:#94a3b8;font-weight:400">(7일)</span></h2>
              <a href="/dashboard/stats" style="font-size:13px;white-space:nowrap">상세 분석 →</a>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              {triggers.map(t => {
                const pct = Math.round((t.value / total) * 100);
                return (
                  <div style={`flex:1;min-width:100px;padding:12px;border-radius:8px;background:${t.color}10;border:1px solid ${t.color}30;text-align:center`}>
                    <div style="font-size:12px;color:#64748b;margin-bottom:4px">{t.label}</div>
                    <div style="font-size:20px;font-weight:700;color:#1e293b">{pct}%</div>
                    <div style="font-size:11px;color:#94a3b8">{t.value}건</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 빠른 설정 링크 */}
      <div class="card">
        <h2 style="margin-bottom:16px">빠른 설정</h2>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px">
          <a href="/dashboard/settings/sso-guide" style={`display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid ${!shop.sso_configured ? '#ef4444' : '#e5e7eb'};border-radius:12px;text-decoration:none;color:#374151;background:${!shop.sso_configured ? '#fef2f2' : 'transparent'};transition:border-color 0.15s`} class="quick-link">
            <span style="font-size:28px">🔑</span>
            <span style="font-size:13px;font-weight:600">SSO 설정 가이드{!shop.sso_configured ? ' !' : ' ✓'}</span>
            {!shop.sso_configured && <span style="font-size:11px;color:#ef4444">설정 필요</span>}
          </a>
          <a href="/dashboard/settings/providers" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">🎨</span>
            <span style="font-size:13px;font-weight:600">로그인 디자인</span>
          </a>
          <a href="/dashboard/settings/coupon" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">🎟️</span>
            <span style="font-size:13px;font-weight:600">쿠폰 현황{shop.coupon_enabled ? ' ✓' : ''}</span>
          </a>
          <a href="/dashboard/stats" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
            <span style="font-size:28px">📊</span>
            <span style="font-size:13px;font-weight:600">통계 분석</span>
          </a>
          {isPlus ? (
            <a href="/dashboard/ai-reports" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
              <span style="font-size:28px">🤖</span>
              <span style="font-size:13px;font-weight:600">AI 보고서</span>
            </a>
          ) : (
            <a href="/dashboard/billing" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #d1fae5;border-radius:12px;text-decoration:none;color:#374151;background:#f0fdf4;transition:border-color 0.15s" class="quick-link">
              <span style="font-size:28px">⚡</span>
              <span style="font-size:13px;font-weight:600">Plus 업그레이드</span>
              <span style="font-size:11px;color:#16a34a">미니배너·AI 보고서</span>
            </a>
          )}
        </div>
      </div>

      {/* 퀵스타트 팝업 모달 */}
      <div id="quickstartModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;align-items:center;justify-content:center">
        <div style="background:#fff;border-radius:16px;max-width:520px;width:90%;max-height:90vh;overflow-y:auto;padding:32px;box-shadow:0 20px 60px rgba(0,0,0,0.2)">
          <div style="text-align:center;margin-bottom:20px">
            <div style="font-size:36px;margin-bottom:8px">⚡</div>
            <h2 style="font-size:20px;margin-bottom:4px">번개가입 시작하기</h2>
            <p style="font-size:13px;color:#64748b">3단계만 완료하면 소셜 로그인이 활성화됩니다</p>
          </div>

          <div style="display:grid;gap:16px;margin-bottom:24px">
            <div style="display:flex;gap:12px;padding:16px;background:#fef2f2;border-radius:10px">
              <span style="width:28px;height:28px;border-radius:50%;background:#ef4444;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">1</span>
              <div>
                <div style="font-size:14px;font-weight:600;margin-bottom:2px">SSO 연동 설정</div>
                <div style="font-size:12px;color:#64748b">SSO 설정 가이드의 값을 카페24 관리자에 입력하세요. 이 설정이 완료되어야 소셜 로그인이 활성화됩니다.</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;padding:16px;background:#fffbeb;border-radius:10px">
              <span style="width:28px;height:28px;border-radius:50%;background:#f59e0b;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">2</span>
              <div>
                <div style="font-size:14px;font-weight:600;margin-bottom:2px">"SNS 계정 연동" 활성화</div>
                <div style="font-size:12px;color:#64748b">카페24 관리자 &gt; 회원 설정에서 활성화하세요. 기존 회원과 소셜 계정이 자동으로 연동됩니다.</div>
              </div>
            </div>
            <div style="display:flex;gap:12px;padding:16px;background:#eff6ff;border-radius:10px">
              <span style="width:28px;height:28px;border-radius:50%;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0">3</span>
              <div>
                <div style="font-size:14px;font-weight:600;margin-bottom:2px">프로바이더 선택 &amp; 확인</div>
                <div style="font-size:12px;color:#64748b">프로바이더를 선택한 후, SSO 설정 가이드에서 '설정 확인' 버튼을 눌러 연동이 정상인지 꼭 확인하세요.</div>
              </div>
            </div>
          </div>

          <div style="display:flex;gap:8px;justify-content:space-between">
            <button id="quickstartDismiss" style="padding:8px 16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#64748b;cursor:pointer">다시 보지 않기</button>
            <a href="/dashboard/quickstart" style="padding:8px 20px;background:#2563eb;color:#fff;border-radius:8px;font-size:13px;font-weight:600;text-decoration:none">자세한 가이드 보기 →</a>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          if (localStorage.getItem('bg_quickstart_dismissed')) return;
          var modal = document.getElementById('quickstartModal');
          if (modal) modal.style.display = 'flex';

          document.getElementById('quickstartDismiss').addEventListener('click', function() {
            localStorage.setItem('bg_quickstart_dismissed', '1');
            modal.style.display = 'none';
          });

          modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.style.display = 'none';
          });
        })();
      `}} />
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

    <div class="card" style="margin-top:16px; border:2px solid #2563eb">
      <h2 style="color:#2563eb">SSO 설정 확인</h2>
      <p style="font-size:14px; color:#475569; margin-bottom:16px">
        카페24에서 SSO 등록을 완료한 후 아래 버튼을 클릭하면, 번개가입이 자동으로 SSO 슬롯(sso~sso5)을 감지하고 설정을 확정합니다.
      </p>
      <button
        id="btn-verify-sso"
        onclick={`verifySso('${shop.shop_id}')`}
        class="btn btn-primary"
        style="font-size:15px; padding:10px 28px"
      >
        설정 확인
      </button>
      <div id="sso-verify-result" style="margin-top:16px; display:none"></div>
    </div>

    <div style="margin-top:16px">
      <a href="/dashboard" class="btn btn-outline btn-sm">대시보드로 돌아가기</a>
    </div>

    <script dangerouslySetInnerHTML={{__html: `
function verifySso(shopId) {
  var btn = document.getElementById('btn-verify-sso');
  var result = document.getElementById('sso-verify-result');
  btn.disabled = true;
  btn.textContent = '확인 중...';
  result.style.display = 'none';

  fetch('/api/dashboard/shops/' + shopId + '/verify-sso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    btn.disabled = false;
    btn.textContent = '설정 확인';
    result.style.display = 'block';

    if (data.ok) {
      var slotHtml = (data.slots || []).map(function(s) {
        var color = s.status === 'ours' ? '#22c55e' : s.status === 'other' ? '#f59e0b' : '#94a3b8';
        var label = s.status === 'ours' ? '번개가입' : s.status === 'other' ? '다른 앱' : '미등록';
        return '<span style="display:inline-block;padding:2px 10px;margin:2px;border-radius:12px;font-size:12px;background:' + color + '20;color:' + color + ';border:1px solid ' + color + '">' + s.type + ': ' + label + '</span>';
      }).join('');

      result.innerHTML =
        '<div style="padding:16px;border-radius:8px;background:#f0fdf4;border:1px solid #86efac">' +
        '<div style="font-size:15px;font-weight:600;color:#16a34a;margin-bottom:8px">\\u2705 ' + data.message + '</div>' +
        (data.changed ? '<div style="font-size:13px;color:#475569;margin-bottom:8px">' + data.previous_sso_type + ' \\u2192 ' + data.detected_sso_type + '로 자동 변경됨</div>' : '') +
        '<div style="margin-top:8px">' + slotHtml + '</div>' +
        '</div>';
    } else {
      var slotHtml2 = (data.slots || []).map(function(s) {
        var color = s.status === 'other' ? '#f59e0b' : '#94a3b8';
        var label = s.status === 'other' ? '다른 앱' : '미등록';
        return '<span style="display:inline-block;padding:2px 10px;margin:2px;border-radius:12px;font-size:12px;background:' + color + '20;color:' + color + ';border:1px solid ' + color + '">' + s.type + ': ' + label + '</span>';
      }).join('');

      result.innerHTML =
        '<div style="padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5">' +
        '<div style="font-size:15px;font-weight:600;color:#dc2626;margin-bottom:8px">\\u274C ' + data.message + '</div>' +
        '<div style="margin-top:8px">' + slotHtml2 + '</div>' +
        '</div>';
    }
  })
  .catch(function(err) {
    btn.disabled = false;
    btn.textContent = '설정 확인';
    result.style.display = 'block';
    result.innerHTML = '<div style="padding:16px;border-radius:8px;background:#fef2f2;border:1px solid #fca5a5;color:#dc2626">오류가 발생했습니다: ' + err.message + '</div>';
  });
}
    `}} />
  </Layout>
);

// ─── Stats Page ─────────────────────────────────────────────

type FunnelEventRow = { event_type: string; cnt: number };

type OauthDropoffData = {
  total_oauth_start: number;
  total_signup_complete: number;
  overall_completion_rate: number;
  overall_dropoff_rate: number;
  providers: Array<{
    provider: string;
    oauth_start: number;
    signup_complete: number;
    completion_rate: number;
    dropoff_rate: number;
  }>;
};

type EffortData = {
  avg_visit_count: number | null;
  avg_session_pages: number | null;
  avg_product_views: number | null;
  avg_hours_to_signup: number | null;
  total_signups: number;
  first_visit_signups: number;
  first_visit_rate: number;
  trigger_distribution: Record<string, number>;
};

type DistributionData = {
  device: Array<{ device: string; count: number }>;
  referrer: {
    categories: Record<string, number>;
    top_domains: Array<{ domain: string; count: number }>;
  };
  first_visit_page: Array<{ page_type: string; count: number }>;
  provider_by_device: Array<{ provider: string; device: string; count: number }>;
};

type HourlyData = {
  heatmap: number[][];
  day_names: string[];
  peak: { day: string; hour: number; count: number; label: string };
};

type StatsPageProps = {
  stats: HomeStats;
  daily: DailyData[];
  shops: { shop_id: string; shop_name: string }[];
  currentShopId: string | null;
  currentPeriod: string;
  plan: string;
  funnelData?: FunnelEventRow[];
  oauthDropoff?: OauthDropoffData;
  effort?: EffortData;
  distribution?: DistributionData;
  hourly?: HourlyData;
  isCafe24?: boolean;
};

// ── PieChart ─────────────────────────────────────────────────
const PieChart: FC<{ data: { label: string; value: number; color: string }[]; size?: number }> = ({ data, size = 120 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div style="display:flex;align-items:center;justify-content:center;height:80px;color:#94a3b8;font-size:13px">
        데이터 없음
      </div>
    );
  }

  // conic-gradient 문자열 생성
  let cumPercent = 0;
  const stops = data.map(d => {
    const pct = (d.value / total) * 100;
    const from = cumPercent;
    cumPercent += pct;
    return `${d.color} ${from.toFixed(1)}% ${cumPercent.toFixed(1)}%`;
  });
  const gradient = `conic-gradient(${stops.join(', ')})`;

  return (
    <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
      <div style={`width:${size}px;height:${size}px;border-radius:50%;background:${gradient};flex-shrink:0`}></div>
      <div style="flex:1;min-width:120px">
        {data.map(d => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style={`width:10px;height:10px;border-radius:2px;background:${d.color};flex-shrink:0`}></div>
              <span style="font-size:12px;color:#475569;flex:1">{d.label}</span>
              <span style="font-size:12px;font-weight:600;color:#1e293b">{d.value.toLocaleString()}</span>
              <span style="font-size:11px;color:#94a3b8;min-width:34px;text-align:right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── HeatmapChart ─────────────────────────────────────────────
const HeatmapChart: FC<{ data: number[][]; dayNames: string[]; peak?: { label: string } }> = ({ data, dayNames, peak }) => {
  const maxVal = Math.max(1, ...data.flat());

  function cellColor(val: number): string {
    if (val === 0) return '#f8fafc';
    const ratio = val / maxVal;
    if (ratio < 0.33) return '#bfdbfe';
    if (ratio < 0.66) return '#3b82f6';
    return '#1d4ed8';
  }

  return (
    <div>
      {peak && (
        <div style="margin-bottom:10px;font-size:13px;color:#64748b">
          피크 시간대: <strong style="color:#1d4ed8">{peak.label}</strong>
          <span style="margin-left:8px;font-size:12px;color:#94a3b8">(KST 기준)</span>
        </div>
      )}
      <div style="overflow-x:auto">
        <div style="min-width:600px">
          {/* 시간 헤더 */}
          <div style="display:grid;grid-template-columns:28px repeat(24, 1fr);gap:2px;margin-bottom:2px">
            <div></div>
            {Array.from({ length: 24 }, (_, h) => (
              <div style="font-size:9px;color:#94a3b8;text-align:center">{h}</div>
            ))}
          </div>
          {/* 요일 행 */}
          {data.map((row, dow) => (
            <div style="display:grid;grid-template-columns:28px repeat(24, 1fr);gap:2px;margin-bottom:2px">
              <div style="font-size:11px;color:#64748b;display:flex;align-items:center;justify-content:center;font-weight:600">
                {dayNames[dow]}
              </div>
              {row.map((val, h) => (
                <div
                  style={`background:${cellColor(val)};border-radius:3px;height:18px`}
                  title={`${dayNames[dow]}요일 ${h}시: ${val}건`}
                ></div>
              ))}
            </div>
          ))}
          {/* 범례 */}
          <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:#94a3b8">
            <span>적음</span>
            <div style="width:14px;height:10px;background:#bfdbfe;border-radius:2px"></div>
            <div style="width:14px;height:10px;background:#3b82f6;border-radius:2px"></div>
            <div style="width:14px;height:10px;background:#1d4ed8;border-radius:2px"></div>
            <span>많음</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── MetricCard ───────────────────────────────────────────────
const MetricCard: FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color }) => (
  <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:16px;text-align:center">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;margin-bottom:6px">{label}</div>
    <div style={`font-size:26px;font-weight:700;color:${color || '#1e293b'}`}>{value}</div>
    {sub && <div style="font-size:12px;color:#94a3b8;margin-top:4px">{sub}</div>}
  </div>
);

// ── 프로바이더별 색상 (파이차트용) ──────────────────────────
const providerPieColors: Record<string, string> = {
  google: '#4285f4',
  kakao: '#f7c948',
  naver: '#03c75a',
  apple: '#555555',
  discord: '#5865f2',
  facebook: '#1877f2',
  x: '#666666',
  line: '#06c755',
  telegram: '#26a5e4',
  toss: '#0064ff',
  tiktok: '#888888',
};

const PIE_FALLBACK_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

export const StatsPage: FC<StatsPageProps> = ({
  stats, daily, shops, currentShopId, currentPeriod, plan,
  funnelData, oauthDropoff, effort, distribution, hourly, isCafe24,
}) => {
  const isPlus = plan !== 'free';
  const periodOptions = [
    { value: '', label: '전체 기간' },
    { value: 'today', label: '오늘' },
    { value: '7d', label: '최근 7일' },
    { value: '30d', label: '최근 30일' },
    { value: 'month', label: '이번 달' },
  ];

  const periodLabel = periodOptions.find(o => o.value === currentPeriod)?.label || '전체 기간';

  // 퍼널 카운트 맵
  const funnelCounts: Record<string, number> = {};
  for (const row of funnelData ?? []) funnelCounts[row.event_type] = row.cnt;

  const bannerShow   = funnelCounts['banner_show']   ?? 0;
  const bannerClick  = funnelCounts['banner_click']  ?? 0;
  const popupShow    = funnelCounts['popup_show']    ?? 0;
  const popupSignup  = funnelCounts['popup_signup']  ?? 0;
  const signupComplete = funnelCounts['signup_complete'] ?? 0;
  const escalationShow  = funnelCounts['escalation_show']  ?? 0;
  const escalationClick = funnelCounts['escalation_click'] ?? 0;

  const bannerCtr      = bannerShow     > 0 ? Math.round((bannerClick    / bannerShow)     * 100) : 0;
  const popupCvr       = popupShow      > 0 ? Math.round((popupSignup    / popupShow)      * 100) : 0;
  const escalationCtr  = escalationShow > 0 ? Math.round((escalationClick / escalationShow) * 100) : 0;
  const overallCvr     = bannerShow     > 0 ? Math.round((signupComplete / bannerShow)      * 100) : 0;

  return (
    <Layout title="가입 통계 분석" loggedIn currentPath="/dashboard/stats" isCafe24={isCafe24}>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:4px">
        <h1 style="margin-bottom:0">가입 통계 분석</h1>
        <div style="margin-left:auto">
          <a href="/api/dashboard/stats/export" class="btn btn-outline btn-sm" download>CSV 내보내기</a>
        </div>
      </div>
      <p style="font-size:14px;color:#64748b;margin-bottom:16px">프로바이더별 가입 추이와 전환율을 분석합니다.</p>

      {/* ── 필터 바 ── */}
      <div class="filter-bar">
        <select id="periodFilter" onchange="applyFilters()">
          {periodOptions.map(opt => (
            <option value={opt.value} selected={currentPeriod === opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* ── 핵심 지표 카드 ── */}
      <div class="stat-grid">
        <div class="stat-card">
          <div class="label">가입</div>
          <div class="value">{stats.total_signups.toLocaleString()}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">{periodLabel}</div>
        </div>
        <div class="stat-card">
          <div class="label">로그인</div>
          <div class="value">{stats.total_logins.toLocaleString()}</div>
          <div style="font-size:12px;color:#94a3b8;margin-top:2px">{periodLabel}</div>
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

      {/* ── 소셜별 가입 비율 ── */}
      {Object.keys(stats.by_provider).length > 0 && (
        <div class="card">
          <h2>소셜별 가입 비율</h2>
          {Object.entries(stats.by_provider)
            .sort((a, b) => b[1] - a[1])
            .map(([provider, count]) => (
              <ProgressBar
                label={providerDisplayNames[provider] || provider}
                value={count}
                max={stats.total_signups}
                color={providerColors[provider] || '#94a3b8'}
              />
            ))}
        </div>
      )}

      {/* ── 일별 추이 ── */}
      <div class="chart-container">
        <h3>일별 추이</h3>
        <LineChart data={daily} />
      </div>

      {/* ── 상세 분석 섹션 ── */}
      {currentShopId && (
        <div style={isPlus ? '' : 'position:relative'}>
          {!isPlus && (
            <div style="position:absolute;left:0;right:0;top:0;bottom:0;z-index:10;display:flex;align-items:flex-start;justify-content:center;padding-top:80px">
              <div style="background:rgba(255,255,255,0.97);border:1px solid #e2e8f0;border-radius:12px;padding:24px 32px;max-width:380px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.12);backdrop-filter:blur(8px);position:sticky;top:120px">
                <div style="font-size:32px;margin-bottom:12px">📊</div>
                <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px">상세 통계 분석</h3>
                <p style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.6">퍼널 분석, OAuth 이탈률, 가입 노력 분석, 디바이스/유입경로 분포, 시간대별 히트맵을 확인하세요.</p>
                <div style="text-align:left;margin-bottom:16px">
                  <div style="font-size:12px;color:#475569;padding:3px 0;display:flex;align-items:center;gap:6px"><span style="color:#2563eb;font-size:10px">●</span> 배너→클릭→팝업→가입 퍼널 전환율</div>
                  <div style="font-size:12px;color:#475569;padding:3px 0;display:flex;align-items:center;gap:6px"><span style="color:#2563eb;font-size:10px">●</span> 프로바이더별 OAuth 완료/이탈 비율</div>
                  <div style="font-size:12px;color:#475569;padding:3px 0;display:flex;align-items:center;gap:6px"><span style="color:#2563eb;font-size:10px">●</span> 평균 방문 횟수, 소요 시간, 트리거 분석</div>
                  <div style="font-size:12px;color:#475569;padding:3px 0;display:flex;align-items:center;gap:6px"><span style="color:#2563eb;font-size:10px">●</span> 디바이스 · 유입경로 · 시간대 패턴</div>
                </div>
                <a href="/dashboard/billing" class="btn btn-primary" style="display:inline-flex;width:auto;padding:10px 24px">
                  Plus 시작하기 — 월 ₩6,900
                </a>
                <p style="font-size:11px;color:#94a3b8;margin-top:8px">연간 결제 시 ₩79,000 (약 5% 할인)</p>
              </div>
            </div>
          )}
          <div style={isPlus ? '' : 'filter:blur(2px);opacity:0.6;pointer-events:none;user-select:none'}>

          {/* ── 노출/클릭/전환율 카드 3개 ── */}
          {funnelData !== undefined && funnelData.length > 0 && (
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:16px">
              <div class="stat-card" style="border-left:4px solid #2563eb">
                <div class="label">배너 CTR</div>
                <div class="value" style="font-size:24px;color:#2563eb">{bannerCtr}%</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">
                  {bannerShow.toLocaleString()} 노출 / {bannerClick.toLocaleString()} 클릭
                </div>
              </div>
              <div class="stat-card" style="border-left:4px solid #059669">
                <div class="label">팝업 CVR</div>
                <div class="value" style="font-size:24px;color:#059669">{popupCvr}%</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">
                  {popupShow.toLocaleString()} 노출 / {popupSignup.toLocaleString()} 가입
                </div>
              </div>
              <div class="stat-card" style="border-left:4px solid #f59e0b">
                <div class="label">에스컬레이션 CTR</div>
                <div class="value" style="font-size:24px;color:#f59e0b">{escalationCtr}%</div>
                <div style="font-size:12px;color:#94a3b8;margin-top:2px">
                  {escalationShow.toLocaleString()} 노출 / {escalationClick.toLocaleString()} 클릭
                </div>
              </div>
            </div>
          )}

          {/* ── 퍼널 분석 ── */}
          {funnelData !== undefined && (
            <div class="card" style="margin-bottom:16px">
              <h3 style="margin-bottom:4px">퍼널 분석</h3>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:16px">
                {periodLabel} 기준 — 배너 노출부터 가입 완료까지
              </p>

              {funnelData.length === 0 ? (
                <div class="empty-state"><p>퍼널 이벤트 데이터가 없습니다.</p></div>
              ) : (() => {
                const steps = [
                  { key: 'banner_show',      label: '배너 노출',     color: '#bfdbfe', nextKey: 'banner_click' },
                  { key: 'banner_click',     label: '배너 클릭',     color: '#93c5fd', nextKey: 'popup_show' },
                  { key: 'popup_show',       label: '팝업 노출',     color: '#60a5fa', nextKey: 'popup_signup' },
                  { key: 'popup_signup',     label: '팝업 가입',     color: '#3b82f6', nextKey: 'signup_complete' },
                  { key: 'signup_complete',  label: '가입 완료',     color: '#1d4ed8', nextKey: null },
                ];
                const extraSteps = [
                  { key: 'escalation_show',  label: '에스컬레이션 노출', color: '#fde68a', nextKey: 'escalation_click' },
                  { key: 'escalation_click', label: '에스컬레이션 클릭', color: '#f59e0b', nextKey: null },
                  { key: 'kakao_channel_show',  label: '카카오채널 노출', color: '#fde047', nextKey: 'kakao_channel_click' },
                  { key: 'kakao_channel_click', label: '카카오채널 클릭', color: '#eab308', nextKey: null },
                ];
                const maxCnt = Math.max(1, ...steps.map(s => funnelCounts[s.key] ?? 0));

                return (
                  <div>
                    {/* 메인 퍼널 */}
                    {steps.map((step, idx) => {
                      const val = funnelCounts[step.key] ?? 0;
                      const barPct = Math.max(Math.round((val / maxCnt) * 100), val > 0 ? 2 : 0);
                      const prevVal = idx > 0 ? (funnelCounts[steps[idx - 1].key] ?? 0) : 0;
                      const convRate = idx > 0 && prevVal > 0 ? Math.round((val / prevVal) * 100) : null;
                      return (
                        <div style="margin-bottom:8px">
                          <div style="display:flex;align-items:center;gap:10px">
                            <span style="width:96px;font-size:13px;color:#475569;flex-shrink:0">{step.label}</span>
                            <div style="flex:1;background:#f1f5f9;border-radius:4px;height:26px;overflow:hidden">
                              <div style={`width:${barPct}%;background:${step.color};height:100%;border-radius:4px;display:flex;align-items:center;padding:0 8px;`}>
                                {barPct >= 20 && <span style="font-size:11px;color:#1e40af;font-weight:600">{val.toLocaleString()}</span>}
                              </div>
                            </div>
                            <span style="width:56px;text-align:right;font-size:13px;font-weight:600;color:#1e293b">{val.toLocaleString()}</span>
                          </div>
                          {convRate !== null && (
                            <div style="margin-left:106px;font-size:11px;color:#94a3b8;margin-top:2px">
                              ↓ 전환율 <strong style="color:#2563eb">{convRate}%</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* 전체 전환율 요약 */}
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

                    {/* 에스컬레이션 / 카카오채널 (데이터 있는 경우만) */}
                    {extraSteps.some(s => (funnelCounts[s.key] ?? 0) > 0) && (
                      <div style="margin-top:16px;padding-top:12px;border-top:1px solid #f1f5f9">
                        <div style="font-size:12px;color:#94a3b8;margin-bottom:8px">추가 채널</div>
                        {extraSteps.filter(s => (funnelCounts[s.key] ?? 0) > 0).map(step => {
                          const val = funnelCounts[step.key] ?? 0;
                          const maxExtra = Math.max(1, ...extraSteps.map(s => funnelCounts[s.key] ?? 0));
                          const barPct = Math.max(Math.round((val / maxExtra) * 100), 2);
                          return (
                            <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
                              <span style="width:132px;font-size:12px;color:#64748b;flex-shrink:0">{step.label}</span>
                              <div style="flex:1;background:#fef3c7;border-radius:4px;height:20px;overflow:hidden">
                                <div style={`width:${barPct}%;background:${step.color};height:100%;border-radius:4px`}></div>
                              </div>
                              <span style="width:56px;text-align:right;font-size:12px;font-weight:600;color:#92400e">{val.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ── OAuth 이탈 분석 ── */}
          {oauthDropoff && (
            <div class="card" style="margin-bottom:16px">
              <h3 style="margin-bottom:4px">OAuth 이탈 분석</h3>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:12px">
                프로바이더별 OAuth 시작 → 가입 완료 전환율
              </p>
              <div style="display:flex;gap:24px;flex-wrap:wrap;margin-bottom:16px">
                <div style="font-size:13px;color:#64748b">
                  전체 완료율 <strong style={`color:${oauthDropoff.overall_completion_rate >= 70 ? '#059669' : oauthDropoff.overall_completion_rate >= 40 ? '#f59e0b' : '#ef4444'}`}>
                    {oauthDropoff.overall_completion_rate}%
                  </strong>
                  <span style="font-size:12px;color:#94a3b8;margin-left:6px">
                    ({oauthDropoff.total_signup_complete.toLocaleString()} / {oauthDropoff.total_oauth_start.toLocaleString()})
                  </span>
                </div>
                <div style="font-size:13px;color:#64748b">
                  전체 이탈률 <strong style="color:#ef4444">{oauthDropoff.overall_dropoff_rate}%</strong>
                </div>
              </div>
              {oauthDropoff.providers.length === 0 ? (
                <div class="empty-state" style="padding:24px"><p>데이터가 없습니다.</p></div>
              ) : (
                oauthDropoff.providers.map(p => {
                  const completionColor = p.completion_rate >= 70 ? '#059669' : p.completion_rate >= 40 ? '#f59e0b' : '#ef4444';
                  return (
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
                      <span style="width:80px;font-size:13px;color:#475569;flex-shrink:0">
                        {providerDisplayNames[p.provider] || p.provider}
                      </span>
                      <div style="flex:1;background:#f1f5f9;border-radius:4px;height:24px;overflow:hidden;position:relative">
                        <div style={`width:${p.completion_rate}%;background:${completionColor};height:100%;border-radius:4px`}></div>
                      </div>
                      <span style={`width:36px;text-align:right;font-size:13px;font-weight:600;color:${completionColor}`}>
                        {p.completion_rate}%
                      </span>
                      <span style="font-size:11px;color:#94a3b8;min-width:80px">
                        {p.signup_complete}/{p.oauth_start} 완료
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── 가입 분석 파이차트 ── */}
          {distribution && (
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">
              {/* 프로바이더별 가입 */}
              <div class="card">
                <h3 style="margin-bottom:16px;font-size:15px">프로바이더별 가입</h3>
                <PieChart
                  data={Object.entries(stats.by_provider)
                    .sort((a, b) => b[1] - a[1])
                    .map(([prov, cnt], i) => ({
                      label: providerDisplayNames[prov] || prov,
                      value: cnt,
                      color: providerPieColors[prov] || PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length],
                    }))}
                />
              </div>
              {/* 디바이스 분포 */}
              <div class="card">
                <h3 style="margin-bottom:16px;font-size:15px">디바이스 분포</h3>
                <PieChart
                  data={distribution.device.map((d, i) => ({
                    label: d.device === 'mobile' ? '모바일' : d.device === 'desktop' ? '데스크톱' : d.device === 'tablet' ? '태블릿' : d.device,
                    value: d.count,
                    color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][i] || PIE_FALLBACK_COLORS[i],
                  }))}
                />
              </div>
            </div>
          )}

          {/* ── 가입까지의 노력 ── */}
          {effort && (
            <div class="card" style="margin-bottom:16px">
              <h3 style="margin-bottom:4px">가입까지의 노력</h3>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:16px">
                가입 완료한 사용자의 행동 패턴 분석
              </p>
              <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:16px">
                <MetricCard
                  label="평균 방문 횟수"
                  value={effort.avg_visit_count !== null ? `${effort.avg_visit_count}회` : '-'}
                  sub="가입까지 평균 방문"
                />
                <MetricCard
                  label="평균 페이지 수"
                  value={effort.avg_session_pages !== null ? `${effort.avg_session_pages}페이지` : '-'}
                  sub="세션당 평균 조회"
                />
                <MetricCard
                  label="1회 방문 가입률"
                  value={`${effort.first_visit_rate}%`}
                  sub={`${effort.first_visit_signups}명 / ${effort.total_signups}명`}
                  color={effort.first_visit_rate >= 60 ? '#059669' : '#f59e0b'}
                />
                <MetricCard
                  label="평균 소요 시간"
                  value={effort.avg_hours_to_signup !== null
                    ? (effort.avg_hours_to_signup < 1
                        ? `${Math.round(effort.avg_hours_to_signup * 60)}분`
                        : `${effort.avg_hours_to_signup}시간`)
                    : '-'}
                  sub="첫 방문→가입 완료"
                />
              </div>

              {/* 가입 트리거 분포 */}
              {Object.keys(effort.trigger_distribution).length > 0 && (
                <div>
                  <div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:10px">가입 트리거 분포</div>
                  <PieChart
                    data={Object.entries(effort.trigger_distribution)
                      .sort((a, b) => b[1] - a[1])
                      .map(([trigger, cnt], i) => ({
                        label: trigger === 'banner' ? '배너' : trigger === 'popup' ? '팝업' : trigger === 'escalation' ? '에스컬레이션' : trigger === 'kakao_channel' ? '카카오채널' : '직접',
                        value: cnt,
                        color: ['#2563eb','#059669','#f59e0b','#f7c948','#94a3b8'][i] || PIE_FALLBACK_COLORS[i],
                      }))}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── 유입 분석 ── */}
          {distribution && (
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">
              {/* 유입 경로 카테고리 */}
              <div class="card">
                <h3 style="margin-bottom:16px;font-size:15px">유입 경로</h3>
                <PieChart
                  data={Object.entries(distribution.referrer.categories)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, cnt], i) => ({
                      label: cat === 'search' ? '검색' : cat === 'social' ? '소셜' : cat === 'direct' ? '직접' : '기타',
                      value: cnt,
                      color: ['#3b82f6','#f59e0b','#94a3b8','#10b981'][i] || PIE_FALLBACK_COLORS[i],
                    }))}
                />
              </div>
              {/* 첫 방문 페이지 */}
              <div class="card">
                <h3 style="margin-bottom:16px;font-size:15px">첫 방문 페이지 유형</h3>
                <PieChart
                  data={distribution.first_visit_page
                    .slice(0, 6)
                    .map((p, i) => ({
                      label: p.page_type === 'product' ? '상품 페이지' : p.page_type === 'home' ? '홈' : p.page_type === 'category' ? '카테고리' : p.page_type === 'cart' ? '장바구니' : p.page_type,
                      value: p.count,
                      color: PIE_FALLBACK_COLORS[i % PIE_FALLBACK_COLORS.length],
                    }))}
                />
              </div>
            </div>
          )}

          {/* ── 시간대별 가입 패턴 ── */}
          {hourly && (
            <div class="card" style="margin-bottom:16px">
              <h3 style="margin-bottom:4px">시간대별 가입 패턴</h3>
              <p style="font-size:12px;color:#94a3b8;margin-bottom:16px">요일 × 시간대 히트맵 (최근 30일, KST 기준)</p>
              <HeatmapChart
                data={hourly.heatmap}
                dayNames={hourly.day_names}
                peak={hourly.peak}
              />
            </div>
          )}

          </div>
        </div>
      )}

      <script dangerouslySetInnerHTML={{__html: `
        function applyFilters() {
          const period = document.getElementById('periodFilter').value;
          const params = new URLSearchParams();
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
                    btnEl.textContent = '결제 확인 중...';
                    var pollCount = 0;
                    var maxPolls = 15;
                    var pollInterval = setInterval(function() {
                      pollCount++;
                      fetch('/api/dashboard/billing/status/' + subId, { credentials: 'same-origin' })
                        .then(function(r) { return r.json(); })
                        .then(function(s) {
                          if (s.status === 'active') {
                            clearInterval(pollInterval);
                            showToast('success', 'Plus 플랜이 활성화되었습니다!');
                            setTimeout(function() { location.reload(); }, 500);
                          } else if (pollCount >= maxPolls) {
                            clearInterval(pollInterval);
                            showToast('warn', '결제가 처리 중입니다. 잠시 후 새로고침해 주세요.');
                            btnEl.disabled = false;
                            btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
                          }
                        })
                        .catch(function() {
                          if (pollCount >= maxPolls) {
                            clearInterval(pollInterval);
                            btnEl.disabled = false;
                            btnEl.textContent = plan === 'monthly' ? 'Plus 월간 전환' : 'Plus 연간 전환';
                          }
                        });
                    }, 2000);
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
  buttonWidth: 370,
  buttonHeight: 45,
  buttonGap: 6,
  borderRadius: 5,
  align: 'left',
  buttonLabel: '{name}로 시작하기',
  showIcon: true,
  iconGap: 30,
  paddingLeft: 100,
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
              아이콘-텍스트 간격 <span id="iconGapValue">{ws.showIcon !== false ? (ws as any).iconGap ?? 30 : 30}px</span>
            </label>
            <input type="range" id="btnIconGap" min="0" max="100" value={String((ws as any).iconGap ?? 30)} style="width:100%" />
          </div>
          <div>
            <label style="font-size:13px; font-weight:600; color:#475569; display:flex; justify-content:space-between; margin-bottom:6px">
              왼쪽 여백 <span id="paddingLeftValue">{(ws as any).paddingLeft ?? 100}px</span>
            </label>
            <input type="range" id="btnPaddingLeft" min="0" max="150" value={String((ws as any).paddingLeft ?? 100)} style="width:100%" />
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
            buttonHeight: widgetStyle.buttonHeight || 45,
            buttonGap: widgetStyle.buttonGap,
            borderRadius: widgetStyle.borderRadius,
            align: widgetStyle.align,
            buttonLabel: widgetStyle.buttonLabel || '{name}로 시작하기',
            showIcon: widgetStyle.showIcon !== false,
            iconGap: widgetStyle.iconGap || 30,
            paddingLeft: widgetStyle.paddingLeft || 100,
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
              var defaults = {preset:'default',buttonWidth:370,buttonHeight:45,buttonGap:6,borderRadius:5,align:'left',buttonLabel:'{name}로 시작하기',showIcon:true,iconGap:30,paddingLeft:100,showTitle:true,showPoweredBy:true};
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
              var defCard = document.querySelector('.preset-card[data-preset="default"]');
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

type AdminPlanCounts = {
  total: number;
  free: number;
  monthly: number;
  yearly: number;
};

type AdminTopShop = {
  shop_name: string;
  mall_id: string;
  plan: string;
  total_signups: number;
  monthly_signups: number;
  daily_signups: number;
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

type AdminPendingInquiry = {
  id: string;
  title: string;
  created_at: string;
  owner_email: string;
  shop_name: string;
};

export const AdminHomePage: FC<{
  planCounts: AdminPlanCounts;
  providerDistribution: { provider: string; cnt: number }[];
  dailySignups: { date: string; cnt: number }[];
  topShops: AdminTopShop[];
  pendingInquiries: AdminPendingInquiry[];
  pendingInquiryCount: number;
}> = ({ planCounts, providerDistribution, dailySignups, topShops, pendingInquiries, pendingInquiryCount }) => (
  <Layout title="관리자 홈" loggedIn isAdmin currentPath="/supadmin">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <h1 style="margin-bottom:0">관리자 대시보드</h1>
      <span class="badge badge-red" style="font-size:13px">ADMIN</span>
      <div style="margin-left:auto;display:flex;gap:8px">
        <a href="/api/supadmin/export/shops" class="btn btn-outline btn-sm" download>쇼핑몰 CSV</a>
        <a href="/api/supadmin/export/stats" class="btn btn-outline btn-sm" download>통계 CSV</a>
      </div>
    </div>

    {/* 플랜별 쇼핑몰 수 */}
    <div class="stat-grid" style="grid-template-columns:repeat(5,1fr)">
      <div class="stat-card">
        <div class="label">전체 쇼핑몰</div>
        <div class="value">{planCounts.total.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">무료 플랜</div>
        <div class="value">{planCounts.free.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">월간 구독</div>
        <div class="value" style="color:#2563eb">{planCounts.monthly.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">연간 구독</div>
        <div class="value" style="color:#059669">{planCounts.yearly.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">미답변 문의</div>
        <div class="value" style={pendingInquiryCount > 0 ? 'color:#ef4444' : ''}>{pendingInquiryCount > 0 ? <a href="/supadmin/inquiries?status=pending" style="color:#ef4444;text-decoration:none">{pendingInquiryCount}</a> : '0'}</div>
      </div>
    </div>

    {/* 프로바이더별 가입 분포 + 기간 필터 */}
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin-bottom:0">프로바이더별 가입 분포</h2>
        <div style="display:flex;gap:8px">
          <select id="providerPlanFilter" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
            <option value="all" selected>전체 플랜</option>
            <option value="free">무료</option>
            <option value="paid">유료</option>
          </select>
          <select id="providerPeriodFilter" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
            <option value="all" selected>전체 기간</option>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
          </select>
        </div>
      </div>
      <div id="providerBars">
        {/* SSR 초기 렌더: 전체 기간 */}
        {providerDistribution.map((row) => (
          <ProgressBar
            label={providerDisplayNames[row.provider] || row.provider}
            value={row.cnt}
            max={providerDistribution.reduce((s, r) => s + r.cnt, 0)}
            color={providerColors[row.provider]}
          />
        ))}
      </div>
    </div>

    {/* 일자별 가입 추이 그래프 (프로바이더별 색상) */}
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin-bottom:0">일자별 가입 추이</h2>
        <div id="dailyLegend" style="display:flex;gap:12px;flex-wrap:wrap"></div>
      </div>
      <div id="dailyChart" style="height:220px;display:flex;align-items:flex-end;gap:4px;padding-top:16px">
      </div>
    </div>

    {/* 상위 10개 쇼핑몰 */}
    <div class="card">
      <h2>상위 10개 쇼핑몰 (가입 회원수 기준)</h2>
      {topShops.length === 0 ? (
        <div class="empty-state"><p>아직 가입 데이터가 없습니다.</p></div>
      ) : (
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>쇼핑몰명</th>
                <th>Mall ID</th>
                <th style="width:80px">플랜</th>
                <th style="width:90px;text-align:right">총 회원수</th>
                <th style="width:90px;text-align:right">당월 가입</th>
                <th style="width:90px;text-align:right">당일 가입</th>
              </tr>
            </thead>
            <tbody>
              {topShops.map((shop, i) => (
                <tr>
                  <td style="font-size:13px;color:#94a3b8;font-weight:600">{i + 1}</td>
                  <td style="font-size:13px;font-weight:500">{shop.shop_name || '-'}</td>
                  <td style="font-size:12px"><code>{shop.mall_id}</code></td>
                  <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : shop.plan === 'monthly' ? '월간' : '연간'}</span></td>
                  <td style="text-align:right;font-weight:600">{shop.total_signups.toLocaleString()}</td>
                  <td style="text-align:right;color:#2563eb">{shop.monthly_signups.toLocaleString()}</td>
                  <td style="text-align:right;color:#059669">{shop.daily_signups.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>

    {/* 미답변 문의 */}
    {pendingInquiries.length > 0 && (
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin-bottom:0;color:#ef4444">미답변 문의 ({pendingInquiryCount}건)</h2>
          <a href="/supadmin/inquiries?status=pending" style="font-size:13px">전체 보기 →</a>
        </div>
        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th style="width:140px">쇼핑몰</th>
                <th style="width:160px">문의자</th>
                <th style="width:140px">문의일시</th>
              </tr>
            </thead>
            <tbody>
              {pendingInquiries.map((inq) => (
                <tr>
                  <td style="font-size:13px">{inq.title}</td>
                  <td style="font-size:12px;color:#64748b">{inq.shop_name || '-'}</td>
                  <td style="font-size:12px;color:#64748b">{inq.owner_email}</td>
                  <td style="font-size:12px;color:#94a3b8">{inq.created_at.slice(0, 16).replace('T', ' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )}

    {/* 시스템 지표 (Cloudflare) */}
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2 style="margin-bottom:0">시스템 상태</h2>
        <a href="/supadmin/monitoring" style="font-size:13px">상세 보기 →</a>
      </div>
      <div id="sysMetrics" style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
        <div style="text-align:center;padding:16px;color:#94a3b8;font-size:13px;grid-column:1/-1">로딩 중...</div>
      </div>
    </div>

    {/* 기간 필터 + 일자별 차트 JS */}
    <script dangerouslySetInnerHTML={{__html: `
      (function() {
        var providerColors = ${JSON.stringify(providerColors)};
        var providerNames = ${JSON.stringify(providerDisplayNames)};
        var chartContainer = document.getElementById('dailyChart');
        var legendContainer = document.getElementById('dailyLegend');

        // ─── 일자별 차트 렌더링 (프로바이더별 stacked bar) ─────
        function renderDailyChart(rawData) {
          if (!rawData || rawData.length === 0) {
            chartContainer.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;color:#94a3b8;font-size:13px">데이터가 없습니다.</div>';
            legendContainer.innerHTML = '';
            return;
          }
          // rawData: [{date, provider, cnt}, ...]
          var dates = [];
          var providers = [];
          var byDate = {};
          rawData.forEach(function(d) {
            if (!byDate[d.date]) { byDate[d.date] = {}; dates.push(d.date); }
            byDate[d.date][d.provider] = (byDate[d.date][d.provider] || 0) + d.cnt;
            if (providers.indexOf(d.provider) === -1) providers.push(d.provider);
          });
          var maxCnt = Math.max(1, ...dates.map(function(dt) {
            return Object.values(byDate[dt]).reduce(function(s, v) { return s + v; }, 0);
          }));

          var html = '';
          dates.forEach(function(dt) {
            var total = Object.values(byDate[dt]).reduce(function(s, v) { return s + v; }, 0);
            var barH = Math.max(8, Math.round((total / maxCnt) * 170));
            html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">';
            html += '<span style="font-size:10px;font-weight:600;color:#1e293b">' + total + '</span>';
            html += '<div style="width:100%;max-width:28px;height:' + barH + 'px;border-radius:4px 4px 0 0;overflow:hidden;display:flex;flex-direction:column-reverse">';
            providers.forEach(function(p) {
              var cnt = byDate[dt][p] || 0;
              if (cnt === 0) return;
              var segH = Math.max(2, Math.round((cnt / total) * barH));
              html += '<div style="width:100%;height:' + segH + 'px;background:' + (providerColors[p] || '#94a3b8') + '" title="' + (providerNames[p] || p) + ': ' + cnt + '"></div>';
            });
            html += '</div>';
            html += '<span style="font-size:9px;color:#94a3b8">' + dt.slice(5) + '</span>';
            html += '</div>';
          });
          chartContainer.innerHTML = html;

          // 범례
          var legHtml = '';
          providers.forEach(function(p) {
            legHtml += '<div style="display:flex;align-items:center;gap:4px;font-size:11px;color:#64748b">';
            legHtml += '<div style="width:10px;height:10px;border-radius:2px;background:' + (providerColors[p] || '#94a3b8') + '"></div>';
            legHtml += (providerNames[p] || p);
            legHtml += '</div>';
          });
          legendContainer.innerHTML = legHtml;
        }

        // ─── 필터 공통 함수 ─────────────────
        function getFilterParams() {
          var days = document.getElementById('providerPeriodFilter').value;
          var plan = document.getElementById('providerPlanFilter').value;
          var params = [];
          if (days !== 'all') params.push('days=' + days);
          if (plan !== 'all') params.push('plan=' + plan);
          return params;
        }

        // ─── 프로바이더 분포 로드 ────────────
        async function loadProviderStats() {
          var params = getFilterParams();
          var url = '/api/supadmin/stats/providers' + (params.length ? '?' + params.join('&') : '');
          try {
            var resp = await fetch(url, { credentials: 'same-origin' });
            var data = await resp.json();
            var container = document.getElementById('providerBars');
            if (!data.providers || data.providers.length === 0) {
              container.innerHTML = '<div style="color:#94a3b8;font-size:13px;padding:12px 0">해당 조건의 데이터가 없습니다.</div>';
              return;
            }
            var total = data.providers.reduce(function(s, r) { return s + r.cnt; }, 0);
            var html = '';
            data.providers.forEach(function(row) {
              var pct = total > 0 ? Math.round((row.cnt / total) * 100) : 0;
              var color = providerColors[row.provider] || '#94a3b8';
              var name = providerNames[row.provider] || row.provider;
              html += '<div style="margin-bottom:8px">';
              html += '<div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px"><span>' + name + '</span><span style="color:#64748b">' + row.cnt.toLocaleString() + '건 (' + pct + '%)</span></div>';
              html += '<div style="background:#f1f5f9;border-radius:4px;height:8px;overflow:hidden"><div style="background:' + color + ';height:100%;width:' + pct + '%;border-radius:4px"></div></div>';
              html += '</div>';
            });
            container.innerHTML = html;
          } catch(e) {}
        }

        // ─── 일자별 추이 로드 ────────────────
        async function loadDailyChart() {
          var params = getFilterParams();
          // 기간 필터가 없으면 기본 14일
          var hasDays = params.some(function(p) { return p.startsWith('days='); });
          if (!hasDays) params.push('days=14');
          var url = '/api/supadmin/stats/daily' + (params.length ? '?' + params.join('&') : '');
          try {
            var resp = await fetch(url, { credentials: 'same-origin' });
            var data = await resp.json();
            renderDailyChart(data.daily || []);
          } catch(e) {
            chartContainer.innerHTML = '<div style="color:#ef4444;font-size:13px;padding:20px;text-align:center">차트 로드 실패</div>';
          }
        }

        // ─── 필터 변경 시 둘 다 업데이트 ─────
        async function onFilterChange() {
          await Promise.all([loadProviderStats(), loadDailyChart()]);
        }
        document.getElementById('providerPeriodFilter').addEventListener('change', onFilterChange);
        document.getElementById('providerPlanFilter').addEventListener('change', onFilterChange);

        // 초기 로드
        loadDailyChart();

        // ─── 시스템 지표 로드 ────────────────
        (async function() {
          var container = document.getElementById('sysMetrics');
          try {
            var resp = await fetch('/api/supadmin/monitoring', { credentials: 'same-origin' });
            var result = await resp.json();
            if (result.error) {
              container.innerHTML = '<div style="text-align:center;padding:12px;color:#94a3b8;font-size:12px;grid-column:1/-1">' + (result.error === 'cf_not_configured' ? 'CF Token 미설정' : '로드 실패') + '</div>';
              return;
            }
            var acc = result.data && result.data.viewer && result.data.viewer.accounts && result.data.viewer.accounts[0];
            if (!acc) { container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px">데이터 없음</div>'; return; }
            var workers = acc.workersInvocationsAdaptive || [];
            var totalReqs = 0, totalErrors = 0;
            workers.forEach(function(w) { totalReqs += w.sum.requests; totalErrors += w.sum.errors; });
            var errRate = totalReqs > 0 ? (totalErrors / totalReqs * 100).toFixed(2) : '0';
            var html = '';
            html += '<div><div style="font-size:12px;color:#64748b">Workers 요청 (7일)</div><div style="font-size:20px;font-weight:700">' + totalReqs.toLocaleString() + '</div></div>';
            html += '<div><div style="font-size:12px;color:#64748b">에러율</div><div style="font-size:20px;font-weight:700;color:' + (parseFloat(errRate) > 1 ? '#ef4444' : '#059669') + '">' + errRate + '%</div></div>';
            html += '<div><div style="font-size:12px;color:#64748b">에러 수</div><div style="font-size:20px;font-weight:700;color:' + (totalErrors > 0 ? '#ef4444' : '#059669') + '">' + totalErrors.toLocaleString() + '</div></div>';
            container.innerHTML = html;
          } catch(e) {
            container.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:#94a3b8;font-size:12px">로드 실패</div>';
          }
        })();
      })();
    `}} />
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
  <Layout title="전체 쇼핑몰" loggedIn isAdmin currentPath="/supadmin/shops">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <h1 style="margin-bottom:0">전체 쇼핑몰 관리</h1>
      <div style="margin-left:auto">
        <a href="/api/supadmin/export/shops" class="btn btn-outline btn-sm" download>CSV 내보내기</a>
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
        {search && <a href="/supadmin/shops" class="btn btn-outline btn-sm">초기화</a>}
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
                  <td><a href={'/supadmin/shops/' + shop.shop_id} style="color:#2563eb;text-decoration:none;font-weight:500">{shop.shop_name || '-'}</a></td>
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
            <a href={`/supadmin/shops?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/supadmin/shops?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      // 검색 폼
      document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var q = document.getElementById('searchInput').value.trim();
        window.location.href = '/supadmin/shops' + (q ? '?search=' + encodeURIComponent(q) : '');
      });

      // 플랜 저장 버튼
      document.querySelectorAll('.plan-save-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var shopId = this.dataset.shopId;
          var row = this.closest('tr');
          var select = row.querySelector('.plan-select');
          var plan = select.value;
          var resp = await apiCall('PUT', '/api/supadmin/shops/' + shopId + '/plan', { plan: plan }, this);
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
          var resp = await apiCall('PUT', '/api/supadmin/shops/' + shopId + '/status', { action: action }, this);
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
  <Layout title="구독 현황" loggedIn isAdmin currentPath="/supadmin/subscriptions">
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
          var resp = await apiCall('PUT', '/api/supadmin/subscriptions/' + subId + '/cancel', {}, this);
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
    <Layout title="감사 로그" loggedIn isAdmin currentPath="/supadmin/audit-log">
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
          <a href="/supadmin/audit-log" class="btn btn-outline btn-sm">초기화</a>
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
            <a href={`/supadmin/audit-log?page=${page - 1}${filterSuffix}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">페이지 {page}</span>
          {logs.length === limit && (
            <a href={`/supadmin/audit-log?page=${page + 1}${filterSuffix}`} class="btn btn-outline btn-sm">다음</a>
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
          window.location.href = '/supadmin/audit-log' + qs;
        }
      `}} />
    </Layout>
  );
};

// --- Admin Monitoring ---

export const AdminMonitoringPage: FC = () => (
  <Layout title="시스템 모니터링" loggedIn isAdmin currentPath="/supadmin/monitoring">
    <h1>시스템 모니터링</h1>
    <p style="font-size:14px;color:#64748b;margin-bottom:24px">Cloudflare Workers 리소스 사용량</p>

    <div id="monitoringContent">
      <div style="text-align:center;padding:40px;color:#94a3b8">로딩 중...</div>
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      (function() {
        async function loadMonitoring() {
          var container = document.getElementById('monitoringContent');
          try {
            var resp = await fetch('/api/supadmin/monitoring', { credentials: 'same-origin' });
            var result = await resp.json();

            if (result.error === 'cf_not_configured') {
              container.innerHTML = '<div class="card"><div style="text-align:center;padding:40px"><h3 style="color:#f59e0b;margin-bottom:8px">API Token 미설정</h3><p style="color:#64748b;font-size:13px">Cloudflare API Token을 Worker secret으로 설정해주세요.</p><code style="display:block;margin-top:12px;font-size:12px;color:#94a3b8">npx wrangler secret put CF_API_TOKEN --env dev</code></div></div>';
              return;
            }

            if (result.error) {
              container.innerHTML = '<div class="card"><div style="text-align:center;padding:40px;color:#ef4444">데이터 로드 실패: ' + (result.message || result.error) + '</div></div>';
              return;
            }

            var accounts = result.data && result.data.viewer && result.data.viewer.accounts;
            if (!accounts || accounts.length === 0) {
              container.innerHTML = '<div class="card"><div style="text-align:center;padding:40px;color:#94a3b8">데이터가 없습니다.</div></div>';
              return;
            }

            var acc = accounts[0];
            var workers = acc.workersInvocationsAdaptive || [];
            var d1 = acc.d1AnalyticsAdaptive || [];

            // Workers 집계
            var totalReqs = 0, totalErrors = 0, totalSubreqs = 0;
            var cpuP50Sum = 0, cpuP99Sum = 0, cpuCount = 0;
            var dailyMap = {};

            workers.forEach(function(w) {
              totalReqs += w.sum.requests;
              totalErrors += w.sum.errors;
              totalSubreqs += w.sum.subrequests;
              if (w.quantiles) {
                cpuP50Sum += w.quantiles.cpuTimeP50 || 0;
                cpuP99Sum += w.quantiles.cpuTimeP99 || 0;
                cpuCount++;
              }
              // 일자별 집계
              var day = w.dimensions.datetime.slice(0, 10);
              if (!dailyMap[day]) dailyMap[day] = { requests: 0, errors: 0 };
              dailyMap[day].requests += w.sum.requests;
              dailyMap[day].errors += w.sum.errors;
            });

            var avgP50 = cpuCount > 0 ? Math.round(cpuP50Sum / cpuCount * 100) / 100 : 0;
            var avgP99 = cpuCount > 0 ? Math.round(cpuP99Sum / cpuCount * 100) / 100 : 0;
            var errorRate = totalReqs > 0 ? (totalErrors / totalReqs * 100).toFixed(2) : '0';

            // D1 집계
            var d1Reads = 0, d1Writes = 0, d1RowsRead = 0, d1RowsWritten = 0;
            d1.forEach(function(r) {
              d1Reads += r.sum.readQueries || 0;
              d1Writes += r.sum.writeQueries || 0;
              d1RowsRead += r.sum.rowsRead || 0;
              d1RowsWritten += r.sum.rowsWritten || 0;
            });

            // HTML 렌더링
            var html = '';

            // Stats 카드
            html += '<div class="stat-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:24px">';
            html += '<div class="stat-card"><div class="label">요청 수 (7일)</div><div class="value">' + totalReqs.toLocaleString() + '</div></div>';
            html += '<div class="stat-card"><div class="label">에러율</div><div class="value" style="color:' + (parseFloat(errorRate) > 1 ? '#ef4444' : '#059669') + '">' + errorRate + '%</div></div>';
            html += '<div class="stat-card"><div class="label">CPU P50 / P99</div><div class="value" style="font-size:18px">' + avgP50 + ' / ' + avgP99 + 'ms</div></div>';
            html += '<div class="stat-card"><div class="label">서브리퀘스트</div><div class="value">' + totalSubreqs.toLocaleString() + '</div></div>';
            html += '</div>';

            // D1 카드
            html += '<div class="card" style="margin-bottom:16px"><h2>D1 Database (24시간)</h2>';
            html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;font-size:13px">';
            html += '<div><div style="color:#64748b;font-size:12px">읽기 쿼리</div><div style="font-size:20px;font-weight:700">' + d1Reads.toLocaleString() + '</div></div>';
            html += '<div><div style="color:#64748b;font-size:12px">쓰기 쿼리</div><div style="font-size:20px;font-weight:700">' + d1Writes.toLocaleString() + '</div></div>';
            html += '<div><div style="color:#64748b;font-size:12px">읽은 행</div><div style="font-size:20px;font-weight:700">' + d1RowsRead.toLocaleString() + '</div></div>';
            html += '<div><div style="color:#64748b;font-size:12px">쓴 행</div><div style="font-size:20px;font-weight:700">' + d1RowsWritten.toLocaleString() + '</div></div>';
            html += '</div></div>';

            // 일자별 요청 추이 차트
            var days = Object.keys(dailyMap).sort();
            if (days.length > 0) {
              var maxReqs = Math.max(1, Math.max.apply(null, days.map(function(d) { return dailyMap[d].requests; })));
              html += '<div class="card"><h2>일자별 요청 추이 (7일)</h2>';
              html += '<div style="height:180px;display:flex;align-items:flex-end;gap:6px;padding-top:16px">';
              days.forEach(function(d) {
                var r = dailyMap[d];
                var h = Math.max(4, Math.round((r.requests / maxReqs) * 150));
                var errH = r.errors > 0 ? Math.max(2, Math.round((r.errors / maxReqs) * 150)) : 0;
                html += '<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">';
                html += '<span style="font-size:10px;font-weight:600">' + r.requests.toLocaleString() + '</span>';
                html += '<div style="width:100%;max-width:36px;display:flex;flex-direction:column-reverse">';
                html += '<div style="width:100%;height:' + (h - errH) + 'px;background:#3b82f6;border-radius:4px 4px 0 0"></div>';
                if (errH > 0) html += '<div style="width:100%;height:' + errH + 'px;background:#ef4444"></div>';
                html += '</div>';
                html += '<span style="font-size:9px;color:#94a3b8">' + d.slice(5) + '</span>';
                html += '</div>';
              });
              html += '</div>';
              html += '<div style="display:flex;gap:16px;margin-top:8px;font-size:11px;color:#64748b">';
              html += '<div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;background:#3b82f6;border-radius:2px"></div>요청</div>';
              html += '<div style="display:flex;align-items:center;gap:4px"><div style="width:10px;height:10px;background:#ef4444;border-radius:2px"></div>에러</div>';
              html += '</div></div>';
            }

            container.innerHTML = html;
          } catch(e) {
            container.innerHTML = '<div class="card"><div style="text-align:center;padding:40px;color:#ef4444">오류: ' + e.message + '</div></div>';
          }
        }
        loadMonitoring();
      })();
    `}} />
  </Layout>
);

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
  <Layout title="사용자 관리" loggedIn isAdmin currentPath="/supadmin/owners">
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
        {search && <a href="/supadmin/owners" class="btn btn-outline btn-sm">초기화</a>}
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
            <a href={`/supadmin/owners?page=${pagination.page - 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/supadmin/owners?page=${pagination.page + 1}${search ? `&search=${encodeURIComponent(search)}` : ''}`} class="btn btn-outline btn-sm">다음</a>
          )}
        </div>
      )}
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      // 검색 폼
      document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        var q = document.getElementById('searchInput').value.trim();
        window.location.href = '/supadmin/owners' + (q ? '?search=' + encodeURIComponent(q) : '');
      });

      // 정지/활성화 버튼
      document.querySelectorAll('.owner-status-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var ownerId = this.dataset.ownerId;
          var action = this.dataset.action;
          var label = action === 'suspend' ? '정지' : '활성화';
          if (!confirm('이 사용자를 ' + label + '하시겠습니까?\\n' + (action === 'suspend' ? '해당 사용자의 모든 쇼핑몰이 비활성화됩니다.' : '해당 사용자의 모든 쇼핑몰이 복원됩니다.'))) return;
          var resp = await apiCall('PUT', '/api/supadmin/owners/' + ownerId + '/status', { action: action }, this);
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
  briefings?: Array<{ id: string; performance: string; strategy: string; actions: string; insight?: string; source: string; created_at: string }>;
}> = ({ shop, isCafe24, briefings }) => {
  const isPlus = shop.plan !== 'free';

  return (
    <Layout title="AI 보고서" loggedIn currentPath="/dashboard/ai-reports" isCafe24={isCafe24}>
      <h1 style="margin-bottom:4px">AI 보고서</h1>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">지난 주 성과를 분석하고 이번 주 전략을 AI가 생성합니다.</p>

      {!isPlus ? (
        <PlusLockOverlay feature="AI 보고서" />
      ) : (
        <div>
          {(!briefings || briefings.length === 0) ? (
            <div class="card" style="margin-bottom:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <div>
                  <h2 style="margin-bottom:4px">첫 브리핑 생성</h2>
                  <p style="font-size:13px;color:#94a3b8">아직 브리핑이 없습니다. 첫 브리핑을 생성해보세요.</p>
                </div>
                <button id="generateBriefingBtn" class="btn btn-primary btn-sm" style="white-space:nowrap;width:auto" data-shop-id={shop.shop_id}>브리핑 생성하기</button>
              </div>
              <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;font-size:13px;color:#0c4a6e;line-height:1.7">
                <strong style="display:block;margin-bottom:8px">AI 주간 브리핑 안내</strong>
                <p style="margin-bottom:8px">매주 <strong>월요일 오전 9시(KST)</strong>에 AI가 자동으로 주간 보고서를 생성합니다.</p>
                <p style="margin-bottom:8px"><strong>참고 자료:</strong> 쇼핑몰 정체성(업종·타겟·톤앤매너), 최근 7일 소셜 로그인/가입 통계, 프로바이더별 분포, 이전 보고서 내용, 현재 설정된 쿠폰·배너·팝업 문구</p>
                <p style="margin-bottom:8px"><strong>생성 내용:</strong> 지난주 성과 분석, 이번 주 전략 제안, 실행 가능한 액션 3가지, 미니배너·팝업·에스컬레이션용 추천 마케팅 문구 7종</p>
                <p><strong>활용 방법:</strong> 생성된 보고서를 읽고, AI 추천 문구는 각 설정 페이지(미니배너·팝업·에스컬레이션)에서 "AI 추천" 영역에 표시됩니다. 적용 버튼으로 바로 반영하거나, 기본 설정에서 "AI 추천 문구 자동 적용" 토글을 켜면 매주 자동으로 문구가 업데이트됩니다.</p>
              </div>
            </div>
          ) : (
            <div class="card" style="margin-bottom:16px">
              <div style="display:flex;align-items:center;gap:12px">
                <span style="font-size:20px">📅</span>
                <div>
                  <div style="font-size:13px;font-weight:600;color:#1e293b">브리핑 일정</div>
                  <div style="font-size:13px;color:#64748b">
                    다음 자동 브리핑: <strong style="color:#2563eb">{(() => {
                      const now = new Date();
                      const day = now.getUTCDay();
                      const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day;
                      const next = new Date(now.getTime() + daysUntilMonday * 24 * 60 * 60 * 1000);
                      return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-${String(next.getUTCDate()).padStart(2, '0')} (월) 09:00 KST`;
                    })()}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

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
            <div class="card" style="margin-bottom:16px">
              <h2 style="margin-bottom:12px;font-size:16px;color:#1e293b">AI 추천 액션</h2>
              <div id="briefingActions" style="font-size:14px;color:#374151;line-height:1.7"></div>
            </div>

            {/* AI 의견 (앱 범위 밖 참고사항) */}
            <div id="briefingInsightCard" class="card" style="display:none;border-left:3px solid #94a3b8;background:#f8fafc">
              <h2 style="margin-bottom:8px;font-size:14px;color:#64748b">💡 AI 참고 의견 <span style="font-weight:400;font-size:12px">(번개가입 범위 밖)</span></h2>
              <div id="briefingInsight" style="font-size:13px;color:#64748b;line-height:1.6;white-space:pre-wrap"></div>
            </div>
          </div>

          {/* 저장된 브리핑 이력 */}
          {briefings && briefings.length > 0 && (
            <div style="margin-top:24px">
              <h2 style="font-size:16px;color:#1e293b;margin-bottom:12px">이전 보고서</h2>
              {briefings.map((b, idx) => {
                let actions: string[] = [];
                try { actions = JSON.parse(b.actions); } catch { /* ignore */ }
                const isLatest = idx === 0;
                return (
                  <details class="card" style="margin-bottom:12px" open={isLatest}>
                    <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;list-style:none">
                      <div style="display:flex;align-items:center;gap:8px">
                        <span style="font-size:13px;color:#64748b">{b.created_at?.replace('T', ' ').slice(0, 16)} UTC</span>
                        <span class={`badge ${b.source === 'scheduled' ? 'badge-blue' : 'badge-gray'}`} style="font-size:11px">
                          {b.source === 'scheduled' ? '자동' : '수동'}
                        </span>
                        {isLatest && <span class="badge badge-green" style="font-size:11px">최신</span>}
                      </div>
                      <span style="font-size:12px;color:#94a3b8">▼ 펼치기</span>
                    </summary>
                    <div style="margin-top:12px">
                      <div style="font-size:14px;color:#374151;margin-bottom:10px;line-height:1.6">
                        <strong style="color:#1e293b">📊 성과:</strong> {b.performance}
                      </div>
                      {b.strategy && (
                        <div style="font-size:14px;color:#374151;margin-bottom:10px;line-height:1.6">
                          <strong style="color:#1e293b">🎯 전략:</strong> {b.strategy}
                        </div>
                      )}
                      {actions.length > 0 && (
                        <div style="font-size:14px;color:#374151;margin-bottom:10px;line-height:1.6">
                          <strong style="color:#1e293b">✅ 액션:</strong>
                          {actions.map((a, i) => (
                            <div style="margin-left:20px;margin-top:4px">{i + 1}. {a}</div>
                          ))}
                        </div>
                      )}
                      {b.insight && (
                        <div style="font-size:13px;color:#64748b;margin-top:8px;padding:8px 12px;background:#f8fafc;border-left:3px solid #94a3b8;border-radius:4px;line-height:1.5">
                          💡 <strong>AI 참고 의견:</strong> {b.insight}
                        </div>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          )}

          <script dangerouslySetInnerHTML={{__html: `
            (function() {
              var shopId = '${shop.shop_id}';
              var btn = document.getElementById('generateBriefingBtn');
              var loadingEl = document.getElementById('briefingLoading');
              var resultEl = document.getElementById('briefingResult');

              if (!btn) return; // 브리핑 있으면 버튼 없음
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

                    // AI 의견 표시
                    var insightCard = document.getElementById('briefingInsightCard');
                    var insightEl = document.getElementById('briefingInsight');
                    if (b.insight && b.insight.trim()) {
                      insightEl.textContent = b.insight;
                      insightCard.style.display = 'block';
                    } else {
                      insightCard.style.display = 'none';
                    }

                    loadingEl.style.display = 'none';
                    resultEl.style.display = 'block';
                    showToast('success', 'AI 브리핑이 생성되었습니다.');
                    // 2초 후 페이지 새로고침 (이력에 반영)
                    setTimeout(function() { location.reload(); }, 2000);
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

// ─── Plus Lock Overlay (프리뷰 + 블러) ─────────────────────

const plusFeatureInfo: Record<string, { desc: string; highlights: string[]; preview: string }> = {
  '미니배너': {
    desc: '쇼핑몰 로그인 페이지 상단에 가입 유도 배너를 표시합니다.',
    highlights: ['8가지 색상 프리셋', '텍스트/아이콘 자유 설정', '높이/여백/애니메이션 조절', 'AI 추천 문구 자동 적용'],
    preview: `<div style="display:grid;gap:8px">
      <div style="background:linear-gradient(90deg,#2563eb,#3b82f6);color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;text-align:center">⚡ 지금 가입하면 3,000원 할인 쿠폰!</div>
      <div style="background:#111827;color:#fff;padding:8px 16px;border-radius:6px;font-size:12px;text-align:center">🎁 회원 전용 특별 혜택을 받으세요</div>
      <div style="background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;padding:8px 16px;border-radius:6px;font-size:12px;text-align:center">✨ 첫 가입 무료배송 쿠폰 즉시 지급</div>
    </div>`,
  },
  '이탈 감지 팝업': {
    desc: '방문자가 페이지를 떠나려 할 때 가입 유도 팝업을 표시합니다.',
    highlights: ['PC: 마우스 이탈 감지', '모바일: 급격한 스크롤 감지', '8가지 색상 테마', '제목/본문/CTA 자유 설정', '쿨다운 시간 설정'],
    preview: `<div style="background:#fff;border:2px solid #e5e7eb;border-radius:12px;padding:20px;max-width:280px;margin:0 auto;text-align:center">
      <div style="font-size:24px;margin-bottom:8px">🎁</div>
      <div style="font-size:15px;font-weight:700;margin-bottom:6px">잠깐만요!</div>
      <div style="font-size:12px;color:#64748b;margin-bottom:12px">지금 가입하면 특별 혜택을 드려요!</div>
      <div style="background:#2563eb;color:#fff;padding:6px 16px;border-radius:6px;font-size:12px;display:inline-block">혜택 받고 가입하기</div>
    </div>`,
  },
  '에스컬레이션': {
    desc: '비로그인 재방문자의 방문 횟수에 따라 단계적으로 가입을 유도합니다.',
    highlights: ['2~3회 방문: 토스트 메시지', '4회 이상: 플로팅 배너', '방문 횟수 {n} 치환', '스타일/애니메이션/표시 시간 설정'],
    preview: `<div style="display:grid;gap:10px">
      <div style="background:#1e293b;color:#fff;padding:10px 16px;border-radius:20px;font-size:12px;max-width:260px">안녕하세요! 2번째 방문을 환영합니다 😊</div>
      <div style="background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;font-size:12px;display:flex;justify-content:space-between;align-items:center;max-width:300px">
        <span>회원가입하면 특별 혜택!</span>
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:4px;font-size:11px">바로 가입</span>
      </div>
    </div>`,
  },
  '카카오 채널': {
    desc: '신규 가입 완료 후 카카오 채널 추가를 유도합니다.',
    highlights: ['가입 완료 화면에 채널 추가 버튼', '카카오 채널 ID만 입력하면 설정 완료', '마케팅 메시지 발송 가능'],
    preview: `<div style="text-align:center">
      <div style="background:#FEE500;color:#191919;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;display:inline-flex;align-items:center;gap:6px">
        <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#191919" d="M12 3c5.8 0 10.5 3.66 10.5 8.17 0 4.52-4.7 8.18-10.5 8.18-.63 0-1.25-.04-1.85-.12l-3.69 2.52c-.23.16-.54-.04-.47-.31l.88-3.3C3.84 16.46 1.5 14.02 1.5 11.17 1.5 6.66 6.2 3 12 3z"/></svg>
        카카오 채널 추가하기
      </div>
    </div>`,
  },
  'AI 보고서': {
    desc: '매주 월요일 AI가 자동으로 성과 분석 리포트를 생성합니다.',
    highlights: ['지난주 성과 요약', '이번 주 전략 제안', '실행 가능한 액션 3가지', '추천 마케팅 문구 7종 자동 생성'],
    preview: `<div style="display:grid;gap:8px">
      <div style="background:#f8fafc;border-left:3px solid #2563eb;padding:10px 12px;border-radius:4px;font-size:12px"><strong>📊 성과:</strong> 카카오 가입이 전주 대비 23% 증가했습니다</div>
      <div style="background:#f8fafc;border-left:3px solid #059669;padding:10px 12px;border-radius:4px;font-size:12px"><strong>🎯 전략:</strong> 네이버 프로바이더 추가를 권장합니다</div>
      <div style="background:#f8fafc;border-left:3px solid #f59e0b;padding:10px 12px;border-radius:4px;font-size:12px"><strong>✅ 액션:</strong> 미니배너 문구를 시즌 프로모션으로 변경</div>
    </div>`,
  },
  'AI 설정': {
    desc: 'AI가 쇼핑몰을 분석하여 맞춤형 마케팅 전략을 제공합니다.',
    highlights: ['쇼핑몰 정체성 자동 분석 (업종/타겟/톤)', '맞춤 카피 생성', '에스컬레이션 단계별 메시지 자동 생성'],
    preview: `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;font-size:12px;display:grid;gap:6px">
      <div><strong>업종:</strong> 패션/의류</div>
      <div><strong>타겟:</strong> 20-30대 여성</div>
      <div><strong>톤앤매너:</strong> 트렌디하고 캐주얼한</div>
      <div><strong>키워드:</strong> 스트리트패션, 캐주얼, 데일리룩</div>
    </div>`,
  },
};

const PlusLockOverlay: FC<{ feature: string }> = ({ feature }) => {
  const info = plusFeatureInfo[feature] || { desc: '이 기능은 Plus 플랜에서 사용할 수 있습니다.', highlights: [], preview: '' };

  return (
    <div style="position:relative">
      {/* 프리뷰 영역 (약한 블러) */}
      <div style="filter:blur(1.5px);opacity:0.75;pointer-events:none;user-select:none">
        <div class="card">
          <h2 style="margin-bottom:8px">{feature} 설정</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:16px">{info.desc}</p>
          {info.preview && <div dangerouslySetInnerHTML={{ __html: info.preview }} />}
          <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px">
              <div style="height:8px;background:#e2e8f0;border-radius:4px;width:60%;margin-bottom:8px"></div>
              <div style="height:32px;background:#f1f5f9;border-radius:6px"></div>
            </div>
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:12px">
              <div style="height:8px;background:#e2e8f0;border-radius:4px;width:40%;margin-bottom:8px"></div>
              <div style="height:32px;background:#f1f5f9;border-radius:6px"></div>
            </div>
          </div>
        </div>
      </div>

      {/* 오버레이 카드 (하단 배치) */}
      <div style="position:absolute;left:0;right:0;bottom:24px;display:flex;justify-content:center;z-index:10">
        <div style="background:rgba(255,255,255,0.97);border:1px solid #e2e8f0;border-radius:12px;padding:20px 28px;max-width:340px;text-align:center;box-shadow:0 8px 32px rgba(0,0,0,0.1);backdrop-filter:blur(8px)">
          <div style="font-size:28px;margin-bottom:12px">⚡</div>
          <h3 style="font-size:16px;font-weight:700;color:#1e293b;margin-bottom:6px">{feature}</h3>
          <p style="font-size:13px;color:#64748b;margin-bottom:16px;line-height:1.6">{info.desc}</p>
          {info.highlights.length > 0 && (
            <div style="text-align:left;margin-bottom:16px">
              {info.highlights.map(h => (
                <div style="font-size:12px;color:#475569;padding:3px 0;display:flex;align-items:center;gap:6px">
                  <span style="color:#2563eb;font-size:10px">●</span> {h}
                </div>
              ))}
            </div>
          )}
          <a href="/dashboard/billing" class="btn btn-primary" style="display:inline-flex;width:auto;padding:10px 24px">
            Plus 시작하기 — 월 ₩6,900
          </a>
          <p style="font-size:11px;color:#94a3b8;margin-top:8px">연간 결제 시 ₩79,000 (약 5% 할인)</p>
        </div>
      </div>
    </div>
  );
};

// ─── General Settings Page ───────────────────────────────────

type ShopSummary = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  plan: string;
  sso_configured: number;
  created_at: string;
};

type CouponConfigUI = {
  shipping: { enabled: boolean; expire_days: number };
  amount: { enabled: boolean; expire_days: number; discount_amount: number; min_order: number };
  rate: { enabled: boolean; expire_days: number; discount_rate: number; min_order: number };
  cafe24_coupons?: {
    shipping_coupon_no?: number;
    amount_coupon_no?: number;
    rate_coupon_no?: number;
  };
};

const DEFAULT_COUPON_CONFIG_UI: CouponConfigUI = {
  shipping: { enabled: false, expire_days: 30 },
  amount: { enabled: true, expire_days: 30, discount_amount: 3000, min_order: 0 },
  rate: { enabled: false, expire_days: 7, discount_rate: 10, min_order: 0 },
};

export const GeneralSettingsPage: FC<{
  email: string;
  name: string;
  shop: ShopSummary | null;
  couponConfig?: CouponConfigUI | null;
  isCafe24?: boolean;
}> = ({ email, name, shop, couponConfig, isCafe24 }) => (
  <Layout title="기본 설정" loggedIn currentPath="/dashboard/settings/general" isCafe24={isCafe24}>
    <h1>기본 설정</h1>

    {shop && (<>
      <div class="card" id="couponSettingsCard">
        {/* 회원 가입 쿠폰 설정 */}
        <div style="max-width:600px">
          <h2>회원 가입 쿠폰 설정</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:4px">
            설정을 저장하면 카페24에 쿠폰이 자동 생성되고, 회원가입 시 자동 발급됩니다.
          </p>
          {shop.plan === 'free' && (
            <p style="font-size:12px;color:#f59e0b;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:12px">
              무료 플랜: 무료배송 또는 정액할인 중 <strong>1종만</strong> 기본값으로 발급 가능합니다.
              <a href="/dashboard/billing" style="color:#2563eb;font-weight:600;margin-left:4px">Plus 업그레이드 →</a>
            </p>
          )}

          {/* 무료배송 쿠폰 카드 */}
          <div id="couponCard_shipping" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <label class="toggle" style="flex-shrink:0">
                  <input type="checkbox" id="coupon_shipping_enabled" />
                  <span class="toggle-slider"></span>
                </label>
                <strong style="font-size:14px">무료배송 쿠폰</strong>
              </div>
              <span id="coupon_shipping_no_badge" style="display:none;font-size:11px;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:2px 8px"></span>
            </div>
            <div id="couponDetail_shipping" style="display:grid;gap:10px">
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">사용기간</label>
                <select id="coupon_shipping_expire" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="3">3일</option>
                  <option value="7">7일</option>
                  <option value="20">20일</option>
                  <option value="30" selected>30일</option>
                </select>
              </div>
            </div>
          </div>

          {/* 정액할인 쿠폰 카드 */}
          <div id="couponCard_amount" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <label class="toggle" style="flex-shrink:0">
                  <input type="checkbox" id="coupon_amount_enabled" />
                  <span class="toggle-slider"></span>
                </label>
                <strong style="font-size:14px">정액할인 쿠폰</strong>
              </div>
              <span id="coupon_amount_no_badge" style="display:none;font-size:11px;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:2px 8px"></span>
            </div>
            <div id="couponDetail_amount" style="display:grid;gap:10px">
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">할인금액</label>
                <select id="coupon_amount_preset" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="1000">1,000원</option>
                  <option value="2000">2,000원</option>
                  <option value="3000" selected>3,000원</option>
                  <option value="5000">5,000원</option>
                  <option value="10000">10,000원</option>
                  <option value="custom">직접 입력</option>
                </select>
                <input type="number" id="coupon_amount_custom" placeholder="금액 입력" min="100" style="display:none;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:110px" />
                <span style="font-size:13px;color:#64748b">원</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">사용기간</label>
                <select id="coupon_amount_expire" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="3">3일</option>
                  <option value="7">7일</option>
                  <option value="10">10일</option>
                  <option value="20">20일</option>
                  <option value="30" selected>30일</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">최소구매</label>
                <select id="coupon_amount_minorder_preset" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="0" selected>없음</option>
                  <option value="10000">10,000원</option>
                  <option value="30000">30,000원</option>
                  <option value="50000">50,000원</option>
                  <option value="custom">직접 입력</option>
                </select>
                <input type="number" id="coupon_amount_minorder_custom" placeholder="금액 입력" min="0" style="display:none;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:110px" />
                <span id="coupon_amount_minorder_unit" style="font-size:13px;color:#64748b;display:none">원 이상</span>
              </div>
            </div>
          </div>

          {/* 정률할인 쿠폰 카드 */}
          <div id="couponCard_rate" style={`border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:16px${shop.plan === 'free' ? ';opacity:0.5;pointer-events:none' : ''}`}>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <label class="toggle" style="flex-shrink:0">
                  <input type="checkbox" id="coupon_rate_enabled" />
                  <span class="toggle-slider"></span>
                </label>
                <strong style="font-size:14px">정률할인 쿠폰</strong>
                {shop.plan === 'free' && <span class="badge badge-gray" style="margin-left:4px">Plus 전용</span>}
              </div>
              <span id="coupon_rate_no_badge" style="display:none;font-size:11px;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:2px 8px"></span>
            </div>
            <div id="couponDetail_rate" style="display:grid;gap:10px">
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">할인율</label>
                <select id="coupon_rate_preset" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="5">5%</option>
                  <option value="7">7%</option>
                  <option value="10" selected>10%</option>
                  <option value="15">15%</option>
                  <option value="20">20%</option>
                  <option value="custom">직접 입력</option>
                </select>
                <input type="number" id="coupon_rate_custom" placeholder="숫자 입력" min="1" max="100" style="display:none;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:90px" />
                <span style="font-size:13px;color:#64748b">%</span>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">사용기간</label>
                <select id="coupon_rate_expire" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="3">3일</option>
                  <option value="7" selected>7일</option>
                  <option value="10">10일</option>
                  <option value="20">20일</option>
                  <option value="30">30일</option>
                </select>
              </div>
              <div style="display:flex;align-items:center;gap:12px">
                <label style="font-size:13px;color:#475569;min-width:64px">최소구매</label>
                <select id="coupon_rate_minorder_preset" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px">
                  <option value="0" selected>없음</option>
                  <option value="10000">10,000원</option>
                  <option value="30000">30,000원</option>
                  <option value="50000">50,000원</option>
                  <option value="custom">직접 입력</option>
                </select>
                <input type="number" id="coupon_rate_minorder_custom" placeholder="금액 입력" min="0" style="display:none;padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:110px" />
                <span id="coupon_rate_minorder_unit" style="font-size:13px;color:#64748b;display:none">원 이상</span>
              </div>
            </div>
          </div>

          <button id="saveCouponConfigBtn" class="btn btn-primary btn-sm">쿠폰 설정 저장</button>
        </div>
      </div>

      <div class="card">
        <h2>쇼핑몰 정체성 (AI 분석)</h2>
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:16px;font-size:13px;color:#1e40af">
          <strong>AI가 이 정보를 활용합니다</strong> — 쇼핑몰 정체성과 혜택 정보를 기반으로 AI가 <strong>미니배너, 이탈 감지 팝업, 재방문 에스컬레이션</strong> 등의 가입 유도 카피를 자동 생성하고, <strong>주간 AI 브리핑</strong>에서 맞춤 전략을 제안합니다.
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
          <div style="margin-top:12px;display:flex;align-items:center;gap:8px">
            <label class="toggle" style={`flex-shrink:0${shop.plan === 'free' ? ';opacity:0.5;cursor:not-allowed' : ''}`}>
              <input type="checkbox" id="autoApplyAiCopy" disabled={shop.plan === 'free'} />
              <span class="toggle-slider"></span>
            </label>
            <label for="autoApplyAiCopy" style={`font-size:13px;color:#475569;${shop.plan === 'free' ? 'opacity:0.5;cursor:not-allowed' : 'cursor:pointer'}`}>AI 추천 문구 자동 적용</label>
            {shop.plan === 'free' && <span class="badge badge-gray" style="margin-left:4px">Plus 전용</span>}
            <span style="font-size:11px;color:#94a3b8">AI 보고서 생성 시 미니배너·팝업·에스컬레이션 문구를 자동으로 업데이트합니다</span>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:16px">
          <button id="analyzeBtn" class="btn btn-primary btn-sm" data-shop-id={shop.shop_id} style="display:none">AI 자동 분석하기</button>
          <button id="editIdentityBtn" class="btn btn-outline btn-sm" style="display:none">수정</button>
          <button id="saveIdentityBtn" class="btn btn-primary btn-sm" style="display:none">저장</button>
          <button id="cancelEditBtn" class="btn btn-outline btn-sm" style="display:none">취소</button>
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

      </div>

      <div style="display:none">
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

            var autoApplyCheckbox = document.getElementById('autoApplyAiCopy');

            function showReadonly(id) {
              roFields.industry.textContent = id.industry || '-';
              roFields.target.textContent = id.target || id.target_audience || '-';
              roFields.tone.textContent = id.tone || '-';
              roFields.summary.textContent = id.summary || '-';
              roFields.keywords.textContent = Array.isArray(id.keywords) ? id.keywords.join(', ') : (id.keywords || '-');
              if (autoApplyCheckbox) autoApplyCheckbox.checked = !!id.auto_apply_ai_copy;
              readonlyEl.style.display = 'block';
              editForm.style.display = 'none';
              editBtn.style.display = 'inline-flex';
              saveBtn.style.display = 'none';
              cancelBtn.style.display = 'none';
              analyzeBtn.textContent = 'AI 다시 분석하기';
            }

            if (autoApplyCheckbox) {
              autoApplyCheckbox.addEventListener('change', async function() {
                if (this.disabled) { this.checked = false; return; }
                var currentIdentity = {
                  industry: roFields.industry.textContent !== '-' ? roFields.industry.textContent : '',
                  target: roFields.target.textContent !== '-' ? roFields.target.textContent : '',
                  tone: roFields.tone.textContent !== '-' ? roFields.tone.textContent : '',
                  summary: roFields.summary.textContent !== '-' ? roFields.summary.textContent : '',
                  keywords: roFields.keywords.textContent !== '-' ? roFields.keywords.textContent.split(', ').filter(Boolean) : [],
                  auto_apply_ai_copy: this.checked,
                };
                try {
                  await apiCall('PUT', '/api/dashboard/shops/' + shopId, { shop_identity: JSON.stringify(currentIdentity) });
                } catch(e) {}
              });
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

            // 기존 데이터 로드 (없으면 자동 분석 트리거)
            fetch('/api/ai/identity?shop_id=' + shopId, { credentials: 'same-origin' })
              .then(function(r) { return r.json(); })
              .then(function(d) {
                if (d.identity && d.identity.industry) {
                  showReadonly(d.identity);
                } else {
                  // shop_identity가 비어있으면 자동으로 AI 분석 시작
                  analyzeBtn.click();
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
                auto_apply_ai_copy: autoApplyCheckbox ? autoApplyCheckbox.checked : false,
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

            // ─── 쿠폰 설정 UI ────────────────────────────────────
            var SHOP_PLAN = '${shop?.plan ?? 'free'}';
            var IS_FREE = SHOP_PLAN === 'free';
            var INITIAL_COUPON_CONFIG = ${JSON.stringify(couponConfig ?? DEFAULT_COUPON_CONFIG_UI)};

            // 헬퍼: 선택 박스 값 설정 (프리셋에 없으면 custom 전환)
            function setSelectOrCustom(selectId, customId, value, toStr) {
              var sel = document.getElementById(selectId);
              var cust = document.getElementById(customId);
              var strVal = String(value);
              var found = false;
              for (var i = 0; i < sel.options.length; i++) {
                if (sel.options[i].value === strVal) { sel.value = strVal; found = true; break; }
              }
              if (!found) {
                sel.value = 'custom';
                cust.value = strVal;
                cust.style.display = 'inline-block';
              }
            }

            // 헬퍼: select change 이벤트로 custom 입력 토글
            function bindCustomToggle(selectId, customId, unitId) {
              var sel = document.getElementById(selectId);
              var cust = document.getElementById(customId);
              sel.addEventListener('change', function() {
                if (sel.value === 'custom') {
                  cust.style.display = 'inline-block';
                  cust.focus();
                } else {
                  cust.style.display = 'none';
                }
                if (unitId) {
                  document.getElementById(unitId).style.display = (sel.value !== '0') ? 'inline' : 'none';
                }
              });
            }

            // 헬퍼: select 또는 custom input에서 값 읽기
            function getSelectOrCustom(selectId, customId) {
              var sel = document.getElementById(selectId);
              if (sel.value === 'custom') {
                return parseInt(document.getElementById(customId).value, 10) || 0;
              }
              return parseInt(sel.value, 10) || 0;
            }

            // 토글 ON/OFF에 따라 세부 설정 영역 활성화/비활성화
            function bindToggleDetail(checkboxId, detailId) {
              var cb = document.getElementById(checkboxId);
              var detail = document.getElementById(detailId);
              function applyState() {
                var inputs = detail.querySelectorAll('select, input');
                // 무료 플랜: 세부 설정은 항상 disabled (토글 ON/OFF 무관)
                if (IS_FREE) {
                  inputs.forEach(function(el) { el.disabled = true; });
                  detail.style.opacity = cb.checked ? '0.6' : '0.4';
                } else {
                  inputs.forEach(function(el) { el.disabled = !cb.checked; });
                  detail.style.opacity = cb.checked ? '1' : '0.4';
                }
              }
              cb.addEventListener('change', applyState);
              applyState();
            }

            // 초기 값 세팅
            function initCouponUI(cfg) {
              // 무료배송
              document.getElementById('coupon_shipping_enabled').checked = cfg.shipping.enabled;
              document.getElementById('coupon_shipping_expire').value = String(cfg.shipping.expire_days);

              // 정액할인
              document.getElementById('coupon_amount_enabled').checked = cfg.amount.enabled;
              document.getElementById('coupon_amount_expire').value = String(cfg.amount.expire_days);
              setSelectOrCustom('coupon_amount_preset', 'coupon_amount_custom', cfg.amount.discount_amount);
              var amtMinSel = document.getElementById('coupon_amount_minorder_preset');
              var amtMinCust = document.getElementById('coupon_amount_minorder_custom');
              var amtMinUnit = document.getElementById('coupon_amount_minorder_unit');
              if (cfg.amount.min_order > 0) {
                setSelectOrCustom('coupon_amount_minorder_preset', 'coupon_amount_minorder_custom', cfg.amount.min_order);
                amtMinUnit.style.display = 'inline';
              }

              // 정률할인
              document.getElementById('coupon_rate_enabled').checked = cfg.rate.enabled;
              document.getElementById('coupon_rate_expire').value = String(cfg.rate.expire_days);
              setSelectOrCustom('coupon_rate_preset', 'coupon_rate_custom', cfg.rate.discount_rate);
              if (cfg.rate.min_order > 0) {
                setSelectOrCustom('coupon_rate_minorder_preset', 'coupon_rate_minorder_custom', cfg.rate.min_order);
                document.getElementById('coupon_rate_minorder_unit').style.display = 'inline';
              }

              // 카페24 쿠폰 번호 배지
              var c24 = cfg.cafe24_coupons || {};
              function showBadge(badgeId, couponNo) {
                var badge = document.getElementById(badgeId);
                if (couponNo) { badge.textContent = '쿠폰 #' + couponNo; badge.style.display = 'inline'; }
                else { badge.style.display = 'none'; }
              }
              showBadge('coupon_shipping_no_badge', c24.shipping_coupon_no);
              showBadge('coupon_amount_no_badge', c24.amount_coupon_no);
              showBadge('coupon_rate_no_badge', c24.rate_coupon_no);

              // 토글 바인딩
              bindToggleDetail('coupon_shipping_enabled', 'couponDetail_shipping');
              bindToggleDetail('coupon_amount_enabled', 'couponDetail_amount');
              bindToggleDetail('coupon_rate_enabled', 'couponDetail_rate');

              // 무료 플랜: 세부 설정 disabled + 1종만 허용
              if (IS_FREE) {
                // 세부 설정(금액/기간/최소구매) 모두 disabled
                document.querySelectorAll('#couponDetail_shipping select, #couponDetail_amount select, #couponDetail_amount input, #couponDetail_rate select, #couponDetail_rate input').forEach(function(el) { el.disabled = true; });
                // 정률할인 강제 OFF
                document.getElementById('coupon_rate_enabled').checked = false;
                document.getElementById('coupon_rate_enabled').disabled = true;
                applyFreeToggleConstraint();
              }
            }

            // 무료 플랜: 1종만 허용 (무료배송 ↔ 정액할인 상호 배타)
            function applyFreeToggleConstraint() {
              if (!IS_FREE) return;
              var shipCb = document.getElementById('coupon_shipping_enabled');
              var amtCb = document.getElementById('coupon_amount_enabled');
              // 둘 다 켜져있으면 나중에 켠 쪽만 유지 (초기 로드 시 shipping 우선)
              if (shipCb.checked && amtCb.checked) {
                amtCb.checked = false;
              }
              bindToggleDetail('coupon_shipping_enabled', 'couponDetail_shipping');
              bindToggleDetail('coupon_amount_enabled', 'couponDetail_amount');
            }

            if (IS_FREE) {
              document.getElementById('coupon_shipping_enabled').addEventListener('change', function() {
                if (this.checked) {
                  document.getElementById('coupon_amount_enabled').checked = false;
                  bindToggleDetail('coupon_amount_enabled', 'couponDetail_amount');
                }
              });
              document.getElementById('coupon_amount_enabled').addEventListener('change', function() {
                if (this.checked) {
                  document.getElementById('coupon_shipping_enabled').checked = false;
                  bindToggleDetail('coupon_shipping_enabled', 'couponDetail_shipping');
                }
              });
            }

            bindCustomToggle('coupon_amount_preset', 'coupon_amount_custom', null);
            bindCustomToggle('coupon_amount_minorder_preset', 'coupon_amount_minorder_custom', 'coupon_amount_minorder_unit');
            bindCustomToggle('coupon_rate_preset', 'coupon_rate_custom', null);
            bindCustomToggle('coupon_rate_minorder_preset', 'coupon_rate_minorder_custom', 'coupon_rate_minorder_unit');

            // 최소구매 unit span 초기 표시
            document.getElementById('coupon_amount_minorder_preset').addEventListener('change', function() {
              document.getElementById('coupon_amount_minorder_unit').style.display = (this.value !== '0') ? 'inline' : 'none';
            });
            document.getElementById('coupon_rate_minorder_preset').addEventListener('change', function() {
              document.getElementById('coupon_rate_minorder_unit').style.display = (this.value !== '0') ? 'inline' : 'none';
            });

            initCouponUI(INITIAL_COUPON_CONFIG);

            // 쿠폰 설정 저장
            document.getElementById('saveCouponConfigBtn').addEventListener('click', async function() {
              var btn = this;
              btn.disabled = true; btn.textContent = '저장 중...';

              var payload = {
                shipping: {
                  enabled: document.getElementById('coupon_shipping_enabled').checked,
                  expire_days: parseInt(document.getElementById('coupon_shipping_expire').value, 10),
                },
                amount: {
                  enabled: document.getElementById('coupon_amount_enabled').checked,
                  expire_days: parseInt(document.getElementById('coupon_amount_expire').value, 10),
                  discount_amount: getSelectOrCustom('coupon_amount_preset', 'coupon_amount_custom'),
                  min_order: getSelectOrCustom('coupon_amount_minorder_preset', 'coupon_amount_minorder_custom'),
                },
                rate: {
                  enabled: document.getElementById('coupon_rate_enabled').checked,
                  expire_days: parseInt(document.getElementById('coupon_rate_expire').value, 10),
                  discount_rate: getSelectOrCustom('coupon_rate_preset', 'coupon_rate_custom'),
                  min_order: getSelectOrCustom('coupon_rate_minorder_preset', 'coupon_rate_minorder_custom'),
                },
              };

              try {
                var resp = await apiCall('PUT', '/api/dashboard/shops/' + shopId + '/coupon', payload);
                if (resp.ok) {
                  var data = await resp.json();
                  if (data.coupon_config) initCouponUI(data.coupon_config);
                  showToast('success', '쿠폰 설정이 저장되었습니다. 카페24 쿠폰이 백그라운드에서 생성됩니다.');
                } else {
                  var errData = await resp.json().catch(function() { return {}; });
                  showToast('error', errData.message || '저장 중 오류가 발생했습니다.');
                }
              } catch(e) { showToast('error', '오류: ' + e.message); }
              finally { btn.disabled = false; btn.textContent = '쿠폰 설정 저장'; }
            });
          })();
        `}} />
      </div>

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
    </>)}

    {!shop && (
      <div class="alert alert-info" style="margin-bottom:16px">
        아직 연결된 쇼핑몰이 없습니다. 카페24 앱스토어에서 번개가입을 설치하면 자동으로 연결됩니다.
      </div>
    )}

  </Layout>
);

// ─── Login Design Page (삭제됨 — ProvidersPage에 통합) ───────

// ─── Coupon Status Page ──────────────────────────────────────

export const CouponSettingsPage: FC<{
  shop: { shop_id: string; shop_name: string; plan: string };
  couponConfig: CouponConfigUI | null;
  isCafe24?: boolean;
}> = ({ shop, couponConfig, isCafe24 }) => {
  const cfg = couponConfig ?? DEFAULT_COUPON_CONFIG_UI;
  const cafe24 = cfg.cafe24_coupons ?? {};

  type CouponRow = {
    label: string;
    enabled: boolean;
    detail: string;
    expire_days: number;
    coupon_no?: number;
  };

  const rows: CouponRow[] = [
    {
      label: '무료배송 쿠폰',
      enabled: cfg.shipping.enabled,
      detail: '무료배송',
      expire_days: cfg.shipping.expire_days,
      coupon_no: cafe24.shipping_coupon_no,
    },
    {
      label: '정액할인 쿠폰',
      enabled: cfg.amount.enabled,
      detail: `${cfg.amount.discount_amount.toLocaleString()}원 할인${cfg.amount.min_order > 0 ? ` (${cfg.amount.min_order.toLocaleString()}원 이상)` : ''}`,
      expire_days: cfg.amount.expire_days,
      coupon_no: cafe24.amount_coupon_no,
    },
    {
      label: '정률할인 쿠폰',
      enabled: cfg.rate.enabled,
      detail: `${cfg.rate.discount_rate}% 할인${cfg.rate.min_order > 0 ? ` (${cfg.rate.min_order.toLocaleString()}원 이상)` : ''}`,
      expire_days: cfg.rate.expire_days,
      coupon_no: cafe24.rate_coupon_no,
    },
  ];

  return (
    <Layout title="쿠폰 현황" loggedIn currentPath="/dashboard/settings/coupon" isCafe24={isCafe24}>
      <h1>쿠폰 현황</h1>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">가입 시 자동 발급되는 쿠폰 설정 및 현황입니다.</p>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin-bottom:0">쿠폰 설정 현황</h2>
          <a href="/dashboard/settings/general#couponSettingsCard" class="btn btn-outline btn-sm">설정 변경 →</a>
        </div>

        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#1e40af">
          기본 설정에서 쿠폰 3종을 개별 토글/세부설정할 수 있습니다. 저장 시 카페24에 쿠폰이 자동 생성되고 가입 시 자동 발급됩니다.
          <a href="/dashboard/settings/general" style="margin-left:8px;font-weight:600;color:#2563eb">기본 설정으로 이동 →</a>
        </div>

        <div style="overflow-x:auto">
          <table>
            <thead>
              <tr>
                <th>쿠폰 종류</th>
                <th style="width:80px">상태</th>
                <th>할인 내용</th>
                <th style="width:100px">유효기간</th>
                <th style="width:110px">카페24 쿠폰 #</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr>
                  <td style="font-size:13px;font-weight:500">{row.label}</td>
                  <td>
                    {row.enabled
                      ? <span class="badge badge-green">활성</span>
                      : <span class="badge badge-gray">비활성</span>}
                  </td>
                  <td style="font-size:13px">{row.enabled ? row.detail : '-'}</td>
                  <td style="font-size:13px">{row.enabled ? `발급일 +${row.expire_days}일` : '-'}</td>
                  <td style="font-size:12px">
                    {row.coupon_no
                      ? <code style="color:#059669">#{row.coupon_no}</code>
                      : <span style="color:#94a3b8">{row.enabled ? '생성 대기' : '-'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 발급 히스토리 */}
      <div class="card">
        <h2>발급 히스토리</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:16px">회원가입 시 자동 발급된 쿠폰 내역입니다.</p>

        <div id="couponIssuesTable">
          <div style="text-align:center;padding:20px;color:#94a3b8">
            <p>로딩 중...</p>
          </div>
        </div>

        <div id="couponIssuesPagination" style="display:flex;justify-content:center;gap:8px;margin-top:12px"></div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          var shopId = '${shop.shop_id}';
          var currentPage = 1;

          function couponTypeLabel(type) {
            if (type === 'shipping') return '무료배송';
            if (type === 'amount') return '정액할인';
            if (type === 'rate') return '정률할인';
            return type;
          }

          function formatDate(iso) {
            if (!iso) return '-';
            var d = new Date(iso + 'Z');
            var offset = 9 * 60;
            var kst = new Date(d.getTime() + offset * 60 * 1000);
            var y = kst.getUTCFullYear();
            var m = String(kst.getUTCMonth()+1).padStart(2,'0');
            var day = String(kst.getUTCDate()).padStart(2,'0');
            var h = String(kst.getUTCHours()).padStart(2,'0');
            var min = String(kst.getUTCMinutes()).padStart(2,'0');
            return y + '-' + m + '-' + day + ' ' + h + ':' + min;
          }

          async function loadIssues(page) {
            currentPage = page;
            var container = document.getElementById('couponIssuesTable');
            var pagination = document.getElementById('couponIssuesPagination');

            try {
              var resp = await fetch('/api/dashboard/shops/' + shopId + '/coupon-issues?page=' + page, { credentials: 'same-origin' });
              var data = await resp.json();

              if (!data.issues || data.issues.length === 0) {
                container.innerHTML = '<div style="text-align:center;padding:30px;color:#94a3b8"><p style="font-size:14px;margin-bottom:4px">아직 발급된 쿠폰이 없습니다.</p><p style="font-size:12px">회원이 가입하면 설정된 쿠폰이 자동 발급되고 여기에 표시됩니다.</p></div>';
                pagination.innerHTML = '';
                return;
              }

              var html = '<div style="overflow-x:auto"><table><thead><tr>';
              html += '<th style="width:50px">번호</th>';
              html += '<th>회원 ID</th>';
              html += '<th style="width:90px">쿠폰 종류</th>';
              html += '<th style="width:90px">쿠폰 번호</th>';
              html += '<th style="width:155px">발급일시 (KST)</th>';
              html += '</tr></thead><tbody>';

              data.issues.forEach(function(issue) {
                html += '<tr>';
                html += '<td style="font-size:12px;color:#94a3b8">' + issue.id + '</td>';
                html += '<td style="font-size:13px"><code>' + issue.member_id + '</code></td>';
                html += '<td style="font-size:13px">' + couponTypeLabel(issue.coupon_type) + '</td>';
                html += '<td style="font-size:12px"><code>' + issue.coupon_no + '</code></td>';
                html += '<td style="font-size:12px;color:#64748b">' + formatDate(issue.issued_at) + '</td>';
                html += '</tr>';
              });

              html += '</tbody></table></div>';
              container.innerHTML = html;

              var totalPages = Math.ceil(data.total / data.limit);
              var pagHtml = '';
              if (totalPages > 1) {
                if (currentPage > 1) pagHtml += '<button onclick="window.__loadCouponIssues(' + (currentPage-1) + ')" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;cursor:pointer;background:#fff">이전</button>';
                pagHtml += '<span style="font-size:12px;color:#64748b;padding:4px 8px">' + currentPage + ' / ' + totalPages + '</span>';
                if (currentPage < totalPages) pagHtml += '<button onclick="window.__loadCouponIssues(' + (currentPage+1) + ')" style="padding:4px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:12px;cursor:pointer;background:#fff">다음</button>';
              }
              pagination.innerHTML = pagHtml;

            } catch(e) {
              container.innerHTML = '<div style="text-align:center;padding:20px;color:#ef4444">데이터를 불러오지 못했습니다.</div>';
            }
          }

          window.__loadCouponIssues = loadIssues;
          loadIssues(1);
        })();
      `}} />
    </Layout>
  );
};

// ─── Banner Settings Page [Plus] ────────────────────────────

export const BannerSettingsPage: FC<{
  shop: { plan: string; shop_name?: string | null } | null;
  shopId?: string;
  bannerConfig?: { preset: number; text: string; borderRadius: number; icon: string; position: string; fullWidth?: boolean; paddingX?: number; height?: number; animation?: string } | null;
  isCafe24?: boolean;
}> = ({ shop, shopId, bannerConfig, isCafe24 }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  const bc = bannerConfig || { preset: 0, text: '', borderRadius: 10, icon: '⚡', position: 'floating', fullWidth: true, paddingX: 24, height: 44 };
  const presetStyles = [
    { bg: '#ffffff', color: '#111827', border: '1px solid #d1d5db' },
    { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' },
    { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
    { bg: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
    { bg: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
    { bg: 'linear-gradient(135deg, #2563eb 0%, #ec4899 100%)', color: '#fff', border: 'none' },
    { bg: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)', color: '#fff', border: 'none' },
    { bg: '#111827', color: '#fff', border: 'none' },
  ];
  const ps = presetStyles[bc.preset] || presetStyles[0];
  return (
    <Layout title="미니배너" loggedIn currentPath="/dashboard/settings/banner" isCafe24={isCafe24}>
      <h1>미니배너</h1>
      {!isPlus
        ? <PlusLockOverlay feature="미니배너" />
        : (
          <div>
            <div class="card">
              <h2>미니배너 설정</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:20px">로그인 페이지 상단에 회원가입 유도 배너가 표시됩니다.</p>
              <div id="bannerSaveMsg" style="display:none;padding:10px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:500"></div>
              {/* 미리보기 영역 (상단) */}
              {/* 미리보기 (모의 네비게이션 + 배너) */}
              <div style="margin-bottom:20px">
                <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">미리보기</p>
                <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;overflow:hidden">
                  {/* 모의 top_nav_box */}
                  <div style="background:#fff;border-bottom:1px solid #e5e7eb;padding:12px 16px;display:flex;align-items:center;justify-content:space-between">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                    <span style="font-size:16px;font-weight:700;color:#111">{shop?.shop_name || '쇼핑몰'}</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  {/* 배너 미리보기 */}
                  <div style="text-align:center">
                    <div
                      id="bannerPreview"
                      style={`${(bc.fullWidth !== false) ? 'width:100%' : 'width:fit-content;padding:0 ' + (bc.paddingX || 24) + 'px'};height:30px;margin:0 auto;background:${ps.bg};border:${ps.border};border-radius:${bc.borderRadius}px;opacity:${(bc.opacity != null ? bc.opacity : 90) / 100};display:flex;align-items:center;justify-content:center;text-align:center;cursor:pointer`}
                    >
                      <span style={`color:${ps.color};font-size:14px;font-weight:${bc.bold ? '600' : '400'};font-style:${bc.italic ? 'italic' : 'normal'}`} id="bannerPreviewText">
                        <span id="bannerPreviewIcon">{bc.icon || '⚡'}</span> {bc.text || '번개가입으로 회원 혜택을 받으세요!'}
                      </span>
                    </div>
                  </div>
                  {/* 모의 콘텐츠 */}
                  <div style="padding:16px;background:#f9fafb;border-top:1px solid #f0f0f0">
                    <div style="background:#e5e7eb;border-radius:8px;height:120px;display:flex;align-items:center;justify-content:center">
                      <span style="font-size:12px;color:#9ca3af">페이지 콘텐츠 영역</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 설정 영역 (펼치기/접기) */}
              <div>
                <div id="bannerSettingsToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px">
                  <span style="font-size:14px;font-weight:600;color:#374151">상세 설정</span>
                  <span id="bannerSettingsArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
                </div>
                <div id="bannerSettingsBody" style="display:none">
                  <div style="display:flex;gap:24px;margin-bottom:16px">
                    <div class="form-group" style="flex:1">
                      <label style="display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600;margin-bottom:12px">
                        <span>배너 활성화</span>
                        <span style="font-size:12px;color:#64748b;font-weight:400">(위젯 설치 시 자동 활성화)</span>
                      </label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:40px;height:22px;background:linear-gradient(135deg,#f472b6 0%,#db2777 100%);border-radius:11px;position:relative;cursor:not-allowed;opacity:0.7">
                          <div style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%"></div>
                        </div>
                        <span style="font-size:13px;color:#374151">활성화됨</span>
                      </div>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:12px">이전 로그인 기록 감지 시 표시 안함</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="bannerHideReturningToggle" style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${bc.hideForReturning ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'}`}>
                          <div style={`position:absolute;top:2px;${bc.hideForReturning ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                        </div>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:6px">켜면 로그인 이력이 있는 방문자에게 배너를 표시하지 않습니다.</p>
                    </div>
                  </div>
                  <div style="display:flex;gap:24px;margin-bottom:16px">
                    <div style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">아이콘</label>
                      <div style="display:flex;gap:6px;flex-wrap:wrap">
                        <button class="banner-icon-btn" data-icon="⚡" style={`width:36px;height:36px;border-radius:50%;border:2px solid ${bc.icon === '⚡' ? '#2563eb' : 'transparent'};background:#f8fafc;font-size:16px;cursor:pointer`}>⚡</button>
                        <button class="banner-icon-btn" data-icon="🎁" style={`width:36px;height:36px;border-radius:50%;border:2px solid ${bc.icon === '🎁' ? '#2563eb' : 'transparent'};background:#f8fafc;font-size:16px;cursor:pointer`}>🎁</button>
                        <button class="banner-icon-btn" data-icon="🎉" style={`width:36px;height:36px;border-radius:50%;border:2px solid ${bc.icon === '🎉' ? '#2563eb' : 'transparent'};background:#f8fafc;font-size:16px;cursor:pointer`}>🎉</button>
                        <button class="banner-icon-btn" data-icon="✨" style={`width:36px;height:36px;border-radius:50%;border:2px solid ${bc.icon === '✨' ? '#2563eb' : 'transparent'};background:#f8fafc;font-size:16px;cursor:pointer`}>✨</button>
                        <button class="banner-icon-btn" data-icon="" style={`width:36px;height:36px;border-radius:50%;border:2px solid ${bc.icon === '' ? '#2563eb' : 'transparent'};background:#f8fafc;font-size:11px;cursor:pointer;color:#6b7280`}>없음</button>
                      </div>
                    </div>
                    <div style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">출현 효과</label>
                      <div style="display:flex;gap:8px">
                        <label style={`display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid ${(bc.animation || 'fadeIn') === 'fadeIn' ? '#2563eb' : '#e5e7eb'};background:${(bc.animation || 'fadeIn') === 'fadeIn' ? '#eff6ff' : '#fff'}`}>
                          <input type="radio" name="bannerAnimation" value="fadeIn" checked={(bc.animation || 'fadeIn') === 'fadeIn'} style="display:none" />
                          페이드인
                        </label>
                        <label style={`display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid ${bc.animation === 'slideDown' ? '#2563eb' : '#e5e7eb'};background:${bc.animation === 'slideDown' ? '#eff6ff' : '#fff'}`}>
                          <input type="radio" name="bannerAnimation" value="slideDown" checked={bc.animation === 'slideDown'} style="display:none" />
                          슬라이드
                        </label>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:6px">페이드인: 서서히 나타남 · 슬라이드: 위에서 아래로</p>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="bannerText">배너 텍스트 (최대 30자)</label>
                    <div style="display:flex;align-items:center;gap:6px">
                      <input
                        type="text"
                        id="bannerText"
                        value={bc.text || ''}
                        maxlength="30"
                        placeholder="번개가입으로 회원 혜택을 받으세요!"
                        style="width:320px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box"
                      />
                      <button id="bannerBoldToggle" style={`width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:14px;font-weight:800;border:2px solid ${bc.bold ? '#2563eb' : '#d1d5db'};background:${bc.bold ? '#eff6ff' : '#fff'};color:#374151;flex-shrink:0`}>B</button>
                      <button id="bannerItalicToggle" style={`width:32px;height:32px;border-radius:6px;cursor:pointer;font-size:14px;font-style:italic;border:2px solid ${bc.italic ? '#2563eb' : '#d1d5db'};background:${bc.italic ? '#eff6ff' : '#fff'};color:#374151;flex-shrink:0`}>I</button>
                    </div>
                    <p style="font-size:12px;color:#94a3b8;margin-top:6px">
                      <span id="bannerTextCount">{(bc.text || '').length}</span>/30자
                    </p>
                    <div id="aiBannerSuggestion" style="display:none;margin-top:8px;padding:8px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:12px">
                      <div style="display:flex;justify-content:space-between;align-items:center">
                        <span style="color:#1e40af;font-weight:600">AI 추천</span>
                        <button id="applyBannerCopy" type="button" style="padding:2px 10px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">적용</button>
                      </div>
                      <div id="aiBannerCopyText" style="color:#1e40af;margin-top:4px"></div>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px">색상 프리셋</label>
                    <div style="display:flex;gap:8px;margin-bottom:4px;flex-wrap:wrap">
                      <div class="banner-preset-card" data-preset="0" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 0 ? '3px solid #2563eb' : '1px solid #d1d5db'};overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:#111827;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">화이트</span>
                      </div>
                      <div class="banner-preset-card" data-preset="1" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 1 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:#4b5563;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">회색</span>
                      </div>
                      <div class="banner-preset-card" data-preset="2" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 2 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:#eff6ff;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:#1d4ed8;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">밝은 파랑</span>
                      </div>
                      <div class="banner-preset-card" data-preset="3" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 3 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:#f0fdf4;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:#166534;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">녹색</span>
                      </div>
                      <div class="banner-preset-card" data-preset="4" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 4 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:#fef2f2;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:#991b1b;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">붉은색</span>
                      </div>
                      <div class="banner-preset-card" data-preset="5" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 5 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:linear-gradient(135deg,#2563eb 0%,#ec4899 100%);display:flex;align-items:center;justify-content:center`}>
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">파랑-보라</span>
                      </div>
                      <div class="banner-preset-card" data-preset="6" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 6 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:linear-gradient(135deg,#f472b6 0%,#db2777 100%);display:flex;align-items:center;justify-content:center`}>
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">보라-자주</span>
                      </div>
                      <div class="banner-preset-card" data-preset="7" style={`width:80px;height:50px;border-radius:8px;cursor:pointer;border:${bc.preset === 7 ? '3px solid #2563eb' : '2px solid transparent'};overflow:hidden;background:#111827;display:flex;align-items:center;justify-content:center`}>
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">검정 심플</span>
                      </div>
                    </div>
                    <p style="font-size:11px;color:#94a3b8;margin-top:6px">화이트/회색은 모노톤, 녹색/붉은색은 포인트 프리셋입니다.</p>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">투명도</label>
                    <div style="display:flex;align-items:center;gap:12px">
                      <input type="range" min="30" max="100" value={String(bc.opacity != null ? bc.opacity : 90)} id="bannerOpacity" style="flex:1" />
                      <span id="bannerOpacityValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">{bc.opacity != null ? bc.opacity : 90}%</span>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">모서리 둥글기</label>
                    <div style="display:flex;align-items:center;gap:12px">
                      <input type="range" min="0" max="20" value={String(bc.borderRadius)} id="bannerBorderRadius" style="flex:1" />
                      <span id="bannerBorderRadiusValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">{bc.borderRadius}px</span>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                      <span style="font-size:13px;font-weight:600">전체 너비</span>
                      <div id="bannerFullWidthToggle" style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${(bc.fullWidth !== false) ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'}`}>
                        <div style={`position:absolute;top:2px;${(bc.fullWidth !== false) ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                      </div>
                    </div>
                    <div id="bannerPaddingGroup" style={`opacity:${(bc.fullWidth !== false) ? '0.4' : '1'};pointer-events:${(bc.fullWidth !== false) ? 'none' : 'auto'}`}>
                      <label style="display:block;font-size:12px;color:#64748b;margin-bottom:6px">좌우 여백</label>
                      <div style="display:flex;align-items:center;gap:12px">
                        <input type="range" min="12" max="80" value={String(bc.paddingX || 24)} id="bannerPaddingX" style="flex:1" />
                        <span id="bannerPaddingXValue" style="font-size:13px;min-width:40px;text-align:right;color:#374151">{bc.paddingX || 24}px</span>
                      </div>
                    </div>
                  </div>
                  <div class="form-group" style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="bannerAnchor">기준 요소</label>
                    <input
                      type="text"
                      id="bannerAnchor"
                      value={bc.anchorSelector || '#top_nav_box'}
                      placeholder="#top_nav_box"
                      style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;font-family:monospace"
                    />
                    <p style="font-size:11px;color:#94a3b8;margin-top:6px;line-height:1.6">
                      배너가 이 요소 아래에 표시됩니다. #아이디 또는 .클래스 형식으로 입력하세요.<br/>
                      접두사 없이 입력하면 ID → 클래스 순서로 자동 검색합니다. (기본값: #top_nav_box)
                    </p>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button
                      id="bannerSaveBtn"
                      style="flex:1;padding:10px;background:linear-gradient(135deg,#f472b6 0%,#db2777 100%);color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer"
                    >
                      설정 저장
                    </button>
                    <button
                      id="bannerResetBtn"
                      style="padding:10px 16px;background:#fff;color:#6b7280;border:1px solid #d1d5db;border-radius:8px;font-size:13px;cursor:pointer"
                    >
                      기본값
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{__html: `
              (function() {
                // 설정 펼치기/접기
                var settingsToggle = document.getElementById('bannerSettingsToggle');
                var settingsBody = document.getElementById('bannerSettingsBody');
                var settingsArrow = document.getElementById('bannerSettingsArrow');
                var settingsOpen = false;
                if (settingsToggle && settingsBody) {
                  settingsToggle.addEventListener('click', function() {
                    settingsOpen = !settingsOpen;
                    settingsBody.style.display = settingsOpen ? 'block' : 'none';
                    settingsArrow.style.transform = settingsOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
                  });
                }

                var shopId = ${JSON.stringify(shopId || '')};
                var bannerPresets = [
                  { bg: '#ffffff', color: '#111827', border: '1px solid #d1d5db' },
                  { bg: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db' },
                  { bg: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' },
                  { bg: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' },
                  { bg: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca' },
                  { bg: 'linear-gradient(135deg, #2563eb 0%, #ec4899 100%)', color: '#fff', border: 'none' },
                  { bg: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)', color: '#fff', border: 'none' },
                  { bg: '#111827', color: '#fff', border: 'none' },
                ];
                var currentBannerPreset = ${bc.preset};
                var currentBannerIcon = ${JSON.stringify(bc.icon || '⚡')};
                var currentAnimation = ${JSON.stringify(bc.animation || 'fadeIn')};
                var isBold = ${bc.bold ? 'true' : 'false'};
                var isItalic = ${bc.italic ? 'true' : 'false'};
                var hideForReturning = ${bc.hideForReturning ? 'true' : 'false'};

                function applyBannerPreset(i) {
                  var p = bannerPresets[i];
                  var preview = document.getElementById('bannerPreview');
                  var previewText = document.getElementById('bannerPreviewText');
                  if (preview) {
                    preview.style.background = p.bg;
                    preview.style.border = p.border;
                  }
                  if (previewText) {
                    previewText.style.color = p.color;
                  }
                }

                // 초기 프리셋 적용
                applyBannerPreset(currentBannerPreset);

                document.querySelectorAll('.banner-preset-card').forEach(function(card) {
                  card.addEventListener('click', function() {
                    var i = parseInt(this.dataset.preset);
                    currentBannerPreset = i;
                    applyBannerPreset(i);
                    document.querySelectorAll('.banner-preset-card').forEach(function(c) {
                      c.style.border = '2px solid transparent';
                    });
                    this.style.border = '3px solid #2563eb';
                  });
                });

                var bannerRadiusSlider = document.getElementById('bannerBorderRadius');
                if (bannerRadiusSlider) {
                  bannerRadiusSlider.addEventListener('input', function() {
                    document.getElementById('bannerBorderRadiusValue').textContent = this.value + 'px';
                    document.getElementById('bannerPreview').style.borderRadius = this.value + 'px';
                  });
                }

                var bannerOpacitySlider = document.getElementById('bannerOpacity');
                if (bannerOpacitySlider) {
                  bannerOpacitySlider.addEventListener('input', function() {
                    document.getElementById('bannerOpacityValue').textContent = this.value + '%';
                    var p = document.getElementById('bannerPreview');
                    if (p) p.style.opacity = (parseInt(this.value) / 100).toString();
                  });
                }

                var isFullWidth = ${bc.fullWidth !== false ? 'true' : 'false'};
                var toggleEl = document.getElementById('bannerFullWidthToggle');
                var paddingGroup = document.getElementById('bannerPaddingGroup');
                var preview = document.getElementById('bannerPreview');

                function applyBannerSize() {
                  if (!preview) return;
                  if (isFullWidth) {
                    preview.style.width = '100%';
                    preview.style.display = 'flex';
                    preview.style.margin = '0 auto';
                    preview.style.padding = '0 16px';
                  } else {
                    var px = document.getElementById('bannerPaddingX');
                    var padVal = px ? px.value : 24;
                    preview.style.width = 'fit-content';
                    preview.style.display = 'flex';
                    preview.style.margin = '0 auto';
                    preview.style.padding = '0 ' + padVal + 'px';
                  }
                }

                if (toggleEl) {
                  toggleEl.addEventListener('click', function() {
                    isFullWidth = !isFullWidth;
                    var dot = this.querySelector('div');
                    if (isFullWidth) {
                      this.style.background = 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)';
                      dot.style.left = 'auto';
                      dot.style.right = '2px';
                      paddingGroup.style.opacity = '0.4';
                      paddingGroup.style.pointerEvents = 'none';
                      if (preview) { preview.style.width = '100%'; preview.style.display = 'flex'; preview.style.margin = '0 auto'; preview.style.padding = '0 16px'; }
                    } else {
                      this.style.background = '#d1d5db';
                      dot.style.right = 'auto';
                      dot.style.left = '2px';
                      paddingGroup.style.opacity = '1';
                      paddingGroup.style.pointerEvents = 'auto';
                      applyBannerSize();
                    }
                  });
                }

                var bannerPaddingSlider = document.getElementById('bannerPaddingX');
                if (bannerPaddingSlider) {
                  bannerPaddingSlider.addEventListener('input', function() {
                    document.getElementById('bannerPaddingXValue').textContent = this.value + 'px';
                    if (preview && !isFullWidth) {
                      preview.style.padding = '0 ' + this.value + 'px';
                    }
                  });
                }

                applyBannerSize();

                document.querySelectorAll('.banner-icon-btn').forEach(function(btn) {
                  btn.addEventListener('click', function() {
                    document.querySelectorAll('.banner-icon-btn').forEach(function(b) { b.style.border = '2px solid transparent'; });
                    this.style.border = '2px solid #2563eb';
                    currentBannerIcon = this.dataset.icon;
                    var iconEl = document.getElementById('bannerPreviewIcon');
                    if (iconEl) iconEl.textContent = currentBannerIcon;
                  });
                });

                var boldToggle = document.getElementById('bannerBoldToggle');
                if (boldToggle) {
                  boldToggle.addEventListener('click', function() {
                    isBold = !isBold;
                    this.style.border = '2px solid ' + (isBold ? '#2563eb' : '#d1d5db');
                    this.style.background = isBold ? '#eff6ff' : '#fff';
                    var pt = document.getElementById('bannerPreviewText');
                    if (pt) pt.style.fontWeight = isBold ? '600' : '400';
                  });
                }

                var italicToggle = document.getElementById('bannerItalicToggle');
                if (italicToggle) {
                  italicToggle.addEventListener('click', function() {
                    isItalic = !isItalic;
                    this.style.border = '2px solid ' + (isItalic ? '#2563eb' : '#d1d5db');
                    this.style.background = isItalic ? '#eff6ff' : '#fff';
                    var pt = document.getElementById('bannerPreviewText');
                    if (pt) pt.style.fontStyle = isItalic ? 'italic' : 'normal';
                  });
                }

                function playPreviewAnimation(type) {
                  if (!preview) return;
                  // 초기화: 숨김
                  preview.style.transition = 'none';
                  preview.style.opacity = '0';
                  if (type === 'slideDown') {
                    preview.style.transform = 'translateY(-20px)';
                  } else {
                    preview.style.transform = 'none';
                  }
                  // 강제 리플로우
                  preview.offsetHeight;
                  // 애니메이션 시작
                  if (type === 'slideDown') {
                    preview.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                    preview.style.opacity = '1';
                    preview.style.transform = 'translateY(0)';
                  } else {
                    preview.style.transition = 'opacity 1s ease';
                    preview.style.opacity = '1';
                  }
                }

                document.querySelectorAll('input[name="bannerAnimation"]').forEach(function(radio) {
                  radio.parentElement.addEventListener('click', function() {
                    currentAnimation = radio.value;
                    document.querySelectorAll('input[name="bannerAnimation"]').forEach(function(r) {
                      r.parentElement.style.border = '2px solid #e5e7eb';
                      r.parentElement.style.background = '#fff';
                    });
                    radio.parentElement.style.border = '2px solid #2563eb';
                    radio.parentElement.style.background = '#eff6ff';
                    radio.checked = true;
                    playPreviewAnimation(radio.value);
                  });
                });

                var hideReturningToggle = document.getElementById('bannerHideReturningToggle');
                if (hideReturningToggle) {
                  hideReturningToggle.addEventListener('click', function() {
                    hideForReturning = !hideForReturning;
                    var dot = this.querySelector('div');
                    if (hideForReturning) {
                      this.style.background = 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)';
                      dot.style.left = 'auto';
                      dot.style.right = '2px';
                    } else {
                      this.style.background = '#d1d5db';
                      dot.style.right = 'auto';
                      dot.style.left = '2px';
                    }
                  });
                }

                var bannerTextInput = document.getElementById('bannerText');
                if (bannerTextInput) {
                  bannerTextInput.addEventListener('input', function() {
                    var counter = document.getElementById('bannerTextCount');
                    if (counter) counter.textContent = this.value.length;
                    var previewText = document.getElementById('bannerPreviewText');
                    if (previewText) {
                      var iconEl = document.getElementById('bannerPreviewIcon');
                      if (iconEl) iconEl.textContent = currentBannerIcon;
                      var nodes = previewText.childNodes;
                      for (var n = 0; n < nodes.length; n++) {
                        if (nodes[n].nodeType === 3) {
                          nodes[n].textContent = ' ' + (this.value || '번개가입으로 회원 혜택을 받으세요!');
                          break;
                        }
                      }
                    }
                  });
                }

                // 저장 버튼
                var saveBtn = document.getElementById('bannerSaveBtn');
                if (saveBtn) {
                  saveBtn.addEventListener('click', function() {
                    var btn = this;
                    btn.disabled = true;
                    btn.textContent = '저장 중...';

                    var textInput = document.getElementById('bannerText');
                    var radiusSlider = document.getElementById('bannerBorderRadius');

                    var payload = {
                      preset: currentBannerPreset,
                      text: (textInput && textInput.value) || '번개가입으로 회원 혜택을 받으세요!',
                      borderRadius: radiusSlider ? parseInt(radiusSlider.value) : 10,
                      icon: currentBannerIcon,
                      opacity: document.getElementById('bannerOpacity') ? parseInt(document.getElementById('bannerOpacity').value) : 90,
                      bold: isBold,
                      italic: isItalic,
                      position: 'floating',
                      animation: currentAnimation,
                      anchorSelector: (document.getElementById('bannerAnchor') || {}).value || '#top_nav_box',
                      hideForReturning: hideForReturning,
                      fullWidth: isFullWidth,
                      paddingX: bannerPaddingSlider ? parseInt(bannerPaddingSlider.value) : 24
                    };

                    fetch('/api/dashboard/shops/' + shopId + '/banner', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload),
                      credentials: 'same-origin'
                    })
                    .then(function(resp) { return resp.json(); })
                    .then(function(data) {
                      var msgEl = document.getElementById('bannerSaveMsg');
                      if (data.ok) {
                        msgEl.style.display = 'block';
                        msgEl.style.background = '#f0fdf4';
                        msgEl.style.color = '#166534';
                        msgEl.style.border = '1px solid #bbf7d0';
                        msgEl.textContent = '설정이 저장되었습니다.';
                      } else {
                        msgEl.style.display = 'block';
                        msgEl.style.background = '#fef2f2';
                        msgEl.style.color = '#991b1b';
                        msgEl.style.border = '1px solid #fecaca';
                        msgEl.textContent = '저장 실패: ' + (data.error || '알 수 없는 오류');
                      }
                      setTimeout(function() { msgEl.style.display = 'none'; }, 3000);
                    })
                    .catch(function(err) {
                      var msgEl = document.getElementById('bannerSaveMsg');
                      msgEl.style.display = 'block';
                      msgEl.style.background = '#fef2f2';
                      msgEl.style.color = '#991b1b';
                      msgEl.style.border = '1px solid #fecaca';
                      msgEl.textContent = '네트워크 오류: ' + err.message;
                      setTimeout(function() { msgEl.style.display = 'none'; }, 3000);
                    })
                    .finally(function() {
                      btn.disabled = false;
                      btn.textContent = '설정 저장';
                    });
                  });
                }

                // 기본값 되돌리기
                var resetBtn = document.getElementById('bannerResetBtn');
                if (resetBtn) {
                  resetBtn.addEventListener('click', function() {
                    // 기본값 설정
                    currentBannerPreset = 0; // 화이트
                    currentBannerIcon = '⚡';
                    isBold = false;
                    isItalic = false;
                    isFullWidth = false;
                    currentAnimation = 'fadeIn';
                    hideForReturning = false;

                    // UI 업데이트 - 프리셋
                    applyBannerPreset(0);
                    document.querySelectorAll('.banner-preset-card').forEach(function(c) { c.style.border = '2px solid transparent'; });
                    var firstCard = document.querySelector('.banner-preset-card[data-preset="0"]');
                    if (firstCard) firstCard.style.border = '3px solid #2563eb';

                    // 텍스트
                    var textInput = document.getElementById('bannerText');
                    if (textInput) { textInput.value = ''; }
                    var counter = document.getElementById('bannerTextCount');
                    if (counter) counter.textContent = '0';
                    var previewText = document.getElementById('bannerPreviewText');
                    if (previewText) {
                      var iconEl = document.getElementById('bannerPreviewIcon');
                      if (iconEl) iconEl.textContent = '⚡';
                      var nodes = previewText.childNodes;
                      for (var n = 0; n < nodes.length; n++) {
                        if (nodes[n].nodeType === 3) { nodes[n].textContent = ' 번개가입으로 회원 혜택을 받으세요!'; break; }
                      }
                    }

                    // 볼드/이탤릭
                    var boldBtn = document.getElementById('bannerBoldToggle');
                    if (boldBtn) { boldBtn.style.border = '2px solid #d1d5db'; boldBtn.style.background = '#fff'; }
                    var italicBtn = document.getElementById('bannerItalicToggle');
                    if (italicBtn) { italicBtn.style.border = '2px solid #d1d5db'; italicBtn.style.background = '#fff'; }
                    if (previewText) { previewText.style.fontWeight = '400'; previewText.style.fontStyle = 'normal'; }

                    // 투명도
                    var opacitySlider = document.getElementById('bannerOpacity');
                    if (opacitySlider) { opacitySlider.value = '90'; }
                    document.getElementById('bannerOpacityValue').textContent = '90%';
                    if (preview) preview.style.opacity = '0.9';

                    // 모서리 둥글기
                    var radiusSlider = document.getElementById('bannerBorderRadius');
                    if (radiusSlider) { radiusSlider.value = '10'; }
                    document.getElementById('bannerBorderRadiusValue').textContent = '10px';
                    if (preview) preview.style.borderRadius = '10px';

                    // 전체 너비 OFF
                    var toggleEl2 = document.getElementById('bannerFullWidthToggle');
                    if (toggleEl2) {
                      toggleEl2.style.background = '#d1d5db';
                      var dot = toggleEl2.querySelector('div');
                      if (dot) { dot.style.right = 'auto'; dot.style.left = '2px'; }
                    }
                    var paddingGroup2 = document.getElementById('bannerPaddingGroup');
                    if (paddingGroup2) { paddingGroup2.style.opacity = '1'; paddingGroup2.style.pointerEvents = 'auto'; }

                    // 좌우 여백
                    var paddingSlider = document.getElementById('bannerPaddingX');
                    if (paddingSlider) { paddingSlider.value = '20'; }
                    document.getElementById('bannerPaddingXValue').textContent = '20px';

                    // 아이콘
                    document.querySelectorAll('.banner-icon-btn').forEach(function(b) { b.style.border = '2px solid transparent'; });
                    var lightningBtn = document.querySelector('.banner-icon-btn[data-icon="⚡"]');
                    if (lightningBtn) lightningBtn.style.border = '2px solid #2563eb';
                    var iconEl2 = document.getElementById('bannerPreviewIcon');
                    if (iconEl2) iconEl2.textContent = '⚡';

                    // 출현 효과 - 페이드인
                    document.querySelectorAll('input[name="bannerAnimation"]').forEach(function(r) {
                      r.parentElement.style.border = '2px solid #e5e7eb';
                      r.parentElement.style.background = '#fff';
                      if (r.value === 'fadeIn') {
                        r.parentElement.style.border = '2px solid #2563eb';
                        r.parentElement.style.background = '#eff6ff';
                        r.checked = true;
                      }
                    });

                    // 로그인 기록 감지 OFF
                    var hideToggle = document.getElementById('bannerHideReturningToggle');
                    if (hideToggle) {
                      hideToggle.style.background = '#d1d5db';
                      var dot2 = hideToggle.querySelector('div');
                      if (dot2) { dot2.style.right = 'auto'; dot2.style.left = '2px'; }
                    }

                    // 기준 요소
                    var anchorInput = document.getElementById('bannerAnchor');
                    if (anchorInput) anchorInput.value = '#top_nav_box';

                    // 미리보기 크기 업데이트
                    applyBannerSize();
                  });
                }

                // AI 추천 문구 로드
                (async function() {
                  try {
                    if (!shopId) return;
                    var resp = await fetch('/api/dashboard/shops/' + shopId + '/ai-copy', { credentials: 'same-origin' });
                    if (!resp.ok) return;
                    var data = await resp.json();
                    var copy = data.copy;
                    if (!copy || !copy.banner) return;
                    document.getElementById('aiBannerCopyText').textContent = copy.banner;
                    document.getElementById('aiBannerSuggestion').style.display = 'block';
                    document.getElementById('applyBannerCopy').addEventListener('click', function() {
                      var textInput = document.getElementById('bannerText');
                      if (textInput) {
                        textInput.value = copy.banner;
                        textInput.dispatchEvent(new Event('input'));
                        // 미리보기 텍스트 업데이트
                        var previewText = document.getElementById('bannerPreviewText');
                        if (previewText) {
                          var nodes = previewText.childNodes;
                          for (var n = 0; n < nodes.length; n++) {
                            if (nodes[n].nodeType === 3) { nodes[n].textContent = ' ' + copy.banner; break; }
                          }
                        }
                        var counter = document.getElementById('bannerTextCount');
                        if (counter) counter.textContent = copy.banner.length;
                      }
                    });
                  } catch(e) {}
                })();
              })();
            `}} />
          </div>
        )
      }
    </Layout>
  );
};

// ─── Popup Settings Page [Plus] ─────────────────────────────

export const PopupSettingsPage: FC<{
  shop: { shop_id: string; plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  const shopId = shop?.shop_id || '';
  return (
    <Layout title="이탈 감지 팝업" loggedIn currentPath="/dashboard/settings/popup" isCafe24={isCafe24}>
      <h1>이탈 감지 팝업</h1>
      {!isPlus
        ? <PlusLockOverlay feature="이탈 감지 팝업" />
        : (
          <div>
            <div class="card">
              <h2>이탈 감지 팝업 설정</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:4px">PC: 마우스가 브라우저 밖으로 나갈 때 / 모바일: 급격한 스크롤 업 감지 시 표시됩니다.</p>
              <p style="font-size:13px;color:#64748b;margin-bottom:20px">팝업을 보여준 뒤 가입까지 이어지지 않은 이탈 방문자를 재유도합니다.</p>
              {/* 미리보기 영역 (상단) */}
              <div style="margin-bottom:20px">
                <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">미리보기</p>
                <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;padding:24px;position:relative;overflow:hidden">
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;user-select:none">
                    <div style="font-size:64px;line-height:1;margin-bottom:4px">&#129302;</div>
                    <p style="font-size:18px;font-weight:700;color:#111827;margin:0">&#51676;&#51088;&#51092;!</p>
                    <p style="font-size:11px;color:#111827;margin:2px 0 0">(test text)</p>
                  </div>
                  <p style="font-size:11px;color:#94a3b8;margin-bottom:12px;text-align:center;position:relative">이탈 감지 시 표시되는 팝업</p>
                  <div id="popupPreviewCard" style="background:white;max-width:320px;margin:0 auto;padding:24px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative">
                    <div style="position:absolute;top:12px;right:12px;width:24px;height:24px;border-radius:50%;background:#f3f4f6;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:#6b7280;line-height:24px;text-align:center">
                      &#10005;
                    </div>
                    <div style="text-align:center;margin-bottom:16px">
                      <div id="popupPreviewIconBg" style="width:48px;height:48px;background:linear-gradient(135deg,#2563eb,#ec4899);border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;justify-content:center">
                        <span id="popupPreviewIcon" style="color:white;font-size:20px">🎁</span>
                      </div>
                      <h3 id="popupPreviewTitle" style="font-size:20px;font-weight:700;margin:0 0 8px;color:#111827">잠깐만요!</h3>
                      <p id="popupPreviewBody" style="font-size:14px;color:#6b7280;margin:0">지금 가입하면 특별 혜택을 드려요!</p>
                    </div>
                    <button id="popupPreviewCta" style="width:100%;padding:12px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">혜택 받고 가입하기</button>
                  </div>
                </div>
              </div>
              {/* 설정 영역 (펼치기/접기) */}
              <div>
                <div id="popupSettingsToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px">
                  <span style="font-size:14px;font-weight:600;color:#374151">상세 설정</span>
                  <span id="popupSettingsArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
                </div>
                <div id="popupSettingsBody" style="display:none">
                  <div style="display:flex;gap:24px;margin-bottom:16px">
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">팝업 활성화</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="popupEnabledToggle" style="width:40px;height:22px;background:#2563eb;border-radius:11px;position:relative;cursor:pointer">
                          <div id="popupEnabledKnob" style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="popupEnabledLabel" style="font-size:13px;color:#374151">활성화됨</span>
                      </div>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">노출 범위</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="popupAllPagesToggle" style="width:40px;height:22px;background:#d1d5db;border-radius:11px;position:relative;cursor:pointer">
                          <div id="popupAllPagesKnob" style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="popupAllPagesLabel" style="font-size:13px;color:#374151">모든 페이지에서</span>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:4px">켜면 모든 페이지에서 비로그인 방문자에게 이탈 감지시 팝업 표시</p>
                    </div>
                  </div>
                  <div style="display:flex;gap:20px;margin-bottom:16px;max-width:75%">
                    <div style="flex:1">
                      <div class="form-group" style="margin-bottom:12px">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupTitle">팝업 제목 <span style="font-weight:400;color:#94a3b8">(최대 20자)</span></label>
                        <input type="text" id="popupTitle" maxlength={20} placeholder="잠깐만요!" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box" />
                      </div>
                      <div class="form-group" style="margin-bottom:12px">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupBody">팝업 본문 <span style="font-weight:400;color:#94a3b8">(최대 100자)</span></label>
                        <textarea id="popupBody" maxlength={100} rows={3} placeholder="지금 가입하면 특별 혜택을 드려요!" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box;resize:vertical;font-family:inherit"></textarea>
                      </div>
                      <div class="form-group">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupCta">버튼 텍스트 <span style="font-weight:400;color:#94a3b8">(최대 20자)</span></label>
                        <input type="text" id="popupCta" maxlength={20} placeholder="혜택 받고 가입하기" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box" />
                      </div>
                      <div id="aiPopupSuggestion" style="display:none;margin-top:12px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:12px">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                          <span style="color:#1e40af;font-weight:600">AI 추천 문구</span>
                          <button id="applyPopupCopy" type="button" style="padding:2px 10px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">적용</button>
                        </div>
                        <div style="display:grid;gap:4px;color:#1e40af">
                          <div>제목: <span id="aiPopupTitle"></span></div>
                          <div>본문: <span id="aiPopupBody"></span></div>
                          <div>버튼: <span id="aiPopupCta"></span></div>
                        </div>
                      </div>
                    </div>
                    <div style="flex-shrink:0">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">아이콘</label>
                      <div style="display:flex;gap:6px">
                        <button class="popup-icon-btn" data-icon="⚡" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">⚡</button>
                        <button class="popup-icon-btn" data-icon="🎁" style="width:36px;height:36px;border-radius:50%;border:2px solid #2563eb;background:#f8fafc;font-size:16px;cursor:pointer">🎁</button>
                        <button class="popup-icon-btn" data-icon="🛍️" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">🛍️</button>
                        <button class="popup-icon-btn" data-icon="💝" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">💝</button>
                        <button class="popup-icon-btn" data-icon="" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:11px;cursor:pointer;color:#6b7280">없음</button>
                      </div>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px">색상 프리셋</label>
                    <div style="display:flex;gap:8px;flex-wrap:wrap">
                      <div class="popup-preset-card" data-preset="0" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:3px solid #2563eb;overflow:hidden;background:linear-gradient(135deg,#2563eb,#ec4899);display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">기본 블루</span>
                      </div>
                      <div class="popup-preset-card" data-preset="1" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:linear-gradient(135deg,#059669,#10b981);display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">그린</span>
                      </div>
                      <div class="popup-preset-card" data-preset="2" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:linear-gradient(135deg,#ea580c,#f59e0b);display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">오렌지</span>
                      </div>
                      <div class="popup-preset-card" data-preset="3" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:#6b7280;display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">회색</span>
                      </div>
                      <div class="popup-preset-card" data-preset="4" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:#111827;display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">흑백 심플</span>
                      </div>
                      <div class="popup-preset-card" data-preset="5" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:linear-gradient(135deg,#ec4899,#f43f5e);display:flex;align-items:center;justify-content:center">
                        <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">핑크</span>
                      </div>
                      <div class="popup-preset-card" data-preset="6" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #93c5fd;overflow:hidden;background:#eff6ff;display:flex;align-items:center;justify-content:center">
                        <span style="color:#2563eb;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">파랑 테두리</span>
                      </div>
                      <div class="popup-preset-card" data-preset="7" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #d1d5db;overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center">
                        <span style="color:#374151;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">회색 테두리</span>
                      </div>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">모서리 둥글기</label>
                    <div style="display:flex;align-items:center;gap:12px">
                      <input type="range" min="8" max="24" value="16" id="popupBorderRadius" style="flex:1" />
                      <span id="popupBorderRadiusValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">16px</span>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">투명도</label>
                    <div style="display:flex;align-items:center;gap:12px">
                      <input type="range" min="10" max="100" value="100" id="popupOpacity" style="flex:1" />
                      <span id="popupOpacityValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">100%</span>
                    </div>
                  </div>
                  <div style="margin-bottom:16px">
                    <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupCooldown">재노출 간격 (시간) <span style="font-weight:400;color:#94a3b8">해당 시간에 1회만 노출됩니다.</span></label>
                    <div style="display:flex;align-items:center;gap:12px">
                      <input type="range" min="1" max="168" value="24" id="popupCooldown" style="flex:1" />
                      <span id="popupCooldownValue" style="font-size:13px;min-width:48px;text-align:right;color:#374151">24시간</span>
                    </div>
                  </div>
                  <div style="display:flex;gap:8px">
                    <button id="popupSaveBtn" style="flex:1;padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">저장</button>
                    <button id="popupResetBtn" style="padding:10px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">기본값 되돌리기</button>
                  </div>
                  <div id="popupSaveStatus" style="display:none;padding:10px 16px;border-radius:8px;margin-top:12px;font-size:13px"></div>
                </div>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{__html: `
              (function() {
                var SHOP_ID = '${shopId}';
                var DEFAULTS = { enabled: true, title: '잠깐만요!', body: '지금 가입하면 특별 혜택을 드려요!', ctaText: '혜택 받고 가입하기', preset: 0, borderRadius: 16, opacity: 100, icon: '🎁', allPages: false, cooldownHours: 24 };
                var popupPresets = [
                  { ctaBg: '#2563eb', iconBg: 'linear-gradient(135deg, #2563eb, #ec4899)' },
                  { ctaBg: '#059669', iconBg: 'linear-gradient(135deg, #059669, #10b981)' },
                  { ctaBg: '#ea580c', iconBg: 'linear-gradient(135deg, #ea580c, #f59e0b)' },
                  { ctaBg: '#6b7280', iconBg: '#6b7280' },
                  { ctaBg: '#111827', iconBg: '#111827' },
                  { ctaBg: '#ec4899', iconBg: 'linear-gradient(135deg, #ec4899, #f43f5e)' },
                  { ctaBg: '#eff6ff', ctaBorder: '2px solid #93c5fd', ctaColor: '#2563eb', iconBg: '#eff6ff', iconBorder: '2px solid #93c5fd', iconColor: '#2563eb' },
                  { ctaBg: 'transparent', ctaBorder: '2px solid #9ca3af', ctaColor: '#6b7280', iconBg: 'transparent', iconBorder: '2px solid #d1d5db', iconColor: '#6b7280' },
                ];
                var state = Object.assign({}, DEFAULTS);

                // ── 펼치기/접기 ──
                var settingsToggle = document.getElementById('popupSettingsToggle');
                var settingsBody = document.getElementById('popupSettingsBody');
                var settingsArrow = document.getElementById('popupSettingsArrow');
                var settingsOpen = false;
                if (settingsToggle) settingsToggle.addEventListener('click', function() {
                  settingsOpen = !settingsOpen;
                  if (settingsBody) settingsBody.style.display = settingsOpen ? 'block' : 'none';
                  if (settingsArrow) settingsArrow.style.transform = settingsOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
                });

                function showStatus(msg, ok) {
                  var el = document.getElementById('popupSaveStatus');
                  el.textContent = msg;
                  el.style.display = 'block';
                  el.style.background = ok ? '#dcfce7' : '#fee2e2';
                  el.style.color = ok ? '#166534' : '#991b1b';
                  el.style.border = '1px solid ' + (ok ? '#bbf7d0' : '#fecaca');
                  setTimeout(function() { el.style.display = 'none'; }, 3000);
                }

                // ── 토글: 활성화 ──
                var enabledToggle = document.getElementById('popupEnabledToggle');
                function renderEnabled() {
                  enabledToggle.style.background = state.enabled ? '#2563eb' : '#d1d5db';
                  var knob = document.getElementById('popupEnabledKnob');
                  knob.style.right = state.enabled ? '2px' : 'auto';
                  knob.style.left = state.enabled ? 'auto' : '2px';
                  document.getElementById('popupEnabledLabel').textContent = state.enabled ? '활성화됨' : '비활성화';
                }
                enabledToggle.addEventListener('click', function() { state.enabled = !state.enabled; renderEnabled(); });

                // ── 토글: 전체 페이지 ──
                var allPagesToggle = document.getElementById('popupAllPagesToggle');
                function renderAllPages() {
                  allPagesToggle.style.background = state.allPages ? '#2563eb' : '#d1d5db';
                  var knob = document.getElementById('popupAllPagesKnob');
                  knob.style.right = state.allPages ? '2px' : 'auto';
                  knob.style.left = state.allPages ? 'auto' : '2px';
                  document.getElementById('popupAllPagesLabel').textContent = state.allPages ? '모든 페이지에서' : '로그인 페이지만';
                }
                allPagesToggle.addEventListener('click', function() { state.allPages = !state.allPages; renderAllPages(); });

                // ── 프리셋 ──
                function applyPreset(i) {
                  state.preset = i;
                  var p = popupPresets[i];
                  var ctaBtn = document.getElementById('popupPreviewCta');
                  var iconBg = document.getElementById('popupPreviewIconBg');
                  var iconEl = document.getElementById('popupPreviewIcon');
                  if (ctaBtn) {
                    ctaBtn.style.background = p.ctaBg;
                    ctaBtn.style.color = p.ctaColor || '#fff';
                    ctaBtn.style.border = p.ctaBorder || 'none';
                  }
                  if (iconBg) {
                    iconBg.style.background = p.iconBg;
                    iconBg.style.border = p.iconBorder || 'none';
                  }
                  if (iconEl) iconEl.style.color = p.iconColor || 'white';
                  document.querySelectorAll('.popup-preset-card').forEach(function(c, idx) {
                    var defaultBorder = idx === 6 ? '2px solid #93c5fd' : (idx === 7 ? '2px solid #d1d5db' : '2px solid transparent');
                    c.style.border = idx === i ? '3px solid #2563eb' : defaultBorder;
                  });
                }
                document.querySelectorAll('.popup-preset-card').forEach(function(card) {
                  card.addEventListener('click', function() { applyPreset(parseInt(this.dataset.preset)); });
                });

                // ── 모서리 둥글기 ──
                var radiusSlider = document.getElementById('popupBorderRadius');
                radiusSlider.addEventListener('input', function() {
                  state.borderRadius = parseInt(this.value);
                  document.getElementById('popupBorderRadiusValue').textContent = this.value + 'px';
                  document.getElementById('popupPreviewCard').style.borderRadius = this.value + 'px';
                  var ctaBtn = document.getElementById('popupPreviewCta');
                  if (ctaBtn) ctaBtn.style.borderRadius = Math.max(6, state.borderRadius - 6) + 'px';
                });

                // ── 투명도 ──
                var opacitySlider = document.getElementById('popupOpacity');
                opacitySlider.addEventListener('input', function() {
                  state.opacity = parseInt(this.value);
                  document.getElementById('popupOpacityValue').textContent = this.value + '%';
                  document.getElementById('popupPreviewCard').style.opacity = (state.opacity / 100).toString();
                });

                // ── 아이콘 ──
                document.querySelectorAll('.popup-icon-btn').forEach(function(btn) {
                  btn.addEventListener('click', function() {
                    state.icon = this.dataset.icon;
                    document.querySelectorAll('.popup-icon-btn').forEach(function(b) { b.style.border = '2px solid transparent'; });
                    this.style.border = '2px solid #2563eb';
                    document.getElementById('popupPreviewIcon').textContent = state.icon;
                    document.getElementById('popupPreviewIconBg').style.display = state.icon ? 'flex' : 'none';
                  });
                });

                // ── 쿨다운 ──
                var cooldownSlider = document.getElementById('popupCooldown');
                function formatCooldown(h) {
                  if (h <= 24) return h + '시간';
                  var d = Math.floor(h / 24);
                  var r = h % 24;
                  return r > 0 ? d + '일 ' + r + '시간' : d + '일';
                }
                cooldownSlider.addEventListener('input', function() {
                  state.cooldownHours = parseInt(this.value);
                  document.getElementById('popupCooldownValue').textContent = formatCooldown(state.cooldownHours);
                });

                // ── 미리보기 바인딩 ──
                function bindPreview(inputId, previewId, stateKey, defaultText) {
                  var input = document.getElementById(inputId);
                  var preview = document.getElementById(previewId);
                  if (input && preview) {
                    input.addEventListener('input', function() {
                      state[stateKey] = this.value || defaultText;
                      preview.textContent = state[stateKey];
                    });
                  }
                }
                bindPreview('popupTitle', 'popupPreviewTitle', 'title', DEFAULTS.title);
                bindPreview('popupCta', 'popupPreviewCta', 'ctaText', DEFAULTS.ctaText);
                // 본문은 textarea — 줄바꿈을 <br>로 변환하여 미리보기 반영
                var bodyInput = document.getElementById('popupBody');
                var bodyPreview = document.getElementById('popupPreviewBody');
                if (bodyInput && bodyPreview) {
                  bodyInput.addEventListener('input', function() {
                    state.body = this.value || DEFAULTS.body;
                    bodyPreview.innerHTML = (state.body).replace(/\\n/g, '<br>');
                  });
                }

                // ── UI에 상태 반영 ──
                function applyState() {
                  document.getElementById('popupTitle').value = state.title === DEFAULTS.title ? '' : state.title;
                  document.getElementById('popupBody').value = state.body === DEFAULTS.body ? '' : state.body;
                  document.getElementById('popupCta').value = state.ctaText === DEFAULTS.ctaText ? '' : state.ctaText;
                  document.getElementById('popupPreviewTitle').textContent = state.title;
                  document.getElementById('popupPreviewBody').innerHTML = state.body.replace(/\\n/g, '<br>');
                  document.getElementById('popupPreviewCta').textContent = state.ctaText;
                  radiusSlider.value = state.borderRadius;
                  document.getElementById('popupBorderRadiusValue').textContent = state.borderRadius + 'px';
                  document.getElementById('popupPreviewCard').style.borderRadius = state.borderRadius + 'px';
                  document.getElementById('popupPreviewCta').style.borderRadius = Math.max(6, state.borderRadius - 6) + 'px';
                  opacitySlider.value = state.opacity;
                  document.getElementById('popupOpacityValue').textContent = state.opacity + '%';
                  document.getElementById('popupPreviewCard').style.opacity = (state.opacity / 100).toString();
                  cooldownSlider.value = state.cooldownHours;
                  document.getElementById('popupCooldownValue').textContent = formatCooldown(state.cooldownHours);
                  applyPreset(state.preset);
                  // 아이콘
                  document.querySelectorAll('.popup-icon-btn').forEach(function(b) {
                    b.style.border = b.dataset.icon === state.icon ? '2px solid #2563eb' : '2px solid transparent';
                  });
                  document.getElementById('popupPreviewIcon').textContent = state.icon;
                  document.getElementById('popupPreviewIconBg').style.display = state.icon ? 'flex' : 'none';
                  renderEnabled();
                  renderAllPages();
                }

                // ── 저장 ──
                document.getElementById('popupSaveBtn').addEventListener('click', function() {
                  var btn = this;
                  btn.disabled = true;
                  btn.textContent = '저장 중...';
                  fetch('/api/dashboard/shops/' + SHOP_ID + '/popup', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      enabled: state.enabled,
                      title: state.title,
                      body: state.body,
                      ctaText: state.ctaText,
                      preset: state.preset,
                      borderRadius: state.borderRadius,
                      opacity: state.opacity,
                      icon: state.icon,
                      allPages: state.allPages,
                      cooldownHours: state.cooldownHours,
                    })
                  })
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (data.ok) {
                      showStatus('저장되었습니다.', true);
                    } else {
                      showStatus('저장 실패: ' + (data.error || '알 수 없는 오류'), false);
                    }
                  })
                  .catch(function() { showStatus('네트워크 오류', false); })
                  .finally(function() { btn.disabled = false; btn.textContent = '저장'; });
                });

                // ── 기본값 되돌리기 ──
                document.getElementById('popupResetBtn').addEventListener('click', function() {
                  state = Object.assign({}, DEFAULTS);
                  applyState();
                  showStatus('기본값으로 되돌렸습니다. 저장 버튼을 눌러 적용하세요.', true);
                });

                // ── 초기 로드 ──
                fetch('/api/dashboard/shops/' + SHOP_ID + '/popup')
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (data.ok && data.popup_config) {
                      var c = data.popup_config;
                      state.enabled = c.enabled !== false;
                      state.title = c.title || DEFAULTS.title;
                      state.body = c.body || DEFAULTS.body;
                      state.ctaText = c.ctaText || DEFAULTS.ctaText;
                      state.preset = c.preset != null ? c.preset : DEFAULTS.preset;
                      state.borderRadius = c.borderRadius != null ? c.borderRadius : DEFAULTS.borderRadius;
                      state.opacity = c.opacity != null ? c.opacity : DEFAULTS.opacity;
                      state.icon = c.icon != null ? c.icon : DEFAULTS.icon;
                      state.allPages = c.allPages === true;
                      state.cooldownHours = c.cooldownHours || DEFAULTS.cooldownHours;
                    }
                    applyState();
                  })
                  .catch(function() { applyState(); });

                // AI 추천 문구 로드
                (async function() {
                  try {
                    var resp = await fetch('/api/dashboard/shops/' + SHOP_ID + '/ai-copy', { credentials: 'same-origin' });
                    if (!resp.ok) return;
                    var data = await resp.json();
                    var copy = data.copy;
                    if (!copy || (!copy.popupTitle && !copy.popupBody && !copy.popupCta)) return;
                    if (copy.popupTitle) document.getElementById('aiPopupTitle').textContent = copy.popupTitle;
                    if (copy.popupBody) document.getElementById('aiPopupBody').textContent = copy.popupBody;
                    if (copy.popupCta) document.getElementById('aiPopupCta').textContent = copy.popupCta;
                    document.getElementById('aiPopupSuggestion').style.display = 'block';
                    document.getElementById('applyPopupCopy').addEventListener('click', function() {
                      if (copy.popupTitle) { document.getElementById('popupTitle').value = copy.popupTitle; state.title = copy.popupTitle; document.getElementById('popupPreviewTitle').textContent = copy.popupTitle; }
                      if (copy.popupBody) { document.getElementById('popupBody').value = copy.popupBody; state.body = copy.popupBody; document.getElementById('popupPreviewBody').innerHTML = copy.popupBody.replace(/\\n/g, '<br>'); }
                      if (copy.popupCta) { document.getElementById('popupCta').value = copy.popupCta; state.ctaText = copy.popupCta; document.getElementById('popupPreviewCta').textContent = copy.popupCta; }
                    });
                  } catch(e) {}
                })();
              })();
            `}} />
          </div>
        )
      }
    </Layout>
  );
};

// ─── Escalation Settings Page [Plus] ────────────────────────

export const EscalationSettingsPage: FC<{
  shop: { shop_id: string; plan: string } | null;
  isCafe24?: boolean;
}> = ({ shop, isCafe24 }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  const shopId = shop?.shop_id || '';
  return (
    <Layout title="에스컬레이션" loggedIn currentPath="/dashboard/settings/escalation" isCafe24={isCafe24}>
      <h1>에스컬레이션</h1>
      {!isPlus
        ? <PlusLockOverlay feature="에스컬레이션" />
        : (
          <div>
            <div class="card">
              <h2>에스컬레이션 설정</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:4px">비로그인 방문자의 재방문 횟수에 따라 단계적으로 가입을 유도합니다.</p>
              <p style="font-size:13px;color:#64748b;margin-bottom:20px">방문 횟수에 따라 토스트 메시지 → 플로팅 배너로 단계적 유도합니다.</p>

              {/* 미리보기 (상단 항상 표시) */}
              <div style="margin-bottom:20px">
                <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">미리보기</p>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                  {/* 토스트 미리보기 */}
                  <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                      <span id="toastBadge" style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 4px;background:#111827;color:white;border-radius:10px;font-size:10px;font-weight:700;flex-shrink:0">2~3</span>
                      <p id="toastLabel" style="font-size:11px;color:#94a3b8;margin:0">2~3회 방문 — 화면 하단 토스트</p>
                    </div>
                    <div style="display:inline-block">
                      <div id="toastPreview" style="background:#111827;color:white;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:500;white-space:nowrap">
                        이미 2번째 방문이에요 :)
                      </div>
                    </div>
                  </div>
                  {/* 플로팅 배너 미리보기 */}
                  <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;padding:20px">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
                      <span id="floatingBadge" style="display:inline-flex;align-items:center;justify-content:center;min-width:20px;height:20px;padding:0 4px;background:linear-gradient(135deg,#2563eb,#ec4899);color:white;border-radius:10px;font-size:10px;font-weight:700;flex-shrink:0">4+</span>
                      <p id="floatingLabel" style="font-size:11px;color:#94a3b8;margin:0">4회 이상 방문 — 화면 하단 고정 배너</p>
                    </div>
                    <div id="floatingBannerPreview" style="background:linear-gradient(135deg,#2563eb 0%,#ec4899 100%);border-radius:0px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
                      <span id="floatingTextPreview" style="color:white;font-size:13px;font-weight:600">회원가입하면 특별 혜택!</span>
                      <button id="floatingBtnPreview" style="flex-shrink:0;padding:6px 14px;background:white;color:#2563eb;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">
                        바로 가입하기
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 설정 영역 (펼치기/접기) */}
              <div>
                <div id="escalationSettingsToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px">
                  <span style="font-size:14px;font-weight:600;color:#374151">상세 설정</span>
                  <span id="escalationSettingsArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
                </div>
                <div id="escalationSettingsBody" style="display:none">
                  {/* 첫 줄: 토글들 */}
                  <div style="display:flex;gap:24px;margin-bottom:16px">
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">에스컬레이션 활성화</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="escEnabledToggle" style="width:40px;height:22px;background:#2563eb;border-radius:11px;position:relative;cursor:pointer">
                          <div id="escEnabledKnob" style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="escEnabledLabel" style="font-size:13px;color:#374151">활성화됨</span>
                      </div>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">이전 로그인 기록 있으면 표시 안함</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="escHideToggle" style="width:40px;height:22px;background:#d1d5db;border-radius:11px;position:relative;cursor:pointer">
                          <div id="escHideKnob" style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="escHideLabel" style="font-size:13px;color:#374151">로그인 기록 무시</span>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:4px">켜면 과거에 로그인한 이력이 있는 방문자에게는 표시 안 함</p>
                    </div>
                  </div>

                  {/* 방문 횟수 설정 */}
                  <div style="display:flex;gap:24px;margin-bottom:16px">
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">토스트 메시지 표시 <span style="font-weight:400;color:#94a3b8">(시작~끝 방문 횟수)</span></label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <input type="number" id="escToastStart" min="2" max="10" value="2" style="width:60px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;text-align:center" />
                        <span style="font-size:13px;color:#64748b">~</span>
                        <input type="number" id="escToastEnd" min="2" max="10" value="3" style="width:60px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;text-align:center" />
                        <span style="font-size:13px;color:#64748b">회 방문</span>
                      </div>
                    </div>
                    <div class="form-group" style="flex:1">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px">플로팅 배너 표시 <span style="font-weight:400;color:#94a3b8">(자동 계산)</span></label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <span id="escFloatingStartDisplay" style="display:inline-block;width:60px;padding:8px 12px;background:#f3f4f6;border:1px solid #d1d5db;border-radius:6px;font-size:13px;text-align:center;color:#6b7280">4</span>
                        <span style="font-size:13px;color:#64748b">회 이상 방문</span>
                      </div>
                    </div>
                  </div>

                  <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px" />

                  {/* 토스트 섹션 */}
                  <div style="margin-bottom:20px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
                      <span id="toastSectionBadge" style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;background:#111827;color:white;border-radius:12px;font-size:11px;font-weight:700;flex-shrink:0">2~3</span>
                      <h3 style="font-size:14px;font-weight:600;margin:0">토스트 메시지</h3>
                      <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
                        <div id="toastEnabledToggle" style="width:36px;height:20px;background:#2563eb;border-radius:10px;position:relative;cursor:pointer">
                          <div id="toastEnabledKnob" style="position:absolute;top:2px;right:2px;width:16px;height:16px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="toastEnabledLabel" style="font-size:12px;color:#374151">{"\uC0AC\uC6A9"}</span>
                      </div>
                    </div>
                    <div class="form-group" style="margin-bottom:14px">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="toastText">토스트 메시지 <span style="font-weight:400;color:#94a3b8">(최대 30자)</span></label>
                      <input type="text" id="toastText" maxlength={30} placeholder={"안녕하세요. {n}번째 방문을 환영합니다."} style="width:320px;max-width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box" />
                      <p style="font-size:11px;color:#94a3b8;margin-top:4px">{"  {n} 을 입력하면 실제 방문 횟수로 대치됩니다. 예: \"이미 {n}번째 방문이에요\" → \"이미 3번째 방문이에요\""}</p>
                    </div>
                    <div id="aiEscalationSuggestion" style="display:none;margin-bottom:14px;padding:10px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;font-size:12px">
                      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                        <span style="color:#1e40af;font-weight:600">AI 추천 문구</span>
                        <button id="applyEscalationCopy" type="button" style="padding:2px 10px;background:#2563eb;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">적용</button>
                      </div>
                      <div style="display:grid;gap:4px;color:#1e40af">
                        <div>토스트: <span id="aiToastText"></span></div>
                        <div>배너: <span id="aiFloatingText"></span></div>
                        <div>버튼: <span id="aiFloatingBtnText"></span></div>
                      </div>
                    </div>
                    <div style="display:flex;gap:24px;margin-bottom:14px">
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">토스트 스타일</label>
                        <div style="display:flex;gap:8px">
                          <div class="esc-toast-style-card" data-style="0" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:3px solid #2563eb;overflow:hidden;background:#111827;display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600">다크</span>
                          </div>
                          <div class="esc-toast-style-card" data-style="1" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #e5e7eb;overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
                            <span style="color:#111827;font-size:9px;font-weight:600">라이트</span>
                          </div>
                          <div class="esc-toast-style-card" data-style="2" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:#6b7280;display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600">회색</span>
                          </div>
                          <div class="esc-toast-style-card" data-style="3" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #93c5fd;overflow:hidden;background:#eff6ff;display:flex;align-items:center;justify-content:center">
                            <span style="color:#2563eb;font-size:9px;font-weight:600">밝은 파랑</span>
                          </div>
                        </div>
                      </div>
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">출현 효과</label>
                        <div style="display:flex;gap:8px">
                          <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid #2563eb;background:#eff6ff" class="toast-anim-label">
                            <input type="radio" name="toastAnim" value="fadeIn" checked style="display:none" /> 페이드인
                          </label>
                          <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid #e5e7eb;background:#fff" class="toast-anim-label">
                            <input type="radio" name="toastAnim" value="slideUp" style="display:none" /> 슬라이드업
                          </label>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:24px">
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">투명도</label>
                        <div style="display:flex;align-items:center;gap:12px">
                          <input type="range" min="10" max="100" value="96" id="toastOpacity" style="flex:1" />
                          <span id="toastOpacityValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">96%</span>
                        </div>
                      </div>
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">모서리 둥글기</label>
                        <div style="display:flex;align-items:center;gap:12px">
                          <input type="range" min="0" max="20" value="20" id="toastBorderRadius" style="flex:1" />
                          <span id="toastBorderRadiusValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">20px</span>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:24px;margin-top:14px">
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">표시 시간</label>
                        <div style="display:flex;align-items:center;gap:12px">
                          <input type="range" min="1" max="10" value="5" id="toastDuration" style="flex:1" />
                          <span id="toastDurationValue" style="font-size:13px;min-width:28px;text-align:right;color:#374151">5초</span>
                        </div>
                      </div>
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">계속 표시</label>
                        <div style="display:flex;align-items:center;gap:8px">
                          <div id="toastPersistToggle" style="width:40px;height:22px;background:#d1d5db;border-radius:11px;position:relative;cursor:pointer">
                            <div id="toastPersistKnob" style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                          </div>
                          <span id="toastPersistLabel" style="font-size:13px;color:#374151">자동 사라짐</span>
                        </div>
                        <p style="font-size:11px;color:#94a3b8;margin-top:4px">켜면 닫기 버튼을 누를 때까지 유지</p>
                      </div>
                    </div>
                  </div>

                  <hr style="border:none;border-top:1px solid #e5e7eb;margin-bottom:20px" />

                  {/* 플로팅 배너 섹션 */}
                  <div style="margin-bottom:20px">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
                      <span id="floatingSectionBadge" style="display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 6px;background:linear-gradient(135deg,#2563eb,#ec4899);color:white;border-radius:12px;font-size:11px;font-weight:700;flex-shrink:0">4+</span>
                      <h3 style="font-size:14px;font-weight:600;margin:0">플로팅 배너</h3>
                      <div style="display:flex;align-items:center;gap:6px;margin-left:12px">
                        <div id="floatingEnabledToggle" style="width:36px;height:20px;background:#2563eb;border-radius:10px;position:relative;cursor:pointer">
                          <div id="floatingEnabledKnob" style="position:absolute;top:2px;right:2px;width:16px;height:16px;background:white;border-radius:50%;transition:all 0.2s"></div>
                        </div>
                        <span id="floatingEnabledLabel" style="font-size:12px;color:#374151">{"\uC0AC\uC6A9"}</span>
                      </div>
                    </div>
                    <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:14px">
                      <div style="flex:1;min-width:200px">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="floatingText">배너 텍스트 <span style="font-weight:400;color:#94a3b8">(최대 30자)</span></label>
                        <input type="text" id="floatingText" maxlength={30} placeholder="회원가입하면 특별 혜택!" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box" />
                        <p style="font-size:11px;color:#94a3b8;margin-top:4px">{"토스트와 동일하게 {n}으로 방문 횟수 표시 가능"}</p>
                      </div>
                      <div style="flex:1;min-width:200px">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="floatingBtnText">버튼 텍스트 <span style="font-weight:400;color:#94a3b8">(최대 20자)</span></label>
                        <input type="text" id="floatingBtnText" maxlength={20} placeholder="바로 가입하기" style="width:100%;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box" />
                      </div>
                    </div>
                    <div style="display:flex;gap:24px;margin-bottom:14px">
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px">플로팅 배너 프리셋</label>
                        <div style="display:flex;gap:8px;flex-wrap:wrap">
                          <div class="esc-floating-preset-card" data-preset="0" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:3px solid #2563eb;overflow:hidden;background:linear-gradient(135deg,#2563eb,#ec4899);display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">파랑-보라</span>
                          </div>
                          <div class="esc-floating-preset-card" data-preset="1" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:#111827;display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">다크</span>
                          </div>
                          <div class="esc-floating-preset-card" data-preset="2" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:linear-gradient(135deg,#ec4899,#f43f5e);display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">핑크</span>
                          </div>
                          <div class="esc-floating-preset-card" data-preset="3" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:#6b7280;display:flex;align-items:center;justify-content:center">
                            <span style="color:white;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">회색</span>
                          </div>
                          <div class="esc-floating-preset-card" data-preset="4" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #e5e7eb;overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center">
                            <span style="color:#111827;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">라이트</span>
                          </div>
                        </div>
                      </div>
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">출현 효과</label>
                        <div style="display:flex;gap:8px">
                          <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid #2563eb;background:#eff6ff" class="floating-anim-label">
                            <input type="radio" name="floatingAnim" value="fadeIn" checked style="display:none" /> 페이드인
                          </label>
                          <label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid #e5e7eb;background:#fff" class="floating-anim-label">
                            <input type="radio" name="floatingAnim" value="slideUp" style="display:none" /> 슬라이드업
                          </label>
                        </div>
                      </div>
                    </div>
                    <div style="display:flex;gap:24px">
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">투명도</label>
                        <div style="display:flex;align-items:center;gap:12px">
                          <input type="range" min="10" max="100" value="96" id="floatingOpacity" style="flex:1" />
                          <span id="floatingOpacityValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">100%</span>
                        </div>
                      </div>
                      <div style="flex:1">
                        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">모서리 둥글기</label>
                        <div style="display:flex;align-items:center;gap:12px">
                          <input type="range" min="0" max="20" value="0" id="floatingBorderRadius" style="flex:1" />
                          <span id="floatingBorderRadiusValue" style="font-size:13px;min-width:36px;text-align:right;color:#374151">0px</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 저장 버튼 */}
                  <div style="display:flex;gap:8px">
                    <button id="escSaveBtn" style="flex:1;padding:10px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">저장</button>
                    <button id="escResetBtn" style="padding:10px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">기본값 되돌리기</button>
                  </div>
                  <div id="escSaveStatus" style="display:none;padding:10px 16px;border-radius:8px;margin-top:12px;font-size:13px"></div>
                </div>
              </div>
            </div>
            <script dangerouslySetInnerHTML={{__html: `
              (function() {
                var SHOP_ID = '${shopId}';
                var DEFAULTS = {
                  enabled: true,
                  hideForReturning: true,
                  toastEnabled: true,
                  floatingEnabled: true,
                  toastStartVisit: 2,
                  toastEndVisit: 3,
                  toastText: '\uC548\uB155\uD558\uC138\uC694. {n}\uBC88\uC9F8 \uBC29\uBB38\uC744 \uD658\uC601\uD569\uB2C8\uB2E4.',
                  toastStyle: 0,
                  toastOpacity: 96,
                  toastBorderRadius: 20,
                  toastAnimation: 'fadeIn',
                  toastDuration: 5,
                  toastPersist: false,
                  floatingText: '\uD68C\uC6D0\uAC00\uC785\uD558\uBA74 \uD2B9\uBCC4 \uD61C\uD0DD!',
                  floatingBtnText: '\uBC14\uB85C \uAC00\uC785\uD558\uAE30',
                  floatingPreset: 0,
                  floatingOpacity: 100,
                  floatingBorderRadius: 0,
                  floatingAnimation: 'slideUp',
                };
                var floatingPresets = [
                  { bg: 'linear-gradient(135deg, #2563eb, #ec4899)', color: 'white', btnColor: '#2563eb', btnBg: 'white' },
                  { bg: '#111827', color: 'white', btnColor: '#374151', btnBg: 'white' },
                  { bg: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: 'white', btnColor: '#ec4899', btnBg: 'white' },
                  { bg: '#6b7280', color: 'white', btnColor: '#6b7280', btnBg: 'white' },
                  { bg: '#ffffff', color: '#111827', btnColor: 'white', btnBg: '#2563eb', border: '1px solid #e5e7eb' },
                ];
                var toastStyles = [
                  { bg: 'rgba(30,30,30,.92)', color: '#fff', shadow: 'none' },
                  { bg: '#ffffff', color: '#111827', shadow: '0 4px 16px rgba(0,0,0,0.12)' },
                  { bg: '#6b7280', color: '#fff', shadow: 'none' },
                  { bg: '#eff6ff', color: '#2563eb', shadow: '0 2px 8px rgba(37,99,235,0.15)', border: '1px solid #93c5fd' },
                ];
                var state = Object.assign({}, DEFAULTS);

                // ── 펼치기/접기 ──
                var settingsToggle = document.getElementById('escalationSettingsToggle');
                var settingsBody = document.getElementById('escalationSettingsBody');
                var settingsArrow = document.getElementById('escalationSettingsArrow');
                var settingsOpen = false;
                if (settingsToggle) settingsToggle.addEventListener('click', function() {
                  settingsOpen = !settingsOpen;
                  if (settingsBody) settingsBody.style.display = settingsOpen ? 'block' : 'none';
                  if (settingsArrow) settingsArrow.style.transform = settingsOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
                });

                // ── 방문 횟수 설정 ──
                function updateVisitLabels() {
                  var s = state.toastStartVisit;
                  var e = state.toastEndVisit;
                  var f = e + 1;
                  var range = s === e ? s : s + '~' + e;
                  var tb = document.getElementById('toastBadge'); if (tb) tb.textContent = range;
                  var tl = document.getElementById('toastLabel'); if (tl) tl.textContent = range + '\uD68C \uBC29\uBB38 \u2014 \uD654\uBA74 \uD558\uB2E8 \uD1A0\uC2A4\uD2B8';
                  var fb = document.getElementById('floatingBadge'); if (fb) fb.textContent = f + '+';
                  var fl = document.getElementById('floatingLabel'); if (fl) fl.textContent = f + '\uD68C \uC774\uC0C1 \uBC29\uBB38 \u2014 \uD654\uBA74 \uD558\uB2E8 \uACE0\uC815 \uBC30\uB108';
                  var tsb = document.getElementById('toastSectionBadge'); if (tsb) tsb.textContent = range;
                  var fsb = document.getElementById('floatingSectionBadge'); if (fsb) fsb.textContent = f + '+';
                  var fsd = document.getElementById('escFloatingStartDisplay'); if (fsd) fsd.textContent = f;
                  if (typeof updateToastPreviewText === 'function') updateToastPreviewText();
                  if (typeof updateFloatingPreviewText === 'function') updateFloatingPreviewText();
                }
                var toastStartInput = document.getElementById('escToastStart');
                var toastEndInput = document.getElementById('escToastEnd');
                if (toastStartInput) toastStartInput.addEventListener('input', function() {
                  state.toastStartVisit = Math.max(2, parseInt(this.value) || 2);
                  if (state.toastEndVisit < state.toastStartVisit) {
                    state.toastEndVisit = state.toastStartVisit;
                    if (toastEndInput) toastEndInput.value = state.toastEndVisit;
                  }
                  updateVisitLabels();
                });
                if (toastEndInput) toastEndInput.addEventListener('input', function() {
                  state.toastEndVisit = Math.max(state.toastStartVisit, parseInt(this.value) || state.toastStartVisit);
                  updateVisitLabels();
                });

                function showStatus(msg, ok) {
                  var el = document.getElementById('escSaveStatus');
                  if (!el) return;
                  el.textContent = msg;
                  el.style.display = 'block';
                  el.style.background = ok ? '#dcfce7' : '#fee2e2';
                  el.style.color = ok ? '#166534' : '#991b1b';
                  el.style.border = '1px solid ' + (ok ? '#bbf7d0' : '#fecaca');
                  setTimeout(function() { el.style.display = 'none'; }, 3000);
                }

                // ── 토글: 활성화 ──
                function renderEnabled() {
                  var t = document.getElementById('escEnabledToggle');
                  var k = document.getElementById('escEnabledKnob');
                  var l = document.getElementById('escEnabledLabel');
                  if (!t) return;
                  t.style.background = state.enabled ? '#2563eb' : '#d1d5db';
                  if (k) { k.style.right = state.enabled ? '2px' : 'auto'; k.style.left = state.enabled ? 'auto' : '2px'; }
                  if (l) l.textContent = state.enabled ? '\ud65c\uc131\ud654\ub428' : '\ube44\ud65c\uc131\ud654';
                }
                var enabledToggle = document.getElementById('escEnabledToggle');
                if (enabledToggle) enabledToggle.addEventListener('click', function() { state.enabled = !state.enabled; renderEnabled(); });

                // ── 토글: hideForReturning ──
                function renderHide() {
                  var t = document.getElementById('escHideToggle');
                  var k = document.getElementById('escHideKnob');
                  var l = document.getElementById('escHideLabel');
                  if (!t) return;
                  t.style.background = state.hideForReturning ? '#2563eb' : '#d1d5db';
                  if (k) { k.style.right = state.hideForReturning ? '2px' : 'auto'; k.style.left = state.hideForReturning ? 'auto' : '2px'; }
                  if (l) l.textContent = state.hideForReturning ? '\ub85c\uadf8\uc778 \uae30\ub85d \uc788\uc73c\uba74 \uc228\uae40' : '\ub85c\uadf8\uc778 \uae30\ub85d \ubb34\uc2dc';
                }
                var hideToggle = document.getElementById('escHideToggle');
                if (hideToggle) hideToggle.addEventListener('click', function() { state.hideForReturning = !state.hideForReturning; renderHide(); });

                // ── 프리셋 ──
                function applyFloatingPreset(i) {
                  state.floatingPreset = i;
                  var p = floatingPresets[i];
                  var banner = document.getElementById('floatingBannerPreview');
                  var textEl = document.getElementById('floatingTextPreview');
                  var btnEl = document.getElementById('floatingBtnPreview');
                  if (banner) { banner.style.background = p.bg; banner.style.border = p.border || 'none'; }
                  if (textEl) textEl.style.color = p.color;
                  if (btnEl) { btnEl.style.color = p.btnColor; btnEl.style.background = p.btnBg || 'white'; }
                  document.querySelectorAll('.esc-floating-preset-card').forEach(function(c, idx) {
                    c.style.border = idx === i ? '3px solid #2563eb' : '2px solid transparent';
                  });
                }
                document.querySelectorAll('.esc-floating-preset-card').forEach(function(card) {
                  card.addEventListener('click', function() { applyFloatingPreset(parseInt(this.dataset.preset)); });
                });

                // ── 토스트 스타일 ──
                function applyToastStyle(i) {
                  state.toastStyle = i;
                  var s = toastStyles[i];
                  var toast = document.getElementById('toastPreview');
                  if (toast) {
                    toast.style.background = s.bg;
                    toast.style.color = s.color;
                    toast.style.boxShadow = s.shadow || 'none';
                    toast.style.border = s.border || 'none';
                  }
                  document.querySelectorAll('.esc-toast-style-card').forEach(function(c, idx) {
                    c.style.border = idx === i ? '3px solid #2563eb' : '2px solid #e5e7eb';
                  });
                }
                document.querySelectorAll('.esc-toast-style-card').forEach(function(card) {
                  card.addEventListener('click', function() { applyToastStyle(parseInt(this.dataset.style)); });
                });

                // ── 출현 효과 미리보기 재생 ──
                function replayToastPreview() {
                  var toast = document.getElementById('toastPreview');
                  if (!toast) return;
                  toast.style.transition = 'none';
                  toast.style.opacity = '0';
                  toast.style.transform = state.toastAnimation === 'slideUp' ? 'translateY(20px)' : 'none';
                  toast.offsetHeight;
                  toast.style.transition = 'all 1.6s ease';
                  toast.style.opacity = String(state.toastOpacity / 100);
                  toast.style.transform = 'translateY(0)';
                }
                function replayFloatingPreview() {
                  var banner = document.getElementById('floatingBannerPreview');
                  if (!banner) return;
                  banner.style.transition = 'none';
                  banner.style.opacity = '0';
                  banner.style.transform = state.floatingAnimation === 'slideUp' ? 'translateY(20px)' : 'none';
                  banner.offsetHeight;
                  banner.style.transition = 'all 1.6s ease';
                  banner.style.opacity = String(state.floatingOpacity / 100);
                  banner.style.transform = 'translateY(0)';
                }
                function renderToastAnimLabels() {
                  document.querySelectorAll('.toast-anim-label').forEach(function(lbl) {
                    var r = lbl.querySelector('input[type="radio"]');
                    if (!r) return;
                    if (r.value === state.toastAnimation) {
                      lbl.style.border = '2px solid #2563eb';
                      lbl.style.background = '#eff6ff';
                    } else {
                      lbl.style.border = '2px solid #e5e7eb';
                      lbl.style.background = '#fff';
                    }
                  });
                }
                function renderFloatingAnimLabels() {
                  document.querySelectorAll('.floating-anim-label').forEach(function(lbl) {
                    var r = lbl.querySelector('input[type="radio"]');
                    if (!r) return;
                    if (r.value === state.floatingAnimation) {
                      lbl.style.border = '2px solid #2563eb';
                      lbl.style.background = '#eff6ff';
                    } else {
                      lbl.style.border = '2px solid #e5e7eb';
                      lbl.style.background = '#fff';
                    }
                  });
                }
                // ── 출현 효과 라디오 ──
                document.querySelectorAll('input[name="toastAnim"]').forEach(function(r) {
                  r.addEventListener('change', function() {
                    if (this.checked) {
                      state.toastAnimation = this.value;
                      renderToastAnimLabels();
                      replayToastPreview();
                    }
                  });
                });
                document.querySelectorAll('input[name="floatingAnim"]').forEach(function(r) {
                  r.addEventListener('change', function() {
                    if (this.checked) {
                      state.floatingAnimation = this.value;
                      renderFloatingAnimLabels();
                      replayFloatingPreview();
                    }
                  });
                });

                // ── 슬라이더 ──
                var toastOpacitySlider = document.getElementById('toastOpacity');
                if (toastOpacitySlider) toastOpacitySlider.addEventListener('input', function() {
                  state.toastOpacity = parseInt(this.value);
                  document.getElementById('toastOpacityValue').textContent = this.value + '%';
                  var toast = document.getElementById('toastPreview');
                  if (toast) toast.style.opacity = (state.toastOpacity / 100).toString();
                });

                var toastRadiusSlider = document.getElementById('toastBorderRadius');
                if (toastRadiusSlider) toastRadiusSlider.addEventListener('input', function() {
                  state.toastBorderRadius = parseInt(this.value);
                  document.getElementById('toastBorderRadiusValue').textContent = this.value + 'px';
                  var toast = document.getElementById('toastPreview');
                  if (toast) toast.style.borderRadius = this.value + 'px';
                });

                var toastDurationSlider = document.getElementById('toastDuration');
                if (toastDurationSlider) toastDurationSlider.addEventListener('input', function() {
                  state.toastDuration = parseInt(this.value);
                  document.getElementById('toastDurationValue').textContent = this.value + '\uCD08';
                });

                // ── 토글: 계속 표시 ──
                function renderPersist() {
                  var t = document.getElementById('toastPersistToggle');
                  var k = document.getElementById('toastPersistKnob');
                  var l = document.getElementById('toastPersistLabel');
                  if (!t) return;
                  t.style.background = state.toastPersist ? '#2563eb' : '#d1d5db';
                  if (k) { k.style.right = state.toastPersist ? '2px' : 'auto'; k.style.left = state.toastPersist ? 'auto' : '2px'; }
                  if (l) l.textContent = state.toastPersist ? '\uACC4\uC18D \uD45C\uC2DC' : '\uC790\uB3D9 \uC0AC\uB77C\uC9D0';
                  if (toastDurationSlider) {
                    toastDurationSlider.disabled = state.toastPersist;
                    toastDurationSlider.parentElement.style.opacity = state.toastPersist ? '0.4' : '1';
                  }
                }
                var persistToggle = document.getElementById('toastPersistToggle');
                if (persistToggle) persistToggle.addEventListener('click', function() { state.toastPersist = !state.toastPersist; renderPersist(); });

                function renderToastEnabled() {
                  var t = document.getElementById('toastEnabledToggle');
                  var k = document.getElementById('toastEnabledKnob');
                  var l = document.getElementById('toastEnabledLabel');
                  if (!t) return;
                  t.style.background = state.toastEnabled ? '#2563eb' : '#d1d5db';
                  if (k) { k.style.right = state.toastEnabled ? '2px' : 'auto'; k.style.left = state.toastEnabled ? 'auto' : '2px'; }
                  if (l) l.textContent = state.toastEnabled ? '\uC0AC\uC6A9' : '\uC0AC\uC6A9\uC548\uD568';
                }
                var toastEnabledToggle = document.getElementById('toastEnabledToggle');
                if (toastEnabledToggle) toastEnabledToggle.addEventListener('click', function() { state.toastEnabled = !state.toastEnabled; renderToastEnabled(); });

                function renderFloatingEnabled() {
                  var t = document.getElementById('floatingEnabledToggle');
                  var k = document.getElementById('floatingEnabledKnob');
                  var l = document.getElementById('floatingEnabledLabel');
                  if (!t) return;
                  t.style.background = state.floatingEnabled ? '#2563eb' : '#d1d5db';
                  if (k) { k.style.right = state.floatingEnabled ? '2px' : 'auto'; k.style.left = state.floatingEnabled ? 'auto' : '2px'; }
                  if (l) l.textContent = state.floatingEnabled ? '\uC0AC\uC6A9' : '\uC0AC\uC6A9\uC548\uD568';
                }
                var floatingEnabledToggle = document.getElementById('floatingEnabledToggle');
                if (floatingEnabledToggle) floatingEnabledToggle.addEventListener('click', function() { state.floatingEnabled = !state.floatingEnabled; renderFloatingEnabled(); });

                var floatingOpacitySlider = document.getElementById('floatingOpacity');
                if (floatingOpacitySlider) floatingOpacitySlider.addEventListener('input', function() {
                  state.floatingOpacity = parseInt(this.value);
                  document.getElementById('floatingOpacityValue').textContent = this.value + '%';
                  var banner = document.getElementById('floatingBannerPreview');
                  if (banner) banner.style.opacity = (state.floatingOpacity / 100).toString();
                });

                var floatingRadiusSlider = document.getElementById('floatingBorderRadius');
                if (floatingRadiusSlider) floatingRadiusSlider.addEventListener('input', function() {
                  state.floatingBorderRadius = parseInt(this.value);
                  document.getElementById('floatingBorderRadiusValue').textContent = this.value + 'px';
                  var banner = document.getElementById('floatingBannerPreview');
                  if (banner) banner.style.borderRadius = this.value + 'px';
                });

                // ── 미리보기 바인딩 ({n} 치환 포함) ──
                function previewWithN(text, visitNum) {
                  return text.replace(/\\{n\\}/g, String(visitNum));
                }
                function updateToastPreviewText() {
                  var preview = document.getElementById('toastPreview');
                  if (preview) preview.textContent = previewWithN(state.toastText, state.toastStartVisit);
                }
                function updateFloatingPreviewText() {
                  var preview = document.getElementById('floatingTextPreview');
                  if (preview) preview.textContent = previewWithN(state.floatingText, state.toastEndVisit + 1);
                }
                var toastTextInput = document.getElementById('toastText');
                if (toastTextInput) toastTextInput.addEventListener('input', function() {
                  state.toastText = this.value || DEFAULTS.toastText;
                  updateToastPreviewText();
                });
                var floatingTextInput = document.getElementById('floatingText');
                if (floatingTextInput) floatingTextInput.addEventListener('input', function() {
                  state.floatingText = this.value || DEFAULTS.floatingText;
                  updateFloatingPreviewText();
                });
                var floatingBtnTextInput = document.getElementById('floatingBtnText');
                var floatingBtnPreview = document.getElementById('floatingBtnPreview');
                if (floatingBtnTextInput && floatingBtnPreview) floatingBtnTextInput.addEventListener('input', function() {
                  state.floatingBtnText = this.value || DEFAULTS.floatingBtnText;
                  floatingBtnPreview.textContent = state.floatingBtnText;
                });

                // ── UI에 상태 반영 ──
                function applyState() {
                  var toastInput = document.getElementById('toastText');
                  if (toastInput) toastInput.value = state.toastText === DEFAULTS.toastText ? '' : state.toastText;
                  updateToastPreviewText();

                  var floatingInput = document.getElementById('floatingText');
                  if (floatingInput) floatingInput.value = state.floatingText === DEFAULTS.floatingText ? '' : state.floatingText;
                  updateFloatingPreviewText();

                  var floatingBtnInput = document.getElementById('floatingBtnText');
                  if (floatingBtnInput) floatingBtnInput.value = state.floatingBtnText === DEFAULTS.floatingBtnText ? '' : state.floatingBtnText;
                  var floatingBtnPrev = document.getElementById('floatingBtnPreview');
                  if (floatingBtnPrev) floatingBtnPrev.textContent = state.floatingBtnText;

                  if (toastOpacitySlider) { toastOpacitySlider.value = state.toastOpacity; document.getElementById('toastOpacityValue').textContent = state.toastOpacity + '%'; }
                  var toastPrevEl = document.getElementById('toastPreview');
                  if (toastPrevEl) toastPrevEl.style.opacity = (state.toastOpacity / 100).toString();

                  if (toastRadiusSlider) { toastRadiusSlider.value = state.toastBorderRadius; document.getElementById('toastBorderRadiusValue').textContent = state.toastBorderRadius + 'px'; }
                  var toastPrevEl2 = document.getElementById('toastPreview');
                  if (toastPrevEl2) toastPrevEl2.style.borderRadius = state.toastBorderRadius + 'px';

                  if (floatingOpacitySlider) { floatingOpacitySlider.value = state.floatingOpacity; document.getElementById('floatingOpacityValue').textContent = state.floatingOpacity + '%'; }
                  var bannerPrevEl = document.getElementById('floatingBannerPreview');
                  if (bannerPrevEl) bannerPrevEl.style.opacity = (state.floatingOpacity / 100).toString();

                  if (floatingRadiusSlider) { floatingRadiusSlider.value = state.floatingBorderRadius; document.getElementById('floatingBorderRadiusValue').textContent = state.floatingBorderRadius + 'px'; }
                  var bannerPrevEl2 = document.getElementById('floatingBannerPreview');
                  if (bannerPrevEl2) bannerPrevEl2.style.borderRadius = state.floatingBorderRadius + 'px';

                  applyFloatingPreset(state.floatingPreset);
                  applyToastStyle(state.toastStyle);

                  document.querySelectorAll('input[name="toastAnim"]').forEach(function(r) { r.checked = r.value === state.toastAnimation; });
                  document.querySelectorAll('input[name="floatingAnim"]').forEach(function(r) { r.checked = r.value === state.floatingAnimation; });
                  renderToastAnimLabels();
                  renderFloatingAnimLabels();

                  if (toastStartInput) toastStartInput.value = state.toastStartVisit;
                  if (toastEndInput) toastEndInput.value = state.toastEndVisit;
                  updateVisitLabels();

                  if (toastDurationSlider) { toastDurationSlider.value = state.toastDuration; document.getElementById('toastDurationValue').textContent = state.toastDuration + '\uCD08'; }

                  renderEnabled();
                  renderHide();
                  renderPersist();
                  renderToastEnabled();
                  renderFloatingEnabled();
                }

                // ── 저장 ──
                var saveBtn = document.getElementById('escSaveBtn');
                if (saveBtn) saveBtn.addEventListener('click', function() {
                  var btn = this;
                  btn.disabled = true;
                  btn.textContent = '\uc800\uc7a5 \uc911...';
                  fetch('/api/dashboard/shops/' + SHOP_ID + '/escalation', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      enabled: state.enabled,
                      hideForReturning: state.hideForReturning,
                      toastEnabled: state.toastEnabled,
                      toastStartVisit: state.toastStartVisit,
                      toastEndVisit: state.toastEndVisit,
                      toastText: state.toastText,
                      toastStyle: state.toastStyle,
                      toastOpacity: state.toastOpacity,
                      toastBorderRadius: state.toastBorderRadius,
                      toastAnimation: state.toastAnimation,
                      toastDuration: state.toastDuration,
                      toastPersist: state.toastPersist,
                      floatingEnabled: state.floatingEnabled,
                      floatingText: state.floatingText,
                      floatingBtnText: state.floatingBtnText,
                      floatingPreset: state.floatingPreset,
                      floatingOpacity: state.floatingOpacity,
                      floatingBorderRadius: state.floatingBorderRadius,
                      floatingAnimation: state.floatingAnimation,
                    })
                  })
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (data.ok) {
                      showStatus('\uc800\uc7a5\ub418\uc5c8\uc2b5\ub2c8\ub2e4.', true);
                    } else {
                      showStatus('\uc800\uc7a5 \uc2e4\ud328: ' + (data.error || '\uc54c \uc218 \uc5c6\ub294 \uc624\ub958'), false);
                    }
                  })
                  .catch(function() { showStatus('\ub124\ud2b8\uc6cc\ud06c \uc624\ub958', false); })
                  .finally(function() { btn.disabled = false; btn.textContent = '\uc800\uc7a5'; });
                });

                // ── 기본값 되돌리기 ──
                var resetBtn = document.getElementById('escResetBtn');
                if (resetBtn) resetBtn.addEventListener('click', function() {
                  state = Object.assign({}, DEFAULTS);
                  applyState();
                  showStatus('\uae30\ubcf8\uac12\uc73c\ub85c \ub418\ub3cc\ub838\uc2b5\ub2c8\ub2e4. \uc800\uc7a5 \ubc84\ud2bc\uc744 \ub220\ub7ec \uc801\uc6a9\ud558\uc138\uc694.', true);
                });

                // ── 초기 로드 ──
                fetch('/api/dashboard/shops/' + SHOP_ID + '/escalation')
                  .then(function(r) { return r.json(); })
                  .then(function(data) {
                    if (data.ok && data.escalation_config) {
                      var c = data.escalation_config;
                      state.enabled = c.enabled !== false;
                      state.hideForReturning = c.hideForReturning === true;
                      state.toastEnabled = c.toastEnabled !== false;
                      state.floatingEnabled = c.floatingEnabled !== false;
                      state.toastStartVisit = c.toastStartVisit != null ? c.toastStartVisit : DEFAULTS.toastStartVisit;
                      state.toastEndVisit = c.toastEndVisit != null ? c.toastEndVisit : DEFAULTS.toastEndVisit;
                      state.toastText = c.toastText || DEFAULTS.toastText;
                      state.toastStyle = c.toastStyle != null ? c.toastStyle : DEFAULTS.toastStyle;
                      state.toastOpacity = c.toastOpacity != null ? c.toastOpacity : DEFAULTS.toastOpacity;
                      state.toastBorderRadius = c.toastBorderRadius != null ? c.toastBorderRadius : DEFAULTS.toastBorderRadius;
                      state.toastAnimation = c.toastAnimation || DEFAULTS.toastAnimation;
                      state.toastDuration = c.toastDuration != null ? c.toastDuration : DEFAULTS.toastDuration;
                      state.toastPersist = c.toastPersist === true;
                      state.floatingText = c.floatingText || DEFAULTS.floatingText;
                      state.floatingBtnText = c.floatingBtnText || DEFAULTS.floatingBtnText;
                      state.floatingPreset = c.floatingPreset != null ? c.floatingPreset : DEFAULTS.floatingPreset;
                      state.floatingOpacity = c.floatingOpacity != null ? c.floatingOpacity : DEFAULTS.floatingOpacity;
                      state.floatingBorderRadius = c.floatingBorderRadius != null ? c.floatingBorderRadius : DEFAULTS.floatingBorderRadius;
                      state.floatingAnimation = c.floatingAnimation || DEFAULTS.floatingAnimation;
                    }
                    applyState();
                  })
                  .catch(function() { applyState(); });

                // AI 추천 문구 로드
                (async function() {
                  try {
                    var resp = await fetch('/api/dashboard/shops/' + SHOP_ID + '/ai-copy', { credentials: 'same-origin' });
                    if (!resp.ok) return;
                    var data = await resp.json();
                    var copy = data.copy;
                    if (!copy || (!copy.toast && !copy.floating && !copy.floatingBtn)) return;
                    if (copy.toast) document.getElementById('aiToastText').textContent = copy.toast;
                    if (copy.floating) document.getElementById('aiFloatingText').textContent = copy.floating;
                    if (copy.floatingBtn) document.getElementById('aiFloatingBtnText').textContent = copy.floatingBtn;
                    document.getElementById('aiEscalationSuggestion').style.display = 'block';
                    document.getElementById('applyEscalationCopy').addEventListener('click', function() {
                      if (copy.toast) {
                        document.getElementById('toastText').value = copy.toast;
                        state.toastText = copy.toast;
                        if (typeof updateToastPreviewText === 'function') updateToastPreviewText();
                      }
                      if (copy.floating) {
                        document.getElementById('floatingText').value = copy.floating;
                        state.floatingText = copy.floating;
                        if (typeof updateFloatingPreviewText === 'function') updateFloatingPreviewText();
                      }
                      if (copy.floatingBtn) {
                        document.getElementById('floatingBtnText').value = copy.floatingBtn;
                        state.floatingBtnText = copy.floatingBtn;
                        var btnPreview = document.getElementById('floatingBtnPreview');
                        if (btnPreview) btnPreview.textContent = copy.floatingBtn;
                      }
                    });
                  } catch(e) {}
                })();
              })();
            `}} />
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
            <p style="font-size:13px;color:#64748b;margin-bottom:20px">신규 가입 시 카카오 채널 추가 유도 버튼에 사용됩니다.</p>
            {/* 미리보기 영역 (상단) */}
            <div style="margin-bottom:20px">
              <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">미리보기</p>
              <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;padding:24px">
                <p style="font-size:11px;color:#94a3b8;margin-bottom:16px;text-align:center">가입 완료 후 표시되는 버튼</p>
                <div style="display:flex;justify-content:center">
                  <button
                    id="kakaoPreviewBtn"
                    style="display:flex;align-items:center;gap:8px;padding:12px 16px;background:#FEE500;color:#191919;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;max-width:320px;width:100%;justify-content:center"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M10 2C5.582 2 2 4.896 2 8.444c0 2.26 1.5 4.247 3.765 5.378l-.96 3.585a.25.25 0 00.38.275L9.54 15.03c.152.01.306.016.46.016 4.418 0 8-2.896 8-6.444C18 4.896 14.418 2 10 2z" fill="#191919"/>
                    </svg>
                    카카오 채널 추가하고 알림 받기
                  </button>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin-top:12px;text-align:center">가입 완료 페이지에서 표시됩니다</p>
              </div>
            </div>
            {/* 설정 영역 */}
            <div>
              <div class="form-group" style="margin-bottom:16px">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="kakaoChannelId">카카오 채널 ID</label>
                <input
                  type="text"
                  id="kakaoChannelId"
                  value={kakaoChannelId}
                  placeholder="예: _xAbCdE"
                  style="max-width:320px;padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;box-sizing:border-box"
                />
                <p style="font-size:12px;color:#94a3b8;margin-top:6px">카카오 채널 프로필 URL(pf.kakao.com/<strong>_xAbCdE</strong>)에서 밑줄로 시작하는 ID를 입력하세요.</p>
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
            <script dangerouslySetInnerHTML={{__html: `
              document.getElementById('kakaoPreviewBtn').addEventListener('click', function() {
                var channelId = document.getElementById('kakaoChannelId').value.trim();
                if (channelId) {
                  window.open('https://pf.kakao.com/' + channelId, '_blank');
                } else {
                  alert('카카오 채널 ID를 먼저 입력해주세요.');
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

// ─── QuickStart Page ─────────────────────────────────────────

export const QuickStartPage: FC<{ shop: { sso_configured: number; plan: string } | null; isCafe24?: boolean }> = ({ shop, isCafe24 }) => (
  <Layout title="퀵스타트 가이드" loggedIn currentPath="/dashboard/quickstart" isCafe24={isCafe24}>
    <h1>퀵스타트 가이드</h1>
    <p style="font-size:14px;color:#64748b;margin-bottom:24px">번개가입을 시작하기 위한 필수 설정을 안내합니다.</p>

    {/* 진행 상태 표시 */}
    <div class="card" style="margin-bottom:24px">
      <h2 style="margin-bottom:12px">설정 진행 상태</h2>
      <div style="display:grid;gap:12px">
        <div style="display:flex;align-items:center;gap:12px">
          <span style={`width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:${shop?.sso_configured ? '#059669' : '#d1d5db'}`}>{shop?.sso_configured ? '✓' : '1'}</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">SSO 연동 설정</div>
            <div style="font-size:12px;color:#64748b">{shop?.sso_configured ? '완료됨' : '미완료 — 가장 중요한 필수 설정입니다'}</div>
          </div>
          {!shop?.sso_configured && <a href="/dashboard/settings/sso-guide" class="btn btn-primary btn-sm" style="margin-left:auto;width:auto">설정하기 →</a>}
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span id="qsSnsBadge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:#d1d5db">2</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">"회원가입 시 SNS 계정 연동" 확인</div>
            <div style="font-size:12px;color:#64748b">카페24 관리자에서 기본 활성화 — 확인만 필요</div>
          </div>
          <button id="qsSnsCheck" class="btn btn-outline btn-sm" style="margin-left:auto;width:auto">확인 완료</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span id="qsProviderBadge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:#d1d5db">3</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">소셜 프로바이더 선택</div>
            <div style="font-size:12px;color:#64748b">권장: Google + Kakao + Naver</div>
          </div>
          <a href="/dashboard/settings/providers" class="btn btn-outline btn-sm" style="margin-left:auto;width:auto">설정하기 →</a>
          <button id="qsProviderCheck" class="btn btn-outline btn-sm" style="width:auto">확인 완료</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span style={`width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:${shop?.sso_configured ? '#059669' : '#d1d5db'}`}>{shop?.sso_configured ? '✓' : '4'}</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">SSO 설정 확인</div>
            <div style="font-size:12px;color:#64748b">{shop?.sso_configured ? '완료됨' : 'SSO 설정 가이드에서 설정 확인 버튼으로 연동 검증'}</div>
          </div>
          {!shop?.sso_configured && <a href="/dashboard/settings/sso-guide" class="btn btn-outline btn-sm" style="margin-left:auto;width:auto">확인하기 →</a>}
        </div>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      (function() {
        function initQsCheck(btnId, storageKey, badgeId) {
          var btn = document.getElementById(btnId);
          var badge = document.getElementById(badgeId);
          if (!btn || !badge) return;

          if (localStorage.getItem(storageKey)) {
            badge.style.background = '#059669';
            badge.textContent = '✓';
            btn.style.display = 'none';
          }

          btn.addEventListener('click', function() {
            localStorage.setItem(storageKey, '1');
            badge.style.background = '#059669';
            badge.textContent = '✓';
            btn.style.display = 'none';
          });
        }

        initQsCheck('qsSnsCheck', 'bg_qs_sns_checked', 'qsSnsBadge');
        initQsCheck('qsProviderCheck', 'bg_qs_provider_checked', 'qsProviderBadge');
      })();
    `}} />

    {/* Step 1: SSO 연동 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">Step 1. SSO 연동 설정 (필수)</h2>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#991b1b">
        <strong>이 설정이 완료되어야 소셜 로그인 버튼이 쇼핑몰에 표시됩니다.</strong>
      </div>
      <ol style="font-size:13px;color:#374151;line-height:2;padding-left:20px">
        <li>대시보드 &gt; <a href="/dashboard/settings/sso-guide" style="color:#2563eb">SSO 설정 가이드</a>에서 모든 값을 확인합니다.</li>
        <li>카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>SSO 로그인 연동 관리</strong>로 이동합니다.</li>
        <li>SSO 로그인 연동을 등록하고, 가이드에 표시된 값을 정확히 복사-붙여넣기합니다.</li>
        <li>연동 상태를 <strong>"사용함"</strong>으로 변경합니다.</li>
        <li>SSO 설정 가이드 페이지 하단의 <strong>"설정 확인"</strong> 버튼을 클릭하여 연동이 정상인지 확인합니다. 번개가입이 카페24의 SSO 슬롯을 자동 감지하고 설정을 확정합니다.</li>
      </ol>
    </div>

    {/* Step 2: SNS 계정 연동 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">Step 2. "회원가입 시 SNS 계정 연동" 확인 (강력 권장)</h2>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:12px;font-size:13px;color:#92400e">
        <strong>이 설정이 없으면</strong> 기존 ID/PW 회원이 소셜 로그인할 때 별도의 @s 회원이 생성되어 주문/적립금이 분리됩니다.<br />
        카페24 기본값은 활성화이므로, 변경된 적이 없다면 확인만 하면 됩니다.
      </div>
      <ol style="font-size:13px;color:#374151;line-height:2;padding-left:20px">
        <li>카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정으로 이동합니다.</li>
        <li><strong>"회원가입 시 SNS 계정 연동"</strong> 항목이 <strong>"사용함"</strong>으로 되어 있는지 확인합니다.</li>
        <li>비활성화된 경우 <strong>"사용함"</strong>으로 변경하고 저장합니다.</li>
      </ol>
    </div>

    {/* Step 3: 프로바이더 선택 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">Step 3. 소셜 프로바이더 선택</h2>
      <p style="font-size:13px;color:#374151;line-height:1.7;margin-bottom:12px">
        한국 시장이라면 <strong>Google + Kakao + Naver</strong> 3종을 기본으로 권장합니다.
        글로벌 타겟이라면 Apple, Discord 등을 추가하세요.
      </p>
      <a href="/dashboard/settings/providers" style="font-size:13px;color:#2563eb">로그인 디자인에서 설정 →</a>
    </div>

    {/* 선택 설정 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:12px">선택 설정</h2>
      <div style="display:grid;gap:12px;font-size:13px;color:#374151">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="color:#2563eb;font-weight:700">쿠폰</span>
          <span>가입 혜택으로 쿠폰을 자동 발급하려면</span>
          <a href="/dashboard/settings/general" style="color:#2563eb">기본 설정</a>에서 설정
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-green" style="font-size:11px">Plus</span>
          <span>AI 보고서를 받으려면 기본 설정에서 쇼핑몰 정체성 AI 분석을 먼저 실행하세요</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-green" style="font-size:11px">Plus</span>
          <span>미니배너, 이탈 감지 팝업, 에스컬레이션은 각 설정 페이지에서 활성화</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-green" style="font-size:11px">Plus</span>
          <span>AI 정체성 분석: 기본 설정에서 실행하면 업종, 타겟, 톤앤매너를 AI가 자동 분석합니다</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span class="badge badge-green" style="font-size:11px">Plus</span>
          <span>AI 추천 문구 자동 적용: 토글을 켜면 AI가 매주 마케팅 문구를 자동 업데이트합니다</span>
        </div>
      </div>
    </div>

    {/* 확인 */}
    <div class="card" style="background:#f0fdf4;border:1px solid #bbf7d0">
      <h2 style="margin-bottom:8px;color:#166534">설정 완료 확인</h2>
      <p style="font-size:13px;color:#166534;line-height:1.7">
        모든 설정 후 쇼핑몰 로그인 페이지를 열어 소셜 로그인 버튼이 정상 표시되는지 확인하세요.<br />
        테스트 계정으로 실제 소셜 로그인을 시도하면 가장 확실합니다.<br />
        SSO 설정 가이드에서 '설정 확인' 버튼으로 연동 상태를 먼저 확인하는 것이 좋습니다.
      </p>
    </div>

    <div style="margin-top:24px;display:flex;gap:12px;font-size:13px">
      <a href="/dashboard/guide" style="color:#2563eb">사용 가이드 →</a>
      <a href="/dashboard/faq" style="color:#2563eb">FAQ →</a>
      <a href="/dashboard/inquiries" style="color:#2563eb">문의하기 →</a>
    </div>
  </Layout>
);

export const GuidePage: FC<{ isCafe24?: boolean }> = ({ isCafe24 }) => (
  <Layout title="사용 가이드" loggedIn currentPath="/dashboard/guide" isCafe24={isCafe24}>
    <h1>사용 가이드</h1>
    <p style="font-size:14px;color:#64748b;margin-bottom:24px">번개가입 설치부터 운영까지 단계별로 안내합니다.</p>

    {/* 1. 시작하기 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">1. 시작하기</h2>
      <ol style="padding-left:0;list-style:none;margin:0">
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">1</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">SSO 연동 설정 (필수)</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">가장 중요한 단계입니다. SSO 설정 가이드 페이지에서 Client ID, Secret, URL을 확인하고 카페24 관리자에 입력합니다.</p>
            <a href="/dashboard/settings/sso-guide" style="font-size:13px;color:#3b82f6;text-decoration:none;margin-top:6px;display:inline-block">SSO 설정 가이드 →</a>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">2</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">SSO 설정 확인</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">SSO 설정 가이드 하단의 '설정 확인' 버튼으로 연동이 정상인지 확인합니다. 번개가입이 카페24의 SSO 슬롯을 자동 감지하고 설정을 확정합니다.</p>
            <a href="/dashboard/settings/sso-guide" style="font-size:13px;color:#3b82f6;text-decoration:none;margin-top:6px;display:inline-block">SSO 설정 가이드 →</a>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">3</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">"회원가입 시 SNS 계정 연동" 확인</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">이 옵션은 카페24에서 기본적으로 활성화되어 있습니다. 카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정에서 해당 옵션이 "사용함"으로 되어 있는지 확인하세요. 이 설정을 통해 기존 ID/PW 회원과 소셜 계정이 자동 연동됩니다.</p>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">4</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">소셜 프로바이더 선택 및 로그인 디자인 설정</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">사용할 소셜 로그인 서비스를 활성화하고, 버튼 디자인을 쇼핑몰에 맞게 조정합니다.</p>
            <a href="/dashboard/settings/general" style="font-size:13px;color:#3b82f6;text-decoration:none;margin-top:6px;display:inline-block">기본 설정 →</a>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">5</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">쇼핑몰 로그인 페이지에서 동작 확인</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">쇼핑몰 로그인 페이지를 열어 소셜 로그인 버튼이 정상 표시되는지 확인합니다.</p>
          </div>
        </li>
      </ol>
    </div>

    {/* 2. SSO 연동 설정 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">2. SSO 연동 설정</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:16px">카페24 SSO 연동을 위해 아래 값들을 정확히 복사해 입력해야 합니다.</p>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#1e40af;line-height:1.7">
        <strong>SSO 설정 가이드 페이지</strong>에서 Client ID, Client Secret, 각 URL을 복사하세요.<br />
        복사 후 카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>SSO 로그인 연동 관리</strong>에 붙여넣기 합니다.
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;width:40%">입력 필드</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">연동 서비스명</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">번개가입</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Client ID</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">SSO 설정 가이드에서 복사</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Client Secret</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">SSO 설정 가이드에서 복사</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Authorize Redirect URL</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">SSO 설정 가이드에서 복사 (정확히 붙여넣기)</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Access Token Return API</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">SSO 설정 가이드에서 복사 (정확히 붙여넣기)</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">User Info Return API</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">SSO 설정 가이드에서 복사 (정확히 붙여넣기)</td>
          </tr>
        </tbody>
      </table>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-top:14px;font-size:13px;color:#92400e;line-height:1.7">
        <strong>주의:</strong> URL 값은 한 글자도 틀리지 않게 정확히 복사-붙여넣기 해야 합니다. 직접 입력 시 오류가 발생할 수 있습니다.
      </div>

      <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-top:12px;font-size:13px;color:#1e40af;line-height:1.6">
        SSO 등록 완료 후 SSO 설정 가이드 페이지 하단의 <strong>'설정 확인'</strong> 버튼을 반드시 클릭하세요. 카페24의 SSO 슬롯을 자동 감지하여 번개가입의 SSO 설정을 확정하고, 다른 SSO 앱과의 충돌 여부도 확인할 수 있습니다.
      </div>

      <div style="margin-top:14px">
        <a href="/dashboard/settings/sso-guide" class="btn btn-primary btn-sm" style="display:inline-flex;width:auto">SSO 설정 가이드 →</a>
      </div>
    </div>

    {/* 3. 회원가입 시 SNS 계정 연동 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">3. "회원가입 시 SNS 계정 연동" 설정</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">이 옵션은 카페24에서 기본적으로 활성화되어 있습니다. 카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정에서 해당 옵션이 '사용함'으로 되어 있는지 확인하세요.</p>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px 16px;margin-bottom:16px;font-size:13px;color:#991b1b;line-height:1.8">
        <strong>이 설정이 없으면 소셜 로그인이 기존 회원과 연동되지 않습니다.</strong><br />
        카페24 기본값은 활성화이나, 비활성화로 변경된 경우 다시 사용함으로 설정해야 합니다.
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px">
          <p style="font-size:13px;font-weight:600;color:#166534;margin:0 0 8px">활성화 시</p>
          <ul style="padding-left:16px;margin:0;font-size:13px;color:#166534;line-height:1.8">
            <li>기존 ID/PW 회원과 동일 이메일의 소셜 계정 <strong>자동 연동</strong></li>
            <li>회원 정보(주문, 적립금 등) 통합 유지</li>
            <li>중복 계정 없이 하나의 계정으로 관리</li>
          </ul>
        </div>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px">
          <p style="font-size:13px;font-weight:600;color:#991b1b;margin:0 0 8px">미활성화 시</p>
          <ul style="padding-left:16px;margin:0;font-size:13px;color:#991b1b;line-height:1.8">
            <li>매번 새 @s 회원 생성</li>
            <li>주문 내역, 적립금이 분리됨</li>
            <li>같은 사람이 여러 계정 보유 가능</li>
          </ul>
        </div>
      </div>

      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px;font-size:13px;color:#475569;line-height:1.8">
        <strong>설정 경로:</strong><br />
        카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>회원가입 시 SNS 계정 연동</strong> &gt; <strong>"사용함"</strong> 선택 후 저장
      </div>
    </div>

    {/* 4. 소셜 프로바이더별 안내 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">4. 소셜 프로바이더별 안내</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">각 소셜 프로바이더의 이메일 제공 여부와 기존 회원 연동 가능 여부를 확인하세요.</p>

      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">프로바이더</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">이메일 제공</th>
              <th style="padding:10px 12px;text-align:center;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">기존 회원 연동</th>
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">비고</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Google</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">가장 안정적</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Kakao</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">한국 사용자 필수</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Naver</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">한국 사용자 필수</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Apple</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#d97706">△</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#d97706">△</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">Hide My Email로 매칭 실패 가능</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Discord</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#16a34a">O</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">게임/커뮤니티 타겟</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Telegram</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#dc2626">X</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;font-weight:600;color:#dc2626">X</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">이메일 미제공</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#94a3b8">Facebook <span style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:4px;font-weight:400">예정</span></td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8">추가 예정</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#94a3b8">X (Twitter) <span style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:4px;font-weight:400">예정</span></td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8">추가 예정 (이메일 미제공)</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#94a3b8">LINE <span style="font-size:11px;background:#f1f5f9;padding:1px 6px;border-radius:4px;font-weight:400">예정</span></td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">—</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#94a3b8">추가 예정 (일본 시장)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-top:14px;font-size:13px;color:#92400e;line-height:1.7">
        <strong>이메일 미제공 프로바이더(X, Telegram)</strong>는 기존 회원과 연동이 불가하며, 항상 신규 @s 회원이 생성됩니다.
      </div>
    </div>

    {/* 5. 위젯 디자인 설정 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">5. 위젯 디자인 설정</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">각 설정이 버튼 디자인에 어떤 영향을 주는지 확인하세요.</p>

      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0;width:28%">설정 항목</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">설명</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">프리셋</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">기본(컬러) / 모노톤(흑백) / 호버 채움(테두리→채우기 효과) / 호버 채움 흑백 / 아이콘만 — 5가지 스타일</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">버튼 너비</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">120~500px. 로그인 폼 너비에 맞추기를 권장합니다.</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">버튼 높이</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">32~60px. 기본값은 45px입니다.</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">버튼 간격</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">0~24px. 버튼 사이의 세로 여백을 조정합니다.</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">모서리 둥글기</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">0~30px. 0이면 각진 버튼, 높을수록 둥근 버튼이 됩니다.</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">정렬</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">왼쪽 / 가운데 / 오른쪽 정렬을 선택합니다.</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">아이콘-텍스트 간격</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">아이콘과 텍스트 사이의 거리를 조정합니다.</td>
          </tr>
          <tr style="background:#f8fafc">
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">왼쪽 여백</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">아이콘의 왼쪽 시작 위치를 조정합니다.</td>
          </tr>
          <tr>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">버튼 문구</td>
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">{'{name}'}이 각 프로바이더명(Google, 카카오 등)으로 자동 치환됩니다.</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:14px">
        <a href="/dashboard/settings/general" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">디자인 설정 →</a>
      </div>
    </div>

    {/* 6. Plus 기능 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">6. Plus 기능 상세 안내</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">Plus 플랜에서 사용 가능한 추가 기능입니다.</p>

      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">미니배너</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">쇼핑몰 상단에 소셜 가입 유도 배너를 표시합니다. 프리셋, 텍스트, 위치, 높이, 여백을 자유롭게 설정할 수 있습니다.</p>
          </div>
          <a href="/dashboard/settings/banner" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">이탈 감지 팝업</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">마우스가 페이지를 벗어나려 할 때 자동으로 팝업을 표시합니다. 제목, 본문, CTA 버튼 문구를 설정할 수 있습니다.</p>
          </div>
          <a href="/dashboard/settings/popup" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">에스컬레이션</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">재방문을 감지하여 단계별 유도 메시지를 표시합니다. 2~3회 방문 시 토스트, 4회 이상 방문 시 플로팅 배너가 나타납니다.</p>
          </div>
          <a href="/dashboard/settings/escalation" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">AI 보고서</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">매주 월요일 자동으로 성과 분석 리포트를 생성합니다. 지난주 성과 요약, 이번 주 전략 제안, 실행 가능한 액션 3가지, AI 인사이트, 추천 마케팅 문구 7종이 포함됩니다.</p>
          </div>
          <a href="/dashboard/ai-reports" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">보기 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">AI 정체성 분석</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">쇼핑몰 URL과 상품 정보를 AI가 분석하여 업종, 타겟 고객, 톤앤매너, 핵심 키워드를 자동 파악합니다. AI 보고서와 추천 문구의 정확도를 높이는 기반입니다.</p>
          </div>
          <a href="/dashboard/settings/general" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">AI 추천 마케팅 문구</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">AI 보고서 생성 시 쇼핑몰 정체성에 맞는 마케팅 문구 7종이 자동 생성됩니다: 미니배너, 팝업(제목/본문/CTA), 에스컬레이션(토스트/배너/버튼). 각 설정 페이지에서 'AI 추천' 영역에 표시되며 원클릭 적용 가능합니다.</p>
          </div>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">AI 자동 적용</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">기본 설정에서 'AI 추천 문구 자동 적용' 토글을 켜면, AI 보고서 생성 시 추천 문구가 미니배너/팝업/에스컬레이션에 자동 반영됩니다. 매주 자동 보고서와 함께 문구도 자동 업데이트됩니다.</p>
          </div>
          <a href="/dashboard/settings/general" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">쿠폰 3종 동시 발급</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">무료배송 / 정액 할인 / 정률 할인 쿠폰을 동시에 발급할 수 있습니다.</p>
          </div>
          <a href="/dashboard/settings/general" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px">
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">카카오 채널</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">소셜 가입 시 카카오 채널 추가를 유도하여 마케팅 채널을 확보합니다.</p>
          </div>
          <a href="/dashboard/settings/kakao" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">설정 →</a>
        </div>
      </div>

      <div style="margin-top:16px;text-align:center">
        <a href="/dashboard/billing" class="btn btn-primary btn-sm" style="display:inline-flex;width:auto">Plus 업그레이드 →</a>
      </div>
    </div>

    {/* 7. 다른 SSO 앱에서 전환 시 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">7. 다른 SSO 앱에서 전환 시 안내</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">기존에 다른 SSO 앱을 사용하다가 번개가입으로 전환하는 경우 아래 사항을 반드시 확인하세요.</p>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:14px;font-size:13px;color:#92400e;line-height:1.8">
        <strong>전환 전 체크리스트</strong>
        <ul style="padding-left:18px;margin:8px 0 0">
          <li>카페24 관리자에서 <strong>"회원가입 시 SNS 계정 연동"</strong>을 반드시 먼저 활성화하세요.</li>
          <li>기존 @s 회원과 중복 계정이 생성될 수 있습니다.</li>
          <li>이전 SSO 앱으로 가입한 회원은 번개가입으로 재가입 시 새 계정이 생성될 수 있습니다.</li>
        </ul>
      </div>

      <p style="font-size:13px;color:#475569;line-height:1.7;margin:0">
        전환 관련 상세 FAQ는 아래 링크에서 확인하세요.
      </p>

      <div style="margin-top:12px">
        <a href="/dashboard/faq" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">FAQ 확인 →</a>
      </div>
    </div>

    {/* 하단 링크 */}
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      <a href="/dashboard/faq" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">FAQ 바로가기 →</a>
      <a href="/dashboard/quickstart" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">퀵스타트 가이드 →</a>
      <a href="/dashboard/inquiries" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">문의하기 →</a>
    </div>
  </Layout>
);

// ─── FAQ Page ────────────────────────────────────────────────

export const FaqPage: FC<{ isCafe24?: boolean }> = ({ isCafe24 }) => (
  <Layout title="FAQ" loggedIn currentPath="/dashboard/faq" isCafe24={isCafe24}>
    <h1>자주 묻는 질문 (FAQ)</h1>
    <p style="font-size:14px;color:#64748b;margin-bottom:24px">번개가입 사용 중 궁금한 점을 확인하세요.</p>

    {/* 1. 서비스 소개 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">서비스 소개</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 번개가입은 어떤 서비스인가요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>카페24 쇼핑몰에 소셜 로그인을 추가하는 SSO 앱입니다.</p>
          <p style="margin-top:6px">구글, 카카오, 네이버, 애플, 디스코드, 텔레그램 6종의 소셜 프로바이더를 지원하며(Facebook, X, LINE 추가 예정), 1클릭 회원가입으로 쇼핑몰의 가입 전환율을 높일 수 있습니다. 복잡한 회원가입 양식 없이 기존 소셜 계정으로 즉시 가입이 가능합니다.</p>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 무료로 사용할 수 있나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>네, Free 플랜은 무제한 무료로 사용할 수 있습니다.</p>
          <table style="margin-top:8px;border-collapse:collapse;width:100%;max-width:480px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">플랜</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">금액</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">주요 기능</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">Free</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">무료</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">소셜 로그인 6종+ + 가입 쿠폰 1종</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">Plus</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">월 6,900원 / 연 79,000원</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">미니배너, 이탈감지 팝업, 에스컬레이션, AI 보고서, 쿠폰 3종 등</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 카페24에서 기본 제공하는 소셜 로그인과 뭐가 다른가요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>카페24 기본 소셜 로그인은 4종(구글, 카카오, 네이버, 페이스북)이지만, 번개가입은 현재 6종(구글, 카카오, 네이버, 애플, 디스코드, 텔레그램)을 지원하며 Facebook, X, LINE을 추가할 예정입니다.</p>
          <p style="margin-top:6px">또한 단순 소셜 로그인 연결 이상의 마케팅 기능을 함께 제공합니다:</p>
          <ul style="margin-top:6px;padding-left:16px">
            <li>AI 마케팅 카피 자동 생성</li>
            <li>미니배너 (가입 유도 배너)</li>
            <li>이탈 감지 팝업</li>
            <li>신규 가입 시 쿠폰 자동 발급</li>
            <li>에스컬레이션 (재방문 감지 혜택 제공)</li>
            <li>AI 주간 보고서</li>
          </ul>
        </div>
      </details>
    </div>

    {/* 2. 설치 및 설정 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">설치 및 설정</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 설치 후 가장 먼저 해야 할 것은?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p><strong>SSO 설정 가이드</strong>에 따라 카페24 관리자에서 SSO 연동을 등록해야 합니다. 이 설정이 완료되어야 쇼핑몰 로그인 페이지에 소셜 로그인 버튼이 표시됩니다.</p>
          <ol style="margin-top:8px;padding-left:16px">
            <li>대시보드 &gt; 설정 &gt; <strong>SSO 설정 가이드</strong> 접속</li>
            <li>가이드에 표시된 값(Client ID, Secret, URL 등)을 카페24 관리자에 입력</li>
            <li>카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; <strong>SSO 로그인 연동 관리</strong>에서 연동 등록</li>
          </ol>
          <a href="/dashboard/settings/sso-guide" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#6366f1;font-size:12px;text-decoration:none">SSO 설정 가이드 →</a>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> "회원가입 시 SNS 계정 연동" 설정은 왜 활성화해야 하나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>이 설정은 기존 ID/PW 회원이 소셜 로그인을 시도할 때 동일 이메일로 기존 계정과 자동 연동되도록 하는 카페24 옵션입니다.</p>
          <div style="margin-top:8px;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:10px 12px">
            <strong style="color:#92400e">⚠ 이 설정을 활성화하지 않으면</strong>
            <p style="color:#92400e;margin-top:4px">소셜 로그인 시 기존 회원과 별도로 <code>@s</code> 접미사가 붙은 새 회원이 생성됩니다. 주문 내역, 적립금, 등급 등이 기존 계정과 완전히 분리됩니다.</p>
          </div>
          <p style="margin-top:8px">활성화 위치: 카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정 &gt; 회원 설정 &gt; <strong>회원가입 시 SNS 계정 연동 사용함</strong></p>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> SSO 설정에서 입력해야 할 값들은 어디서 확인하나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>대시보드 &gt; 설정 &gt; <strong>SSO 설정 가이드</strong> 페이지에서 아래 값들을 모두 복사할 수 있습니다:</p>
          <ul style="margin-top:6px;padding-left:16px">
            <li>Client ID</li>
            <li>Client Secret</li>
            <li>Authorize Redirect URL</li>
            <li>Access Token Return API</li>
            <li>User info Return API</li>
          </ul>
          <a href="/dashboard/settings/sso-guide" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#6366f1;font-size:12px;text-decoration:none">SSO 설정 가이드 →</a>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">SSO 설정이 정상인지 어떻게 확인하나요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          카페24 관리자에서 SSO 등록을 완료한 후, 대시보드 &gt; 설정 &gt; <a href="/dashboard/settings/sso-guide" style="color:#2563eb">SSO 설정 가이드</a> 페이지 하단의 <strong>'설정 확인'</strong> 버튼을 클릭하세요.<br /><br />
          번개가입이 카페24의 SSO 슬롯(sso~sso5)을 자동으로 스캔하여 각 슬롯의 상태를 색상 배지로 표시합니다:<br />
          - <strong style="color:#059669">번개가입</strong>: 정상 등록됨<br />
          - <strong style="color:#f59e0b">다른 앱</strong>: 다른 SSO 앱이 등록됨<br />
          - <strong style="color:#94a3b8">미등록</strong>: SSO 미사용 슬롯<br /><br />
          번개가입 슬롯이 감지되면 자동으로 설정이 확정됩니다.
        </div>
      </details>
    </div>

    {/* 3. 소셜 로그인 동작 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">소셜 로그인 동작</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 소셜 로그인하면 새 회원이 만들어지나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>"회원가입 시 SNS 계정 연동" 설정 여부에 따라 다릅니다:</p>
          <ul style="margin-top:6px;padding-left:16px">
            <li><strong>활성화 시</strong>: 동일 이메일을 가진 기존 회원이 있으면 연동 화면이 표시됩니다. 기존 회원을 선택하면 계정이 연동되고 새 회원이 생성되지 않습니다.</li>
            <li><strong>미활성화 시</strong>: 항상 새 <code>@s</code> 회원이 생성됩니다.</li>
          </ul>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 프로바이더별 주의사항이 있나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <table style="border-collapse:collapse;width:100%;max-width:540px;margin-bottom:10px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">프로바이더</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">이메일 제공</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">기존 회원 연동</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">구글, 카카오, 네이버</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">제공</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">안정적</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">애플</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">조건부 제공</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">Hide My Email 사용 시 연동 불가할 수 있음</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">X(트위터), 텔레그램</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">미제공</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">기존 회원 연동 불가</td>
              </tr>
            </tbody>
          </table>
          <ul style="padding-left:16px">
            <li><strong>Apple</strong>: "Hide My Email" 기능으로 임시 이메일을 사용하는 경우 기존 계정과 이메일 매칭이 불가할 수 있습니다.</li>
            <li><strong>X(트위터), 텔레그램</strong>: 이메일을 제공하지 않으므로 기존 ID/PW 회원과의 연동이 불가합니다. 항상 새 <code>@s</code> 회원이 생성됩니다.</li>
          </ul>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 로그인 페이지에 소셜 버튼이 안 보여요
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>다음을 확인하세요:</p>
          <ol style="margin-top:6px;padding-left:16px">
            <li>SSO 연동 설정이 "<strong>사용함</strong>"으로 설정되어 있는지 확인</li>
            <li>카페24 관리자에서 SSO 등록이 완료되었는지 확인</li>
          </ol>
          <div style="margin-top:10px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:6px;padding:10px 12px">
            <strong style="color:#1e40af">참고</strong>
            <p style="color:#1e40af;margin-top:4px">회원가입 페이지(<code>/member/join.html</code>)에서는 SSO 버튼이 표시되지 않습니다. 이는 카페24 플랫폼의 제한 사항으로, <strong>로그인 페이지에서만</strong> 소셜 로그인 버튼이 동작합니다.</p>
          </div>
        </div>
      </details>
    </div>

    {/* 4. 다른 SSO 앱에서 전환 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">다른 SSO 앱에서 전환</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 다른 SSO 앱에서 번개가입으로 전환하면 기존 회원은 어떻게 되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>기존 회원의 데이터(주문, 적립금, 등급 등)는 카페24에 유지됩니다. 단, SSO 앱이 변경되면 기존 소셜 로그인 연동이 끊어집니다.</p>
          <ul style="margin-top:8px;padding-left:16px">
            <li>"회원가입 시 SNS 계정 연동" 활성화가 <strong>필수</strong>입니다.</li>
            <li>동일 이메일로 번개가입을 통해 소셜 로그인하면 재연동이 가능합니다.</li>
            <li>이전 앱에서 생성된 <code>@s</code> 회원이 있다면 중복 계정이 생길 수 있습니다.</li>
          </ul>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 전환 시 주의사항은?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <ol style="padding-left:16px">
            <li>기존 SSO 앱을 삭제하기 <strong>전에</strong> 카페24 관리자에서 "SNS 계정 연동" 설정을 먼저 활성화합니다.</li>
            <li>기존 앱에서 생성된 <code>@s</code> 회원이 있으면 중복 계정 발생에 주의합니다.</li>
            <li>전환 후 일정 기간(1~2주) 동안 기존 회원의 로그인 관련 문의에 대응할 준비를 하세요.</li>
          </ol>
        </div>
      </details>
    </div>

    {/* 5. 회원 관리 주의사항 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">회원 관리 주의사항</h2>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 소셜 회원(@s)을 탈퇴시키면 어떻게 되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:10px 12px;margin-bottom:10px">
            <strong style="color:#991b1b">⚠ 주의</strong>
            <p style="color:#991b1b;margin-top:4px">소셜 회원(<code>@s</code> 계정)을 탈퇴 처리하면, 동일 이메일로 연동된 <strong>모든 SSO 로그인이 차단</strong>됩니다. 카페24가 이메일 기준으로 탈퇴 이력을 관리하기 때문입니다.</p>
          </div>
          <p><strong>권장 대안:</strong></p>
          <ol style="margin-top:6px;padding-left:16px">
            <li>"회원가입 시 SNS 계정 연동" 설정으로 ID/PW 회원에 소셜 계정을 연동합니다.</li>
            <li>연동된 상태에서 SNS 연동만 해제 처리합니다.</li>
            <li>이렇게 하면 소셜 로그인 차단 없이 <code>@s</code> 계정만 정리할 수 있습니다.</li>
          </ol>
        </div>
      </details>
    </div>

    {/* 6. 쿠폰 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">쿠폰</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 가입 쿠폰이 자동으로 발급되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>네, 대시보드 기본 설정에서 쿠폰을 설정하고 저장하면 카페24에 쿠폰이 자동 생성됩니다. 이후 신규 회원가입 시 자동으로 쿠폰이 발급됩니다.</p>
          <table style="margin-top:8px;border-collapse:collapse;width:100%;max-width:360px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">플랜</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">쿠폰 종류</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">Free</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">1종 (정률 할인)</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">Plus</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">3종 (무료배송, 정액 할인, 정률 할인)</td>
              </tr>
            </tbody>
          </table>
          <a href="/dashboard/settings/general" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#6366f1;font-size:12px;text-decoration:none">기본 설정 →</a>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 쿠폰이 사용되었는지 확인할 수 있나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>현재 카페24 API의 제한으로 번개가입에서 쿠폰 사용 상태를 직접 추적하는 것이 불가합니다.</p>
          <ul style="margin-top:6px;padding-left:16px">
            <li><strong>발급 히스토리</strong>: 대시보드 &gt; 쿠폰 현황에서 확인 가능</li>
            <li><strong>사용 현황</strong>: 카페24 관리자 &gt; 프로모션 &gt; 쿠폰 관리에서 직접 확인</li>
          </ul>
          <a href="/dashboard/settings/coupon" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#6366f1;font-size:12px;text-decoration:none">쿠폰 현황 →</a>
        </div>
      </details>
    </div>

    {/* 7. Plus 기능 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">Plus 기능</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> Plus에서 무엇이 추가되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>Free 플랜의 모든 기능에 더해 다음이 제공됩니다:</p>
          <table style="margin-top:8px;border-collapse:collapse;width:100%;max-width:540px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">기능</th>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">설명</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">미니배너</td><td style="padding:6px 12px;border:1px solid #e2e8f0">쇼핑몰 내 소셜 가입 유도 배너</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">이탈 감지 팝업</td><td style="padding:6px 12px;border:1px solid #e2e8f0">페이지 이탈 시 소셜 가입 유도 팝업</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">에스컬레이션</td><td style="padding:6px 12px;border:1px solid #e2e8f0">재방문 감지 후 자동 혜택 제공</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">카카오 채널 연동</td><td style="padding:6px 12px;border:1px solid #e2e8f0">신규 가입 시 카카오 채널 추가 유도</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">AI 주간 보고서</td><td style="padding:6px 12px;border:1px solid #e2e8f0">가입 성과 주간 분석 리포트</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">AI 추천 마케팅 문구</td><td style="padding:6px 12px;border:1px solid #e2e8f0">쇼핑몰 맞춤 AI 카피 자동 생성</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">쿠폰 3종 동시 발급</td><td style="padding:6px 12px;border:1px solid #e2e8f0">무료배송, 정액, 정률 쿠폰 동시 제공</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0;font-weight:600">세부 설정 커스터마이징</td><td style="padding:6px 12px;border:1px solid #e2e8f0">각 기능의 세부 옵션 제어 가능</td></tr>
            </tbody>
          </table>
          <a href="/dashboard/billing" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;color:#6366f1;font-size:12px;text-decoration:none">Plus 업그레이드 →</a>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> Free에서 Plus로 업그레이드하면 기존 설정이 유지되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>네, 모든 기존 설정은 그대로 유지되며 Plus 기능이 추가로 활성화됩니다.</p>
          <p style="margin-top:6px">다운그레이드 시에는 Plus 기능이 즉시 비활성화되지만, 설정 데이터는 보존됩니다. 재구독 시 이전 설정이 그대로 복원됩니다.</p>
        </div>
      </details>
    </div>

    {/* 8. 앱 삭제 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">앱 삭제</h2>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 앱을 삭제하면 어떻게 되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <ul style="padding-left:16px">
            <li>쇼핑몰 로그인 페이지에서 소셜 로그인 버튼이 사라집니다.</li>
            <li>기존 소셜 가입 회원 데이터는 카페24에 유지됩니다.</li>
            <li>소셜 로그인으로 재접속이 불가해집니다. (단, 기존 ID/PW 회원에 소셜 계정이 연동된 경우 ID/PW 로그인은 계속 가능합니다.)</li>
            <li>재설치하면 이전 설정이 복원됩니다.</li>
          </ul>
        </div>
      </details>
    </div>

    {/* 9. AI 기능 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:16px">AI 기능</h2>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 정체성 분석이란 무엇인가요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          쇼핑몰 URL의 HTML과 판매 상품 정보를 AI가 분석하여 <strong>업종</strong>(패션/뷰티/식품 등), <strong>타겟 고객</strong>(20-30대 여성 등), <strong>톤앤매너</strong>(친근하고 캐주얼 등), <strong>핵심 키워드</strong>를 자동으로 파악합니다.<br /><br />
          <a href="/dashboard/settings/general" style="color:#2563eb">기본 설정</a> 페이지에서 실행하며, 일일 10회까지 가능합니다. 이 정보가 AI 보고서와 추천 문구의 정확도를 높이는 기반이 됩니다.
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 주간 보고서는 어떻게 동작하나요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          매주 <strong>월요일 오전 9시(KST)</strong>에 자동 생성됩니다. 보고서에는 4가지 핵심 내용이 포함됩니다:<br /><br />
          1. <strong>지난주 성과 요약</strong> — 데이터 기반 사실 분석<br />
          2. <strong>이번 주 전략 제안</strong> — 번개가입 기능 범위 내 실행 가능한 전략<br />
          3. <strong>실행 가능한 액션 3가지</strong> — 바로 적용 가능한 구체적 행동<br />
          4. <strong>AI 인사이트</strong> — 앱 범위 밖의 참고 트렌드<br /><br />
          이전 보고서와 비교하여 변화 추이도 분석합니다. <a href="/dashboard/ai-reports" style="color:#2563eb">AI 보고서</a> 페이지에서 수동으로도 생성할 수 있습니다.
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 추천 마케팅 문구란 무엇인가요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          AI 보고서 생성 시 쇼핑몰 정체성에 맞는 <strong>마케팅 문구 7종</strong>이 자동 생성됩니다:<br /><br />
          - 미니배너 문구<br />
          - 에스컬레이션 토스트 메시지<br />
          - 에스컬레이션 플로팅 배너 문구 + 버튼 텍스트<br />
          - 이탈 감지 팝업 제목 + 본문 + CTA 버튼<br /><br />
          각 설정 페이지에서 <strong>'AI 추천'</strong> 영역에 추천 문구가 표시되며, 적용 버튼으로 원클릭 적용할 수 있습니다.
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 추천 문구 자동 적용이란?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          <a href="/dashboard/settings/general" style="color:#2563eb">기본 설정</a>에서 <strong>'AI 추천 문구 자동 적용'</strong> 토글을 켜면, AI 보고서가 생성될 때마다 추천 문구가 미니배너, 이탈 감지 팝업, 에스컬레이션 설정에 자동 반영됩니다.<br /><br />
          매주 월요일 자동 보고서와 함께 마케팅 문구도 자동 업데이트되므로, 항상 최신 트렌드에 맞는 문구가 유지됩니다.
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 기능을 사용하려면 무엇이 필요한가요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          AI 기능은 <strong>Plus 플랜 전용</strong>입니다. 먼저 기본 설정에서 <strong>AI 정체성 분석</strong>을 실행해야 보고서와 추천 문구의 품질이 높아집니다.<br /><br />
          정체성 분석 없이도 동작하지만, 쇼핑몰 맞춤화된 결과를 원하시면 정체성 분석을 먼저 진행하세요. <a href="/dashboard/billing" style="color:#2563eb">Plus 업그레이드 →</a>
        </div>
      </details>
    </div>

    {/* 추가 문의 */}
    <div class="card" style="background:#f8fafc;border:1px solid #e2e8f0">
      <p style="font-size:13px;color:#64748b;text-align:center">
        원하는 답변을 찾지 못하셨나요?{' '}
        <a href="/dashboard/inquiries" style="color:#6366f1;text-decoration:none;font-weight:600">문의하기 →</a>
      </p>
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
            긴급 문의: <a href="mailto:help@suparain.com">help@suparain.com</a>
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
  <Layout title="문의 관리" loggedIn isAdmin currentPath="/supadmin/inquiries">
    <h1>문의 관리</h1>

    <div class="filter-bar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      {['', 'pending', 'replied', 'closed'].map((s) => {
        const labels: Record<string, string> = { '': '전체', pending: '미답변', replied: '답변완료', closed: '종료' };
        const active = statusFilter === s;
        return (
          <a
            href={s ? `/supadmin/inquiries?status=${s}` : '/supadmin/inquiries'}
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
            <a href={`/supadmin/inquiries?page=${pagination.page - 1}${statusFilter ? `&status=${statusFilter}` : ''}`} class="btn btn-outline btn-sm">이전</a>
          )}
          <span style="padding:6px 12px;font-size:13px;color:#64748b">{pagination.page} / {pagination.pages}</span>
          {pagination.page < pagination.pages && (
            <a href={`/supadmin/inquiries?page=${pagination.page + 1}${statusFilter ? `&status=${statusFilter}` : ''}`} class="btn btn-outline btn-sm">다음</a>
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
          var resp = await apiCall('PUT', '/api/supadmin/inquiries/' + id + '/reply', { reply: reply }, btn);
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
  <Layout title="AI 보고서" loggedIn isAdmin currentPath="/supadmin/ai-reports">
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
                  <td style="font-size:13px;font-weight:500"><a href={`/supadmin/ai-reports/${row.shop_id}`} style="color:#2563eb;text-decoration:none">{row.shop_name || '-'}</a></td>
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

// --- Admin AI Report Detail ---

type AdminBriefingRow = {
  id: string;
  performance: string;
  strategy: string;
  actions: string;
  insight?: string | null;
  source: string;
  created_at: string;
};

export const AdminAiReportDetailPage: FC<{
  shopName: string;
  shopId: string;
  briefings: AdminBriefingRow[];
}> = ({ shopName, shopId, briefings }) => (
  <Layout title={`${shopName} — AI 보고서`} loggedIn isAdmin currentPath="/supadmin/ai-reports">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
      <a href="/supadmin/ai-reports" style="color:#64748b;text-decoration:none;font-size:13px">&larr; 목록으로</a>
      <h1 style="margin-bottom:0">{shopName}</h1>
      <span style="font-size:13px;color:#94a3b8">AI 보고서 ({briefings.length}건)</span>
    </div>

    {briefings.length === 0 ? (
      <div class="card">
        <div class="empty-state"><p>이 쇼핑몰의 AI 보고서가 없습니다.</p></div>
      </div>
    ) : (
      briefings.map((b) => {
        let actionList: string[] = [];
        try { actionList = JSON.parse(b.actions); } catch { /* ignore */ }

        return (
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:8px">
                <span style="font-size:13px;font-weight:600;color:#1e293b">{b.created_at.slice(0, 10)}</span>
                <span class={`badge ${b.source === 'scheduled' ? 'badge-blue' : 'badge-gray'}`} style="font-size:11px">
                  {b.source === 'scheduled' ? '자동' : '수동'}
                </span>
              </div>
              <span style="font-size:11px;color:#94a3b8">{b.created_at.slice(0, 16).replace('T', ' ')}</span>
            </div>

            <div style="display:grid;gap:12px">
              <div>
                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px">성과 요약</div>
                <div style="font-size:13px;color:#1e293b;line-height:1.6">{b.performance || '-'}</div>
              </div>
              <div>
                <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px">전략 제안</div>
                <div style="font-size:13px;color:#1e293b;line-height:1.6">{b.strategy || '-'}</div>
              </div>
              {actionList.length > 0 && (
                <div>
                  <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px">액션 아이템</div>
                  <ul style="margin:0;padding-left:20px;font-size:13px;color:#1e293b;line-height:1.8">
                    {actionList.map((a) => <li>{a}</li>)}
                  </ul>
                </div>
              )}
              {b.insight && (
                <div>
                  <div style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:4px">참고사항</div>
                  <div style="font-size:13px;color:#64748b;line-height:1.6">{b.insight}</div>
                </div>
              )}
            </div>
          </div>
        );
      })
    )}
  </Layout>
);

// --- Admin Shop Detail ---

export const AdminShopDetailPage: FC<{
  shop: {
    shop_id: string;
    shop_name: string;
    mall_id: string;
    platform: string;
    plan: string;
    owner_email: string;
    owner_name: string;
    client_id: string;
    enabled_providers: string;
    sso_configured: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
    shop_identity?: string | null;
    widget_style?: string | null;
    coupon_config?: string | null;
    banner_config?: string | null;
    popup_config?: string | null;
    escalation_config?: string | null;
    kakao_channel_id?: string | null;
  };
  recentStats: { provider: string; cnt: number }[];
  totalSignups: number;
}> = ({ shop, recentStats, totalSignups }) => {
  const parseJson = (str: string | null | undefined) => {
    if (!str) return null;
    try { return JSON.parse(str); } catch { return null; }
  };

  const identity = parseJson(shop.shop_identity);
  const widgetStyle = parseJson(shop.widget_style);
  const couponConfig = parseJson(shop.coupon_config);
  const bannerConfig = parseJson(shop.banner_config);
  const popupConfig = parseJson(shop.popup_config);
  const escalationConfig = parseJson(shop.escalation_config);
  const providers = shop.enabled_providers ? shop.enabled_providers.split(',').filter(Boolean) : [];

  return (
    <Layout title={`${shop.shop_name || shop.mall_id} — 쇼핑몰 상세`} loggedIn isAdmin currentPath="/supadmin/shops">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px">
        <a href="/supadmin/shops" style="color:#64748b;text-decoration:none;font-size:13px">← 목록으로</a>
        <h1 style="margin-bottom:0">{shop.shop_name || shop.mall_id}</h1>
        <span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : shop.plan === 'monthly' ? '월간' : '연간'}</span>
        {shop.deleted_at && <span class="badge badge-red">정지됨</span>}
      </div>

      {/* 기본 정보 */}
      <div class="card">
        <h2>기본 정보</h2>
        <div style="overflow-x:auto">
          <table>
            <tbody>
              <tr><th style="width:140px">Mall ID</th><td><code>{shop.mall_id}</code></td></tr>
              <tr><th>플랫폼</th><td>{shop.platform}</td></tr>
              <tr><th>소유자</th><td>{shop.owner_name} ({shop.owner_email})</td></tr>
              <tr><th>Client ID</th><td><code style="font-size:11px">{shop.client_id}</code></td></tr>
              <tr><th>SSO 연동</th><td>{shop.sso_configured ? <span class="badge badge-green">완료</span> : <span class="badge badge-yellow">미완료</span>}</td></tr>
              <tr><th>활성 프로바이더</th><td>{providers.length > 0 ? providers.map(p => <span class="badge badge-gray" style="margin-right:4px">{providerDisplayNames[p] || p}</span>) : '-'}</td></tr>
              <tr><th>카카오 채널</th><td>{shop.kakao_channel_id || '-'}</td></tr>
              <tr><th>등록일</th><td>{shop.created_at?.slice(0, 16).replace('T', ' ')}</td></tr>
              <tr><th>최종 수정</th><td>{shop.updated_at?.slice(0, 16).replace('T', ' ') || '-'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 가입 통계 */}
      <div class="card">
        <h2>가입 통계</h2>
        <div style="display:flex;gap:24px;margin-bottom:16px">
          <div>
            <div style="font-size:12px;color:#64748b">총 가입자</div>
            <div style="font-size:24px;font-weight:700">{totalSignups.toLocaleString()}</div>
          </div>
          <div>
            <div style="font-size:12px;color:#64748b">최근 7일</div>
            <div style="font-size:24px;font-weight:700;color:#2563eb">{recentStats.reduce((s, r) => s + r.cnt, 0).toLocaleString()}</div>
          </div>
        </div>
        {recentStats.length > 0 && (
          <div>
            <div style="font-size:13px;font-weight:600;color:#475569;margin-bottom:8px">최근 7일 프로바이더별</div>
            {recentStats.map(row => (
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                <span style="font-size:13px;min-width:60px">{providerDisplayNames[row.provider] || row.provider}</span>
                <div style="flex:1;background:#f1f5f9;border-radius:4px;height:6px;overflow:hidden">
                  <div style={`background:${providerColors[row.provider] || '#94a3b8'};height:100%;width:${Math.round((row.cnt / Math.max(1, recentStats[0].cnt)) * 100)}%`}></div>
                </div>
                <span style="font-size:12px;color:#64748b;min-width:40px;text-align:right">{row.cnt}건</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 쇼핑몰 정체성 */}
      <div class="card">
        <h2>쇼핑몰 정체성 (AI 분석)</h2>
        {identity ? (
          <div style="display:grid;gap:8px;font-size:13px">
            <div><strong>업종:</strong> {identity.industry || '-'}</div>
            <div><strong>타겟 고객:</strong> {identity.target || identity.target_audience || '-'}</div>
            <div><strong>톤앤매너:</strong> {identity.tone || '-'}</div>
            <div><strong>한 줄 소개:</strong> {identity.summary || '-'}</div>
            <div><strong>키워드:</strong> {Array.isArray(identity.keywords) ? identity.keywords.join(', ') : '-'}</div>
          </div>
        ) : (
          <p style="color:#94a3b8;font-size:13px">AI 분석 데이터가 없습니다.</p>
        )}
      </div>

      {/* 위젯 스타일 */}
      <div class="card">
        <h2>위젯 디자인</h2>
        {widgetStyle ? (
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px">
            <div><strong>프리셋:</strong> {widgetStyle.preset || '-'}</div>
            <div><strong>버튼 너비:</strong> {widgetStyle.buttonWidth}px</div>
            <div><strong>버튼 높이:</strong> {widgetStyle.buttonHeight || 44}px</div>
            <div><strong>버튼 간격:</strong> {widgetStyle.buttonGap}px</div>
            <div><strong>모서리:</strong> {widgetStyle.borderRadius}px</div>
            <div><strong>정렬:</strong> {widgetStyle.align || '-'}</div>
            <div><strong>버튼 문구:</strong> {widgetStyle.buttonLabel || '-'}</div>
            <div><strong>아이콘 표시:</strong> {widgetStyle.showIcon !== false ? '예' : '아니오'}</div>
          </div>
        ) : (
          <p style="color:#94a3b8;font-size:13px">기본 스타일 사용 중</p>
        )}
      </div>

      {/* 쿠폰 설정 */}
      <div class="card">
        <h2>쿠폰 설정</h2>
        {couponConfig?.shipping || couponConfig?.amount || couponConfig?.rate ? (
          <div style="display:grid;gap:8px;font-size:13px">
            <div><strong>무료배송:</strong> {couponConfig.shipping?.enabled ? `활성 (${couponConfig.shipping.expire_days}일)` : '비활성'}</div>
            <div><strong>정액할인:</strong> {couponConfig.amount?.enabled ? `활성 (${couponConfig.amount.discount_amount?.toLocaleString()}원, ${couponConfig.amount.expire_days}일${couponConfig.amount.min_order > 0 ? `, 최소 ${couponConfig.amount.min_order.toLocaleString()}원` : ''})` : '비활성'}</div>
            <div><strong>정률할인:</strong> {couponConfig.rate?.enabled ? `활성 (${couponConfig.rate.discount_rate}%, ${couponConfig.rate.expire_days}일${couponConfig.rate.min_order > 0 ? `, 최소 ${couponConfig.rate.min_order.toLocaleString()}원` : ''})` : '비활성'}</div>
            {couponConfig.cafe24_coupons && (
              <div style="margin-top:4px;color:#64748b">
                <strong>카페24 쿠폰:</strong>
                {couponConfig.cafe24_coupons.shipping_coupon_no && ` 무료배송 #${couponConfig.cafe24_coupons.shipping_coupon_no}`}
                {couponConfig.cafe24_coupons.amount_coupon_no && ` 정액 #${couponConfig.cafe24_coupons.amount_coupon_no}`}
                {couponConfig.cafe24_coupons.rate_coupon_no && ` 정률 #${couponConfig.cafe24_coupons.rate_coupon_no}`}
              </div>
            )}
          </div>
        ) : (
          <p style="color:#94a3b8;font-size:13px">쿠폰 설정 없음</p>
        )}
      </div>

      {/* Plus 기능 설정 (배너, 팝업, 에스컬레이션) */}
      <div class="card">
        <h2>Plus 기능</h2>
        <div style="display:grid;gap:12px;font-size:13px">
          <div>
            <strong>미니배너:</strong>{' '}
            {bannerConfig ? <span class="badge badge-green">설정됨</span> : <span class="badge badge-gray">미설정</span>}
            {bannerConfig && <span style="color:#64748b;margin-left:8px">프리셋 {bannerConfig.preset}, 위치: {bannerConfig.position || '-'}</span>}
          </div>
          <div>
            <strong>이탈 감지 팝업:</strong>{' '}
            {popupConfig ? <span class="badge badge-green">설정됨</span> : <span class="badge badge-gray">미설정</span>}
          </div>
          <div>
            <strong>에스컬레이션:</strong>{' '}
            {escalationConfig ? <span class="badge badge-green">설정됨</span> : <span class="badge badge-gray">미설정</span>}
          </div>
        </div>
      </div>
    </Layout>
  );
};
