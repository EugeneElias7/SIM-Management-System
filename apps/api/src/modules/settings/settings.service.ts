import { Prisma } from '@prisma/client';
import type { AppPreferences, OrganizationSettings } from '@san/shared';
import { appPreferencesSchema, organizationSettingsSchema } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { recordActivity } from '../../lib/audit.js';
import type { ActorContext } from '../sims/sim.service.js';

export const ORGANIZATION_SETTING_KEY = 'organization';
export const PREFERENCES_SETTING_KEY = 'preferences';

export const DEFAULT_ORGANIZATION: OrganizationSettings = {
  name: 'SAN SOLUTION',
  legalName: 'SAN SOLUTION',
  email: '',
  phone: '',
  website: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
  taxId: '',
};

export const DEFAULT_PREFERENCES: AppPreferences = {
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD MMM YYYY',
  currency: 'INR',
  defaultPageSize: 20,
};

async function readJsonSetting(key: string): Promise<unknown> {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  const raw = await readJsonSetting(ORGANIZATION_SETTING_KEY);
  const parsed = organizationSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_ORGANIZATION;
}

export async function getAppPreferences(): Promise<AppPreferences> {
  const raw = await readJsonSetting(PREFERENCES_SETTING_KEY);
  const parsed = appPreferencesSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : DEFAULT_PREFERENCES;
}

export async function updateOrganizationSettings(
  input: OrganizationSettings,
  actor: ActorContext,
): Promise<OrganizationSettings> {
  await prisma.systemSetting.upsert({
    where: { key: ORGANIZATION_SETTING_KEY },
    update: { value: input as unknown as Prisma.InputJsonValue, updatedById: actor.userId },
    create: {
      key: ORGANIZATION_SETTING_KEY,
      value: input as unknown as Prisma.InputJsonValue,
      description: 'SAN SOLUTION organization profile',
      updatedById: actor.userId,
    },
  });
  await recordActivity(prisma, {
    ...actor,
    action: 'ORGANIZATION_SETTINGS_UPDATED',
    entityType: 'SYSTEM',
    description: 'Organization profile settings were updated.',
    metadata: { name: input.name },
  });
  return input;
}

export async function updateAppPreferences(
  input: AppPreferences,
  actor: ActorContext,
): Promise<AppPreferences> {
  await prisma.systemSetting.upsert({
    where: { key: PREFERENCES_SETTING_KEY },
    update: { value: input as unknown as Prisma.InputJsonValue, updatedById: actor.userId },
    create: {
      key: PREFERENCES_SETTING_KEY,
      value: input as unknown as Prisma.InputJsonValue,
      description: 'Application display and localization preferences',
      updatedById: actor.userId,
    },
  });
  await recordActivity(prisma, {
    ...actor,
    action: 'APP_PREFERENCES_UPDATED',
    entityType: 'SYSTEM',
    description: 'Application preferences were updated.',
    metadata: { ...input },
  });
  return input;
}

export async function getSettingsBundle() {
  const [organization, preferences] = await Promise.all([
    getOrganizationSettings(),
    getAppPreferences(),
  ]);
  return { organization, preferences };
}
