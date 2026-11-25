import { createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env.js';

export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/** HMAC-SHA256 with a server-side pepper. Raw tokens are never persisted. */
export function hashToken(token: string): string {
  return createHash('sha256')
    .update(`${env.SESSION_SECRET}:${token}`)
    .digest('hex');
}
