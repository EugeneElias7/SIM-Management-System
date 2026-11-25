import { Router } from 'express';
import { activityListQuerySchema, PERMISSIONS } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { listActivity } from './activity.service.js';

export const activityRouter = Router();
activityRouter.use(requireAuth);

activityRouter.get(
  '/',
  requirePermission(PERMISSIONS.ACTIVITY_READ),
  validate({ query: activityListQuerySchema }),
  asyncHandler(async (req, res) => {
    const query = req.query as unknown as {
      page: number;
      pageSize: number;
      entityType?: string;
      companyId?: string;
      search?: string;
    };
    const data = await listActivity(query);
    res.json(data);
  }),
);
