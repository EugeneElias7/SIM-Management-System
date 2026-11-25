import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { prisma } from './prisma.js';

export interface AuditEvent {
  userId?: string | null;
  companyId?: string | null;
  simId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

type DbClient = Prisma.TransactionClient | typeof prisma;

export async function recordActivity(db: DbClient, event: AuditEvent): Promise<void> {
  await db.activityLog.create({
    data: {
      userId: event.userId ?? null,
      companyId: event.companyId ?? null,
      simId: event.simId ?? null,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId ?? null,
      description: event.description,
      metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent?.slice(0, 500) ?? null,
    },
  });
}

export function requestAuditContext(req: Request): {
  userId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
} {
  return {
    userId: req.auth?.user.id ?? null,
    ipAddress: req.ip ?? null,
    userAgent: req.get('user-agent') ?? null,
  };
}
