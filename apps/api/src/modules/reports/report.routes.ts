import { Router } from 'express';
import { PERMISSIONS, reportQuerySchema } from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { reportLimiter } from '../../middleware/rate-limit.js';
import { validate } from '../../middleware/validate.js';
import { generate } from './report.controller.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.use(requirePermission(PERMISSIONS.REPORTS_READ));

reportsRouter.get('/', reportLimiter, validate({ query: reportQuerySchema }), generate);
