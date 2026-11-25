import { Router } from 'express';
import { z } from 'zod';
import { PERMISSIONS } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { asyncHandler } from '../../lib/async-handler.js';
import { notFound } from '../../lib/errors.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';

export const lookupsRouter = Router();
lookupsRouter.use(requireAuth);

const companyParam = z.object({ companyId: z.string().uuid() });

lookupsRouter.get(
  '/companies',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  asyncHandler(async (_req, res) => {
    const companies = await prisma.company.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, isActive: true },
      orderBy: { name: 'asc' },
    });
    res.json({ items: companies });
  }),
);

lookupsRouter.get(
  '/companies/:companyId/machines',
  requirePermission(PERMISSIONS.MACHINES_READ),
  validate({ params: companyParam }),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.companyId! },
      select: { id: true },
    });
    if (!company) throw notFound('Company not found.');
    const machines = await prisma.machine.findMany({
      where: { companyId: company.id, archivedAt: null },
      select: {
        id: true,
        name: true,
        serialNumber: true,
        status: true,
        sims: { select: { id: true, internalId: true }, take: 1 },
      },
      orderBy: { name: 'asc' },
    });
    res.json({
      items: machines.map((machine) => ({
        id: machine.id,
        name: machine.name,
        serialNumber: machine.serialNumber,
        status: machine.status,
        available: machine.sims.length === 0,
        sim: machine.sims[0] ?? null,
      })),
    });
  }),
);

lookupsRouter.get(
  '/companies/:companyId/contacts',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ params: companyParam }),
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({
      where: { id: req.params.companyId! },
      select: { id: true },
    });
    if (!company) throw notFound('Company not found.');
    const contacts = await prisma.contact.findMany({
      where: { companyId: company.id, archivedAt: null },
      select: {
        id: true,
        fullName: true,
        designation: true,
        email: true,
        phone: true,
        isPrimary: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { fullName: 'asc' }],
    });
    res.json({ items: contacts });
  }),
);
