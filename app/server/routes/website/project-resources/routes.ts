import type { TtlCache } from '../ttl-cache';
import { UpstreamListError, type ResourceList, type ResourceLister } from './lister';
import { resolveResourceType } from './registry';
import { logger, setSentryTag } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { AppError } from '@/utils/errors/app-error';
import { isResourceName } from '@/utils/helpers/validation.helper';
import { Hono } from 'hono';

const CACHE_TTL_SECONDS = 60;

/** Dependencies of the resource list route; `timeoutMs` bounds each upstream call. */
export interface ProjectResourceRoutesOptions {
  lister: ResourceLister;
  cache: TtlCache<ResourceList>;
  timeoutMs: number;
}

/** Upstream statuses passed through as expected refusals (warn only, no Sentry). */
const REFUSALS: Partial<Record<number, { code: string; status: number; message: string }>> = {
  401: { code: 'UNAUTHENTICATED', status: 401, message: 'Authentication required' },
  403: { code: 'FORBIDDEN', status: 403, message: 'Access to this project is forbidden' },
  429: { code: 'UPSTREAM_RATE_LIMITED', status: 429, message: 'Too many requests' },
};

function toAppError(
  error: unknown,
  context: { type: string; projectId: string; requestId: string | undefined }
): AppError {
  const { requestId } = context;
  const upstreamStatus = error instanceof UpstreamListError ? error.status : undefined;
  const refusal = upstreamStatus === undefined ? undefined : REFUSALS[upstreamStatus];
  if (refusal) {
    logger.warn('website resource list refused', {
      type: context.type,
      projectId: context.projectId,
      upstreamStatus,
    });
    return new AppError(refusal.message, { code: refusal.code, status: refusal.status, requestId });
  }
  // Milo answers a missing or foreign project with 403, so an upstream 404 means
  // the registry entry is wrong and must alert. The AppError constructor captures
  // 5xx to Sentry, so the route does not call logger.error itself.
  return new AppError('Upstream unavailable', {
    code: 'UPSTREAM_UNAVAILABLE',
    status: 502,
    upstreamStatus,
    requestId,
    cause: error,
  });
}

/** Serves `GET /:projectId/:type`: names (and display names) of a project's resources. */
export function createProjectResourceRoutes({
  lister,
  cache,
  timeoutMs,
}: ProjectResourceRoutesOptions) {
  const routes = new Hono<{ Variables: Variables }>();

  routes.get('/:projectId/:type', async (c) => {
    const requestId = c.get('requestId');
    const session = c.get('session');
    if (!session) {
      throw new AppError('Authentication required', {
        code: 'UNAUTHENTICATED',
        status: 401,
        requestId,
      });
    }

    const projectId = c.req.param('projectId');
    if (!isResourceName(projectId)) {
      throw new AppError('Invalid project id', {
        code: 'INVALID_PROJECT_ID',
        status: 400,
        requestId,
      });
    }

    const type = resolveResourceType(c.req.param('type'));
    if (!type) {
      throw new AppError('Unknown resource type', {
        code: 'UNKNOWN_RESOURCE_TYPE',
        status: 404,
        requestId,
      });
    }

    const cacheKey = `${session.sub}:${projectId}:${type.key}`;
    const cached = await cache.get(cacheKey);
    if (cached) return c.json(cached);

    setSentryTag('website_resource_type', type.key);
    let result: ResourceList;
    try {
      result = await lister({
        projectId,
        type,
        accessToken: session.accessToken,
        requestId,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw toAppError(error, { type: type.key, projectId, requestId });
    }

    await cache.set(cacheKey, result, CACHE_TTL_SECONDS);
    return c.json(result);
  });

  return routes;
}
