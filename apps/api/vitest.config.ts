import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: [],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/san_sim_test?schema=public',
      SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
      APP_URL: 'http://localhost:5173',
      API_URL: 'http://localhost:4000',
      WEB_ORIGINS: 'http://localhost:5173',
      EMAIL_TRANSPORT: 'log',
      QUEUE_ENABLED: 'false',
      RATE_LIMIT_DISABLED: 'true',
      AUTH_EXPOSE_RESET_LINK: 'true',
    },
    testTimeout: 30_000,
  },
});
