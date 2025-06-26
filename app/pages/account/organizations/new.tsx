import { routes } from '@/constants/routes';
import { OrganizationForm } from '@/features/organization/form';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { OrganizationSchema, organizationSchema } from '@/resources/schemas/organization.schema';
import { dataWithToast, redirectWithToast } from '@/utils/cookies/toast';
import { validateCSRF } from '@/utils/helpers/csrf.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { parseWithZod } from '@conform-to/zod';
import { AxiosInstance } from 'axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Organization');
});

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const { apiClient } = context as AppLoadContext;
  const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);

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
    <div className="mx-auto w-full max-w-3xl">
      <OrganizationForm />
    </div>
  );
}
