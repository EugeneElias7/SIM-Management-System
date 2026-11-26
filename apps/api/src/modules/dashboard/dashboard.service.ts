import type { DashboardData, SimListItem } from '@san/shared';
import { EXPIRY_WARNING_DAYS } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { daysRemaining, fromDbDate, today, addDays } from '../../lib/dates.js';
import { mapActivity, mapSim, type SimWithRelations } from '../../lib/mappers.js';

const DISTRIBUTION_COLORS = {
  expired: '#DC2626',
  expiring: '#F59E0B',
  inStock: '#64748B',
  active: '#16A34A',
  suspended: '#7C3AED',
  faulty: '#EA580C',
  decommissioned: '#94A3B8',
};

export async function getDashboard(): Promise<DashboardData> {
  const current = today();
  const warningLimit = addDays(current, EXPIRY_WARNING_DAYS);
  const todayDate = new Date(`${current}T00:00:00.000Z`);
  const warningDate = new Date(`${warningLimit}T00:00:00.000Z`);

  const [sims, companies, machines, upcomingRows, activityRows, notificationSettings, failed, pending] =
    await Promise.all([
      prisma.sim.findMany({
        where: { archivedAt: null },
        select: {
          id: true,
          operationalStatus: true,
          expiryDate: true,
          companyId: true,
        },
      }),
      prisma.company.count({ where: { archivedAt: null } }),
      prisma.machine.count({ where: { archivedAt: null } }),
      prisma.sim.findMany({
        where: {
          archivedAt: null,
          expiryDate: { gte: todayDate },
          operationalStatus: { not: 'DECOMMISSIONED' },
        },
        include: { company: true, machine: true, contact: true, assignments: { where: { isActive: true }, take: 1, select: { assignedAt: true } } },
        orderBy: { expiryDate: 'asc' },
        take: 6,
      }),
      prisma.activityLog.findMany({
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      prisma.notificationSetting.findUnique({ where: { id: 'global' } }),
      prisma.notification.count({ where: { status: 'FAILED' } }),
      prisma.notification.count({ where: { status: { in: ['PENDING', 'QUEUED', 'SENDING'] } } }),
    ]);

  let activeSims = 0;
  let expiringSoon = 0;
  let expiredSims = 0;
  let inStock = 0;
  let assignedSims = 0;
  const distribution = {
    expired: 0,
    expiring: 0,
    inStock: 0,
    active: 0,
    suspended: 0,
    faulty: 0,
    decommissioned: 0,
  };

  for (const sim of sims) {
    const expiry = fromDbDate(sim.expiryDate);
    const days = daysRemaining(expiry);
    const validityExpired = days !== null && days < 0;
    const validityExpiring = days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;

    if (sim.operationalStatus === 'ACTIVE' && !validityExpired) activeSims += 1;
    if (validityExpiring && sim.operationalStatus !== 'DECOMMISSIONED') expiringSoon += 1;
    if (validityExpired && sim.operationalStatus !== 'DECOMMISSIONED') expiredSims += 1;
    if (sim.operationalStatus === 'IN_STOCK') inStock += 1;
    if (sim.companyId) assignedSims += 1;

    if (sim.operationalStatus === 'DECOMMISSIONED') {
      distribution.decommissioned += 1;
    } else if (validityExpired) {
      distribution.expired += 1;
    } else if (validityExpiring) {
      distribution.expiring += 1;
    } else if (sim.operationalStatus === 'IN_STOCK') {
      distribution.inStock += 1;
    } else if (sim.operationalStatus === 'SUSPENDED') {
      distribution.suspended += 1;
    } else if (sim.operationalStatus === 'FAULTY') {
      distribution.faulty += 1;
    } else {
      distribution.active += 1;
    }
  }

  const statusDistribution = [
    { key: 'active', label: 'Active', count: distribution.active, color: DISTRIBUTION_COLORS.active },
    { key: 'expiring', label: 'Expiring Soon', count: distribution.expiring, color: DISTRIBUTION_COLORS.expiring },
    { key: 'expired', label: 'Expired', count: distribution.expired, color: DISTRIBUTION_COLORS.expired },
    { key: 'inStock', label: 'In Stock', count: distribution.inStock, color: DISTRIBUTION_COLORS.inStock },
    { key: 'suspended', label: 'Suspended', count: distribution.suspended, color: DISTRIBUTION_COLORS.suspended },
    { key: 'faulty', label: 'Faulty', count: distribution.faulty, color: DISTRIBUTION_COLORS.faulty },
    {
      key: 'decommissioned',
      label: 'Decommissioned',
      count: distribution.decommissioned,
      color: DISTRIBUTION_COLORS.decommissioned,
    },
  ].filter((item) => item.count > 0);

  const expiryTimeline = buildExpiryTimeline(sims, current);

  return {
    stats: {
      totalSims: sims.length,
      activeSims,
      expiringSoon,
      expiredSims,
      inStock,
      assignedSims,
      companies,
      machines,
    },
    statusDistribution,
    expiryTimeline,
    upcomingExpiries: upcomingRows.map((sim) => mapSim(sim as SimWithRelations)) as SimListItem[],
    recentActivity: activityRows.map(mapActivity),
    notificationHealth: {
      enabled: notificationSettings?.enabled ?? true,
      failed,
      pending,
      lastScanAt: notificationSettings?.lastScanAt?.toISOString() ?? null,
    },
  };
}

function buildExpiryTimeline(
  sims: Array<{ expiryDate: Date | null; operationalStatus: string }>,
  currentDate: string,
): Array<{ label: string; count: number }> {
  const points: Array<{ key: string; label: string; count: number }> = [];
  const base = new Date(`${currentDate.slice(0, 7)}-01T00:00:00.000Z`);

  for (let index = 0; index < 6; index += 1) {
    const date = new Date(base);
    date.setUTCMonth(date.getUTCMonth() + index);
    const key = date.toISOString().slice(0, 7);
    const label = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC',
    }).format(date);
    points.push({ key, label, count: 0 });
  }

  for (const sim of sims) {
    if (!sim.expiryDate || sim.operationalStatus === 'DECOMMISSIONED') continue;
    const key = fromDbDate(sim.expiryDate)!.slice(0, 7);
    const point = points.find((item) => item.key === key);
    if (point) point.count += 1;
  }

  return points.map(({ label, count }) => ({ label, count }));
}

export const dashboardService = { getDashboard };
