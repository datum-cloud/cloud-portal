import { useApp } from '@/providers/app.provider';
import { type Organization, useUpdateOrganization } from '@/resources/organizations';
import { updateOrganizationSchema } from '@/resources/organizations';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';

const schema = updateOrganizationSchema.pick({ description: true, name: true });

/**
 * Organization General Settings Card Component
 * Displays and allows editing of general organization settings
 */
export const OrganizationGeneralCard = ({ organization }: { organization: Organization }) => {
  const { setOrganization } = useApp();

  const updateOrganization = useUpdateOrganization(organization?.name ?? '', {
    onSuccess: (updatedOrg) => {
      // Update the app-wide organization state so header reflects changes
      setOrganization(updatedOrg);
      toast.success('Organization', {
        description: 'The Organization has been updated successfully',
      });
    },
    onError: (error) => {
      toast.error('Organization', {
        description: error.message || 'Failed to update organization',
      });
    },
  });

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Organization Info</CardTitle>
      </CardHeader>
      <Form.Root
        name="update-organization"
        id="update-organization-form"
        schema={schema}
        mode="onBlur"
        defaultValues={{
          description: organization?.displayName ?? '',
          name: organization?.name ?? '',
        }}
        isSubmitting={updateOrganization.isPending}
        onSubmit={(data) => {
          updateOrganization.mutate({
            displayName: data.description,
            resourceVersion: organization.resourceVersion,
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="px-5 py-4">
              <div className="flex max-w-sm flex-col gap-5">
                {organization?.type === 'Personal' ? (
                  <Form.Field
                    name="description"
                    label="Organization Name"
                    description="Personal organization names cannot be changed">
                    <Form.CopyBox />
                  </Form.Field>
                ) : (
                  <Form.Field name="description" label="Organization Name" required>
                    <Form.Input
                      data-e2e="edit-organization-name-input"
                      placeholder="e.g. My Organization"
                    />
                  </Form.Field>
                )}
                <Form.Field name="name" label="Resource ID">
                  <Form.CopyBox />
                </Form.Field>
              </div>
            </CardContent>
            {organization && organization?.type !== 'Personal' && (
              <CardFooter className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  data-e2e="edit-organization-cancel"
                  disabled={isSubmitting}
                  size="xs"
                  onClick={() => {
                    form.reset();
                  }}>
                  Cancel
                </Button>
                <Form.Submit size="xs" loadingText="Saving" data-e2e="edit-organization-save">
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
