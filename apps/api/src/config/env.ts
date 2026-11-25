import 'dotenv/config';

export const env = {
  NODE_ENV: (process.env.NODE_ENV ?? 'development') as 'development' | 'test' | 'production',
  PORT: Number(process.env.PORT ?? 4000),
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  APP_URL: process.env.APP_URL ?? 'http://localhost:5173',
  API_URL: process.env.API_URL ?? 'http://localhost:4000',
  WEB_ORIGINS: (process.env.WEB_ORIGINS ?? process.env.APP_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  SESSION_COOKIE_NAME: process.env.SESSION_COOKIE_NAME ?? 'san_session',
  SESSION_SECRET: process.env.SESSION_SECRET ?? '',
  COOKIE_SECURE: process.env.COOKIE_SECURE
    ? process.env.COOKIE_SECURE === 'true'
    : process.env.NODE_ENV === 'production',
  COOKIE_SAME_SITE: (process.env.COOKIE_SAME_SITE ?? 'lax') as 'lax' | 'strict' | 'none',
  SERVE_WEB: process.env.SERVE_WEB === 'true',
  WEB_DIST_DIR: process.env.WEB_DIST_DIR ?? '',
  TRUST_PROXY: process.env.TRUST_PROXY === 'true',
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',
  APP_TIMEZONE: process.env.APP_TIMEZONE ?? 'Asia/Kolkata',
  EMAIL_TRANSPORT: (process.env.EMAIL_TRANSPORT ?? 'log') as 'smtp' | 'log',
  SMTP_HOST: process.env.SMTP_HOST ?? '',
  SMTP_PORT: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER ?? '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD ?? '',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME ?? 'SAN SOLUTION',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL ?? '',
  SMTP_REPLY_TO: process.env.SMTP_REPLY_TO ?? '',
  AUTH_EXPOSE_RESET_LINK: process.env.AUTH_EXPOSE_RESET_LINK === 'true',
  RATE_LIMIT_DISABLED: process.env.RATE_LIMIT_DISABLED === 'true',
  QUEUE_ENABLED: process.env.QUEUE_ENABLED !== 'false',
  // Daily at 09:00 India Standard Time. IST has no daylight saving.
  EXPIRY_SCAN_CRON: process.env.EXPIRY_SCAN_CRON ?? '0 9 * * *',
  EXPIRY_SCAN_TZ: process.env.EXPIRY_SCAN_TZ ?? 'Asia/Kolkata',
  SEED_DEMO_DATA: process.env.SEED_DEMO_DATA === 'true',
  SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL ?? 'admin@sansolution.in',
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD ?? '',
  SEED_ADMIN_FIRST_NAME: process.env.SEED_ADMIN_FIRST_NAME ?? 'System',
  SEED_ADMIN_LAST_NAME: process.env.SEED_ADMIN_LAST_NAME ?? 'Administrator',
} as const;

export function validateEnv(): void {
  const errors: string[] = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required.');
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) {
    errors.push('SESSION_SECRET must be at least 32 characters.');
  }
  if (env.NODE_ENV === 'production') {
    if (env.COOKIE_SAME_SITE === 'none' && !env.COOKIE_SECURE) {
      errors.push('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none.');
    }
    if (env.EMAIL_TRANSPORT === 'smtp') {
      if (!env.SMTP_HOST) errors.push('SMTP_HOST is required for SMTP transport.');
      if (!env.SMTP_FROM_EMAIL) errors.push('SMTP_FROM_EMAIL is required for SMTP transport.');
    }
  }
  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }
}

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
