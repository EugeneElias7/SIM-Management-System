import { createServer } from 'node:http';
import { createApp } from './app.js';
import { env, validateEnv } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { stopProducer } from './queues/index.js';

async function main(): Promise<void> {
  validateEnv();
  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    logger.info(
      { port: env.PORT, nodeEnv: env.NODE_ENV, serveWeb: env.SERVE_WEB },
      `SAN SOLUTION API listening on http://localhost:${env.PORT}`,
    );
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down API');
    const force = setTimeout(() => {
      logger.warn('Forcing shutdown after timeout');
      process.exit(1);
    }, 12_000);
    force.unref();

    server.close(async (error) => {
      try {
        await stopProducer();
        await prisma.$disconnect();
      } catch (disconnectError) {
        logger.error({ err: disconnectError }, 'Error during shutdown');
      }
      if (error) {
        logger.error({ err: error }, 'HTTP server closed with an error');
        process.exit(1);
      }
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error({ err: reason }, 'Unhandled promise rejection');
  });
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught exception');
    void shutdown('uncaughtException');
  });
}

main().catch((error) => {
  logger.error({ err: error }, 'Failed to start API');
  process.exit(1);
});
