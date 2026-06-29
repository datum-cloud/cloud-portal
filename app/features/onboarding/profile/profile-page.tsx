import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { userKeys, userSchema, useUpdateUser, type User } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router';

export interface ProfilePageProps {
  userId: string;
  email: string;
  givenName: string;
}

const userAfterSuccessfulNameSave = (updated: User): User => ({
  ...updated,
  nameReviewRequired: false,
});

export const ProfilePage = ({ userId, email, givenName }: ProfilePageProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateMutation = useUpdateUser(userId, {
    onSuccess: (updatedUser) => {
      const next = userAfterSuccessfulNameSave(updatedUser);
      queryClient.setQueryData(userKeys.detail(userId), next);
      navigate(paths.account.organizations.root, { replace: true });
    },
    onError: (error) => {
      toast.error('Profile', {
        description: error.message ?? 'Failed to update your name',
      });
    },
  });

  return (
    <OnboardingEntrance>
      <Card className="bg-card text-foreground z-10 w-full max-w-full rounded-xl border p-3 sm:max-w-[400px] sm:p-4 md:p-6 lg:p-8 xl:p-[44px]">
        <CardContent className="p-0">
          <h2 className="mb-3 text-center text-xl font-medium">What should we call you?</h2>
          <div className="text-foreground mb-6 flex flex-col gap-2 text-center text-[14px] leading-5 font-normal opacity-80">
            <p>Unfortunately, GitHub only tells us your username, not your real name.</p>
            <p>
              And while names like &quot;git_happens5000&quot; and &quot;{givenName}&quot; are super
              rad, we&apos;d love to know what to actually call you.
            </p>
          </div>

          <Form.Root
            name="onboarding-profile"
            id="onboarding-profile-form"
            schema={userSchema}
            mode="onBlur"
            defaultValues={{ email }}
            isSubmitting={updateMutation.isPending}
            onSubmit={async (data) => {
              await updateMutation.mutateAsync({
                firstName: data.firstName,
                lastName: data.lastName,
                email: data.email,
              });
            }}
            className="flex flex-col gap-6">
            <div className="mb-0 flex w-full flex-col gap-4">
              <Form.Field name="firstName" label="First name" required className="w-full">
                <Form.Input placeholder="e.g. John" autoFocus />
              </Form.Field>
              <Form.Field name="lastName" label="Last name" required className="w-full">
                <Form.Input placeholder="e.g. Doe" />
              </Form.Field>
            </div>
            <Form.Field name="email" label="Email" className="sr-only hidden">
              <Form.Input readOnly tabIndex={-1} autoComplete="off" className="hidden" />
            </Form.Field>

            <Form.Submit className="w-full" size="default" loadingText="Saving...">
              Continue
            </Form.Submit>
          </Form.Root>
          <div className="mt-4 text-center">
            <Link
              to={paths.auth.logOut}
              className="dark:text-foreground dark:hover:text-foreground text-[14px] text-gray-600 underline hover:text-gray-900">
              Log out
            </Link>
          </div>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
};
