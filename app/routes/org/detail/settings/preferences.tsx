import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { createOrganizationsControl } from '@/resources/control-plane/organizations.control';
import {
  UpdateOrganizationSchema,
  updateOrganizationSchema,
} from '@/resources/schemas/organization.schema';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Preferences</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Org Preferences');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { orgId } = params;
  const { controlPlaneClient, cache } = context as AppLoadContext;

  try {
    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    const orgAPI = createOrganizationsControl(controlPlaneClient as Client);

    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();

    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: updateOrganizationSchema });

    if (parsed.status !== 'success') {
      throw new BadRequestError('Invalid form data');
    }

    const payload = parsed.value as UpdateOrganizationSchema;

    // Dry run to validate
    const validateRes = await orgAPI.update(orgId, payload, true);

    // If dry run succeeds, create for real
    if (validateRes) {
      await orgAPI.update(orgId, payload);
    }

    await cache.removeItem('organizations');
    await cache.removeItem(`organizations:${orgId}`);

    return dataWithToast(null, {
      title: 'Organization updated successfully',
      description: 'You have successfully updated an organization.',
      type: 'success',
    });
  } catch (error) {
    return dataWithToast(null, {
      title: 'Error',
      description: error instanceof Error ? error.message : (error as Response).statusText,
      type: 'error',
    });
  }
};

export default function OrgPreferencesPage() {
  const organization = useRouteLoaderData('org-detail');

  return (
    <div className="mx-auto flex w-full flex-col gap-6">
      {/* General Settings */}
      <OrganizationGeneralCard organization={organization ?? {}} />

      {/* Danger Zone */}
      {/* {organization && organization?.type !== OrganizationType.Personal ? (
        <OrganizationDangerCard organization={organization ?? {}} />
      ) : null} */}
    </div>
  );
}
