import { Prisma } from '@prisma/client';
import type { MachineFormInput, MachineStatus, Paginated, MachineDto } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound, validationError } from '../../lib/errors.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { mapMachine } from '../../lib/mappers.js';
import { fromDbDate, toDbDate } from '../../lib/dates.js';
import { recordActivity } from '../../lib/audit.js';
import type { ActorContext } from '../sims/sim.service.js';

const machineInclude = {
  company: true,
  sims: {
    where: { archivedAt: null },
    select: { id: true, internalId: true, mobileNumber: true, expiryDate: true },
  },
} satisfies Prisma.MachineInclude;

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function listMachines(input: {
  search?: string;
  companyId?: string;
  status?: MachineStatus;
  page: number;
  pageSize: number;
}): Promise<Paginated<MachineDto>> {
  const where: Prisma.MachineWhereInput = { archivedAt: null };
  if (input.companyId) where.companyId = input.companyId;
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: 'insensitive' } },
      { model: { contains: input.search, mode: 'insensitive' } },
      { serialNumber: { contains: input.search, mode: 'insensitive' } },
      { company: { name: { contains: input.search, mode: 'insensitive' } } },
    ];
  }
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.machine.count({ where }),
    prisma.machine.findMany({
      where,
      include: machineInclude,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map(mapMachine),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function getMachine(id: string): Promise<MachineDto> {
  const machine = await prisma.machine.findUnique({ where: { id }, include: machineInclude });
  if (!machine) throw notFound('Machine not found.');
  return mapMachine(machine);
}

async function validateCompany(companyId: string): Promise<void> {
  const company = await prisma.company.findFirst({
    where: { id: companyId, archivedAt: null },
    select: { id: true, isActive: true },
  });
  if (!company || !company.isActive) {
    throw validationError('Select an active company.', {
      companyId: ['Select an active company.'],
    });
  }
}

async function validateSimForMachine(
  simId: string,
  companyId: string,
  currentMachineId?: string,
): Promise<void> {
  const sim = await prisma.sim.findUnique({
    where: { id: simId },
    include: { machine: { select: { id: true, name: true } } },
  });
  if (!sim || sim.archivedAt) {
    throw validationError('Select an available SIM.', { simId: ['This SIM is unavailable.'] });
  }
  if (sim.companyId !== companyId) {
    throw validationError('The SIM must be assigned to the selected company.', {
      simId: ['Only SIMs currently assigned to this company can be linked.'],
    });
  }
  if (sim.machine && sim.machine.id !== currentMachineId) {
    throw conflict(`This SIM is already linked to ${sim.machine.name}.`, {
      simId: ['This SIM is already associated with another machine.'],
    });
  }
}

async function linkSimToMachine(
  tx: Prisma.TransactionClient,
  options: {
    simId: string;
    machineId: string;
    previousSimId: string | null;
    companyId: string;
    actor: ActorContext;
  },
): Promise<void> {
  const { simId, machineId, previousSimId, companyId, actor } = options;

  if (previousSimId && previousSimId !== simId) {
    await tx.sim.update({ where: { id: previousSimId }, data: { machineId: null } });
    await tx.simAssignment.updateMany({
      where: { simId: previousSimId, isActive: true },
      data: { machineId: null },
    });
  }

  await tx.sim.update({
    where: { id: simId },
    data: { machineId, updatedById: actor.userId },
  });

  const activeAssignment = await tx.simAssignment.findFirst({
    where: { simId, isActive: true },
    select: { id: true },
  });
  if (activeAssignment) {
    await tx.simAssignment.update({
      where: { id: activeAssignment.id },
      data: { machineId },
    });
  } else {
    await tx.simAssignment.create({
      data: {
        simId,
        companyId,
        machineId,
        assignedById: actor.userId,
        notes: 'Linked through machinery management',
      },
    });
  }

  await recordActivity(tx, {
    ...actor,
    action: 'MACHINE_SIM_LINKED',
    entityType: 'MACHINE',
    entityId: machineId,
    simId,
    companyId,
    description: 'A SIM was associated with a machine.',
    metadata: { simId, machineId, previousSimId },
  });
}

export async function createMachine(
  input: MachineFormInput,
  actor: ActorContext,
): Promise<MachineDto> {
  await validateCompany(input.companyId);
  const serialNumber = input.serialNumber.trim();
  const duplicate = await prisma.machine.findUnique({
    where: { serialNumber },
    select: { id: true },
  });
  if (duplicate) {
    throw conflict('A machine with this serial number already exists.', {
      serialNumber: ['This serial number is already registered.'],
    });
  }
  const simId = normalize(input.simId);
  if (simId) await validateSimForMachine(simId, input.companyId);

  const machine = await prisma.$transaction(async (tx) => {
    const created = await tx.machine.create({
      data: {
        name: input.name.trim(),
        model: normalize(input.model),
        serialNumber,
        companyId: input.companyId,
        installationDate: toDbDate(normalize(input.installationDate)),
        status: input.status,
        notes: normalize(input.notes),
      },
    });
    if (simId) {
      await linkSimToMachine(tx, {
        simId,
        machineId: created.id,
        previousSimId: null,
        companyId: input.companyId,
        actor,
      });
    }
    await recordActivity(tx, {
      ...actor,
      action: 'MACHINE_CREATED',
      entityType: 'MACHINE',
      entityId: created.id,
      companyId: input.companyId,
      description: `Machine ${created.name} (${created.serialNumber}) was registered.`,
      metadata: { name: created.name, serialNumber: created.serialNumber, simId },
    });
    return created;
  });

  return getMachine(machine.id);
}

export async function updateMachine(
  machineId: string,
  input: MachineFormInput,
  actor: ActorContext,
): Promise<MachineDto> {
  const existing = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { sims: { select: { id: true } } },
  });
  if (!existing || existing.archivedAt) throw notFound('Machine not found.');
  await validateCompany(input.companyId);

  if (existing.companyId !== input.companyId && existing.sims.length > 0) {
    throw conflict('Unlink the associated SIM before changing the machine’s company.', {
      companyId: ['This machine still has an associated SIM.'],
    });
  }

  const serialNumber = input.serialNumber.trim();
  const duplicate = await prisma.machine.findFirst({
    where: { serialNumber, id: { not: machineId } },
    select: { id: true },
  });
  if (duplicate) {
    throw conflict('A machine with this serial number already exists.', {
      serialNumber: ['This serial number is already registered.'],
    });
  }

  const previousSimId = existing.sims[0]?.id ?? null;
  const simId = normalize(input.simId);
  if (simId && simId !== previousSimId) {
    await validateSimForMachine(simId, input.companyId, machineId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.machine.update({
      where: { id: machineId },
      data: {
        name: input.name.trim(),
        model: normalize(input.model),
        serialNumber,
        companyId: input.companyId,
        installationDate: toDbDate(normalize(input.installationDate)),
        status: input.status,
        notes: normalize(input.notes),
      },
    });

    if (simId) {
      await linkSimToMachine(tx, {
        simId,
        machineId,
        previousSimId,
        companyId: input.companyId,
        actor,
      });
    } else if (previousSimId) {
      await tx.sim.update({ where: { id: previousSimId }, data: { machineId: null } });
      await tx.simAssignment.updateMany({
        where: { simId: previousSimId, isActive: true },
        data: { machineId: null },
      });
    }

    await recordActivity(tx, {
      ...actor,
      action: 'MACHINE_UPDATED',
      entityType: 'MACHINE',
      entityId: machineId,
      companyId: input.companyId,
      description: `Machine ${input.name} was updated.`,
      metadata: {
        previousSerialNumber: existing.serialNumber,
        serialNumber,
        previousSimId,
        simId,
        installationDate: normalize(input.installationDate),
      },
    });
  });

  return getMachine(machineId);
}

export async function archiveMachine(machineId: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.machine.findUnique({
    where: { id: machineId },
    include: { sims: { select: { id: true } } },
  });
  if (!existing) throw notFound('Machine not found.');
  if (existing.archivedAt) return;

  await prisma.$transaction(async (tx) => {
    const simId = existing.sims[0]?.id;
    if (simId) {
      await tx.sim.update({ where: { id: simId }, data: { machineId: null } });
      await tx.simAssignment.updateMany({
        where: { simId, isActive: true },
        data: { machineId: null },
      });
    }
    await tx.machine.update({
      where: { id: machineId },
      data: { archivedAt: new Date(), status: 'DECOMMISSIONED' },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'MACHINE_ARCHIVED',
      entityType: 'MACHINE',
      entityId: machineId,
      companyId: existing.companyId,
      simId: simId ?? null,
      description: `Machine ${existing.name} was archived. Historical records were preserved.`,
      metadata: { serialNumber: existing.serialNumber, previousSimId: simId ?? null },
    });
  });
}

export { fromDbDate };
