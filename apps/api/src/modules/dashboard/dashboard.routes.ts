import { Router } from 'express';
import { PERMISSIONS } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { getDashboard } from './dashboard.service.js';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  '/',
  requirePermission(PERMISSIONS.DASHBOARD_READ),
  asyncHandler(async (_req, res) => {
    const data = await getDashboard();
    res.json(data);
  }),
);
