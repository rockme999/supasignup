/**
 * Help pages: QuickStartPage, GuidePage, FaqPage, InquiriesPage, InquiryDetailPage.
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';
import { inquiryStatusLabel } from './shared';
import { mdToHtml } from '../utils/markdown';

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
            <div style="font-size:14px;font-weight:600;color:#1e293b">소셜 로그인 선택</div>
            <div style="font-size:12px;color:#64748b">권장: Google + Kakao + Naver</div>
          </div>
          <a href="/dashboard/settings/providers" class="btn btn-outline btn-sm" style="margin-left:auto;width:auto">설정하기 →</a>
          <button id="qsProviderCheck" class="btn btn-outline btn-sm" style="width:auto">확인 완료</button>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <span id="qsWidgetBadge" style="width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;background:#d1d5db">4</span>
          <div>
            <div style="font-size:14px;font-weight:600;color:#1e293b">쇼핑몰에서 위젯 확인</div>
            <div style="font-size:12px;color:#64748b">쇼핑몰 로그인 페이지에서 소셜 로그인 버튼이 표시되는지 확인하세요</div>
          </div>
          <button id="qsWidgetCheck" class="btn btn-outline btn-sm" style="margin-left:auto;width:auto">확인 완료</button>
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
        initQsCheck('qsWidgetCheck', 'bg_qs_widget_checked', 'qsWidgetBadge');
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

    {/* Step 3: 소셜 로그인 선택 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">Step 3. 소셜 로그인 선택</h2>
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
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">가장 중요한 단계입니다. SSO 설정 가이드 페이지에서 Client ID, Secret, URL을 확인하고 카페24 관리자에 입력합니다. 등록 완료 후 가이드 하단의 '설정 확인' 버튼으로 연동이 정상인지 확인하세요.</p>
            <a href="/dashboard/settings/sso-guide" style="font-size:13px;color:#3b82f6;text-decoration:none;margin-top:6px;display:inline-block">SSO 설정 가이드 →</a>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">2</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">"회원가입 시 SNS 계정 연동" 설정 (강력 권장)</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">이 옵션은 카페24에서 기본적으로 활성화되어 있습니다. 카페24 관리자 &gt; 쇼핑몰 설정 &gt; 고객 설정에서 해당 옵션이 "사용함"으로 되어 있는지 확인하세요. 이 설정을 통해 기존 ID/PW 회원과 소셜 계정이 자동 연동됩니다.</p>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0;border-bottom:1px solid #f1f5f9">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">3</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">소셜 로그인 선택</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">사용할 소셜 로그인 서비스를 활성화합니다. 한국 시장이라면 Google + Kakao + Naver 3종을 기본으로 권장합니다.</p>
            <a href="/dashboard/settings/providers" style="font-size:13px;color:#3b82f6;text-decoration:none;margin-top:6px;display:inline-block">로그인 디자인 설정 →</a>
          </div>
        </li>
        <li style="display:flex;gap:16px;padding:14px 0">
          <div style="flex-shrink:0;width:32px;height:32px;border-radius:50%;background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700">4</div>
          <div style="flex:1">
            <p style="font-size:14px;font-weight:600;color:#1e293b;margin:0 0 4px">쇼핑몰에서 위젯 확인</p>
            <p style="font-size:13px;color:#64748b;margin:0;line-height:1.7">쇼핑몰 로그인 페이지를 열어 소셜 로그인 버튼이 정상 표시되는지 확인합니다.</p>
          </div>
        </li>
      </ol>
    </div>

    {/* 2. SSO 연동 설정 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">2. SSO(통합 로그인) 연동 설정</h2>
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

    {/* 4. 소셜 로그인 서비스별 안내 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">4. 소셜 로그인 서비스별 안내</h2>
      <p style="font-size:13px;color:#64748b;margin-bottom:14px">각 소셜 로그인 서비스의 이메일 제공 여부와 기존 회원 연동 가능 여부를 확인하세요.</p>

      <div style="overflow-x:auto">
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f8fafc">
              <th style="padding:10px 12px;text-align:left;font-weight:600;color:#475569;border-bottom:1px solid #e2e8f0">서비스</th>
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
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">LINE</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">🟡 2026년 지원 예정</td>
            </tr>
            <tr style="background:#f8fafc">
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">X (구 Twitter)</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">🟡 2026년 지원 예정</td>
            </tr>
            <tr>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">Facebook</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;text-align:center;color:#94a3b8">예정</td>
              <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#64748b">🟡 2026년 지원 예정</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-top:14px;font-size:13px;color:#92400e;line-height:1.7">
        <strong>이메일 미제공 서비스(Telegram)</strong>는 기존 회원과 연동이 불가하며, 항상 신규 @s 회원이 생성됩니다.
      </div>
      <p style="font-size:12px;color:#64748b;margin-top:10px">향후 지원 예정 프로바이더는 관리자에서 '준비 중' 배지로 표시되며, 오픈 시 토글만 켜면 바로 사용 가능합니다.</p>
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
            <td style="padding:9px 12px;border-bottom:1px solid #f1f5f9;color:#475569">{'{name}'}이 각 서비스명(Google, 카카오 등)으로 자동 치환됩니다.</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top:14px">
        <a href="/dashboard/settings/providers" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">디자인 설정 →</a>
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
          <a href="/dashboard/ai-briefing" style="flex-shrink:0;font-size:13px;color:#3b82f6;text-decoration:none;white-space:nowrap;padding-top:2px">보기 →</a>
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

    {/* 8. 자주 묻는 조작 이슈 */}
    <div class="card" style="margin-bottom:16px">
      <h2 style="margin-bottom:8px">8. 자주 묻는 조작 이슈</h2>
      <ul style="font-size:13px;color:#475569;line-height:1.8;padding-left:20px;margin:0">
        <li><strong>로그인 페이지에 소셜 버튼이 안 보여요</strong> — 위젯 삽입 위치를 "로그인 폼 아래"로 변경하거나, 커스텀 셀렉터(<code>.login__button</code>, <code>.login__sns</code>)로 시도해 보세요.</li>
        <li><strong>설정 변경이 즉시 반영되나요?</strong> — 관리자 우측 미리보기는 즉시 반영되며, "디자인 저장" 클릭 시 쇼핑몰에도 즉시 반영됩니다.</li>
        <li><strong>기본값으로 되돌리기</strong> — 디자인 설정 페이지 하단의 "기본값으로 되돌리기" 버튼으로 한 번에 복구됩니다.</li>
      </ul>
    </div>

    {/* 하단 링크 */}
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:8px">
      <a href="/dashboard/faq" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">FAQ 바로가기 →</a>
      <a href="/dashboard/quickstart" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">퀵스타트 가이드 →</a>
      <a href="/dashboard/inquiries" class="btn btn-outline btn-sm" style="display:inline-flex;width:auto">문의하기 →</a>
    </div>
  </Layout>
);


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
          <p style="margin-top:6px">구글, 카카오, 네이버, 애플, 디스코드, 텔레그램 6종의 소셜 로그인을 지원합니다. 1클릭 회원가입으로 쇼핑몰의 가입률을 높일 수 있습니다. 복잡한 회원가입 양식 없이 기존 소셜 계정으로 즉시 가입이 가능합니다.</p>
        </div>
      </details>

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 무료 플랜과 Plus 플랜 기능 차이는?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <table style="border-collapse:collapse;width:100%;max-width:560px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">기능</th>
                <th style="text-align:center;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">Free</th>
                <th style="text-align:center;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">Plus (월 6,900원)</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">소셜 6종 1클릭 가입</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">로그인 버튼 디자인 커스텀</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">가입 쿠폰</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">1종 (정률 할인)</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">3종 (무료배송/정액/정률)</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">"powered by 번개가입" 제거</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">AI 쇼핑몰 정체성 분석</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅ (10회/일)</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅ (10회/일)</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">AI 주간 브리핑</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅ (매주 월 9시 KST)</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">AI 추천 마케팅 문구</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅ (월 10회)</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">이탈 감지 팝업 + 재방문 미니배너</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">방문 회차별 에스컬레이션 메시지</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
              <tr><td style="padding:6px 12px;border:1px solid #e2e8f0">카카오톡 채널 자동 연결</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">❌</td><td style="padding:6px 12px;border:1px solid #e2e8f0;text-align:center">✅</td></tr>
            </tbody>
          </table>
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
                <td style="padding:6px 12px;border:1px solid #e2e8f0">소셜 로그인 6종 + 가입 쿠폰 1종</td>
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
          <p>카페24 기본 소셜 로그인은 4종(구글, 카카오, 네이버, 페이스북)이지만, 번개가입은 구글, 카카오, 네이버, 애플, 디스코드, 텔레그램 6종의 소셜 로그인을 지원합니다.</p>
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
          <span style="color:#94a3b8;font-size:12px">▶</span> 서비스별 주의사항이 있나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <table style="border-collapse:collapse;width:100%;max-width:540px;margin-bottom:10px">
            <thead>
              <tr>
                <th style="text-align:left;padding:6px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px">서비스</th>
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
                <td style="padding:6px 12px;border:1px solid #e2e8f0">텔레그램</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">미제공</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">기존 회원 연동 불가</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">LINE</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">예정</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">🟡 2026년 예정</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">X (구 Twitter)</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">예정</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">🟡 2026년 예정</td>
              </tr>
              <tr>
                <td style="padding:6px 12px;border:1px solid #e2e8f0">Facebook</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">예정</td>
                <td style="padding:6px 12px;border:1px solid #e2e8f0;color:#94a3b8">🟡 2026년 예정</td>
              </tr>
            </tbody>
          </table>
          <ul style="padding-left:16px">
            <li><strong>Apple</strong>: "Hide My Email" 기능으로 임시 이메일을 사용하는 경우 기존 계정과 이메일 매칭이 불가할 수 있습니다.</li>
            <li><strong>텔레그램</strong>: 이메일을 제공하지 않으므로 기존 ID/PW 회원과의 연동이 불가합니다. 항상 새 <code>@s</code> 회원이 생성됩니다.</li>
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

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> Free에서 Plus로 업그레이드하면 기존 설정이 유지되나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>네, 모든 기존 설정은 그대로 유지되며 Plus 기능이 추가로 활성화됩니다.</p>
          <p style="margin-top:6px">다운그레이드 시에는 Plus 기능이 즉시 비활성화되지만, 설정 데이터는 보존됩니다. 재구독 시 이전 설정이 그대로 복원됩니다.</p>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> 카카오톡 채널 자동 연결은 어떻게 쓰나요?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>Plus 요금제에서 제공되는 기능으로, 고객이 카카오 로그인 후 쇼핑몰의 카카오톡 채널로 자동 친구 추가를 유도합니다. 관리자 &gt; 설정 &gt; 카카오 채널 ID 입력 후 활성화하시면 동작합니다.</p>
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
          이전 브리핑과 비교하여 변화 추이도 분석합니다. <a href="/dashboard/ai-briefing" style="color:#2563eb">AI 브리핑</a> 페이지에서 수동으로도 생성할 수 있습니다.
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

      <details style="border-bottom:1px solid #f1f5f9;padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b">AI 기능을 사용하려면 무엇이 필요한가요?</summary>
        <div style="margin-top:8px;font-size:13px;color:#475569;line-height:1.7;padding-left:8px">
          AI 기능은 <strong>Plus 플랜 전용</strong>입니다. 먼저 기본 설정에서 <strong>AI 정체성 분석</strong>을 실행해야 보고서와 추천 문구의 품질이 높아집니다.<br /><br />
          정체성 분석 없이도 동작하지만, 쇼핑몰 맞춤화된 결과를 원하시면 정체성 분석을 먼저 진행하세요. <a href="/dashboard/billing" style="color:#2563eb">Plus 업그레이드 →</a>
        </div>
      </details>

      <details style="padding:12px 0">
        <summary style="cursor:pointer;font-size:14px;font-weight:600;color:#1e293b;list-style:none;display:flex;align-items:center;gap:8px">
          <span style="color:#94a3b8;font-size:12px">▶</span> AI 기능별 일일 호출 한도는?
        </summary>
        <div style="margin-top:10px;font-size:13px;color:#475569;line-height:1.8;padding-left:16px">
          <p>번개가입의 AI 기능은 남용 방지를 위해 일별/월별 호출 제한이 있습니다.</p>
          <ul style="margin-top:6px;padding-left:16px">
            <li>AI 쇼핑몰 정체성 분석: <strong>일 10회</strong> (Free/Plus 공통)</li>
            <li>AI 주간 브리핑: <strong>일 5회</strong> (Plus 전용)</li>
            <li>AI 에스컬레이션 메시지 생성: <strong>일 5회</strong> (Plus 전용)</li>
            <li>AI 추천 마케팅 문구: <strong>월 10회</strong> (Plus 전용)</li>
          </ul>
          <p style="margin-top:8px">한도에 도달하면 다음날(또는 다음 달) 자정(KST)에 리셋됩니다.</p>
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


type InquiryRow = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  replied_at: string | null;
  shop_name: string | null;
  mall_id: string;
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

      {/* 이미지 첨부 영역 */}
      <div class="form-group">
        <label>이미지 첨부 <span style="font-weight:400;color:#94a3b8;font-size:12px">(선택, 최대 5개 · 파일당 5MB · PNG/JPEG/WebP/GIF)</span></label>
        {/* 드래그&드롭 + 클릭 영역 */}
        <div
          id="dropZone"
          style="border:2px dashed #d1d5db;border-radius:8px;padding:20px;text-align:center;cursor:pointer;transition:border-color 0.2s;margin-bottom:8px"
          ondragover="event.preventDefault();this.style.borderColor='#2563eb'"
          ondragleave="this.style.borderColor='#d1d5db'"
          ondrop="handleInquiryDrop(event)"
          onclick="document.getElementById('inquiryFiles').click()"
        >
          <p style="margin:0;font-size:13px;color:#64748b">클릭하거나 이미지를 여기로 드래그하세요</p>
          <p style="margin:4px 0 0 0;font-size:11px;color:#94a3b8">PNG, JPEG, WebP, GIF</p>
        </div>
        <input
          type="file"
          id="inquiryFiles"
          multiple
          accept="image/png,image/jpeg,image/webp,image/gif"
          style="display:none"
          onchange="handleInquiryFileSelect(event)"
        />
        {/* 썸네일 미리보기 영역 */}
        <div id="inquiryPreviews" style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px"></div>
        {/* 업로드 진행 상태 */}
        <div id="uploadProgress" style="display:none;font-size:12px;color:#2563eb;margin-top:6px"></div>
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
      // ── 선택된 파일 목록 (File 객체 배열) ──────────────────────
      var selectedFiles = [];
      var MAX_FILES = 5;
      var MAX_SIZE = 5 * 1024 * 1024; // 5MB
      var ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

      function resetInquiryForm() {
        document.getElementById('inquiryTitle').value = '';
        document.getElementById('inquiryContent').value = '';
        selectedFiles = [];
        document.getElementById('inquiryPreviews').innerHTML = '';
        document.getElementById('uploadProgress').style.display = 'none';
        document.getElementById('inquiryFiles').value = '';
        document.getElementById('dropZone').style.borderColor = '#d1d5db';
      }

      // ── 파일 추가 공통 처리 ─────────────────────────────────────
      function addFiles(files) {
        var added = 0;
        for (var i = 0; i < files.length; i++) {
          var f = files[i];
          if (selectedFiles.length >= MAX_FILES) {
            showToast('error', '파일은 최대 ' + MAX_FILES + '개까지 첨부할 수 있습니다.');
            break;
          }
          if (!ALLOWED_TYPES.includes(f.type)) {
            showToast('error', f.name + ': 허용되지 않는 파일 형식입니다. (PNG/JPEG/WebP/GIF)');
            continue;
          }
          if (f.size > MAX_SIZE) {
            showToast('error', f.name + ': 파일 크기가 5MB를 초과합니다.');
            continue;
          }
          selectedFiles.push(f);
          renderPreview(f, selectedFiles.length - 1);
          added++;
        }
      }

      // ── 썸네일 미리보기 렌더링 ──────────────────────────────────
      function renderPreview(file, idx) {
        var container = document.getElementById('inquiryPreviews');
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;width:80px;height:80px';
        wrap.dataset.idx = String(idx);

        var img = document.createElement('img');
        img.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb';
        var reader = new FileReader();
        reader.onload = function(e) { img.src = e.target.result; };
        reader.readAsDataURL(file);

        var xBtn = document.createElement('button');
        xBtn.textContent = '×';
        xBtn.type = 'button';
        xBtn.style.cssText = 'position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;background:#ef4444;color:#fff;border:none;cursor:pointer;font-size:13px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center';
        xBtn.onclick = function() { removeFile(idx); };

        wrap.appendChild(img);
        wrap.appendChild(xBtn);
        container.appendChild(wrap);
      }

      // ── 파일 제거 ───────────────────────────────────────────────
      function removeFile(idx) {
        selectedFiles.splice(idx, 1);
        // 미리보기 전체 재렌더링
        var container = document.getElementById('inquiryPreviews');
        container.innerHTML = '';
        selectedFiles.forEach(function(f, i) { renderPreview(f, i); });
      }

      // ── 드래그&드롭 이벤트 ─────────────────────────────────────
      function handleInquiryDrop(e) {
        e.preventDefault();
        document.getElementById('dropZone').style.borderColor = '#d1d5db';
        if (e.dataTransfer && e.dataTransfer.files) {
          addFiles(e.dataTransfer.files);
        }
      }

      // ── 파일 선택 이벤트 ───────────────────────────────────────
      function handleInquiryFileSelect(e) {
        addFiles(e.target.files);
        e.target.value = ''; // 같은 파일 재선택 허용
      }

      // ── 폼 토글 ────────────────────────────────────────────────
      var form = document.getElementById('inquiryForm');
      document.getElementById('openInquiryForm').addEventListener('click', function() {
        form.style.display = form.style.display === 'none' ? 'block' : 'none';
      });
      document.getElementById('cancelInquiry').addEventListener('click', function() {
        form.style.display = 'none';
        resetInquiryForm();
      });

      // ── 제출 ────────────────────────────────────────────────────
      document.getElementById('submitInquiry').addEventListener('click', async function() {
        var title = document.getElementById('inquiryTitle').value.trim();
        var content = document.getElementById('inquiryContent').value.trim();
        if (!title) { showToast('error', '제목을 입력해 주세요.'); return; }
        if (!content) { showToast('error', '내용을 입력해 주세요.'); return; }

        var btn = this;
        var progressEl = document.getElementById('uploadProgress');
        btn.disabled = true;
        btn.textContent = '제출 중...';

        try {
          // 1단계: 문의 생성
          var resp = await apiCall('POST', '/api/dashboard/inquiries', { title: title, content: content });
          if (!resp.ok) {
            var errData = await resp.json();
            showToast('error', errData.error || '문의 제출 중 오류가 발생했습니다.');
            return;
          }
          var created = await resp.json();
          var inquiryId = created.id;

          // 2단계: 파일 업로드 (있는 경우)
          if (selectedFiles.length > 0) {
            progressEl.style.display = 'block';
            var failedCount = 0;
            for (var i = 0; i < selectedFiles.length; i++) {
              progressEl.textContent = (i + 1) + '/' + selectedFiles.length + ' 업로드 중...';
              var fd = new FormData();
              fd.append('file', selectedFiles[i]);
              try {
                var uploadResp = await fetch('/api/dashboard/inquiries/' + inquiryId + '/attachments', {
                  method: 'POST',
                  body: fd,
                  credentials: 'same-origin',
                });
                if (!uploadResp.ok) {
                  var uploadErr = await uploadResp.json().catch(function() { return {}; });
                  console.error('Upload failed:', uploadErr);
                  failedCount++;
                }
              } catch (uploadEx) {
                console.error('Upload error:', uploadEx);
                failedCount++;
              }
            }
            progressEl.style.display = 'none';
            if (failedCount > 0) {
              showToast('error', '문의는 접수되었으나 ' + failedCount + '개 파일 업로드가 실패했습니다.');
            } else {
              showToast('success', '문의가 접수되었습니다.');
            }
          } else {
            showToast('success', '문의가 접수되었습니다.');
          }

          setTimeout(function() { location.reload(); }, 1000);
        } finally {
          btn.disabled = false;
          btn.textContent = '제출';
        }
      });
    `}} />
  </Layout>
);


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
  attachments?: string | null;        // JSON 배열 문자열 (R2 첨부 메타)
  customer_read_at?: string | null;   // 고객 최초 조회 시각 (렌더엔 안 쓰지만 pages.tsx 에서 함께 전달됨)
};

export const InquiryDetailPage: FC<{
  isCafe24?: boolean;
  inquiry: InquiryDetail;
}> = ({ isCafe24, inquiry }) => {
  const st = inquiryStatusLabel(inquiry.status);

  // 첨부파일 파싱
  let attachments: Array<{ key: string; name: string; size: number; mime: string; uploaded_at: string }> = [];
  try {
    const raw = inquiry.attachments;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) attachments = parsed;
    }
  } catch {
    // 파싱 실패 시 빈 배열 유지
  }

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

        {/* 첨부 이미지 섹션 */}
        {attachments.length > 0 && (
          <div style="margin-top:16px;border-top:1px solid #f1f5f9;padding-top:16px">
            <div style="font-size:12px;font-weight:600;color:#374151;margin-bottom:10px">
              첨부 이미지 ({attachments.length}개)
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
              {attachments.map((att) => (
                <a
                  href={`/api/dashboard/inquiries/${inquiry.id}/attachments/${encodeURIComponent(att.key)}`}
                  target="_blank"
                  rel="noopener"
                  title={att.name}
                >
                  <img
                    src={`/api/dashboard/inquiries/${inquiry.id}/attachments/${encodeURIComponent(att.key)}`}
                    alt={att.name}
                    style="width:100px;height:100px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;display:block"
                  />
                  <div style="font-size:10px;color:#94a3b8;margin-top:3px;width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    {att.name}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {inquiry.reply ? (
        <div class="card" style="border-left:4px solid #2563eb">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
            <span style="font-weight:700;font-size:14px;color:#2563eb">관리자 답변</span>
            <span style="font-size:12px;color:#94a3b8">{inquiry.replied_at ? inquiry.replied_at.slice(0, 16).replace('T', ' ') : ''}</span>
          </div>
          <div class="md-reply" style="font-size:14px;line-height:1.75" dangerouslySetInnerHTML={{ __html: mdToHtml(inquiry.reply) }} />
          {inquiry.status === 'auto_replied' && (
            <div style="margin-top:14px;padding:10px 12px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:6px;font-size:12px;color:#6b7280;line-height:1.6">
              <strong style="color:#7c3aed">AI 자동 답변</strong>입니다. 내용이 정확하지 않을 수 있으니, 추가 확인이 필요하시면 다시 문의해 주세요.
            </div>
          )}
        </div>
      ) : (
        <div class="card" style="text-align:center;padding:32px;color:#94a3b8;font-size:14px">
          아직 답변이 등록되지 않았습니다. 영업일 기준 1~2일 내에 답변드립니다.
        </div>
      )}
    </Layout>
  );
};

