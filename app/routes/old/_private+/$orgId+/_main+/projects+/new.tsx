import { paths } from '@/config/paths';
import { CreateProjectForm } from '@/features/project/create-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { projectSchema, ProjectSchema } from '@/resources/schemas/project.schema';
import { CustomError } from '@/utils/error';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Project');
});

export const action = withMiddleware(async ({ request, params, context }: ActionFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: projectSchema });

    if (parsed.status !== 'success') {
      throw new CustomError('Invalid form data', 400);
    }

    const payload = parsed.value as ProjectSchema;

    // Dry run to validate
    const dryRunRes = await projectsControl.create(payload, true);

    // If dry run succeeds, create for real
    if (dryRunRes) {
      await projectsControl.create(payload, false);
    }

    // Invalidate the projects cache
    await cache.removeItem(`projects:${payload.orgEntityId}`);

    return redirectWithToast(
      getPathWithParams(paths.projects.detail, {
        orgId: params.orgId,
        projectId: payload.name,
      }),
      {
        title: 'Project created successfully!',
        description: 'You have successfully created a project.',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error!',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
}, authMiddleware);

export default function NewProject() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <CreateProjectForm />
    </div>
  );
}
