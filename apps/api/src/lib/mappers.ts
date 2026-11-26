import type { Prisma } from '@prisma/client';
import type {
  ActivityDto,
  CompanyDto,
  MachineDto,
  NotificationDto,
  SimAssignmentDto,
  SimDetail,
  SimListItem,
  SimRenewalDto,
} from '@san/shared';
import { EXPIRY_WARNING_DAYS, getValidityStatus } from '@san/shared';
import { daysRemaining, fromDbDate } from './dates.js';
import { env } from '../config/env.js';

function fullName(user: { firstName: string; lastName: string } | null | undefined): string {
  return user ? `${user.firstName} ${user.lastName}`.trim() : '';
}

export type SimWithRelations = Prisma.SimGetPayload<{
  include: { company: true; machine: true; contact: true };
}>;

export type SimDetailRecord = Prisma.SimGetPayload<{
  include: {
    company: true;
    machine: true;
    contact: true;
    assignments: {
      include: {
        company: true;
        machine: true;
        contact: true;
        assignedBy: true;
        unassignedBy: true;
      };
    };
    renewals: { include: { renewedBy: true } };
    notifications: true;
  };
}>;

export function mapSim(sim: SimWithRelations): SimListItem {
  const expiryDate = fromDbDate(sim.expiryDate);
  return {
    id: sim.id,
    internalId: sim.internalId,
    mobileNumber: sim.mobileNumber,
    provider: sim.provider,
    activationDate: fromDbDate(sim.activationDate),
    expiryDate,
    operationalStatus: sim.operationalStatus,
    validityStatus: getValidityStatus(expiryDate, EXPIRY_WARNING_DAYS),
    daysRemaining: daysRemaining(expiryDate),
    company: sim.company
      ? {
          id: sim.company.id,
          name: sim.company.name,
          contactName: null,
          contactEmail: sim.company.email,
          contactPhone: sim.company.phone,
        }
      : null,
    machine: sim.machine
      ? { id: sim.machine.id, name: sim.machine.name, serialNumber: sim.machine.serialNumber }
      : null,
    contact: sim.contact
      ? {
          id: sim.contact.id,
          fullName: sim.contact.fullName,
          email: sim.contact.email,
          phone: sim.contact.phone,
        }
      : null,
    createdAt: sim.createdAt.toISOString(),
    updatedAt: sim.updatedAt.toISOString(),
  };
}

export function mapAssignment(
  assignment: SimDetailRecord['assignments'][number],
): SimAssignmentDto {
  return {
    id: assignment.id,
    simId: assignment.simId,
    company: assignment.company ? { id: assignment.company.id, name: assignment.company.name } : null,
    machine: assignment.machine
      ? { id: assignment.machine.id, name: assignment.machine.name }
      : null,
    contact: assignment.contact
      ? { id: assignment.contact.id, fullName: assignment.contact.fullName }
      : null,
    assignedAt: assignment.assignedAt.toISOString(),
    unassignedAt: assignment.unassignedAt?.toISOString() ?? null,
    isActive: assignment.isActive,
    notes: assignment.notes,
    assignedBy: assignment.assignedBy
      ? { id: assignment.assignedBy.id, fullName: fullName(assignment.assignedBy) }
      : null,
    unassignedBy: assignment.unassignedBy
      ? { id: assignment.unassignedBy.id, fullName: fullName(assignment.unassignedBy) }
      : null,
  };
}

export function mapRenewal(
  renewal: SimDetailRecord['renewals'][number] & {
    sim?: { id: string; internalId: string; mobileNumber: string };
    company?: { id: string; name: string } | null;
  },
): SimRenewalDto {
  return {
    id: renewal.id,
    previousExpiryDate: fromDbDate(renewal.previousExpiryDate),
    newExpiryDate: fromDbDate(renewal.newExpiryDate)!,
    renewalDate: fromDbDate(renewal.renewalDate)!,
    referenceNumber: renewal.referenceNumber,
    cost: renewal.cost === null ? null : Number(renewal.cost),
    notes: renewal.notes,
    recordedBy: renewal.renewedBy
      ? { id: renewal.renewedBy.id, fullName: fullName(renewal.renewedBy) }
      : null,
    createdAt: renewal.createdAt.toISOString(),
    ...(renewal.sim ? { sim: renewal.sim } : {}),
    ...(renewal.company !== undefined ? { company: renewal.company } : {}),
  };
}

export function mapSimDetail(sim: SimDetailRecord): SimDetail {
  return {
    ...mapSim(sim),
    notes: sim.notes,
    archivedAt: sim.archivedAt?.toISOString() ?? null,
    assignments: sim.assignments.map(mapAssignment),
    renewals: sim.renewals.map((renewal) => mapRenewal(renewal)),
    notifications: sim.notifications.map((notification) =>
      mapNotification({ ...notification, sim: null }),
    ),
  };
}

export type CompanyWithContacts = Prisma.CompanyGetPayload<{ include: { contacts: true } }>;

export interface CompanyCounts {
  sims: number;
  activeSims: number;
  machines: number;
  renewals: number;
  expiringSoon: number;
}

export function mapCompany(company: CompanyWithContacts, counts?: CompanyCounts): CompanyDto {
  const primary = company.contacts.find((contact) => contact.isPrimary) ?? company.contacts[0];
  return {
    id: company.id,
    name: company.name,
    address: company.address,
    city: company.city,
    state: company.state,
    postalCode: company.postalCode,
    country: company.country,
    phone: company.phone,
    email: company.email,
    website: company.website,
    notes: company.notes,
    isActive: company.isActive,
    archivedAt: company.archivedAt?.toISOString() ?? null,
    contactName: primary?.fullName ?? null,
    contactEmail: primary?.email ?? null,
    contactPhone: primary?.phone ?? null,
    contactDesignation: primary?.designation ?? null,
    counts: counts ?? { sims: 0, activeSims: 0, machines: 0, renewals: 0, expiringSoon: 0 },
    createdAt: company.createdAt.toISOString(),
    updatedAt: company.updatedAt.toISOString(),
  };
}

export type MachineWithRelations = Prisma.MachineGetPayload<{
  include: {
    company: true;
    sims: { select: { id: true; internalId: true; mobileNumber: true; expiryDate: true } };
  };
}>;

export function mapMachine(machine: MachineWithRelations): MachineDto {
  const sim = machine.sims[0];
  const expiryDate = sim ? fromDbDate(sim.expiryDate) : null;
  return {
    id: machine.id,
    name: machine.name,
    model: machine.model,
    serialNumber: machine.serialNumber,
    company: { id: machine.company.id, name: machine.company.name },
    sim:
      sim && expiryDate !== undefined
        ? {
            id: sim.id,
            internalId: sim.internalId,
            mobileNumber: sim.mobileNumber,
            validityStatus: getValidityStatus(expiryDate, EXPIRY_WARNING_DAYS),
          }
        : null,
    installationDate: fromDbDate(machine.installationDate),
    status: machine.status,
    notes: machine.notes,
    createdAt: machine.createdAt.toISOString(),
    updatedAt: machine.updatedAt.toISOString(),
  };
}

export type NotificationWithRelations = Prisma.NotificationGetPayload<{
  include: { sim: { include: { company: true } } };
}>;

export function mapNotification(notification: NotificationWithRelations): NotificationDto {
  return {
    id: notification.id,
    sim: notification.sim
      ? {
          id: notification.sim.id,
          internalId: notification.sim.internalId,
          mobileNumber: notification.sim.mobileNumber,
        }
      : null,
    company: notification.sim?.company
      ? { id: notification.sim.company.id, name: notification.sim.company.name }
      : null,
    reminderType: notification.reminderType,
    reminderDays: notification.reminderDays,
    expiryCycle: fromDbDate(notification.expiryCycle)!,
    recipientEmail: notification.recipientEmail,
    ccEmails: notification.ccEmails,
    subject: notification.subject,
    status: notification.status,
    attempts: notification.attempts,
    maxAttempts: notification.maxAttempts,
    lastError: notification.lastError,
    nextRetryAt: notification.nextRetryAt?.toISOString() ?? null,
    scheduledFor: notification.scheduledFor.toISOString(),
    sentAt: notification.sentAt?.toISOString() ?? null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export type ActivityWithUser = Prisma.ActivityLogGetPayload<{ include: { user: true } }>;

export function mapActivity(activity: ActivityWithUser): ActivityDto {
  return {
    id: activity.id,
    action: activity.action,
    description: activity.description,
    entityType: activity.entityType,
    entityId: activity.entityId,
    user: activity.user
      ? { id: activity.user.id, fullName: fullName(activity.user) }
      : null,
    metadata: (activity.metadata as Record<string, unknown> | null) ?? null,
    createdAt: activity.createdAt.toISOString(),
  };
}

export { fullName, env };
