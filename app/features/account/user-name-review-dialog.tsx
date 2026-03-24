import { useApp } from '@/providers/app.provider';
import { useUpdateUser, userKeys, userSchema, type User } from '@/resources/users';
import { toast } from '@datum-ui/components';
import { Form } from '@datum-ui/components/form';
import { useQueryClient } from '@tanstack/react-query';

function userAfterSuccessfulNameSave(updated: User): User {
  return { ...updated, nameReviewRequired: false };
}

/**
 * Shown when Milo sets iam.miloapis.com/name-review-required on the User (identical given/family from IdP).
 * First and last name are required; the dialog cannot be dismissed until Save succeeds and the control plane clears the annotation.
 */
export function UserNameReviewDialog() {
  const { user, setUser } = useApp();
  const queryClient = useQueryClient();
  const open = !!user?.nameReviewRequired;
  const userId = user?.sub ?? 'me';

  const updateMutation = useUpdateUser(userId, {
    onSuccess: (updatedUser) => {
      const next = userAfterSuccessfulNameSave(updatedUser);
      setUser(next);
      queryClient.setQueryData(userKeys.detail(userId), next);
      toast.success('Profile', {
        description: 'Your name has been updated successfully',
      });
    },
    onError: (error) => {
      toast.error('Profile', {
        description: error.message ?? 'Failed to update your name',
      });
    },
  });

  return (
    <Form.Dialog
      key={open ? 'name-review-open' : 'name-review-closed'}
      open={open}
      showCancel={false}
      showHeaderClose={false}
      title="What should we call you?"
      description={
        <div className="flex flex-col gap-2">
          <p>Unfortunately, GitHub only tells us your username, not your real name. </p>

          <p>
            And while names like &quot;git_happens5000&quot; and &quot;{user?.givenName}&quot; are
            super rad, we&apos;d love to know what to actually call you.
          </p>
        </div>
      }
      schema={userSchema}
      submitText="Save"
      submitTextLoading="Saving..."
      loading={updateMutation.isPending}
      defaultValues={{
        email: user?.email ?? '',
      }}
      onSubmit={async (data) => {
        await updateMutation.mutateAsync({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
        });
      }}
      className="max-w-lg">
      <div className="px-5">
        <div className="flex w-full flex-col gap-4 md:flex-row">
          <Form.Field name="firstName" label="First name" required className="w-full md:w-1/2">
            <Form.Input placeholder="e.g. John" autoFocus />
          </Form.Field>
          <Form.Field name="lastName" label="Last name" required className="w-full md:w-1/2">
            <Form.Input placeholder="e.g. Doe" />
          </Form.Field>
        </div>
        <Form.Field name="email" label="Email" className="sr-only hidden">
          <Form.Input readOnly tabIndex={-1} autoComplete="off" />
        </Form.Field>
      </div>
    </Form.Dialog>
  );
}
