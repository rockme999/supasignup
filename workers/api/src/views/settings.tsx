/**
 * Settings pages: SsoGuidePage, BillingPage, ProvidersPage, GeneralSettingsPage, CouponSettingsPage.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { ProgressBar } from './charts';
import {
  providerColors,
  providerDisplayNames,
  parseProviders,
  DEFAULT_WIDGET_STYLE,
  DEFAULT_COUPON_CONFIG_UI,
  type ShopDetail,
  type ShopSummary,
  type WidgetStyle,
  type CouponConfigUI,
} from './shared';

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
                  <button class="copy-btn" data-value={shop.client_secret} onclick="copyFromAttr(this)" style="position:static; background:#2563eb; color:#fff; padding:6px 14px; border-radius:6px; font-size:13px">복사</button>
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
    result.textContent = '오류가 발생했습니다: ' + err.message;
  });
}
    `}} />
  </Layout>
);

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

export const ProvidersPage: FC<{
  shop: ShopDetail;
  baseUrl: string;
  isCafe24?: boolean;
  widgetStyle?: WidgetStyle;
  newBadges?: Partial<Record<string, boolean>>;
}> = ({ shop, baseUrl, isCafe24, widgetStyle, newBadges }) => {
  const providers = parseProviders(shop.enabled_providers);
  const allProviders = ['google', 'kakao', 'naver', 'apple', 'discord', 'telegram'];
  const futureProviders = ['facebook', 'x', 'line', 'toss', 'tiktok'];
  const ws = widgetStyle ?? DEFAULT_WIDGET_STYLE;

  return (
    <Layout title="소셜 프로바이더" loggedIn currentPath="/dashboard/settings/providers" isCafe24={isCafe24} newBadges={newBadges}>
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

        {/* Free 프리셋 — 5종 */}
        <p style="font-size:12px; font-weight:600; color:#94a3b8; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px">기본 프리셋</p>
        <div style="display:grid; grid-template-columns:repeat(5,1fr); gap:8px; margin-bottom:16px" class="preset-grid-2x2">
          <button class="preset-card" data-preset="default" data-tier="free" type="button">
            <div class="preset-preview">컬러 버튼</div>
            <span>기본</span>
          </button>
          <button class="preset-card" data-preset="mono" data-tier="free" type="button">
            <div class="preset-preview">흑백</div>
            <span>모노톤</span>
          </button>
          <button class="preset-card" data-preset="outline" data-tier="free" type="button">
            <div class="preset-preview">테두리</div>
            <span>호버 채움</span>
          </button>
          <button class="preset-card" data-preset="outline-mono" data-tier="free" type="button">
            <div class="preset-preview">테두리 흑백</div>
            <span>호버 채움</span>
          </button>
          <button class="preset-card" data-preset="icon-only" data-tier="free" type="button">
            <div class="preset-preview">아이콘만</div>
            <span>아이콘</span>
          </button>
        </div>

        {/* Plus 프리셋 — 6종 */}
        <p style="font-size:12px; font-weight:600; color:#94a3b8; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px">Plus 프리셋</p>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:20px">
          <button class="preset-card preset-card-plus" data-preset="glassmorphism" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:linear-gradient(135deg,#667eea,#764ba2,#f093fb);color:#fff;backdrop-filter:blur(4px)">반투명</div>
            <span>글래스모피즘</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
          <button class="preset-card preset-card-plus" data-preset="neon-glow" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:#0a0a14;color:#a5b4fc;border:1px solid rgba(99,102,241,0.5)">네온</div>
            <span>네온 글로우</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
          <button class="preset-card preset-card-plus" data-preset="liquid-glass" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:linear-gradient(160deg,#0f2027,#203a43,#2c5364);color:rgba(255,255,255,0.9)">동적광택</div>
            <span>리퀴드 글래스</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
          <button class="preset-card preset-card-plus" data-preset="gradient-flow" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:linear-gradient(135deg,#f093fb,#f5576c,#fda085);color:#fff">그라디언트</div>
            <span>그라디언트 플로우</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
          <button class="preset-card preset-card-plus" data-preset="soft-shadow" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:#fff;color:#374151;box-shadow:0 4px 12px rgba(0,0,0,0.12)">부유감</div>
            <span>소프트 섀도우</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
          <button class="preset-card preset-card-plus" data-preset="pulse" data-tier="plus" type="button" style="position:relative">
            <div class="preset-preview" style="background:#fff;color:#4f46e5;border:1px solid #e5e7eb">펄스</div>
            <span>펄스 애니메이션</span>
            <span class="plus-preset-badge">&#10022; Plus</span>
          </button>
        </div>

        <style dangerouslySetInnerHTML={{__html: `
          .plus-preset-badge {
            position:absolute; top:6px; right:6px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            color:#fff; font-size:10px; font-weight:600;
            padding:1px 7px; border-radius:20px;
          }
          .preset-card-plus { background:#fafbff; border-color:#e0e7ff; }
          .preset-card-plus.active { border-color:#6366f1; background:#ede9fe; }

          /* ── Plus 프리셋 CSS (위젯 코드와 동기화) ── */
          .bg-preset-glass{background:rgba(255,255,255,0.1)!important;backdrop-filter:blur(16px) saturate(140%)!important;-webkit-backdrop-filter:blur(16px) saturate(140%)!important;border:1px solid rgba(255,255,255,0.22)!important;color:#fff!important;box-shadow:0 2px 12px rgba(0,0,0,0.12)!important}
          .bg-preset-glass:hover{background:rgba(255,255,255,0.18)!important;transform:translateY(-1px)!important;box-shadow:0 6px 20px rgba(0,0,0,0.18)!important}
          .bg-preset-neon{background:transparent!important;border:1px solid rgba(99,102,241,0.55)!important;color:#a5b4fc!important;box-shadow:0 0 6px rgba(99,102,241,0.25),inset 0 0 10px rgba(99,102,241,0.06)!important;text-shadow:0 0 8px rgba(165,180,252,0.5)!important}
          .bg-preset-neon:hover{border-color:rgba(99,102,241,0.9)!important;box-shadow:0 0 14px rgba(99,102,241,0.6),0 0 28px rgba(99,102,241,0.3),inset 0 0 14px rgba(99,102,241,0.12)!important;color:#e0e7ff!important;text-shadow:0 0 12px rgba(165,180,252,0.8)!important}
          .bg-preset-liquid{position:relative!important;background:rgba(255,255,255,0.08)!important;backdrop-filter:blur(20px) saturate(180%)!important;-webkit-backdrop-filter:blur(20px) saturate(180%)!important;border:1px solid rgba(255,255,255,0.18)!important;color:rgba(255,255,255,0.92)!important;box-shadow:inset 0 0 20px rgba(255,255,255,0.07),0 8px 32px rgba(31,38,135,0.18),0 2px 6px rgba(0,0,0,0.18)!important;overflow:hidden!important}
          .bg-preset-liquid::before{content:"";position:absolute;inset:0;border-radius:inherit;background:radial-gradient(circle at var(--bg-mx,50%) var(--bg-my,30%),rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.06) 45%,transparent 70%);pointer-events:none}
          .bg-preset-liquid::after{content:"";position:absolute;top:0;left:10%;width:80%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent);pointer-events:none}
          .bg-preset-liquid:hover{box-shadow:inset 0 0 24px rgba(255,255,255,0.12),0 12px 40px rgba(31,38,135,0.28),0 4px 12px rgba(0,0,0,0.22)!important;transform:translateY(-1px)!important}
          .bg-preset-gradient{background-size:200% 200%!important;background-image:linear-gradient(135deg,#f093fb 0%,#f5576c 25%,#fda085 50%,#f6d365 75%,#a18cd1 100%)!important;background-position:0% 50%!important;border:none!important;color:#fff!important;font-weight:600!important;box-shadow:0 3px 14px rgba(240,147,251,0.35)!important;text-shadow:0 1px 2px rgba(0,0,0,0.15)!important;transition:background-position 0.5s ease,box-shadow 0.3s ease,transform 0.2s ease!important}
          .bg-preset-gradient:hover{background-position:100% 50%!important;box-shadow:0 6px 24px rgba(240,147,251,0.5)!important;transform:translateY(-1px)!important}
          .bg-preset-soft{background:#ffffff!important;border:1px solid rgba(0,0,0,0.06)!important;color:#374151!important;box-shadow:0 1px 2px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.07),0 16px 32px rgba(0,0,0,0.04)!important;transition:box-shadow 0.25s ease,transform 0.25s ease!important}
          .bg-preset-soft:hover{transform:translateY(-3px)!important;box-shadow:0 2px 4px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.10),0 24px 48px rgba(0,0,0,0.06)!important}
          .bg-preset-pulse{background:#fff!important;border:1px solid #e5e7eb!important;color:#374151!important;box-shadow:0 1px 3px rgba(0,0,0,0.06)!important;animation:bg-pulseRing 2s ease-in-out infinite!important}
          .bg-preset-pulse:hover{animation:none!important;transform:scale(1.02)!important;box-shadow:0 0 0 3px rgba(99,102,241,0.25),0 4px 16px rgba(99,102,241,0.2)!important;border-color:#6366f1!important;color:#4f46e5!important}
          .bg-preset-pulse-d1{animation-delay:0s!important}
          .bg-preset-pulse-d2{animation-delay:0.4s!important}
          .bg-preset-pulse-d3{animation-delay:0.8s!important}
          .bg-preset-pulse-d4{animation-delay:1.2s!important}
          @keyframes bg-pulseRing{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.35),0 1px 3px rgba(0,0,0,0.06)}50%{box-shadow:0 0 0 7px rgba(99,102,241,0),0 1px 3px rgba(0,0,0,0.06)}}
          /* 미리보기 버튼 공통 */
          .bg-prv-btn{display:flex;align-items:center;cursor:pointer;font-size:14px;font-weight:500;transition:all .15s ease;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
        `}} />

        {/* Detail sliders */}
        <div style="display:grid; gap:16px">
          <div>
            <div class="provider-toggle" style="border:none; padding:0">
              <label class="toggle">
                <input type="checkbox" id="showTitleToggle" checked={ws.showTitle === true} />
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
          <div style="border-top:1px solid #e2e8f0; padding-top:16px; margin-top:4px">
            <label style="font-size:13px; font-weight:600; color:#475569; display:block; margin-bottom:8px">위젯 삽입 위치</label>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
              {(['before', 'after', 'custom'] as const).map(pos => {
                const labels: Record<string, string> = { before: '로그인 폼 위', after: '로그인 폼 아래', custom: '커스텀 셀렉터' };
                const active = ((ws as any).widgetPosition || 'before') === pos;
                return (
                  <button class="position-btn" data-position={pos} type="button" style={`padding:6px 16px; font-size:13px; border-radius:6px; cursor:pointer; border:1px solid ${active ? '#2563eb' : '#d1d5db'}; background:${active ? '#eff6ff' : '#fff'}; color:${active ? '#2563eb' : '#475569'}; font-weight:${active ? '600' : '400'}`}>{labels[pos]}</button>
                );
              })}
            </div>
            <div id="customSelectorWrap" style={`margin-top:10px; ${((ws as any).widgetPosition || 'before') === 'custom' ? '' : 'display:none'}`}>
              <input type="text" id="customSelectorInput" placeholder="예: .login__button, #member_login_module_id" value={(ws as any).customSelector || ''} style="padding:6px 10px; border:1px solid #d1d5db; border-radius:6px; font-size:13px; width:100%; font-family:monospace" />
              <p style="font-size:11px; color:#94a3b8; margin-top:4px; margin-bottom:8px">CSS 셀렉터를 입력하면 해당 요소 앞에 위젯을 삽입합니다.</p>
              <div>
                <p style="font-size:11px; font-weight:600; color:#64748b; margin:0 0 6px">자주 쓰는 셀렉터 (클릭하여 적용)</p>
                <div style="display:flex; flex-wrap:wrap; gap:6px">
                  {[
                    { sel: '.login__button', desc: '로그인 버튼 위' },
                    { sel: '.login__sns', desc: '기본 SNS 영역 위' },
                    { sel: '.login__util', desc: '회원가입·아이디찾기 위' },
                    { sel: '.login__security', desc: '보안접속 영역 위' },
                    { sel: '#member_login_module_id', desc: '로그인 박스 전체 위' },
                  ].map(item => (
                    <button type="button" class="selector-suggest-btn" data-selector={item.sel} title={item.desc} style="padding:4px 10px; font-size:11px; font-family:monospace; color:#475569; background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; cursor:pointer">{item.sel}</button>
                  ))}
                </div>
                <p style="font-size:11px; color:#94a3b8; margin-top:6px">버튼 위에 마우스를 올리면 삽입 위치 설명이 나옵니다. 쇼핑몰 스킨에 따라 일부 셀렉터는 존재하지 않을 수 있습니다.</p>
              </div>
            </div>
          </div>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:12px">
          <button id="resetStyleBtn" type="button" style="padding:8px 16px; font-size:13px; color:#64748b; background:#f1f5f9; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer">기본값으로 되돌리기</button>
          <button id="saveStyleBtn" type="button" disabled style="padding:8px 24px; font-size:13px; color:#fff; background:#2563eb; border:none; border-radius:6px; cursor:pointer; font-weight:600; opacity:0.5">디자인 저장</button>
        </div>
      </div>

      {/* Plus 업그레이드 결제 모달 */}
      <div id="plusUpgradeModal" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,0.45);align-items:center;justify-content:center">
        <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:400px;width:calc(100% - 32px);box-shadow:0 20px 60px rgba(0,0,0,0.15);position:relative">
          <h2 style="font-size:20px;font-weight:700;margin:0 0 6px;background:linear-gradient(135deg,#6366f1,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
            Plus로 업그레이드하면
          </h2>
          <p style="font-size:14px;color:#374151;margin:0 0 20px">이 디자인이 그대로 적용됩니다.</p>

          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
            {/* 월간 옵션 */}
            <label id="billingOptMonthly" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:border-color 0.15s">
              <input type="radio" name="billingCycle" value="monthly" style="margin-top:2px;accent-color:#6366f1" />
              <div>
                <div style="font-size:15px;font-weight:600;color:#111827">월 6,900원</div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px">매달 부담 없이 시작</div>
              </div>
            </label>
            {/* 연간 옵션 (기본 선택) */}
            <label id="billingOptYearly" style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border:2px solid #6366f1;border-radius:12px;cursor:pointer;background:#f5f3ff;transition:border-color 0.15s">
              <input type="radio" name="billingCycle" value="yearly" checked style="margin-top:2px;accent-color:#6366f1" />
              <div>
                <div style="font-size:15px;font-weight:600;color:#111827">연 79,000원 <span style="font-size:11px;background:#6366f1;color:#fff;padding:1px 7px;border-radius:10px;font-weight:600;vertical-align:middle;margin-left:4px">추천</span></div>
                <div style="font-size:12px;color:#6b7280;margin-top:2px">결제 공백 없이 1년 안심 운영</div>
                <div style="font-size:11px;color:#9ca3af;margin-top:2px">비슷한 가입 유도 앱들의 월 비용 수준의 연간 가격</div>
              </div>
            </label>
          </div>

          <div style="display:flex;gap:10px">
            <button id="plusStartBtn" type="button" style="flex:1;padding:13px;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:700;cursor:pointer">
              Plus 시작하기
            </button>
            <button id="plusLaterBtn" type="button" style="padding:13px 18px;background:#f1f5f9;color:#64748b;border:none;border-radius:10px;font-size:14px;font-weight:500;cursor:pointer">
              나중에
            </button>
          </div>

          <p id="plusModalError" style="display:none;font-size:12px;color:#ef4444;margin-top:10px;text-align:center"></p>
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
            presetTier: widgetStyle.presetTier || 'free',
            buttonWidth: widgetStyle.buttonWidth,
            buttonHeight: widgetStyle.buttonHeight || 45,
            buttonGap: widgetStyle.buttonGap,
            borderRadius: widgetStyle.borderRadius,
            align: widgetStyle.align,
            buttonLabel: widgetStyle.buttonLabel || '{name}로 시작하기',
            showIcon: widgetStyle.showIcon !== false,
            iconGap: widgetStyle.iconGap || 30,
            paddingLeft: widgetStyle.paddingLeft || 100,
            showTitle: widgetStyle.showTitle === true,
            showPoweredBy: widgetStyle.showPoweredBy !== false,
            widgetPosition: widgetStyle.widgetPosition || 'before',
            customSelector: widgetStyle.customSelector || ''
          };
          var shopPlan = '${shop.plan}';
          var shopId = null; // providerForm에서 읽음

          // Plus 프리셋 식별자 집합
          var PLUS_PRESETS = new Set(['glassmorphism','neon-glow','liquid-glass','gradient-flow','soft-shadow','pulse']);

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

            // Plus 프리셋 클래스 매핑
            var PLUS_CLASS_MAP = {
              'glassmorphism': 'bg-preset-glass',
              'neon-glow': 'bg-preset-neon',
              'liquid-glass': 'bg-preset-liquid',
              'gradient-flow': 'bg-preset-gradient',
              'soft-shadow': 'bg-preset-soft',
              'pulse': 'bg-preset-pulse'
            };
            var plusClass = PLUS_CLASS_MAP[style.preset] || '';
            var isPlusPreset = !!plusClass;
            var pulseDelayClasses = ['bg-preset-pulse-d1','bg-preset-pulse-d2','bg-preset-pulse-d3','bg-preset-pulse-d4'];
            var pulseIdx = 0;

            providers.forEach(function(p) {
              var btn = document.createElement('div');
              var color = providerColors[p] || '#999';
              var textColor = providerTextColors[p] || '#fff';
              var name = providerNames[p] || p;

              // Plus 프리셋: CSS 클래스로 처리
              if (isPlusPreset) {
                var btnHeight = style.buttonHeight || 44;
                var w = style.buttonWidth;
                var justifyContent2 = justifyMap[style.align] || 'center';
                var baseClass = 'bg-prv-btn ' + plusClass;
                if (style.preset === 'pulse') {
                  baseClass += ' ' + (pulseDelayClasses[pulseIdx % 4]);
                  pulseIdx++;
                }
                btn.className = baseClass;
                btn.style.cssText = 'width:' + w + 'px;height:' + btnHeight + 'px;padding:0 16px 0 ' + style.paddingLeft + 'px;gap:' + style.iconGap + 'px;justify-content:' + justifyContent2 + ';border-radius:' + style.borderRadius + 'px';
                if (style.showIcon && providerIcons[p]) {
                  var iconWrapP = document.createElement('span');
                  iconWrapP.style.cssText = 'flex-shrink:0;display:flex;align-items:center';
                  iconWrapP.innerHTML = providerIcons[p];
                  // Plus 프리셋: 배경 톤에 따라 아이콘 fill 자동 결정 (구글 4색 제외)
                  if (p !== 'google') {
                    var PLUS_DARK_SET = new Set(['glassmorphism','neon-glow','liquid-glass','gradient-flow']);
                    var plusFill = PLUS_DARK_SET.has(style.preset) ? '#ffffff' : '#374151';
                    iconWrapP.querySelectorAll('path').forEach(function(el) { el.setAttribute('fill', plusFill); });
                  }
                  btn.appendChild(iconWrapP);
                }
                var textSpanP = document.createElement('span');
                textSpanP.style.cssText = style.showIcon ? '' : 'width:100%;text-align:center';
                textSpanP.textContent = style.buttonLabel.replace('{name}', name);
                btn.appendChild(textSpanP);
                container.appendChild(btn);
                return;
              }

              // Free 프리셋별 색상 결정
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

          // Plus 프리셋 미리보기 배경 (프리셋별 컨테이너 배경)
          var PLUS_PREVIEW_BG = {
            'glassmorphism': 'linear-gradient(135deg,#667eea 0%,#764ba2 40%,#f093fb 100%)',
            'neon-glow': '#0a0a14',
            'liquid-glass': 'linear-gradient(160deg,#0f2027 0%,#203a43 50%,#2c5364 100%)',
            'gradient-flow': '#f8f9fb',
            'soft-shadow': '#f0f2f5',
            'pulse': '#f8f9fb'
          };

          // 미리보기 프레임 배경 갱신
          function updatePreviewBg(preset) {
            var frame = document.getElementById('previewFrame');
            if (!frame) return;
            if (PLUS_PREVIEW_BG[preset]) {
              frame.style.background = PLUS_PREVIEW_BG[preset];
            } else {
              frame.style.background = '#f8fafc';
            }
          }

          // Preset card click
          document.querySelectorAll('.preset-card').forEach(function(card) {
            card.addEventListener('click', function() {
              document.querySelectorAll('.preset-card').forEach(function(c) { c.classList.remove('active'); });
              this.classList.add('active');
              style.preset = this.dataset.preset;
              style.presetTier = this.dataset.tier || 'free';
              document.getElementById('btnWidth').disabled = style.preset === 'icon-only';
              updatePreviewBg(style.preset);
              renderPreview();
              markChanged();

              // funnel 이벤트: Plus 프리셋 클릭 (미리보기 적용)
              if (PLUS_PRESETS.has(style.preset)) {
                var sid = document.getElementById('providerForm') ? document.getElementById('providerForm').dataset.shopId : null;
                if (sid) {
                  apiCall('POST', '/api/dashboard/widget/event-dashboard', {
                    shop_id: sid,
                    event_type: 'widget_style.preview_plus_preset',
                    event_data: { preset: style.preset }
                  }).catch(function() {});
                }
              }
            });
          });

          // 리퀴드 글래스 마우스 추적 광택 (미리보기 영역)
          document.addEventListener('mousemove', function(e) {
            document.querySelectorAll('#previewButtons .bg-preset-liquid').forEach(function(el) {
              var rect = el.getBoundingClientRect();
              el.style.setProperty('--bg-mx', ((e.clientX - rect.left) / rect.width * 100).toFixed(1) + '%');
              el.style.setProperty('--bg-my', ((e.clientY - rect.top) / rect.height * 100).toFixed(1) + '%');
            });
          });
          document.getElementById('previewFrame').addEventListener('mouseleave', function() {
            document.querySelectorAll('#previewButtons .bg-preset-liquid').forEach(function(el) {
              el.style.setProperty('--bg-mx', '50%');
              el.style.setProperty('--bg-my', '30%');
            });
          });

          // 초기 미리보기 배경 설정
          updatePreviewBg(style.preset);

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

          // 위젯 삽입 위치 토글
          document.querySelectorAll('.position-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              document.querySelectorAll('.position-btn').forEach(function(b) {
                b.style.border = '1px solid #d1d5db';
                b.style.background = '#fff';
                b.style.color = '#475569';
                b.style.fontWeight = '400';
              });
              this.style.border = '1px solid #2563eb';
              this.style.background = '#eff6ff';
              this.style.color = '#2563eb';
              this.style.fontWeight = '600';
              style.widgetPosition = this.dataset.position;
              var wrap = document.getElementById('customSelectorWrap');
              if (wrap) wrap.style.display = this.dataset.position === 'custom' ? '' : 'none';
              markChanged();
            });
          });

          // 커스텀 셀렉터 입력
          var customSelectorInput = document.getElementById('customSelectorInput');
          if (customSelectorInput) {
            customSelectorInput.addEventListener('input', function() {
              style.customSelector = this.value.trim();
              markChanged();
            });
          }

          // 추천 셀렉터 버튼 클릭 → 입력 필드에 자동 입력
          document.querySelectorAll('.selector-suggest-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
              var sel = this.dataset.selector;
              if (customSelectorInput) {
                customSelectorInput.value = sel;
                style.customSelector = sel;
                markChanged();
              }
            });
          });

          // Provider toggle -> re-render preview
          document.querySelectorAll('#providerForm input[name=providers]').forEach(function(cb) {
            cb.addEventListener('change', function() { setTimeout(renderPreview, 100); });
          });

          async function saveStyle() {
            shopId = document.getElementById('providerForm').dataset.shopId;
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

          // Plus 업그레이드 모달 표시
          function showPlusUpgradeModal() {
            var modal = document.getElementById('plusUpgradeModal');
            if (!modal) return;
            modal.style.display = 'flex';

            // funnel 이벤트
            var sid = document.getElementById('providerForm') ? document.getElementById('providerForm').dataset.shopId : null;
            if (sid) {
              apiCall('POST', '/api/dashboard/widget/event-dashboard', {
                shop_id: sid,
                event_type: 'widget_style.save_attempt_locked',
                event_data: { preset: style.preset }
              }).catch(function() {});
              apiCall('POST', '/api/dashboard/widget/event-dashboard', {
                shop_id: sid,
                event_type: 'billing.upgrade_modal_shown',
                event_data: { source: 'design_preview', preset: style.preset }
              }).catch(function() {});
            }
          }

          // 결제 모달 라디오 스타일 갱신
          var radios = document.querySelectorAll('input[name="billingCycle"]');
          radios.forEach(function(r) {
            r.addEventListener('change', function() {
              var mLabel = document.getElementById('billingOptMonthly');
              var yLabel = document.getElementById('billingOptYearly');
              if (!mLabel || !yLabel) return;
              if (this.value === 'monthly') {
                mLabel.style.border = '2px solid #6366f1';
                mLabel.style.background = '#f5f3ff';
                yLabel.style.border = '2px solid #e5e7eb';
                yLabel.style.background = '#fff';
              } else {
                yLabel.style.border = '2px solid #6366f1';
                yLabel.style.background = '#f5f3ff';
                mLabel.style.border = '2px solid #e5e7eb';
                mLabel.style.background = '#fff';
              }
            });
          });

          // 나중에 버튼
          var laterBtn = document.getElementById('plusLaterBtn');
          if (laterBtn) {
            laterBtn.addEventListener('click', function() {
              var modal = document.getElementById('plusUpgradeModal');
              if (modal) modal.style.display = 'none';
              // 미리보기는 그대로 유지 (style 변수는 건드리지 않음)
            });
          }

          // Plus 시작하기 버튼 → 카페24 인앱결제 흐름
          var plusStartBtn = document.getElementById('plusStartBtn');
          if (plusStartBtn) {
            plusStartBtn.addEventListener('click', async function() {
              var modal = document.getElementById('plusUpgradeModal');
              var errEl = document.getElementById('plusModalError');
              var sid = document.getElementById('providerForm') ? document.getElementById('providerForm').dataset.shopId : null;
              if (!sid) { if (errEl) { errEl.textContent = '쇼핑몰 정보를 찾을 수 없습니다.'; errEl.style.display = 'block'; } return; }

              var selectedCycle = 'yearly';
              var cycleRadios = document.querySelectorAll('input[name="billingCycle"]');
              for (var cr = 0; cr < cycleRadios.length; cr++) {
                if (cycleRadios[cr].checked) { selectedCycle = cycleRadios[cr].value; break; }
              }

              plusStartBtn.disabled = true;
              plusStartBtn.textContent = '처리 중...';
              if (errEl) errEl.style.display = 'none';

              try {
                var resp = await apiCall('POST', '/api/dashboard/billing/subscribe', {
                  plan: selectedCycle,
                  shop_id: sid
                });
                var data = await resp.json();
                if (!resp.ok) {
                  if (errEl) { errEl.textContent = data.message || '결제 주문 생성에 실패했습니다.'; errEl.style.display = 'block'; }
                  plusStartBtn.disabled = false;
                  plusStartBtn.textContent = 'Plus 시작하기';
                  return;
                }
                // 카페24 결제창 팝업
                if (modal) modal.style.display = 'none';
                var popup = window.open(data.confirmation_url, 'plus_payment', 'width=520,height=700,scrollbars=yes');
                // 결제 완료 감지 (팝업이 닫히면 reload)
                var poll = setInterval(function() {
                  if (!popup || popup.closed) {
                    clearInterval(poll);
                    // funnel 이벤트: 결제 완료 (실제 완료는 webhook에서 처리, 여기선 낙관적으로 기록)
                    apiCall('POST', '/api/dashboard/widget/event-dashboard', {
                      shop_id: sid,
                      event_type: 'billing.upgrade_completed_via_design_preview',
                      event_data: { preset: style.preset, plan: selectedCycle }
                    }).catch(function() {});
                    showToast('success', 'Plus 활성화 완료! 디자인이 적용됩니다.');
                    setTimeout(function() { window.location.reload(); }, 1500);
                  }
                }, 1000);
              } catch (err) {
                if (errEl) { errEl.textContent = '오류가 발생했습니다. 다시 시도해주세요.'; errEl.style.display = 'block'; }
                plusStartBtn.disabled = false;
                plusStartBtn.textContent = 'Plus 시작하기';
              }
            });
          }

          // 저장 버튼
          var saveBtn = document.getElementById('saveStyleBtn');
          if (saveBtn) {
            saveBtn.addEventListener('click', function() {
              // Plus 프리셋 + free 플랜 → 결제 모달
              if (PLUS_PRESETS.has(style.preset) && shopPlan === 'free') {
                showPlusUpgradeModal();
                return;
              }
              saveStyle();
            });
          }

          // 기본값으로 되돌리기
          var resetBtn = document.getElementById('resetStyleBtn');
          if (resetBtn) {
            resetBtn.addEventListener('click', async function() {
              if (!confirm('위젯 디자인을 기본값으로 되돌리고 저장하시겠습니까?')) return;
              var defaults = {preset:'default',buttonWidth:370,buttonHeight:45,buttonGap:6,borderRadius:5,align:'left',buttonLabel:'{name}로 시작하기',showIcon:true,iconGap:30,paddingLeft:100,showTitle:false,showPoweredBy:true,widgetPosition:'before',customSelector:''};
              Object.assign(style, defaults);
              // UI 컨트롤 동기화
              document.getElementById('btnWidth').value = defaults.buttonWidth; document.getElementById('widthValue').textContent = defaults.buttonWidth + 'px';
              document.getElementById('btnHeight').value = defaults.buttonHeight; document.getElementById('heightValue').textContent = defaults.buttonHeight + 'px';
              document.getElementById('btnGap').value = defaults.buttonGap; document.getElementById('gapValue').textContent = defaults.buttonGap + 'px';
              document.getElementById('btnRadius').value = defaults.borderRadius; document.getElementById('radiusValue').textContent = defaults.borderRadius + 'px';
              document.getElementById('btnIconGap').value = defaults.iconGap; document.getElementById('iconGapValue').textContent = defaults.iconGap + 'px';
              document.getElementById('btnPaddingLeft').value = defaults.paddingLeft; document.getElementById('paddingLeftValue').textContent = defaults.paddingLeft + 'px';
              document.getElementById('showIconToggle').checked = true;
              document.getElementById('showTitleToggle').checked = false;
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
              // 위치 토글 리셋
              document.querySelectorAll('.position-btn').forEach(function(b) {
                b.style.border = '1px solid #d1d5db'; b.style.background = '#fff'; b.style.color = '#475569'; b.style.fontWeight = '400';
              });
              var defPos = document.querySelector('.position-btn[data-position="before"]');
              if (defPos) { defPos.style.border = '1px solid #2563eb'; defPos.style.background = '#eff6ff'; defPos.style.color = '#2563eb'; defPos.style.fontWeight = '600'; }
              // 커스텀 셀렉터 리셋
              var csi = document.getElementById('customSelectorInput');
              if (csi) csi.value = '';
              var csw = document.getElementById('customSelectorWrap');
              if (csw) csw.style.display = 'none';
              renderPreview();
              markChanged();
              // 즉시 저장까지 실행
              await saveStyle();
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
        <div>
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

          {/* 3개 쿠폰 카드를 한 줄 가로 배치 (좁은 화면은 자동 줄바꿈) */}
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-bottom:16px">
          {/* 무료배송 쿠폰 카드 */}
          <div id="couponCard_shipping" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px">
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
          <div id="couponCard_amount" style="border:1px solid #e5e7eb;border-radius:10px;padding:16px">
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
          <div id="couponCard_rate" style={`border:1px solid #e5e7eb;border-radius:10px;padding:16px${shop.plan === 'free' ? ';opacity:0.5;pointer-events:none' : ''}`}>
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
          </div>{/* /3개 쿠폰 카드 grid */}

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
            <span style="font-size:11px;color:#94a3b8">AI 브리핑 생성 시 미니배너·팝업·에스컬레이션 문구를 자동으로 업데이트합니다</span>
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
