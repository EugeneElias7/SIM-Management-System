import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export interface TelegramSendResult {
  messageId: string;
  transport: 'telegram';
}

export function isTelegramConfigured(): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID);
}

export async function sendTelegramMessage(text: string): Promise<TelegramSendResult> {
  if (!isTelegramConfigured()) {
    throw new Error('Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.');
  }
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Telegram API error ${response.status}: ${body.slice(0, 300)}`);
  }
  const json = (await response.json()) as { ok: boolean; result?: { message_id: number } };
  if (!json.ok || !json.result) {
    throw new Error('Telegram API returned an unsuccessful response.');
  }
  logger.info({ chatId: env.TELEGRAM_CHAT_ID, messageId: json.result.message_id }, 'Telegram message sent');
  return { messageId: String(json.result.message_id), transport: 'telegram' };
}
