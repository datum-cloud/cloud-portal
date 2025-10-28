/**
 * Permission Checker Utility
 * Core logic for checking permissions
 */
import type { IPermissionCheck, IPermissionCacheKey } from './types';

/**
 * Build a cache key for permission checks
 */
export function buildPermissionCacheKey(check: IPermissionCacheKey): string {
  const parts = [
    'permission',
    check.organizationId,
    check.resource,
    check.verb,
    check.group || '_',
    check.namespace || '_',
    check.name || '_',
  ];

  return parts.join(':');
}

/**
 * Normalize permission check by providing defaults
 */
export function normalizePermissionCheck(
  check: Omit<IPermissionCheck, 'organizationId'>,
  organizationId: string
): IPermissionCheck {
  return {
    organizationId,
    resource: check.resource,
    verb: check.verb,
    group: check.group || '',
    namespace: check.namespace,
    name: check.name,
  };
}

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

/**
 * Format permission check for display/debugging
 */
export function formatPermissionCheck(check: IPermissionCheck): string {
  const parts: string[] = [];

  parts.push(`verb: ${check.verb}`);
  parts.push(`resource: ${check.resource}`);

  if (check.group) {
    parts.push(`group: ${check.group}`);
  }

  if (check.namespace) {
    parts.push(`namespace: ${check.namespace}`);
  }

  if (check.name) {
    parts.push(`name: ${check.name}`);
  }

  return parts.join(', ');
}

/**
 * Check if permission result indicates access is allowed
 */
export function isPermissionAllowed(result: { allowed: boolean; denied: boolean }): boolean {
  return result.allowed && !result.denied;
}

/**
 * Combine multiple permission results with AND operator
 */
export function combinePermissionsAND(
  results: Array<{ allowed: boolean; denied: boolean }>
): boolean {
  return results.every(isPermissionAllowed);
}

/**
 * Combine multiple permission results with OR operator
 */
export function combinePermissionsOR(
  results: Array<{ allowed: boolean; denied: boolean }>
): boolean {
  return results.some(isPermissionAllowed);
}
