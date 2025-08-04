/**
 * Custom error class with HTTP status code and development logging
 * Extends the standard Error class with additional properties for web applications
 */
export class CustomError extends Error {
  status: number;
  statusText: string;

  /**
   * Creates a new CustomError instance
   * @param message - The error message
   * @param status - HTTP status code
   * @param cause - Optional underlying error that caused this error
   */
  constructor(message: string, status: number, cause?: Error) {
    super(message);
    this.name = 'CustomError';
    this.status = status;
    this.statusText = message;
    this.cause = cause;

    // Log the underlying cause in development for debugging
    if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development') {
      console.error(cause);
    }
  }
}

/**
 * Creates a 400 Bad Request error
 * @param message - The error message
 * @param cause - Optional underlying error
 * @returns CustomError with 400 status
 */
export function createBadRequestError(message: string, cause?: Error): CustomError {
  return new CustomError(message, 400, cause);
}

/**
 * Creates a 401 Unauthorized error
 * @param message - The error message
 * @param cause - Optional underlying error
 * @returns CustomError with 401 status
 */
export function createUnauthorizedError(message: string, cause?: Error): CustomError {
  return new CustomError(message, 401, cause);
}

/**
 * Creates a 403 Forbidden error
 * @param message - The error message
 * @param cause - Optional underlying error
 * @returns CustomError with 403 status
 */
export function createForbiddenError(message: string, cause?: Error): CustomError {
  return new CustomError(message, 403, cause);
}

/**
 * Creates a 404 Not Found error
 * @param message - The error message
 * @param cause - Optional underlying error
 * @returns CustomError with 404 status
 */
export function createNotFoundError(message: string, cause?: Error): CustomError {
  return new CustomError(message, 404, cause);
}

/**
 * Creates a 500 Internal Server Error
 * @param message - The error message
 * @param cause - Optional underlying error
 * @returns CustomError with 500 status
 */
export function createInternalServerError(message: string, cause?: Error): CustomError {
  return new CustomError(message, 500, cause);
}
