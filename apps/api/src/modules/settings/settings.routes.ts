import { Router } from 'express';
import { appPreferencesSchema, organizationSettingsSchema, PERMISSIONS } from '@san/shared';
import { requireAuth, requirePermission } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './settings.controller.js';

export const settingsRouter = Router();
settingsRouter.use(requireAuth);
settingsRouter.use(requirePermission(PERMISSIONS.SETTINGS_MANAGE));

settingsRouter.get('/', controller.get);
settingsRouter.put(
  '/organization',
  validate({ body: organizationSettingsSchema }),
  controller.updateOrganization,
);
settingsRouter.put(
  '/preferences',
  validate({ body: appPreferencesSchema }),
  controller.updatePreferences,
);
