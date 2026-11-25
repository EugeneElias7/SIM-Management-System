import type { ApiErrorBody } from '@san/shared';

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;
  requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fields?: Record<string, string[]>,
    requestId?: string,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.requestId = requestId;
  }
}

export function apiPath(path: string): string {
  if (path.startsWith('http')) return path;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `/api${normalized}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(apiPath(path), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    if (isJson) {
      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = null;
      }
    }
    throw new ApiError(
      response.status,
      body?.error?.code ?? 'HTTP_ERROR',
      body?.error?.message ?? `Request failed with status ${response.status}.`,
      body?.error?.fields,
      body?.requestId,
    );
  }

  if (response.status === 204) return undefined as T;
  if (!isJson) return (await response.blob()) as T;
  return (await response.json()) as T;
}

export function buildQuery(params: Record<string, unknown>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((item) => search.append(key, String(item)));
    } else {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}
