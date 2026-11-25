import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { env, isTest } from '../config/env.js';

const transport =
  env.NODE_ENV === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          singleLine: true,
        },
      }
    : undefined;

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL,
  base: { service: 'san-sim' },
  transport,
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'password', '*.password', '*.passwordHash'],
    censor: '[redacted]',
  },
});

export function newRequestId(): string {
  return randomUUID();
}
