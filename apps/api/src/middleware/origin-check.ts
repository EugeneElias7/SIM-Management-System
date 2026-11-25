import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { forbidden } from '../lib/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function originOf(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Defence-in-depth CSRF protection for cookie-authenticated requests.
 * SameSite cookies are the primary control; this validates browser origins.
 */
export function originCheck(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const allowed = new Set(
    [...env.WEB_ORIGINS, env.APP_URL, env.API_URL]
      .map((value) => originOf(value))
      .filter((value): value is string => Boolean(value)),
  );

  const source = req.get('origin') ?? req.get('referer');
  if (!source) {
    // Non-browser clients (scripts, monitoring, server-to-server) do not send
    // Origin/Referer. Session cookies are not sent cross-site by browsers.
    next();
    return;
  }

  const origin = originOf(source);
  if (!origin || !allowed.has(origin)) {
    next(forbidden('The request origin is not allowed.'));
    return;
  }

  next();
}
