import PgBoss from 'pg-boss';
import { env, isTest } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const QUEUE_EXPIRY_SCAN = 'expiry-scan';
export const QUEUE_EMAIL_SEND = 'email-send';

let producer: PgBoss | null = null;
let starting: Promise<PgBoss> | null = null;

export function createBoss(): PgBoss {
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: 'pgboss',
    application_name: 'san-sim-worker',
    supervise: true,
    schedule: true,
    migrate: true,
    max: 5,
  });
  boss.on('error', (error) => {
    logger.error({ err: error }, 'pg-boss error');
  });
  return boss;
}

export async function ensureQueues(boss: PgBoss): Promise<void> {
  const queues = await boss.getQueues();
  const names = new Set(queues.map((queue) => queue.name));

  if (!names.has(QUEUE_EXPIRY_SCAN)) {
    await boss.createQueue(QUEUE_EXPIRY_SCAN, {
      name: QUEUE_EXPIRY_SCAN,
      retryLimit: 1,
      retryDelay: 300,
      retryBackoff: true,
      expireInMinutes: 30,
      retentionMinutes: 60 * 24 * 30,
    });
  }
  if (!names.has(QUEUE_EMAIL_SEND)) {
    await boss.createQueue(QUEUE_EMAIL_SEND, {
      name: QUEUE_EMAIL_SEND,
      retryLimit: 4,
      retryDelay: 120,
      retryBackoff: true,
      expireInMinutes: 15,
      retentionMinutes: 60 * 24 * 30,
    });
  }
}

async function startProducer(): Promise<PgBoss> {
  const boss = new PgBoss({
    connectionString: env.DATABASE_URL,
    schema: 'pgboss',
    application_name: 'san-sim-api-producer',
    supervise: false,
    schedule: false,
    migrate: true,
    max: 3,
  });
  boss.on('error', (error) => {
    logger.error({ err: error }, 'pg-boss producer error');
  });
  await boss.start();
  await ensureQueues(boss);
  return boss;
}

async function getProducer(): Promise<PgBoss> {
  if (!env.QUEUE_ENABLED || isTest) {
    throw new Error('The background queue is disabled.');
  }
  if (producer) return producer;
  if (!starting) {
    starting = startProducer().then((boss) => {
      producer = boss;
      starting = null;
      return boss;
    });
  }
  return starting;
}

export async function enqueueEmailSend(notificationId: string): Promise<boolean> {
  const boss = await getProducer();
  const jobId = await boss.send(
    QUEUE_EMAIL_SEND,
    { notificationId },
    {
      singletonKey: `notification:${notificationId}`,
      retryLimit: 4,
      retryDelay: 120,
      retryBackoff: true,
      expireInMinutes: 15,
    },
  );
  return Boolean(jobId);
}

export async function enqueueExpiryScan(): Promise<boolean> {
  const boss = await getProducer();
  const jobId = await boss.send(
    QUEUE_EXPIRY_SCAN,
    {},
    {
      singletonKey: 'manual-expiry-scan',
      singletonMinutes: 5,
      retryLimit: 1,
    },
  );
  return Boolean(jobId);
}

export async function stopProducer(): Promise<void> {
  if (producer) {
    const instance = producer;
    producer = null;
    await instance.stop({ graceful: false });
  }
}
