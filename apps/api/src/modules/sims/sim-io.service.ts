import ExcelJS from 'exceljs';
import { Prisma } from '@prisma/client';
import type {
  NetworkProvider,
  OperationalStatus,
  SimFormInput,
  SimImportIssue,
  SimImportResult,
} from '@san/shared';
import {
  EXPIRY_WARNING_DAYS,
  NETWORK_PROVIDER_LABELS,
  NETWORK_PROVIDER_VALUES,
  OPERATIONAL_STATUS_LABELS,
  OPERATIONAL_STATUS_VALUES,
  VALIDITY_STATUS_LABELS,
  getValidityStatus,
  simFormSchema,
} from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { fromDbDate, daysRemaining } from '../../lib/dates.js';
import { createSim, type ActorContext } from './sim.service.js';

export interface SimExportFilters {
  search?: string;
  provider?: NetworkProvider;
  companyId?: string;
  status?: OperationalStatus;
  validity?: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'UNKNOWN';
}

const EXPORT_COLUMNS = [
  { key: 'internalId', label: 'SIM ID', width: 14 },
  { key: 'mobileNumber', label: 'Mobile Number', width: 18 },
  { key: 'iccid', label: 'ICCID', width: 24 },
  { key: 'imsi', label: 'IMSI', width: 20 },
  { key: 'provider', label: 'Provider', width: 12 },
  { key: 'company', label: 'Company', width: 30 },
  { key: 'machine', label: 'Machine', width: 24 },
  { key: 'contact', label: 'Contact', width: 24 },
  { key: 'operationalStatus', label: 'Operational Status', width: 20 },
  { key: 'activationDate', label: 'Activation Date', width: 16 },
  { key: 'expiryDate', label: 'Expiry Date', width: 16 },
  { key: 'validity', label: 'Validity', width: 16 },
  { key: 'daysRemaining', label: 'Days Remaining', width: 14 },
  { key: 'notes', label: 'Notes', width: 36 },
] as const;

export const IMPORT_TEMPLATE_COLUMNS = [
  'SIM ID',
  'Mobile Number',
  'ICCID',
  'IMSI',
  'Provider',
  'Company',
  'Machine Serial',
  'Contact Email',
  'Operational Status',
  'Activation Date',
  'Expiry Date',
  'Notes',
] as const;

const SAMPLE_ROW = [
  'SIM-1001',
  '+919800000001',
  '8991000000000000001',
  '404010000000001',
  'Airtel',
  'Acme Manufacturing Pvt Ltd',
  'MC-1001',
  'ops@acme.example',
  'Active',
  '2026-01-15',
  '2027-01-14',
  'Imported sample row',
];

function buildWhere(filters: SimExportFilters): Prisma.SimWhereInput {
  const current = new Date().toISOString().slice(0, 10);
  const warning = new Date(Date.parse(`${current}T00:00:00.000Z`) + EXPIRY_WARNING_DAYS * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const where: Prisma.SimWhereInput = { archivedAt: null };
  if (filters.search) {
    where.OR = [
      { internalId: { contains: filters.search, mode: 'insensitive' } },
      { mobileNumber: { contains: filters.search, mode: 'insensitive' } },
      { iccid: { contains: filters.search, mode: 'insensitive' } },
      { imsi: { contains: filters.search, mode: 'insensitive' } },
      { company: { name: { contains: filters.search, mode: 'insensitive' } } },
      { machine: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }
  if (filters.provider) where.provider = filters.provider;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.status) where.operationalStatus = filters.status;
  if (filters.validity === 'EXPIRED') where.expiryDate = { lt: new Date(`${current}T00:00:00.000Z`) };
  if (filters.validity === 'EXPIRING_SOON') {
    where.expiryDate = {
      gte: new Date(`${current}T00:00:00.000Z`),
      lte: new Date(`${warning}T00:00:00.000Z`),
    };
    where.operationalStatus = { not: 'DECOMMISSIONED' };
  }
  if (filters.validity === 'ACTIVE') where.expiryDate = { gt: new Date(`${warning}T00:00:00.000Z`) };
  if (filters.validity === 'UNKNOWN') where.expiryDate = null;
  return where;
}

async function loadExportRows(filters: SimExportFilters) {
  const sims = await prisma.sim.findMany({
    where: buildWhere(filters),
    include: { company: true, machine: true, contact: true },
    orderBy: { internalId: 'asc' },
    take: 10_000,
  });
  return sims.map((sim) => {
    const expiry = fromDbDate(sim.expiryDate);
    return {
      internalId: sim.internalId,
      mobileNumber: sim.mobileNumber,
      iccid: sim.iccid,
      imsi: sim.imsi ?? '',
      provider: NETWORK_PROVIDER_LABELS[sim.provider],
      company: sim.company?.name ?? '',
      machine: sim.machine?.name ?? '',
      contact: sim.contact?.fullName ?? sim.contact?.email ?? '',
      operationalStatus: OPERATIONAL_STATUS_LABELS[sim.operationalStatus],
      activationDate: fromDbDate(sim.activationDate) ?? '',
      expiryDate: expiry ?? '',
      validity: VALIDITY_STATUS_LABELS[getValidityStatus(expiry, EXPIRY_WARNING_DAYS)],
      daysRemaining: daysRemaining(expiry) ?? '',
      notes: sim.notes ?? '',
    } satisfies Record<(typeof EXPORT_COLUMNS)[number]['key'], string | number>;
  });
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export async function exportSimsCsv(filters: SimExportFilters): Promise<string> {
  const rows = await loadExportRows(filters);
  const header = EXPORT_COLUMNS.map((column) => csvEscape(column.label)).join(',');
  const lines = rows.map((row) =>
    EXPORT_COLUMNS.map((column) => csvEscape(row[column.key])).join(','),
  );
  return `\uFEFF${[header, ...lines].join('\r\n')}\r\n`;
}

export async function exportSimsXlsx(filters: SimExportFilters): Promise<Buffer> {
  const rows = await loadExportRows(filters);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SAN SOLUTION';
  const sheet = workbook.addWorksheet('SIM Inventory', {
    views: [{ state: 'frozen', ySplit: 3 }],
  });

  sheet.mergeCells(1, 1, 1, EXPORT_COLUMNS.length);
  const title = sheet.getCell(1, 1);
  title.value = 'SAN SOLUTION — SIM Inventory';
  title.font = { bold: true, size: 15, color: { argb: 'FF0B1F3B' } };
  sheet.mergeCells(2, 1, 2, EXPORT_COLUMNS.length);
  sheet.getCell(2, 1).value = `Generated ${new Date().toLocaleString('en-GB')} · ${rows.length} record(s)`;
  sheet.getCell(2, 1).font = { size: 10, color: { argb: 'FF64748B' } };

  sheet.getRow(4).values = EXPORT_COLUMNS.map((column) => column.label);
  const header = sheet.getRow(4);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F3B' } };
  header.height = 22;

  EXPORT_COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = column.width;
  });

  for (const row of rows) {
    sheet.addRow(EXPORT_COLUMNS.map((column) => row[column.key]));
  }
  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: 4, column: 1 },
      to: { row: 4 + rows.length, column: EXPORT_COLUMNS.length },
    };
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export async function buildImportTemplateCsv(): Promise<string> {
  return `\uFEFF${IMPORT_TEMPLATE_COLUMNS.map(csvEscape).join(',')}\r\n${SAMPLE_ROW.map(csvEscape).join(',')}\r\n`;
}

export async function buildImportTemplateXlsx(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('SIM Import');
  sheet.mergeCells(1, 1, 1, IMPORT_TEMPLATE_COLUMNS.length);
  const title = sheet.getCell(1, 1);
  title.value = 'SAN SOLUTION — SIM Import Template';
  title.font = { bold: true, size: 15, color: { argb: 'FF0B1F3B' } };
  sheet.mergeCells(2, 1, 2, IMPORT_TEMPLATE_COLUMNS.length);
  sheet.getCell(2, 1).value =
    'Remove the sample row before uploading. Provider values: Airtel, Jio, Vi, BSNL, Other. Dates: YYYY-MM-DD.';
  sheet.getCell(2, 1).font = { size: 10, color: { argb: 'FF64748B' } };

  sheet.getRow(4).values = [...IMPORT_TEMPLATE_COLUMNS];
  const header = sheet.getRow(4);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1F3B' } };
  sheet.addRow(SAMPLE_ROW);
  IMPORT_TEMPLATE_COLUMNS.forEach((column, index) => {
    sheet.getColumn(index + 1).width = Math.min(Math.max(column.length + 6, 16), 30);
  });
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/* --------------------------------- Parsing -------------------------------- */

function normalizeKey(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]/g, '');
}

function canonicalHeader(value: string): string | null {
  const key = normalizeKey(value);
  const map: Record<string, string> = {
    simid: 'internalId',
    internalid: 'internalId',
    id: 'internalId',
    mobilenumber: 'mobileNumber',
    mobile: 'mobileNumber',
    phonenumber: 'mobileNumber',
    iccid: 'iccid',
    imsi: 'imsi',
    provider: 'provider',
    network: 'provider',
    networkprovider: 'provider',
    company: 'company',
    companyname: 'company',
    machine: 'machine',
    machineserial: 'machine',
    machineserialnumber: 'machine',
    contact: 'contact',
    contactemail: 'contact',
    contactname: 'contact',
    operationalstatus: 'operationalStatus',
    status: 'operationalStatus',
    activationdate: 'activationDate',
    activatedon: 'activationDate',
    expirydate: 'expiryDate',
    expiry: 'expiryDate',
    notes: 'notes',
    remarks: 'notes',
  };
  return map[key] ?? null;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, '');

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else if (char === '\r') {
      // handled by \n
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((cell) => cell.trim().length > 0));
}

async function parseFile(
  buffer: Buffer,
  filename: string,
): Promise<Array<Record<string, string>>> {
  const lower = filename.toLowerCase();
  let matrix: string[][] = [];

  if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
    matrix = parseCsv(buffer.toString('utf8'));
  } else if (lower.endsWith('.xlsx')) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new Error('The workbook does not contain any worksheets.');
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values = row.values as Array<string | number | null | undefined>;
      matrix.push(
        values
          .slice(1)
          .map((value) => (value === null || value === undefined ? '' : String(value).trim())),
      );
    });
    matrix = matrix.filter((cells) => cells.some((cell) => cell.length > 0));
  } else {
    throw new Error('Upload a CSV or XLSX file.');
  }

  if (matrix.length < 2) throw new Error('The file does not contain any data rows.');
  const headerRow = matrix[0]!;
  const mappings = headerRow.map((header) => canonicalHeader(header));
  if (!mappings.includes('mobileNumber') || !mappings.includes('iccid')) {
    throw new Error('The file must include "Mobile Number" and "ICCID" columns.');
  }

  return matrix.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    mappings.forEach((field, index) => {
      if (!field) return;
      const value = cells[index]?.trim() ?? '';
      if (value) record[field] = value;
    });
    return record;
  });
}

const PROVIDER_LOOKUP = new Map<string, NetworkProvider>();
for (const value of NETWORK_PROVIDER_VALUES) {
  PROVIDER_LOOKUP.set(value.toLowerCase(), value);
  PROVIDER_LOOKUP.set(NETWORK_PROVIDER_LABELS[value].toLowerCase(), value);
}
const STATUS_LOOKUP = new Map<string, OperationalStatus>();
for (const value of OPERATIONAL_STATUS_VALUES) {
  STATUS_LOOKUP.set(value.toLowerCase(), value);
  STATUS_LOOKUP.set(OPERATIONAL_STATUS_LABELS[value].toLowerCase(), value);
  STATUS_LOOKUP.set(OPERATIONAL_STATUS_LABELS[value].replaceAll(' ', '').toLowerCase(), value);
}

function normalizeProvider(value: string | undefined): NetworkProvider | null {
  if (!value) return null;
  return PROVIDER_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}

function normalizeStatus(value: string | undefined): OperationalStatus | null {
  if (!value) return null;
  return STATUS_LOOKUP.get(value.trim().toLowerCase()) ?? null;
}

/** Accepts YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY or DD MMM YYYY. */
export function normalizeImportDate(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return trimmed;

  const dmy = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
  }

  const text = trimmed.match(/^(\d{1,2})[\s-]([A-Za-z]{3,})[\s-](\d{4})$/);
  if (text) {
    const [, day, monthName, year] = text;
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const monthIndex = months.indexOf(monthName!.slice(0, 3).toLowerCase());
    if (monthIndex >= 0) {
      return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
  }
  // Excel can hand back a serial date when formatted as a date; support the common case.
  if (/^\d{5}$/.test(trimmed)) {
    const serial = Number(trimmed);
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86_400_000);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return trimmed;
}

function resolveCompanyId(
  name: string | undefined,
  cache: Map<string, string | null>,
): string | null {
  if (!name) return null;
  const key = name.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;
  return null;
}

interface ValidatedRow {
  rowNumber: number;
  input: SimFormInput;
}

export async function importSims(options: {
  buffer: Buffer;
  filename: string;
  dryRun: boolean;
  actor: ActorContext;
}): Promise<SimImportResult> {
  let records: Array<Record<string, string>>;
  try {
    records = await parseFile(options.buffer, options.filename);
  } catch (error) {
    return {
      totalRows: 0,
      created: 0,
      skipped: 0,
      dryRun: true,
      issues: [
        {
          row: 0,
          messages: [error instanceof Error ? error.message : 'The file could not be read.'],
        },
      ],
      preview: [],
    };
  }

  if (records.length > 500) {
    return {
      totalRows: records.length,
      created: 0,
      skipped: 0,
      dryRun: true,
      issues: [{ row: 0, messages: ['Import files can contain at most 500 data rows.'] }],
      preview: [],
    };
  }

  const issues: SimImportIssue[] = [];
  const validated: ValidatedRow[] = [];
  const preview: SimImportResult['preview'] = [];

  const activeCompanies = await prisma.company.findMany({
    where: { archivedAt: null, isActive: true },
    select: { id: true, name: true },
  });
  const companyCache = new Map<string, string>();
  for (const company of activeCompanies) {
    companyCache.set(company.name.trim().toLowerCase(), company.id);
  }

  const machines = await prisma.machine.findMany({
    where: { archivedAt: null },
    select: { id: true, serialNumber: true, companyId: true },
  });
  const machineCache = new Map<string, { id: string; companyId: string }>();
  for (const machine of machines) {
    machineCache.set(machine.serialNumber.trim().toLowerCase(), {
      id: machine.id,
      companyId: machine.companyId,
    });
  }

  const seen = new Map<string, number>();

  for (let index = 0; index < records.length; index += 1) {
    const rowNumber = index + 2;
    const record = records[index]!;
    const messages: string[] = [];

    const companyName = record.company?.trim();
    const companyId = companyName
      ? (companyCache.get(companyName.toLowerCase()) ?? null)
      : null;
    if (companyName && !companyId) {
      messages.push(`Company "${companyName}" was not found or is inactive.`);
    }

    let machineId: string | null = null;
    const machineSerial = record.machine?.trim();
    if (machineSerial) {
      const machine = machineCache.get(machineSerial.toLowerCase());
      if (!machine) {
        messages.push(`Machine serial "${machineSerial}" was not found.`);
      } else if (companyId && machine.companyId !== companyId) {
        messages.push(`Machine "${machineSerial}" belongs to a different company.`);
      } else {
        machineId = machine.id;
      }
    }

    let contactId: string | null = null;
    const contactHint = record.contact?.trim();
    if (contactHint && companyId) {
      const contact = await prisma.contact.findFirst({
        where: {
          companyId,
          archivedAt: null,
          OR: [{ email: contactHint.toLowerCase() }, { fullName: contactHint }],
        },
        select: { id: true },
      });
      if (contact) contactId = contact.id;
    }

    const provider = normalizeProvider(record.provider) ?? 'AIRTEL';
    if (!record.provider) messages.push('Provider is required.');
    if (record.provider && !normalizeProvider(record.provider)) {
      messages.push(`Provider "${record.provider}" is not recognised.`);
    }

    const operationalStatus =
      normalizeStatus(record.operationalStatus) ?? (companyId ? 'ACTIVE' : 'IN_STOCK');
    if (record.operationalStatus && !normalizeStatus(record.operationalStatus)) {
      messages.push(`Status "${record.operationalStatus}" is not recognised.`);
    }

    const input: SimFormInput = {
      internalId: record.internalId ?? null,
      mobileNumber: record.mobileNumber ?? '',
      iccid: record.iccid ?? '',
      imsi: record.imsi ?? null,
      provider,
      activationDate: normalizeImportDate(record.activationDate),
      expiryDate: normalizeImportDate(record.expiryDate),
      operationalStatus,
      companyId,
      machineId,
      contactId,
      notes: record.notes ?? null,
    };

    const parsed = simFormSchema.safeParse(input);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const path = issue.path.join('.');
        messages.push(path ? `${path}: ${issue.message}` : issue.message);
      }
    } else {
      const mobileKey = `m:${parsed.data.mobileNumber}`;
      const iccidKey = `i:${parsed.data.iccid}`;
      const duplicateRow = seen.get(mobileKey) ?? seen.get(iccidKey);
      if (duplicateRow) {
        messages.push(`Duplicate mobile number or ICCID also used on row ${duplicateRow}.`);
      }
      seen.set(mobileKey, rowNumber);
      seen.set(iccidKey, rowNumber);
    }

    if (messages.length > 0) {
      issues.push({ row: rowNumber, messages });
      continue;
    }

    const validInput = parsed.success ? parsed.data : input;
    validated.push({ rowNumber, input: validInput });

    if (preview.length < 20) {
      preview.push({
        row: rowNumber,
        internalId: validInput.internalId || '(auto)',
        mobileNumber: validInput.mobileNumber,
        iccid: validInput.iccid,
        provider: validInput.provider,
        company: companyName ?? null,
        expiryDate: validInput.expiryDate ?? null,
      });
    }
  }

  if (options.dryRun || issues.length > 0) {
    return {
      totalRows: records.length,
      created: 0,
      skipped: records.length,
      dryRun: true,
      issues,
      preview,
    };
  }

  // Check uniqueness against the database before writing anything.
  const dbIssues: SimImportIssue[] = [];
  for (const row of validated) {
    const input = row.input;
    const duplicates = await prisma.sim.findMany({
      where: {
        OR: [
          { mobileNumber: input.mobileNumber },
          { iccid: input.iccid },
          ...(input.internalId ? [{ internalId: input.internalId }] : []),
          ...(input.imsi ? [{ imsi: input.imsi }] : []),
        ],
      },
      select: { mobileNumber: true, iccid: true, internalId: true, imsi: true },
    });
    if (duplicates.length === 0) continue;
    const messages: string[] = [];
    for (const duplicate of duplicates) {
      if (duplicate.mobileNumber === input.mobileNumber) {
        messages.push('Mobile number already exists.');
      }
      if (duplicate.iccid === input.iccid) messages.push('ICCID already exists.');
      if (input.internalId && duplicate.internalId === input.internalId) {
        messages.push('SIM ID already exists.');
      }
      if (input.imsi && duplicate.imsi === input.imsi) messages.push('IMSI already exists.');
    }
    dbIssues.push({ row: row.rowNumber, messages: [...new Set(messages)] });
  }

  if (dbIssues.length > 0) {
    return {
      totalRows: records.length,
      created: 0,
      skipped: records.length,
      dryRun: true,
      issues: dbIssues,
      preview,
    };
  }

  let created = 0;
  const commitIssues: SimImportIssue[] = [];
  for (const row of validated) {
    try {
      await createSim(row.input, options.actor);
      created += 1;
    } catch (error) {
      commitIssues.push({
        row: row.rowNumber,
        messages: [error instanceof Error ? error.message : 'The row could not be imported.'],
      });
    }
  }

  return {
    totalRows: records.length,
    created,
    skipped: validated.length - created,
    dryRun: false,
    issues: commitIssues,
    preview,
  };
}
