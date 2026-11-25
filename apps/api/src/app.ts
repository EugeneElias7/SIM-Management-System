import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { env, isTest } from './config/env.js';
import { requestContext } from './middleware/request-context.js';
import { requestLogger } from './middleware/request-logger.js';
import { originCheck } from './middleware/origin-check.js';
import { globalLimiter } from './middleware/rate-limit.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { apiRouter } from './routes.js';
import { healthRouter } from './modules/health/health.routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp(): Express {
  const app = express();

  if (env.TRUST_PROXY) app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", ...env.WEB_ORIGINS],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'same-origin' },
    }),
  );

  if (!isTest) {
    app.use(
      cors({
        origin(origin, callback) {
          if (!origin || env.WEB_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(null, false);
        },
        credentials: true,
      }),
    );
  }

  app.use(requestContext);
  app.use(requestLogger);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(cookieParser());

  app.get('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use('/api', originCheck);
  app.use('/api', globalLimiter, apiRouter);
  app.use('/api', notFoundHandler);

  const webDist = env.WEB_DIST_DIR || path.resolve(here, '../../web/dist');
  if (env.SERVE_WEB && existsSync(webDist)) {
    app.use(
      express.static(webDist, {
        index: false,
        maxAge: '1y',
        immutable: true,
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(webDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        name: 'SAN SOLUTION — SIM Management API',
        status: 'running',
        health: '/api/health',
      });
    });
  }

  app.use(errorHandler);
  return app;
}
