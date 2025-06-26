import { routes } from '@/constants/routes';
import { ConfigMapForm } from '@/features/config-map/form';
import { createConfigMapsControl } from '@/resources/control-plane/config-maps.control';
import { configMapSchema } from '@/resources/schemas/config-map.schema';
import { redirectWithToast, dataWithToast } from '@/utils/cookies/toast';
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
  return metaObject('New Config Map');
});

export const action = withMiddleware(async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext;
  const { projectId, orgId } = params;
  const configMapControl = createConfigMapsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);
    const parsed = parseWithZod(formData, { schema: configMapSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }

    const dryRunRes = await configMapControl.create(projectId, parsed.value, true);

    if (dryRunRes) {
      await configMapControl.create(projectId, parsed.value, false);
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.config.configMaps.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Config Map created successfully',
        description: 'You have successfully created a config map.',
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
}, authMiddleware);

export default function NewConfigMap() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ConfigMapForm />
    </div>
  );
}
