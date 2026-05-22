/**
 * Permission Checker Utility
 * Helpers used by the RBAC middleware to resolve scope/value from requests.
 */

/**
 * Extract organization ID from request URL path
 * Looks for /org/:orgId pattern in URL
 */
export function extractOrgIdFromPath(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    const orgIndex = pathSegments.indexOf('org');

    if (orgIndex !== -1 && orgIndex + 1 < pathSegments.length) {
      return pathSegments[orgIndex + 1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve dynamic value from middleware config
 * Can be a static string or a function that takes params
 */
export function resolveDynamicValue(
  value: string | ((params: Record<string, string>) => string | undefined) | undefined,
  params: Record<string, string>
): string | undefined {
  if (typeof value === 'function') {
    return value(params);
  }
  return value;
}
