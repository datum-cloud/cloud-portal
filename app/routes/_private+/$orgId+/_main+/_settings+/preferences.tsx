import { OrganizationDangerCard } from '@/features/organization/settings/danger-card';
import { OrganizationGeneralCard } from '@/features/organization/settings/general-card';
import { validateCSRF } from '@/modules/cookie/csrf.server';
import { dataWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { createOrganizationsControl } from '@/resources/control-plane/organizations.control';
import { OrganizationType } from '@/resources/interfaces/organization.interface';
import {
  UpdateOrganizationSchema,
  updateOrganizationSchema,
} from '@/resources/schemas/organization.schema';
import { CustomError } from '@/utils/errorHandle';
import { mergeMeta, metaObject } from '@/utils/meta';
import { parseWithZod } from '@conform-to/zod';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Preferences</span>,
};

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Preferences');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { orgId } = params;
  const { controlPlaneClient, cache } = context as AppLoadContext;

  try {
    if (!orgId) {
      throw new CustomError('Organization ID is required', 400);
    }

    const orgAPI = createOrganizationsControl(controlPlaneClient as Client);

    const clonedRequest = request.clone();
    const formData = await clonedRequest.formData();

    await validateCSRF(formData, clonedRequest.headers);

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: updateOrganizationSchema });

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data');
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
  const { organization } = useApp();

  return (
    <div className="mx-auto flex w-full flex-col gap-4">
      {/* General Settings */}
      <OrganizationGeneralCard organization={organization ?? {}} />

      {/* Danger Zone */}
      {organization && organization?.type !== OrganizationType.Personal ? (
        <OrganizationDangerCard organization={organization ?? {}} />
      ) : null}
    </div>
  );
}
