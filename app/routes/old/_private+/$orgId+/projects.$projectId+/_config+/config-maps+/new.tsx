import { paths } from '@/config/paths';
import { ConfigMapForm } from '@/features/config-map/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { redirectWithToast, dataWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createConfigMapsControl } from '@/resources/control-plane/config-maps.control';
import { configMapSchema } from '@/resources/schemas/config-map.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
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
      getPathWithParams(paths.projects.config.configMaps.root, {
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
    <div className="mx-auto w-full max-w-3xl py-8">
      <ConfigMapForm />
    </div>
  );
}
