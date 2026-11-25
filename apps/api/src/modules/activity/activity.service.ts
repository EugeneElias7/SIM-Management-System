import { Prisma } from '@prisma/client';
import type { ActivityDto, Paginated } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { mapActivity } from '../../lib/mappers.js';

export async function listActivity(input: {
  page: number;
  pageSize: number;
  entityType?: string;
  companyId?: string;
  search?: string;
}): Promise<Paginated<ActivityDto>> {
  const where: Prisma.ActivityLogWhereInput = {};
  if (input.entityType) where.entityType = input.entityType;
  if (input.companyId) where.companyId = input.companyId;
  if (input.search) {
    where.OR = [
      { description: { contains: input.search, mode: 'insensitive' } },
      { action: { contains: input.search, mode: 'insensitive' } },
      { user: { firstName: { contains: input.search, mode: 'insensitive' } } },
      { user: { lastName: { contains: input.search, mode: 'insensitive' } } },
    ];
  }
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map(mapActivity),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}
