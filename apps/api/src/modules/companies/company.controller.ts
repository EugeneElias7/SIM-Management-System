import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { companyListQuerySchema } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import * as companyService from './company.service.js';

type CompanyListQuery = z.infer<typeof companyListQuerySchema>;

function actorFrom(req: Request) {
  const ctx = requestAuditContext(req);
  return { userId: ctx.userId!, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent };
}

export const list = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as CompanyListQuery;
  const data = await companyService.listCompanies(query);
  res.json(data);
});

export const get = asyncHandler(async (req: Request, res: Response) => {
  const company = await companyService.getCompany(req.params.id!);
  res.json({ company });
});

export const contacts = asyncHandler(async (req: Request, res: Response) => {
  const items = await companyService.getContacts(req.params.id!);
  res.json({ items });
});

export const create = asyncHandler(async (req: Request, res: Response) => {
  const company = await companyService.createCompany(req.body, actorFrom(req));
  res.status(201).json({ company });
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const company = await companyService.updateCompany(req.params.id!, req.body, actorFrom(req));
  res.json({ company });
});

export const archive = asyncHandler(async (req: Request, res: Response) => {
  await companyService.archiveCompany(req.params.id!, actorFrom(req));
  res.status(204).send();
});

export const renewals = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1);
  const pageSize = Math.min(Number(req.query.pageSize ?? 20), 100);
  const data = await companyService.listCompanyRenewals(req.params.id!, {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20,
  });
  res.json(data);
});

export const sims = asyncHandler(async (req: Request, res: Response) => {
  const items = await companyService.listCompanySimsSummary(req.params.id!);
  res.json({ items });
});
