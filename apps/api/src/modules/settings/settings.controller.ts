import type { Request, Response } from 'express';
import {
  appPreferencesSchema,
  organizationSettingsSchema,
} from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import * as service from './settings.service.js';

function actorFrom(req: Request) {
  const ctx = requestAuditContext(req);
  return { userId: ctx.userId!, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
}

export const get = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.getSettingsBundle());
});

export const updateOrganization = asyncHandler(async (req: Request, res: Response) => {
  const input = organizationSettingsSchema.parse(req.body);
  res.json({ organization: await service.updateOrganizationSettings(input, actorFrom(req)) });
});

export const updatePreferences = asyncHandler(async (req: Request, res: Response) => {
  const input = appPreferencesSchema.parse(req.body);
  res.json({ preferences: await service.updateAppPreferences(input, actorFrom(req)) });
});
