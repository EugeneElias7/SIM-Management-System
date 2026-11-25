import type { Request, Response } from 'express';
import type { z } from 'zod';
import type { reportQuerySchema } from '@san/shared';
import { asyncHandler } from '../../lib/async-handler.js';
import { requestAuditContext } from '../../lib/audit.js';
import { validationError } from '../../lib/errors.js';
import { prisma } from '../../lib/prisma.js';
import { recordActivity } from '../../lib/audit.js';
import {
  buildReport,
  reportFilename,
  toCsv,
  toPdf,
  toXlsx,
  type ReportFilters,
} from './report.service.js';

type ReportQuery = z.infer<typeof reportQuerySchema>;

export const generate = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as unknown as ReportQuery;
  if (query.from && query.to && query.from > query.to) {
    throw validationError('The start date must be on or before the end date.', {
      from: ['Start date must be before the end date.'],
    });
  }

  const filters: ReportFilters = {
    reportType: query.reportType,
    from: query.from ?? null,
    to: query.to ?? null,
    search: query.search,
    companyId: query.companyId,
    provider: query.provider,
    status: query.status,
    validity: query.validity,
  };

  const report = await buildReport(filters);

  if (query.format === 'json') {
    res.json({ report });
    return;
  }

  const ctx = requestAuditContext(req);
  await recordActivity(prisma, {
    ...ctx,
    action: 'REPORT_EXPORTED',
    entityType: 'REPORT',
    description: `${report.title} exported as ${query.format.toUpperCase()}.`,
    metadata: {
      reportType: report.type,
      format: query.format,
      rows: report.rows.length,
      from: filters.from,
      to: filters.to,
    },
  });

  if (query.format === 'csv') {
    const csv = toCsv(report);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportFilename(report, 'csv')}"`,
    );
    res.send(csv);
    return;
  }

  if (query.format === 'xlsx') {
    const buffer = await toXlsx(report);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${reportFilename(report, 'xlsx')}"`,
    );
    res.send(buffer);
    return;
  }

  const buffer = await toPdf(report);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${reportFilename(report, 'pdf')}"`,
  );
  res.send(buffer);
});
