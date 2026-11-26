import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  NETWORK_PROVIDER_VALUES,
  OPERATIONAL_STATUS_VALUES,
  simAssignSchema,
  simFormSchema,
  simListQuerySchema,
  simRenewSchema,
  simUnassignSchema,
} from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { importLimiter } from '../../middleware/rate-limit.js';
import { badRequest } from '../../lib/errors.js';
import { PERMISSIONS } from '@san/shared';
import * as controller from './sim.controller.js';

const idParam = z.object({ id: z.string().uuid() });

const exportQuery = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
  search: z.string().trim().max(100).optional(),
  provider: z.enum(NETWORK_PROVIDER_VALUES).optional(),
  companyId: z.string().uuid().optional(),
  status: z.enum(OPERATIONAL_STATUS_VALUES).optional(),
  validity: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'UNKNOWN']).optional(),
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const name = file.originalname.toLowerCase();
    if (name.endsWith('.csv') || name.endsWith('.xlsx') || name.endsWith('.txt')) {
      callback(null, true);
      return;
    }
    callback(badRequest('Only CSV and XLSX files are accepted.'));
  },
});

export const simsRouter = Router();
simsRouter.use(requireAuth);

simsRouter.get('/export', requirePermission(PERMISSIONS.SIMS_READ), validate({ query: exportQuery }), controller.exportSims);
simsRouter.get(
  '/import-template',
  requirePermission(PERMISSIONS.SIMS_READ),
  validate({ query: z.object({ format: z.enum(['csv', 'xlsx']).default('csv') }) }),
  controller.importTemplate,
);
simsRouter.post(
  '/import',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  importLimiter,
  upload.single('file'),
  controller.importFile,
);

simsRouter.get(
  '/',
  requirePermission(PERMISSIONS.SIMS_READ),
  validate({ query: simListQuerySchema }),
  controller.list,
);
simsRouter.post(
  '/',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ body: simFormSchema }),
  controller.create,
);
simsRouter.get(
  '/:id/assignments',
  requirePermission(PERMISSIONS.SIMS_READ),
  validate({ params: idParam }),
  controller.assignments,
);
simsRouter.get(
  '/:id/renewals',
  requirePermission(PERMISSIONS.SIMS_READ),
  validate({ params: idParam }),
  controller.renewals,
);
simsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.SIMS_READ),
  validate({ params: idParam }),
  controller.get,
);
simsRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam, body: simFormSchema }),
  controller.update,
);
simsRouter.post(
  '/:id/assign',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam, body: simAssignSchema }),
  controller.assign,
);
simsRouter.post(
  '/:id/unassign',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam, body: simUnassignSchema }),
  controller.unassign,
);
simsRouter.post(
  '/:id/renew',
  requirePermission(PERMISSIONS.RENEWALS_WRITE),
  validate({ params: idParam, body: simRenewSchema }),
  controller.renew,
);
simsRouter.post(
  '/:id/activate',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam, body: z.object({ activationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }) }),
  controller.activate,
);
simsRouter.post(
  '/:id/status',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam, body: z.object({ operationalStatus: z.enum(OPERATIONAL_STATUS_VALUES) }) }),
  controller.updateStatus,
);
simsRouter.post(
  '/:id/archive',
  requirePermission(PERMISSIONS.SIMS_WRITE),
  validate({ params: idParam }),
  controller.archive,
);
