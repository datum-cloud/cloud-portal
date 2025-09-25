import { PageTitle } from '@/components/page-title/page-title';
import { ProjectDangerCard } from '@/features/project/settings/danger-card';
import { ProjectGeneralCard } from '@/features/project/settings/general-card';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { redirectWithToast, dataWithToast } from '@/modules/cookie/toast.server';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { paths } from '@/utils/config/paths.config';
import { HttpError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Project Settings</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Project Settings');
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

      // Invalidate the projects cache
      await cache.removeItem(`projects:${orgEntityId}`);

      await projectsControl.delete(orgEntityId as string, projectName as string);

      return redirectWithToast(
        `${getPathWithParams(paths.org.detail.projects.root, {
          orgId: orgEntityId as string,
        })}?deletedId=${encodeURIComponent(projectName as string)}`,
        {
          title: 'Project deleted successfully',
          description: 'The project has been deleted successfully',
          type: 'success',
        }
      );
    }
    default:
      throw new HttpError('Method not allowed', 405);
  }
};

export default function ProjectSettingsPage() {
  const { project } = useRouteLoaderData('project-detail');

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageTitle title="Project Settings" />
      {/* Project Name Section */}
      <ProjectGeneralCard project={project} />
      {/* Labels */}
      {/* <ProjectLabelCard labels={project?.labels ?? {}} /> */}
      {/* Danger Zone */}
      <ProjectDangerCard project={project} />
    </div>
  );
}
