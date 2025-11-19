import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { createProjectsControl } from '@/resources/control-plane';
import { IProjectControlResponse, ICachedProject } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, redirectWithToast, validateCSRF } from '@/utils/cookies';
import { HttpError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Preferences</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Project Preferences');
});

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  switch (request.method) {
    case 'POST': {
      const { projectId } = params;
      if (!projectId) {
        throw new Error('Project ID is required');
      }

      const clonedRequest = request.clone();
      const formData = await clonedRequest.formData();

      try {
        await validateCSRF(formData, clonedRequest.headers);

        const parsed = parseWithZod(formData, { schema: updateProjectSchema });

        if (parsed.status !== 'success') {
          throw new Error('Invalid form data');
        }

        const { controlPlaneClient } = context as AppLoadContext;
        const projectsControl = createProjectsControl(controlPlaneClient as Client);

        const dryRunRes = await projectsControl.update(projectId, parsed.value, true);

        if (dryRunRes) {
          const res = (await projectsControl.update(
            projectId,
            parsed.value,
            false
          )) as IProjectControlResponse;

          const orgId = res.organizationId;
          const projects = await cache.getItem(`projects:${orgId}`);
          if (projects) {
            const newProjects = (projects as IProjectControlResponse[]).map(
              (project: IProjectControlResponse) => {
                if (project.name === projectId) {
                  return res;
                }
                return project;
              }
            );

            await cache.setItem(`projects:${orgId}`, newProjects);
          }
        }

        return dataWithToast(null, {
          title: 'Project updated successfully',
          description: 'You have successfully updated a project.',
          type: 'success',
        });
      } catch (error) {
        return dataWithToast(null, {
          title: 'Error',
          description: error instanceof Error ? error.message : (error as Response).statusText,
          type: 'error',
        });
      }
    }
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData());
      const { projectName, orgId: orgEntityId } = formData;

      try {
        // 1. Mark project as "deleting" in cache to hide it from UI immediately
        const cachedProjects = (await cache.getItem(`projects:${orgEntityId}`)) as
          | ICachedProject[]
          | null;

        if (cachedProjects && Array.isArray(cachedProjects)) {
          const updatedProjects = cachedProjects.map((project) =>
            project.name === projectName
              ? {
                  ...project,
                  _meta: {
                    status: 'deleting' as const,
                    deletedAt: new Date().toISOString(),
                  },
                }
              : project
          );
          await cache.setItem(`projects:${orgEntityId}`, updatedProjects);
        }

        // 2. Await the actual deletion
        await projectsControl.delete(orgEntityId as string, projectName as string);

        // 3. Remove project from cache after successful deletion
        if (cachedProjects && Array.isArray(cachedProjects)) {
          const filteredProjects = cachedProjects.filter((project) => project.name !== projectName);
          await cache.setItem(`projects:${orgEntityId}`, filteredProjects);
        }

        // 4. Redirect with success message
        return redirectWithToast(
          getPathWithParams(paths.org.detail.projects.root, {
            orgId: orgEntityId as string,
          }),
          {
            title: 'Project deleted successfully',
            description: 'The project has been deleted',
            type: 'success',
          }
        );
      } catch (error) {
        // If deletion fails, revert the cache status
        const cachedProjects = (await cache.getItem(`projects:${orgEntityId}`)) as
          | ICachedProject[]
          | null;

        if (cachedProjects && Array.isArray(cachedProjects)) {
          const revertedProjects = cachedProjects.map((project) => {
            if (project.name === projectName && project._meta?.status === 'deleting') {
              const { _meta, ...projectWithoutMeta } = project;
              return projectWithoutMeta;
            }
            return project;
          });
          await cache.setItem(`projects:${orgEntityId}`, revertedProjects);
        }

        return redirectWithToast(
          getPathWithParams(paths.org.detail.projects.root, {
            orgId: orgEntityId as string,
          }),
          {
            title: 'Failed to delete project',
            description: error instanceof Error ? error.message : 'An unexpected error occurred',
            type: 'error',
          }
        );
      }
    }
    default:
      throw new HttpError('Method not allowed', 405);
  }
};

export default function ProjectSettingsPage() {
  const { project } = useRouteLoaderData('project-detail');

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      <ProjectGeneralCard project={project} />
      {/* Labels */}
      {/* <ProjectLabelCard labels={project?.labels ?? {}} /> */}
      {/* Danger Zone */}
      <ProjectDangerCard project={project} />
    </div>
  );
}
