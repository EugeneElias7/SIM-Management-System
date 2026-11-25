import type { Request, Response } from 'express';
import { z } from 'zod';
import { notificationListQuerySchema, notificationSettingsSchema } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import * as service from './notification.service.js';

function actorFrom(req: Request) {
  const ctx = requestAuditContext(req);
  return { userId: ctx.userId!, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as z.infer<typeof notificationListQuerySchema>;
  res.json(await service.listNotifications(query));
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  res.json({ notification: await service.getNotification(req.params.id!) });
});

export const stats = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await service.getStats());
});

export const getSettings = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ settings: await service.getSettings() });
});

export const updateSettings = asyncHandler(async (req: Request, res: Response) => {
  const input = notificationSettingsSchema.parse(req.body);
  res.json({ settings: await service.updateSettings(input, actorFrom(req)) });
});

export const retry = asyncHandler(async (req: Request, res: Response) => {
  const notification = await service.retryNotification(req.params.id!, actorFrom(req));
  res.json({ notification });
});

export const scan = asyncHandler(async (req: Request, res: Response) => {
  await service.runScanNow(actorFrom(req));
  res.status(202).json({
    message: 'Expiry scan queued. The worker will process it shortly.',
  });
});

export const getEmailConfig = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ config: service.emailConfig() });
});

export const testEmail = asyncHandler(async (req: Request, res: Response) => {
  const input = z
    .object({ email: z.string().trim().toLowerCase().email() })
    .parse(req.body);
  const result = await service.sendTestEmail(input.email, actorFrom(req));
  res.json({ message: 'Test email sent.', ...result });
});
