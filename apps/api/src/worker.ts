import type PgBoss from 'pg-boss';
import { todayDateOnly } from '@san/shared';
import { env, validateEnv } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import {
  createBoss,
  ensureQueues,
  QUEUE_EMAIL_SEND,
  QUEUE_EXPIRY_SCAN,
} from './queues/index.js';
import { runExpiryScan, getOrCreateNotificationSettings } from './jobs/expiry-scan.js';
import { deliverNotification } from './jobs/notification-sender.js';

async function main(): Promise<void> {
  validateEnv();
  if (!env.QUEUE_ENABLED) {
    logger.warn('QUEUE_ENABLED=false — the worker will not process any jobs.');
    return;
  }

  const boss = createBoss();
  await boss.start();
  await ensureQueues(boss);

  await boss.work<{ notificationId: string }>(
    QUEUE_EMAIL_SEND,
    { batchSize: 1, pollingIntervalSeconds: 2 },
    async (jobs) => {
      for (const job of jobs) {
        const notificationId = job.data?.notificationId;
        if (!notificationId) {
          logger.warn({ jobId: job.id }, 'Email job is missing a notificationId');
          continue;
        }
        // Throwing lets pg-boss apply the queue retry policy.
        await deliverNotification(notificationId);
      }
    },
  );

  await boss.work<Record<string, never>>(
    QUEUE_EXPIRY_SCAN,
    { batchSize: 1, pollingIntervalSeconds: 5 },
    async () => {
      await runExpiryScan();
    },
  );

  await boss.schedule(QUEUE_EXPIRY_SCAN, env.EXPIRY_SCAN_CRON, {}, { tz: env.EXPIRY_SCAN_TZ });
  logger.info(
    { cron: env.EXPIRY_SCAN_CRON, timezone: env.EXPIRY_SCAN_TZ },
    'Expiry scan schedule registered',
  );

  // Catch-up: if the worker was down at 09:00, run a scan on startup once per day.
  const settings = await getOrCreateNotificationSettings();
  const today = todayDateOnly(new Date(), settings.timezone);
  const lastScanDate = settings.lastScanAt
    ? todayDateOnly(settings.lastScanAt, settings.timezone)
    : null;
  if (settings.enabled && lastScanDate !== today) {
    logger.info({ lastScanDate, today }, 'No scan recorded today; queueing catch-up scan');
    await boss.send(QUEUE_EXPIRY_SCAN, {}, { singletonKey: `catch-up-${today}` });
  }

  let stopping = false;
  const shutdown = async (signal: string) => {
    if (stopping) return;
    stopping = true;
    logger.info({ signal }, 'Shutting down worker');
    const force = setTimeout(() => {
      logger.warn('Forcing worker shutdown after timeout');
      process.exit(1);
    }, 20_000);
    force.unref();
    try {
      await boss.stop({ graceful: true, wait: true, timeout: 15_000 });
      await prisma.$disconnect();
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Worker shutdown failed');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection in worker');
  });
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception in worker');
    void shutdown('uncaughtException');
  });

  logger.info('SAN SOLUTION worker is ready');
}

// Keep a type-only reference so the PgBoss import is not dropped by the bundler.
export type WorkerBoss = PgBoss;

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start worker');
  process.exit(1);
});
