import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { BILLING_COUNTRIES, BILLING_PRIORITY_COUNTRY_CODES } from '@/features/billing/constants';
import {
  buildOrgContactDefaults,
  orgContactInfoSchema,
  orgContactInfoToFormValues,
  toOrganizationContactInfo,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { useAccessReview } from '@/modules/rbac';
import { type Organization, useUpdateOrganizationContactInfo } from '@/resources/organizations';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { SelectSeparator } from '@datum-cloud/datum-ui/select';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useMemo } from 'react';

/**
 * Organization Contact Settings Card
 *
 * Displays and edits `Organization.spec.contactInfo` — the same details
 * collected during onboarding (primary contact, business name, and postal
 * address). Reuses the onboarding contact schema/mappers so the shape stays in
 * lockstep with the create flow. Gated behind `organizations:patch` like the
 * general card.
 */
export const OrganizationContactCard = ({ organization }: { organization: Organization }) => {
  const { allowed: canEdit, isLoading: permLoading } = useAccessReview('organizations', 'patch', {
    group: 'resourcemanager.miloapis.com',
    name: organization?.name,
    scope: 'user',
  });

  const updateContactInfo = useUpdateOrganizationContactInfo(organization?.name ?? '', {
    onSuccess: () => {
      toast.success('Contact information', {
        description: 'The organization contact details have been updated successfully',
      });
    },
    onError: (error) => {
      toast.error('Contact information', {
        description: error.message || 'Failed to update contact details',
      });
    },
  });

  const defaultValues = useMemo(
    () => buildOrgContactDefaults(orgContactInfoToFormValues(organization?.contactInfo)),
    [organization?.contactInfo]
  );

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

  return (
    <Card className="relative gap-0 rounded-xl py-0 shadow-none">
      {permLoading ? (
        <LoaderOverlay />
      ) : (
        !canEdit && (
          <RestrictedOverlay message="You don't have permission to edit this organization" />
        )
      )}
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">Contact</CardTitle>
      </CardHeader>
      <Form.Root
        name="update-organization-contact"
        id="update-organization-contact-form"
        schema={orgContactInfoSchema}
        mode="onBlur"
        defaultValues={defaultValues}
        isSubmitting={updateContactInfo.isPending}
        onSubmit={(values) => {
          updateContactInfo.mutate({ contactInfo: toOrganizationContactInfo(values) });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting }) => (
          <>
            <CardContent className="flex flex-col gap-8 px-5 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Form.Field name="email" label="Email" required>
                  <Form.Input placeholder="e.g. jane@acme.com" autoComplete="email" />
                </Form.Field>

                <Form.Field name="name" label="Contact name" required>
                  <Form.Input placeholder="e.g. Jane Doe" autoComplete="name" />
                </Form.Field>

                <Form.Field
                  name="businessName"
                  label="Business name"
                  description="Legal entity or company name. Optional for personal accounts.">
                  <Form.Input placeholder="e.g. Acme Corp Ltd" autoComplete="organization" />
                </Form.Field>

                <Form.Field
                  name="country"
                  label="Country or region"
                  description="Helps us determine billing region and tax rules.">
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
              </div>

              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Form.Field name="line1" label="Address line 1">
                    <Form.Input placeholder="Street and number" autoComplete="address-line1" />
                  </Form.Field>

                  <Form.Field name="line2" label="Address line 2">
                    <Form.Input
                      placeholder="Apartment, suite, building"
                      autoComplete="address-line2"
                    />
                  </Form.Field>

                  <Form.Field name="city" label="City">
                    <Form.Input placeholder="e.g. London" autoComplete="address-level2" />
                  </Form.Field>

                  <Form.Field name="region" label="State / Region">
                    <Form.Input placeholder="e.g. England" autoComplete="address-level1" />
                  </Form.Field>

                  <Form.Field name="postalCode" label="Postal code">
                    <Form.Input placeholder="e.g. SW1A 1AA" autoComplete="postal-code" />
                  </Form.Field>
                </div>
              </div>
            </CardContent>
            {!permLoading && canEdit && (
              <CardFooter className="flex flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:justify-end">
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  disabled={isSubmitting}
                  size="xs"
                  onClick={() => form.reset()}>
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
