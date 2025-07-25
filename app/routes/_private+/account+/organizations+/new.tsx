import { routes } from '@/constants/routes';
import { OrganizationForm } from '@/features/organization/form';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server';
import { createOrganizationsControl } from '@/resources/control-plane/organizations.control';
import { OrganizationSchema, organizationSchema } from '@/resources/schemas/organization.schema';
import { mergeMeta, metaObject } from '@/utils/meta';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

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

    return redirectWithToast(routes.account.organizations.root, {
      title: 'Organization created successfully',
      description: 'You have successfully created an organization.',
      type: 'success',
    });
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
