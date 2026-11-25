import type { Request } from 'express';
import type { UserDto } from '@san/shared';
import type { LoginInput } from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from '../../lib/password.js';
import { createOpaqueToken, hashToken } from '../../lib/tokens.js';
import { conflict, notFound, unauthorized, validationError } from '../../lib/errors.js';
import { recordActivity } from '../../lib/audit.js';
import { env } from '../../config/env.js';
import { sendEmail } from '../../services/email/mailer.js';
import { renderPasswordResetEmail } from '../../services/email/templates.js';
import { fullName } from '../../lib/mappers.js';

const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;
const RESET_TOKEN_MINUTES = 60;

type UserRecord = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  mustChangePassword: boolean;
  role: { name: string; permissions: string[] };
};

function toUserDto(user: UserRecord): UserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role.name,
    permissions: user.role.permissions,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
    ...(user.mustChangePassword ? { mustChangePassword: true } : {}),
  } as UserDto;
}

function requestMeta(req: Request) {
  return { ipAddress: req.ip, userAgent: req.get('user-agent') ?? null };
}

export async function login(input: LoginInput, req: Request) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { role: true },
  });

  const storedHash = user && !user.archivedAt ? user.passwordHash : DUMMY_PASSWORD_HASH;
  const passwordValid = await verifyPassword(storedHash, input.password);

  if (!user || user.archivedAt || !user.isActive || !passwordValid) {
    throw unauthorized('Invalid email or password.');
  }

  const ttlMs = input.rememberMe
    ? REMEMBER_DAYS * 24 * 60 * 60 * 1000
    : SESSION_HOURS * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const meta = requestMeta(req);

  await prisma.$transaction(async (tx) => {
    await tx.session.create({
      data: {
        userId: user.id,
        tokenHash,
        rememberMe: input.rememberMe,
        expiresAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
    await tx.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await recordActivity(tx, {
      userId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user.id,
      description: `${fullName(user)} signed in.`,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });
  });

  return {
    token,
    expiresAt,
    rememberMe: input.rememberMe,
    user: toUserDto({ ...user, lastLoginAt: new Date() }),
  };
}

export async function logout(userId: string, sessionId: string, req: Request) {
  const meta = requestMeta(req);
  await prisma.$transaction(async (tx) => {
    await tx.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordActivity(tx, {
      userId,
      action: 'AUTH_LOGOUT',
      entityType: 'USER',
      entityId: userId,
      description: 'Administrator signed out.',
      ...meta,
    });
  });
}

export async function getCurrentUser(userId: string): Promise<UserDto> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user || user.archivedAt || !user.isActive) throw unauthorized();
  return toUserDto(user);
}

export async function forgotPassword(email: string): Promise<{ resetUrl?: string }> {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond the same way to avoid account enumeration.
  if (!user || user.archivedAt || !user.isActive) return {};

  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    await tx.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });
    await recordActivity(tx, {
      userId: user.id,
      action: 'AUTH_PASSWORD_RESET_REQUESTED',
      entityType: 'USER',
      entityId: user.id,
      description: 'Password reset requested.',
    });
  });

  const resetUrl = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const emailContent = renderPasswordResetEmail({
    recipientName: fullName(user),
    resetUrl,
    expiresInMinutes: RESET_TOKEN_MINUTES,
    appUrl: env.APP_URL,
  });

  try {
    await sendEmail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch {
    // The API response stays generic; operators can inspect logs.
    // A failed email is not exposed to the requester.
  }

  const expose =
    env.AUTH_EXPOSE_RESET_LINK && (env.NODE_ENV === 'development' || env.NODE_ENV === 'test');
  return expose ? { resetUrl } : {};
}

export async function resetPassword(
  token: string,
  password: string,
  confirmPassword: string,
  req: Request,
) {
  if (password !== confirmPassword) {
    throw validationError('Passwords do not match.', { confirmPassword: ['Passwords do not match.'] });
  }
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (
    !record ||
    record.usedAt ||
    record.expiresAt.getTime() <= Date.now() ||
    !record.user.isActive ||
    record.user.archivedAt
  ) {
    throw validationError('This password reset link is invalid or has expired.', {
      token: ['This reset link is invalid or has expired.'],
    });
  }

  const passwordHash = await hashPassword(password);
  const meta = requestMeta(req);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false },
    });
    await tx.passwordResetToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });
    await tx.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordActivity(tx, {
      userId: record.userId,
      action: 'AUTH_PASSWORD_RESET',
      entityType: 'USER',
      entityId: record.userId,
      description: 'Password reset completed; all existing sessions were revoked.',
      ...meta,
    });
  });
}

export async function changePassword(
  userId: string,
  sessionId: string,
  input: { currentPassword: string; newPassword: string; confirmPassword: string },
  req: Request,
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Account not found.');
  if (input.newPassword !== input.confirmPassword) {
    throw validationError('Passwords do not match.', { confirmPassword: ['Passwords do not match.'] });
  }
  const valid = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!valid) {
    throw validationError('Current password is incorrect.', {
      currentPassword: ['Current password is incorrect.'],
    });
  }
  if (await verifyPassword(user.passwordHash, input.newPassword)) {
    throw validationError('Choose a password you have not used before.', {
      newPassword: ['New password must differ from the current password.'],
    });
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false },
    });
    await tx.session.updateMany({
      where: { userId, id: { not: sessionId }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordActivity(tx, {
      userId,
      action: 'AUTH_PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: userId,
      description: 'Administrator changed their password.',
      ...requestMeta(req),
    });
  });
}

export async function updateProfile(
  userId: string,
  input: { firstName: string; lastName: string; email: string },
  req: Request,
): Promise<UserDto> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    throw conflict('Another account already uses this email address.', {
      email: ['This email address is already in use.'],
    });
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { firstName: input.firstName, lastName: input.lastName, email: input.email },
    include: { role: true },
  });
  await recordActivity(prisma, {
    userId,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'USER',
    entityId: userId,
    description: 'Administrator profile details updated.',
    ...requestMeta(req),
  });
  return toUserDto(user);
}
