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
  const from = opts.fromAddress ?? DEFAULT_FROM_ADDRESS;
  const replyTo = opts.replyTo ?? DEFAULT_REPLY_TO;
  try {
    await env.EMAIL.send({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      headers: { 'Reply-To': replyTo },
    });
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[email] send failed:', msg);
    return { ok: false, error: msg };
  }
}
