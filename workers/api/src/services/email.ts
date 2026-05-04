/**
 * Ecount SMTP relay 기반 운영자 발송 (AI 주간 브리핑 등).
 *
 * - 호스트: wsmtp.ecount.com:587 (STARTTLS) 또는 :465 (SSL)
 * - 인증: rockme@suparain.com / SMTP_PASS (wrangler secret)
 * - 발송자: help@suparain.com (Ecount alias)
 *
 * 주의:
 * - SMTP_USER / SMTP_PASS 미등록 환경에서는 즉시 fail (운영 안전망).
 * - 실패 시 throw 하지 않고 { ok: false, error } 반환 — caller 가 retry/skip 결정.
 * - DKIM/DMARC 미설정 상태이므로 SPF만으로 발송. Gmail/Naver 정상 분류는 도메인 SPF에 spf.ecounterp.com 포함되어야 함.
 */

import { WorkerMailer } from 'worker-mailer';
import type { Env } from '@supasignup/bg-core';

export interface SendEmailOptions {
  to: string;                  // 수신 이메일 (단일)
  subject: string;
  text: string;                // 평문 본문 (필수)
  html?: string;               // HTML 본문 (옵션)
  fromName?: string;           // 표시 이름 (default '번개가입')
  fromAddress?: string;        // From 주소 (default 'help@suparain.com')
  replyTo?: string;            // 회신 주소 (default fromAddress)
}

export type SendEmailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

const SMTP_HOST = 'wsmtp.ecount.com';
const SMTP_PORT = 587;
const DEFAULT_FROM_NAME = '번개가입';
const DEFAULT_FROM_ADDRESS = 'help@suparain.com';

export async function sendEmail(env: Env, opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!env.SMTP_USER || !env.SMTP_PASS) {
    return { ok: false, error: 'smtp_credentials_missing' };
  }

  const fromName = opts.fromName ?? DEFAULT_FROM_NAME;
  const fromAddress = opts.fromAddress ?? DEFAULT_FROM_ADDRESS;
  const replyTo = opts.replyTo ?? fromAddress;

  try {
    await WorkerMailer.send(
      {
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: false,
        startTls: true,
        credentials: {
          username: env.SMTP_USER,
          password: env.SMTP_PASS,
        },
        // Ecount는 AUTH PLAIN/LOGIN 둘 다 advertise 하지만 실제로 PLAIN 거부 (535).
        // worker-mailer 소스는 authType array 순서를 무시하고 PLAIN을 우선 시도하므로,
        // 'plain'을 빼서 LOGIN만 강제. (검증: openssl s_client AUTH LOGIN 성공)
        authType: 'login',
      },
      {
        from: { name: fromName, email: fromAddress },
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        reply: replyTo,
      },
    );
    return { ok: true };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error('[email] send failed:', msg);
    return { ok: false, error: msg };
  }
}
