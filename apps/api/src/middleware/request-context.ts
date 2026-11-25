import type { NextFunction, Request, Response } from 'express';
import { newRequestId } from '../lib/logger.js';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const inbound = req.get('x-request-id');
  req.requestId = inbound && /^[a-zA-Z0-9-]{8,80}$/.test(inbound) ? inbound : newRequestId();
  res.setHeader('x-request-id', req.requestId);
  next();
}
