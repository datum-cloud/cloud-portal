import { createContext } from 'react';

/**
 * RBAC context value. The provider only supplies the org/project identifiers
 * that scope async permission checks; all checks are resolved per-call via the
 * BFF (SelfSubjectAccessReview).
 */
export interface RbacContextValue {
  organizationId?: string;
  projectId?: string;
}

export const RbacContext = createContext<RbacContextValue | null>(null);
RbacContext.displayName = 'RbacContext';
