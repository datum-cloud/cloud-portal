import { RbacContext, type RbacContextValue } from '../context/rbac.context';
import { useContext } from 'react';

export function usePermissions(): RbacContextValue {
  const context = useContext(RbacContext);
  if (!context) {
    throw new Error('usePermissions must be used within RbacProvider');
  }
  return context;
}
