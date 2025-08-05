import { paths } from '@/config/paths';
import { CreateLocationForm } from '@/features/location/form/create-form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { authMiddleware } from '@/modules/middleware/auth.middleware';
import { withMiddleware } from '@/modules/middleware/middleware';
import { createLocationsControl } from '@/resources/control-plane/locations.control';
import { NewLocationSchema, newLocationSchema } from '@/resources/schemas/location.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { getPathWithParams } from '@/utils/path';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Location');
});

export const action = withMiddleware(async ({ request, params, context }: ActionFunctionArgs) => {
  const { projectId, orgId } = params;
  const { controlPlaneClient } = context as AppLoadContext;
  const locationsControl = createLocationsControl(controlPlaneClient as Client);

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: newLocationSchema });

    const payload = parsed.payload as NewLocationSchema;

    // First try with dryRun to validate
    const dryRunRes = await locationsControl.create(projectId, payload, true);

    // If dryRun succeeds, create for real
    if (dryRunRes) {
      await locationsControl.create(projectId, payload, false);
    }

    return redirectWithToast(
      getPathWithParams(paths.projects.locations.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Location created successfully',
        description: 'You have successfully created a location.',
        type: 'success',
      }
    );
  } catch (error) {
    console.error(error);
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
}, authMiddleware);

export default function NewLocation() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <CreateLocationForm />
    </div>
  );
}
