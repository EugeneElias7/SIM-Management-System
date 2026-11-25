import { Router } from 'express';
import { z } from 'zod';
import { machineFormSchema, machineListQuerySchema, PERMISSIONS } from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './machine.controller.js';

const idParam = z.object({ id: z.string().uuid() });

export const machinesRouter = Router();
machinesRouter.use(requireAuth);

machinesRouter.get(
  '/',
  requirePermission(PERMISSIONS.MACHINES_READ),
  validate({ query: machineListQuerySchema }),
  controller.list,
);
machinesRouter.post(
  '/',
  requirePermission(PERMISSIONS.MACHINES_WRITE),
  validate({ body: machineFormSchema }),
  controller.create,
);
machinesRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.MACHINES_READ),
  validate({ params: idParam }),
  controller.get,
);
machinesRouter.patch(
  '/:id',
  requirePermission(PERMISSIONS.MACHINES_WRITE),
  validate({ params: idParam, body: machineFormSchema }),
  controller.update,
);
machinesRouter.post(
  '/:id/archive',
  requirePermission(PERMISSIONS.MACHINES_WRITE),
  validate({ params: idParam }),
  controller.archive,
);
