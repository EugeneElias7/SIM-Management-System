export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string[]>;
  readonly details?: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    options?: { fields?: Record<string, string[]>; details?: unknown },
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = options?.fields;
    this.details = options?.details;
  }
}

export const badRequest = (message: string, fields?: Record<string, string[]>) =>
  new ApiError(400, 'BAD_REQUEST', message, { fields });

export const unauthorized = (message = 'Please sign in to continue.') =>
  new ApiError(401, 'UNAUTHORIZED', message);

export const forbidden = (message = 'You do not have permission to perform this action.') =>
  new ApiError(403, 'FORBIDDEN', message);

export const notFound = (message = 'The requested record was not found.') =>
  new ApiError(404, 'NOT_FOUND', message);

export const conflict = (message: string, fields?: Record<string, string[]>) =>
  new ApiError(409, 'CONFLICT', message, { fields });

export const validationError = (message: string, fields?: Record<string, string[]>) =>
  new ApiError(422, 'VALIDATION_ERROR', message, { fields });

export const tooManyRequests = (message = 'Too many requests. Please try again later.') =>
  new ApiError(429, 'RATE_LIMITED', message);

export const serviceUnavailable = (message = 'The service is temporarily unavailable.') =>
  new ApiError(503, 'SERVICE_UNAVAILABLE', message);
