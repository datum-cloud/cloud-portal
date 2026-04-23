import { useApp } from '@/providers/app.provider';
import { useUpdateUser, userSchema } from '@/resources/users';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';

/**
 * Account Profile Settings Card Component
 * Displays and allows editing of general account settings
 */
export const AccountProfileSettingsCard = () => {
  const { user, setUser } = useApp();

  const updateMutation = useUpdateUser(user?.sub ?? 'me', {
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      toast.success('Profile', {
        description: 'The profile has been updated successfully',
      });
    },
    onError: (error) => {
      toast.error('Profile', {
        description: error.message ?? 'Failed to update profile',
      });
    },
  });

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Profile Information</CardTitle>
      </CardHeader>

      <Form.Root
        name="update-profile"
        id="update-profile-form"
        schema={userSchema}
        mode="onBlur"
        defaultValues={{
          firstName: user?.givenName ?? '',
          lastName: user?.familyName ?? '',
          email: user?.email ?? '',
        }}
        isSubmitting={updateMutation.isPending}
        onSubmit={(data) => {
          updateMutation.mutate({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="px-5 py-4">
              <div className="flex max-w-[816px] flex-col space-y-8">
                <div className="flex w-full flex-col gap-4 sm:flex-row">
                  <Form.Field name="firstName" label="First Name" required className="sm:w-1/2">
                    <Form.Input placeholder="e.g. John" autoFocus />
                  </Form.Field>
                  <Form.Field name="lastName" label="Last Name" required className="sm:w-1/2">
                    <Form.Input placeholder="e.g. Doe" />
                  </Form.Field>
                </div>
                <Form.Field
                  name="email"
                  label="Primary email"
                  required
                  className="sm:w-1/2 sm:pr-2"
                  description="Your primary email is used for account notifications">
                  <Form.Select placeholder="Select an email">
                    <Form.SelectItem value={user?.email ?? ''}>{user?.email}</Form.SelectItem>
                  </Form.Select>
                </Form.Field>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting}
                size="xs"
                onClick={() => {
                  form.reset();
                }}>
                Cancel
              </Button>
              <Form.Submit size="xs" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
