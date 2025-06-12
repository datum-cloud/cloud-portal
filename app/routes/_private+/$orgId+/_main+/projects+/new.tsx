import { routes } from '@/constants/routes';
import { CreateProjectForm } from '@/features/project/create-form';
import { createProjectsControl } from '@/resources/control-plane/projects.control';
import { projectSchema, ProjectSchema } from '@/resources/schemas/project.schema';
import { dataWithToast, redirectWithToast } from '@/utils/cookies/toast';
import { validateCSRF } from '@/utils/helpers/csrf.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { authMiddleware } from '@/utils/middleware/auth.middleware';
import { withMiddleware } from '@/utils/middleware/middleware';
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
  const { controlPlaneClient } = context as AppLoadContext;
  const projectsControl = createProjectsControl(controlPlaneClient as Client);

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: projectSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const payload = parsed.value as ProjectSchema;

    // Dry run to validate
    const dryRunRes = await projectsControl.create(payload, true);

    // If dry run succeeds, create for real
    if (dryRunRes) {
      await projectsControl.create(payload, false);
    }

    // TODO: temporary solution for handle delay on new project
    // https://github.com/datum-cloud/cloud-portal/issues/45
    return redirectWithToast(
      getPathWithParams(`${routes.org.projects.setup}?projectId=${payload.name}`, {
        orgId: params.orgId,
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
    <div className="mx-auto w-full max-w-3xl">
      <CreateProjectForm />
    </div>
  );
}
