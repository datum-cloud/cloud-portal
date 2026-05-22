import { RbacContext, type RbacContextValue } from './rbac.context';
import { useMemo } from 'react';

interface RbacProviderProps {
  children: React.ReactNode;
  organizationId?: string;
  projectId?: string;
}

/**
 * Supplies org/project context for async permission checks. Checks are resolved
 * per-call via the BFF (SelfSubjectAccessReview); the provider holds no rule set.
 */
export function RbacProvider({ children, organizationId, projectId }: RbacProviderProps) {
  const value: RbacContextValue = useMemo(
    () => ({ organizationId, projectId }),
    [organizationId, projectId]
  );
  return <RbacContext.Provider value={value}>{children}</RbacContext.Provider>;
}
