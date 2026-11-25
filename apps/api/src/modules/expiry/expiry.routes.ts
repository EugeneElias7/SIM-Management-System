import { z } from 'zod';
import { Router } from 'express';
import { PERMISSIONS } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  getExpirySummary,
  getRenewalStats,
  listExpired,
  listRenewals,
  listUpcoming,
} from './expiry.service.js';

const upcomingQuery = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const renewalQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  companyId: z.string().uuid().optional(),
});

export const expiryRouter = Router();
expiryRouter.use(requireAuth);

expiryRouter.get(
  '/summary',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  asyncHandler(async (_req, res) => {
    res.json(await getExpirySummary());
  }),
);

expiryRouter.get(
  '/upcoming',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  validate({ query: upcomingQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { days: number; page: number; pageSize: number };
    res.json(await listUpcoming(query));
  }),
);

expiryRouter.get(
  '/expired',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  validate({ query: paginationQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as { page: number; pageSize: number };
    res.json(await listExpired(query));
  }),
);

expiryRouter.get(
  '/renewals',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  validate({ query: renewalQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      from?: string;
      to?: string;
      companyId?: string;
    };
    res.json(await listRenewals(query));
  }),
);

expiryRouter.get(
  '/renewal-stats',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  asyncHandler(async (_req, res) => {
    res.json(await getRenewalStats());
  }),
);

export const renewalsRouter = Router();
renewalsRouter.use(requireAuth);
renewalsRouter.get(
  '/',
  requirePermission(PERMISSIONS.RENEWALS_READ),
  validate({ query: renewalQuery }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      from?: string;
      to?: string;
      companyId?: string;
    };
    res.json(await listRenewals(query));
  }),
);
