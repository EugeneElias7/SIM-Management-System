import { prisma } from '../lib/prisma.js';
import { fromDbDate, daysRemaining } from '../lib/dates.js';
import { humanDate } from '@san/shared';
import { renderExpiryReminderEmail } from '../services/email/templates.js';
import { sendEmail } from '../services/email/mailer.js';
import { logger } from '../lib/logger.js';
import { recordActivity } from '../lib/audit.js';
import { env } from '../config/env.js';
import { sendTelegramMessage, isTelegramConfigured } from '../services/telegram.js';

export interface SendResult {
  status: 'sent' | 'skipped' | 'cancelled';
  attempts?: number;
}

const RETRY_BASE_MS = 5 * 60 * 1000;
const RETRY_MAX_MS = 6 * 60 * 60 * 1000;

function backoffDate(attempts: number): Date {
  return new Date(Date.now() + Math.min(RETRY_BASE_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS));
}

/**
 * Sends one notification email and persists every attempt. Failed sends are
 * re-thrown so pg-boss can retry with its configured exponential backoff.
 */
export async function deliverNotification(notificationId: string): Promise<SendResult> {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
    include: {
      sim: {
        include: {
          company: { include: { contacts: { where: { archivedAt: null } } } },
          machine: true,
        },
      },
    },
  });

  if (!notification) {
    logger.warn({ notificationId }, 'Notification job referenced a missing record.');
    return { status: 'skipped' };
  }
  if (notification.status === 'SENT' || notification.status === 'CANCELLED') {
    return { status: 'skipped' };
  }
  if (
    !notification.sim ||
    !notification.simId ||
    notification.sim.archivedAt ||
    !notification.sim.expiryDate ||
    fromDbDate(notification.sim.expiryDate) !== fromDbDate(notification.expiryCycle)
  ) {
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'CANCELLED',
        lastError: 'Cancelled because the SIM expiry cycle has changed or the SIM is archived.',
        nextRetryAt: null,
      },
    });
    await recordActivity(prisma, {
      action: 'NOTIFICATION_CANCELLED',
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      simId: notification.simId,
      companyId: notification.sim?.companyId ?? null,
      description: 'An outdated expiry reminder was cancelled automatically.',
    });
    return { status: 'cancelled' };
  }

  if (notification.attempts >= notification.maxAttempts) {
    if (notification.status !== 'FAILED') {
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: 'FAILED',
          lastError: notification.lastError ?? 'Maximum delivery attempts reached.',
          nextRetryAt: null,
        },
      });
    }
    return { status: 'skipped', attempts: notification.attempts };
  }

  const attempts = notification.attempts + 1;
  await prisma.notification.update({
    where: { id: notification.id },
    data: { status: 'SENDING', attempts, lastError: null },
  });

  const sim = notification.sim;
  const primaryContact = sim.company?.contacts.find((contact) => contact.email);
  const expiry = fromDbDate(sim.expiryDate)!;
  const remaining = daysRemaining(expiry) ?? notification.reminderDays;

  const content = renderExpiryReminderEmail({
    recipientName: primaryContact?.fullName ?? null,
    companyName: sim.company?.name ?? null,
    simId: sim.id,
    internalId: sim.internalId,
    mobileNumber: sim.mobileNumber,
    provider: sim.provider,
    machineName: sim.machine?.name ?? null,
    expiryDate: humanDate(expiry),
    daysRemaining: remaining,
    reminderType: notification.reminderType,
    appUrl: env.APP_URL,
  });

  try {
    let result: { messageId: string; transport: 'smtp' | 'log' | 'telegram' };
    if (notification.channel === 'TELEGRAM') {
      const telegramResult = await sendTelegramMessage(content.text);
      result = { messageId: telegramResult.messageId, transport: 'telegram' };
    } else {
      const emailResult = await sendEmail({
        to: notification.recipientEmail,
        cc: notification.ccEmails,
        subject: notification.subject || content.subject,
        html: content.html,
        text: content.text,
      });
      result = emailResult;
    }

    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        providerMessageId: result.messageId,
        lastError: null,
        nextRetryAt: null,
      },
    });
    await recordActivity(prisma, {
      action: 'NOTIFICATION_SENT',
      entityType: 'NOTIFICATION',
      entityId: notification.id,
      simId: notification.simId,
      companyId: sim.companyId,
      description: `Expiry reminder sent to ${notification.recipientEmail}.`,
      metadata: { transport: result.transport, reminderType: notification.reminderType },
    });
    logger.info(
      { notificationId, simId: sim.id, recipient: notification.recipientEmail, attempts },
      'Notification delivered',
    );
    return { status: 'sent', attempts };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email delivery error';
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        status: 'FAILED',
        lastError: message.slice(0, 1000),
        nextRetryAt: attempts < notification.maxAttempts ? backoffDate(attempts) : null,
      },
    });
    logger.error(
      { err: error, notificationId, attempts, maxAttempts: notification.maxAttempts },
      'Notification delivery failed',
    );
    throw error;
  }
}
