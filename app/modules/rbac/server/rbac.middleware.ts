import { recordDenial } from '../observability/metrics';
import { extractOrgIdFromPath, resolveDynamicValue } from '../permission-checker';
import type { IRbacMiddlewareConfig, OnDeniedContext } from '../types';
import { RbacService } from './rbac.service';
import { AuthorizationError } from '@/utils/errors';
import type { MiddlewareContext, NextFunction } from '@/utils/middlewares/middleware';
import { redirect } from 'react-router';

const DEFAULT_ERROR_PATH = '/error/403';

export function createRbacMiddleware(config: IRbacMiddlewareConfig) {
  return async (ctx: MiddlewareContext, next: NextFunction): Promise<Response> => {
    const { request } = ctx;

    const orgId = extractOrgIdFromPath(request.url);
    if (!orgId) {
      throw new AuthorizationError('Organization ID not found in request path');
    }

    const url = new URL(request.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const paramPatterns: Record<string, string> = { org: 'orgId', project: 'projectId' };
    const params: Record<string, string> = {};
    for (let i = 0; i < segments.length - 1; i++) {
      const name = paramPatterns[segments[i]];
      if (name) params[name] = segments[i + 1];
    }

    const namespace = resolveDynamicValue(config.namespace, params);
    const name = resolveDynamicValue(config.name, params);

    const result = await new RbacService().checkPermission(orgId, {
      resource: config.resource,
      verb: config.verb,
      group: config.group,
      namespace,
      name,
    });

    if (!result.allowed || result.denied) {
      const errorMessage = `Permission denied: You do not have permission to ${config.verb} ${config.resource}`;
      recordDenial(config.resource, config.verb);

      const onDenied = config.onDenied ?? 'error';
      if (typeof onDenied === 'function') {
        const context: OnDeniedContext = {
          errorMessage,
          resource: config.resource,
          verb: config.verb,
          group: config.group,
          namespace,
          name,
          request,
        };
        return await onDenied(context);
      }
      if (onDenied === 'redirect') {
        return redirect(config.redirectTo || DEFAULT_ERROR_PATH);
      }
      throw new AuthorizationError(errorMessage);
    }

    return next();
  };
}

export const rbacMiddleware = {
  canList: (resource: string, group?: string, namespace?: string) =>
    createRbacMiddleware({ resource, verb: 'list', group, namespace }),
  canGet: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({ resource, verb: 'get', group, namespace, name }),
  canCreate: (resource: string, group?: string, namespace?: string) =>
    createRbacMiddleware({ resource, verb: 'create', group, namespace }),
  canUpdate: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({ resource, verb: 'update', group, namespace, name }),
  canDelete: (resource: string, group?: string, namespace?: string, name?: string) =>
    createRbacMiddleware({ resource, verb: 'delete', group, namespace, name }),
};
