/**
 * Cloudflare Email Sending (2026-04-16 public beta) 기반 운영자 발송.
 *
 * - Binding: env.EMAIL.send({ from, to, subject, html, text, headers })
 * - 발송 도메인: mail.suparain.kr (발송 전용 서브도메인. CF 대시보드 → Email Sending → Onboard Domain)
 *   메인 suparain.kr 의 Ecount 수신 흐름에 영향 없도록 서브도메인 분리. SPF/DKIM/DMARC 자동.
 * - 발송자: noreply@mail.suparain.kr (등록 도메인 하위)
 * - Reply-To: help@suparain.com (운영자가 회신 시 Ecount 메일함으로 도착)
 * - Workers Paid 필수 — 기존 Queues 사용 중이라 추가 비용 0.
 *
 * 채택 이유: Ecount SMTP relay가 외국/Cloudflare edge IP에서 535 거부.
 * 동일 자격증명을 한국 IP openssl 직접 시도하면 235 success 확인됨.
 * Admin UI에 노출되지 않은 백엔드 anti-abuse로 추정. CF native API로 우회.
 */

import type { Env } from '@supasignup/bg-core';

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;                // 평문 본문 (필수)
  html?: string;               // HTML 본문 (옵션)
  fromAddress?: string;        // default 'noreply@suparain.kr'
  replyTo?: string;            // default 'help@suparain.com'
}

export type SendEmailResult = { ok: true } | { ok: false; error: string };

const DEFAULT_FROM_ADDRESS = 'noreply@mail.suparain.kr';
const DEFAULT_REPLY_TO = 'help@suparain.com';

export async function sendEmail(env: Env, opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!env.EMAIL) {
    return { ok: false, error: 'email_binding_missing' };
  }
  // SMTP_USER/PASS 디버그 로그는 Ecount → CF Email Sending 전환 시 제거됨 (2026-05-04).
  const from = opts.fromAddress ?? DEFAULT_FROM_ADDRESS;
  const replyTo = opts.replyTo ?? DEFAULT_REPLY_TO;
  try {
    await env.EMAIL.send({
      from,
      to: opts.to,
      reply_to: replyTo,    // 별도 필드 (custom Reply-To 헤더는 화이트리스트 거부됨)
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[email] send failed:', msg);
    return { ok: false, error: msg };
  }
}

// ─── AI 주간 브리핑 발송 ─────────────────────────────────────
// scheduled.ts generateBriefingForShop 끝에서 호출. 발송 토글·이메일 채워짐 검증 후 호출.

export interface BriefingEmailInput {
  toEmail: string;
  shopName: string;
  adminName: string | null;       // 인사말 (없으면 "운영자" 기본)
  headline: string | null;        // AI 한 줄 요약
  performance: string;            // 지난주 성과 본문
  briefingUrl: string;            // /dashboard/ai-briefing 링크
  weekRange: string;              // "5월 4일 ~ 5월 10일"
}

export async function sendBriefingEmail(
  env: Env,
  input: BriefingEmailInput,
): Promise<SendEmailResult> {
  const greeting = input.adminName ? `${input.adminName} 님` : '운영자 님';
  const headlineLine = input.headline?.trim() || `${input.shopName} 의 이번 주 성과를 확인해 보세요.`;

  // 평문 (HTML 미지원 환경 fallback)
  const text = [
    `${greeting}, 안녕하세요.`,
    `번개가입 AI 주간 브리핑입니다 (${input.weekRange}).`,
    '',
    `📌 ${headlineLine}`,
    '',
    '────── 지난주 성과 ──────',
    input.performance,
    '',
    `자세한 전략·추천 액션·AI 인사이트는 대시보드에서 확인하세요:`,
    input.briefingUrl,
    '',
    '— 번개가입',
    '회신: help@suparain.com',
  ].join('\n');

  // HTML — inline CSS, 모바일/데스크탑 호환, Gmail/Naver 모두 정상 렌더 검증된 단순 마크업
  const performanceHtml = escapeHtml(input.performance).replace(/\n/g, '<br>');
  const html = `<!DOCTYPE html>
<html lang="ko">
<body style="margin:0;padding:0;background:#f5f6f8;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1e293b">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;padding:32px 24px">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;color:#6366f1;text-transform:uppercase;margin-bottom:8px">⚡ 번개가입 AI 브리핑</div>
    <div style="font-size:13px;color:#94a3b8;margin-bottom:24px">${escapeHtml(input.weekRange)}</div>

    <div style="font-size:14px;color:#475569;margin-bottom:8px">${escapeHtml(greeting)}, 안녕하세요.</div>
    <div style="font-size:18px;font-weight:600;line-height:1.5;color:#1e293b;margin-bottom:24px;padding:16px;background:linear-gradient(135deg,#eff6ff,#f5f3ff);border-left:3px solid #6366f1;border-radius:6px">
      📌 ${escapeHtml(headlineLine)}
    </div>

    <div style="font-size:13px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:8px">지난주 성과</div>
    <div style="font-size:14px;line-height:1.7;color:#374151;margin-bottom:28px;padding:16px;background:#f8fafc;border-radius:8px;white-space:pre-wrap">${performanceHtml}</div>

    <div style="text-align:center;margin-bottom:32px">
      <a href="${escapeAttr(input.briefingUrl)}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:8px">
        대시보드에서 자세히 보기 →
      </a>
    </div>

    <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#94a3b8;line-height:1.6">
      이 메일은 번개가입 AI 주간 브리핑 자동 발송입니다. 매주 월요일 오전 9시에 발송됩니다.<br>
      회신은 <a href="mailto:help@suparain.com" style="color:#6366f1">help@suparain.com</a> 으로 부탁드립니다.<br>
      수신 거부: 대시보드 → AI 브리핑 → "이메일" 토글 OFF
    </div>
  </div>
</body>
</html>`;

  return sendEmail(env, {
    to: input.toEmail,
    subject: `[번개가입] 이번 주 AI 브리핑 — ${input.shopName}`,
    text,
    html,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
