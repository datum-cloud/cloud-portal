import { ValidationError, type ErrorDetail } from './app-error';
import { z } from 'zod';

export function formatZodError(error: z.ZodError): ErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.map(String),
    message: issue.message,
    code: issue.code,
  }));
}

export function fromZodError(
  error: z.ZodError,
  message = 'Validation failed',
  requestId?: string
): ValidationError {
  const details = formatZodError(error);
  return new ValidationError(message, details, requestId);
}

export function parseOrThrow<T extends z.ZodType>(
  schema: T,
  data: unknown,
  options?: { message?: string; requestId?: string }
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw fromZodError(result.error, options?.message ?? 'Validation failed', options?.requestId);
  }

  return result.data;
}
