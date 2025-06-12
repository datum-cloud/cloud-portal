import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { routes } from '@/constants/routes';
import { OrganizationForm } from '@/features/organization/form';
import { useApp } from '@/providers/app.provider';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { iamOrganizationsAPI } from '@/resources/api/iam/organizations.api';
import { OrganizationSchema, organizationSchema } from '@/resources/schemas/organization.schema';
import { ROUTE_PATH as ORG_ACTION_PATH } from '@/routes/api+/organizations+/$orgId';
import { dataWithToast, redirectWithToast } from '@/utils/cookies/toast';
import { CustomError } from '@/utils/errorHandle';
import { validateCSRF } from '@/utils/helpers/csrf.helper';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { parseWithZod } from '@conform-to/zod';
import { AxiosInstance } from 'axios';
import { CircleAlertIcon } from 'lucide-react';
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useFetcher } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Organization Settings');
});

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
  const { orgId } = params;
  const { apiClient } = context as AppLoadContext;

  const orgAPI = iamOrganizationsAPI(apiClient as AxiosInstance);

  if (!orgId) {
    throw new CustomError('Organization ID is required', 400);
  }

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
    const validateRes = await orgAPI.update(orgId, payload, true);

    // If dry run succeeds, create for real
    if (validateRes) {
      await orgAPI.update(orgId, payload);
    }

    return redirectWithToast(routes.account.organizations.root, {
      title: 'Organization updated successfully',
      description: 'You have successfully updated an organization.',
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

export default function OrgSettingsPage() {
  const fetcher = useFetcher({ key: 'org-settings' });
  const { organization } = useApp();
  const { confirm } = useConfirmationDialog();

  const deleteOrganization = async () => {
    await confirm({
      title: 'Delete Organization',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{organization?.displayName}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmInputLabel: `Type "${organization?.displayName}" to confirm.`,
      confirmInputPlaceholder: 'Type the organization name to confirm deletion',
      confirmValue: organization?.displayName ?? 'delete',
      onSubmit: async () => {
        await fetcher.submit(
          {},
          {
            method: 'DELETE',
            action: getPathWithParams(ORG_ACTION_PATH, { orgId: organization?.id }),
          }
        );
      },
    });
  };

  return (
    <div className="mx-auto my-4 w-full max-w-3xl md:my-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Organization Name Section */}
        <OrganizationForm defaultValue={organization} />

        {/* Danger Zone */}
        {organization && !organization?.status?.personal && (
          <Card className="border-destructive/50 hover:border-destructive border pb-0 transition-colors">
            <CardHeader>
              <CardTitle className="text-destructive">Danger zone</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <CircleAlertIcon className="size-5 shrink-0" />
                <AlertTitle className="text-sm font-semibold">
                  Warning: Destructive Action
                </AlertTitle>
                <AlertDescription>
                  This action cannot be undone. Once deleted, this organization and all its
                  resources will be permanently removed. The organization name will be reserved and
                  cannot be reused for future organizations to prevent deployment conflicts.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
              <Button
                variant="destructive"
                size="sm"
                className="font-medium"
                onClick={() => deleteOrganization()}>
                Delete
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
