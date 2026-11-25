import { Prisma } from '@prisma/client';
import type {
  CompanyDto,
  CompanyFormInput,
  Paginated,
  SimRenewalDto,
} from '@san/shared';
import { EXPIRY_WARNING_DAYS } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound } from '../../lib/errors.js';
import { addDays, fromDbDate, today, toDbDate } from '../../lib/dates.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { mapCompany, mapRenewal, type CompanyCounts } from '../../lib/mappers.js';
import { recordActivity } from '../../lib/audit.js';
import type { ActorContext } from '../sims/sim.service.js';

const companyInclude = {
  contacts: {
    where: { archivedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
  },
} satisfies Prisma.CompanyInclude;

function normalize(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function countsForCompanies(companyIds: string[]): Promise<Map<string, CompanyCounts>> {
  const map = new Map<string, CompanyCounts>();
  if (companyIds.length === 0) return map;
  for (const id of companyIds) {
    map.set(id, { sims: 0, activeSims: 0, machines: 0, renewals: 0, expiringSoon: 0 });
  }

  const current = today();
  const warning = addDays(current, EXPIRY_WARNING_DAYS);

  const [simCounts, activeCounts, expiringCounts, machineCounts, renewalCounts] =
    await Promise.all([
      prisma.sim.groupBy({
        by: ['companyId'],
        where: { companyId: { in: companyIds }, archivedAt: null },
        _count: { _all: true },
      }),
      prisma.sim.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: companyIds },
          archivedAt: null,
          operationalStatus: 'ACTIVE',
        },
        _count: { _all: true },
      }),
      prisma.sim.groupBy({
        by: ['companyId'],
        where: {
          companyId: { in: companyIds },
          archivedAt: null,
          expiryDate: { gte: toDbDate(current)!, lte: toDbDate(warning)! },
          operationalStatus: { not: 'DECOMMISSIONED' },
        },
        _count: { _all: true },
      }),
      prisma.machine.groupBy({
        by: ['companyId'],
        where: { companyId: { in: companyIds }, archivedAt: null },
        _count: { _all: true },
      }),
      prisma.simRenewal.groupBy({
        by: ['companyId'],
        where: { companyId: { in: companyIds } },
        _count: { _all: true },
      }),
    ]);

  for (const row of simCounts) {
    if (!row.companyId) continue;
    const entry = map.get(row.companyId);
    if (entry) entry.sims = row._count._all;
  }
  for (const row of activeCounts) {
    if (!row.companyId) continue;
    const entry = map.get(row.companyId);
    if (entry) entry.activeSims = row._count._all;
  }
  for (const row of expiringCounts) {
    if (!row.companyId) continue;
    const entry = map.get(row.companyId);
    if (entry) entry.expiringSoon = row._count._all;
  }
  for (const row of machineCounts) {
    const entry = map.get(row.companyId);
    if (entry) entry.machines = row._count._all;
  }
  for (const row of renewalCounts) {
    if (!row.companyId) continue;
    const entry = map.get(row.companyId);
    if (entry) entry.renewals = row._count._all;
  }
  return map;
}

export async function listCompanies(input: {
  search?: string;
  status?: 'active' | 'inactive';
  page: number;
  pageSize: number;
}): Promise<Paginated<CompanyDto>> {
  const where: Prisma.CompanyWhereInput = { archivedAt: null };
  if (input.status === 'active') where.isActive = true;
  if (input.status === 'inactive') where.isActive = false;
  if (input.search) {
    where.OR = [
      { name: { contains: input.search, mode: 'insensitive' } },
      { email: { contains: input.search, mode: 'insensitive' } },
      { phone: { contains: input.search, mode: 'insensitive' } },
      { city: { contains: input.search, mode: 'insensitive' } },
      {
        contacts: {
          some: {
            fullName: { contains: input.search, mode: 'insensitive' },
            archivedAt: null,
          },
        },
      },
    ];
  }

  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.company.count({ where }),
    prisma.company.findMany({
      where,
      include: companyInclude,
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
  ]);
  const counts = await countsForCompanies(rows.map((company) => company.id));
  return {
    items: rows.map((company) => mapCompany(company, counts.get(company.id))),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function getCompany(companyId: string): Promise<CompanyDto> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: companyInclude,
  });
  if (!company) throw notFound('Company not found.');
  const counts = await countsForCompanies([company.id]);
  return mapCompany(company, counts.get(company.id));
}

export async function getContacts(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });
  if (!company) throw notFound('Company not found.');
  const contacts = await prisma.contact.findMany({
    where: { companyId, archivedAt: null },
    orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }],
  });
  return contacts.map((contact) => ({
    id: contact.id,
    fullName: contact.fullName,
    designation: contact.designation,
    email: contact.email,
    phone: contact.phone,
    isPrimary: contact.isPrimary,
  }));
}

async function assertUniqueName(name: string, excludeId?: string): Promise<void> {
  const existing = await prisma.company.findFirst({
    where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw conflict('A company with this name already exists.', {
      name: ['This company name is already registered.'],
    });
  }
}

export async function createCompany(
  input: CompanyFormInput,
  actor: ActorContext,
): Promise<CompanyDto> {
  await assertUniqueName(input.name.trim());
  const companyId = await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: input.name.trim(),
        address: normalize(input.address),
        city: normalize(input.city),
        state: normalize(input.state),
        postalCode: normalize(input.postalCode),
        country: input.country.trim() || 'India',
        phone: normalize(input.phone),
        email: normalize(input.email),
        website: normalize(input.website),
        notes: normalize(input.notes),
        isActive: input.isActive,
      },
    });
    await tx.contact.create({
      data: {
        companyId: company.id,
        fullName: input.contactName.trim(),
        designation: normalize(input.contactDesignation),
        email: normalize(input.contactEmail),
        phone: normalize(input.contactPhone),
        isPrimary: true,
      },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'COMPANY_CREATED',
      entityType: 'COMPANY',
      entityId: company.id,
      companyId: company.id,
      description: `Company ${company.name} was registered.`,
      metadata: { name: company.name },
    });
    return company.id;
  });
  return getCompany(companyId);
}

export async function updateCompany(
  companyId: string,
  input: CompanyFormInput,
  actor: ActorContext,
): Promise<CompanyDto> {
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    include: { contacts: { where: { isPrimary: true, archivedAt: null } } },
  });
  if (!existing || existing.archivedAt) throw notFound('Company not found.');
  await assertUniqueName(input.name.trim(), companyId);

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: companyId },
      data: {
        name: input.name.trim(),
        address: normalize(input.address),
        city: normalize(input.city),
        state: normalize(input.state),
        postalCode: normalize(input.postalCode),
        country: input.country.trim() || 'India',
        phone: normalize(input.phone),
        email: normalize(input.email),
        website: normalize(input.website),
        notes: normalize(input.notes),
        isActive: input.isActive,
      },
    });

    const primary = existing.contacts[0];
    const contactData = {
      fullName: input.contactName.trim(),
      designation: normalize(input.contactDesignation),
      email: normalize(input.contactEmail),
      phone: normalize(input.contactPhone),
      isPrimary: true,
    };
    if (primary) {
      await tx.contact.update({ where: { id: primary.id }, data: contactData });
    } else {
      await tx.contact.updateMany({
        where: { companyId, isPrimary: true },
        data: { isPrimary: false },
      });
      await tx.contact.create({ data: { companyId, ...contactData } });
    }

    await recordActivity(tx, {
      ...actor,
      action: 'COMPANY_UPDATED',
      entityType: 'COMPANY',
      entityId: companyId,
      companyId,
      description: `Company ${input.name} was updated.`,
      metadata: { name: input.name },
    });
  });

  return getCompany(companyId);
}

export async function archiveCompany(companyId: string, actor: ActorContext): Promise<void> {
  const existing = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      _count: {
        select: {
          sims: { where: { archivedAt: null } },
          machines: { where: { archivedAt: null } },
        },
      },
    },
  });
  if (!existing) throw notFound('Company not found.');
  if (existing.archivedAt) return;
  if (existing._count.sims > 0 || existing._count.machines > 0) {
    throw conflict(
      'Reassign or archive the company’s active SIMs and machinery before archiving the company.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.contact.updateMany({
      where: { companyId, archivedAt: null },
      data: { archivedAt: new Date(), isPrimary: false },
    });
    await tx.company.update({
      where: { id: companyId },
      data: { archivedAt: new Date(), isActive: false },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'COMPANY_ARCHIVED',
      entityType: 'COMPANY',
      entityId: companyId,
      companyId,
      description: `Company ${existing.name} was archived.`,
    });
  });
}

export async function listCompanyRenewals(
  companyId: string,
  input: { page: number; pageSize: number },
): Promise<Paginated<SimRenewalDto>> {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) throw notFound('Company not found.');
  const where: Prisma.SimRenewalWhereInput = { companyId };
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.simRenewal.count({ where }),
    prisma.simRenewal.findMany({
      where,
      include: {
        renewedBy: true,
        sim: { select: { id: true, internalId: true, mobileNumber: true } },
        company: { select: { id: true, name: true } },
      },
      orderBy: { renewalDate: 'desc' },
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map((row) =>
      mapRenewal({
        ...row,
        sim: row.sim,
        company: row.company,
      }),
    ),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

export async function listCompanySimsSummary(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw notFound('Company not found.');
  const sims = await prisma.sim.findMany({
    where: { companyId, archivedAt: null },
    orderBy: { expiryDate: 'asc' },
    include: { machine: true },
  });
  return sims.map((sim) => ({
    id: sim.id,
    internalId: sim.internalId,
    mobileNumber: sim.mobileNumber,
    provider: sim.provider,
    expiryDate: fromDbDate(sim.expiryDate),
    operationalStatus: sim.operationalStatus,
    machineName: sim.machine?.name ?? null,
  }));
}
