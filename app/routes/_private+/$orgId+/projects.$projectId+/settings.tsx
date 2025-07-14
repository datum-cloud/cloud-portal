import { PageTitle } from '@/components/page-title/page-title';
import { routes } from '@/constants/routes';
import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { ProjectLabelCard } from '@/features/project/settings/label-card';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { redirectWithToast, dataWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Project settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Project settings');
});

export const action = withMiddleware(async ({ request, context, params }: ActionFunctionArgs) => {
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

      // Invalidate the projects cache
      await cache.removeItem(`projects:${orgEntityId}`);

      await projectsControl.delete(orgEntityId as string, projectName as string);
      return redirectWithToast(
        getPathWithParams(routes.org.projects.root, {
          orgId: params.orgId,
        }),
        {
          title: 'Project deleted successfully',
          description: 'The project has been deleted successfully',
          type: 'success',
        }
      );
    }
    default:
      throw new CustomError('Method not allowed', 405);
  }
}, authMiddleware);

export default function ProjectSettingsPage() {
  const project = useRouteLoaderData('routes/_private+/$orgId+/projects.$projectId+/_layout');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageTitle title="Project settings" />
      {/* Project Name Section */}
      <ProjectGeneralCard project={project} />
      {/* Labels */}
      <ProjectLabelCard labels={project?.labels ?? {}} />
      {/* Danger Zone */}
      <ProjectDangerCard project={project} />
    </div>
  );
}
