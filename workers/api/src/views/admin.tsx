/**
 * Admin pages.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { ProgressBar } from './charts';
import { providerColors, providerDisplayNames, inquiryStatusLabel } from './shared';

// ─── Admin Pages ─────────────────────────────────────────────

// --- Admin Home ---

type AdminPlanCounts = {
  total: number;
  free: number;
  cycleMonthly: number; // Plus 플랜 중 월간 결제 (billing_cycle='monthly')
  cycleYearly: number;  // Plus 플랜 중 연간 결제 (billing_cycle='yearly')
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
        <div class="label">Plus 월간</div>
        <div class="value" style="color:#2563eb">{planCounts.cycleMonthly.toLocaleString()}</div>
      </div>
      <div class="stat-card">
        <div class="label">Plus 연간</div>
        <div class="value" style="color:#059669">{planCounts.cycleYearly.toLocaleString()}</div>
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
                  <td style="font-size:12px">
                    <a href={`https://${shop.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">
                      <code>{shop.mall_id}</code>
                    </a>
                  </td>
                  <td><span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : 'Plus'}</span></td>
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
                  <td>
                    <a href={`https://${shop.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">
                      <code style="font-size:12px">{shop.mall_id}</code>
                    </a>
                  </td>
                  <td style="font-size:13px">{shop.owner_email}</td>
                  <td>
                    <select
                      class="plan-select"
                      data-shop-id={shop.shop_id}
                      style="padding:4px 8px;border:1px solid #d1d5db;border-radius:6px;font-size:12px"
                    >
                      <option value="free" selected={shop.plan === 'free'}>Free (무료)</option>
                      <option value="plus" selected={shop.plan === 'plus'}>Plus (유료)</option>
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
                        플랜 저장
                      </button>
                      <a
                        href={'/supadmin/shops/' + shop.shop_id}
                        class="btn btn-outline btn-sm"
                        style="font-size:11px;padding:4px 8px"
                      >
                        상세
                      </a>
                    </div>
                    {/* 정지/활성화는 상세 페이지의 "위험 구역"에서만 제공 — 오조작 방지 */}
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

      // 쇼핑몰 정지/활성화는 상세 페이지에서만 제공 — 리스트의 오조작 방지
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
  billing_cycle: string; // 'monthly' | 'yearly' — 결제 주기
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
                    <td>
                      <a href={`https://${sub.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">
                        <code style="font-size:12px">{sub.mall_id}</code>
                      </a>
                    </td>
                    <td style="font-size:13px">{sub.owner_email}</td>
                    <td>
                      <span class={`badge ${sub.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>
                        {sub.plan === 'free' ? 'Free' : 'Plus'}
                      </span>
                      {sub.plan !== 'free' && sub.billing_cycle && (
                        <span class="badge badge-gray" style="margin-left:4px;font-size:11px">
                          {sub.billing_cycle === 'monthly' ? '월간' : '연간'}
                        </span>
                      )}
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

type AdminInquiryRow = {
  id: string;
  title: string;
  content: string;
  reply: string | null;
  status: string;
  created_at: string;
  replied_at: string | null;
  owner_email: string;
  shop_name: string | null;
  mall_id: string;
  shop_id: string;
  auto_reply_inquiries: number;  // 0 = OFF, 1 = ON
  attachments?: string;          // R2 첨부 메타 JSON 배열 문자열
  customer_read_at: string | null;  // 쇼핑몰 운영자(고객)가 답변을 처음 조회한 시각
  admin_read_at: string | null;     // 수파레인 관리자가 문의를 처음 열어본 시각
};

export const AdminInquiriesPage: FC<{
  inquiries: AdminInquiryRow[];
  pagination: { page: number; pages: number; total: number };
  statusFilter: string;
  globalAutoReplyEnabled: boolean;
  pendingCount: number;
  autoRepliedCount: number;
}> = ({ inquiries, pagination, statusFilter, globalAutoReplyEnabled, pendingCount, autoRepliedCount }) => (
  <Layout title="문의 관리" loggedIn isAdmin currentPath="/supadmin/inquiries">
    <h1>문의 관리</h1>

    <div class="filter-bar" style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap">
      {['', 'pending', 'replied', 'auto_replied', 'closed'].map((s) => {
        const labels: Record<string, string> = { '': '전체', pending: '미답변', replied: '답변완료', auto_replied: 'AI자동답변', closed: '종료' };
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
                <th>쇼핑몰</th>
                <th>상태</th>
                <th>작성일시</th>
                <th>답변일시</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inq) => {
                const st = inquiryStatusLabel(inq.status);
                return (
                  <tr>
                    <td style="font-size:13px;font-weight:500;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                      <a
                        href="#"
                        class="inquiry-open"
                        data-id={inq.id}
                        style="color:#2563eb;text-decoration:none"
                      >
                        {inq.title}
                      </a>
                    </td>
                    <td style="font-size:12px;color:#64748b">
                      {inq.mall_id ? (
                        <a href={`https://${inq.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">{inq.mall_id}</a>
                      ) : (
                        inq.shop_name
                      )}
                    </td>
                    <td>
                      <span class={`badge ${st.cls}`}>{st.label}</span>
                      {/* 미열람 뱃지 (우선순위: AI 미검수 > 미확인 > 쇼핑몰 미열람) */}
                      {(() => {
                        const hasReply = !!(inq.reply && inq.reply.trim());
                        if (inq.status === 'auto_replied' && !inq.admin_read_at) {
                          return <span class="badge badge-red" style="margin-left:4px;font-size:11px">🔴 AI 답변 미검수</span>;
                        }
                        if (inq.status === 'replied' && !inq.admin_read_at) {
                          return <span class="badge badge-yellow" style="margin-left:4px;font-size:11px">🟠 미확인</span>;
                        }
                        if (hasReply && !inq.customer_read_at) {
                          return <span class="badge badge-gray" style="margin-left:4px;font-size:11px" title="쇼핑몰 운영자(고객)가 답변 페이지를 아직 방문하지 않음">👁 쇼핑몰 미열람</span>;
                        }
                        return null;
                      })()}
                    </td>
                    <td style="font-size:12px;color:#64748b;white-space:nowrap">{inq.created_at.slice(0, 16).replace('T', ' ')}</td>
                    <td style="font-size:12px;color:#64748b;white-space:nowrap">
                      {inq.replied_at ? inq.replied_at.slice(0, 16).replace('T', ' ') : '-'}
                    </td>
                    <td>
                      <button
                        class="btn btn-primary btn-sm inquiry-open"
                        data-id={inq.id}
                        style="font-size:11px;padding:4px 8px;width:auto"
                      >
                        {inq.status === 'pending' ? '답변' : '보기'}
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

    {/* 전역 AI 자동답변 토글 카드 — 목록·페이지네이션 아래로 이동 (2026-04-22) */}
    <div
      id="globalAutoReplyCard"
      style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:12px;padding:20px 24px;margin-top:24px"
    >
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:15px;font-weight:700;color:#7c3aed">AI 자동답변 (전역)</span>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input
            type="checkbox"
            id="globalAutoReplyToggle"
            checked={globalAutoReplyEnabled}
            style="width:18px;height:18px;cursor:pointer;accent-color:#7c3aed"
          />
          <span
            id="globalAutoReplyLabel"
            style={`font-size:13px;font-weight:600;color:${globalAutoReplyEnabled ? '#7c3aed' : '#6b7280'}`}
          >
            {globalAutoReplyEnabled ? 'ON' : 'OFF'}
          </span>
        </label>
      </div>
      <p style="font-size:12px;color:#6b7280;margin:0 0 8px 0;line-height:1.6">
        이 설정을 켜면 모든 쇼핑몰의 <strong>새 문의</strong>에 AI가 즉시 답변을 생성해 고객에게 자동 발송합니다.
        환각 방지 가드레일(금지 토큰·마무리 문구·리스크 키워드)에 걸리는 답변은 자동 발송되지 않고 pending 상태로 유지됩니다.
      </p>
      <p style="font-size:12px;color:#92400e;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:6px 10px;margin:0 0 8px 0;line-height:1.5">
        충분한 테스트 후에만 켜주세요. 잘못된 답변이 고객에게 즉시 발송될 수 있습니다.
      </p>
      <p style="font-size:12px;color:#64748b;margin:0">
        현재 상태: pending <strong id="statPending">{pendingCount}</strong>건 / auto_replied <strong id="statAutoReplied">{autoRepliedCount}</strong>건
      </p>
    </div>

    {/* 문의 데이터 (JSON 임베드) — </script> 브레이크아웃 XSS 방지를 위해 '<'를 <로 치환 */}
    <script
      id="inquiry-data"
      type="application/json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(
          inquiries.map((i) => ({
            id: i.id,
            title: i.title,
            content: i.content,
            reply: i.reply,
            status: i.status,
            created_at: i.created_at,
            replied_at: i.replied_at,
            owner_email: i.owner_email,
            shop: i.shop_name || i.mall_id,
            shop_id: i.shop_id,
            attachments: i.attachments || '[]',
            customer_read_at: i.customer_read_at,
            admin_read_at: i.admin_read_at,
          })),
        ).replace(/</g, '\\u003c'),
      }}
    />

    {/* 답변 모달 */}
    <div id="replyModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;align-items:center;justify-content:center">
      <div style="background:#fff;border-radius:12px;padding:28px;width:100%;max-width:640px;margin:24px;max-height:90vh;overflow-y:auto">
        <h2 id="replyModalTitle" style="margin-bottom:6px;font-size:18px;line-height:1.4"></h2>
        <p id="replyModalMeta" style="font-size:12px;color:#64748b;margin-bottom:16px"></p>

        <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px">문의 내용</div>
        <div
          id="replyModalContent"
          style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;margin-bottom:20px;max-height:240px;overflow-y:auto"
        />

        {/* 첨부 이미지 갤러리 (JS로 동적 렌더링) */}
        <div id="attachmentsGallery" style="display:none;margin-bottom:20px">
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:8px">첨부 이미지</div>
          <div id="attachmentsThumbs" style="display:flex;flex-wrap:wrap;gap:8px"></div>
        </div>

        <div id="existingReplyWrap" style="display:none;margin-bottom:20px">
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px">
            기존 답변 <span id="existingReplyMeta" style="font-weight:400;color:#64748b"></span>
          </div>
          <div
            id="existingReplyContent"
            class="md-reply"
            style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.65;word-break:break-word;max-height:300px;overflow-y:auto"
          />
          {/* AI 자동답변 디스클레이머 — status='auto_replied' 일 때만 표시 */}
          <div id="autoReplyDisclaimer" style="display:none;margin-top:10px;padding:10px 12px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;font-size:12px;color:#6b7280;line-height:1.6">
            <strong style="color:#7c3aed">AI 자동 답변</strong>입니다. 고객에게 동일 문구가 함께 표시됩니다. 내용이 부정확할 경우 "답변 수정" 으로 덮어쓸 수 있습니다.
          </div>
        </div>

        {/* AI 자동답변 실패 이력 — 실패 기록이 있는 경우에만 표시 */}
        <div id="failureHistoryWrap" style="display:none;margin-bottom:20px">
          <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:6px">
            AI 자동답변 실패 이력
            <span id="failureHistoryCount" style="font-weight:400;color:#b91c1c;margin-left:6px"></span>
          </div>
          <div id="failureHistoryList" style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px 12px;font-size:12px;color:#7f1d1d;max-height:200px;overflow-y:auto">
          </div>
        </div>

        {/* 전역 자동답변 상태 읽기 전용 뱃지 (운영자 참고용) */}
        <div id="globalAutoReplyBadgeWrap" style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 14px;margin-bottom:20px;display:flex;align-items:center;gap:8px">
          <span style="font-size:12px;font-weight:600;color:#7c3aed">AI 자동답변 (전역)</span>
          <span id="modalGlobalAutoReplyBadge" style="font-size:12px;font-weight:700;color:#6b7280">확인 중...</span>
          <span style="font-size:11px;color:#94a3b8">— 상단 설정에서 변경 가능</span>
        </div>

        <div id="replyFormWrap">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
            <span style="font-size:12px;font-weight:600;color:#374151" id="replyFormLabel">답변 작성</span>
            {/* AI 초안 생성 버튼 */}
            <button
              id="draftAiBtn"
              class="btn btn-sm"
              style="width:auto;background:#7c3aed;color:#fff;border:none;font-size:11px;padding:4px 10px;border-radius:6px;cursor:pointer"
            >
              ⚡ AI 답변 초안 생성
            </button>
            <span id="aiDraftUsageLabel" style="font-size:11px;color:#64748b"></span>
          </div>
          <div id="aiDraftLoading" style="display:none;font-size:12px;color:#7c3aed;margin-bottom:8px;padding:8px 10px;background:#faf5ff;border-radius:6px;border:1px solid #e9d5ff">
            생성 중... 30~60초 소요됩니다. 잠시 기다려 주세요.
          </div>
          <textarea
            id="replyContent"
            placeholder="답변 내용을 입력해 주세요"
            rows={6}
            style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit"
          />
        </div>

        <input type="hidden" id="replyTargetId" />
        <input type="hidden" id="replyTargetShopId" />
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
          <button id="cancelReply" class="btn btn-outline" style="width:auto">닫기</button>
          <button id="editReplyBtn" class="btn btn-outline" style="width:auto;display:none">답변 수정</button>
          <button id="submitReply" class="btn btn-primary" style="width:auto">답변 등록</button>
        </div>
      </div>
    </div>

    <script dangerouslySetInnerHTML={{__html: `
      var modal = document.getElementById('replyModal');
      var inquiryData = {};
      try {
        var raw = document.getElementById('inquiry-data').textContent || '[]';
        JSON.parse(raw).forEach(function(i) { inquiryData[i.id] = i; });
      } catch (e) { console.error('inquiry data parse failed', e); }

      // AI 초안 일일 사용 카운트 (localStorage 기반, 프론트 단)
      var AI_DRAFT_LIMIT = 20;
      var AI_DRAFT_LS_KEY = 'ai_draft_count_' + new Date().toISOString().slice(0, 10);
      function getAiDraftCount() { return parseInt(localStorage.getItem(AI_DRAFT_LS_KEY) || '0'); }
      function incAiDraftCount() { localStorage.setItem(AI_DRAFT_LS_KEY, String(getAiDraftCount() + 1)); }

      function updateAiDraftUsageLabel() {
        var el = document.getElementById('aiDraftUsageLabel');
        if (el) el.textContent = '오늘 ' + getAiDraftCount() + '/' + AI_DRAFT_LIMIT + '회 사용';
      }

      function openInquiry(id) {
        var inq = inquiryData[id];
        if (!inq) return;
        document.getElementById('replyTargetId').value = inq.id;
        document.getElementById('replyTargetShopId').value = inq.shop_id || '';
        document.getElementById('replyModalTitle').textContent = inq.title;
        document.getElementById('replyModalMeta').textContent =
          inq.owner_email + ' · ' + inq.shop + ' · ' + inq.created_at.slice(0, 16).replace('T', ' ');
        document.getElementById('replyModalContent').textContent = inq.content || '(내용 없음)';

        // 첨부 이미지 갤러리 렌더링
        var gallery = document.getElementById('attachmentsGallery');
        var thumbsEl = document.getElementById('attachmentsThumbs');
        thumbsEl.innerHTML = '';
        var attachments = [];
        try { attachments = JSON.parse(inq.attachments || '[]'); } catch(e) {}
        if (attachments.length > 0) {
          attachments.forEach(function(att) {
            var wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:3px';

            var imgLink = document.createElement('a');
            imgLink.href = '/api/supadmin/inquiries/' + inq.id + '/attachments/' + encodeURIComponent(att.key);
            imgLink.target = '_blank';
            imgLink.rel = 'noopener';

            var img = document.createElement('img');
            img.src = '/api/supadmin/inquiries/' + inq.id + '/attachments/' + encodeURIComponent(att.key);
            img.alt = att.name;
            img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block';
            img.onerror = function() { this.style.display = 'none'; };

            var meta = document.createElement('div');
            meta.style.cssText = 'font-size:10px;color:#94a3b8;width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center';
            var sizeKB = (att.size / 1024).toFixed(0);
            meta.title = att.name + ' (' + sizeKB + 'KB)';
            meta.textContent = att.name;

            var dateMeta = document.createElement('div');
            dateMeta.style.cssText = 'font-size:10px;color:#cbd5e1;width:80px;text-align:center';
            dateMeta.textContent = att.uploaded_at ? att.uploaded_at.slice(0, 10) : '';

            imgLink.appendChild(img);
            wrap.appendChild(imgLink);
            wrap.appendChild(meta);
            wrap.appendChild(dateMeta);
            thumbsEl.appendChild(wrap);
          });
          gallery.style.display = 'block';
        } else {
          gallery.style.display = 'none';
        }

        var existingWrap = document.getElementById('existingReplyWrap');
        var formWrap = document.getElementById('replyFormWrap');
        var submitBtn = document.getElementById('submitReply');
        var editBtn = document.getElementById('editReplyBtn');
        var textarea = document.getElementById('replyContent');

        if (inq.reply) {
          existingWrap.style.display = 'block';
          // 마크다운 렌더링 (굵게/리스트/단락 등). XSS 방어: bgMdToHtml 내부에서 escape 선행.
          document.getElementById('existingReplyContent').innerHTML =
            (window.bgMdToHtml ? window.bgMdToHtml(inq.reply) : inq.reply);
          // AI 자동답변인 경우에만 디스클레이머 표시
          var autoReplyDisclaimer = document.getElementById('autoReplyDisclaimer');
          if (autoReplyDisclaimer) {
            autoReplyDisclaimer.style.display = (inq.status === 'auto_replied') ? 'block' : 'none';
          }
          document.getElementById('existingReplyMeta').textContent =
            inq.replied_at ? '(' + inq.replied_at.slice(0, 16).replace('T', ' ') + ')' : '';
          // 답변완료 상태: 수정 모드로 진입하기 전까지 textarea 숨김
          formWrap.style.display = 'none';
          submitBtn.style.display = 'none';
          editBtn.style.display = 'inline-block';
          editBtn.textContent = '답변 수정';
          textarea.value = inq.reply;
          document.getElementById('replyFormLabel').textContent = '답변 수정';
        } else {
          existingWrap.style.display = 'none';
          formWrap.style.display = 'block';
          submitBtn.style.display = 'inline-block';
          submitBtn.textContent = '답변 등록';
          editBtn.style.display = 'none';
          textarea.value = '';
          document.getElementById('replyFormLabel').textContent = '답변 작성';
        }

        // 모달 내 전역 자동답변 뱃지 업데이트 (현재 전역 토글 상태 반영)
        var globalToggleEl = document.getElementById('globalAutoReplyToggle');
        var badge = document.getElementById('modalGlobalAutoReplyBadge');
        if (badge && globalToggleEl) {
          var globalOn = globalToggleEl.checked;
          badge.textContent = globalOn ? 'ON' : 'OFF';
          badge.style.color = globalOn ? '#7c3aed' : '#6b7280';
        }

        // 실패 이력 로드 (비동기 — 결과가 늦게 도착해도 모달 열기에 영향 없음)
        var fhWrap = document.getElementById('failureHistoryWrap');
        var fhList = document.getElementById('failureHistoryList');
        var fhCount = document.getElementById('failureHistoryCount');
        fhWrap.style.display = 'none';
        fhList.innerHTML = '';
        apiCall('GET', '/api/supadmin/inquiries/' + inq.id + '/auto-reply-failures', null)
          .then(function(r) { return r.ok ? r.json() : { failures: [] }; })
          .then(function(data) {
            var failures = data.failures || [];
            if (failures.length === 0) return;
            fhCount.textContent = '(' + failures.length + '건)';
            fhList.innerHTML = failures.map(function(f) {
              var reasonLabel = {
                'inquiry_not_found': '문의 찾을 수 없음',
                'shop_not_found': '쇼핑몰 찾을 수 없음',
                'ai_error': 'AI 호출 실패',
                'validation_failed': '답변 검증 실패',
                'held_for_review': '리뷰 보류',
                'unexpected_error': '예상 외 오류'
              }[f.reason] || f.reason;
              var ts = (f.created_at || '').slice(0, 19).replace('T', ' ');
              var elapsed = f.ai_elapsed_ms ? (' · ' + f.ai_elapsed_ms + 'ms') : '';
              var detail = f.detail ? ('\\n  → ' + String(f.detail).slice(0, 200)) : '';
              // 보안: HTML escape 후 줄바꿈만 유지
              var safeDetail = detail.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\n/g, '<br>');
              return '<div style="padding:6px 0;border-bottom:1px dashed #fca5a5">' +
                '<strong>시도 ' + f.attempt + '회차 · ' + reasonLabel + '</strong>' +
                ' <span style="color:#991b1b;opacity:0.7">' + ts + elapsed + '</span>' +
                safeDetail +
                '</div>';
            }).join('');
            fhWrap.style.display = 'block';
          })
          .catch(function(e) { console.error('failure history load error:', e); });

        updateAiDraftUsageLabel();

        // 관리자 첫 조회 시각 기록 (admin_read_at NULL 인 경우에만)
        if (!inq.admin_read_at) {
          apiCall('POST', '/api/supadmin/inquiries/' + id + '/mark-read', null)
            .then(function(r) {
              if (r.ok) {
                // 로컬 데이터 갱신 → 재열람 시 불필요한 재호출 방지
                inq.admin_read_at = new Date().toISOString();
              }
            })
            .catch(function(e) { console.error('[mark-read] failed:', e); });
        }

        modal.style.display = 'flex';
      }

      document.querySelectorAll('.inquiry-open').forEach(function(el) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          openInquiry(this.dataset.id);
        });
      });

      document.getElementById('editReplyBtn').addEventListener('click', function() {
        document.getElementById('replyFormWrap').style.display = 'block';
        document.getElementById('submitReply').style.display = 'inline-block';
        document.getElementById('submitReply').textContent = '답변 수정 저장';
        this.style.display = 'none';
      });

      document.getElementById('cancelReply').addEventListener('click', function() {
        modal.style.display = 'none';
      });

      // AI 답변 초안 생성 버튼 클릭
      document.getElementById('draftAiBtn').addEventListener('click', async function() {
        var id = document.getElementById('replyTargetId').value;
        if (!id) return;
        if (getAiDraftCount() >= AI_DRAFT_LIMIT) {
          showToast('error', '오늘 AI 초안 생성 한도(20회)에 도달했습니다.');
          return;
        }
        var textarea = document.getElementById('replyContent');
        if (textarea.value.trim()) {
          if (!confirm('이미 작성된 내용이 있습니다. AI 초안으로 교체하시겠습니까?')) return;
        }

        var btn = this;
        var loading = document.getElementById('aiDraftLoading');
        btn.disabled = true;
        loading.style.display = 'block';

        try {
          var resp = await apiCall('POST', '/api/supadmin/inquiries/' + id + '/draft-reply', {});
          if (resp.ok) {
            var data = await resp.json();
            textarea.value = data.draft || '';
            incAiDraftCount();
            updateAiDraftUsageLabel();
            showToast('success', 'AI 초안이 생성되었습니다. 검토 후 수정하여 등록해 주세요.');
          } else {
            var errData = await resp.json();
            if (resp.status === 429) {
              showToast('error', '오늘 AI 초안 생성 한도에 도달했습니다. (서버 기준 20회)');
            } else {
              showToast('error', errData.message || 'AI 초안 생성 중 오류가 발생했습니다.');
            }
          }
        } catch (e) {
          showToast('error', 'AI 초안 생성 중 네트워크 오류가 발생했습니다.');
        } finally {
          btn.disabled = false;
          loading.style.display = 'none';
        }
      });

      // 전역 AI 자동답변 토글 변경
      document.getElementById('globalAutoReplyToggle').addEventListener('change', async function() {
        var enabled = this.checked;
        if (enabled && !confirm('⚠️ 모든 쇼핑몰의 새 문의에 AI가 즉시 자동 답변하고 고객에게 발송됩니다.\\n충분한 테스트 후에만 켜주세요. 계속하시겠습니까?')) {
          this.checked = false;
          return;
        }
        var labelEl = document.getElementById('globalAutoReplyLabel');
        var resp = await apiCall('PUT', '/api/supadmin/settings/auto-reply', { enabled: enabled });
        if (resp.ok) {
          labelEl.textContent = enabled ? 'ON' : 'OFF';
          labelEl.style.color = enabled ? '#7c3aed' : '#6b7280';
          showToast('success', '전역 AI 자동답변이 ' + (enabled ? '활성화' : '비활성화') + '되었습니다.');
        } else {
          this.checked = !enabled;
          showToast('error', '전역 자동답변 설정 변경 중 오류가 발생했습니다.');
        }
      });

      document.getElementById('submitReply').addEventListener('click', async function() {
        var id = document.getElementById('replyTargetId').value;
        var reply = document.getElementById('replyContent').value.trim();
        if (!reply) { showToast('error', '답변 내용을 입력해 주세요.'); return; }
        var btn = this;
        var originalText = btn.textContent;
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
          btn.disabled = false; btn.textContent = originalText;
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
      전체 쇼핑몰의 AI 주간 브리핑 최신 현황입니다. 정체성 미설정 쇼핑몰은 <strong>🔄 분석</strong> 버튼으로 수동 트리거할 수 있습니다.
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
                  <td style="font-size:12px;color:#64748b">
                    <a href={`https://${row.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">
                      {row.mall_id}
                    </a>
                  </td>
                  <td>
                    <span class={`badge ${row.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>
                      {row.plan}
                    </span>
                  </td>
                  <td style="font-size:12px;color:#64748b">
                    {row.shop_identity ? (
                      <span style="color:#16a34a">설정됨</span>
                    ) : (
                      <div style="display:flex;align-items:center;gap:6px">
                        <span style="color:#dc2626">미설정</span>
                        <button
                          class="btn btn-outline btn-sm analyze-identity-btn"
                          data-shop-id={row.shop_id}
                          style="font-size:10px;padding:2px 8px;white-space:nowrap"
                          title="쇼핑몰 URL에서 AI가 업종·타겟·톤앤매너를 자동 분석합니다 (20~40초 소요)"
                        >
                          🔄 분석
                        </button>
                      </div>
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

    <script dangerouslySetInnerHTML={{__html: `
      // 쇼핑몰 정체성 수동 분석 버튼
      document.querySelectorAll('.analyze-identity-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var shopId = this.dataset.shopId;
          if (!confirm('이 쇼핑몰의 정체성을 AI로 분석하시겠습니까?\\n쇼핑몰 URL을 가져와 업종·타겟·톤앤매너를 추출합니다. 약 20~40초 소요됩니다.')) return;
          var originalText = btn.textContent;
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.style.cursor = 'wait';
          btn.textContent = '분석 중…';
          try {
            var resp = await apiCall('POST', '/api/supadmin/shops/' + shopId + '/analyze-identity', {}, btn);
            if (resp.ok) {
              showToast('success', '정체성 분석이 완료되었습니다.');
              setTimeout(function() { location.reload(); }, 700);
            } else {
              var data = await resp.json().catch(function() { return {}; });
              showToast('error', data.message || '분석 중 오류가 발생했습니다.');
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              btn.textContent = originalText;
            }
          } catch (e) {
            showToast('error', '네트워크 오류가 발생했습니다.');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = originalText;
          }
        });
      });
    `}} />
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
  mallId: string;
  shopIdentity?: string | null;
  briefings: AdminBriefingRow[];
}> = ({ shopName, shopId, mallId, shopIdentity, briefings }) => {
  let identity: Record<string, unknown> | null = null;
  if (shopIdentity) {
    try { identity = JSON.parse(shopIdentity); } catch { identity = null; }
  }
  return (
  <Layout title={`${shopName} — AI 보고서`} loggedIn isAdmin currentPath="/supadmin/ai-reports">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;flex-wrap:wrap">
      <a href="/supadmin/ai-reports" style="color:#64748b;text-decoration:none;font-size:13px">&larr; 목록으로</a>
      <h1 style="margin-bottom:0">{shopName}</h1>
      <a href={`https://${mallId}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none;font-size:13px" title="쇼핑몰을 새 탭에서 열기">
        <code style="font-size:12px;background:#f1f5f9;padding:2px 6px;border-radius:4px">{mallId}</code> ↗
      </a>
      <span style="font-size:13px;color:#94a3b8">AI 보고서 ({briefings.length}건)</span>
    </div>

    {/* 쇼핑몰 정체성 카드 — 보고서 위에 요약 표시 (클릭 시 아래 상세 카드로 이동) */}
    <div class="card" style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <h2 style="margin:0">쇼핑몰 정체성 (AI 분석)</h2>
        {identity ? (
          <button
            class="btn btn-outline btn-sm analyze-identity-btn"
            data-shop-id={shopId}
            style="font-size:11px;padding:4px 10px"
            title="쇼핑몰 URL을 다시 읽어 업종·타겟·톤앤매너를 재분석합니다 (20~40초)"
          >
            🔄 재분석
          </button>
        ) : (
          <button
            class="btn btn-primary btn-sm analyze-identity-btn"
            data-shop-id={shopId}
            style="font-size:11px;padding:4px 10px"
            title="쇼핑몰 URL에서 AI가 업종·타겟·톤앤매너를 자동 분석합니다 (20~40초)"
          >
            🔄 분석 시작
          </button>
        )}
      </div>
      {identity ? (
        <div style="display:grid;gap:8px;font-size:13px;line-height:1.6">
          <div><strong>업종:</strong> {(identity.industry as string) || '-'}</div>
          <div><strong>타겟 고객:</strong> {((identity.target || identity.target_audience) as string) || '-'}</div>
          <div><strong>톤앤매너:</strong> {(identity.tone as string) || '-'}</div>
          <div><strong>한 줄 소개:</strong> {(identity.summary as string) || '-'}</div>
          <div><strong>키워드:</strong> {Array.isArray(identity.keywords) ? (identity.keywords as string[]).join(', ') : '-'}</div>
        </div>
      ) : (
        <p style="color:#94a3b8;font-size:13px;margin:0">
          정체성 분석 데이터가 아직 없습니다. 위 <strong>🔄 분석 시작</strong> 버튼을 눌러 수동으로 분석할 수 있습니다.
        </p>
      )}
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

    {/* 정체성 수동 (재)분석 버튼 핸들러 — AdminAiReportsPage 와 동일 로직 */}
    <script dangerouslySetInnerHTML={{__html: `
      document.querySelectorAll('.analyze-identity-btn').forEach(function(btn) {
        btn.addEventListener('click', async function() {
          var shopId = this.dataset.shopId;
          if (!confirm('이 쇼핑몰의 정체성을 AI로 분석하시겠습니까?\\n쇼핑몰 URL을 가져와 업종·타겟·톤앤매너를 추출합니다. 약 20~40초 소요됩니다.')) return;
          var originalText = btn.textContent;
          btn.disabled = true;
          btn.style.opacity = '0.6';
          btn.style.cursor = 'wait';
          btn.textContent = '분석 중…';
          try {
            var resp = await apiCall('POST', '/api/supadmin/shops/' + shopId + '/analyze-identity', {}, btn);
            if (resp.ok) {
              showToast('success', '정체성 분석이 완료되었습니다.');
              setTimeout(function() { location.reload(); }, 700);
            } else {
              var data = await resp.json().catch(function() { return {}; });
              showToast('error', data.message || '분석 중 오류가 발생했습니다.');
              btn.disabled = false;
              btn.style.opacity = '1';
              btn.style.cursor = 'pointer';
              btn.textContent = originalText;
            }
          } catch (e) {
            showToast('error', '네트워크 오류가 발생했습니다.');
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = originalText;
          }
        });
      });
    `}} />
  </Layout>
  );
};

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
        <span class={`badge ${shop.plan === 'free' ? 'badge-gray' : 'badge-green'}`}>{shop.plan === 'free' ? 'Free' : 'Plus'}</span>
        {shop.deleted_at && <span class="badge badge-red">정지됨</span>}
      </div>

      {/* 기본 정보 */}
      <div class="card">
        <h2>기본 정보</h2>
        <div style="overflow-x:auto">
          <table>
            <tbody>
              <tr>
                <th style="width:140px">Mall ID</th>
                <td>
                  <a href={`https://${shop.mall_id}.cafe24.com`} target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:none" title="쇼핑몰을 새 탭에서 열기">
                    <code>{shop.mall_id}</code>
                  </a>
                  <span style="margin-left:8px;font-size:11px;color:#94a3b8">↗ 새 탭</span>
                </td>
              </tr>
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

      {/* ─── 위험 구역 — 정지/활성화 (수파레인 긴급 조치 전용) ─── */}
      <div class="card" style="background:#fef2f2;border:2px solid #fecaca;margin-top:24px">
        <h2 style="color:#991b1b;margin-bottom:6px">⚠️ 위험 구역</h2>
        <p style="font-size:13px;color:#7f1d1d;margin:0 0 14px 0;line-height:1.6">
          <strong>정지</strong> 시 이 쇼핑몰의 모든 기능(소셜 로그인·자동답변·위젯·웹훅)이 즉시 차단됩니다.
          법적 이슈·정책 위반·긴급 대응 등 명확한 사유가 있을 때만 사용하세요.
          실수 방지를 위해 아래 입력란에 <strong>mall_id</strong>({shop.mall_id})를 정확히 입력해야 버튼이 활성화됩니다.
        </p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <input
            type="text"
            id="dangerConfirmInput"
            data-mall-id={shop.mall_id}
            placeholder={`확인을 위해 "${shop.mall_id}" 입력`}
            style="padding:8px 10px;border:1px solid #fecaca;border-radius:6px;font-size:13px;min-width:240px"
          />
          {shop.deleted_at ? (
            <button
              id="dangerActivateBtn"
              data-shop-id={shop.shop_id}
              disabled
              class="btn btn-primary btn-sm"
              style="font-size:12px;padding:6px 12px;opacity:0.4;cursor:not-allowed"
            >
              활성화
            </button>
          ) : (
            <button
              id="dangerSuspendBtn"
              data-shop-id={shop.shop_id}
              disabled
              class="btn btn-danger btn-sm"
              style="font-size:12px;padding:6px 12px;opacity:0.4;cursor:not-allowed"
            >
              🛑 정지
            </button>
          )}
          <span style="font-size:12px;color:#7f1d1d">
            현재 상태: {shop.deleted_at ? <strong>정지됨 ({shop.deleted_at.slice(0,16).replace('T',' ')})</strong> : <strong>활성</strong>}
          </span>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          var input = document.getElementById('dangerConfirmInput');
          var btn = document.getElementById('dangerSuspendBtn') || document.getElementById('dangerActivateBtn');
          if (!input || !btn) return;
          var expected = input.dataset.mallId;
          var action = btn.id === 'dangerSuspendBtn' ? 'suspend' : 'activate';
          var label = action === 'suspend' ? '정지' : '활성화';

          input.addEventListener('input', function() {
            var ok = input.value.trim() === expected;
            btn.disabled = !ok;
            btn.style.opacity = ok ? '1' : '0.4';
            btn.style.cursor = ok ? 'pointer' : 'not-allowed';
          });

          btn.addEventListener('click', async function() {
            if (btn.disabled) return;
            if (!confirm('정말로 이 쇼핑몰을 ' + label + '하시겠습니까?\\n이 조치는 감사 로그에 기록됩니다.')) return;
            var shopId = btn.dataset.shopId;
            var resp = await apiCall('PUT', '/api/supadmin/shops/' + shopId + '/status', { action: action }, btn);
            if (resp.ok) {
              showToast('success', label + ' 처리되었습니다.');
              setTimeout(function() { location.reload(); }, 800);
            } else {
              var data = await resp.json();
              showToast('error', data.error || (label + ' 중 오류가 발생했습니다.'));
            }
          });
        })();
      `}} />
    </Layout>
  );
};
