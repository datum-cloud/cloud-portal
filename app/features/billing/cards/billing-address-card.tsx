import {
  BILLING_COUNTRIES,
  BILLING_PRIORITY_COUNTRY_CODES,
  BUSINESS_TAX_ID_TYPES,
} from '@/features/billing/constants';
import type { BillingAddress, TaxID } from '@/features/billing/types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form, useFormContext } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { SelectSeparator } from '@datum-cloud/datum-ui/select';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { z } from 'zod';

/**
 * Field validation mirrors `BillingAddress` + `TaxID` on
 * `BillingAccount.spec.billingDetails` (milo-os/billing#37). Only `country`
 * is API-required; the rest are optional because postal-address conventions
 * vary too much by region to enforce centrally. A tax-ID row, when present,
 * must have both a type slug and a value — half-filled rows are rejected
 * so we never round-trip a malformed `taxIds` entry to the API.
 */
// Passing `error` on each `z.string({...})` covers the `invalid_type` case
// (field arriving as `undefined`) so the user sees the same friendly message
// they'd get for an empty string instead of "expected string, received
// undefined". Optional max-length fields still get a friendly upper-bound
// message via `.max(n, 'msg')`.
const taxIdSchema = z.object({
  type: z
    .string({ error: 'Pick a tax type for this entry' })
    .min(1, 'Pick a tax type for this entry')
    .regex(/^[a-z]{2}_[a-z][a-z_]*$/, 'Pick a tax type from the list')
    .max(32, 'Tax type is too long'),
  value: z
    .string({ error: 'Enter the registration number' })
    .min(1, 'Enter the registration number')
    .max(64, 'Tax ID is too long (64 characters max)'),
});

export const billingAddressSchema = z.object({
  // The backend collapsed individual `firstName` / `lastName` on
  // `BillingAddress` into a single `BillingContactInfo.name` field —
  // mirrors how Stripe/Adyen Customer records store a single name.
  // Lives on this form because the user thinks of "who's being
  // billed" and "where invoices ship to" as one editing surface.
  name: z.string().max(256, 'Name is too long (256 characters max)').optional(),
  // Optional. Cap mirrors the backend `MaxLength=256` on
  // `BillingContactInfo.businessName`. Lives on this form for the
  // same reason as `name` above; persists onto
  // `contactInfo.businessName`, not the address itself.
  businessName: z.string().max(256, 'Business name is too long (256 characters max)').optional(),
  country: z
    .string({ error: 'Pick a country so we know where to bill' })
    .min(1, 'Pick a country so we know where to bill')
    .regex(/^[A-Z]{2}$/, 'Pick a country from the list'),
  line1: z.string().max(256, 'Address line 1 is too long (256 characters max)').optional(),
  line2: z.string().max(256, 'Address line 2 is too long (256 characters max)').optional(),
  city: z.string().max(128, 'City is too long (128 characters max)').optional(),
  region: z.string().max(128, 'State or region is too long (128 characters max)').optional(),
  postalCode: z.string().max(32, 'Postal code is too long (32 characters max)').optional(),
  taxIds: z.array(taxIdSchema),
});

export type BillingAddressValues = z.infer<typeof billingAddressSchema>;

/** Seed shape accepted by every entry point that touches this form. */
type BillingAddressDefaults = Partial<BillingAddress> & {
  taxIds?: TaxID[];
  name?: string;
  businessName?: string;
};

const buildInitialValues = (defaultValues?: BillingAddressDefaults): BillingAddressValues => ({
  name: defaultValues?.name ?? '',
  businessName: defaultValues?.businessName ?? '',
  // Default to US so new accounts start in a valid state and the user
  // can submit straight away after filling in the rest.
  country: defaultValues?.country ?? 'US',
  line1: defaultValues?.line1 ?? '',
  line2: defaultValues?.line2 ?? '',
  city: defaultValues?.city ?? '',
  region: defaultValues?.region ?? '',
  postalCode: defaultValues?.postalCode ?? '',
  taxIds: defaultValues?.taxIds ?? [],
});

// ─── BillingAddressForm ────────────────────────────────────────────────
// Owns `<Form.Root>` and the schema/defaults plumbing so live-preview
// siblings (e.g. `<InvoicePreviewCard />`) can subscribe to the same
// form via `useWatchAll`. Anything outside `<Form.Root>` is on the
// other side of the form context boundary and won't see the values.

interface BillingAddressFormProps {
  /** Seed for the contact name, address, business name, and tax IDs. */
  defaultValues?: BillingAddressDefaults;
  isSubmitting?: boolean;
  onSubmit?: (values: BillingAddressValues) => void | Promise<void>;
  /**
   * Optional className applied to the underlying `<form>` element.
   * Callers that need the form to BE a grid / flex container (so the
   * children are direct grid items) wire the layout classes here —
   * e.g. `grid grid-cols-2`. The form drops the adapter's default
   * vertical rhythm so this className wins.
   */
  className?: string;
  /**
   * Layout — render the fields card alongside whatever extras you
   * need (e.g. a preview pane). Anything rendered in here is inside
   * the form context, so hooks like `useWatchAll` work.
   */
  children: ReactNode;
}

/**
 * Form provider for the billing-address editing surface. Keeps the
 * schema and default-values normalization in one place so callers
 * just hand it a `defaultValues` object and an `onSubmit`. Render
 * `<BillingAddressFieldsCard />` (and any sibling preview) as
 * children to plug into the form context.
 */
export const BillingAddressForm = ({
  defaultValues,
  isSubmitting = false,
  onSubmit,
  className,
  children,
}: BillingAddressFormProps) => (
  <Form.Root
    name="billing-address"
    id="billing-address-form"
    schema={billingAddressSchema}
    mode="onBlur"
    defaultValues={buildInitialValues(defaultValues)}
    isSubmitting={isSubmitting}
    onSubmit={(values) => onSubmit?.(values)}
    // Default to a vertical stack so the all-in-one
    // `<BillingAddressCard>` keeps working unchanged; callers that
    // want a grid override via `className`.
    className={className ?? 'flex flex-col space-y-0'}>
    {children}
  </Form.Root>
);

// ─── BillingAddressFieldsCard ──────────────────────────────────────────

interface BillingAddressFieldsCardProps {
  countries?: Array<{ value: string; label: string }>;
  taxIdTypes?: Array<{ value: string; label: string }>;
  /** Drives the Cancel button's disabled state. */
  isSubmitting?: boolean;
}

/**
 * The actual fields card. Must be rendered inside
 * `<BillingAddressForm>` — it reads the form instance from context to
 * wire up the Cancel reset.
 */
export const BillingAddressFieldsCard = ({
  countries = BILLING_COUNTRIES,
  taxIdTypes = BUSINESS_TAX_ID_TYPES,
  isSubmitting = false,
}: BillingAddressFieldsCardProps) => {
  // `useFormContext()` returns the `FormContextValue` directly, so
  // `reset` lives at the top level — not nested under `.form` like in
  // the `<Form.Root>` render-prop signature.
  const { reset } = useFormContext();

  // Split the incoming country list into the "priority" markets (US, UK,
  // Western Europe, …) and the alphabetical rest so we can render a
  // `<SelectSeparator>` between them. When a consumer passes a custom
  // `countries` list that doesn't overlap with the priority set (e.g. an
  // EU-only filter), `priorityItems` is empty and the separator is
  // skipped automatically — the picker renders as a flat list.
  const { priorityItems, otherItems } = useMemo(() => {
    const prioritySet = new Set<string>(BILLING_PRIORITY_COUNTRY_CODES);
    const priority: typeof countries = [];
    const others: typeof countries = [];
    for (const country of countries) {
      if (prioritySet.has(country.value)) {
        priority.push(country);
      } else {
        others.push(country);
      }
    }
    return { priorityItems: priority, otherItems: others };
  }, [countries]);

  const showCountrySeparator = priorityItems.length > 0 && otherItems.length > 0;

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <CardContent className="space-y-5 px-5 py-4">
        <Form.Field
          name="name"
          label="Contact name"
          description="Person we should talk to about this account. Appears as the “ATTN:” line on invoices when a business name is also set."
          className="max-w-md">
          <Form.Input autoComplete="name" />
        </Form.Field>

        <Form.Field
          name="businessName"
          label="Business name"
          description="Legal entity that pays. Leave blank for personal accounts; we'll print this on invoices for B2B billing."
          className="max-w-md">
          <Form.Input autoComplete="organization" />
        </Form.Field>

        <Form.Field name="country" label="Country or region" required className="max-w-md">
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
          <Form.Input autoComplete="address-line1" />
        </Form.Field>

        <Form.Field name="line2" label="Address line 2">
          <Form.Input autoComplete="address-line2" />
        </Form.Field>

        <div className="flex w-full flex-col gap-4 sm:flex-row">
          <Form.Field name="city" label="City" className="sm:w-1/2">
            <Form.Input autoComplete="address-level2" />
          </Form.Field>
          <Form.Field name="region" label="State / Region" className="sm:w-1/2">
            <Form.Input autoComplete="address-level1" />
          </Form.Field>
        </div>

        <Form.Field name="postalCode" label="Postal code" className="max-w-xs">
          <Form.Input autoComplete="postal-code" />
        </Form.Field>

        <div className="border-border space-y-3 border-t pt-5">
          <div className="flex flex-col gap-1">
            <h3 className="text-foreground text-sm font-medium">Tax IDs</h3>
            <p className="text-muted-foreground text-xs">
              Add one entry per tax registration. Only required for registered businesses.
            </p>
          </div>

          <Form.FieldArray name="taxIds">
            {({ fields, append, remove }) => (
              <div className="flex flex-col gap-3">
                {fields.length > 0 && (
                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.key} className="flex flex-col items-start gap-2 sm:flex-row">
                        <Form.Field
                          name={`taxIds.${index}.type`}
                          label={index === 0 ? 'Type' : undefined}
                          required
                          className="w-full sm:w-1/2">
                          <Form.Select placeholder="Select tax type">
                            {taxIdTypes.map((taxIdType) => (
                              <Form.SelectItem key={taxIdType.value} value={taxIdType.value}>
                                {taxIdType.label}
                              </Form.SelectItem>
                            ))}
                          </Form.Select>
                        </Form.Field>
                        <Form.Field
                          name={`taxIds.${index}.value`}
                          label={index === 0 ? 'Registration number' : undefined}
                          required
                          className="w-full sm:flex-1">
                          <Form.Input placeholder="e.g. GB123456789" />
                        </Form.Field>
                        <Button
                          htmlType="button"
                          type="quaternary"
                          theme="borderless"
                          size="small"
                          aria-label={`Remove tax ID ${index + 1}`}
                          className={`text-destructive w-fit ${index === 0 ? 'sm:mt-6' : ''}`}
                          onClick={() => remove(index)}>
                          <Icon icon={Trash2Icon} className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  htmlType="button"
                  type="quaternary"
                  theme="outline"
                  size="xs"
                  className="w-full sm:w-fit"
                  onClick={() => append({ type: '', value: '' })}>
                  <Icon icon={PlusIcon} className="size-4" />
                  Add tax ID
                </Button>
              </div>
            )}
          </Form.FieldArray>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
        <Button
          htmlType="button"
          type="quaternary"
          theme="outline"
          size="xs"
          disabled={isSubmitting}
          onClick={() => reset()}>
          Cancel
        </Button>
        <Form.Submit size="xs" loadingText="Saving">
          Save
        </Form.Submit>
      </CardFooter>
    </Card>
  );
};

// ─── BillingAddressCard ────────────────────────────────────────────────
// All-in-one convenience wrapper for the simple case: one card, no
// preview. Identical API to the original `BillingAddressCard` so any
// future caller that just wants the form-in-a-card without a custom
// layout can drop it in unchanged.

interface BillingAddressCardProps {
  defaultValues?: BillingAddressDefaults;
  countries?: Array<{ value: string; label: string }>;
  taxIdTypes?: Array<{ value: string; label: string }>;
  isSubmitting?: boolean;
  onSubmit?: (values: BillingAddressValues) => void | Promise<void>;
}

export const BillingAddressCard = ({
  defaultValues,
  countries,
  taxIdTypes,
  isSubmitting,
  onSubmit,
}: BillingAddressCardProps) => (
  <BillingAddressForm defaultValues={defaultValues} isSubmitting={isSubmitting} onSubmit={onSubmit}>
    <BillingAddressFieldsCard
      countries={countries}
      taxIdTypes={taxIdTypes}
      isSubmitting={isSubmitting}
    />
  </BillingAddressForm>
);
