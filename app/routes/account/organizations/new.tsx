import { OrganizationForm } from '@/features/organization/form';
import { createOrganizationsControl } from '@/resources/control-plane';
import { OrganizationSchema, organizationSchema } from '@/resources/schemas/organization.schema';
import { paths } from '@/utils/config/paths.config';
import { dataWithToast, validateCSRF } from '@/utils/cookies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod/v4';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, redirect } from 'react-router';

export const handle = {
  breadcrumb: () => <span>New</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Organization');
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient, cache } = context as AppLoadContext;
  const orgAPI = createOrganizationsControl(controlPlaneClient as Client);

  const clonedRequest = request.clone();
  const formData = await clonedRequest.formData();

  try {
    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: organizationSchema });
    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
    }
    const payload = parsed.value as OrganizationSchema;

    // Dry run to validate
    const validateRes = await orgAPI.create(payload, true);

    // If dry run succeeds, create for real
    if (validateRes) {
      await orgAPI.create(payload);
    }

    // Invalidate the organizations cache
    await cache.removeItem('organizations');

    return redirect(
      getPathWithParams(paths.org.detail.root, {
        orgId: payload.name,
      })
    );
  } catch (error) {
    return dataWithToast(
      {},
      {
        title: 'Error',
        description: error instanceof Error ? error.message : (error as Response).statusText,
        type: 'error',
      }
    );
  }
};

export default function AccountOrganizationsNew() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <OrganizationForm />
    </div>
  );
}
