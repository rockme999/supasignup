/**
 * Dashboard Home page.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { ProgressBar } from './charts';
import { providerColors, providerDisplayNames, type HomeStats } from './shared';
import { CHANGELOG_PUBLIC } from '../data/changelog';
import { extractRecentHighlights, extractLatestSectionTitle } from '../utils/changelog-summary';
import type { LossAversionCards, PlusPerformance } from '../routes/pages';

type HomeShop = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  plan: string;
  sso_configured: number;
  monthly_signups: number;
  coupon_enabled: boolean;
};

export type HomeBriefing = {
  headline: string | null;
  performance: string | null;
  created_at: string;
};

export const HomePage: FC<{
  shop: HomeShop | null;
  stats: HomeStats | null;
  funnelSummary?: Record<string, number>;
  lossAversion?: LossAversionCards;
  plusPerformance?: PlusPerformance | null;
  latestBriefing?: HomeBriefing | null;
  isCafe24?: boolean;
}> = ({ shop, stats, funnelSummary, lossAversion, plusPerformance, latestBriefing, isCafe24 }) => {
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
              <div class="label">가입률 <span style="font-size:10px;color:#94a3b8">(7일)</span></div>
              <div class="value" style={overallCvr > 0 ? 'color:var(--color-primary)' : ''}>{overallCvr}%</div>
            </div>
          </div>
        );
      })()}

      {/* 프로바이더별 가입 현황 (도넛 차트) + 손실 회피 카드 (Free + threshold 통과 시 우측 배치) */}
      {stats && Object.keys(stats.by_provider).length > 0 && (() => {
        const showFreeCardA = !isPlus && lossAversion && lossAversion.missedSignupCount >= 10 && lossAversion.dataDays >= 7;
        const showFreeCardB = !isPlus && lossAversion && lossAversion.firstPurchaseGap.length >= 3;
        const showPlusPerf = isPlus && plusPerformance && plusPerformance.totalCaptured >= 1;
        const hasRightColumn = showFreeCardA || showFreeCardB || showPlusPerf;
        const entries = Object.entries(stats.by_provider).filter(([, v]) => (v ?? 0) > 0);
        const total = stats.total_signups || 1;
        const radius = 60;
        const circumference = 2 * Math.PI * radius;
        let offsetAcc = 0;
        return (
          <div style={hasRightColumn ? "display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px" : "margin-bottom:16px"}>
            {/* 좌측: 도넛 차트 */}
            <div class="card" style="margin-bottom:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
                <div>
                  <h2 style="margin-bottom:2px">프로바이더별 가입 현황</h2>
                  <p style="font-size:12px;color:#94a3b8;margin:0">누적 기준 요약</p>
                </div>
                <a href="/dashboard/stats" style="font-size:13px;white-space:nowrap">상세 →</a>
              </div>
              <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
                <svg width="160" height="160" viewBox="0 0 160 160" style="flex-shrink:0">
                  <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" stroke-width="22" />
                  {entries.map(([provider, count]) => {
                    const portion = (count ?? 0) / total;
                    const dash = portion * circumference;
                    const dashOffset = -offsetAcc;
                    offsetAcc += dash;
                    return (
                      <circle
                        cx="80" cy="80" r={radius}
                        fill="none"
                        stroke={providerColors[provider] || '#94a3b8'}
                        stroke-width="22"
                        stroke-dasharray={`${dash} ${circumference - dash}`}
                        stroke-dashoffset={dashOffset}
                        transform="rotate(-90 80 80)"
                      />
                    );
                  })}
                  <text x="80" y="76" text-anchor="middle" font-size="22" font-weight="700" fill="#1e293b">{stats.total_signups.toLocaleString()}</text>
                  <text x="80" y="96" text-anchor="middle" font-size="11" fill="#94a3b8">총 가입</text>
                </svg>
                <ul style="margin:0;padding:0;list-style:none;font-size:13px;flex:1;min-width:140px">
                  {entries.map(([provider, count]) => {
                    const pct = Math.round(((count ?? 0) / total) * 100);
                    return (
                      <li style="display:flex;align-items:center;gap:8px;padding:4px 0">
                        <span style={`width:10px;height:10px;border-radius:2px;background:${providerColors[provider] || '#94a3b8'};display:inline-block;flex-shrink:0`}></span>
                        <span style="color:#475569;flex:1">{providerDisplayNames[provider] || provider}</span>
                        <span style="color:#1e293b;font-weight:600">{(count ?? 0).toLocaleString()}</span>
                        <span style="color:#94a3b8;font-size:11px;width:36px;text-align:right">{pct}%</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            {/* 우측: Free → 손실 회피 카드 / Plus → 성과 지표 카드 */}
            {hasRightColumn && (
              <div style="display:flex;flex-direction:column;gap:12px">
                {/* Free 카드 A — 가입 의도 비회원 */}
                {showFreeCardA && (
                  <a
                    href="/dashboard/billing"
                    style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer;flex:1"
                    class="loss-card"
                  >
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                      <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#fff;background:#ec4899;border-radius:4px;padding:2px 6px">PLUS</span>
                      <span style="font-size:11px;color:#94a3b8">최근 7일</span>
                    </div>
                    <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:4px">
                      Plus로 가입 가능 회원 : {lossAversion!.missedSignupCount}명
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5">
                      로그인 페이지 진입했지만 가입까지 안 간 비회원
                    </div>
                  </a>
                )}
                {/* Free 카드 B — 첫구매 미전환 */}
                {showFreeCardB && (
                  <a
                    href="/dashboard/billing"
                    style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer;flex:1"
                    class="loss-card"
                  >
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                      <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#fff;background:#ec4899;border-radius:4px;padding:2px 6px">PLUS</span>
                      <span style="font-size:11px;color:#94a3b8">가입 7일 이상 경과</span>
                    </div>
                    <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:4px">
                      Plus로 첫구매 가능 회원 : {lossAversion!.firstPurchaseGap.length}명
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5">
                      {lossAversion!.firstPurchaseGap.join(', ')}
                    </div>
                  </a>
                )}
                {/* Plus 카드 A — 합계 */}
                {showPlusPerf && (
                  <a
                    href="/dashboard/stats"
                    style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer;flex:1"
                    class="loss-card"
                  >
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                      <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#fff;background:#ec4899;border-radius:4px;padding:2px 6px">PLUS</span>
                      <span style="font-size:11px;color:#94a3b8">최근 7일</span>
                    </div>
                    <div style="font-size:18px;font-weight:800;color:#1e293b;margin-bottom:4px">
                      Plus 도구로 추가 가입 : {plusPerformance!.totalCaptured}명
                    </div>
                    <div style="font-size:12px;color:#64748b;line-height:1.5">
                      미니배너·이탈 팝업·에스컬레이션 합계
                    </div>
                  </a>
                )}
                {/* Plus 카드 B — 도구별 분포 */}
                {showPlusPerf && (
                  <a
                    href="/dashboard/stats"
                    style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer;flex:1"
                    class="loss-card"
                  >
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                      <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#fff;background:#ec4899;border-radius:4px;padding:2px 6px">PLUS</span>
                      <span style="font-size:11px;color:#94a3b8">도구별 기여</span>
                    </div>
                    <div style="font-size:13px;color:#475569;line-height:1.8">
                      미니배너 {plusPerformance!.byTool.banner} · 이탈 팝업 {plusPerformance!.byTool.popup}<br />
                      에스컬레이션 {plusPerformance!.byTool.escalation}
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        );
      })()}

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

      {/* AI 브리핑 카드 — 최신 브리핑이 있을 때만 노출. 헤드라인 + 지난주 성과 미리보기 + 생성일자 */}
      {latestBriefing && (() => {
        const headline = latestBriefing.headline?.trim();
        const performanceRaw = latestBriefing.performance?.trim() ?? '';
        const performanceLines = performanceRaw.split('\n').filter(l => l.trim()).slice(0, 3);
        const performancePreview = performanceLines.join('\n');
        const truncated = performancePreview.length < performanceRaw.length;
        // 생성일자 KST 변환 — "YYYY.MM.DD" 형식
        const d = new Date(latestBriefing.created_at);
        const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
        const createdAtStr = `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')}`;
        return (
          <a
            href="/dashboard/ai-briefing"
            style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;margin-bottom:16px;box-shadow:0 1px 4px rgba(99,102,241,0.06);transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s"
            class="ai-briefing-card"
          >
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px">
              <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#6366f1;background:#eef2ff;border-radius:4px;padding:2px 6px">✨ AI 브리핑</span>
                <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#fff;background:#ec4899;border-radius:4px;padding:2px 6px">PLUS</span>
                <span style="font-size:11px;color:#94a3b8">{createdAtStr} (KST) 생성</span>
              </div>
              <span style="font-size:13px;color:#6366f1;font-weight:600;white-space:nowrap;flex-shrink:0">자세히 보기 →</span>
            </div>
            {headline && (
              <p style="font-size:15px;font-weight:600;color:#1e293b;margin:0 0 8px;line-height:1.5">
                {headline}
              </p>
            )}
            {performancePreview && (
              <p style="font-size:13px;color:#475569;margin:0;line-height:1.6;white-space:pre-line">
                {performancePreview}{truncated ? '...' : ''}
              </p>
            )}
          </a>
        );
      })()}

      {/* AI 브리핑 카드 — 데이터 없음 placeholder (가입 데이터 부족) */}
      {latestBriefing === null && (
        <div style="padding:14px 20px;background:#fafafa;border:1px dashed #cbd5e1;border-radius:10px;margin-bottom:16px;display:flex;align-items:center;gap:10px">
          <span style="font-size:13px;font-weight:700;color:#94a3b8;background:#f1f5f9;border-radius:4px;padding:2px 6px;flex-shrink:0">✨ AI 브리핑</span>
          <p style="font-size:13px;color:#94a3b8;margin:0">데이터 수집 중 — 가입이 누적되면 인사이트를 보여드릴게요</p>
        </div>
      )}

      {/* 빠른 실행 링크 */}
      <div class="card">
        <h2 style="margin-bottom:16px">빠른 실행</h2>
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
            <a href="/dashboard/ai-briefing" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #e5e7eb;border-radius:12px;text-decoration:none;color:#374151;transition:border-color 0.15s" class="quick-link">
              <span style="font-size:28px">✨</span>
              <span style="font-size:13px;font-weight:600">AI 브리핑</span>
            </a>
          ) : (
            <a href="/dashboard/billing" style="display:flex;flex-direction:column;align-items:center;gap:8px;padding:20px;border:1px solid #d1fae5;border-radius:12px;text-decoration:none;color:#374151;background:#f0fdf4;transition:border-color 0.15s" class="quick-link">
              <span style="font-size:28px">⚡</span>
              <span style="font-size:13px;font-weight:600">Plus 업그레이드</span>
              <span style="font-size:11px;color:#16a34a">미니배너·AI 브리핑</span>
            </a>
          )}
        </div>
      </div>

      {/* 최신 업데이트 */}
      {(() => {
        const highlights = extractRecentHighlights(CHANGELOG_PUBLIC, 5);
        const sectionTitle = extractLatestSectionTitle(CHANGELOG_PUBLIC);
        if (highlights.length === 0) return null;
        return (
          <div class="card" style="margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
              <div>
                <h2 style="margin-bottom:2px">🆕 최신 업데이트</h2>
                {sectionTitle && <p style="font-size:12px;color:#94a3b8;margin:0">{sectionTitle}</p>}
              </div>
              <a href="/dashboard/changelog" style="font-size:13px;white-space:nowrap">전체 보기 →</a>
            </div>
            <ul style="margin:0;padding-left:18px;list-style:disc">
              {highlights.map((item) => (
                <li style="font-size:13px;color:#374151;margin:5px 0;line-height:1.5">{item}</li>
              ))}
            </ul>
          </div>
        );
      })()}

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
