import type { Request, Response } from 'express';
import {
  adminResetPasswordSchema,
  userCreateSchema,
  userUpdateSchema,
  type userListQuerySchema,
} from '@san/shared';
import type { z } from 'zod';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import * as service from './user.service.js';

function actorFrom(req: Request) {
  const ctx = requestAuditContext(req);
  return { userId: ctx.userId!, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
}

export const roles = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ items: await service.listRoles() });
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as z.infer<typeof userListQuerySchema>;
  res.json(await service.listUsers(query));
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.createUser(userCreateSchema.parse(req.body), actorFrom(req));
  res.status(201).json({ user });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const user = await service.updateUser(
    req.params.id!,
    userUpdateSchema.parse(req.body),
    actorFrom(req),
  );
  res.json({ user });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await service.resetUserPassword(
    req.params.id!,
    adminResetPasswordSchema.parse(req.body),
    actorFrom(req),
  );
  res.json({ message: 'Password reset. The user must sign in again.' });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  await service.archiveUser(req.params.id!, actorFrom(req));
  res.status(204).send();
});
