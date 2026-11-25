import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { machineListQuerySchema } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import * as machineService from './machine.service.js';

type MachineListQuery = z.infer<typeof machineListQuerySchema>;

function actorFrom(req: Request) {
  const ctx = requestAuditContext(req);
  return { userId: ctx.userId!, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as MachineListQuery;
  const data = await machineService.listMachines(query);
  res.json(data);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const machine = await machineService.getMachine(req.params.id!);
  res.json({ machine });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const machine = await machineService.createMachine(req.body, actorFrom(req));
  res.status(201).json({ machine });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const machine = await machineService.updateMachine(req.params.id!, req.body, actorFrom(req));
  res.json({ machine });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  await machineService.archiveMachine(req.params.id!, actorFrom(req));
  res.status(204).send();
});
