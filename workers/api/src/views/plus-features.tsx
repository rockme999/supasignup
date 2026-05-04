/**
 * Plus-only feature pages: BannerSettingsPage, PopupSettingsPage, EscalationSettingsPage,
 * AiSettingsPage, AiBriefingPage, LiveCounterSettingsPage
 * + PlusLockOverlay.
 *
 * AiReportsPage: deprecated — /dashboard/ai-reports는 /dashboard/ai-briefing으로 301 redirect됨.
 * CouponPackSettingsPage: 제거 — 기본 설정 페이지(settings.tsx)로 통합됨.
 * ExitIntentSettingsPage: 제거(2026-04-30) — 이탈 감지 팝업(PopupSettingsPage)으로 통합됨.
 *   /dashboard/settings/exit-intent → /dashboard/settings/popup 으로 301 redirect.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { buildCouponPackHtml, COUPON_PACK_CSS } from '../widget/coupon-pack';

export const AiReportsPage: FC<{
  shop: { shop_id: string; shop_name: string; mall_id: string; plan: string };
  isCafe24?: boolean;
  briefings?: Array<{ id: string; performance: string; strategy: string; actions: string; insight?: string; source: string; created_at: string }>;
}> = ({ shop, isCafe24, briefings }) => {
  const isPlus = shop.plan !== 'free';

  return (
    <Layout title="AI 브리핑" loggedIn currentPath="/dashboard/ai-reports" isCafe24={isCafe24}>
      <h1 style="margin-bottom:4px">AI 브리핑</h1>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">지난 주 성과를 분석하고 이번 주 전략을 AI가 생성합니다.</p>

      {!isPlus ? (
        <PlusLockOverlay feature="AI 브리핑" />
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
  'AI 브리핑': {
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
  '라이브 가입자 카운터': {
    desc: '방문자에게 오늘 가입자 수와 최근 가입 알림을 실시간으로 보여줍니다.',
    highlights: ['오늘 가입자 수 sticky 카운터', '최근 30분 내 가입자 토스트 알림', '위치 선택 (우하단/좌하단 등)', '"번개가입" 신뢰 배지 포함'],
    preview: `<div style="position:relative;height:80px;background:#f8fafc;border-radius:8px;overflow:hidden">
      <div style="position:absolute;bottom:8px;right:8px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <div style="font-size:11px;font-weight:600;color:#1e293b;margin-bottom:2px">오늘 12명이 가입했어요</div>
        <div style="font-size:9px;color:#94a3b8">⚡ 번개가입</div>
      </div>
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

export const BannerSettingsPage: FC<{
  shop: { plan: string; shop_id?: string; shop_name?: string | null } | null;
  shopId?: string;
  bannerConfig?: { enabled?: boolean; hideOnSpecialPages?: boolean; preset: number; text: string; borderRadius: number; icon: string; position: string; fullWidth?: boolean; paddingX?: number; height?: number; animation?: string; opacity?: number; bold?: boolean; italic?: boolean; hideForReturning?: boolean; anchorSelector?: string } | null;
  liveCounterConfig?: { enabled?: boolean; position?: string; show_toast?: boolean; show_counter?: boolean } | null;
  isCafe24?: boolean;
}> = ({ shop, shopId, bannerConfig, liveCounterConfig, isCafe24 }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  const bc = bannerConfig || { preset: 0, text: '', borderRadius: 10, icon: '⚡', position: 'floating', fullWidth: false, paddingX: 24, height: 44 };
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
  // 라이브 카운터 초기값 — 통합 미리보기 element 초기 좌표 결정용
  const lcInit = liveCounterConfig || {};
  const lcEnabledInit = lcInit.enabled !== false;
  const lcPositionInit = lcInit.position || 'bottom-right';
  const lcShowToastInit = lcInit.show_toast !== false;
  const lcShowCounterInit = lcInit.show_counter !== false;
  // 카운터/토스트 초기 좌표 (LiveCounterSection 의 posMap 과 동일한 좌표계)
  const lcCounterStyleInit = (() => {
    const map: Record<string, string> = {
      'bottom-right': 'bottom:16px;right:16px;top:auto;left:auto',
      'bottom-left':  'bottom:16px;left:16px;top:auto;right:auto',
      'top-right':    'top:16px;right:16px;bottom:auto;left:auto',
      'top-left':     'top:16px;left:16px;bottom:auto;right:auto',
    };
    return map[lcPositionInit] || map['bottom-right'];
  })();
  const lcToastStyleInit = (() => {
    const map: Record<string, string> = {
      'bottom-right': 'bottom:100px;right:16px;top:auto;left:auto',
      'bottom-left':  'bottom:100px;left:16px;top:auto;right:auto',
      'top-right':    'top:100px;right:16px;bottom:auto;left:auto',
      'top-left':     'top:100px;left:16px;bottom:auto;right:auto',
    };
    return map[lcPositionInit] || map['bottom-right'];
  })();
  return (
    <Layout title="미니배너 & 라이브 카운터" loggedIn currentPath="/dashboard/settings/banner" isCafe24={isCafe24}>
      <h1>미니배너 &amp; 라이브 카운터</h1>
      {!isPlus
        ? <PlusLockOverlay feature="미니배너" />
        : (
          <div>
            {/* ── 카드 1: 통합 미리보기 ───────────────────────── */}
            <div class="card" style="margin-bottom:16px">
              <h2>통합 미리보기</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:16px">미니배너와 라이브 카운터가 함께 표시되는 모습입니다. 아래 설정을 변경하면 즉시 반영됩니다.</p>
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
                    style={`${(bc.fullWidth === true) ? 'width:100%;padding:0 16px' : 'width:fit-content;padding:0 ' + (bc.paddingX || 24) + 'px'};height:30px;margin:0 auto;background:${ps.bg};border:${ps.border};border-radius:${bc.borderRadius}px;opacity:${(bc.opacity != null ? bc.opacity : 90) / 100};display:flex;align-items:center;justify-content:center;text-align:center;cursor:pointer`}
                  >
                    <span style={`color:${ps.color};font-size:14px;font-weight:${bc.bold ? '600' : '400'};font-style:${bc.italic ? 'italic' : 'normal'}`} id="bannerPreviewText">
                      <span id="bannerPreviewIcon">{bc.icon || '⚡'}</span> {bc.text || '번개가입으로 회원 혜택을 받으세요!'}
                    </span>
                  </div>
                </div>
                {/* 모의 페이지 콘텐츠 영역 — 라이브 카운터/토스트가 이 안에 absolute 배치 */}
                <div id="lcPreviewArea" style="position:relative;background:#f9fafb;border-top:1px solid #f0f0f0;height:240px;overflow:hidden">
                  <div style="position:absolute;top:0;left:0;right:0;bottom:0;background:repeating-linear-gradient(45deg,#f9fafb 0px,#f9fafb 10px,#f1f5f9 10px,#f1f5f9 20px);opacity:0.4"></div>
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12px;color:#9ca3af">쇼핑몰 페이지 콘텐츠 영역</div>
                  <div id="lcPreviewCounter" style={`position:absolute;${lcCounterStyleInit};background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;box-shadow:0 4px 18px rgba(0,0,0,0.13);min-width:160px;transition:all 0.2s;display:${(lcEnabledInit && lcShowCounterInit) ? 'block' : 'none'}`}>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:4px">오늘 12명이 가입했어요</div>
                    <div style="font-size:10px;color:#94a3b8;display:flex;align-items:center;gap:3px">
                      <span>⚡</span> 번개가입
                    </div>
                  </div>
                  <div id="lcPreviewToast" style={`position:absolute;${lcToastStyleInit};background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:10px 14px;box-shadow:0 4px 18px rgba(0,0,0,0.13);min-width:160px;opacity:0.75;transition:all 0.2s;display:${(lcEnabledInit && lcShowToastInit) ? 'block' : 'none'}`}>
                    <div style="font-size:13px;font-weight:600;color:#1e293b;margin-bottom:2px">김O자님이 가입했어요</div>
                    <div style="font-size:11px;color:#94a3b8">3분 전</div>
                  </div>
                  <div id="lcPreviewDisabled" style={`display:${lcEnabledInit ? 'none' : 'block'};position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:13px;color:#94a3b8;background:#fff;padding:8px 16px;border-radius:8px;border:1px dashed #cbd5e1;z-index:2`}>라이브 카운터 비활성화됨</div>
                </div>
              </div>
              <p style="font-size:11px;color:#94a3b8;margin-top:8px">"번개가입" 배지는 제거할 수 없습니다 (브랜드 신뢰도 차별화).</p>
            </div>

            {/* ── 카드 2: 미니배너 ────────────────────────────── */}
            <div class="card" style="margin-bottom:16px">
              <h2>미니배너</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:16px">로그인 페이지 상단에 회원가입 유도 배너가 표시됩니다.</p>
              <div id="bannerSaveMsg" style="display:none;padding:10px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:500"></div>

              {/* 활성화 토글 (collapsible 밖, 카드 상단) — 클릭 가능, banner_config.enabled 저장 */}
              <div style="margin-bottom:16px">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">배너 활성화</label>
                <div style="display:flex;align-items:center;gap:10px">
                  <div id="bannerEnabledToggle" data-value={bc.enabled !== false ? 'true' : 'false'}
                    style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${bc.enabled !== false ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'};transition:background 0.2s`}>
                    <div style={`position:absolute;top:2px;${bc.enabled !== false ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                  </div>
                  <span id="bannerEnabledLabel" style="font-size:13px;color:#374151">{bc.enabled !== false ? '활성화됨' : '비활성화됨'}</span>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin-top:6px">비활성화 시 미니배너가 표시되지 않습니다.</p>
              </div>

              {/* 설정 영역 (펼치기/접기) */}
              <div>
                <div id="bannerSettingsToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px">
                  <span style="font-size:14px;font-weight:600;color:#374151">상세 설정</span>
                  <span id="bannerSettingsArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
                </div>
                <div id="bannerSettingsBody" style="display:none">
                  {/* 표시 조건 토글 2종 — 한 줄 가로 배치, 좁은 화면에선 자동 줄바꿈 */}
                  <div style="display:flex;gap:48px;flex-wrap:wrap;align-items:flex-start;margin-bottom:16px">
                    <div class="form-group" style="margin:0">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:12px">이전 로그인 기록 감지 시 표시 안함</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="bannerHideReturningToggle" style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${bc.hideForReturning ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'}`}>
                          <div style={`position:absolute;top:2px;${bc.hideForReturning ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                        </div>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:6px">켜면 로그인 이력이 있는 방문자에게 배너를 표시하지 않습니다.</p>
                    </div>
                    <div class="form-group" style="margin:0">
                      <label style="display:block;font-size:13px;font-weight:600;margin-bottom:12px">메인/로그인/회원가입 페이지에서 숨기기</label>
                      <div style="display:flex;align-items:center;gap:8px">
                        <div id="bannerHideSpecialToggle" data-value={bc.hideOnSpecialPages !== false ? 'true' : 'false'}
                          style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${bc.hideOnSpecialPages !== false ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'};transition:background 0.2s`}>
                          <div style={`position:absolute;top:2px;${bc.hideOnSpecialPages !== false ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                        </div>
                      </div>
                      <p style="font-size:11px;color:#94a3b8;margin-top:6px">켜면 쇼핑몰 메인 페이지와 로그인·회원가입 페이지에서는 미니배너가 표시되지 않습니다. (기본 ON)</p>
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
                        maxlength={30}
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
                      <div id="bannerFullWidthToggle" style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${(bc.fullWidth === true) ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db'}`}>
                        <div style={`position:absolute;top:2px;${(bc.fullWidth === true) ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                      </div>
                    </div>
                    <div id="bannerPaddingGroup" style={`opacity:${(bc.fullWidth === true) ? '0.4' : '1'};pointer-events:${(bc.fullWidth === true) ? 'none' : 'auto'}`}>
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

                var isFullWidth = ${bc.fullWidth === true ? 'true' : 'false'};
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

                // 배너 활성화 토글 (collapsible 밖, 카드 상단)
                var bannerEnabled = document.getElementById('bannerEnabledToggle').getAttribute('data-value') === 'true';
                var enabledToggle = document.getElementById('bannerEnabledToggle');
                if (enabledToggle) {
                  enabledToggle.addEventListener('click', function() {
                    bannerEnabled = !bannerEnabled;
                    this.setAttribute('data-value', bannerEnabled ? 'true' : 'false');
                    this.style.background = bannerEnabled ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db';
                    var dot = this.querySelector('div');
                    if (dot) { dot.style.right = bannerEnabled ? '2px' : ''; dot.style.left = bannerEnabled ? '' : '2px'; }
                    var lbl = document.getElementById('bannerEnabledLabel');
                    if (lbl) lbl.textContent = bannerEnabled ? '활성화됨' : '비활성화됨';
                    // 통합 미리보기에서 배너 element 즉시 visibility 토글
                    var preview = document.getElementById('bannerPreview');
                    if (preview) preview.style.display = bannerEnabled ? '' : 'none';
                  });
                }

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

                // 메인/로그인/회원가입 페이지에서 숨기기 토글 (기본 ON)
                var hideSpecialToggle = document.getElementById('bannerHideSpecialToggle');
                var hideOnSpecialPages = hideSpecialToggle ? hideSpecialToggle.getAttribute('data-value') === 'true' : true;
                if (hideSpecialToggle) {
                  hideSpecialToggle.addEventListener('click', function() {
                    hideOnSpecialPages = !hideOnSpecialPages;
                    this.setAttribute('data-value', hideOnSpecialPages ? 'true' : 'false');
                    this.style.background = hideOnSpecialPages ? 'linear-gradient(135deg,#f472b6 0%,#db2777 100%)' : '#d1d5db';
                    var dot = this.querySelector('div');
                    if (dot) { dot.style.right = hideOnSpecialPages ? '2px' : ''; dot.style.left = hideOnSpecialPages ? '' : '2px'; }
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
                      enabled: bannerEnabled,
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
                      hideOnSpecialPages: hideOnSpecialPages,
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

                    // 즉시 저장 — 기존 저장 버튼 클릭 흐름 재사용
                    var saveBtn = document.getElementById('bannerSaveBtn');
                    if (saveBtn) saveBtn.click();
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
            <LiveCounterSection shop={shop} shopId={shopId || ''} liveCounterConfig={liveCounterConfig} />
          </div>
        )
      }
    </Layout>
  );
};


export const PopupSettingsPage: FC<{
  shop: { shop_id: string; plan: string } | null;
  isCafe24?: boolean;
  couponPackPreview?: { design?: string; anim_mode?: boolean } | null;
  couponConfigPreview?: Record<string, { enabled?: boolean; discount_amount?: number; discount_rate?: number }> | null;
}> = ({ shop, isCafe24, couponPackPreview, couponConfigPreview }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  const shopId = shop?.shop_id || '';
  // 쿠폰팩 미리보기: 운영자가 설정한 디자인/애니가 있으면 그걸 사용, 없으면 brand+anim
  const cpDesign = (['dark', 'brand', 'illust', 'minimal'] as const).includes(
    (couponPackPreview?.design as 'dark' | 'brand' | 'illust' | 'minimal') ?? 'brand'
  ) ? (couponPackPreview?.design as 'dark' | 'brand' | 'illust' | 'minimal') : 'brand';
  const cpAnim = couponPackPreview?.anim_mode !== false; // 기본 true
  const couponPackHtml = buildCouponPackHtml({ design: cpDesign, anim_mode: cpAnim, size: 'sm' });
  // 단일 쿠폰 미리보기용 데이터 (서버에서 미리 빌드하지 않고 클라이언트에서 토글)
  const ccShipping = couponConfigPreview?.shipping ?? null;
  const ccAmount = couponConfigPreview?.amount ?? null;
  const ccRate = couponConfigPreview?.rate ?? null;
  const ccShippingEnabled = ccShipping?.enabled === true;
  const ccAmountEnabled = ccAmount?.enabled === true;
  const ccRateEnabled = ccRate?.enabled === true;
  const ccAmountVal = ccAmount?.discount_amount ?? 0;
  const ccRateVal = ccRate?.discount_rate ?? 0;
  return (
    <Layout title="이탈 감지 팝업" loggedIn currentPath="/dashboard/settings/popup" isCafe24={isCafe24}>
      <h1 style="margin-bottom:4px">이탈 감지 팝업</h1>
      <p style="font-size:13px;color:#64748b;margin-bottom:4px">PC: 마우스가 브라우저 밖으로 나갈 때 / 모바일: 급격한 스크롤 업 감지 시 표시됩니다.</p>
      <p style="font-size:13px;color:#64748b;margin-bottom:20px">팝업을 보여준 뒤 가입까지 이어지지 않은 이탈 방문자를 재유도합니다.</p>
      {!isPlus
        ? <PlusLockOverlay feature="이탈 감지 팝업" />
        : (
          <div>
            {/* COUPON_PACK_CSS는 미리보기용으로 1회 주입 (위젯 측은 이탈 팝업 표시 시점에 별도로 주입됨) */}
            <style dangerouslySetInnerHTML={{__html: COUPON_PACK_CSS}} />

            {/* ── Card 1: 미리보기 + 핵심 활성화 ─────────────────── */}
            <div class="card">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
                <h2 style="margin:0">미리보기 &amp; 활성화</h2>
                <div style="display:flex;align-items:center;gap:8px">
                  <div id="popupEnabledToggle" style="width:40px;height:22px;background:#2563eb;border-radius:11px;position:relative;cursor:pointer">
                    <div id="popupEnabledKnob" style="position:absolute;top:2px;right:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                  </div>
                  <span id="popupEnabledLabel" style="font-size:13px;color:#374151;font-weight:600">활성화됨</span>
                </div>
              </div>

              {/* 미리보기 */}
              <div style="margin-bottom:16px">
                <p style="font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.05em">팝업 미리보기</p>
                <div style="background:#f8fafc;border:2px solid #e5e7eb;border-radius:12px;padding:24px;position:relative;overflow:hidden">
                  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;user-select:none">
                    <div style="font-size:64px;line-height:1;margin-bottom:4px">&#129302;</div>
                    <p style="font-size:18px;font-weight:700;color:#111827;margin:0">&#51676;&#51088;&#51092;!</p>
                    <p style="font-size:11px;color:#111827;margin:2px 0 0">(test text)</p>
                  </div>
                  <p style="font-size:11px;color:#94a3b8;margin-bottom:12px;text-align:center;position:relative">이탈 감지 시 표시되는 팝업</p>
                  <div id="popupPreviewCard" style="background:white;max-width:340px;margin:0 auto;padding:24px;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative">
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
                    {/* 쿠폰팩 카드 미리보기 (coupon_mode='pack' 일 때 표시) */}
                    <div id="popupPreviewCouponPack" style="display:flex;justify-content:center;margin:16px 0 12px"
                      dangerouslySetInnerHTML={{__html: couponPackHtml}} />
                    {/* 단일 쿠폰 카드 미리보기 (coupon_mode='single' 일 때 표시) */}
                    <div id="popupPreviewCouponSingle" style="display:none;margin:16px 0 12px">
                      <div id="popupPreviewSingleInner" style="position:relative;width:100%;max-width:300px;margin:0 auto;height:84px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:12px;display:flex;align-items:center;gap:14px;padding:0 18px;box-sizing:border-box;overflow:hidden">
                        <div id="popupPreviewSingleAccent" style="position:absolute;left:0;top:0;width:5px;height:100%;background:#059669;border-radius:12px 0 0 12px"></div>
                        <div id="popupPreviewSingleIcon" style="font-size:24px;flex-shrink:0">🚚</div>
                        <div>
                          <div id="popupPreviewSingleLabel" style="font-size:14px;font-weight:700;color:#059669;margin-bottom:3px">무료배송 쿠폰</div>
                          <div style="font-size:11px;color:#6b7280">가입 즉시 자동 지급</div>
                        </div>
                        <div id="popupPreviewSingleDash" style="position:absolute;right:0;top:0;bottom:0;width:3px;border-right:1.5px dashed #a7f3d0"></div>
                      </div>
                      <div id="popupPreviewSingleWarn" style="display:none;text-align:center;font-size:11px;color:#dc2626;margin-top:6px">선택한 쿠폰이 기본 설정에서 비활성화되어 있어 위젯에서는 표시되지 않습니다.</div>
                    </div>
                    <div style="text-align:center"><button id="popupPreviewCta" style="display:inline-block;padding:9px 24px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;opacity:0.92">혜택 받고 가입하기</button></div>
                  </div>
                </div>
              </div>

              {/* 핵심 동작 옵션 — 각 슬라이더/토글 단독 줄 */}
              <div class="form-group" style="margin-bottom:16px">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">노출 범위</label>
                <div style="display:flex;align-items:center;gap:8px">
                  <div id="popupAllPagesToggle" style="width:40px;height:22px;background:#d1d5db;border-radius:11px;position:relative;cursor:pointer">
                    <div id="popupAllPagesKnob" style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s"></div>
                  </div>
                  <span id="popupAllPagesLabel" style="font-size:13px;color:#374151">로그인 페이지만</span>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin-top:4px">켜면 모든 페이지에서 비로그인 방문자에게 이탈 감지 시 팝업 표시</p>
              </div>
              <div style="margin-bottom:16px">
                <label style="font-size:13px;font-weight:600;color:#475569;display:flex;justify-content:space-between;margin-bottom:6px" for="popupCooldown">
                  <span>재노출 간격 <span style="font-weight:400;color:#94a3b8">(이 시간 내 1회만 노출)</span></span>
                  <span id="popupCooldownValue">24시간</span>
                </label>
                <input type="range" min="1" max="168" value="24" id="popupCooldown" style="width:100%" />
              </div>
            </div>

            {/* ── Card 2: 쿠폰 카드 표시 모드 ─────────────────────── */}
            <div class="card">
              <h2>쿠폰 카드 표시 모드</h2>
              <p style="font-size:13px;color:#64748b;margin-bottom:16px">팝업 안에 쿠폰 그래픽 카드를 노출합니다. 카드가 있는 팝업의 가입 전환율이 더 높습니다.</p>
              <div style="display:flex;gap:16px;flex-wrap:wrap">
                <label class="popup-coupon-mode-card" data-mode="pack" style="flex:1;min-width:200px;padding:14px 16px;border:2px solid #2563eb;border-radius:10px;cursor:pointer;background:#eff6ff;display:flex;align-items:flex-start;gap:10px">
                  <input type="radio" name="popupCouponMode" value="pack" checked style="margin-top:3px;cursor:pointer" />
                  <div>
                    <div style="font-size:13px;font-weight:700;color:#1e40af;margin-bottom:2px">쿠폰팩 카드 (Plus)</div>
                    <div style="font-size:11px;color:#475569;line-height:1.5">5만원 상당 신규회원 쿠폰팩을 큼지막한 카드로 노출. <strong>전환율 최고</strong>.</div>
                  </div>
                </label>
                <label class="popup-coupon-mode-card" data-mode="single" style="flex:1;min-width:200px;padding:14px 16px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;background:#fff;display:flex;align-items:flex-start;gap:10px">
                  <input type="radio" name="popupCouponMode" value="single" style="margin-top:3px;cursor:pointer" />
                  <div>
                    <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:2px">단일 쿠폰 카드</div>
                    <div style="font-size:11px;color:#64748b;line-height:1.5">기본 쿠폰 1종을 그래픽 카드로 노출. 무료배송/정액/정률 중 선택.</div>
                  </div>
                </label>
                <label class="popup-coupon-mode-card" data-mode="none" style="flex:1;min-width:200px;padding:14px 16px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;background:#fff;display:flex;align-items:flex-start;gap:10px">
                  <input type="radio" name="popupCouponMode" value="none" style="margin-top:3px;cursor:pointer" />
                  <div>
                    <div style="font-size:13px;font-weight:700;color:#374151;margin-bottom:2px">없음</div>
                    <div style="font-size:11px;color:#64748b;line-height:1.5">텍스트만으로 가입 유도. 카드 그래픽 미노출.</div>
                  </div>
                </label>
              </div>

              {/* 단일 쿠폰일 때만 표시: 쿠폰 종류 */}
              <div id="popupCouponTypeRow" style="display:none;margin-top:16px;padding:14px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px">
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupCouponType">쿠폰 종류 <span style="font-weight:400;color:#94a3b8">(단일 쿠폰 모드)</span></label>
                <select id="popupCouponType" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:240px">
                  <option value="shipping">무료배송 쿠폰</option>
                  <option value="amount">정액 할인 쿠폰</option>
                  <option value="rate">정률 할인 쿠폰</option>
                </select>
                <p style="font-size:11px;color:#94a3b8;margin-top:6px">선택한 쿠폰이 <a href="/dashboard/settings/coupons" style="color:#2563eb;text-decoration:underline">기본 설정 → 쿠폰</a>에서 활성화되어 있어야 위젯에 노출됩니다.</p>
              </div>

              {/* 쿠폰팩일 때 안내 (운영자가 쿠폰팩 미설정이면 경고) */}
              <div id="popupCouponPackInfo" style="margin-top:16px;padding:12px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;font-size:12px;color:#1e40af">
                쿠폰팩 카드는 <a href="/dashboard/settings/coupons" style="color:#2563eb;font-weight:600;text-decoration:underline">기본 설정 → 쿠폰팩</a>에서 활성화한 디자인/애니로 표시됩니다.
              </div>
            </div>

            {/* ── Card 3: 디자인/카피 (collapsible) ──────────────── */}
            <div class="card">
              <div id="popupSettingsToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer">
                <div>
                  <h2 style="margin:0">디자인 &amp; 문구</h2>
                  <p style="font-size:12px;color:#64748b;margin:4px 0 0">팝업 색상, 아이콘, 제목/본문/CTA 문구, 모서리, 투명도, 스크롤 트리거</p>
                </div>
                <span id="popupSettingsArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
              </div>
              <div id="popupSettingsBody" style="display:none;margin-top:16px">
                <div style="display:flex;gap:20px;margin-bottom:16px;flex-wrap:wrap">
                  <div style="flex:1;min-width:280px">
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
                    <div style="display:flex;gap:6px;flex-wrap:wrap">
                      <button class="popup-icon-btn" data-icon="⚡" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">⚡</button>
                      <button class="popup-icon-btn" data-icon="🎁" style="width:36px;height:36px;border-radius:50%;border:2px solid #2563eb;background:#f8fafc;font-size:16px;cursor:pointer">🎁</button>
                      <button class="popup-icon-btn" data-icon="🛍️" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">🛍️</button>
                      <button class="popup-icon-btn" data-icon="💝" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:16px;cursor:pointer">💝</button>
                      <button class="popup-icon-btn" data-icon="" style="width:36px;height:36px;border-radius:50%;border:2px solid transparent;background:#f8fafc;font-size:11px;cursor:pointer;color:#6b7280">없음</button>
                    </div>
                  </div>
                </div>
                <div style="margin-bottom:16px">
                  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:10px">버튼 색상</label>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    <div class="popup-preset-card" data-preset="6" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:3px solid #2563eb;overflow:hidden;background:#eff6ff;display:flex;align-items:center;justify-content:center">
                      <span style="color:#2563eb;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">파랑 테두리</span>
                    </div>
                    <div class="popup-preset-card" data-preset="7" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid #d1d5db;overflow:hidden;background:#ffffff;display:flex;align-items:center;justify-content:center">
                      <span style="color:#374151;font-size:9px;font-weight:600;text-align:center;line-height:1.3;padding:4px">회색 테두리</span>
                    </div>
                    <div class="popup-preset-card" data-preset="0" style="width:80px;height:50px;border-radius:8px;cursor:pointer;border:2px solid transparent;overflow:hidden;background:linear-gradient(135deg,#2563eb,#ec4899);display:flex;align-items:center;justify-content:center">
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
                  </div>
                </div>
                {/* 슬라이더 — settings.tsx 위젯 디자인 페이지와 동일 패턴 (라벨+값 위, 슬라이더 width:100%) */}
                <div style="margin-bottom:16px">
                  <label style="font-size:13px;font-weight:600;color:#475569;display:flex;justify-content:space-between;margin-bottom:6px">
                    <span>모서리 둥글기</span>
                    <span id="popupBorderRadiusValue">16px</span>
                  </label>
                  <input type="range" min="8" max="24" value="16" id="popupBorderRadius" style="width:100%" />
                </div>
                <div style="margin-bottom:16px">
                  <label style="font-size:13px;font-weight:600;color:#475569;display:flex;justify-content:space-between;margin-bottom:6px">
                    <span>투명도</span>
                    <span id="popupOpacityValue">100%</span>
                  </label>
                  <input type="range" min="10" max="100" value="100" id="popupOpacity" style="width:100%" />
                </div>
                <div style="margin-bottom:4px">
                  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px" for="popupScrollDepth">스크롤 깊이 추가 트리거 <span style="font-weight:400;color:#94a3b8">설정 시 이탈 감지 + 스크롤 양쪽에서 팝업 발동</span></label>
                  <select id="popupScrollDepth" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:6px;font-size:13px;width:200px">
                    <option value="0">사용 안함</option>
                    <option value="30">30% 스크롤</option>
                    <option value="50">50% 스크롤</option>
                    <option value="60">60% 스크롤</option>
                    <option value="80">80% 스크롤</option>
                  </select>
                </div>
              </div>
            </div>

            {/* ── Card 4: 저장 ──────────────────────────────────── */}
            <div class="card">
              <div style="display:flex;gap:8px">
                <button id="popupSaveBtn" style="flex:1;padding:12px 16px;background:#2563eb;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer">저장</button>
                <button id="popupResetBtn" style="padding:12px 16px;background:#f3f4f6;color:#374151;border:1px solid #d1d5db;border-radius:8px;font-size:14px;cursor:pointer">기본값 되돌리기</button>
              </div>
              <div id="popupSaveStatus" style="display:none;padding:10px 16px;border-radius:8px;margin-top:12px;font-size:13px"></div>
            </div>
            <script dangerouslySetInnerHTML={{__html: `
              (function() {
                var SHOP_ID = '${shopId}';
                // default 'pack': 페이지 진입자는 모두 Plus이므로 쿠폰팩 모드를 기본으로
                var DEFAULTS = { enabled: true, title: '잠깐만요!', body: '지금 가입하면 특별 혜택을 드려요!', ctaText: '혜택 받고 가입하기', preset: 6, borderRadius: 16, opacity: 100, icon: '🎁', allPages: false, cooldownHours: 24, frequency_cap_hours: 24, scroll_depth_threshold: 0, coupon_mode: 'pack', coupon_type: 'shipping' };
                // 단일 쿠폰 미리보기용 운영자 쿠폰 설정 (server-side에서 주입)
                var SINGLE_COUPON_CFG = {
                  shipping: { enabled: ${ccShippingEnabled ? 'true' : 'false'}, label: '\\ubb34\\ub8cc\\ubc30\\uc1a1 \\ucfe0\\ud3f0' },
                  amount: { enabled: ${ccAmountEnabled ? 'true' : 'false'}, amount: ${ccAmountVal} },
                  rate: { enabled: ${ccRateEnabled ? 'true' : 'false'}, rate: ${ccRateVal} }
                };
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
                  state.frequency_cap_hours = state.cooldownHours;
                  document.getElementById('popupCooldownValue').textContent = formatCooldown(state.cooldownHours);
                });

                // ── 스크롤 깊이 트리거 ──
                var scrollDepthSel = document.getElementById('popupScrollDepth');
                if (scrollDepthSel) {
                  scrollDepthSel.addEventListener('change', function() {
                    state.scroll_depth_threshold = parseInt(this.value);
                  });
                }

                // ── 쿠폰 모드 (라디오 카드 + 미리보기 토글) ──
                var couponTypeRow = document.getElementById('popupCouponTypeRow');
                var couponTypeSel = document.getElementById('popupCouponType');
                var couponPackInfo = document.getElementById('popupCouponPackInfo');
                var modeCards = document.querySelectorAll('.popup-coupon-mode-card');
                var previewPack = document.getElementById('popupPreviewCouponPack');
                var previewSingle = document.getElementById('popupPreviewCouponSingle');
                var previewSingleAccent = document.getElementById('popupPreviewSingleAccent');
                var previewSingleIcon = document.getElementById('popupPreviewSingleIcon');
                var previewSingleLabel = document.getElementById('popupPreviewSingleLabel');
                var previewSingleInner = document.getElementById('popupPreviewSingleInner');
                var previewSingleDash = document.getElementById('popupPreviewSingleDash');
                var previewSingleWarn = document.getElementById('popupPreviewSingleWarn');

                function renderModeCards() {
                  modeCards.forEach(function(card) {
                    var mode = card.dataset.mode;
                    var radio = card.querySelector('input[type=radio]');
                    var selected = (mode === state.coupon_mode);
                    if (radio) radio.checked = selected;
                    if (selected) {
                      card.style.border = '2px solid #2563eb';
                      card.style.background = '#eff6ff';
                    } else {
                      card.style.border = '2px solid #e5e7eb';
                      card.style.background = '#fff';
                    }
                  });
                }

                function renderSingleCouponPreview() {
                  // 쿠폰 종류별 라벨/색상 (위젯 renderSingleCouponCard 와 동일한 룰)
                  var t = state.coupon_type || 'shipping';
                  var cfg = SINGLE_COUPON_CFG[t] || SINGLE_COUPON_CFG.shipping;
                  var label = '', accent = '#2563eb', bg = '#eff6ff', border = '#bfdbfe', icon = '🎁';
                  if (t === 'shipping') {
                    label = '\\ubb34\\ub8cc\\ubc30\\uc1a1 \\ucfe0\\ud3f0'; // 무료배송 쿠폰
                    accent = '#059669'; bg = '#ecfdf5'; border = '#a7f3d0'; icon = '\\uD83D\\uDE9A';
                  } else if (t === 'amount') {
                    var amt = SINGLE_COUPON_CFG.amount.amount || 0;
                    label = (amt > 0 ? amt.toLocaleString() + '\\uc6d0 ' : '') + '\\ud560\\uc778 \\ucfe0\\ud3f0';
                    accent = '#ea580c'; bg = '#fff7ed'; border = '#fed7aa'; icon = '\\uD83D\\uDCB0';
                  } else if (t === 'rate') {
                    var rate = SINGLE_COUPON_CFG.rate.rate || 0;
                    label = (rate > 0 ? rate + '% ' : '') + '\\ud560\\uc778 \\ucfe0\\ud3f0';
                    accent = '#7c3aed'; bg = '#f5f3ff'; border = '#ddd6fe'; icon = '\\uD83C\\uDFF7';
                  }
                  if (previewSingleInner) {
                    previewSingleInner.style.background = bg;
                    previewSingleInner.style.borderColor = border;
                  }
                  if (previewSingleAccent) previewSingleAccent.style.background = accent;
                  if (previewSingleIcon) previewSingleIcon.textContent = icon;
                  if (previewSingleLabel) {
                    previewSingleLabel.textContent = label;
                    previewSingleLabel.style.color = accent;
                  }
                  if (previewSingleDash) previewSingleDash.style.borderRightColor = border;
                  if (previewSingleWarn) previewSingleWarn.style.display = cfg.enabled ? 'none' : 'block';
                }

                function updateCouponModeUI() {
                  // 1) mode 카드 selected 상태
                  renderModeCards();
                  // 2) 단일 쿠폰 종류 select 표시 여부
                  if (couponTypeRow) couponTypeRow.style.display = (state.coupon_mode === 'single') ? 'block' : 'none';
                  // 3) 쿠폰팩 안내 박스
                  if (couponPackInfo) couponPackInfo.style.display = (state.coupon_mode === 'pack') ? 'block' : 'none';
                  // 4) 미리보기 카드 토글
                  if (previewPack) previewPack.style.display = (state.coupon_mode === 'pack') ? 'flex' : 'none';
                  if (previewSingle) previewSingle.style.display = (state.coupon_mode === 'single') ? 'block' : 'none';
                  if (state.coupon_mode === 'single') renderSingleCouponPreview();
                }

                modeCards.forEach(function(card) {
                  card.addEventListener('click', function() {
                    state.coupon_mode = this.dataset.mode;
                    updateCouponModeUI();
                  });
                });
                if (couponTypeSel) {
                  couponTypeSel.addEventListener('change', function() {
                    state.coupon_type = this.value;
                    if (state.coupon_mode === 'single') renderSingleCouponPreview();
                  });
                }

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
                  // 스크롤 깊이
                  if (scrollDepthSel) scrollDepthSel.value = String(state.scroll_depth_threshold || 0);
                  // 쿠폰 모드 (라디오 카드 + 미리보기)
                  if (couponTypeSel && state.coupon_type) couponTypeSel.value = state.coupon_type;
                  updateCouponModeUI();
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
                      frequency_cap_hours: state.frequency_cap_hours || state.cooldownHours,
                      scroll_depth_threshold: state.scroll_depth_threshold || 0,
                      coupon_mode: state.coupon_mode || 'none',
                      coupon_type: (state.coupon_mode === 'single') ? (state.coupon_type || 'shipping') : null,
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

                // ── 기본값 되돌리기 (즉시 저장) ──
                document.getElementById('popupResetBtn').addEventListener('click', function() {
                  state = Object.assign({}, DEFAULTS);
                  applyState();
                  var saveBtn = document.getElementById('popupSaveBtn');
                  if (saveBtn) saveBtn.click();
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
                      // frequency_cap_hours 우선, cooldownHours fallback
                      state.cooldownHours = c.frequency_cap_hours || c.cooldownHours || DEFAULTS.cooldownHours;
                      state.frequency_cap_hours = c.frequency_cap_hours || c.cooldownHours || DEFAULTS.frequency_cap_hours;
                      state.scroll_depth_threshold = c.scroll_depth_threshold != null ? c.scroll_depth_threshold : DEFAULTS.scroll_depth_threshold;
                      state.coupon_mode = c.coupon_mode || DEFAULTS.coupon_mode;
                      state.coupon_type = c.coupon_type || DEFAULTS.coupon_type;
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

                // ── 기본값 되돌리기 (즉시 저장) ──
                var resetBtn = document.getElementById('escResetBtn');
                if (resetBtn) resetBtn.addEventListener('click', function() {
                  state = Object.assign({}, DEFAULTS);
                  applyState();
                  var saveBtn = document.getElementById('escSaveBtn');
                  if (saveBtn) saveBtn.click();
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


// ─── KakaoSettingsPage REMOVED 2026-05-01 ───
// 카카오 채널은 Plus → Free 이동 + GeneralSettingsPage 의 'kakaoChannelCard' 카드로 통합됨.
// /dashboard/settings/kakao 라우트는 301 redirect (pages.tsx 참조).

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

// ─── AI 브리핑 상세 페이지 (/dashboard/ai-briefing) ──────────────

export type AiBriefingRow = {
  id: string;
  performance: string;
  strategy: string;
  actions: string;
  insight?: string | null;
  headline?: string | null;
  source: string;
  created_at: string;
};

export const AiBriefingPage: FC<{
  shop: {
    shop_id: string;
    shop_name: string;
    mall_id: string;
    plan: string;
    store_email?: string | null;             // pickEmail 결과 (cafe24.auto 더미는 null로 정규화됨)
    auto_briefing_email?: number;            // 0/1 (default 1 = ON)
    auto_briefing_alimtalk?: number;         // 0/1
    kakao_channel_added?: number;            // 0/1 — 카톡 채널 친구 추가 여부
    update_news_email?: number;              // 0/1 (default 1)
    update_news_alimtalk?: number;           // 0/1 (default 1)
  };
  briefings: AiBriefingRow[];
  isCafe24?: boolean;
  newBadges?: Partial<Record<string, boolean>>;
  page?: number;
  totalPages?: number;
  totalCount?: number;
  kakaoChannelPfid?: string;                 // 친구 추가 링크용 PFID (env.KAKAO_CHANNEL_PFID)
  kakaoUiEnabled?: boolean;                  // env.KAKAO_CHANNEL_UI_ENABLED === '1' 일 때만 카톡 UI 노출 (Phase 3 매핑 도입 전까지 프로덕션 hide)
}> = ({ shop, briefings, isCafe24, newBadges, page = 1, totalPages = 1, totalCount = 0, kakaoChannelPfid = '_aUbxbX', kakaoUiEnabled = false }) => {
  const isPlus = shop.plan !== 'free';
  // page=1: latest=briefings[0], history=briefings[1..]
  // page>1: latest=null (헤더/성과 영역 숨김), history=briefings[0..]
  const latest = page === 1 ? (briefings[0] ?? null) : null;
  const history = page === 1 ? briefings.slice(1) : briefings;

  // 이번 주 날짜 범위 (KST 기준 월요일~일요일)
  const now = new Date();
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const dow = kstNow.getUTCDay();
  const daysSinceMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(kstNow.getTime() - daysSinceMonday * 86400000);
  const sunday = new Date(monday.getTime() + 6 * 86400000);
  const fmt = (d: Date) => `${d.getUTCFullYear()}년 ${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
  const weekRange = `${fmt(monday)} ~ ${fmt(sunday)}`;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
    return `${kst.getUTCFullYear()}.${String(kst.getUTCMonth() + 1).padStart(2, '0')}.${String(kst.getUTCDate()).padStart(2, '0')} (KST)`;
  };

  // 페이지네이션 헬퍼
  const buildPageUrl = (p: number) => `/dashboard/ai-briefing?page=${p}`;

  // 페이지네이션 번호 배열 생성 (최대 7개 노드, ... 포함)
  const buildPageNumbers = (): Array<number | '...'> => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const nodes: Array<number | '...'> = [];
    // 항상 1, 2 표시
    nodes.push(1);
    if (page > 4) nodes.push('...');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      nodes.push(p);
    }
    if (page < totalPages - 3) nodes.push('...');
    nodes.push(totalPages);
    return nodes;
  };

  return (
    <Layout title="AI 브리핑" loggedIn currentPath="/dashboard/ai-briefing" isCafe24={isCafe24} newBadges={newBadges}>
      {/* 페이지 헤더 */}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px;margin-bottom:4px">
        <h1 style="margin-bottom:0">AI 브리핑</h1>
      </div>
      <p style="font-size:14px;color:#64748b;margin-bottom:16px">
        {weekRange} 기준
      </p>

      {/* AI 주간 브리핑 + 업데이트 소식 알림 카드 (Phase 1 이메일 + Phase 2 카톡 채널 친구 추가) */}
      <div
        id="notifyCard"
        style="padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:24px"
        data-shop-id={shop.shop_id}
        data-kakao-pfid={kakaoChannelPfid}
        data-kakao-added={(shop.kakao_channel_added ?? 0) === 1 ? '1' : '0'}
      >
        <div style="font-size:14px;font-weight:600;color:#1e293b;margin-bottom:4px">📨 알림 수신 설정</div>
        <div style="font-size:12px;color:#64748b;margin-bottom:14px;line-height:1.55">
          이메일 수신처:{' '}
          {shop.store_email
            ? <strong style="color:#1e293b">{shop.store_email}</strong>
            : <span style="color:#dc2626">미등록 (카페24 운영자 정보 미동기화)</span>
          }
          {' · '}회신: <strong style="color:#1e293b">help@suparain.com</strong>
        </div>

        {/* 토글 — kakaoUiEnabled에 따라 2개(이메일만) vs 4개(이메일+카톡) */}
        <div style={`display:grid;grid-template-columns:${kakaoUiEnabled ? '1fr 1fr' : '1fr'};gap:8px 24px;font-size:13px`}>
          {/* 1. AI 주간 브리핑 — 이메일 */}
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#475569">
            <input type="checkbox" id="autoBriefingEmailToggle" checked={(shop.auto_briefing_email ?? 1) === 1} style="width:14px;height:14px;cursor:pointer" />
            <span>📊 AI 주간 브리핑 — 이메일</span>
          </label>
          {/* 2. AI 주간 브리핑 — 카톡 채널 (Phase 3 가드) */}
          {kakaoUiEnabled && (
            <label style={`display:flex;align-items:center;gap:8px;color:${(shop.kakao_channel_added ?? 0) === 1 ? '#475569' : '#94a3b8'};cursor:${(shop.kakao_channel_added ?? 0) === 1 ? 'pointer' : 'not-allowed'}`}>
              <input
                type="checkbox"
                id="autoBriefingAlimtalkToggle"
                checked={(shop.auto_briefing_alimtalk ?? 1) === 1}
                disabled={(shop.kakao_channel_added ?? 0) !== 1}
                style="width:14px;height:14px"
              />
              <span>📊 AI 주간 브리핑 — 카톡 {(shop.kakao_channel_added ?? 0) !== 1 && <span style="font-size:10px;color:#cbd5e1">(친구 추가 필요)</span>}</span>
            </label>
          )}
          {/* 3. 업데이트 소식 — 이메일 */}
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;color:#475569">
            <input type="checkbox" id="updateNewsEmailToggle" checked={(shop.update_news_email ?? 1) === 1} style="width:14px;height:14px;cursor:pointer" />
            <span>🔔 업데이트 소식 — 이메일</span>
          </label>
          {/* 4. 업데이트 소식 — 카톡 채널 (Phase 3 가드) */}
          {kakaoUiEnabled && (
            <label style={`display:flex;align-items:center;gap:8px;color:${(shop.kakao_channel_added ?? 0) === 1 ? '#475569' : '#94a3b8'};cursor:${(shop.kakao_channel_added ?? 0) === 1 ? 'pointer' : 'not-allowed'}`}>
              <input
                type="checkbox"
                id="updateNewsAlimtalkToggle"
                checked={(shop.update_news_alimtalk ?? 1) === 1}
                disabled={(shop.kakao_channel_added ?? 0) !== 1}
                style="width:14px;height:14px"
              />
              <span>🔔 업데이트 소식 — 카톡 {(shop.kakao_channel_added ?? 0) !== 1 && <span style="font-size:10px;color:#cbd5e1">(친구 추가 필요)</span>}</span>
            </label>
          )}
        </div>

        {/* 카톡 채널 친구 추가 — Phase 3 매핑 도입 전까지 프로덕션 hide */}
        {kakaoUiEnabled && ((shop.kakao_channel_added ?? 0) === 1 ? (
          <div style="margin-top:14px;padding:10px 14px;background:#dcfce7;border:1px solid #86efac;border-radius:8px;font-size:12px;color:#15803d;display:flex;align-items:center;gap:8px">
            <span>✅ 카톡 채널 <strong>@번개가입</strong> 친구 추가 완료</span>
            <button id="kakaoChannelRemoveBtn" type="button" style="margin-left:auto;padding:4px 10px;background:transparent;border:1px solid #86efac;border-radius:6px;font-size:11px;color:#15803d;cursor:pointer">상태 해제</button>
          </div>
        ) : (
          <div style="margin-top:14px;padding:14px;background:linear-gradient(135deg,#fef3c7,#fef9c3);border:1px solid #fcd34d;border-radius:8px">
            <div style="font-size:13px;font-weight:600;color:#92400e;margin-bottom:6px">💛 카톡 채널 추가하면 카톡으로도 받을 수 있어요</div>
            <div style="font-size:12px;color:#78350f;line-height:1.55;margin-bottom:10px">
              <strong>@번개가입</strong> 채널을 친구로 추가하면 매주 AI 브리핑과 새 기능 소식을 카톡으로도 받을 수 있어요.
              {/* (Phase 3 예고) */}
              <br />차후 업데이트로 카톡에서 바로 통계 조회·문의도 가능해질 예정입니다.
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a
                id="kakaoChannelAddBtn"
                href={`https://pf.kakao.com/${kakaoChannelPfid}`}
                target="_blank"
                rel="noopener"
                style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;background:#fee500;color:#3c1e1e;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600"
              >
                💬 친구 추가하러 가기
              </a>
              <button
                id="kakaoChannelConfirmBtn"
                type="button"
                style="padding:8px 14px;background:#fff;color:#92400e;border:1px solid #fcd34d;border-radius:6px;font-size:13px;font-weight:600;cursor:pointer"
              >
                ✅ 추가 완료
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 브리핑 없음 (page=1, 데이터 없음) */}
      {page === 1 && !latest && totalCount === 0 && (
        <div class="card" style="text-align:center;padding:48px 24px">
          <div style="font-size:40px;margin-bottom:16px">📊</div>
          <h2 style="margin-bottom:8px">아직 브리핑이 없습니다</h2>
          <p style="font-size:13px;color:#64748b;margin-bottom:16px">
            매주 <strong>월요일 오전 9시(KST)</strong>에 자동으로 생성됩니다.
          </p>
          <p style="font-size:13px;color:#94a3b8">
            가입 데이터가 누적될수록 더 정확한 인사이트를 제공합니다.
          </p>
        </div>
      )}

      {/* 최신 브리핑 상세 (page=1 && latest 있음) */}
      {latest && (() => {
        let actions: string[] = [];
        try { actions = JSON.parse(latest.actions); } catch { /* ignore */ }

        return (
          <div>
            {/* 헤더 카드 */}
            <div style="background:linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%);border:1px solid #c7d2fe;border-radius:12px;padding:20px 24px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
              <div>
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#6366f1;margin-bottom:6px">이번 주 AI 브리핑</div>
                <div style="font-size:16px;font-weight:600;color:#1e293b;line-height:1.5">
                  {latest.headline ?? '지난주 성과 분석 및 이번 주 전략이 준비됐습니다.'}
                </div>
                <div style="font-size:12px;color:#94a3b8;margin-top:6px">{formatDate(latest.created_at)} 생성</div>
              </div>
              {/* '새 브리핑 생성' 버튼 제거 (2026-05-04) — AI 비용 통제 + 매주 정기 발송 일관성. 브리핑은 매주 월요일 09:00 KST 자동 생성만. */}
            </div>

            {/* 지난주 성과 — Free/Plus 모두 노출 */}
            <div class="card" style="margin-bottom:16px">
              <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                <span style="font-size:18px">📊</span> 지난주 성과
              </h2>
              <div style="font-size:14px;color:#374151;line-height:1.75;white-space:pre-wrap">{latest.performance}</div>
            </div>

            {/* Free: 이후 섹션 블러 + 결제 유도 / Plus: 풀 내용 */}
            {!isPlus ? (
              <div style="position:relative;margin-bottom:24px">
                {/* 블러 영역 — 이번 주 전략 + 추천 액션 + AI 참고 의견 미리보기 */}
                <div style="filter:blur(4px);pointer-events:none;user-select:none;display:grid;gap:16px">
                  <div class="card" style="margin-bottom:0">
                    <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                      <span style="font-size:18px">💡</span> 이번 주 전략
                    </h2>
                    <div style="font-size:14px;color:#374151;line-height:1.75">
                      이번 주 전략은 Plus 플랜에서 확인하실 수 있습니다. 쇼핑몰 현황에 맞는 구체적인 실행 방향을 제시합니다.
                    </div>
                  </div>
                  <div class="card" style="margin-bottom:0">
                    <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                      <span style="font-size:18px">✅</span> 추천 액션
                    </h2>
                    <ul style="margin:0;padding-left:0;list-style:none;display:grid;gap:8px">
                      {(['바로 실행 가능한 액션 1가지', '다음 주를 위한 준비 항목', '장기 개선 방향'].map((a, i) => (
                        <li style="display:flex;gap:10px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;color:#374151;line-height:1.5">
                          <span style="font-size:13px;font-weight:700;color:#6366f1;flex-shrink:0;padding-top:1px">{i + 1}.</span>
                          {a}
                        </li>
                      )))}
                    </ul>
                  </div>
                  <div class="card" style="margin-bottom:0">
                    <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                      <span style="font-size:18px">💡</span> AI 참고 의견
                    </h2>
                    <div style="font-size:13px;color:#64748b;line-height:1.7">
                      시장 트렌드와 업종별 인사이트를 AI가 분석한 참고 의견입니다. 번개가입 범위 밖의 외부 요인도 함께 고려합니다.
                    </div>
                  </div>
                </div>
                {/* 결제 유도 오버레이 카드 */}
                <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:min(360px, calc(100% - 32px));background:#fff;border-radius:16px;padding:28px 24px;box-shadow:0 8px 40px rgba(0,0,0,0.18);border:1px solid #e0e7ff;text-align:center;z-index:10">
                  <div style="font-size:18px;font-weight:700;margin-bottom:8px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
                    Plus로 전체 인사이트 보기
                  </div>
                  <p style="font-size:13px;color:#374151;margin:0 0 16px;line-height:1.6">
                    이번 주 전략 / 추천 액션 / AI 인사이트 /<br />과거 브리핑 이력까지 한눈에
                  </p>
                  {totalCount > 0 && (
                    <p style="font-size:12px;color:#6366f1;font-weight:600;margin:0 0 16px">
                      총 {totalCount}주 브리핑이 쌓여 있어요
                    </p>
                  )}
                  <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;text-align:left">
                    <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer">
                      <input type="radio" name="briefingBillingCycle" value="monthly" style="margin-top:2px;accent-color:#6366f1" />
                      <div>
                        <div style="font-size:14px;font-weight:600;color:#111827">월 6,900원</div>
                        <div style="font-size:11px;color:#6b7280;margin-top:1px">매달 부담 없이 시작</div>
                      </div>
                    </label>
                    <label style="display:flex;align-items:flex-start;gap:10px;padding:12px 14px;border:2px solid #6366f1;border-radius:10px;cursor:pointer;background:#f5f3ff">
                      <input type="radio" name="briefingBillingCycle" value="yearly" checked style="margin-top:2px;accent-color:#6366f1" />
                      <div>
                        <div style="font-size:14px;font-weight:600;color:#111827">연 79,000원 <span style="font-size:10px;background:#6366f1;color:#fff;padding:1px 6px;border-radius:8px;font-weight:600;vertical-align:middle;margin-left:3px">추천</span></div>
                        <div style="font-size:11px;color:#6b7280;margin-top:1px">결제 공백 없이 1년 안심 운영</div>
                      </div>
                    </label>
                  </div>
                  <a href="/dashboard/billing" style="display:block;padding:13px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;text-align:center">
                    Plus 시작하기
                  </a>
                </div>
              </div>
            ) : (
              <div>
                {/* Plus: 이번 주 전략 */}
                {latest.strategy && (
                  <div class="card" style="margin-bottom:16px">
                    <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                      <span style="font-size:18px">💡</span> 이번 주 전략
                    </h2>
                    <div style="font-size:14px;color:#374151;line-height:1.75;white-space:pre-wrap">{latest.strategy}</div>
                  </div>
                )}

                {/* Plus: 추천 액션 */}
                {actions.length > 0 && (
                  <div class="card" style="margin-bottom:16px">
                    <h2 style="font-size:15px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
                      <span style="font-size:18px">✅</span> 추천 액션
                    </h2>
                    <ul style="margin:0;padding-left:0;list-style:none;display:grid;gap:8px">
                      {actions.map((action, i) => (
                        <li style="display:flex;gap:10px;padding:12px 14px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;font-size:14px;color:#374151;line-height:1.5">
                          <span style="font-size:13px;font-weight:700;color:#6366f1;flex-shrink:0;padding-top:1px">{i + 1}.</span>
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Plus: AI 참고 의견 */}
                {latest.insight && (
                  <div class="card" style="margin-bottom:16px;border-left:3px solid #a5b4fc;background:#fafafa">
                    <h2 style="font-size:14px;color:#6366f1;margin-bottom:8px;display:flex;align-items:center;gap:6px">
                      <span style="font-size:16px">💡</span> AI 참고 의견
                      <span style="font-size:11px;font-weight:400;color:#94a3b8">(번개가입 범위 외 시장 인사이트)</span>
                    </h2>
                    <div style="font-size:13px;color:#64748b;line-height:1.7;white-space:pre-wrap">{latest.insight}</div>
                  </div>
                )}
              </div>
            )}

            {/* 새 브리핑 생성 로딩 영역 */}
            <div id="briefingLoading" style="display:none;text-align:center;padding:32px;color:#64748b;font-size:14px">
              AI가 분석 중입니다. 잠시 기다려주세요...
            </div>
          </div>
        );
      })()}

      {/* 이전 브리핑 이력 — Plus만 */}
      {isPlus && (history.length > 0 || page > 1) && (
        <div style="margin-top:32px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <h2 style="font-size:15px;color:#64748b;font-weight:600;margin-bottom:0">이전 브리핑 이력</h2>
            {totalCount > 0 && (
              <span style="font-size:12px;color:#94a3b8">총 {totalCount}건</span>
            )}
          </div>
          <div style="display:grid;gap:10px">
            {history.map((b) => {
              let acts: string[] = [];
              try { acts = JSON.parse(b.actions); } catch { /* ignore */ }
              return (
                <details class="card" style="margin-bottom:0;padding:16px 20px">
                  <summary style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;list-style:none;user-select:none">
                    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                      <span style="font-size:13px;font-weight:600;color:#374151">{formatDate(b.created_at)}</span>
                      <span class={`badge ${b.source === 'scheduled' ? 'badge-blue' : 'badge-gray'}`} style="font-size:10px">
                        {b.source === 'scheduled' ? '자동' : '수동'}
                      </span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px">
                      {b.headline && (
                        <span style="font-size:12px;color:#94a3b8;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{b.headline}</span>
                      )}
                      <span style="font-size:12px;color:#94a3b8">▼</span>
                    </div>
                  </summary>
                  <div style="margin-top:14px;border-top:1px solid #f1f5f9;padding-top:14px">
                    <div style="font-size:13px;color:#374151;margin-bottom:8px;line-height:1.65">
                      <strong style="color:#1e293b">성과: </strong>{b.performance}
                    </div>
                    {b.strategy && (
                      <div style="font-size:13px;color:#374151;margin-bottom:8px;line-height:1.65">
                        <strong style="color:#1e293b">전략: </strong>{b.strategy}
                      </div>
                    )}
                    {acts.length > 0 && (
                      <div style="font-size:13px;color:#374151;line-height:1.65">
                        <strong style="color:#1e293b">액션: </strong>{acts.join(' / ')}
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>

          {/* 페이지네이션 (Plus, totalPages > 1) */}
          {totalPages > 1 && (
            <div style="display:flex;justify-content:center;align-items:center;gap:6px;margin-top:24px;flex-wrap:wrap">
              {/* 이전 버튼 */}
              {page > 1 ? (
                <a href={buildPageUrl(page - 1)} style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;text-decoration:none;background:#fff">
                  이전
                </a>
              ) : (
                <span style="padding:6px 14px;border:1px solid #f1f5f9;border-radius:8px;font-size:13px;color:#d1d5db;cursor:not-allowed;background:#fafafa">이전</span>
              )}

              {/* 페이지 번호 */}
              {buildPageNumbers().map((n) =>
                n === '...' ? (
                  <span style="padding:6px 8px;font-size:13px;color:#9ca3af">...</span>
                ) : n === page ? (
                  <span style="padding:6px 12px;border:1px solid #6366f1;border-radius:8px;font-size:13px;color:#6366f1;font-weight:700;background:#eef2ff">{n}</span>
                ) : (
                  <a href={buildPageUrl(n as number)} style="padding:6px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;text-decoration:none;background:#fff">{n}</a>
                )
              )}

              {/* 다음 버튼 */}
              {page < totalPages ? (
                <a href={buildPageUrl(page + 1)} style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px;color:#374151;text-decoration:none;background:#fff">
                  다음
                </a>
              ) : (
                <span style="padding:6px 14px;border:1px solid #f1f5f9;border-radius:8px;font-size:13px;color:#d1d5db;cursor:not-allowed;background:#fafafa">다음</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Free: 이전 브리핑 이력 영역 블러 처리 (totalCount > 1일 때) */}
      {!isPlus && totalCount > 1 && page === 1 && (
        <div style="margin-top:32px;position:relative">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <h2 style="font-size:15px;color:#64748b;font-weight:600;margin-bottom:0">이전 브리핑 이력</h2>
            <span style="font-size:12px;color:#6366f1;font-weight:600">총 {totalCount}주 브리핑이 쌓여 있어요</span>
          </div>
          <div style="filter:blur(4px);pointer-events:none;user-select:none;display:grid;gap:10px">
            {[1, 2, 3].map((i) => (
              <div class="card" style="margin-bottom:0;padding:16px 20px">
                <div style="display:flex;justify-content:space-between;align-items:center">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="font-size:13px;font-weight:600;color:#374151">2024.0{i}.01 (KST)</span>
                    <span class="badge badge-blue" style="font-size:10px">자동</span>
                  </div>
                  <span style="font-size:12px;color:#94a3b8">▼</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* '새 브리핑 생성' JS 제거 (2026-05-04) — UI 버튼 모두 제거됨. 매주 자동 cron 만 사용. */}

      {/* 알림 카드 인터랙션 — 토글 4개 + 카톡 채널 친구 추가/해제 */}
      <script dangerouslySetInnerHTML={{__html: `
        (function() {
          var card = document.getElementById('notifyCard');
          if (!card) return;
          var shopId = card.getAttribute('data-shop-id');
          if (!shopId) return;

          // 공통 PUT 헬퍼 — 변경 실패 시 토글 원복 + 토스트
          async function putShop(payload, successLabel, originalEl) {
            try {
              var resp = await fetch('/api/dashboard/shops/' + shopId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
              });
              if (!resp.ok) throw new Error('save_failed');
              if (typeof showToast === 'function') {
                showToast('success', successLabel);
              }
              return true;
            } catch (e) {
              if (originalEl && 'checked' in originalEl) {
                originalEl.checked = !originalEl.checked;
              }
              if (typeof showToast === 'function') {
                showToast('error', '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.');
              }
              return false;
            }
          }

          // 토글 4개 바인딩 (id, payload key, 라벨)
          var toggles = [
            ['autoBriefingEmailToggle',    'auto_briefing_email',    'AI 브리핑 이메일'],
            ['autoBriefingAlimtalkToggle', 'auto_briefing_alimtalk', 'AI 브리핑 카톡'],
            ['updateNewsEmailToggle',      'update_news_email',      '업데이트 이메일'],
            ['updateNewsAlimtalkToggle',   'update_news_alimtalk',   '업데이트 카톡'],
          ];
          toggles.forEach(function(t) {
            var el = document.getElementById(t[0]);
            if (!el || el.disabled) return;
            el.addEventListener('change', function() {
              var enabled = el.checked ? 1 : 0;
              var payload = {};
              payload[t[1]] = enabled;
              putShop(payload, t[2] + ' ' + (enabled ? '활성화' : '비활성화') + '되었습니다.', el);
            });
          });

          // 카톡 채널 "추가 완료" 버튼 — 사용자 self-report로 DB 갱신
          var confirmBtn = document.getElementById('kakaoChannelConfirmBtn');
          if (confirmBtn) {
            confirmBtn.addEventListener('click', async function() {
              confirmBtn.disabled = true;
              var ok = await putShop(
                { kakao_channel_added: 1, kakao_channel_added_at: new Date().toISOString() },
                '카톡 채널 친구 추가 등록 완료. 이번 주부터 카톡으로도 받아보세요.',
                null
              );
              if (ok) {
                // 페이지 reload — 카드 상태 + 토글 disabled 풀림 반영
                setTimeout(function() { window.location.reload(); }, 800);
              } else {
                confirmBtn.disabled = false;
              }
            });
          }

          // 카톡 채널 "상태 해제" — 친구 추가 완료 표시 되돌리기 (잘못 등록한 경우)
          var removeBtn = document.getElementById('kakaoChannelRemoveBtn');
          if (removeBtn) {
            removeBtn.addEventListener('click', async function() {
              if (!confirm('카톡 채널 친구 추가 상태를 해제하시겠어요? 매주 카톡 알림이 발송되지 않습니다.')) return;
              removeBtn.disabled = true;
              var ok = await putShop(
                { kakao_channel_added: 0 },
                '카톡 채널 친구 추가 상태가 해제되었습니다.',
                null
              );
              if (ok) {
                setTimeout(function() { window.location.reload(); }, 800);
              } else {
                removeBtn.disabled = false;
              }
            });
          }
        })();
      `}} />
    </Layout>
  );
};

// ─── Live Counter Settings Page (Plus 전용) ──────────────────
/**
 * LiveCounterSection — 미니배너 페이지 안에 embedded 되는 라이브 카운터 섹션.
 * Layout/h1 없이 카드들만 렌더. parent가 PlusLockOverlay 분기를 처리하므로 isPlus 시에만 본문 반환.
 */
const LiveCounterSection: FC<{
  shop: { plan: string; shop_name?: string | null } | null;
  shopId: string;
  liveCounterConfig?: {
    enabled?: boolean;
    position?: string;
    show_toast?: boolean;
    show_counter?: boolean;
  } | null;
}> = ({ shop, shopId, liveCounterConfig }) => {
  const isPlus = shop != null && shop.plan !== 'free';
  if (!isPlus || !shop) return null;

  const lc = liveCounterConfig || {};
  const enabled = lc.enabled !== false;
  const position = lc.position || 'bottom-right';
  const showToast = lc.show_toast !== false;
  const showCounter = lc.show_counter !== false;

  const positions = [
    { value: 'bottom-right', label: '우하단' },
    { value: 'bottom-left', label: '좌하단' },
    { value: 'top-right', label: '우상단' },
    { value: 'top-left', label: '좌상단' },
  ];

  return (
    <div>
          <div class="card" style="margin-bottom:16px">
            <h2>라이브 가입자 카운터</h2>
            <p style="font-size:13px;color:#64748b;margin-bottom:20px">
              방문자 쇼핑몰에 오늘 가입자 수와 최근 가입 토스트를 표시합니다.
              일 평균 가입자 3명 이상인 경우에만 자동으로 활성화됩니다.
            </p>
            <div id="lcSaveMsg" style="display:none;padding:10px 16px;border-radius:8px;margin-bottom:16px;font-size:13px;font-weight:500"></div>

            {/* 미리보기는 상단 통합 미리보기 카드에 흡수됨 — 여기서는 렌더하지 않음 */}

            {/* 설정 */}
            <div style="display:flex;flex-direction:column;gap:20px">
              {/* 활성화 토글 */}
              <div>
                <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">카운터 활성화</label>
                <div style="display:flex;align-items:center;gap:10px">
                  <div id="lcEnabledToggle" data-value={enabled ? 'true' : 'false'}
                    style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${enabled ? 'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)' : '#d1d5db'};transition:background 0.2s`}>
                    <div style={`position:absolute;top:2px;${enabled ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                  </div>
                  <span id="lcEnabledLabel" style="font-size:13px;color:#374151">{enabled ? '활성화됨' : '비활성화됨'}</span>
                </div>
                <p style="font-size:11px;color:#94a3b8;margin-top:6px">비활성화 시 카운터와 토스트 모두 표시되지 않습니다.</p>
              </div>

              {/* 설정 영역 (펼치기/접기) — 미니배너 페이지와 동일 UX, 기본 접힘 */}
              <div>
                <div id="lcDetailToggle" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:12px 0;border-bottom:1px solid #e5e7eb;margin-bottom:16px">
                  <span style="font-size:14px;font-weight:600;color:#374151">상세 설정</span>
                  <span id="lcDetailArrow" style="font-size:18px;color:#94a3b8;transition:transform 0.2s;transform:rotate(-90deg)">&#9660;</span>
                </div>
                <div id="lcDetailSection" style="display:none;flex-direction:column;gap:20px">
              {/* 위치 / Sticky / 토스트 — 한 줄 가로 배치, 좁은 화면에선 자동 줄바꿈 */}
              <div style="display:flex;gap:48px;flex-wrap:wrap;align-items:flex-start">
                {/* 위치 선택 */}
                <div>
                  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">표시 위치</label>
                  <div style="display:flex;gap:8px;flex-wrap:wrap">
                    {positions.map(p => (
                      <label id={`lc-pos-${p.value}`}
                        style={`display:flex;align-items:center;gap:6px;padding:8px 14px;border-radius:8px;cursor:pointer;font-size:13px;border:2px solid ${position === p.value ? '#2563eb' : '#e5e7eb'};background:${position === p.value ? '#eff6ff' : '#fff'};transition:all 0.15s`}>
                        <input type="radio" name="lcPosition" value={p.value} checked={position === p.value} style="display:none" />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sticky 카운터 토글 */}
                <div>
                  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">Sticky 카운터 표시</label>
                  <div id="lcCounterToggle" data-value={showCounter ? 'true' : 'false'}
                    style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${showCounter ? 'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)' : '#d1d5db'};transition:background 0.2s`}>
                    <div style={`position:absolute;top:2px;${showCounter ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                  </div>
                  <p style="font-size:11px;color:#94a3b8;margin-top:4px">오늘 가입자 수 표시</p>
                </div>

                {/* 가입 토스트 토글 */}
                <div>
                  <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px">가입 토스트 표시</label>
                  <div id="lcToastToggle" data-value={showToast ? 'true' : 'false'}
                    style={`width:40px;height:22px;border-radius:11px;position:relative;cursor:pointer;background:${showToast ? 'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)' : '#d1d5db'};transition:background 0.2s`}>
                    <div style={`position:absolute;top:2px;${showToast ? 'right:2px' : 'left:2px'};width:18px;height:18px;background:white;border-radius:50%;transition:all 0.2s`}></div>
                  </div>
                  <p style="font-size:11px;color:#94a3b8;margin-top:4px">최근 30분 가입자 토스트</p>
                </div>
              </div>

              {/* 저장 버튼 */}
              <div>
                <button id="lcSaveBtn" class="btn btn-primary" style="width:auto">설정 저장</button>
              </div>
                </div> {/* lcDetailSection 끝 */}
              </div> {/* 설정 영역 wrapper 끝 */}
            </div>
          </div>

          <div class="card" style="border-left:3px solid #2563eb;background:#f0f9ff">
            <h2 style="font-size:14px;color:#1e40af;margin-bottom:8px">threshold 안내</h2>
            <p style="font-size:13px;color:#374151;line-height:1.7">
              일 평균 가입자 수가 3명 미만이면 카운터가 노출되지 않습니다.
              "오늘 0명 가입" 같은 빈약한 표시는 신뢰도를 해치기 때문입니다.
              가입자 데이터가 쌓이면 자동으로 활성화됩니다.
            </p>
          </div>

          <script dangerouslySetInnerHTML={{__html: `
            (function() {
              var shopId = '${shopId}';

              // 토글 헬퍼
              function makeToggle(id, onChange) {
                var el = document.getElementById(id);
                if (!el) return;
                el.addEventListener('click', function() {
                  var cur = el.getAttribute('data-value') === 'true';
                  var next = !cur;
                  el.setAttribute('data-value', next ? 'true' : 'false');
                  el.style.background = next ? 'linear-gradient(135deg,#2563eb 0%,#3b82f6 100%)' : '#d1d5db';
                  var dot = el.querySelector('div');
                  if (dot) { dot.style.right = next ? '2px' : ''; dot.style.left = next ? '' : '2px'; }
                  if (onChange) onChange(next);
                });
              }

              // 미리보기 갱신 — 설정(enabled / position / show_counter / show_toast) 변경 시 즉시 반영
              function updatePreview() {
                var enabled = document.getElementById('lcEnabledToggle').getAttribute('data-value') === 'true';
                var showCounter = document.getElementById('lcCounterToggle').getAttribute('data-value') === 'true';
                var showToast = document.getElementById('lcToastToggle').getAttribute('data-value') === 'true';
                var posInput = document.querySelector('input[name="lcPosition"]:checked');
                var position = posInput ? posInput.value : 'bottom-right';
                var counterEl = document.getElementById('lcPreviewCounter');
                var toastEl = document.getElementById('lcPreviewToast');
                var disabledEl = document.getElementById('lcPreviewDisabled');
                if (!counterEl || !toastEl || !disabledEl) return;
                // 위치 매핑 (카운터) — bottom-* 는 하단, top-* 는 상단 (위젯 live-counter.ts와 동일 좌표계)
                var posMap = {
                  'bottom-right': { top: 'auto', bottom: '16px', left: 'auto', right: '16px' },
                  'bottom-left':  { top: 'auto', bottom: '16px', left: '16px', right: 'auto' },
                  'top-right':    { top: '16px', bottom: 'auto', left: 'auto', right: '16px' },
                  'top-left':     { top: '16px', bottom: 'auto', left: '16px', right: 'auto' }
                };
                var p = posMap[position] || posMap['bottom-right'];
                ['top','bottom','left','right'].forEach(function(k){ counterEl.style[k] = p[k]; });
                // 토스트는 카운터로부터 vertical offset 100px — 카운터와 같은 모서리 방향에서 안쪽으로 한 칸
                var t = Object.assign({}, p);
                if (position.indexOf('bottom') === 0) { t.bottom = '100px'; t.top = 'auto'; }
                else { t.top = '100px'; t.bottom = 'auto'; }
                ['top','bottom','left','right'].forEach(function(k){ toastEl.style[k] = t[k]; });
                // 표시/숨김
                counterEl.style.display = (enabled && showCounter) ? 'block' : 'none';
                toastEl.style.display = (enabled && showToast) ? 'block' : 'none';
                // enabled OFF 시 안내
                disabledEl.style.display = enabled ? 'none' : 'block';
              }

              makeToggle('lcEnabledToggle', function(v) {
                var lbl = document.getElementById('lcEnabledLabel');
                if (lbl) lbl.textContent = v ? '활성화됨' : '비활성화됨';
                updatePreview();
              });
              makeToggle('lcCounterToggle', function() { updatePreview(); });
              makeToggle('lcToastToggle', function() { updatePreview(); });

              // 상세 설정 펼치기/접기 (미니배너 페이지와 동일 UX, 기본 접힘)
              var detailToggle = document.getElementById('lcDetailToggle');
              var detailSection = document.getElementById('lcDetailSection');
              var detailArrow = document.getElementById('lcDetailArrow');
              var detailOpen = false;
              if (detailToggle && detailSection) {
                detailToggle.addEventListener('click', function() {
                  detailOpen = !detailOpen;
                  detailSection.style.display = detailOpen ? 'flex' : 'none';
                  if (detailArrow) detailArrow.style.transform = detailOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
                });
              }

              // 위치 라디오
              document.querySelectorAll('input[name="lcPosition"]').forEach(function(input) {
                input.addEventListener('change', function() {
                  document.querySelectorAll('input[name="lcPosition"]').forEach(function(r) {
                    var lbl = document.getElementById('lc-pos-' + r.value);
                    if (lbl) {
                      lbl.style.borderColor = r.checked ? '#2563eb' : '#e5e7eb';
                      lbl.style.background = r.checked ? '#eff6ff' : '#fff';
                    }
                  });
                  updatePreview();
                });
              });

              // 초기 미리보기 동기화
              updatePreview();

              // 저장
              document.getElementById('lcSaveBtn').addEventListener('click', async function() {
                var btn = this;
                btn.disabled = true;
                btn.textContent = '저장 중...';
                var msgEl = document.getElementById('lcSaveMsg');

                var enabled = document.getElementById('lcEnabledToggle').getAttribute('data-value') === 'true';
                var showCounter = document.getElementById('lcCounterToggle').getAttribute('data-value') === 'true';
                var showToast = document.getElementById('lcToastToggle').getAttribute('data-value') === 'true';
                var position = document.querySelector('input[name="lcPosition"]:checked')?.value || 'bottom-right';

                try {
                  var resp = await fetch('/api/dashboard/shops/' + shopId + '/live-counter', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ enabled: enabled, position: position, show_toast: showToast, show_counter: showCounter })
                  });
                  var data = await resp.json();
                  if (resp.ok) {
                    msgEl.style.display = 'block';
                    msgEl.style.background = '#f0fdf4';
                    msgEl.style.color = '#166534';
                    msgEl.style.border = '1px solid #bbf7d0';
                    msgEl.textContent = '설정이 저장되었습니다.';
                  } else {
                    throw new Error(data.message || '저장 실패');
                  }
                } catch(e) {
                  msgEl.style.display = 'block';
                  msgEl.style.background = '#fef2f2';
                  msgEl.style.color = '#991b1b';
                  msgEl.style.border = '1px solid #fecaca';
                  msgEl.textContent = '오류: ' + e.message;
                } finally {
                  btn.disabled = false;
                  btn.textContent = '설정 저장';
                  setTimeout(function() { msgEl.style.display = 'none'; }, 3000);
                }
              });
            })();
          `}} />
    </div>
  );
};

// ─── Guide Page ──────────────────────────────────────────────
