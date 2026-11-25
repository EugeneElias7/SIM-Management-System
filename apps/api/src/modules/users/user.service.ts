import { Prisma } from '@prisma/client';
import type {
  AdminResetPasswordInput,
  ManagedUserDto,
  Paginated,
  RoleDto,
  UserCreateInput,
  UserUpdateInput,
} from '@san/shared';
import { prisma } from '../../lib/prisma.js';
import { conflict, notFound, validationError } from '../../lib/errors.js';
import { getPagination, paginationMeta } from '../../lib/pagination.js';
import { hashPassword } from '../../lib/password.js';
import { recordActivity } from '../../lib/audit.js';
import type { ActorContext } from '../sims/sim.service.js';

type UserWithRole = Prisma.UserGetPayload<{ include: { role: true } }>;

function toManagedUser(user: UserWithRole): ManagedUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    role: user.role.name,
    roleId: user.roleId,
    permissions: user.role.permissions,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function listRoles(): Promise<RoleDto[]> {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: { where: { archivedAt: null } } } } },
    orderBy: { name: 'asc' },
  });
  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    permissions: role.permissions,
    userCount: role._count.users,
  }));
}

export async function listUsers(input: {
  search?: string;
  roleId?: string;
  status?: 'active' | 'inactive';
  page: number;
  pageSize: number;
}): Promise<Paginated<ManagedUserDto>> {
  const where: Prisma.UserWhereInput = { archivedAt: null };
  if (input.roleId) where.roleId = input.roleId;
  if (input.status === 'active') where.isActive = true;
  if (input.status === 'inactive') where.isActive = false;
  if (input.search) {
    where.OR = [
      { firstName: { contains: input.search, mode: 'insensitive' } },
      { lastName: { contains: input.search, mode: 'insensitive' } },
      { email: { contains: input.search, mode: 'insensitive' } },
    ];
  }
  const { skip, take } = getPagination(input.page, input.pageSize);
  const [total, rows] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: { role: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      skip,
      take,
    }),
  ]);
  return {
    items: rows.map(toManagedUser),
    pagination: paginationMeta(total, input.page, input.pageSize),
  };
}

async function assertRoleExists(roleId: string): Promise<void> {
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { id: true } });
  if (!role) {
    throw validationError('Select a valid role.', { roleId: ['Select a valid role.'] });
  }
}

async function assertEmailAvailable(email: string, excludeUserId?: string): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  if (existing) {
    throw conflict('An account with this email address already exists.', {
      email: ['This email address is already registered.'],
    });
  }
}

export async function createUser(
  input: UserCreateInput,
  actor: ActorContext,
): Promise<ManagedUserDto> {
  await assertRoleExists(input.roleId);
  await assertEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
        passwordHash,
        isActive: input.isActive,
        mustChangePassword: true,
      },
      include: { role: true },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'USER_CREATED',
      entityType: 'USER',
      entityId: created.id,
      description: `User account ${input.email} was created.`,
      metadata: { email: input.email, role: created.role.name },
    });
    return created;
  });

  return toManagedUser(user);
}

export async function updateUser(
  userId: string,
  input: UserUpdateInput,
  actor: ActorContext,
): Promise<ManagedUserDto> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!existing || existing.archivedAt) throw notFound('User account not found.');
  await assertRoleExists(input.roleId);
  await assertEmailAvailable(input.email, userId);

  if (userId === actor.userId && !input.isActive) {
    throw validationError('You cannot deactivate your own account.', {
      isActive: ['You cannot deactivate the account you are signed in with.'],
    });
  }

  const user = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        roleId: input.roleId,
        isActive: input.isActive,
      },
      include: { role: true },
    });
    if (!input.isActive) {
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await recordActivity(tx, {
      ...actor,
      action: 'USER_UPDATED',
      entityType: 'USER',
      entityId: userId,
      description: `User account ${input.email} was updated.`,
      metadata: {
        email: input.email,
        role: updated.role.name,
        isActive: input.isActive,
        previousRole: existing.role.name,
      },
    });
    return updated;
  });

  return toManagedUser(user);
}

export async function resetUserPassword(
  userId: string,
  input: AdminResetPasswordInput,
  actor: ActorContext,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.archivedAt) throw notFound('User account not found.');
  const passwordHash = await hashPassword(input.password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        passwordChangedAt: new Date(),
        mustChangePassword: input.mustChangePassword,
      },
    });
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'USER_PASSWORD_RESET_BY_ADMIN',
      entityType: 'USER',
      entityId: userId,
      description: `An administrator reset the password for ${user.email}.`,
    });
  });
}

export async function archiveUser(userId: string, actor: ActorContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User account not found.');
  if (user.archivedAt) return;
  if (userId === actor.userId) {
    throw conflict('You cannot archive the account you are currently signed in with.');
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { archivedAt: new Date(), isActive: false },
    });
    await tx.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await recordActivity(tx, {
      ...actor,
      action: 'USER_ARCHIVED',
      entityType: 'USER',
      entityId: userId,
      description: `User account ${user.email} was archived and signed out.`,
    });
  });
}
