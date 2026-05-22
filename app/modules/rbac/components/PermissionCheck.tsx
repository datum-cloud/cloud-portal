import { usePermissionCheck } from '../hooks/usePermissionCheck';
import type { PermissionCheckScope, PermissionVerb } from '../types';
import { type ReactNode } from 'react';

interface Check {
  resource: string;
  verb: PermissionVerb;
  group?: string;
  namespace?: string;
  name?: string;
  scope?: PermissionCheckScope;
}

interface PermissionCheckProps {
  checks: Check[];
  operator?: 'AND' | 'OR';
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Renders children when the AND/OR over a batch of async permission checks
 * holds. Uses a single bulk request via {@link usePermissionCheck}.
 */
export function PermissionCheck({
  checks,
  operator = 'AND',
  fallback = null,
  children,
}: PermissionCheckProps) {
  const { permissions, isLoading } = usePermissionCheck(checks);

  if (isLoading) return <>{fallback}</>;

  const results = checks.map((c) => permissions[`${c.resource}:${c.verb}`]?.allowed ?? false);
  const allowed = operator === 'AND' ? results.every(Boolean) : results.some(Boolean);

  return <>{allowed ? children : fallback}</>;
}
