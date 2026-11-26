import { z } from 'zod';
import {
  MACHINE_STATUS_VALUES,
  NETWORK_PROVIDER_VALUES,
  OPERATIONAL_STATUS_VALUES,
  NOTIFICATION_STATUS_VALUES,
  REMINDER_TYPE_VALUES,
} from './enums.js';
import { DATE_ONLY_REGEX, isValidDateOnly } from './dates.js';

export const uuidSchema = z.string().uuid('Please select a valid record.');

export const optionalUuid = z
  .union([uuidSchema, z.literal('')])
  .optional()
  .nullable();

export const dateOnlySchema = z
  .string()
  .regex(DATE_ONLY_REGEX, 'Use a valid date.')
  .refine(isValidDateOnly, 'Use a valid calendar date.');

export const optionalDateOnly = z
  .union([dateOnlySchema, z.literal('')])
  .optional()
  .nullable();

export const optionalEmail = z
  .union([z.string().trim().toLowerCase().email('Enter a valid email address.'), z.literal('')])
  .optional()
  .nullable();

export const optionalText = (max = 1000) =>
  z
    .union([z.string().trim().max(max, `Must be ${max} characters or fewer.`), z.literal('')])
    .optional()
    .nullable();

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s-]{7,17}$/, 'Enter a valid phone number.');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const passwordSchema = z
  .string()
  .min(10, 'Password must be at least 10 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/[0-9]/, 'Include at least one number.');

/* ---------------------------------- Auth --------------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
  rememberMe: z.boolean().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20, 'This reset link is invalid.'),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
});

/* ---------------------------------- SIMs --------------------------------- */

export const simFormSchema = z
  .object({
    internalId: z.string().trim().max(40).optional().nullable(),
    mobileNumber: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{8,16}$/, 'Enter a valid mobile number.'),
    provider: z.enum(NETWORK_PROVIDER_VALUES, { required_error: 'Select a network provider.' }),
    receivedDate: optionalDateOnly,
    activationDate: optionalDateOnly,
    expiryDate: optionalDateOnly,
    operationalStatus: z.enum(OPERATIONAL_STATUS_VALUES).default('IN_STOCK'),
    companyId: optionalUuid,
    machineId: optionalUuid,
    contactId: optionalUuid,
    notes: optionalText(2000),
  })
  .superRefine((data, ctx) => {
    if (data.activationDate && data.expiryDate && data.expiryDate < data.activationDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['expiryDate'],
        message: 'Expiry date must be on or after the activation date.',
      });
    }
    if ((data.machineId || data.contactId) && !data.companyId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['companyId'],
        message: 'Select a company before choosing a machine or contact.',
      });
    }
  });

export const simAssignSchema = z.object({
  companyId: uuidSchema,
  machineId: optionalUuid,
  contactId: optionalUuid,
  notes: optionalText(1000),
});

export const simUnassignSchema = z.object({
  notes: optionalText(1000),
});

export const simRenewSchema = z.object({
  newExpiryDate: dateOnlySchema,
  renewalDate: optionalDateOnly,
  referenceNumber: optionalText(80),
  cost: z.coerce.number().min(0, 'Cost cannot be negative.').max(10_000_000).optional().nullable(),
  notes: optionalText(1000),
});

export const simListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  provider: z.enum(NETWORK_PROVIDER_VALUES).optional(),
  companyId: z.string().uuid().optional(),
  status: z.enum(OPERATIONAL_STATUS_VALUES).optional(),
  validity: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'UNKNOWN']).optional(),
  sort: z.enum(['createdAt_desc', 'createdAt_asc', 'expiry_asc', 'expiry_desc', 'internalId_asc']).default('createdAt_desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* -------------------------------- Companies ------------------------------ */

export const companyFormSchema = z.object({
  name: z.string().trim().min(2, 'Company name is required.').max(160),
  address: optionalText(300),
  city: optionalText(80),
  state: optionalText(80),
  postalCode: optionalText(20),
  country: z.string().trim().min(1).max(80).default('India'),
  phone: z.union([phoneSchema, z.literal('')]).optional().nullable(),
  email: optionalEmail,
  website: optionalText(200),
  notes: optionalText(2000),
  isActive: z.boolean().default(true),
  contactName: z.string().trim().min(2, 'Contact person is required.').max(120),
  contactDesignation: optionalText(80),
  contactPhone: z.union([phoneSchema, z.literal('')]).optional().nullable(),
  contactEmail: optionalEmail,
});

export const companyListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* --------------------------------- Machines ------------------------------- */

export const machineFormSchema = z.object({
  name: z.string().trim().min(2, 'Machine name is required.').max(160),
  model: optionalText(120),
  serialNumber: z.string().trim().min(2, 'Serial number is required.').max(120),
  companyId: uuidSchema,
  simId: optionalUuid,
  installationDate: optionalDateOnly,
  status: z.enum(MACHINE_STATUS_VALUES).default('OPERATIONAL'),
  notes: optionalText(2000),
});

export const machineListQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  companyId: z.string().uuid().optional(),
  status: z.enum(MACHINE_STATUS_VALUES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/* ------------------------------- Notifications ---------------------------- */

export const notificationSettingsSchema = z.object({
  enabled: z.boolean(),
  reminderDaysBefore: z
    .array(z.number().int().min(1).max(365))
    .min(0)
    .max(10)
    .refine((values) => new Set(values).size === values.length, 'Reminder days must be unique.'),
  notifyOnExpiry: z.boolean(),
  postExpiryWeekly: z.boolean(),
  postExpiryIntervalDays: z.number().int().min(1).max(90),
  recipients: z.array(z.string().trim().toLowerCase().email('Enter valid recipient emails.')).max(10),
  ccEmails: z.array(z.string().trim().toLowerCase().email('Enter valid CC emails.')).max(10),
});

export const notificationListQuerySchema = paginationSchema.extend({
  status: z.enum(NOTIFICATION_STATUS_VALUES).optional(),
  reminderType: z.enum(REMINDER_TYPE_VALUES).optional(),
  search: z.string().trim().max(100).optional(),
});

/* --------------------------------- Settings ------------------------------- */

export const organizationSettingsSchema = z.object({
  name: z.string().trim().min(2).max(160).default('SAN SOLUTION'),
  legalName: z.string().trim().min(2).max(200).default('SAN SOLUTION'),
  email: z.union([z.string().trim().toLowerCase().email('Enter a valid email address.'), z.literal('')]).default(''),
  phone: z.string().trim().max(30).default(''),
  website: z.string().trim().max(200).default(''),
  addressLine1: z.string().trim().max(200).default(''),
  addressLine2: z.string().trim().max(200).default(''),
  city: z.string().trim().max(80).default(''),
  state: z.string().trim().max(80).default(''),
  postalCode: z.string().trim().max(20).default(''),
  country: z.string().trim().max(80).default('India'),
  taxId: z.string().trim().max(40).default(''),
});

export const appPreferencesSchema = z.object({
  timezone: z.string().trim().min(1).max(80).default('Asia/Kolkata'),
  dateFormat: z.enum(['DD MMM YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('DD MMM YYYY'),
  currency: z.enum(['INR', 'USD', 'AED', 'GBP', 'EUR']).default('INR'),
  defaultPageSize: z.number().int().min(10).max(100).default(20),
});

/* --------------------------------- Reports -------------------------------- */

export const reportTypeSchema = z.enum(['inventory', 'company-wise', 'expiry', 'renewals', 'custom']);

export const reportQuerySchema = z.object({
  reportType: reportTypeSchema.optional(),
  format: z.enum(['json', 'csv', 'xlsx', 'pdf']).default('json'),
  from: optionalDateOnly,
  to: optionalDateOnly,
  search: z.string().trim().max(100).optional(),
  companyId: z.string().uuid().optional(),
  provider: z.enum(NETWORK_PROVIDER_VALUES).optional(),
  status: z.enum(OPERATIONAL_STATUS_VALUES).optional(),
  validity: z.enum(['ACTIVE', 'EXPIRING_SOON', 'EXPIRED', 'UNKNOWN']).optional(),
});

/* -------------------------------- Activity -------------------------------- */

export const activityListQuerySchema = paginationSchema.extend({
  entityType: z.string().trim().max(40).optional(),
  companyId: z.string().uuid().optional(),
  search: z.string().trim().max(100).optional(),
});

/* ---------------------------------- Users --------------------------------- */

export const userCreateSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  roleId: uuidSchema,
  password: passwordSchema,
  isActive: z.boolean().default(true),
});

export const userUpdateSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.'),
  firstName: z.string().trim().min(1, 'First name is required.').max(60),
  lastName: z.string().trim().min(1, 'Last name is required.').max(60),
  roleId: uuidSchema,
  isActive: z.boolean().default(true),
});

export const userListQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(100).optional(),
  roleId: z.string().uuid().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export const adminResetPasswordSchema = z.object({
  password: passwordSchema,
  mustChangePassword: z.boolean().default(true),
});


export type LoginInput = z.infer<typeof loginSchema>;
export type SimFormInput = z.infer<typeof simFormSchema>;
export type SimAssignInput = z.infer<typeof simAssignSchema>;
export type SimRenewInput = z.infer<typeof simRenewSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CompanyFormInput = z.infer<typeof companyFormSchema>;
export type MachineFormInput = z.infer<typeof machineFormSchema>;
export type NotificationSettingsInput = z.infer<typeof notificationSettingsSchema>;
export type OrganizationSettingsInput = z.infer<typeof organizationSettingsSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ReportType = z.infer<typeof reportTypeSchema>;
export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type AdminResetPasswordInput = z.infer<typeof adminResetPasswordSchema>;
