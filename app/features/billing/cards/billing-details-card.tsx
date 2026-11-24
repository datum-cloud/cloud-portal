import { AddressFields } from '@/features/address/address-fields';
import { addressSchemaFields } from '@/features/address/address-schema';
import { BILLING_COUNTRIES, BUSINESS_TAX_ID_TYPES } from '@/features/billing/constants';
import { invoiceEmail } from '@/features/billing/invoice-email';
import {
  BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION,
  getBillingAccountDisplayName,
  type BillingAccount,
} from '@/features/billing/types';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form, useWatch } from '@datum-cloud/datum-ui/form';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

// Bounds mirror the billing API: annotation values and contact fields are
// capped at 256, address lines likewise, tax IDs at 32/64. A tax-ID row needs
// both a type and a value so a half-filled row never reaches the API.
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

export const billingDetailsSchema = z.object({
  displayName: z
    .string({ error: 'Give this billing account a name' })
    .min(1, 'Give this billing account a name')
    .max(256, 'Name is too long (256 characters max)'),
  name: z.string().max(256, 'Name is too long (256 characters max)').optional(),
  businessName: z.string().max(256, 'Business name is too long (256 characters max)').optional(),
  // Required by billing: it gets billing notifications, and invoices when
  // there's no invoice email.
  email: z
    .email({
      error: (issue) =>
        issue.input === undefined
          ? 'Enter an email for the billing contact'
          : 'Enter a valid email address',
    })
    .max(256, 'Email is too long (256 characters max)'),
  // Conform submits an empty field as undefined, so optional covers "use the
  // billing contact" without marking the field required.
  invoiceEmail: z.email('Enter a valid email address').optional(),
  ...addressSchemaFields,
  // Billing needs a country to bill in, where onboarding can leave it empty.
  country: z
    .string({ error: 'Pick a country so we know where to bill' })
    .min(1, 'Pick a country so we know where to bill')
    .regex(/^[A-Z]{2}$/, 'Pick a country from the list'),
  taxIds: z.array(taxIdSchema),
});

export type BillingDetailsValues = z.infer<typeof billingDetailsSchema>;

function initialValues(account: BillingAccount): BillingDetailsValues {
  const contact = account.spec?.contactInfo;
  const address = contact?.address;
  return {
    // Starts from the name the summary shows, so an account without the
    // display-name annotation doesn't open with an empty required field.
    displayName:
      account.metadata?.annotations?.[BILLING_ACCOUNT_DISPLAY_NAME_ANNOTATION] ||
      contact?.businessName ||
      contact?.name ||
      account.metadata?.name ||
      '',
    name: contact?.name ?? '',
    businessName: contact?.businessName ?? '',
    email: contact?.email ?? '',
    invoiceEmail: contact?.invoiceEmails?.[0] ?? '',
    country: address?.country ?? 'US',
    line1: address?.line1 ?? '',
    line2: address?.line2 ?? '',
    city: address?.city ?? '',
    region: address?.region ?? '',
    postalCode: address?.postalCode ?? '',
    taxIds: account.spec?.taxIds ?? [],
  };
}

/**
 * The values as they'd be saved, for telling whether the form changed: empty
 * fields count as unset, as the form submits them.
 */
function comparable(values: Partial<BillingDetailsValues>): string {
  return JSON.stringify(values, (_key, value) =>
    value === '' || (Array.isArray(value) && value.length === 0) ? undefined : value
  );
}

const COUNTRY_LABELS = new Map(BILLING_COUNTRIES.map((c) => [c.value, c.label]));
const TAX_ID_LABELS = new Map(BUSINESS_TAX_ID_TYPES.map((t) => [t.value, t.label]));

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-foreground text-sm break-words">{children}</dd>
    </div>
  );
}

function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

function BillingDetailsView({ account }: { account: BillingAccount }) {
  const contact = account.spec?.contactInfo;
  const address = contact?.address;
  const taxIds = account.spec?.taxIds ?? [];
  const cityLine = [address?.city, address?.region, address?.postalCode].filter(Boolean).join(', ');
  const addressLines = [
    address?.line1,
    address?.line2,
    cityLine,
    address?.country ? (COUNTRY_LABELS.get(address.country) ?? address.country) : undefined,
  ].filter(Boolean);

  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2" data-e2e="billing-details">
      <Detail label="Account name">{getBillingAccountDisplayName(account)}</Detail>
      <Detail label="Billing contact">
        {contact?.name || contact?.email ? (
          <span className="flex flex-col" data-e2e="billing-contact">
            {contact?.name ? <span>{contact.name}</span> : null}
            {contact?.email ? (
              <span className="text-muted-foreground">{contact.email}</span>
            ) : (
              <span className="text-muted-foreground">No email set</span>
            )}
          </span>
        ) : (
          <NotSet />
        )}
      </Detail>
      <Detail label="Business name">{contact?.businessName || <NotSet />}</Detail>
      <Detail label="Invoice email">
        {contact?.invoiceEmails?.[0] ? (
          invoiceEmail(contact)
        ) : contact?.email ? (
          <span>
            {contact.email} <span className="text-muted-foreground">(contact email)</span>
          </span>
        ) : (
          <NotSet />
        )}
      </Detail>
      <Detail label="Billing address">
        {addressLines.length > 0 ? (
          <span className="flex flex-col">
            {addressLines.map((line, index) => (
              <span key={index}>{line}</span>
            ))}
          </span>
        ) : (
          <NotSet />
        )}
      </Detail>
      <Detail label="Tax IDs">
        {taxIds.length > 0 ? (
          <span className="flex flex-col">
            {taxIds.map((taxId) => (
              <span key={`${taxId.type}-${taxId.value}`}>
                <span className="text-muted-foreground">
                  {TAX_ID_LABELS.get(taxId.type) ?? taxId.type}:
                </span>{' '}
                {taxId.value}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">None</span>
        )}
      </Detail>
    </dl>
  );
}

/** The invoice email, whose help text names the contact email as typed. */
function InvoiceEmailField() {
  const contactEmail = (useWatch<string | undefined>('email') ?? '').trim();
  return (
    <Form.Field
      name="invoiceEmail"
      label="Invoice email"
      description={
        contactEmail
          ? `Invoices and receipts are emailed here. Leave empty to use the contact email (${contactEmail}).`
          : 'Invoices and receipts are emailed here. Leave empty to use the contact email.'
      }
      className="max-w-md">
      <Form.Input
        type="email"
        placeholder={contactEmail || 'finance@example.com'}
        autoComplete="email"
        data-e2e="invoice-email"
      />
    </Form.Field>
  );
}

function TaxIdFields() {
  return (
    <div className="border-border space-y-3 border-t pt-5">
      <div className="flex flex-col gap-1">
        <Title as="h3" level={7} weight="medium" textColor="default">
          Tax IDs
        </Title>
        <Text as="p" size="xs" textColor="muted">
          Add one entry per tax registration. Only required for registered businesses.
        </Text>
      </div>
      <Form.FieldArray name="taxIds">
        {({ fields, append, remove }) => (
          <div className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <div key={field.key} className="flex flex-col items-start gap-2 sm:flex-row">
                {/* Every row is labelled for screen readers; only the first shows it. */}
                <Form.Field
                  name={`taxIds.${index}.type`}
                  label="Type"
                  labelClassName={index === 0 ? undefined : 'sr-only'}
                  required
                  className="w-full sm:w-1/2">
                  <Form.Select placeholder="Select tax type">
                    {BUSINESS_TAX_ID_TYPES.map((taxIdType) => (
                      <Form.SelectItem key={taxIdType.value} value={taxIdType.value}>
                        {taxIdType.label}
                      </Form.SelectItem>
                    ))}
                  </Form.Select>
                </Form.Field>
                <Form.Field
                  name={`taxIds.${index}.value`}
                  label="Registration number"
                  labelClassName={index === 0 ? undefined : 'sr-only'}
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
  );
}

interface BillingDetailsCardProps {
  account: BillingAccount;
  /**
   * From the `billingaccounts·patch` check: false disables Edit and says
   * why, undefined while the check is still running disables it quietly.
   */
  canEdit: boolean | undefined;
  isSubmitting?: boolean;
  /** Saves the details. Rejecting keeps the form open with the user's input. */
  onSubmit: (values: BillingDetailsValues) => Promise<void>;
}

/**
 * The billing account's name, contact, address, tax IDs and invoice email.
 * Read-only until the user clicks Edit, so the details can't be changed by
 * accident; Save or Cancel returns to the read-only view, and focus goes back
 * to Edit. Saving with nothing changed just closes the form.
 */
export const BillingDetailsCard = ({
  account,
  canEdit,
  isSubmitting = false,
  onSubmit,
}: BillingDetailsCardProps) => {
  const [editing, setEditing] = useState(false);
  // Edit unmounts while the form is open, so focus is handed back to it when
  // the form closes rather than dropping to the top of the page.
  const returnFocus = useRef(false);
  const editRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node || !returnFocus.current) return;
    returnFocus.current = false;
    node.querySelector('button')?.focus();
  }, []);
  const close = () => {
    returnFocus.current = true;
    setEditing(false);
  };

  if (!editing) {
    return (
      <Card size="sm" sectioned>
        <CardContent className="flex flex-col gap-5">
          <BillingDetailsView account={account} />
        </CardContent>
        <CardFooter bordered className="flex justify-end">
          {canEdit !== false ? (
            <span ref={editRef}>
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                size="xs"
                disabled={canEdit === undefined}
                icon={<Icon icon={PencilIcon} className="size-3.5" />}
                onClick={() => setEditing(true)}
                data-e2e="billing-details-edit">
                Edit
              </Button>
            </span>
          ) : (
            <Tooltip message="You don't have permission to edit this billing account" side="top">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                size="xs"
                disabled
                icon={<Icon icon={PencilIcon} className="size-3.5" />}>
                Edit
              </Button>
            </Tooltip>
          )}
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card size="sm" sectioned>
      <Form.Root
        name="billing-details"
        id="billing-details-form"
        schema={billingDetailsSchema}
        mode="onBlur"
        defaultValues={initialValues(account)}
        isSubmitting={isSubmitting}
        onSubmit={async (values) => {
          if (comparable(values) === comparable(initialValues(account))) {
            close();
            return;
          }
          try {
            await onSubmit(values);
            close();
          } catch {
            // The caller reports the failure; stay in edit mode so the
            // user's input isn't lost.
          }
        }}
        className="flex flex-col space-y-0">
        <CardContent className="space-y-5">
          <Form.Field
            name="displayName"
            label="Account name"
            required
            description="How this billing account is labelled across the portal."
            className="max-w-md">
            <Form.Input autoComplete="off" placeholder="e.g. Acme production billing" autoFocus />
          </Form.Field>
          <Form.Field
            name="name"
            label="Contact name"
            description="Person we should talk to about this account. Appears as the “ATTN:” line on invoices when a business name is also set."
            className="max-w-md">
            <Form.Input autoComplete="name" />
          </Form.Field>
          <Form.Field
            name="email"
            label="Contact email"
            required
            description="Billing notifications go here, and invoices too unless you set an invoice email."
            className="max-w-md">
            <Form.Input
              type="email"
              placeholder="billing@example.com"
              autoComplete="email"
              data-e2e="contact-email"
            />
          </Form.Field>
          <Form.Field
            name="businessName"
            label="Business name"
            description="Legal entity that pays. Leave blank for personal accounts; we print it on invoices for business billing."
            className="max-w-md">
            <Form.Input autoComplete="organization" />
          </Form.Field>
          <InvoiceEmailField />
          <div className="border-border space-y-3 border-t pt-5">
            <div className="flex flex-col gap-1">
              <Title as="h3" level={7} weight="medium" textColor="default">
                Billing address
              </Title>
              <Text as="p" size="xs" textColor="muted">
                Changes show on upcoming invoices; past invoices aren&apos;t affected.
              </Text>
            </div>
            <AddressFields countryRequired dataE2ePrefix="billing-address" />
          </div>
          <TaxIdFields />
        </CardContent>
        <CardFooter bordered className="flex justify-end gap-2">
          <Button
            htmlType="button"
            type="quaternary"
            theme="outline"
            size="xs"
            disabled={isSubmitting}
            onClick={close}>
            Cancel
          </Button>
          <Form.Submit size="xs" loadingText="Saving" data-e2e="billing-details-save">
            Save
          </Form.Submit>
        </CardFooter>
      </Form.Root>
    </Card>
  );
};
