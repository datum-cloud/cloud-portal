import { getOrgSession } from '@/modules/cookie/org.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/projects/list' as const;

export const loader = withMiddleware(async ({ request, context }) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  const { org } = await getOrgSession(request);

  if (!org) {
    throw new CustomError('Organization not found', 404);
  }

  const orgEntityId = org.name;

  const key = `projects:${orgEntityId}`;
  const isCached = await cache.hasItem(key);

  if (isCached) {
    const projects = await cache.getItem(key);
    return data(projects);
  }

  const projects = await projectsControl.list(orgEntityId ?? '');

  await cache.setItem(key, projects);

  return data(projects);
}, authMiddleware);
