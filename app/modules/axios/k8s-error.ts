import { type K8sErrorDetails } from '@/utils/errors/app-error';
import { parseK8sMessage } from '@/utils/errors/error-parser';

/** K8s Status object shape (from API error responses) */
export interface K8sStatus {
  kind: 'Status';
  apiVersion: string;
  status: 'Failure' | 'Success';
  message: string;
  reason?: string;
  code: number;
  details?: {
    name?: string;
    group?: string;
    kind?: string;
    causes?: Array<{ field?: string; message?: string; reason?: string }>;
  };
}

export function isK8sStatus(data: unknown): data is K8sStatus {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return obj.kind === 'Status' && typeof obj.message === 'string' && typeof obj.code === 'number';
}

export function mapK8sReasonToCode(reason: string | undefined, httpStatus: number): string {
  switch (reason) {
    case 'AlreadyExists':
      return 'CONFLICT';
    case 'NotFound':
      return 'NOT_FOUND';
    case 'Conflict':
      return 'CONFLICT';
    case 'Forbidden':
      return 'AUTHORIZATION_ERROR';
    case 'Unauthorized':
      return 'AUTHENTICATION_ERROR';
    case 'Invalid':
    case 'BadRequest':
      return 'VALIDATION_ERROR';
    case 'TooManyRequests':
      return 'RATE_LIMIT_EXCEEDED';
    default: {
      switch (httpStatus) {
        case 400:
          return 'VALIDATION_ERROR';
        case 401:
          return 'AUTHENTICATION_ERROR';
        case 403:
          return 'AUTHORIZATION_ERROR';
        case 404:
          return 'NOT_FOUND';
        case 409:
          return 'CONFLICT';
        case 429:
          return 'RATE_LIMIT_EXCEEDED';
        default:
          return 'API_ERROR';
      }
    }
  }
}

/** Parsed result from a K8s Status object */
export interface ParsedK8sError {
  message: string;
  originalMessage: string;
  code: string;
  k8sReason?: string;
  k8sDetails?: K8sErrorDetails;
  details?: Array<{ path: string[]; message: string; code?: string }>;
}

/**
 * Parse a K8s Status response into a structured error with user-friendly message.
 * Shared between client-side and server-side Axios interceptors.
 */
export function parseK8sStatusError(data: K8sStatus, httpStatus: number): ParsedK8sError {
  const parsedMessage = parseK8sMessage(data.message);
  const k8sDetails: K8sErrorDetails | undefined = data.details
    ? { kind: data.details.kind, name: data.details.name, group: data.details.group }
    : undefined;
  const details = data.details?.causes?.map((k8sCause) => ({
    path: k8sCause.field ? k8sCause.field.split('.') : [],
    message: k8sCause.message ?? '',
    code: k8sCause.reason,
  }));

  return {
    message: parsedMessage,
    originalMessage: data.message,
    code: mapK8sReasonToCode(data.reason, httpStatus),
    k8sReason: data.reason,
    k8sDetails,
    details: details?.length ? details : undefined,
  };
}
