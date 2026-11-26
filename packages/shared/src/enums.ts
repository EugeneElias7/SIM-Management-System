export const NETWORK_PROVIDER_VALUES = ['AIRTEL', 'JIO', 'VI', 'BSNL', 'OTHER'] as const;
export type NetworkProvider = (typeof NETWORK_PROVIDER_VALUES)[number];

export const NETWORK_PROVIDER_LABELS: Record<NetworkProvider, string> = {
  AIRTEL: 'Airtel',
  JIO: 'Jio',
  VI: 'Vi',
  BSNL: 'BSNL',
  OTHER: 'Other',
};

/**
 * Operational status describes what the SIM is doing for the business.
 * Validity status is always derived from the expiry date and is never stored.
 */
export const OPERATIONAL_STATUS_VALUES = [
  'IN_STOCK',
  'ASSIGNED',
  'ACTIVE',
  'SUSPENDED',
  'FAULTY',
  'DECOMMISSIONED',
] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUS_VALUES)[number];

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED: 'Assigned',
  ACTIVE: 'Active',
  SUSPENDED: 'Suspended',
  FAULTY: 'Faulty',
  DECOMMISSIONED: 'Decommissioned',
};

export const VALIDITY_STATUS_VALUES = ['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'UNKNOWN'] as const;
export type ValidityStatus = (typeof VALIDITY_STATUS_VALUES)[number];

export const VALIDITY_STATUS_LABELS: Record<ValidityStatus, string> = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring Soon',
  EXPIRED: 'Expired',
  UNKNOWN: 'No Expiry',
};

export const MACHINE_STATUS_VALUES = [
  'OPERATIONAL',
  'UNDER_MAINTENANCE',
  'OUT_OF_SERVICE',
  'DECOMMISSIONED',
] as const;
export type MachineStatus = (typeof MACHINE_STATUS_VALUES)[number];

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  OPERATIONAL: 'Operational',
  UNDER_MAINTENANCE: 'Under Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
  DECOMMISSIONED: 'Decommissioned',
};

export const NOTIFICATION_STATUS_VALUES = [
  'PENDING',
  'QUEUED',
  'SENDING',
  'SENT',
  'FAILED',
  'CANCELLED',
] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUS_VALUES)[number];

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDING: 'Pending',
  QUEUED: 'Queued',
  SENDING: 'Sending',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const REMINDER_TYPE_VALUES = ['BEFORE_EXPIRY', 'ON_EXPIRY', 'POST_EXPIRY'] as const;
export type ReminderType = (typeof REMINDER_TYPE_VALUES)[number];

export const REMINDER_TYPE_LABELS: Record<ReminderType, string> = {
  BEFORE_EXPIRY: 'Before expiry',
  ON_EXPIRY: 'On expiry',
  POST_EXPIRY: 'Post-expiry follow-up',
};

export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard:read',
  SIMS_READ: 'sims:read',
  SIMS_WRITE: 'sims:write',
  COMPANIES_READ: 'companies:read',
  COMPANIES_WRITE: 'companies:write',
  MACHINES_READ: 'machines:read',
  MACHINES_WRITE: 'machines:write',
  RENEWALS_READ: 'renewals:read',
  RENEWALS_WRITE: 'renewals:write',
  NOTIFICATIONS_READ: 'notifications:read',
  NOTIFICATIONS_MANAGE: 'notifications:manage',
  REPORTS_READ: 'reports:read',
  ACTIVITY_READ: 'activity:read',
  SETTINGS_MANAGE: 'settings:manage',
  USERS_MANAGE: 'users:manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

export const ROLE_NAMES = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
} as const;

export const DEFAULT_REMINDER_DAYS = [30, 15, 7];
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
/** A SIM is classified as "expiring soon" when its expiry falls within this window. */
export const EXPIRY_WARNING_DAYS = 30;
