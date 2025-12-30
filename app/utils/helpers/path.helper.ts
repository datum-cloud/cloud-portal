/**
 * Extracts the domain URL from a request
 * @param request - The HTTP request object
 * @returns The domain URL or null if host header is not present
 */
export function getDomainUrl(request: Request): string | null {
  const host = request.headers.get('X-Forwarded-Host') ?? request.headers.get('Host');
  if (!host) return null;

  const protocol = host.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${host}`;
}

/**
 * Extracts the pathname from a request URL
 * @param request - The HTTP request object
 * @returns The pathname or null if not available
 */
export function getDomainPathname(request: Request): string | null {
  const pathname = new URL(request.url).pathname;
  if (!pathname) return null;
  return pathname;
}

/**
 * Combines multiple header objects into one (Headers are appended not overwritten)
 * @param headers - Array of header objects to combine
 * @returns Combined Headers object
 */
export function combineHeaders(
  ...headers: Array<ResponseInit['headers'] | null | undefined>
): Headers {
  const combined = new Headers();
  for (const header of headers) {
    if (!header) continue;
    for (const [key, value] of new Headers(header).entries()) {
      combined.append(key, value);
    }
  }
  return combined;
}

type Param = string | number | boolean | string[] | null | undefined;
type QueryParams = Record<string, Param>;
type SearchParamsInput = URLSearchParams | Record<string, string | string[] | undefined | null>;

/**
 * Converts a Param value to string representation
 */
function paramToString(val: Param): string {
  if (val === null || typeof val === 'undefined') {
    return '';
  }
  return Array.isArray(val) ? val.join(',') : val.toString();
}

/**
 * Converts SearchParamsInput to a query string
 */
function buildSearchParamsString(searchParams?: SearchParamsInput): string {
  if (!searchParams) {
    return '';
  }

  if (searchParams instanceof URLSearchParams) {
    return `?${searchParams.toString()}`;
  }

  // Handle plain object
  const urlSearchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        for (const v of value) {
          urlSearchParams.append(key, v);
        }
      } else {
        urlSearchParams.set(key, value);
      }
    }
  }

  const str = urlSearchParams.toString();
  return str ? `?${str}` : '';
}

/**
 * Replaces path parameters with actual values and appends search params
 * @param path - The path template with parameter placeholders
 * @param params - Object containing parameter values
 * @param searchParams - Optional URLSearchParams or plain object to append as query string
 * @returns Path with parameters replaced and search params appended
 *
 * @example
 * // With path params only
 * getPathWithParams('/org/:orgId/projects', { orgId: '123' })
 * // => '/org/123/projects'
 *
 * @example
 * // With path params and search params object
 * getPathWithParams('/org/:orgId/projects', { orgId: '123' }, { action: 'create' })
 * // => '/org/123/projects?action=create'
 *
 * @example
 * // With array search params
 * getPathWithParams('/search', {}, { tags: ['a', 'b'] })
 * // => '/search?tags=a&tags=b'
 */
export function getPathWithParams(
  path: string,
  params: QueryParams = {},
  searchParams?: SearchParamsInput
): string {
  const searchParamsString = buildSearchParamsString(searchParams);

  return Object.entries(params).reduce((prev, [key, value]) => {
    return (
      prev
        // /my/[dynamic]/path
        .replace(`[${key}]`, encodeURIComponent(paramToString(value)))
        // /my/:dynamic/path
        .replace(`:${key}`, encodeURIComponent(paramToString(value)))
    );
  }, path + searchParamsString);
}

/**
 * Extracts the last segment from a pathname and optionally formats it for human readability
 * @param pathname - The pathname to extract from
 * @param isHumanReadable - Whether to format the segment for human readability
 * @returns The last path segment, optionally formatted
 */
export function getLastPathSegment(pathname: string, isHumanReadable = true): string {
  // Remove trailing slash if present
  const cleanPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

  // Split path into segments and get last non-empty segment
  const segments = cleanPath.split('/');
  const lastSegment = segments.filter(Boolean).pop();

  return isHumanReadable
    ? (lastSegment
        ?.replace(/[-_]/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ') ?? '')
    : (lastSegment ?? '');
}

export type { QueryParams, Param, SearchParamsInput };
