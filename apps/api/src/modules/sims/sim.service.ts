import { Prisma } from '@prisma/client';
import type {
  OperationalStatus,
  Paginated,
  SimAssignInput,
  SimDetail,
  SimFormInput,
  SimListItem,
  SimRenewInput,
  SimRenewalDto,
} from '@san/shared';
import { EXPIRY_WARNING_DAYS } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import {
  badRequest,
  conflict,
  notFound,
  validationError,
} from '../../lib/errors.js';
import { addDays, daysRemaining, fromDbDate, toDbDate, today } from '../../lib/dates.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import {
  mapSim,
  mapSimDetail,
  mapRenewal,
  fullName,
  type SimDetailRecord,
} from '../../lib/mappers.js';
import { recordActivity, type AuditEvent } from '../../lib/audit.js';

const simInclude = {
  company: true,
  machine: true,
  contact: true,
} satisfies Prisma.SimInclude;

const simDetailInclude = {
  company: true,
  machine: true,
  contact: true,
  assignments: {
    orderBy: { assignedAt: 'desc' },
    include: {
      company: true,
      machine: true,
      contact: true,
      assignedBy: true,
      unassignedBy: true,
    },
  },
  renewals: {
    orderBy: { renewalDate: 'desc' },
    include: { renewedBy: true },
  },
  notifications: {
    orderBy: { createdAt: 'desc' },
    take: 25,
  },
} satisfies Prisma.SimInclude;

export interface ActorContext {
  userId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

type Tx = Prisma.TransactionClient;

function normalizeOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

async function generateInternalId(tx: Tx): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const rows = await tx.$queryRaw<Array<{ value: bigint }>>`
      SELECT nextval('sim_internal_id_seq') AS value
    `;
    const candidate = `SIM-${String(Number(rows[0]?.value ?? 0)).padStart(4, '0')}`;
    const taken = await tx.sim.findUnique({ where: { internalId: candidate }, select: { id: true } });
    if (!taken) return candidate;
  }
  throw conflict('Could not generate a unique internal SIM ID. Please provide one manually.');
}

async function validateDuplicates(
  db: Tx | typeof prisma,
  input: { internalId?: string | null; mobileNumber: string },
  excludeId?: string,
): Promise<void> {
  const normalized = {
    internalId: normalizeOptional(input.internalId),
    mobileNumber: input.mobileNumber.trim(),
  };
  const or: Prisma.SimWhereInput[] = [{ mobileNumber: normalized.mobileNumber }];
  if (normalized.internalId) or.push({ internalId: normalized.internalId });

  const existing = await db.sim.findMany({
    where: {
      OR: or,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { internalId: true, mobileNumber: true },
  });
  if (existing.length === 0) return;

  const fields: Record<string, string[]> = {};
  for (const record of existing) {
    if (record.mobileNumber === normalized.mobileNumber) {
      fields.mobileNumber = ['This mobile number is already linked to another SIM.'];
    }
    if (normalized.internalId && record.internalId === normalized.internalId) {
      fields.internalId = ['This internal SIM ID is already in use.'];
    }
  }
  throw conflict('A SIM with these unique identifiers already exists.', fields);
}

async function validateAssignmentTargets(
  db: Tx | typeof prisma,
  companyId: string | null,
  machineId: string | null,
  contactId: string | null,
  currentSimId?: string,
): Promise<void> {
  if (!companyId) {
    if (machineId || contactId) {
      throw validationError('Select a company before choosing a machine or contact.', {
        companyId: ['Select a company first.'],
      });
    }
    return;
  }

  const company = await db.company.findFirst({
    where: { id: companyId, archivedAt: null },
    select: { id: true, isActive: true, name: true },
  });
  if (!company) {
    throw validationError('The selected company is unavailable.', {
      companyId: ['Select an active company.'],
    });
  }
  if (!company.isActive) {
    throw validationError('The selected company is inactive.', {
      companyId: ['Select an active company.'],
    });
  }

  if (machineId) {
    const machine = await db.machine.findFirst({
      where: { id: machineId, archivedAt: null },
      include: { sims: { select: { id: true, internalId: true } } },
    });
    if (!machine) {
      throw validationError('The selected machine is unavailable.', {
        machineId: ['Select an active machine.'],
      });
    }
    if (machine.companyId !== companyId) {
      throw validationError('The selected machine belongs to a different company.', {
        machineId: ['Choose a machine registered to the selected company.'],
      });
    }
    if (machine.sims.some((sim) => sim.id !== currentSimId)) {
      throw conflict('The selected machine already has a SIM assigned.', {
        machineId: ['This machine already has an associated SIM.'],
      });
    }
  }

  if (contactId) {
    const contact = await db.contact.findFirst({
      where: { id: contactId, companyId, archivedAt: null },
    });
    if (!contact) {
      throw validationError('The selected contact is unavailable.', {
        contactId: ['Select a contact registered to the selected company.'],
      });
    }
  }
}

async function closeActiveAssignments(
  tx: Tx,
  simId: string,
  actor: ActorContext,
  notes?: string,
): Promise<void> {
  await tx.simAssignment.updateMany({
    where: { simId, isActive: true },
    data: {
      isActive: false,
      unassignedAt: new Date(),
      unassignedById: actor.userId,
      ...(notes ? { notes } : {}),
    },
  });
}

async function cancelPendingNotifications(
  tx: Tx,
  simId: string,
  reason: string,
  onlyCycle?: Date | null,
): Promise<number> {
  const result = await tx.notification.updateMany({
    where: {
      simId,
      status: { in: ['PENDING', 'QUEUED', 'FAILED'] },
      ...(onlyCycle ? { expiryCycle: onlyCycle } : {}),
    },
    data: { status: 'CANCELLED', lastError: reason, nextRetryAt: null },
  });
  return result.count;
}

async function loadSimDetail(simId: string): Promise<SimDetail> {
  const sim = await prisma.sim.findUnique({ where: { id: simId }, include: simDetailInclude });
  if (!sim) throw notFound('SIM not found.');
  return mapSimDetail(sim as SimDetailRecord);
}

function auditFor(actor: ActorContext, event: Omit<AuditEvent, 'userId' | 'ipAddress' | 'userAgent'>): AuditEvent {
  return { ...event, ...actor };
}

export async function listSims(input: {
  search?: string;
  provider?: 'AIRTEL' | 'JIO' | 'VI' | 'BSNL' | 'OTHER';
  companyId?: string;
  status?: OperationalStatus;
  validity?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
  sort?: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<SimListItem>> {
  const current = today();
  const warningLimit = addDays(current, EXPIRY_WARNING_DAYS);
  const where: Prisma.SimWhereInput = { archivedAt: null };

  if (input.search) {
    const search = input.search.trim();
    where.OR = [
      { internalId: { contains: search, mode: 'insensitive' } },
      { mobileNumber: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
      { machine: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (input.provider) where.provider = input.provider;
  if (input.companyId) where.companyId = input.companyId;
  if (input.status) where.operationalStatus = input.status;

  if (input.validity === 'EXPIRED') where.expiryDate = { lt: toDbDate(current)! };
  if (input.validity === 'EXPIRING_SOON') {
    where.expiryDate = { gte: toDbDate(current)!, lte: toDbDate(warningLimit)! };
    where.operationalStatus = { not: 'DECOMMISSIONED' };
  }
  if (input.validity === 'ACTIVE') where.expiryDate = { gt: toDbDate(warningLimit)! };
  if (input.validity === 'UNKNOWN') where.expiryDate = null;

  const orderBy: Prisma.SimOrderByWithRelationInput =
    input.sort === 'expiry_asc'
      ? { expiryDate: 'asc' }
      : input.sort === 'expiry_desc'
        ? { expiryDate: 'desc' }
        : input.sort === 'internalId_asc'
          ? { internalId: 'asc' }
          : input.sort === 'createdAt_asc'
            ? { createdAt: 'asc' }
            : { createdAt: 'desc' };

  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.sim.count({ where }),
    prisma.sim.findMany({ where, orderBy, skip, take, include: simInclude }),
  ]);

  return {
    items: rows.map(mapSim),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function getSim(simId: string): Promise<SimDetail> {
  return loadSimDetail(simId);
}

export async function getSimAssignments(simId: string) {
  const sim = await prisma.sim.findUnique({ where: { id: simId }, select: { id: true } });
  if (!sim) throw notFound('SIM not found.');
  const detail = await loadSimDetail(simId);
  return detail.assignments;
}

export async function getSimRenewals(simId: string): Promise<SimRenewalDto[]> {
  const sim = await prisma.sim.findUnique({ where: { id: simId }, select: { id: true } });
  if (!sim) throw notFound('SIM not found.');
  const detail = await loadSimDetail(simId);
  return detail.renewals;
}

export async function createSim(input: SimFormInput, actor: ActorContext): Promise<SimDetail> {
  const companyId = normalizeOptional(input.companyId);
  const machineId = normalizeOptional(input.machineId);
  const contactId = normalizeOptional(input.contactId);
  const activationDate = normalizeOptional(input.activationDate);
  const expiryDate = normalizeOptional(input.expiryDate);

  await validateDuplicates(prisma, {
    internalId: input.internalId,
    mobileNumber: input.mobileNumber,
  });
  await validateAssignmentTargets(prisma, companyId, machineId, contactId);

  if (activationDate && expiryDate && expiryDate < activationDate) {
    throw validationError('Expiry date must be on or after the activation date.', {
      expiryDate: ['Expiry date must be on or after the activation date.'],
    });
  }

  let status: OperationalStatus = input.operationalStatus;
  if (companyId && status === 'IN_STOCK') status = 'ACTIVE';
  if (!companyId && status === 'ACTIVE') status = 'IN_STOCK';
  if (status === 'DECOMMISSIONED' && companyId) {
    throw validationError('A decommissioned SIM cannot be assigned to a company.', {
      operationalStatus: ['Choose a different status or remove the company assignment.'],
    });
  }

  const simId = await prisma.$transaction(async (tx) => {
    const internalId = normalizeOptional(input.internalId) ?? (await generateInternalId(tx));
    const sim = await tx.sim.create({
      data: {
        internalId,
        mobileNumber: input.mobileNumber.trim(),
        provider: input.provider,
        activationDate: toDbDate(activationDate),
        expiryDate: toDbDate(expiryDate),
        operationalStatus: status,
        companyId,
        machineId,
        contactId,
        notes: normalizeOptional(input.notes),
        createdById: actor.userId,
        updatedById: actor.userId,
      },
    });

    if (companyId) {
      await tx.simAssignment.create({
        data: {
          simId: sim.id,
          companyId,
          machineId,
          contactId,
          assignedById: actor.userId,
          notes: 'Initial assignment',
        },
      });
    }

    await recordActivity(
      tx,
      auditFor(actor, {
        companyId,
        simId: sim.id,
        action: 'SIM_CREATED',
        entityType: 'SIM',
        entityId: sim.id,
        description: `SIM ${sim.internalId} (${sim.mobileNumber}) was added${companyId ? ' and assigned' : ''}.`,
        metadata: { internalId: sim.internalId, provider: sim.provider },
      }),
    );
    return sim.id;
  });

  return loadSimDetail(simId);
}

export async function updateSim(
  simId: string,
  input: SimFormInput,
  actor: ActorContext,
): Promise<SimDetail> {
  const existing = await prisma.sim.findUnique({ where: { id: simId } });
  if (!existing) throw notFound('SIM not found.');
  if (existing.archivedAt) throw conflict('Archived SIMs cannot be edited.');

  const companyId = normalizeOptional(input.companyId);
  const machineId = normalizeOptional(input.machineId);
  const contactId = normalizeOptional(input.contactId);
  const activationDate = normalizeOptional(input.activationDate);
  const expiryDate = normalizeOptional(input.expiryDate);

  await validateDuplicates(
    prisma,
    {
      internalId: input.internalId,
      mobileNumber: input.mobileNumber,
    },
    simId,
  );
  await validateAssignmentTargets(prisma, companyId, machineId, contactId, simId);

  if (activationDate && expiryDate && expiryDate < activationDate) {
    throw validationError('Expiry date must be on or after the activation date.', {
      expiryDate: ['Expiry date must be on or after the activation date.'],
    });
  }

  let status = input.operationalStatus;
  if (companyId && status === 'IN_STOCK') status = 'ACTIVE';
  if (!companyId && status === 'ACTIVE') status = 'IN_STOCK';
  if (status === 'DECOMMISSIONED' && companyId) {
    throw validationError('A decommissioned SIM cannot remain assigned to a company.', {
      operationalStatus: ['Unassign the SIM before decommissioning it.'],
    });
  }

  const assignmentChanged =
    companyId !== existing.companyId ||
    machineId !== existing.machineId ||
    contactId !== existing.contactId;
  const expiryChanged =
    fromDbDate(existing.expiryDate) !== expiryDate;
  const oldExpiryCycle = existing.expiryDate;

  await prisma.$transaction(async (tx) => {
    if (assignmentChanged) {
      await closeActiveAssignments(tx, simId, actor, 'Closed by SIM edit');
      if (companyId) {
        await tx.simAssignment.create({
          data: {
            simId,
            companyId,
            machineId,
            contactId,
            assignedById: actor.userId,
            notes: 'Assignment updated from SIM edit form',
          },
        });
      }
    }

    if (expiryChanged) {
      await cancelPendingNotifications(
        tx,
        simId,
        'Cancelled because the SIM expiry date was changed.',
        oldExpiryCycle,
      );
    }

    await tx.sim.update({
      where: { id: simId },
      data: {
        internalId: normalizeOptional(input.internalId) ?? existing.internalId,
        mobileNumber: input.mobileNumber.trim(),
        provider: input.provider,
        activationDate: toDbDate(activationDate),
        expiryDate: toDbDate(expiryDate),
        operationalStatus: status,
        companyId,
        machineId,
        contactId,
        notes: normalizeOptional(input.notes),
        updatedById: actor.userId,
      },
    });

    await recordActivity(
      tx,
      auditFor(actor, {
        companyId,
        simId,
        action: 'SIM_UPDATED',
        entityType: 'SIM',
        entityId: simId,
        description: `SIM ${input.internalId || existing.internalId} was updated.`,
        metadata: {
          assignmentChanged,
          expiryChanged,
          previousExpiryDate: fromDbDate(existing.expiryDate),
          expiryDate,
        },
      }),
    );
  });

  return loadSimDetail(simId);
}

export async function assignSim(
  simId: string,
  input: SimAssignInput,
  actor: ActorContext,
): Promise<SimDetail> {
  const sim = await prisma.sim.findUnique({ where: { id: simId }, include: { company: true } });
  if (!sim) throw notFound('SIM not found.');
  if (sim.archivedAt) throw conflict('Archived SIMs cannot be assigned.');
  if (sim.operationalStatus === 'DECOMMISSIONED') {
    throw conflict('Decommissioned SIMs cannot be assigned.');
  }

  const companyId = input.companyId;
  const machineId = normalizeOptional(input.machineId);
  const contactId = normalizeOptional(input.contactId);
  await validateAssignmentTargets(prisma, companyId, machineId, contactId, simId);

  const newStatus = sim.operationalStatus === 'IN_STOCK' ? 'ACTIVE' : sim.operationalStatus;

  await prisma.$transaction(async (tx) => {
    await closeActiveAssignments(tx, simId, actor, 'Superseded by new assignment');
    await tx.simAssignment.create({
      data: {
        simId,
        companyId,
        machineId,
        contactId,
        assignedById: actor.userId,
        notes: normalizeOptional(input.notes),
      },
    });
    await tx.sim.update({
      where: { id: simId },
      data: {
        companyId,
        machineId,
        contactId,
        operationalStatus: newStatus,
        updatedById: actor.userId,
      },
    });
    await recordActivity(
      tx,
      auditFor(actor, {
        companyId,
        simId,
        action: 'SIM_ASSIGNED',
        entityType: 'SIM',
        entityId: simId,
        description: `SIM ${sim.internalId} was assigned to ${input.companyId}.`,
        metadata: {
          previousCompanyId: sim.companyId,
          companyId,
          machineId,
          contactId,
        },
      }),
    );
  });

  return loadSimDetail(simId);
}

export async function unassignSim(
  simId: string,
  notes: string | null,
  actor: ActorContext,
): Promise<SimDetail> {
  const sim = await prisma.sim.findUnique({ where: { id: simId }, include: { company: true } });
  if (!sim) throw notFound('SIM not found.');
  if (!sim.companyId) throw conflict('This SIM is not currently assigned.');

  await prisma.$transaction(async (tx) => {
    await closeActiveAssignments(tx, simId, actor, normalizeOptional(notes) ?? 'Unassigned');
    await tx.sim.update({
      where: { id: simId },
      data: {
        companyId: null,
        machineId: null,
        contactId: null,
        operationalStatus:
          sim.operationalStatus === 'ACTIVE' ? 'IN_STOCK' : sim.operationalStatus,
        updatedById: actor.userId,
      },
    });
    await recordActivity(
      tx,
      auditFor(actor, {
        companyId: sim.companyId,
        simId,
        action: 'SIM_UNASSIGNED',
        entityType: 'SIM',
        entityId: simId,
        description: `SIM ${sim.internalId} was returned to stock.`,
        metadata: { previousCompanyId: sim.companyId },
      }),
    );
  });

  return loadSimDetail(simId);
}

export async function renewSim(
  simId: string,
  input: SimRenewInput,
  actor: ActorContext,
): Promise<SimDetail> {
  const sim = await prisma.sim.findUnique({ where: { id: simId } });
  if (!sim) throw notFound('SIM not found.');
  if (sim.archivedAt) throw conflict('Archived SIMs cannot be renewed.');
  if (sim.operationalStatus === 'DECOMMISSIONED') {
    throw conflict('Decommissioned SIMs cannot be renewed.');
  }

  const currentExpiry = fromDbDate(sim.expiryDate);
  const newExpiry = input.newExpiryDate;
  const currentDate = today();
  const minimumExpiry = currentExpiry && currentExpiry > currentDate ? currentExpiry : currentDate;

  if (newExpiry <= minimumExpiry) {
    throw validationError('The new expiry date must extend the current validity.', {
      newExpiryDate: [
        currentExpiry
          ? 'New expiry must be later than the current expiry date.'
          : 'New expiry must be a future date.',
      ],
    });
  }

  const renewalDate = normalizeOptional(input.renewalDate) ?? currentDate;
  if (renewalDate > currentDate) {
    throw validationError('Renewal date cannot be in the future.', {
      renewalDate: ['Choose today or an earlier date.'],
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.simRenewal.create({
      data: {
        simId,
        companyId: sim.companyId,
        previousExpiryDate: sim.expiryDate,
        newExpiryDate: toDbDate(newExpiry)!,
        renewalDate: toDbDate(renewalDate)!,
        referenceNumber: normalizeOptional(input.referenceNumber),
        cost: input.cost ?? null,
        notes: normalizeOptional(input.notes),
        renewedById: actor.userId,
      },
    });
    await tx.sim.update({
      where: { id: simId },
      data: {
        expiryDate: toDbDate(newExpiry),
        lastRenewedAt: new Date(),
        updatedById: actor.userId,
      },
    });
    const cancelled = await cancelPendingNotifications(
      tx,
      simId,
      'Cancelled automatically because the SIM was renewed.',
    );
    await recordActivity(
      tx,
      auditFor(actor, {
        companyId: sim.companyId,
        simId,
        action: 'SIM_RENEWED',
        entityType: 'SIM',
        entityId: simId,
        description: `SIM ${sim.internalId} was renewed from ${currentExpiry ?? 'no expiry'} to ${newExpiry}.`,
        metadata: {
          previousExpiryDate: currentExpiry,
          newExpiryDate: newExpiry,
          renewalDate,
          cancelledNotifications: cancelled,
        },
      }),
    );
  });

  return loadSimDetail(simId);
}

export async function archiveSim(simId: string, actor: ActorContext): Promise<void> {
  const sim = await prisma.sim.findUnique({ where: { id: simId } });
  if (!sim) throw notFound('SIM not found.');
  if (sim.archivedAt) return;

  await prisma.$transaction(async (tx) => {
    await closeActiveAssignments(tx, simId, actor, 'SIM archived');
    const cancelled = await cancelPendingNotifications(
      tx,
      simId,
      'Cancelled because the SIM was archived.',
    );
    await tx.sim.update({
      where: { id: simId },
      data: {
        archivedAt: new Date(),
        operationalStatus: 'DECOMMISSIONED',
        companyId: null,
        machineId: null,
        contactId: null,
        updatedById: actor.userId,
      },
    });
    await recordActivity(
      tx,
      auditFor(actor, {
        companyId: sim.companyId,
        simId,
        action: 'SIM_ARCHIVED',
        entityType: 'SIM',
        entityId: simId,
        description: `SIM ${sim.internalId} was archived. Historical records were preserved.`,
        metadata: { cancelledNotifications: cancelled },
      }),
    );
  });
}

export async function getSimStats(simId: string) {
  const sim = await prisma.sim.findUnique({
    where: { id: simId },
    include: { assignments: true, renewals: true, notifications: true },
  });
  if (!sim) throw notFound('SIM not found.');
  return {
    assignments: sim.assignments.length,
    renewals: sim.renewals.length,
    notifications: sim.notifications.length,
    daysRemaining: daysRemaining(fromDbDate(sim.expiryDate)),
  };
}

export {
  simInclude,
  simDetailInclude,
  validateDuplicates as validateSimDuplicates,
  generateInternalId,
  cancelPendingNotifications,
};

export type { Tx as SimTransaction };

// Helpers intentionally exported for the import/worker services.
export { loadSimDetail, normalizeOptional, auditFor };
export const simServiceInternals = { fullName };
