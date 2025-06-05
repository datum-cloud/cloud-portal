type Param = string | number | boolean | string[] | null | undefined;

type QueryParams = Record<string, Param>;

function toString(val: Param): string {
  if (val === null || typeof val === 'undefined') {
    return '';
  }

  return Array.isArray(val) ? val.join(',') : val?.toString();
}

export function getPathWithParams(path: string, params: QueryParams = {}) {
  return Object.entries(params).reduce((prev, [key, value]) => {
    return (
      prev
        // /my/[dynamic]/path
        .replace(`[${key}]`, encodeURIComponent(toString(value)))
        // /my/:dynamic/path
        .replace(`:${key}`, encodeURIComponent(toString(value)))
    );
  }, path);
}

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
