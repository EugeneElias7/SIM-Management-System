import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../lib/prisma.js';
import { hashToken } from '../lib/tokens.js';
import { readSessionCookie, clearSessionCookie } from '../lib/cookies.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { asyncHandler } from '../lib/async-handler.js';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  mustChangePassword: boolean;
}

export interface AuthContext {
  user: AuthUser;
  sessionId: string;
}

export const requireAuth = asyncHandler(async (req, res, next) => {
  const raw = readSessionCookie(req.cookies as Record<string, unknown>);
  if (!raw) {
    next(unauthorized());
    return;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: { include: { role: true } } },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt.getTime() <= Date.now() ||
    !session.user.isActive ||
    session.user.archivedAt
  ) {
    clearSessionCookie(res);
    next(unauthorized('Your session has expired. Please sign in again.'));
    return;
  }

  req.auth = {
    sessionId: session.id,
    user: {
      id: session.user.id,
      email: session.user.email,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      role: session.user.role.name,
      permissions: session.user.role.permissions,
      mustChangePassword: session.user.mustChangePassword,
    },
  };

  // Avoid a write on every API request while keeping activity information fresh.
  if (Date.now() - session.lastUsedAt.getTime() > 5 * 60 * 1000) {
    void prisma.session
      .update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
  }

  next();
});

export function requirePermission(...required: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const auth = req.auth;
    if (!auth) {
      next(unauthorized());
      return;
    }
    const granted =
      auth.user.permissions.includes('*') ||
      required.every((permission) => auth.user.permissions.includes(permission));
    if (!granted) {
      next(forbidden());
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.auth.user.role)) {
      next(forbidden());
      return;
    }
    next();
  };
}
