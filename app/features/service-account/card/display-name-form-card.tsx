import { showMutationErrorToast } from '@/modules/quota';
import {
  serviceAccountUpdateSchema,
  useUpdateServiceAccount,
  type ServiceAccount,
} from '@/resources/service-accounts';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';

export const DisplayNameFormCard = ({
  projectId,
  defaultValue,
}: {
  projectId: string;
  defaultValue: ServiceAccount;
}) => {
  const updateMutation = useUpdateServiceAccount(projectId, defaultValue?.name ?? '', {
    onSuccess: () => {
      toast.success('Service Account', {
        description: 'Display name updated successfully.',
      });
    },
    onError: (error: Error) =>
      showMutationErrorToast(error, {
        fallbackTitle: 'Service Account',
        fallbackDescription: error.message || 'An error occurred while updating the display name.',
        scope: 'project',
        projectId,
      }),
  });

  return (
    <Card size="sm" sectioned>
      <CardHeader size="sm" bordered>
        <CardDescription className="text-xs">
          A human-friendly label shown in the portal. The resource name itself cannot be changed.
        </CardDescription>
      </CardHeader>
      <Form.Root
        id="display-name-form"
        schema={serviceAccountUpdateSchema}
        mode="onBlur"
        defaultValues={{
          displayName: defaultValue?.displayName ?? '',
        }}
        isSubmitting={updateMutation.isPending}
        onSubmit={(data) => {
          updateMutation.mutate({
            displayName: data.displayName ?? '',
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="space-y-6">
              <Form.Field name="displayName">
                <Form.Input type="text" placeholder="e.g. Deploy Bot" autoFocus />
              </Form.Field>
            </CardContent>
            <CardFooter bordered className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting}
                size="xs"
                className="w-full sm:w-auto"
                onClick={() => {
                  form.reset();
                }}>
                Cancel
              </Button>
              <Form.Submit size="xs" className="w-full sm:w-auto" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
