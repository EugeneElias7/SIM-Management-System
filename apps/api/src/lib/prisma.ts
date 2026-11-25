import { PrismaClient } from '@prisma/client';
import { env, isProduction, isTest } from '../config/env.js';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction || isTest ? ['error'] : ['warn', 'error'],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
