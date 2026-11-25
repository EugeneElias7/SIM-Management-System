import type {
  MachineStatus,
  NetworkProvider,
  NotificationStatus,
  OperationalStatus,
  ReminderType,
  ValidityStatus,
} from './enums.js';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface RoleDto {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
}

export interface ManagedUserDto extends UserDto {
  roleId: string;
  mustChangePassword: boolean;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Paginated<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface CompanySummary {
  id: string;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export interface SimListItem {
  id: string;
  internalId: string;
  mobileNumber: string;
  iccid: string;
  imsi: string | null;
  provider: NetworkProvider;
  activationDate: string | null;
  expiryDate: string | null;
  operationalStatus: OperationalStatus;
  validityStatus: ValidityStatus;
  daysRemaining: number | null;
  company: CompanySummary | null;
  machine: { id: string; name: string; serialNumber: string } | null;
  contact: { id: string; fullName: string; email: string | null; phone: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface SimAssignmentDto {
  id: string;
  simId: string;
  company: { id: string; name: string } | null;
  machine: { id: string; name: string } | null;
  contact: { id: string; fullName: string } | null;
  assignedAt: string;
  unassignedAt: string | null;
  isActive: boolean;
  notes: string | null;
  assignedBy: { id: string; fullName: string } | null;
  unassignedBy: { id: string; fullName: string } | null;
}

export interface SimRenewalDto {
  id: string;
  previousExpiryDate: string | null;
  newExpiryDate: string;
  renewalDate: string;
  referenceNumber: string | null;
  cost: number | null;
  notes: string | null;
  recordedBy: { id: string; fullName: string } | null;
  createdAt: string;
  sim?: { id: string; internalId: string; mobileNumber: string };
  company?: { id: string; name: string } | null;
}

export interface SimDetail extends SimListItem {
  notes: string | null;
  archivedAt: string | null;
  assignments: SimAssignmentDto[];
  renewals: SimRenewalDto[];
  notifications: NotificationDto[];
}

export interface SimImportIssue {
  row: number;
  messages: string[];
}

export interface SimImportResult {
  totalRows: number;
  created: number;
  skipped: number;
  dryRun: boolean;
  issues: SimImportIssue[];
  preview: Array<{
    row: number;
    internalId: string;
    mobileNumber: string;
    iccid: string;
    provider: NetworkProvider;
    company: string | null;
    expiryDate: string | null;
  }>;
}

export interface CompanyDto {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  notes: string | null;
  isActive: boolean;
  archivedAt: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactDesignation: string | null;
  counts: {
    sims: number;
    activeSims: number;
    machines: number;
    renewals: number;
    expiringSoon: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface MachineDto {
  id: string;
  name: string;
  model: string | null;
  serialNumber: string;
  company: { id: string; name: string };
  sim: { id: string; internalId: string; mobileNumber: string; validityStatus: ValidityStatus } | null;
  installationDate: string | null;
  status: MachineStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationDto {
  id: string;
  sim: { id: string; internalId: string; mobileNumber: string } | null;
  company: { id: string; name: string } | null;
  reminderType: ReminderType;
  reminderDays: number;
  expiryCycle: string;
  recipientEmail: string;
  ccEmails: string[];
  subject: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  nextRetryAt: string | null;
  scheduledFor: string;
  sentAt: string | null;
  createdAt: string;
}

export interface ActivityDto {
  id: string;
  action: string;
  description: string;
  entityType: string;
  entityId: string | null;
  user: { id: string; fullName: string } | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface DashboardData {
  stats: {
    totalSims: number;
    activeSims: number;
    expiringSoon: number;
    expiredSims: number;
    inStock: number;
    assignedSims: number;
    companies: number;
    machines: number;
  };
  statusDistribution: Array<{
    key: string;
    label: string;
    count: number;
    color: string;
  }>;
  expiryTimeline: Array<{ label: string; count: number }>;
  upcomingExpiries: SimListItem[];
  recentActivity: ActivityDto[];
  notificationHealth: {
    enabled: boolean;
    failed: number;
    pending: number;
    lastScanAt: string | null;
  };
}

export interface NotificationStats {
  sent: number;
  failed: number;
  pending: number;
  cancelled: number;
  sentThisMonth: number;
}

export interface NotificationSettingsDto {
  enabled: boolean;
  reminderDaysBefore: number[];
  notifyOnExpiry: boolean;
  postExpiryWeekly: boolean;
  postExpiryIntervalDays: number;
  recipients: string[];
  ccEmails: string[];
  sendHour: number;
  timezone: string;
  lastScanAt: string | null;
  updatedAt: string;
}

export interface EmailConfigDto {
  configured: boolean;
  transport: 'smtp' | 'log';
  host: string | null;
  port: number | null;
  secure: boolean;
  user: string | null;
  fromName: string;
  fromEmail: string | null;
  replyTo: string | null;
}

export interface OrganizationSettings {
  name: string;
  legalName: string;
  email: string;
  phone: string;
  website: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  taxId: string;
}

export interface AppPreferences {
  timezone: string;
  dateFormat: 'DD MMM YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currency: 'INR' | 'USD' | 'AED' | 'GBP' | 'EUR';
  defaultPageSize: number;
}

export interface ReportColumn {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'currency';
}

export interface ReportData {
  type: string;
  title: string;
  description: string;
  generatedAt: string;
  range: { from: string | null; to: string | null };
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
  summary: Array<{ label: string; value: string | number }>;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
    details?: unknown;
  };
  requestId?: string;
}
