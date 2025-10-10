import { createProjectsControl } from '@/resources/control-plane';
import { ICachedProject } from '@/resources/interfaces/project.interface';
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

    const key = `projects:${orgId}`;
    const cachedProjects = (await cache.getItem(key)) as ICachedProject[] | null;

    // Fetch fresh data from API
    const freshProjects = await projectsControl.list(orgId ?? '');

    // Merge cached metadata with fresh data
    let mergedProjects: ICachedProject[] = freshProjects;

    if (cachedProjects && Array.isArray(cachedProjects)) {
      mergedProjects = freshProjects.map((freshProject) => {
        const cachedProject = cachedProjects.find((cp) => cp.name === freshProject.name);

        // If cached project has "deleting" status and still exists in API, keep the metadata
        if (cachedProject?._meta?.status === 'deleting') {
          return { ...freshProject, _meta: cachedProject._meta };
        }

        return freshProject;
      });

      // Remove projects from cache that are no longer returned by API (fully deleted)
      const freshProjectNames = new Set(freshProjects.map((p) => p.name));
      const stillDeleting = cachedProjects.filter(
        (cp) => cp._meta?.status === 'deleting' && !freshProjectNames.has(cp.name)
      );

      // If there were deleting projects that are now gone, they're fully deleted
      if (stillDeleting.length > 0) {
        // Update cache to remove fully deleted projects
        await cache.setItem(key, mergedProjects);
      }
    } else {
      // No cache exists, save fresh data
      await cache.setItem(key, mergedProjects);
    }

    return data({ success: true, data: mergedProjects }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
