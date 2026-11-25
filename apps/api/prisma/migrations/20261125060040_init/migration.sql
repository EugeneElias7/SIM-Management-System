-- CreateEnum
CREATE TYPE "NetworkProvider" AS ENUM ('AIRTEL', 'JIO', 'VI', 'BSNL', 'OTHER');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('IN_STOCK', 'ACTIVE', 'SUSPENDED', 'FAULTY', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "MachineStatus" AS ENUM ('OPERATIONAL', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'DECOMMISSIONED');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('BEFORE_EXPIRY', 'ON_EXPIRY', 'POST_EXPIRY');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('EMAIL');

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "roleId" UUID NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "rememberMe" BOOLEAN NOT NULL DEFAULT false,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "designation" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "machines" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "model" TEXT,
    "serialNumber" TEXT NOT NULL,
    "companyId" UUID NOT NULL,
    "installationDate" DATE,
    "status" "MachineStatus" NOT NULL DEFAULT 'OPERATIONAL',
    "notes" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "machines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sims" (
    "id" UUID NOT NULL,
    "internalId" TEXT NOT NULL,
    "mobileNumber" TEXT NOT NULL,
    "iccid" TEXT NOT NULL,
    "imsi" TEXT,
    "provider" "NetworkProvider" NOT NULL,
    "activationDate" DATE,
    "expiryDate" DATE,
    "operationalStatus" "OperationalStatus" NOT NULL DEFAULT 'IN_STOCK',
    "companyId" UUID,
    "machineId" UUID,
    "contactId" UUID,
    "notes" TEXT,
    "lastRenewedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdById" UUID,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim_assignments" (
    "id" UUID NOT NULL,
    "simId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "machineId" UUID,
    "contactId" UUID,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "assignedById" UUID,
    "unassignedById" UUID,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sim_renewals" (
    "id" UUID NOT NULL,
    "simId" UUID NOT NULL,
    "companyId" UUID,
    "previousExpiryDate" DATE,
    "newExpiryDate" DATE NOT NULL,
    "renewalDate" DATE NOT NULL,
    "referenceNumber" TEXT,
    "cost" DECIMAL(12,2),
    "notes" TEXT,
    "renewedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sim_renewals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysBefore" INTEGER[] DEFAULT ARRAY[30, 15, 7]::INTEGER[],
    "notifyOnExpiry" BOOLEAN NOT NULL DEFAULT true,
    "postExpiryWeekly" BOOLEAN NOT NULL DEFAULT true,
    "postExpiryIntervalDays" INTEGER NOT NULL DEFAULT 7,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sendHour" INTEGER NOT NULL DEFAULT 9,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "lastScanAt" TIMESTAMP(3),
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "simId" UUID,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'EMAIL',
    "reminderType" "ReminderType" NOT NULL,
    "reminderDays" INTEGER NOT NULL,
    "expiryCycle" DATE NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "ccEmails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subject" TEXT NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastError" TEXT,
    "providerMessageId" TEXT,
    "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "companyId" UUID,
    "simId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_roleId_idx" ON "users"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_tokenHash_key" ON "password_reset_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_userId_idx" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "companies_name_key" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_name_idx" ON "companies"("name");

-- CreateIndex
CREATE INDEX "companies_archivedAt_idx" ON "companies"("archivedAt");

-- CreateIndex
CREATE INDEX "contacts_companyId_idx" ON "contacts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "machines_serialNumber_key" ON "machines"("serialNumber");

-- CreateIndex
CREATE INDEX "machines_companyId_idx" ON "machines"("companyId");

-- CreateIndex
CREATE INDEX "machines_serialNumber_idx" ON "machines"("serialNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sims_internalId_key" ON "sims"("internalId");

-- CreateIndex
CREATE UNIQUE INDEX "sims_mobileNumber_key" ON "sims"("mobileNumber");

-- CreateIndex
CREATE UNIQUE INDEX "sims_iccid_key" ON "sims"("iccid");

-- CreateIndex
CREATE UNIQUE INDEX "sims_imsi_key" ON "sims"("imsi");

-- CreateIndex
CREATE UNIQUE INDEX "sims_machineId_key" ON "sims"("machineId");

-- CreateIndex
CREATE INDEX "sims_companyId_idx" ON "sims"("companyId");

-- CreateIndex
CREATE INDEX "sims_provider_idx" ON "sims"("provider");

-- CreateIndex
CREATE INDEX "sims_operationalStatus_idx" ON "sims"("operationalStatus");

-- CreateIndex
CREATE INDEX "sims_expiryDate_idx" ON "sims"("expiryDate");

-- CreateIndex
CREATE INDEX "sims_archivedAt_idx" ON "sims"("archivedAt");

-- CreateIndex
CREATE INDEX "sim_assignments_simId_isActive_idx" ON "sim_assignments"("simId", "isActive");

-- CreateIndex
CREATE INDEX "sim_assignments_companyId_idx" ON "sim_assignments"("companyId");

-- CreateIndex
CREATE INDEX "sim_assignments_machineId_idx" ON "sim_assignments"("machineId");

-- CreateIndex
CREATE INDEX "sim_renewals_simId_idx" ON "sim_renewals"("simId");

-- CreateIndex
CREATE INDEX "sim_renewals_companyId_idx" ON "sim_renewals"("companyId");

-- CreateIndex
CREATE INDEX "sim_renewals_renewalDate_idx" ON "sim_renewals"("renewalDate");

-- CreateIndex
CREATE UNIQUE INDEX "notifications_idempotencyKey_key" ON "notifications"("idempotencyKey");

-- CreateIndex
CREATE INDEX "notifications_status_scheduledFor_idx" ON "notifications"("status", "scheduledFor");

-- CreateIndex
CREATE INDEX "notifications_simId_idx" ON "notifications"("simId");

-- CreateIndex
CREATE INDEX "notifications_expiryCycle_idx" ON "notifications"("expiryCycle");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_entityType_entityId_idx" ON "activity_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "activity_logs_companyId_idx" ON "activity_logs"("companyId");

-- CreateIndex
CREATE INDEX "activity_logs_simId_idx" ON "activity_logs"("simId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "machines" ADD CONSTRAINT "machines_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sims" ADD CONSTRAINT "sims_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sims" ADD CONSTRAINT "sims_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sims" ADD CONSTRAINT "sims_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sims" ADD CONSTRAINT "sims_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sims" ADD CONSTRAINT "sims_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_simId_fkey" FOREIGN KEY ("simId") REFERENCES "sims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "machines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_assignments" ADD CONSTRAINT "sim_assignments_unassignedById_fkey" FOREIGN KEY ("unassignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_renewals" ADD CONSTRAINT "sim_renewals_simId_fkey" FOREIGN KEY ("simId") REFERENCES "sims"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_renewals" ADD CONSTRAINT "sim_renewals_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sim_renewals" ADD CONSTRAINT "sim_renewals_renewedById_fkey" FOREIGN KEY ("renewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_simId_fkey" FOREIGN KEY ("simId") REFERENCES "sims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_simId_fkey" FOREIGN KEY ("simId") REFERENCES "sims"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Business-rule constraints (added by hand because Prisma cannot express them)
-- ---------------------------------------------------------------------------

-- Human-friendly internal SIM identifiers are generated from a PostgreSQL
-- sequence. This remains transactional and safe across concurrent writers.
CREATE SEQUENCE IF NOT EXISTS "sim_internal_id_seq" START WITH 1 INCREMENT BY 1;

-- A SIM may only have one current assignment, but unlimited historical rows.
CREATE UNIQUE INDEX "sim_assignments_one_active_per_sim"
  ON "sim_assignments" ("simId")
  WHERE "isActive" = true;

-- A company has at most one primary contact at any time.
CREATE UNIQUE INDEX "contacts_one_primary_per_company"
  ON "contacts" ("companyId")
  WHERE "isPrimary" = true AND "archivedAt" IS NULL;

-- Validity dates must make sense.
ALTER TABLE "sims" ADD CONSTRAINT "sims_validity_date_order"
  CHECK ("expiryDate" IS NULL OR "activationDate" IS NULL OR "expiryDate" >= "activationDate");

-- Renewals always extend validity and preserve the previous expiry.
ALTER TABLE "sim_renewals" ADD CONSTRAINT "sim_renewals_extends_validity"
  CHECK ("previousExpiryDate" IS NULL OR "newExpiryDate" > "previousExpiryDate");

-- Notification engine-safe configuration values.
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_interval_positive"
  CHECK ("postExpiryIntervalDays" > 0);
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attempts_non_negative"
  CHECK ("attempts" >= 0 AND "maxAttempts" > 0);

-- Fast retrieval of due retries.
CREATE INDEX "notifications_retry_idx"
  ON "notifications" ("nextRetryAt")
  WHERE "status" = 'FAILED';
