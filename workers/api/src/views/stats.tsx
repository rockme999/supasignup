/**
 * Statistics page.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { ProgressBar, LineChart, PieChart, HeatmapChart, MetricCard } from './charts';
import {
  providerColors,
  providerDisplayNames,
  providerPieColors,
  PIE_FALLBACK_COLORS,
  type HomeStats,
  type DailyData,
  type FunnelEventRow,
  type OauthDropoffData,
  type EffortData,
  type DistributionData,
  type HourlyData,
} from './shared';

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
