export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  type ErrorDetail,
  type SerializedError,
  type K8sErrorDetails,
} from './app-error';

export {
  HttpError,
  BadRequestError,
  NotFoundError as HttpNotFoundError,
  ValidationError as HttpValidationError,
  ConflictError as HttpConflictError,
  RateLimitError as HttpRateLimitError,
} from './http';

export {
  TokenError,
  AuthenticationError as AuthError,
  AuthorizationError as AuthzError,
  PermissionError,
  RefreshError,
  RefreshErrorType,
  categorizeRefreshError,
} from './auth';

export { formatZodError, fromZodError, parseOrThrow } from './error-formatter';

export { mapApiError } from './error-mapper';

export { parseK8sMessage } from './error-parser';
