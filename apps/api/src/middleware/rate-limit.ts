import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env, isTest } from '../config/env.js';
import { tooManyRequests } from '../lib/errors.js';

const disabled = isTest || env.RATE_LIMIT_DISABLED;

function limiter(options: {
  windowMs: number;
  limit: number;
  message: string;
}): RequestHandler {
  if (disabled) {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(tooManyRequests(options.message)),
  });
}

export const globalLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: 'Too many requests. Please try again later.',
});

export const authLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
});

export const passwordResetLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 8,
  message: 'Too many password reset attempts. Please try again later.',
});

export const importLimiter = limiter({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: 'Too many imports. Please try again later.',
});

export const reportLimiter = limiter({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  message: 'Too many report downloads. Please wait and try again.',
});
