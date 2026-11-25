import { Prisma } from '@prisma/client';
import type { Paginated, SimListItem, SimRenewalDto } from '@san/shared';
import { EXPIRY_WARNING_DAYS } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { addDays, fromDbDate, today, toDbDate } from '../../lib/dates.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { mapRenewal, mapSim, type SimWithRelations } from '../../lib/mappers.js';

const include = {
  company: true,
  machine: true,
  contact: true,
} satisfies Prisma.SimInclude;

const activeValidityWhere: Prisma.SimWhereInput = {
  archivedAt: null,
  operationalStatus: { not: 'DECOMMISSIONED' },
};

export async function getExpirySummary() {
  const current = today();
  const [expired, within7, within15, within30, within60] = await Promise.all([
    prisma.sim.count({
      where: { ...activeValidityWhere, expiryDate: { lt: toDbDate(current)! } },
    }),
    prisma.sim.count({
      where: {
        ...activeValidityWhere,
        expiryDate: { gte: toDbDate(current)!, lte: toDbDate(addDays(current, 7))! },
      },
    }),
    prisma.sim.count({
      where: {
        ...activeValidityWhere,
        expiryDate: { gte: toDbDate(current)!, lte: toDbDate(addDays(current, 15))! },
      },
    }),
    prisma.sim.count({
      where: {
        ...activeValidityWhere,
        expiryDate: { gte: toDbDate(current)!, lte: toDbDate(addDays(current, 30))! },
      },
    }),
    prisma.sim.count({
      where: {
        ...activeValidityWhere,
        expiryDate: { gte: toDbDate(current)!, lte: toDbDate(addDays(current, 60))! },
      },
    }),
  ]);
  return { expired, within7, within15, within30, within60 };
}

export async function listUpcoming(input: {
  days: number;
  page: number;
  pageSize: number;
}): Promise<Paginated<SimListItem>> {
  const current = today();
  const limit = Math.min(Math.max(input.days, 1), 365);
  const where: Prisma.SimWhereInput = {
    ...activeValidityWhere,
    expiryDate: { gte: toDbDate(current)!, lte: toDbDate(addDays(current, limit))! },
  };
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.sim.count({ where }),
    prisma.sim.findMany({
      where,
      include,
      orderBy: { expiryDate: 'asc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map((sim) => mapSim(sim as SimWithRelations)),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function listExpired(input: {
  page: number;
  pageSize: number;
}): Promise<Paginated<SimListItem>> {
  const where: Prisma.SimWhereInput = {
    ...activeValidityWhere,
    expiryDate: { lt: toDbDate(today())! },
  };
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.sim.count({ where }),
    prisma.sim.findMany({
      where,
      include,
      orderBy: { expiryDate: 'asc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map((sim) => mapSim(sim as SimWithRelations)),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function listRenewals(input: {
  page: number;
  pageSize: number;
  search?: string;
  from?: string;
  to?: string;
  companyId?: string;
}): Promise<Paginated<SimRenewalDto>> {
  const where: Prisma.SimRenewalWhereInput = {};
  if (input.from) where.renewalDate = { ...(where.renewalDate as object), gte: toDbDate(input.from)! };
  if (input.to) {
    where.renewalDate = {
      ...(where.renewalDate as object),
      lte: toDbDate(input.to)!,
    };
  }
  if (input.companyId) where.companyId = input.companyId;
  if (input.search) {
    where.OR = [
      { referenceNumber: { contains: input.search, mode: 'insensitive' } },
      { sim: { internalId: { contains: input.search, mode: 'insensitive' } } },
      { sim: { mobileNumber: { contains: input.search, mode: 'insensitive' } } },
      { company: { name: { contains: input.search, mode: 'insensitive' } } },
    ];
  }
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.simRenewal.count({ where }),
    prisma.simRenewal.findMany({
      where,
      include: {
        sim: { select: { id: true, internalId: true, mobileNumber: true } },
        company: { select: { id: true, name: true } },
        renewedBy: true,
      },
      orderBy: [{ renewalDate: 'desc' }, { createdAt: 'desc' }],
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map((row) => mapRenewal({ ...row, sim: row.sim, company: row.company })),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function getRenewalStats() {
  const current = today();
  const monthStart = new Date(`${current.slice(0, 7)}-01T00:00:00.000Z`);
  const [total, thisMonth, last30] = await Promise.all([
    prisma.simRenewal.count(),
    prisma.simRenewal.count({ where: { renewalDate: { gte: monthStart } } }),
    prisma.simRenewal.count({
      where: { renewalDate: { gte: toDbDate(addDays(current, -30))! } },
    }),
  ]);
  return { total, thisMonth, last30 };
}

export { EXPIRY_WARNING_DAYS, fromDbDate };
