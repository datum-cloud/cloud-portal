import { routes } from '@/constants/paths';
import { HttpRouteForm } from '@/features/connect/http-route/http-route-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createHttpRoutesControl } from '@/resources/control-plane/http-routes.control';
import { httpRouteSchema } from '@/resources/schemas/http-route.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New HTTP Route');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId, orgId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    const parsed = parseWithZod(formData, { schema: httpRouteSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client);

    const dryRunRes = await httpRoutesControl.create(projectId, parsed.value, true);

    if (dryRunRes) {
      await httpRoutesControl.create(projectId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.connect.httpRoutes.root, {
        orgId,
        projectId,
      }),
      {
        title: 'HTTP Route created successfully',
        description: 'You have successfully created an HTTP route.',
        type: 'success',
      }
    );
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function ConnectHttpRoutesNewPage() {
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <HttpRouteForm projectId={projectId} />
    </div>
  );
}
