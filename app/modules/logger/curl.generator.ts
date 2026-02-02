/**
 * Generic request config for curl generation.
 * Compatible with AxiosRequestConfig and simple fetch-style configs.
 */
export interface CurlRequestConfig {
  url?: string;
  baseURL?: string;
  method?: string;
  headers?: Record<string, string | number | boolean | null | undefined>;
  data?: unknown;
  params?: Record<string, unknown>;
}

export interface CurlOptions {
  /**
   * Pretty print JSON body with indentation
   * @default true
   */
  prettyPrint?: boolean;
  /**
   * Headers to redact (show as [REDACTED])
   * @example ['Authorization']
   */
  redactHeaders?: string[];
  /**
   * Custom redaction pattern for header values
   * @default '[REDACTED]'
   */
  redactPattern?: string;
}

/**
 * Generates a curl command from a request config.
 * Works with both Axios configs and simple fetch-style objects.
 *
 * @example
 * // Axios-style
 * generateCurl({ baseURL: 'https://api.example.com', url: '/users', method: 'GET' })
 *
 * @example
 * // Simple fetch-style (for gqlts)
 * generateCurl({
 *   url: 'https://api.example.com/graphql',
 *   method: 'POST',
 *   headers: { Authorization: 'Bearer token' },
 *   data: { query: '{ users { id } }' }
 * }, { redactHeaders: ['Authorization'] })
 */
export function generateCurl(config: CurlRequestConfig, options: CurlOptions = {}): string {
  const { prettyPrint = true, redactHeaders = [], redactPattern = '[REDACTED]' } = options;

  const parts: string[] = ['curl'];

  const method = (config.method ?? 'GET').toUpperCase();
  if (method !== 'GET') {
    parts.push(`-X ${method}`);
  }

  const url = buildUrl(config);
  parts.push(`'${url}'`);

  const headers = config.headers ?? {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined || value === null) continue;

    const escapedKey = String(key).replace(/'/g, "'\\''");
    const shouldRedact = redactHeaders.some((h) => h.toLowerCase() === key.toLowerCase());
    const displayValue = shouldRedact ? redactPattern : String(value);
    const escapedValue = displayValue.replace(/'/g, "'\\''");

    parts.push(`-H '${escapedKey}: ${escapedValue}'`);
  }

  if (config.data) {
    let body: string;

    if (typeof config.data === 'string') {
      body = config.data;
    } else {
      body = prettyPrint ? JSON.stringify(config.data, null, 2) : JSON.stringify(config.data);
    }

    body = body.replace(/'/g, "'\\''");

    if (prettyPrint && body.includes('\n')) {
      parts.push(`-d $'${body}'`);
    } else {
      parts.push(`-d '${body}'`);
    }
  }

  return parts.join(' \\\n  ');
}

function buildUrl(config: CurlRequestConfig): string {
  let url = config.url ?? '';

  if (config.baseURL && !url.startsWith('http')) {
    url = `${config.baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }

  if (config.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(config.params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  return url;
}
