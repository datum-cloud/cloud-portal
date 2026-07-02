import { BILLING_COUNTRIES, BILLING_PRIORITY_COUNTRY_CODES } from '@/features/billing/constants';
import {
  buildOrgContactDefaults,
  orgContactInfoSchema,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';
import { SelectSeparator } from '@datum-cloud/datum-ui/select';
import { useMemo } from 'react';

interface OrgContactInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: Partial<OrgContactInfoValues>;
  onSave: (values: OrgContactInfoValues) => void | Promise<void>;
  isSaving?: boolean;
}

export const OrgContactInfoDialog = ({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  isSaving = false,
}: OrgContactInfoDialogProps) => {
  const onClose = () => onOpenChange(false);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-lg">
        <Dialog.Header className="mb-0 border-b" title="Contact information" onClose={onClose} />
        <Form.Root
          name="org-contact-info"
          id="org-contact-info-form"
          schema={orgContactInfoSchema}
          mode="onBlur"
          defaultValues={buildOrgContactDefaults(defaultValues)}
          onSubmit={async (values) => {
            try {
              await onSave(values);
              onClose();
            } catch {
              // Parent mutation surfaces the error toast; keep the dialog open.
            }
          }}
          className="flex flex-col">
          <Dialog.Body className="mb-0 flex flex-col gap-4 px-5 py-4">
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
              description="Optional. Helps us determine billing region and tax rules.">
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

            <Form.Field name="line1" label="Address line 1">
              <Form.Input placeholder="Street and number" autoComplete="address-line1" />
            </Form.Field>

            <Form.Field name="line2" label="Address line 2">
              <Form.Input placeholder="Apartment, suite, building" autoComplete="address-line2" />
            </Form.Field>

            <div className="flex w-full flex-col gap-4 sm:flex-row">
              <Form.Field name="city" label="City" className="sm:w-1/2">
                <Form.Input placeholder="e.g. London" autoComplete="address-level2" />
              </Form.Field>
              <Form.Field name="region" label="State / Region" className="sm:w-1/2">
                <Form.Input placeholder="e.g. England" autoComplete="address-level1" />
              </Form.Field>
            </div>

            <Form.Field name="postalCode" label="Postal code" className="max-w-xs">
              <Form.Input placeholder="e.g. SW1A 1AA" autoComplete="postal-code" />
            </Form.Field>
          </Dialog.Body>
          <Dialog.Footer className="border-t">
            <Button htmlType="button" type="quaternary" theme="outline" onClick={onClose}>
              Cancel
            </Button>
            <Form.Submit loading={isSaving} loadingText="Saving">
              Save
            </Form.Submit>
          </Dialog.Footer>
        </Form.Root>
      </Dialog.Content>
    </Dialog>
  );
};
