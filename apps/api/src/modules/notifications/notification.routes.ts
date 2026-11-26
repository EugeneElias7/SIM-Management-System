import { Router } from 'express';
import { z } from 'zod';
import {
  notificationListQuerySchema,
  notificationSettingsSchema,
  PERMISSIONS,
} from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { reportLimiter } from '../../middleware/rate-limit.js';
import * as controller from './notification.controller.js';

const idParam = z.object({ id: z.string().uuid() });

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  validate({ query: notificationListQuerySchema }),
  controller.list,
);
notificationsRouter.get(
  '/stats',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  controller.stats,
);
notificationsRouter.get(
  '/settings',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  controller.getSettings,
);
notificationsRouter.put(
  '/settings',
  requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE),
  validate({ body: notificationSettingsSchema }),
  controller.updateSettings,
);
notificationsRouter.get(
  '/email-config',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  controller.getEmailConfig,
);
notificationsRouter.post(
  '/test-telegram',
  requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE),
  reportLimiter,
  controller.testTelegram,
);

notificationsRouter.post(
  '/test-email',
  requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE),
  reportLimiter,
  controller.testEmail,
);
notificationsRouter.post(
  '/scan',
  requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE),
  controller.scan,
);
notificationsRouter.post(
  '/:id/retry',
  requirePermission(PERMISSIONS.NOTIFICATIONS_MANAGE),
  validate({ params: idParam }),
  controller.retry,
);
notificationsRouter.get(
  '/:id',
  requirePermission(PERMISSIONS.NOTIFICATIONS_READ),
  validate({ params: idParam }),
  controller.get,
);
