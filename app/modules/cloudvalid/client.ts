/**
 * CloudValid HTTP Client
 */
import axios, { type AxiosInstance, type AxiosError } from 'axios';

interface CloudValidErrorResponse {
  errors:
    | {
        [key: string]: string[];
      }
    | string[];
}

export class CloudValidError extends Error {
  public readonly statusCode: number;
  public readonly errors: Record<string, string[]>;

  constructor(message: string, statusCode: number, errors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'CloudValidError';
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

export class CloudValidClient {
  private client: AxiosInstance;

  constructor(apiKey: string, apiUrl?: string) {
    this.client = axios.create({
      baseURL: apiUrl || 'https://api.cloudvalid.com/api/v2',
      timeout: 30000,
      params: {
        api_key: apiKey,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError<CloudValidErrorResponse>) => {
        throw this.handleError(error);
      }
    );
  }

  private handleError(error: AxiosError<CloudValidErrorResponse>): CloudValidError {
    const statusCode = error.response?.status || 500;
    const errorData = error.response?.data;

    if (errorData?.errors) {
      let errorMessage: string;
      let structuredErrors: Record<string, string[]> = {};

      if (Array.isArray(errorData.errors)) {
        // Handle array format: { "errors": ["message1", "message2"] }
        errorMessage = errorData.errors.join(', ');
        structuredErrors = { general: errorData.errors };
      } else {
        // Handle object format: { "errors": { "field": ["message"] } }
        const allErrors: string[] = [];
        Object.entries(errorData.errors).forEach(([field, messages]) => {
          messages.forEach((message: string) => {
            allErrors.push(`${field}: ${message}`);
          });
        });
        errorMessage =
          allErrors.length > 0 ? allErrors.join(', ') : 'An error occurred with the CloudValid API';
        structuredErrors = errorData.errors;
      }

      return new CloudValidError(errorMessage, statusCode, structuredErrors);
    }

    // Fallback for non-structured errors
    const fallbackMessage = error.response?.statusText || error.message || 'Unknown error occurred';
    return new CloudValidError(fallbackMessage, statusCode);
  }

  async get<T>(url: string, params?: any): Promise<T> {
    try {
      const response = await this.client.get<T>(url, { params });
      return response.data;
    } catch (error) {
      if (error instanceof CloudValidError) {
        throw error;
      }
      throw new CloudValidError('Network error occurred', 500);
    }
  }

  async post<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post<T>(url, data);
      return response.data;
    } catch (error) {
      if (error instanceof CloudValidError) {
        throw error;
      }
      throw new CloudValidError('Network error occurred', 500);
    }
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.patch<T>(url, data);
      return response.data;
    } catch (error) {
      if (error instanceof CloudValidError) {
        throw error;
      }
      throw new CloudValidError('Network error occurred', 500);
    }
  }
}
