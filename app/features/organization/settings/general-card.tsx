import { TextCopyBox } from '@/components/text-copy/text-copy-box';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { IOrganization, OrganizationType } from '@/resources/interfaces/organization.interface';
import { updateOrganizationSchema } from '@/resources/schemas/organization.schema';
import { ROUTE_PATH as ORGANIZATION_UPDATE_ACTION } from '@/routes/api/organizations/$id';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, CardHeader, CardTitle, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter } from '@datum-ui/components';
import { Form } from '@datum-ui/components/new-form';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

const schema = updateOrganizationSchema.pick({ description: true });

/**
 * Organization General Settings Card Component
 * Displays and allows editing of general organization settings
 */
export const OrganizationGeneralCard = ({ organization }: { organization: IOrganization }) => {
  const fetcher = useDatumFetcher({
    key: 'update-organization',
    onSuccess: () => {
      toast.success('Organization updated successfully', {
        description: 'The Organization has been updated successfully',
      });
    },
    onError: (data) => {
      toast.error(data.error || 'Failed to update organization');
    },
  });
  const csrf = useAuthenticityToken();

  return (
    <Card className="gap-0 rounded-xl py-0">
      <CardHeader className="border-b px-4.5 py-4">
        <CardTitle className="text-sm font-medium">Organization Info</CardTitle>
      </CardHeader>
      <Form.Root
        id="update-organization-form"
        schema={schema}
        defaultValues={{
          description: organization?.displayName ?? '',
        }}
        isSubmitting={fetcher.state !== 'idle'}
        onSubmit={(data) => {
          const payload = {
            ...data,
            csrf: csrf as string,
          };

          fetcher.submit(payload, {
            method: 'PATCH',
            action: getPathWithParams(ORGANIZATION_UPDATE_ACTION, { id: organization?.name }),
            encType: 'application/json',
          });
        }}
        className="flex flex-col gap-6">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="px-4.5 py-4">
              <div className="flex max-w-sm flex-col gap-5">
                {organization?.type === OrganizationType.Personal ? (
                  <div className="flex flex-col space-y-2">
                    <label className="text-sm font-medium">Organization Name</label>
                    <TextCopyBox value={organization?.displayName ?? ''} />
                  </div>
                ) : (
                  <Form.Field name="description" label="Organization Name" required>
                    <Form.Input placeholder="e.g. My Organization" />
                  </Form.Field>
                )}
                <div className="flex flex-col space-y-2">
                  <label className="text-sm font-medium">Resource ID</label>
                  <TextCopyBox value={organization?.name ?? ''} />
                </div>
              </div>
            </CardContent>
            {organization && organization?.type !== OrganizationType.Personal && (
              <CardFooter className="flex justify-end gap-2 border-t px-4.5 py-4">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  disabled={isSubmitting}
                  size="xs"
                  onClick={() => {
                    form.update({
                      value: {
                        description: organization?.displayName ?? '',
                      },
                    });
                  }}>
                  Cancel
                </Button>
                <Form.Submit size="xs" loadingText="Saving">
                  Save
                </Form.Submit>
              </CardFooter>
            )}
          </>
        )}
      </Form.Root>
    </Card>
  );
};
