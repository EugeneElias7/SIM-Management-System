import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import multer from 'multer';
import { ApiError } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { isProduction } from '../config/env.js';

function zodFields(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'form';
    fields[path] = [...(fields[path] ?? []), issue.message];
  }
  return fields;
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} was not found.` },
    requestId: req.requestId,
  });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Please correct the highlighted fields.',
        fields: zodFields(error),
      },
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof ApiError) {
    if (error.status >= 500) {
      logger.error({ err: error, requestId: req.requestId }, 'api error');
    }
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
        ...(error.details && !isProduction ? { details: error.details } : {}),
      },
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === 'LIMIT_FILE_SIZE'
        ? 'The uploaded file must be 5 MB or smaller.'
        : 'The file could not be uploaded. Please check the file and try again.';
    res.status(400).json({
      error: { code: 'UPLOAD_ERROR', message },
      requestId: req.requestId,
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[])
        : ['record'];
      const fields: Record<string, string[]> = {};
      for (const key of target) {
        fields[key] = ['This value is already in use.'];
      }
      res.status(409).json({
        error: {
          code: 'DUPLICATE_RECORD',
          message: 'A record with these unique details already exists.',
          fields,
        },
        requestId: req.requestId,
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'The requested record was not found.' },
        requestId: req.requestId,
      });
      return;
    }
    if (error.code === 'P2003') {
      res.status(409).json({
        error: {
          code: 'RELATION_CONFLICT',
          message: 'This record is still referenced by other records.',
        },
        requestId: req.requestId,
      });
      return;
    }
  }

  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.' },
      requestId: req.requestId,
    });
    return;
  }

  logger.error(
    {
      requestId: req.requestId,
      err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    },
    'unhandled error',
  );
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred. Please try again or contact an administrator.',
    },
    requestId: req.requestId,
  });
}
