import type { ReminderType } from '@san/shared';
import { daysUntilDateOnly, humanDate } from '@san/shared';
import type { NotificationSetting } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { fromDbDate } from '../lib/dates.js';
import { recordActivity } from '../lib/audit.js';
import { logger } from '../lib/logger.js';
import { renderExpiryReminderEmail } from '../services/email/templates.js';
import { env } from '../config/env.js';
import { enqueueEmailSend } from '../queues/index.js';

export interface ReminderCandidate {
  reminderType: ReminderType;
  reminderDays: number;
  bucket: number;
}

/**
 * Determine which reminder is currently due for an expiry cycle.
 *
 * Upcoming reminders use the nearest configured threshold that is still ahead
 * of (or equal to) today. This makes the engine resilient to a missed scan:
 * if the worker was down on day 30, it can still send the 30-day reminder on
 * day 29 instead of silently losing it.
 *
 * Post-expiry reminders are generated once per weekly bucket. Buckets use
 * floor(daysSinceExpiry / interval), so a late worker still produces one
 * reminder per elapsed interval rather than duplicates on consecutive days.
 */
export function computeReminderCandidates(
  daysRemaining: number,
  settings: Pick<
    NotificationSetting,
    'reminderDaysBefore' | 'notifyOnExpiry' | 'postExpiryWeekly' | 'postExpiryIntervalDays'
  >,
): ReminderCandidate[] {
  if (daysRemaining > 0) {
    const upcoming = [...settings.reminderDaysBefore].sort((a, b) => a - b);
    const threshold = upcoming.find((days) => days >= daysRemaining);
    if (!threshold) return [];
    return [{ reminderType: 'BEFORE_EXPIRY', reminderDays: threshold, bucket: 0 }];
  }

  const candidates: ReminderCandidate[] = [];
  if (settings.notifyOnExpiry) {
    candidates.push({ reminderType: 'ON_EXPIRY', reminderDays: 0, bucket: 0 });
  }

  if (settings.postExpiryWeekly && daysRemaining < 0) {
    const interval = Math.max(1, settings.postExpiryIntervalDays);
    const bucket = Math.floor(Math.abs(daysRemaining) / interval);
    if (bucket >= 1) {
      candidates.push({
        reminderType: 'POST_EXPIRY',
        reminderDays: interval * bucket,
        bucket,
      });
    }
  }

  return candidates;
}

export function buildIdempotencyKey(input: {
  simId: string;
  expiryDate: string;
  reminderType: ReminderType;
  reminderDays: number;
  channel?: string;
}): string {
  return [
    input.simId,
    input.expiryDate,
    input.reminderType,
    input.reminderDays,
    input.channel ?? 'EMAIL',
  ].join(':');
}

function uniqueEmails(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)).map((value) => value.toLowerCase()))];
}

export async function getOrCreateNotificationSettings(): Promise<NotificationSetting> {
  return prisma.notificationSetting.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      enabled: true,
      reminderDaysBefore: [30, 15, 7],
      notifyOnExpiry: true,
      postExpiryWeekly: true,
      postExpiryIntervalDays: 7,
      recipients: [],
      ccEmails: [],
      sendHour: 9,
      timezone: 'Asia/Kolkata',
    },
  });
}

export interface ScanResult {
  created: number;
  skippedExisting: number;
  missingRecipients: number;
  retried: number;
  failed: number;
  scannedSims: number;
}

export interface ScanOptions {
  now?: Date;
  enqueue?: (notificationId: string) => Promise<boolean>;
}

export async function runExpiryScan(options: ScanOptions = {}): Promise<ScanResult> {
  const now = options.now ?? new Date();
  const settings = await getOrCreateNotificationSettings();
  const result: ScanResult = {
    created: 0,
    skippedExisting: 0,
    missingRecipients: 0,
    retried: 0,
    failed: 0,
    scannedSims: 0,
  };

  if (!settings.enabled) {
    logger.info('Expiry scan skipped because notifications are disabled.');
    return result;
  }

  const enqueue = options.enqueue ?? enqueueEmailSend;

  const sims = await prisma.sim.findMany({
    where: {
      archivedAt: null,
      expiryDate: { not: null },
      operationalStatus: { not: 'DECOMMISSIONED' },
    },
    include: {
      company: {
        include: {
          contacts: {
            where: { archivedAt: null },
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      },
      machine: true,
    },
  });

  for (const sim of sims) {
    result.scannedSims += 1;
    const expiryDate = fromDbDate(sim.expiryDate);
    if (!expiryDate) continue;

    const days = daysUntilDateOnly(expiryDate, now, settings.timezone) ?? 0;
    const candidates = computeReminderCandidates(days, settings);
    if (candidates.length === 0) continue;

    const primaryContact = sim.company?.contacts.find((contact) => contact.email);
    const fallbackRecipients = uniqueEmails(settings.recipients);
    const to =
      primaryContact?.email?.toLowerCase() ??
      sim.company?.email?.toLowerCase() ??
      fallbackRecipients[0] ??
      null;
    if (!to) {
      result.missingRecipients += 1;
      logger.warn(
        { simId: sim.id, internalId: sim.internalId },
        'Skipped expiry reminder because no recipient email is configured.',
      );
      continue;
    }

    const cc = uniqueEmails([...settings.recipients, ...settings.ccEmails]).filter(
      (email) => email !== to,
    );

    for (const candidate of candidates) {
      const idempotencyKey = buildIdempotencyKey({
        simId: sim.id,
        expiryDate,
        reminderType: candidate.reminderType,
        reminderDays: candidate.reminderDays,
      });

      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey },
        select: { id: true },
      });
      if (existing) {
        result.skippedExisting += 1;
        continue;
      }

      const emailContent = renderExpiryReminderEmail({
        recipientName: primaryContact?.fullName ?? null,
        companyName: sim.company?.name ?? null,
        simId: sim.id,
        internalId: sim.internalId,
        mobileNumber: sim.mobileNumber,
        provider: sim.provider,
        machineName: sim.machine?.name ?? null,
        expiryDate: humanDate(expiryDate),
        daysRemaining: days,
        reminderType: candidate.reminderType,
        appUrl: env.APP_URL,
      });

      try {
        const notification = await prisma.notification.create({
          data: {
            simId: sim.id,
            reminderType: candidate.reminderType,
            reminderDays: candidate.reminderDays,
            expiryCycle: sim.expiryDate!,
            idempotencyKey,
            recipientEmail: to,
            ccEmails: cc,
            subject: emailContent.subject,
            status: 'PENDING',
            scheduledFor: now,
            maxAttempts: 5,
          },
        });
        result.created += 1;

        try {
          const queued = await enqueue(notification.id);
          if (queued) {
            await prisma.notification.update({
              where: { id: notification.id },
              data: { status: 'QUEUED' },
            });
          }
        } catch (error) {
          logger.warn(
            { err: error, notificationId: notification.id },
            'Notification created but could not be queued; it will be retried.',
          );
        }
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          (error as { code?: string }).code === 'P2002'
        ) {
          result.skippedExisting += 1;
        } else {
          result.failed += 1;
          logger.error({ err: error, simId: sim.id }, 'Failed to create notification record');
        }
      }
    }
  }

  // Recover failed or orphaned notifications with controlled retry limits.
  const retryCutoff = new Date(now.getTime() - 15 * 60 * 1000);
  const retryCandidates = await prisma.notification.findMany({
    where: {
      OR: [
        { status: 'FAILED', nextRetryAt: { lte: now } },
        { status: 'PENDING', createdAt: { lte: retryCutoff } },
      ],
    },
    take: 100,
  });
  const retryable = retryCandidates.filter(
    (notification) => notification.attempts < notification.maxAttempts,
  );

  for (const notification of retryable) {
    try {
      const queued = await enqueue(notification.id);
      if (queued) {
        await prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'QUEUED', nextRetryAt: null },
        });
        result.retried += 1;
      }
    } catch (error) {
      logger.warn({ err: error, notificationId: notification.id }, 'Failed to re-queue notification');
    }
  }

  await prisma.notificationSetting.update({
    where: { id: 'global' },
    data: { lastScanAt: now },
  });

  if (result.created > 0 || result.retried > 0) {
    await recordActivity(prisma, {
      action: 'NOTIFICATION_SCAN_COMPLETED',
      entityType: 'SYSTEM',
      description: `Expiry scan completed: ${result.created} reminder(s) created, ${result.retried} re-queued.`,
      metadata: { ...result },
    });
  }

  logger.info(result, 'Expiry scan completed');
  return result;
}
