import { Router } from 'express';
import { z } from 'zod';
import { companyFormSchema, companyListQuerySchema, PERMISSIONS } from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './company.controller.js';

const idParam = z.object({ id: z.string().uuid() });

export const companiesRouter = Router();
companiesRouter.use(requireAuth);

companiesRouter.get(
  '/',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ query: companyListQuerySchema }),
  controller.list,
);
companiesRouter.post(
  '/',
  requirePermission(PERMISSIONS.COMPANIES_WRITE),
  validate({ body: companyFormSchema }),
  controller.create,
);
companiesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ params: idParam }),
  controller.get,
);
companiesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.COMPANIES_WRITE),
  validate({ params: idParam, body: companyFormSchema }),
  controller.update,
);
companiesRouter.post(
  '/:id/archive',
  requirePermission(PERMISSIONS.COMPANIES_WRITE),
  validate({ params: idParam }),
  controller.archive,
);
companiesRouter.get(
  '/:id/contacts',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ params: idParam }),
  controller.contacts,
);
companiesRouter.get(
  '/:id/sims',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ params: idParam }),
  controller.sims,
);
companiesRouter.get(
  '/:id/renewals',
  requirePermission(PERMISSIONS.COMPANIES_READ),
  validate({ params: idParam }),
  controller.renewals,
);
