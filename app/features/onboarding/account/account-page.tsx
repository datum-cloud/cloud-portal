import { toastApiError } from '@/components/error/toast-api-error';
import { CountryAutocomplete } from '@/features/address/country-autocomplete';
import { AccountIdentitySummary } from '@/features/onboarding/account/account-identity-summary';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  onboardingAccountSchema,
  type OnboardingAccountValues,
} from '@/features/onboarding/schemas/onboarding-account-schema';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useUpdateUserPreferences, type LastLoginProviderValue } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Link } from 'react-router';

export interface AccountPageProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  lastLoginProvider?: LastLoginProviderValue;
  country?: string;
  /** Where to go once the account is saved: invitations to join, or billing. */
  nextPath?: string;
}

export const AccountPage = ({
  userId,
  fullName,
  email,
  avatarUrl,
  lastLoginProvider,
  country = '',
  nextPath = paths.onboarding.billing,
}: AccountPageProps) => {
  const { submitAndNavigate, isNavigating } = useTransitionNavigate();
  const { trackAction } = useAnalytics();

  const updateProfileMutation = useUpdateUserPreferences(userId, {
    onSuccess: () => {
      trackAction(AnalyticsAction.AccountDetailsSaved);
    },
    onError: (error) => {
      toastApiError(error, { title: 'Account information' });
    },
  });

  const handleSubmit = (values: OnboardingAccountValues) =>
    submitAndNavigate(
      () => updateProfileMutation.mutateAsync({ country: values.country }),
      nextPath,
      { replace: true }
    );

  return (
    <OnboardingEntrance>
      <Card className={cn(onboardingCardClassName, 'z-10')}>
        <CardContent className="flex flex-col gap-8 p-0">
          <Text
            as="p"
            size="2xs"
            textColor="muted"
            className="text-center tracking-[0.4px] uppercase">
            Step 1 / 2
          </Text>

          <Title as="h2" level={3} weight="semibold" className="text-center">
            Account information
          </Title>

          <Form.Root
            name="onboarding-account"
            id="onboarding-account-form"
            schema={onboardingAccountSchema}
            mode="onSubmit"
            defaultValues={{ country }}
            isSubmitting={isNavigating ? true : undefined}
            onSubmit={handleSubmit}
            className="flex flex-col">
            <AccountIdentitySummary
              fullName={fullName}
              email={email}
              avatarUrl={avatarUrl}
              lastLoginProvider={lastLoginProvider}
            />

            <Form.Field name="country" label="Country" required className="w-full">
              <CountryAutocomplete />
            </Form.Field>

            <Text as="p" size="xs" textColor="default" className="leading-4 opacity-60">
              By continuing, you agree to Datum&apos;s{' '}
              <Link
                to="https://datum.net/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link
                to="https://datum.net/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline">
                Privacy Policy
              </Link>
              , and to receive periodic emails with updates.
            </Text>

            <Form.Submit
              className="w-full"
              size="default"
              loading={isNavigating}
              loadingText="Saving...">
              Agree and continue
            </Form.Submit>
          </Form.Root>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
};
