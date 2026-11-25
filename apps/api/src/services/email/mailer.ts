import nodemailer, { type Transporter } from 'nodemailer';
import type { EmailConfigDto } from '@san/shared';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';

export interface SendEmailInput {
  to: string;
  cc?: string[];
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  messageId: string;
  transport: 'smtp' | 'log';
}

let transporter: Transporter | null = null;

function createSmtpTransport(): Transporter {
  if (!env.SMTP_HOST || !env.SMTP_FROM_EMAIL) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_FROM_EMAIL and related environment variables.',
    );
  }
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 15_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
  });
}

export function getEmailConfig(): EmailConfigDto {
  return {
    configured: env.EMAIL_TRANSPORT === 'log' || Boolean(env.SMTP_HOST && env.SMTP_FROM_EMAIL),
    transport: env.EMAIL_TRANSPORT,
    host: env.SMTP_HOST || null,
    port: env.SMTP_HOST ? env.SMTP_PORT : null,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER || null,
    fromName: env.SMTP_FROM_NAME,
    fromEmail: env.SMTP_FROM_EMAIL || null,
    replyTo: env.SMTP_REPLY_TO || null,
  };
}

export async function verifySmtpConnection(): Promise<void> {
  if (env.EMAIL_TRANSPORT === 'log') return;
  if (!transporter) transporter = createSmtpTransport();
  await transporter.verify();
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (env.EMAIL_TRANSPORT === 'log') {
    const messageId = `dev-log-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    logger.info(
      { to: input.to, cc: input.cc, subject: input.subject, transport: 'log', messageId },
      'DEV EMAIL (EMAIL_TRANSPORT=log) — no message was sent over SMTP',
    );
    return { messageId, transport: 'log' };
  }

  if (!transporter) transporter = createSmtpTransport();
  const result = await transporter.sendMail({
    from: `"${env.SMTP_FROM_NAME}" <${env.SMTP_FROM_EMAIL}>`,
    to: input.to,
    cc: input.cc && input.cc.length > 0 ? input.cc.join(', ') : undefined,
    replyTo: env.SMTP_REPLY_TO || undefined,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  return { messageId: result.messageId, transport: 'smtp' };
}
