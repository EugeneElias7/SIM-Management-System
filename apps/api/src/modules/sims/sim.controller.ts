import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { simListQuerySchema } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import { badRequest } from '../../lib/errors.js';
import * as simService from './sim.service.js';
import {
  buildImportTemplateCsv,
  buildImportTemplateXlsx,
  exportSimsCsv,
  exportSimsXlsx,
  importSims,
} from './sim-io.service.js';

type SimListQuery = z.infer<typeof simListQuerySchema>;

function actorFrom(req: Request): simService.ActorContext {
  const ctx = requestAuditContext(req);
  return {
    userId: ctx.userId!,
    ipAddress: ctx.ipAddress,
    userAgent: ctx.userAgent,
  };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as SimListQuery;
  const data = await simService.listSims(query);
  res.json(data);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.getSim(req.params.id!);
  res.json({ sim });
});

export const assignments = asyncHandler(async (req: Request, res: Response) => {
  const items = await simService.getSimAssignments(req.params.id!);
  res.json({ items });
});

export const renewals = asyncHandler(async (req: Request, res: Response) => {
  const items = await simService.getSimRenewals(req.params.id!);
  res.json({ items });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.createSim(req.body, actorFrom(req));
  res.status(201).json({ sim });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.updateSim(req.params.id!, req.body, actorFrom(req));
  res.json({ sim });
});

export const assign = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.assignSim(req.params.id!, req.body, actorFrom(req));
  res.json({ sim });
});

export const unassign = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.unassignSim(
    req.params.id!,
    req.body?.notes ?? null,
    actorFrom(req),
  );
  res.json({ sim });
});

export const renew = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.renewSim(req.params.id!, req.body, actorFrom(req));
  res.json({ sim });
});

export const activate = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.activateSim(req.params.id!, req.body.activationDate, actorFrom(req));
  res.json({ sim });
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const sim = await simService.updateSimStatus(req.params.id!, req.body.operationalStatus, actorFrom(req));
  res.json({ sim });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  await simService.archiveSim(req.params.id!, actorFrom(req));
  res.status(204).send();
});

export const exportSims = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as SimListQuery & { format?: 'csv' | 'xlsx' };
  const filters = {
    search: query.search,
    provider: query.provider,
    companyId: query.companyId,
    status: query.status,
    validity: query.validity,
  };
  const stamp = new Date().toISOString().slice(0, 10);

  if (query.format === 'xlsx') {
    const buffer = await exportSimsXlsx(filters);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="san-solution-sim-inventory-${stamp}.xlsx"`,
    );
    res.send(buffer);
    return;
  }

  const csv = await exportSimsCsv(filters);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="san-solution-sim-inventory-${stamp}.csv"`,
  );
  res.send(csv);
});

export const importTemplate = asyncHandler(async (req: Request, res: Response) => {
  const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
  if (format === 'xlsx') {
    const buffer = await buildImportTemplateXlsx();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="san-solution-sim-import-template.xlsx"',
    );
    res.send(buffer);
    return;
  }
  const csv = await buildImportTemplateCsv();
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="san-solution-sim-import-template.csv"',
  );
  res.send(csv);
});

export const importFile = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw badRequest('Choose a CSV or XLSX file to import.', {
      file: ['A file is required.'],
    });
  }
  const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === 'true';
  const result = await importSims({
    buffer: req.file.buffer,
    filename: req.file.originalname,
    dryRun,
    actor: actorFrom(req),
  });
  res.status(dryRun ? 200 : 201).json({ result });
});
