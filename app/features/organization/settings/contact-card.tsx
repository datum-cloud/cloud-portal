import { OwnerOnlyNote } from './owner-only-note';
import { toastApiError } from '@/components/error/toast-api-error';
import { AddressFields } from '@/features/address/address-fields';
import { CountryAutocomplete } from '@/features/address/country-autocomplete';
import {
  buildOrgContactDefaults,
  orgContactInfoSchema,
  orgContactInfoToFormValues,
  toOrganizationContactInfoPatch,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { type Organization, useUpdateOrganizationContactInfo } from '@/resources/organizations';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useMemo } from 'react';

/**
 * Organization Contact Settings Card
 *
 * Displays and edits `Organization.spec.contactInfo` — the same details
 * collected during onboarding (primary contact, business name, and postal
 * address). Reuses the onboarding contact schema/mappers so the shape stays in
 * lockstep with the create flow. Only the organization's owners can edit
 * (`canEdit`); everyone else sees the fields and buttons disabled.
 */
export const OrganizationContactCard = ({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) => {
  const updateContactInfo = useUpdateOrganizationContactInfo(organization?.name ?? '', {
    onSuccess: () => {
      toast.success('Contact information', {
        description: 'The organization contact details have been updated successfully',
      });
    },
    onError: (error) => {
      toastApiError(error, { title: 'Contact information' });
    },
  });

  const defaultValues = useMemo(
    () => buildOrgContactDefaults(orgContactInfoToFormValues(organization?.contactInfo)),
    [organization?.contactInfo]
  );

  return (
    <Card size="sm" sectioned className="relative">
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">Contact</CardTitle>
      </CardHeader>
      <Form.Root
        name="update-organization-contact"
        id="update-organization-contact-form"
        schema={orgContactInfoSchema}
        mode="onBlur"
        defaultValues={defaultValues}
        isSubmitting={updateContactInfo.isPending}
        onSubmit={(values) => {
          updateContactInfo.mutate({
            contactInfo: toOrganizationContactInfoPatch(values, organization?.contactInfo),
          });
        }}
        className="flex flex-col space-y-0">
        {({ form, isSubmitting, isDirty }) => (
          <fieldset disabled={!canEdit} className="contents">
            <CardContent className="flex flex-col gap-8">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Form.Field name="email" label="Email" required>
                  <Form.Input autoComplete="email" />
                </Form.Field>

                <Form.Field name="name" label="Contact name" required>
                  <Form.Input autoComplete="name" />
                </Form.Field>

                <Form.Field
                  name="businessName"
                  label="Business name"
                  description="Legal entity or company name. Optional for personal accounts.">
                  <Form.Input autoComplete="organization" />
                </Form.Field>

                <Form.Field
                  name="country"
                  label="Country or region"
                  description="Helps us determine billing region and tax rules.">
                  <CountryAutocomplete />
                </Form.Field>
              </div>

              <AddressFields layout="grid" includeCountry={false} dataE2ePrefix="org-contact" />
            </CardContent>
            <CardFooter bordered className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {!canEdit && <OwnerOnlyNote />}
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting || !isDirty}
                size="xs"
                onClick={() => form.reset()}>
                Cancel
              </Button>
              <Form.Submit size="xs" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </fieldset>
        )}
      </Form.Root>
    </Card>
  );
};
