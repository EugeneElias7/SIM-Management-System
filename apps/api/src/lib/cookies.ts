import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: env.COOKIE_SAME_SITE,
  path: '/',
};

export function setSessionCookie(
  res: Response,
  token: string,
  expiresAt: Date,
  rememberMe: boolean,
): void {
  res.cookie(env.SESSION_COOKIE_NAME, token, {
    ...baseOptions,
    ...(rememberMe ? { expires: expiresAt } : {}),
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, baseOptions);
}

export function readSessionCookie(cookies: Record<string, unknown>): string | null {
  const raw = cookies[env.SESSION_COOKIE_NAME];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}
