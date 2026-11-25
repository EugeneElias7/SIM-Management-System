import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';
import type {
  NetworkProvider,
  OperationalStatus,
  ReportData,
  ReportType,
  ValidityStatus,
} from '@san/shared';
import {
  EXPIRY_WARNING_DAYS,
  NETWORK_PROVIDER_LABELS,
  OPERATIONAL_STATUS_LABELS,
  VALIDITY_STATUS_LABELS,
  getValidityStatus,
  humanDate,
} from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { fromDbDate, today } from '../../lib/dates.js';
import { countsForCompanies } from '../companies/company.service.js';

export interface ReportFilters {
  reportType?: ReportType;
  from?: string | null;
  to?: string | null;
  search?: string;
  companyId?: string;
  provider?: NetworkProvider;
  status?: OperationalStatus;
  validity?: ValidityStatus;
}

const REPORT_META: Record<
  ReportType,
  { title: string; description: string; columns: ReportData['columns'] }
> = {
  inventory: {
    title: 'SIM Inventory Report',
    description: 'Complete register of active SIM cards with assignment and validity details.',
    columns: [
      { key: 'internalId', label: 'SIM ID' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'iccid', label: 'ICCID' },
      { key: 'imsi', label: 'IMSI' },
      { key: 'provider', label: 'Provider' },
      { key: 'company', label: 'Company' },
      { key: 'machine', label: 'Machine' },
      { key: 'operationalStatus', label: 'Status' },
      { key: 'activationDate', label: 'Activation', type: 'date' },
      { key: 'expiryDate', label: 'Expiry', type: 'date' },
      { key: 'validity', label: 'Validity' },
      { key: 'daysRemaining', label: 'Days Left', type: 'number' },
    ],
  },
  'company-wise': {
    title: 'Company-wise SIM Report',
    description: 'Assignment summary grouped by client company.',
    columns: [
      { key: 'company', label: 'Company' },
      { key: 'contactName', label: 'Primary Contact' },
      { key: 'contactEmail', label: 'Contact Email' },
      { key: 'contactPhone', label: 'Contact Phone' },
      { key: 'city', label: 'City' },
      { key: 'totalSims', label: 'Total SIMs', type: 'number' },
      { key: 'activeSims', label: 'Active SIMs', type: 'number' },
      { key: 'expiringSoon', label: 'Expiring Soon', type: 'number' },
      { key: 'machines', label: 'Machines', type: 'number' },
      { key: 'renewals', label: 'Renewals', type: 'number' },
      { key: 'status', label: 'Company Status' },
    ],
  },
  expiry: {
    title: 'SIM Expiry Report',
    description: 'SIMs approaching expiry or already expired, ordered by expiry date.',
    columns: [
      { key: 'internalId', label: 'SIM ID' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'provider', label: 'Provider' },
      { key: 'company', label: 'Company' },
      { key: 'machine', label: 'Machine' },
      { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
      { key: 'daysRemaining', label: 'Days Remaining', type: 'number' },
      { key: 'validity', label: 'Validity' },
      { key: 'operationalStatus', label: 'Operational Status' },
    ],
  },
  renewals: {
    title: 'SIM Renewal Report',
    description: 'Renewal transactions recorded in the selected period.',
    columns: [
      { key: 'renewalDate', label: 'Renewal Date', type: 'date' },
      { key: 'simInternalId', label: 'SIM ID' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'company', label: 'Company' },
      { key: 'previousExpiryDate', label: 'Previous Expiry', type: 'date' },
      { key: 'newExpiryDate', label: 'New Expiry', type: 'date' },
      { key: 'referenceNumber', label: 'Reference' },
      { key: 'cost', label: 'Cost', type: 'currency' },
      { key: 'recordedBy', label: 'Recorded By' },
    ],
  },
  custom: {
    title: 'Custom SIM Report',
    description: 'Filtered SIM register based on the selected criteria.',
    columns: [
      { key: 'internalId', label: 'SIM ID' },
      { key: 'mobileNumber', label: 'Mobile Number' },
      { key: 'iccid', label: 'ICCID' },
      { key: 'provider', label: 'Provider' },
      { key: 'company', label: 'Company' },
      { key: 'machine', label: 'Machine' },
      { key: 'operationalStatus', label: 'Status' },
      { key: 'activationDate', label: 'Activation', type: 'date' },
      { key: 'expiryDate', label: 'Expiry', type: 'date' },
      { key: 'validity', label: 'Validity' },
      { key: 'daysRemaining', label: 'Days Left', type: 'number' },
    ],
  },
};

function dateRange(filters: ReportFilters): Prisma.DateTimeFilter | undefined {
  const range: Prisma.DateTimeFilter = {};
  if (filters.from) range.gte = new Date(`${filters.from}T00:00:00.000Z`);
  if (filters.to) range.lte = new Date(`${filters.to}T00:00:00.000Z`);
  return Object.keys(range).length > 0 ? range : undefined;
}

function simWhere(filters: ReportFilters): Prisma.SimWhereInput {
  const where: Prisma.SimWhereInput = { archivedAt: null };
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.provider) where.provider = filters.provider;
  if (filters.status) where.operationalStatus = filters.status;
  if (filters.search) {
    const search = filters.search;
    where.OR = [
      { internalId: { contains: search, mode: 'insensitive' } },
      { mobileNumber: { contains: search, mode: 'insensitive' } },
      { iccid: { contains: search, mode: 'insensitive' } },
      { imsi: { contains: search, mode: 'insensitive' } },
      { company: { name: { contains: search, mode: 'insensitive' } } },
      { machine: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const current = today();
  const warningLimit = new Date(
    Date.parse(`${current}T00:00:00.000Z`) + EXPIRY_WARNING_DAYS * 86_400_000,
  );
  if (filters.validity === 'EXPIRED') where.expiryDate = { lt: new Date(`${current}T00:00:00.000Z`) };
  if (filters.validity === 'EXPIRING_SOON') {
    where.expiryDate = {
      gte: new Date(`${current}T00:00:00.000Z`),
      lte: warningLimit,
    };
    where.operationalStatus = { not: 'DECOMMISSIONED' };
  }
  if (filters.validity === 'ACTIVE') {
    where.expiryDate = { gt: warningLimit };
  }
  if (filters.validity === 'UNKNOWN') where.expiryDate = null;

  const range = dateRange(filters);
  if (range) where.expiryDate = range;

  return where;
}

function expirySummary(expiryDate: string | null) {
  const validity = getValidityStatus(expiryDate, EXPIRY_WARNING_DAYS);
  return {
    validity: VALIDITY_STATUS_LABELS[validity],
    daysRemaining: expiryDate
      ? Math.round(
          (Date.parse(`${expiryDate}T00:00:00.000Z`) -
            Date.parse(`${today()}T00:00:00.000Z`)) /
            86_400_000,
        )
      : null,
  };
}

function providerLabel(value: NetworkProvider): string {
  return NETWORK_PROVIDER_LABELS[value];
}

async function buildInventoryReport(filters: ReportFilters): Promise<ReportData> {
  const where = simWhere(filters);
  const sims = await prisma.sim.findMany({
    where,
    include: { company: true, machine: true },
    orderBy: [{ internalId: 'asc' }],
  });
  const counts = sims.reduce(
    (acc, sim) => {
      const expiry = fromDbDate(sim.expiryDate);
      const validity = getValidityStatus(expiry, EXPIRY_WARNING_DAYS);
      if (validity === 'ACTIVE') acc.active += 1;
      if (validity === 'EXPIRING_SOON') acc.expiring += 1;
      if (validity === 'EXPIRED') acc.expired += 1;
      if (sim.operationalStatus === 'IN_STOCK') acc.inStock += 1;
      return acc;
    },
    { active: 0, expiring: 0, expired: 0, inStock: 0 },
  );

  return {
    type: 'inventory',
    title: REPORT_META.inventory.title,
    description: REPORT_META.inventory.description,
    generatedAt: new Date().toISOString(),
    range: { from: filters.from ?? null, to: filters.to ?? null },
    columns: REPORT_META.inventory.columns,
    rows: sims.map((sim) => {
      const expiry = fromDbDate(sim.expiryDate);
      return {
        internalId: sim.internalId,
        mobileNumber: sim.mobileNumber,
        iccid: sim.iccid,
        imsi: sim.imsi ?? '—',
        provider: providerLabel(sim.provider),
        company: sim.company?.name ?? '—',
        machine: sim.machine?.name ?? '—',
        operationalStatus: OPERATIONAL_STATUS_LABELS[sim.operationalStatus],
        activationDate: fromDbDate(sim.activationDate),
        expiryDate: expiry,
        ...expirySummary(expiry),
      };
    }),
    summary: [
      { label: 'Total SIMs', value: sims.length },
      { label: 'Active Validity', value: counts.active },
      { label: 'Expiring Soon', value: counts.expiring },
      { label: 'Expired', value: counts.expired },
      { label: 'In Stock', value: counts.inStock },
    ],
  };
}

async function buildCompanyReport(filters: ReportFilters): Promise<ReportData> {
  const where: Prisma.CompanyWhereInput = { archivedAt: null };
  if (filters.companyId) where.id = filters.companyId;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
      { city: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  const companies = await prisma.company.findMany({
    where,
    include: {
      contacts: {
        where: { archivedAt: null },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });
  const counts = await countsForCompanies(companies.map((company) => company.id));
  const totals = { sims: 0, active: 0, expiring: 0, machines: 0, renewals: 0 };
  const rows = companies.map((company) => {
    const count = counts.get(company.id) ?? {
      sims: 0,
      activeSims: 0,
      machines: 0,
      renewals: 0,
      expiringSoon: 0,
    };
    const contact = company.contacts[0];
    totals.sims += count.sims;
    totals.active += count.activeSims;
    totals.expiring += count.expiringSoon;
    totals.machines += count.machines;
    totals.renewals += count.renewals;
    return {
      company: company.name,
      contactName: contact?.fullName ?? '—',
      contactEmail: contact?.email ?? company.email ?? '—',
      contactPhone: contact?.phone ?? company.phone ?? '—',
      city: company.city ?? '—',
      totalSims: count.sims,
      activeSims: count.activeSims,
      expiringSoon: count.expiringSoon,
      machines: count.machines,
      renewals: count.renewals,
      status: company.isActive ? 'Active' : 'Inactive',
    };
  });

  return {
    type: 'company-wise',
    title: REPORT_META['company-wise'].title,
    description: REPORT_META['company-wise'].description,
    generatedAt: new Date().toISOString(),
    range: { from: filters.from ?? null, to: filters.to ?? null },
    columns: REPORT_META['company-wise'].columns,
    rows,
    summary: [
      { label: 'Companies', value: companies.length },
      { label: 'Total SIMs', value: totals.sims },
      { label: 'Active SIMs', value: totals.active },
      { label: 'Expiring Soon', value: totals.expiring },
      { label: 'Machines', value: totals.machines },
      { label: 'Renewals', value: totals.renewals },
    ],
  };
}

async function buildExpiryReport(filters: ReportFilters): Promise<ReportData> {
  const where = simWhere({ ...filters, validity: filters.validity ?? undefined });
  if (!filters.validity) where.expiryDate = { not: null };

  const sims = await prisma.sim.findMany({
    where,
    include: { company: true, machine: true },
    orderBy: { expiryDate: 'asc' },
  });

  const current = today();
  const rows = sims.map((sim) => {
    const expiry = fromDbDate(sim.expiryDate);
    return {
      internalId: sim.internalId,
      mobileNumber: sim.mobileNumber,
      provider: providerLabel(sim.provider),
      company: sim.company?.name ?? '—',
      machine: sim.machine?.name ?? '—',
      expiryDate: expiry,
      ...expirySummary(expiry),
      operationalStatus: OPERATIONAL_STATUS_LABELS[sim.operationalStatus],
    };
  });
  const expired = rows.filter((row) => typeof row.daysRemaining === 'number' && row.daysRemaining < 0).length;
  const within30 = rows.filter(
    (row) => typeof row.daysRemaining === 'number' && row.daysRemaining >= 0 && row.daysRemaining <= 30,
  ).length;

  return {
    type: 'expiry',
    title: REPORT_META.expiry.title,
    description: REPORT_META.expiry.description,
    generatedAt: new Date().toISOString(),
    range: { from: filters.from ?? null, to: filters.to ?? null },
    columns: REPORT_META.expiry.columns,
    rows,
    summary: [
      { label: 'SIMs Listed', value: rows.length },
      { label: 'Expired', value: expired },
      { label: 'Expiring in 30 days', value: within30 },
      { label: 'Report Date', value: current },
    ],
  };
}

async function buildRenewalReport(filters: ReportFilters): Promise<ReportData> {
  const where: Prisma.SimRenewalWhereInput = {};
  const range = dateRange(filters);
  if (range) where.renewalDate = range;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.search) {
    where.OR = [
      { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
      { sim: { internalId: { contains: filters.search, mode: 'insensitive' } } },
      { sim: { mobileNumber: { contains: filters.search, mode: 'insensitive' } } },
      { company: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const renewals = await prisma.simRenewal.findMany({
    where,
    include: {
      sim: { select: { internalId: true, mobileNumber: true } },
      company: { select: { name: true } },
      renewedBy: true,
    },
    orderBy: { renewalDate: 'desc' },
  });

  let totalCost = 0;
  const rows = renewals.map((renewal) => {
    const cost = renewal.cost === null ? null : Number(renewal.cost);
    if (cost !== null) totalCost += cost;
    return {
      renewalDate: fromDbDate(renewal.renewalDate)!,
      simInternalId: renewal.sim.internalId,
      mobileNumber: renewal.sim.mobileNumber,
      company: renewal.company?.name ?? '—',
      previousExpiryDate: fromDbDate(renewal.previousExpiryDate),
      newExpiryDate: fromDbDate(renewal.newExpiryDate)!,
      referenceNumber: renewal.referenceNumber ?? '—',
      cost,
      recordedBy: renewal.renewedBy
        ? `${renewal.renewedBy.firstName} ${renewal.renewedBy.lastName}`.trim()
        : '—',
    };
  });

  return {
    type: 'renewals',
    title: REPORT_META.renewals.title,
    description: REPORT_META.renewals.description,
    generatedAt: new Date().toISOString(),
    range: { from: filters.from ?? null, to: filters.to ?? null },
    columns: REPORT_META.renewals.columns,
    rows,
    summary: [
      { label: 'Renewals', value: rows.length },
      { label: 'Total Cost', value: `INR ${totalCost.toFixed(2)}` },
      { label: 'Period', value: `${filters.from ?? 'All time'} → ${filters.to ?? today()}` },
    ],
  };
}

export async function buildReport(filters: ReportFilters): Promise<ReportData> {
  const type = filters.reportType ?? 'inventory';
  if (type === 'company-wise') return buildCompanyReport(filters);
  if (type === 'expiry') return buildExpiryReport(filters);
  if (type === 'renewals') return buildRenewalReport(filters);
  if (type === 'custom') {
    const report = await buildInventoryReport(filters);
    return {
      ...report,
      type: 'custom',
      title: REPORT_META.custom.title,
      description: REPORT_META.custom.description,
      columns: REPORT_META.custom.columns,
    };
  }
  return buildInventoryReport(filters);
}

/* --------------------------------- Formats -------------------------------- */

function displayCell(value: string | number | null, type?: string): string {
  if (value === null || value === undefined) return '';
  if (type === 'date') return humanDate(String(value));
  if (type === 'currency') return `INR ${Number(value).toFixed(2)}`;
  return String(value);
}

export function toCsv(report: ReportData): string {
  const escape = (value: string): string => {
    if (/[",\n\r]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  const header = report.columns.map((column) => escape(column.label)).join(',');
  const lines = report.rows.map((row) =>
    report.columns
      .map((column) => escape(displayCell(row[column.key] ?? null, column.type)))
      .join(','),
  );
  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
}

export async function toXlsx(report: ReportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SAN SOLUTION';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(report.title.slice(0, 30), {
    views: [{ state: 'frozen', ySplit: 4 }],
  });

  const lastColumn = Math.max(report.columns.length, 1);
  sheet.mergeCells(1, 1, 1, lastColumn);
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `SAN SOLUTION — ${report.title}`;
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF0B1F3B' } };
  sheet.getRow(1).height = 26;

  sheet.mergeCells(2, 1, 2, lastColumn);
  const infoCell = sheet.getCell(2, 1);
  infoCell.value = `${report.description}  ·  Generated ${new Date(report.generatedAt).toLocaleString('en-GB')}`;
  infoCell.font = { size: 10, color: { argb: 'FF64748B' } };

  const summaryText = report.summary.map((item) => `${item.label}: ${item.value}`).join('   ·   ');
  sheet.mergeCells(3, 1, 3, lastColumn);
  const summaryCell = sheet.getCell(3, 1);
  summaryCell.value = summaryText;
  summaryCell.font = { size: 10, bold: true, color: { argb: 'FF2563EB' } };

  sheet.getRow(5).values = report.columns.map((column) => column.label);
  const header = sheet.getRow(5);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F3B' } };
  header.alignment = { vertical: 'middle' };
  header.height = 22;

  report.columns.forEach((column, index) => {
    const values = report.rows.map((row) => row[column.key] ?? null);
    const longest = Math.max(
      column.label.length,
      ...values.map((value) => String(value ?? '').length),
    );
    sheet.getColumn(index + 1).width = Math.min(Math.max(longest + 4, 12), 48);
  });

  for (const row of report.rows) {
    const values = report.columns.map((column) => row[column.key] ?? null);
    sheet.addRow(values);
  }
  if (report.rows.length > 0) {
    const lastRow = 5 + report.rows.length;
    sheet.autoFilter = { from: { row: 5, column: 1 }, to: { row: lastRow, column: lastColumn } };
    for (let rowIndex = 6; rowIndex <= lastRow; rowIndex += 1) {
      if (rowIndex % 2 === 0) {
        sheet.getRow(rowIndex).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF8FAFC' },
        };
      }
      sheet.getRow(rowIndex).font = { size: 10, color: { argb: 'FF0F172A' } };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function toPdf(report: ReportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 32 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 32;
    const usableWidth = pageWidth - margin * 2;
    let pageNumber = 1;

    // Header band
    doc.rect(0, 0, pageWidth, 64).fill('#0B1F3B');
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(15)
      .text('SAN SOLUTION', margin, 18, { continued: true })
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#CBD5E1')
      .text('   SIM Management System', { continued: false });
    doc
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text(report.title, margin, 38, { width: usableWidth, align: 'right' });

    doc
      .fillColor('#0F172A')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(report.title, margin, 82);
    doc
      .fillColor('#64748B')
      .font('Helvetica')
      .fontSize(8.5)
      .text(report.description, margin, 100, { width: usableWidth });
    doc
      .fillColor('#2563EB')
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text(report.summary.map((item) => `${item.label}: ${item.value}`).join('   ·   '), margin, 116, {
        width: usableWidth,
      });

    const startY = 138;
    const weights = report.columns.map((column) => {
      if (column.type === 'date') return 2;
      if (column.type === 'number' || column.type === 'currency') return 1.3;
      return 2.2;
    });
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    const widths = weights.map((weight) => (weight / totalWeight) * usableWidth);
    const rowHeight = 18;
    const headerHeight = 22;
    let y = startY;

    const drawHeader = () => {
      doc.rect(margin, y, usableWidth, headerHeight).fill('#0B1F3B');
      doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7.4);
      let x = margin;
      report.columns.forEach((column, index) => {
        doc.text(column.label, x + 4, y + 7, {
          width: widths[index]! - 8,
          ellipsis: true,
          lineBreak: false,
        });
        x += widths[index]!;
      });
      y += headerHeight;
    };

    const drawFooter = () => {
      doc
        .fillColor('#94A3B8')
        .font('Helvetica')
        .fontSize(7)
        .text(
          `Generated ${new Date(report.generatedAt).toLocaleString('en-GB')} · SAN SOLUTION SIM Management`,
          margin,
          pageHeight - 24,
          { width: usableWidth / 2 },
        );
      const page = pageNumber;
      doc.text(`Page ${page}`, margin + usableWidth / 2, pageHeight - 24, {
        width: usableWidth / 2,
        align: 'right',
      });
    };

    drawHeader();

    report.rows.forEach((row, rowIndex) => {
      if (y + rowHeight > pageHeight - 40) {
        drawFooter();
        doc.addPage();
        pageNumber += 1;
        y = startY;
        drawHeader();
      }
      if (rowIndex % 2 === 0) {
        doc.rect(margin, y, usableWidth, rowHeight).fill('#F8FAFC');
      }
      let x = margin;
      doc.fillColor('#0F172A').font('Helvetica').fontSize(7.2);
      report.columns.forEach((column, index) => {
        const value = row[column.key] ?? null;
        const align = column.type === 'number' || column.type === 'currency' ? 'right' : 'left';
        doc.text(displayCell(value, column.type), x + 4, y + 5.5, {
          width: widths[index]! - 8,
          align,
          ellipsis: true,
          lineBreak: false,
        });
        x += widths[index]!;
      });
      doc
        .moveTo(margin, y + rowHeight)
        .lineTo(margin + usableWidth, y + rowHeight)
        .lineWidth(0.3)
        .strokeColor('#E2E8F0')
        .stroke();
      y += rowHeight;
    });

    if (report.rows.length === 0) {
      doc
        .fillColor('#64748B')
        .font('Helvetica-Oblique')
        .fontSize(10)
        .text('No records matched the selected criteria.', margin, y + 20, {
          width: usableWidth,
          align: 'center',
        });
    }

    drawFooter();
    doc.end();
  });
}

export function reportFilename(report: ReportData, extension: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const base = report.type === 'company-wise' ? 'company-wise-sim-report' : `${report.type}-report`;
  return `san-solution-${base}-${stamp}.${extension}`;
}
