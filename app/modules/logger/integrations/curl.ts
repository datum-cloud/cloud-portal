// app/modules/logger/integrations/curl.ts
import { LOGGER_CONFIG } from '../logger.config';

export interface CurlOptions {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export function generateCurl(options: CurlOptions): string {
  const { method, url, headers, body } = options;

  let curl = `curl -X ${method.toUpperCase()}`;

  // Add headers
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      let headerValue = value;

      // Redact authorization tokens in production
      if (LOGGER_CONFIG.redactTokens && key.toLowerCase() === 'authorization') {
        headerValue = value.replace(/Bearer\s+\S+/i, 'Bearer [REDACTED]');
      }

      // Use single quotes to prevent shell glob expansion
      const escapedValue = headerValue.replace(/'/g, "'\\''");
      curl += ` -H '${key}:${escapedValue}'`;
    }
  }

  // Add body
  if (body && method.toUpperCase() !== 'GET') {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const escapedBody = bodyStr.replace(/'/g, "'\\''");
    curl += ` --data '${escapedBody}'`;
  }

  // Add URL (double quotes for safety)
  curl += ` "${url}"`;

  return curl;
}
