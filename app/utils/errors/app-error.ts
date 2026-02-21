import * as Sentry from '@sentry/react-router';

export interface ErrorDetail {
  path: string[];
  message: string;
  code?: string;
}

export interface K8sErrorDetails {
  kind?: string;
  name?: string;
  group?: string;
}

export interface SerializedError {
  code: string;
  message: string;
  status: number;
  details?: ErrorDetail[];
  requestId?: string;
  sentryEventId?: string;
  originalMessage?: string;
  k8sReason?: string;
  k8sDetails?: K8sErrorDetails;
}

export class AppError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: ErrorDetail[];
  public readonly requestId?: string;
  public readonly sentryEventId?: string;
  public readonly originalMessage?: string;
  public readonly k8sReason?: string;
  public readonly k8sDetails?: K8sErrorDetails;

  constructor(
    message: string,
    options: {
      code?: string;
      status?: number;
      details?: ErrorDetail[];
      requestId?: string;
      cause?: unknown;
      captureToSentry?: boolean;
      originalMessage?: string;
      k8sReason?: string;
      k8sDetails?: K8sErrorDetails;
    } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'AppError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.status = options.status ?? 500;
    this.details = options.details;
    this.requestId = options.requestId;
    this.originalMessage = options.originalMessage;
    this.k8sReason = options.k8sReason;
    this.k8sDetails = options.k8sDetails;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    if (options.captureToSentry ?? this.status >= 500) {
      this.sentryEventId = this.captureToSentry();
    }
  }

  private captureToSentry(): string {
    return Sentry.captureException(this, {
      tags: {
        error_code: this.code,
        request_id: this.requestId,
      },
      extra: {
        details: this.details,
        status: this.status,
      },
      fingerprint: [this.code, this.message],
    });
  }

  toJSON(): SerializedError {
    return {
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
      requestId: this.requestId,
      sentryEventId: this.sentryEventId,
      originalMessage: this.originalMessage,
      k8sReason: this.k8sReason,
      k8sDetails: this.k8sDetails,
    };
  }

  toResponse(): Response {
    return new Response(JSON.stringify(this.toJSON()), {
      status: this.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: ErrorDetail[], requestId?: string) {
    super(message, {
      code: 'VALIDATION_ERROR',
      status: 400,
      details,
      requestId,
      captureToSentry: false,
    });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', requestId?: string) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      status: 401,
      requestId,
      captureToSentry: false,
    });
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'Permission denied', requestId?: string) {
    super(message, {
      code: 'AUTHORIZATION_ERROR',
      status: 403,
      requestId,
      captureToSentry: false,
    });
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, identifier?: string, requestId?: string) {
    const message = identifier ? `${resource} '${identifier}' not found` : `${resource} not found`;
    super(message, {
      code: 'NOT_FOUND',
      status: 404,
      requestId,
      captureToSentry: false,
    });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string, requestId?: string) {
    super(message, {
      code: 'CONFLICT',
      status: 409,
      requestId,
      captureToSentry: false,
    });
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  public readonly retryAfter?: number;

  constructor(retryAfter?: number, requestId?: string) {
    super('Too many requests', {
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
      requestId,
      captureToSentry: false,
    });
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}
