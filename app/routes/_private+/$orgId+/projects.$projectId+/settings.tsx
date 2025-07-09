import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { UpdateProjectForm } from '@/features/project/update-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { redirectWithToast, dataWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { updateProjectSchema } from '@/resources/schemas/project.schema';
import { CustomError } from '@/utils/errorHandle';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { CircleAlertIcon } from 'lucide-react';
import { ActionFunctionArgs, AppLoadContext, useRouteLoaderData, useSubmit } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Settings</span>,
};

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

        const orgId = parsed.value.orgEntityId;
        if (!orgId) {
          throw new Error('Organization ID is required');
        }

        const { controlPlaneClient } = context as AppLoadContext;
        const projectsControl = createProjectsControl(controlPlaneClient as Client);

        const dryRunRes = await projectsControl.update(projectId, parsed.value, true);

        if (dryRunRes) {
          const res = await projectsControl.update(projectId, parsed.value, false);

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
  const submit = useSubmit();
  const { confirm } = useConfirmationDialog();

  const deleteProject = async (project: IProjectControlResponse) => {
    await confirm({
      title: 'Delete Project',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {project.description} ({project.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${project.name}" to confirm.`,
      confirmInputPlaceholder: 'Type the project name to confirm deletion',
      confirmValue: project.name ?? 'delete',
      onSubmit: async () => {
        await submit(
          {
            projectName: project?.name ?? '',
            orgId: project?.organizationId ?? '',
          },
          {
            method: 'DELETE',
            fetcherKey: 'project-resources',
            navigate: false,
          }
        );
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <div className="grid grid-cols-1 gap-6">
        {/* Project Name Section */}
        <UpdateProjectForm defaultValue={project} />
        {/* Danger Zone */}
        <Card className="border-destructive/50 hover:border-destructive border pb-0 transition-colors">
          <CardHeader>
            <CardTitle className="text-destructive">Danger zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <CircleAlertIcon className="size-5 shrink-0" />
              <AlertTitle className="text-sm font-semibold">Warning: Destructive Action</AlertTitle>
              <AlertDescription>
                This action cannot be undone. Once deleted, this project and all its resources will
                be permanently removed. The project name will be reserved and cannot be reused for
                future projects to prevent deployment conflicts.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
            <Button
              variant="destructive"
              size="sm"
              className="font-medium"
              onClick={() => deleteProject(project)}>
              Delete
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
