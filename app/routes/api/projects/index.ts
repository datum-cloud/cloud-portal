import { createProjectsControl } from '@/resources/control-plane';
import { ResourceCache, RESOURCE_CACHE_CONFIG } from '@/utils/cache';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/projects' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const projectsControl = createProjectsControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // Initialize cache manager for projects
    const projectCache = new ResourceCache(
      cache,
      RESOURCE_CACHE_CONFIG.projects,
      RESOURCE_CACHE_CONFIG.projects.getCacheKey(orgId)
    );

    // Fetch fresh data from API
    const freshProjects = await projectsControl.list(orgId);

    // Merge cached metadata with fresh data (handles delayed deletions)
    const mergedProjects = await projectCache.merge(freshProjects);

    return data({ success: true, data: mergedProjects }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
