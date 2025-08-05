import { getOrgSession } from '@/modules/cookie/org.server';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/projects' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    const { orgId } = await getOrgSession(request);

    if (!orgId) {
      throw new CustomError('Organization not found', 404);
    }

    const key = `projects:${orgId}`;
    const isCached = await cache.hasItem(key);

    if (isCached) {
      const projects = await cache.getItem(key);
      return data(projects);
    }

    const projects = await projectsControl.list(orgId ?? '');

    await cache.setItem(key, projects);

    return data({ success: true, data: projects }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
