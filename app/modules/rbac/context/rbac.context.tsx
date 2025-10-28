/**
 * RBAC Context
 * Provides permission checking context throughout the application
 */
import type { IPermissionContext } from '../types';
import { createContext } from 'react';

/**
 * Context for RBAC permission checks
 */
export const RbacContext = createContext<IPermissionContext | null>(null);

RbacContext.displayName = 'RbacContext';
