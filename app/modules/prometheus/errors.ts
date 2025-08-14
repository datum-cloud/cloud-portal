/**
 * Custom error classes for Prometheus integration
 */

export class PrometheusError extends Error {
  public readonly type: 'network' | 'query' | 'timeout' | 'unknown';
  public readonly statusCode?: number;
  public readonly details?: string;

  constructor(
    message: string,
    type: 'network' | 'query' | 'timeout' | 'unknown' = 'unknown',
    statusCode?: number,
    details?: string
  ) {
    super(message);
    this.name = 'PrometheusError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PrometheusError);
    }
  }

  /**
   * Create a network error
   */
  static network(message: string, statusCode?: number, details?: string): PrometheusError {
    return new PrometheusError(message, 'network', statusCode, details);
  }

  /**
   * Create a query error
   */
  static query(message: string, details?: string): PrometheusError {
    return new PrometheusError(message, 'query', undefined, details);
  }

  /**
   * Create a timeout error
   */
  static timeout(message: string): PrometheusError {
    return new PrometheusError(message, 'timeout');
  }

  /**
   * Create an unknown error
   */
  static unknown(message: string, details?: string): PrometheusError {
    return new PrometheusError(message, 'unknown', undefined, details);
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      statusCode: this.statusCode,
      details: this.details,
      stack: this.stack,
    };
  }
}

export class QueryValidationError extends Error {
  public readonly field: string;
  public readonly value: any;

  constructor(message: string, field: string, value: any) {
    super(message);
    this.name = 'QueryValidationError';
    this.field = field;
    this.value = value;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, QueryValidationError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      field: this.field,
      value: this.value,
      stack: this.stack,
    };
  }
}

export class ChartDataError extends Error {
  public readonly dataType: string;
  public readonly expectedFormat: string;

  constructor(message: string, dataType: string, expectedFormat: string) {
    super(message);
    this.name = 'ChartDataError';
    this.dataType = dataType;
    this.expectedFormat = expectedFormat;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ChartDataError);
    }
  }

  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      dataType: this.dataType,
      expectedFormat: this.expectedFormat,
      stack: this.stack,
    };
  }
}
