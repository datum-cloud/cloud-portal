import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';

export interface CurlOptions {
  prettyPrint?: boolean;
}

export function generateCurl(
  config: AxiosRequestConfig | InternalAxiosRequestConfig,
  options: CurlOptions = {}
): string {
  const { prettyPrint = true } = options;

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
    const escapedValue = String(value).replace(/'/g, "'\\''");
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

function buildUrl(config: AxiosRequestConfig | InternalAxiosRequestConfig): string {
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
