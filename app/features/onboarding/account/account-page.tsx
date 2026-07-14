import { BILLING_COUNTRIES, BILLING_PRIORITY_COUNTRY_CODES } from '@/features/billing/constants';
import { AccountIdentitySummary } from '@/features/onboarding/account/account-identity-summary';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import {
  onboardingAccountSchema,
  type OnboardingAccountValues,
} from '@/features/onboarding/schemas/onboarding-account-schema';
import { useTransitionNavigate } from '@/hooks/useTransitionNavigate';
import { useUpdateUserPreferences, type LastLoginProviderValue } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { SelectSeparator } from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useMemo } from 'react';
import { Link } from 'react-router';

export interface AccountPageProps {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string;
  lastLoginProvider?: LastLoginProviderValue;
  country?: string;
}

export const AccountPage = ({
  userId,
  fullName,
  email,
  avatarUrl,
  lastLoginProvider,
  country = '',
}: AccountPageProps) => {
  const { submitAndNavigate, isNavigating } = useTransitionNavigate();

  const updateProfileMutation = useUpdateUserPreferences(userId, {
    onError: (error) => {
      toast.error('Account information', {
        description: error.message ?? 'Failed to save your country',
      });
    },
  });

  const { priorityItems, otherItems } = useMemo(() => {
    const prioritySet = new Set<string>(BILLING_PRIORITY_COUNTRY_CODES);
    const priority: typeof BILLING_COUNTRIES = [];
    const others: typeof BILLING_COUNTRIES = [];
    for (const country of BILLING_COUNTRIES) {
      if (prioritySet.has(country.value)) {
        priority.push(country);
      } else {
        others.push(country);
      }
    }
    return { priorityItems: priority, otherItems: others };
  }, []);

  const showCountrySeparator = priorityItems.length > 0 && otherItems.length > 0;

  const handleSubmit = (values: OnboardingAccountValues) =>
    submitAndNavigate(
      () => updateProfileMutation.mutateAsync({ country: values.country }),
      paths.onboarding.billing,
      { replace: true }
    );

  return (
    <OnboardingEntrance>
      <Card className={cn(onboardingCardClassName, 'z-10')}>
        <CardContent className="flex flex-col gap-8 p-0">
          <p className="text-muted-foreground text-1xs text-center tracking-[0.4px] uppercase">
            Step 1 / 2
          </p>

          <h2 className="text-center text-2xl font-semibold">Account information</h2>

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
              <Form.Select placeholder="Select a country">
                {priorityItems.map((country) => (
                  <Form.SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </Form.SelectItem>
                ))}
                {showCountrySeparator && <SelectSeparator />}
                {otherItems.map((country) => (
                  <Form.SelectItem key={country.value} value={country.value}>
                    {country.label}
                  </Form.SelectItem>
                ))}
              </Form.Select>
            </Form.Field>

            <p className="text-foreground text-xs leading-4 opacity-60">
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
            </p>

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
