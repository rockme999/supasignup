/**
 * Dashboard Home page.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { ProgressBar } from './charts';
import { providerColors, providerDisplayNames, type HomeStats } from './shared';
import { CHANGELOG_PUBLIC } from '../data/changelog';
import { extractRecentHighlights, extractLatestSectionTitle } from '../utils/changelog-summary';
import type { LossAversionCards } from '../routes/pages';

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
  created_at: string;
};

export const HomePage: FC<{
  shop: HomeShop | null;
  stats: HomeStats | null;
  funnelSummary?: Record<string, number>;
  lossAversion?: LossAversionCards;
  latestBriefing?: HomeBriefing | null;
  isCafe24?: boolean;
}> = ({ shop, stats, funnelSummary, lossAversion, latestBriefing, isCafe24 }) => {
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
              <span style="font-size:28px">✨</span>
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

      {/* 손실 회피 카드 — Free 플랜 + threshold 통과 시만 노출 */}
      {!isPlus && lossAversion && (() => {
        const showA = lossAversion.missedSignupCount >= 10 && lossAversion.dataDays >= 7;
        const showB = lossAversion.firstPurchaseGap.length >= 3;
        if (!showA && !showB) return null;
        return (
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-bottom:16px">
            {showA && (
              <a
                href="/dashboard/billing"
                style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer"
                class="loss-card"
              >
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#6366f1;background:#eef2ff;border-radius:4px;padding:2px 6px">PLUS</span>
                  <span style="font-size:11px;color:#94a3b8">최근 7일</span>
                </div>
                <div style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">
                  Plus로 추가 가입 가능 회원 : {lossAversion.missedSignupCount}명
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.5">
                  로그인 페이지 진입했지만 가입까지 안 간 비회원
                </div>
              </a>
            )}
            {showB && (
              <a
                href="/dashboard/billing"
                style="display:block;text-decoration:none;padding:20px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;box-shadow:0 1px 4px rgba(99,102,241,0.07);transition:border-color 0.15s,box-shadow 0.15s;cursor:pointer"
                class="loss-card"
              >
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                  <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#6366f1;background:#eef2ff;border-radius:4px;padding:2px 6px">PLUS</span>
                  <span style="font-size:11px;color:#94a3b8">가입 7일 이상 경과</span>
                </div>
                <div style="font-size:20px;font-weight:800;color:#1e293b;margin-bottom:4px">
                  Plus로 첫구매 가능 회원 : {lossAversion.firstPurchaseGap.length}명
                </div>
                <div style="font-size:12px;color:#64748b;line-height:1.5">
                  {lossAversion.firstPurchaseGap.join(', ')}
                </div>
              </a>
            )}
          </div>
        );
      })()}

      {/* AI 브리핑 카드 — 최신 브리핑이 있을 때만 노출 */}
      {latestBriefing && (() => {
        const headline = latestBriefing.headline?.trim();
        return (
          <a
            href="/dashboard/ai-briefing"
            style="display:block;text-decoration:none;padding:18px 24px;background:#fff;border:1.5px solid #e0e7ff;border-radius:12px;margin-bottom:16px;box-shadow:0 1px 4px rgba(99,102,241,0.06);transition:border-color 0.15s,box-shadow 0.15s,transform 0.15s"
            class="ai-briefing-card"
          >
            <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div style="min-width:0">
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:5px">
                  <span style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:#6366f1;background:#eef2ff;border-radius:4px;padding:2px 6px">✨ AI 브리핑</span>
                </div>
                <p style="font-size:14px;font-weight:500;color:#1e293b;margin:0;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                  {headline || '이번 주 AI 인사이트가 준비됐습니다.'}
                </p>
              </div>
              <span style="font-size:13px;color:#6366f1;font-weight:600;flex-shrink:0;white-space:nowrap">자세히 보기 →</span>
            </div>
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
