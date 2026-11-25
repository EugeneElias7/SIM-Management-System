import { Prisma } from '@prisma/client';
import type {
  EmailConfigDto,
  NotificationDto,
  NotificationSettingsDto,
  NotificationSettingsInput,
  NotificationStats,
  Paginated,
} from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound, serviceUnavailable } from '../../lib/errors.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { mapNotification, type NotificationWithRelations } from '../../lib/mappers.js';
import { recordActivity } from '../../lib/audit.js';
import type { ActorContext } from '../sims/sim.service.js';
import { getEmailConfig, sendEmail } from '../../services/email/mailer.js';
import { renderTestEmail } from '../../services/email/templates.js';
import { env } from '../../config/env.js';
import { getOrCreateNotificationSettings } from '../../jobs/expiry-scan.js';
import { enqueueEmailSend, enqueueExpiryScan } from '../../queues/index.js';

function toSettingsDto(settings: Awaited<ReturnType<typeof getOrCreateNotificationSettings>>): NotificationSettingsDto {
  return {
    enabled: settings.enabled,
    reminderDaysBefore: settings.reminderDaysBefore,
    notifyOnExpiry: settings.notifyOnExpiry,
    postExpiryWeekly: settings.postExpiryWeekly,
    postExpiryIntervalDays: settings.postExpiryIntervalDays,
    recipients: settings.recipients,
    ccEmails: settings.ccEmails,
    sendHour: settings.sendHour,
    timezone: settings.timezone,
    lastScanAt: settings.lastScanAt?.toISOString() ?? null,
    updatedAt: settings.updatedAt.toISOString(),
  };
}

export async function getSettings(): Promise<NotificationSettingsDto> {
  return toSettingsDto(await getOrCreateNotificationSettings());
}

export async function updateSettings(
  input: NotificationSettingsInput,
  actor: ActorContext,
): Promise<NotificationSettingsDto> {
  const reminderDays = [...new Set(input.reminderDaysBefore)].sort((a, b) => b - a);
  const recipients = [...new Set(input.recipients.map((email) => email.toLowerCase()))];
  const ccEmails = [
    ...new Set(input.ccEmails.map((email) => email.toLowerCase()).filter((email) => !recipients.includes(email))),
  ];

  const settings = await prisma.notificationSetting.upsert({
    where: { id: 'global' },
    update: {
      enabled: input.enabled,
      reminderDaysBefore: reminderDays,
      notifyOnExpiry: input.notifyOnExpiry,
      postExpiryWeekly: input.postExpiryWeekly,
      postExpiryIntervalDays: input.postExpiryIntervalDays,
      recipients,
      ccEmails,
      updatedById: actor.userId,
    },
    create: {
      id: 'global',
      enabled: input.enabled,
      reminderDaysBefore: reminderDays,
      notifyOnExpiry: input.notifyOnExpiry,
      postExpiryWeekly: input.postExpiryWeekly,
      postExpiryIntervalDays: input.postExpiryIntervalDays,
      recipients,
      ccEmails,
      sendHour: 9,
      timezone: 'Asia/Kolkata',
      updatedById: actor.userId,
    },
  });

  await recordActivity(prisma, {
    ...actor,
    action: 'NOTIFICATION_SETTINGS_UPDATED',
    entityType: 'SYSTEM',
    description: 'Notification reminder settings were updated.',
    metadata: {
      enabled: input.enabled,
      reminderDaysBefore: reminderDays,
      notifyOnExpiry: input.notifyOnExpiry,
      postExpiryWeekly: input.postExpiryWeekly,
    },
  });

  return toSettingsDto(settings);
}

export async function listNotifications(input: {
  page: number;
  pageSize: number;
  status?: 'PENDING' | 'QUEUED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';
  reminderType?: 'BEFORE_EXPIRY' | 'ON_EXPIRY' | 'POST_EXPIRY';
  search?: string;
}): Promise<Paginated<NotificationDto>> {
  const where: Prisma.NotificationWhereInput = {};
  if (input.status) where.status = input.status;
  if (input.reminderType) where.reminderType = input.reminderType;
  if (input.search) {
    where.OR = [
      { recipientEmail: { contains: input.search, mode: 'insensitive' } },
      { subject: { contains: input.search, mode: 'insensitive' } },
      { sim: { internalId: { contains: input.search, mode: 'insensitive' } } },
      { sim: { mobileNumber: { contains: input.search, mode: 'insensitive' } } },
      { sim: { company: { name: { contains: input.search, mode: 'insensitive' } } } },
    ];
  }

  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      include: { sim: { include: { company: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map((row) => mapNotification(row as NotificationWithRelations)),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function getNotification(id: string): Promise<NotificationDto> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: { sim: { include: { company: true } } },
  });
  if (!notification) throw notFound('Notification not found.');
  return mapNotification(notification as NotificationWithRelations);
}

export async function getStats(): Promise<NotificationStats> {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const groups = await prisma.notification.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const sentThisMonth = await prisma.notification.count({
    where: { status: 'SENT', sentAt: { gte: monthStart } },
  });
  const byStatus = Object.fromEntries(groups.map((group) => [group.status, group._count._all]));
  const pending =
    (byStatus.PENDING ?? 0) + (byStatus.QUEUED ?? 0) + (byStatus.SENDING ?? 0);
  return {
    sent: byStatus.SENT ?? 0,
    failed: byStatus.FAILED ?? 0,
    pending,
    cancelled: byStatus.CANCELLED ?? 0,
    sentThisMonth,
  };
}

export async function retryNotification(id: string, actor: ActorContext): Promise<NotificationDto> {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: { sim: true },
  });
  if (!notification) throw notFound('Notification not found.');
  if (notification.status === 'SENT') {
    throw conflict('This notification has already been delivered.');
  }
  if (notification.status === 'CANCELLED') {
    throw conflict('Cancelled reminders cannot be retried.');
  }
  if (!notification.sim || notification.sim.archivedAt) {
    throw conflict('The related SIM is archived or unavailable.');
  }
  if (
    !notification.sim.expiryDate ||
    notification.sim.expiryDate.toISOString().slice(0, 10) !==
      notification.expiryCycle.toISOString().slice(0, 10)
  ) {
    await prisma.notification.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        lastError: 'Cancelled because the SIM expiry cycle has changed.',
        nextRetryAt: null,
      },
    });
    throw conflict('This reminder is obsolete because the SIM expiry date has changed.');
  }

  const previousAttempts = notification.attempts;
  await prisma.notification.update({
    where: { id },
    data: {
      status: 'QUEUED',
      attempts: 0,
      maxAttempts: Math.max(notification.maxAttempts, 5),
      nextRetryAt: null,
      lastError: null,
    },
  });

  let queued = false;
  try {
    queued = await enqueueEmailSend(id);
  } catch {
    queued = false;
  }

  if (!queued) {
    await prisma.notification.update({
      where: { id },
      data: {
        status: 'FAILED',
        lastError: 'The background email queue is unavailable. The scheduled scan will retry.',
      },
    });
    throw serviceUnavailable(
      'The background email queue is currently unavailable. Please try again shortly.',
    );
  }

  await recordActivity(prisma, {
    ...actor,
    action: 'NOTIFICATION_RETRIED',
    entityType: 'NOTIFICATION',
    entityId: id,
    simId: notification.simId,
    companyId: notification.sim.companyId,
    description: `Notification delivery was manually retried (previous attempts: ${previousAttempts}).`,
  });

  return getNotification(id);
}

export async function runScanNow(actor: ActorContext): Promise<void> {
  let queued = false;
  try {
    queued = await enqueueExpiryScan();
  } catch {
    queued = false;
  }
  if (!queued) {
    throw serviceUnavailable(
      'The notification worker queue is unavailable. Check the worker service and try again.',
    );
  }
  await recordActivity(prisma, {
    ...actor,
    action: 'NOTIFICATION_SCAN_REQUESTED',
    entityType: 'SYSTEM',
    description: 'A manual expiry scan was requested.',
  });
}

export async function sendTestEmail(to: string, actor: ActorContext) {
  const content = renderTestEmail({ appUrl: env.APP_URL });
  const result = await sendEmail({
    to,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  await recordActivity(prisma, {
    ...actor,
    action: 'EMAIL_TEST_SENT',
    entityType: 'SYSTEM',
    description: `Test email sent to ${to}.`,
    metadata: { transport: result.transport },
  });
  return { messageId: result.messageId, transport: result.transport };
}

export function emailConfig(): EmailConfigDto {
  return getEmailConfig();
}
