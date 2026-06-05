import { toStringArray } from '@/utils/helpers/form-value.helper';
import { Form } from '@datum-cloud/datum-ui/form';
import { z } from 'zod';

/**
 * Minimal org-summary shape the picker renders. Callers project their
 * preferred org type (resource hook return, loader response, etc.) onto
 * this — we deliberately don't import the full `Organization` shape
 * here so the dialog stays decoupled from the resource layer.
 */
export interface OrgOption {
  /** Org id — written back through the form value (`Organization.metadata.name`). */
  name: string;
  /** Human label rendered in the dropdown. */
  displayName: string;
}

/**
 * Schema for creating a new `BillingAccount`.
 *
 * - `displayName` → `metadata.annotations['kubernetes.io/display-name']`.
 *   The user-facing label tables and the detail header read from. Also
 *   doubles as the slug source for the generated `metadata.name`.
 * - `name` → `spec.contactInfo.name`. The individual the platform
 *   talks to about this account; auto-populated from the signed-in
 *   user's profile and threaded through a hidden input.
 * - `invoiceEmails` → `contactInfo.invoiceEmails` (first entry is also
 *   used as `contactInfo.email` until the user edits it on the detail
 *   page). At least one entry is required so freshly-created accounts
 *   always have a sensible invoice destination from the start; the
 *   dialog hides the field and auto-populates it from the user's
 *   email.
 *
 * Neither `name` nor `invoiceEmails` is presented as an editable
 * field. The schema still validates them so a missing user record
 * fails the submit instead of silently creating an account with an
 * empty contact name.
 *
 * `businessName` / legal entity is intentionally NOT collected here —
 * users can fill it in from the detail page once the account exists.
 * Same for address, tax IDs, and currency: the goal here is "get the
 * account created in two clicks", not collect everything Stripe will
 * eventually need. `spec.currencyCode` is set server-side to USD.
 */
// `error` on each `z.string({...})` covers the `invalid_type` case
// (field arriving as `undefined`) so the user sees the same friendly
// message they'd get for an empty string.
export const createBillingAccountSchema = z.object({
  // Org that owns the account. Threaded through so the submit handler
  // can compute the right namespace — in the org-scoped flow we hide
  // the picker and pre-fill from the URL, in the user-level cross-org
  // flow the picker is visible and required. Both flows enforce a
  // non-empty value here so the namespace is never derived from a
  // stale or empty default downstream.
  organizationName: z
    .string({ error: 'Pick the organization that owns this account' })
    .min(1, 'Pick the organization that owns this account'),
  // User-facing label, written to the `kubernetes.io/display-name`
  // annotation. Cap mirrors the standard Kubernetes annotation-value
  // length so we never produce a payload the API server would reject
  // on its own length check (`MaxLength=256` upstream).
  displayName: z
    .string({ error: 'Give this billing account a name' })
    .min(1, 'Give this billing account a name')
    .max(256, 'Name is too long (256 characters max)'),
  // Cap mirrors the backend `MaxLength=256` on `contactInfo.name`.
  name: z
    .string({ error: 'Add a contact name for this billing account' })
    .min(1, 'Add a contact name for this billing account')
    .max(256, 'Name is too long (256 characters max)'),
  // Conform's form adapter JSON-serializes arrays as strings when
  // they pass through hidden inputs (and historically through the
  // TagsInput widget the dialog no longer renders). Un-stringify
  // before validation so the schema always sees an actual
  // `string[]`.
  invoiceEmails: z
    .unknown()
    .transform(toStringArray)
    .pipe(
      z
        .array(z.string())
        .min(1, 'Add at least one invoice email')
        .superRefine((emails, ctx) => {
          const emailSchema = z.email();
          const invalid = emails.filter((e) => !emailSchema.safeParse(e).success);
          if (invalid.length > 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid email${invalid.length > 1 ? 's' : ''}: ${invalid.join(', ')}`,
              path: [],
            });
          }
        })
    ),
});

export type CreateBillingAccountValues = z.infer<typeof createBillingAccountSchema>;

interface CreateBillingAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Invoice destination. Threaded into the hidden `invoiceEmails`
   * field — the user can't edit it from the dialog; the detail page
   * exposes the full recipient editor for changes after creation.
   * Callers should pass the signed-in user's email; an empty value
   * fails schema validation and surfaces an error toast on submit.
   */
  defaultContactEmail?: string;
  /**
   * Contact name. Same hidden-input pattern as `defaultContactEmail`
   * — surfaced as the account label until the user edits the contact
   * info from the detail page. Callers should derive this from the
   * signed-in user's profile.
   */
  defaultContactName?: string;
  /**
   * Orgs the picker should expose. Pass the user's full org-membership
   * list (cross-org user-level create flow) to render an "Organization"
   * field as the first input. Leave undefined in the org-scoped flow
   * where the parent route already has an org in scope — combine with
   * `defaultOrganization` to thread the value through invisibly.
   */
  organizations?: readonly OrgOption[];
  /**
   * Pre-selected organization (`Organization.metadata.name`). When set
   * and `organizations` is omitted, the org picker stays hidden and the
   * value is threaded through `onSubmit` unchanged. When set alongside
   * `organizations`, the picker renders with this value pre-selected.
   */
  defaultOrganization?: string;
  /**
   * Optional seed for the visible "Name" input. Most callers leave
   * this blank — the field is the user's chance to pick a label that
   * isn't "their own name" — but we surface the prop so an entry
   * point that already knows the intended name (deep link, retry
   * flow) can pre-fill it.
   */
  defaultDisplayName?: string;
  /**
   * Awaited by `Form.Dialog` to drive its built-in submit spinner — return
   * a promise from your mutation here and the button will sit on the
   * loading label until it resolves.
   */
  onSubmit?: (values: CreateBillingAccountValues) => void | Promise<void>;
}

export const CreateBillingAccountDialog = ({
  open,
  onOpenChange,
  defaultContactEmail = '',
  defaultContactName = '',
  defaultDisplayName = '',
  organizations,
  defaultOrganization = '',
  onSubmit,
}: CreateBillingAccountDialogProps) => {
  // The schema's `invoiceEmails` transform un-stringifies JSON-array
  // payloads back to `string[]`. Serializing the seed here lets us
  // thread the value through a single hidden input — without the JSON
  // wrapper a plain string seed gets re-wrapped as a one-element
  // array on the read side, which still works but reads weirdly.
  const invoiceEmailsHidden = defaultContactEmail ? JSON.stringify([defaultContactEmail]) : '[]';

  // Picker is only rendered when the caller actually supplies an org
  // list — the org-scoped flow keeps the field hidden and threads the
  // value through `defaultOrganization` instead so the schema's
  // `organizationName` constraint is still satisfied.
  const showOrgPicker = !!organizations && organizations.length > 0;

  // Render preview only if we actually have something to show; an
  // empty seed will fail schema validation on submit (the user sees a
  // toast from the page-level error handler), so we don't render a
  // fake preview that contradicts the failure.
  const hasContactSeed = !!defaultContactName && !!defaultContactEmail;

  return (
    <Form.Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create a billing account"
      description="We'll use the contact details on your profile to set up the account. You can add payment methods, billing address, and extra invoice recipients from the account page once it's created."
      schema={createBillingAccountSchema}
      // The schema's `invoiceEmails` declares an output type of
      // `string[]` (post-transform), but at form-init time the value
      // is still the JSON string we hand to the hidden input.
      // Conform's `defaultValues` is typed off the output shape, so
      // assert the wider shape here — the hidden input + the
      // `toStringArray` transform line everything up at submit time.
      defaultValues={
        {
          organizationName: defaultOrganization,
          displayName: defaultDisplayName,
          name: defaultContactName,
          invoiceEmails: invoiceEmailsHidden,
        } as unknown as CreateBillingAccountValues
      }
      onSubmit={(values) => onSubmit?.(values)}
      submitText="Create account"
      submitTextLoading="Creating..."
      className="w-full sm:max-w-xl">
      {/*
       * Conform doesn't serialize keys whose fields never mount, so
       * bare `defaultValues` entries for `name` / `invoiceEmails` /
       * `organizationName` would silently drop on submit. We render
       * each as a real hidden input outside the `divide-y` block so
       * they don't add stray top borders to the next field.
       *
       * The contact name and email come from the signed-in user's
       * profile rather than a free-text input — the dialog used to
       * collect them but the values are predictable enough that the
       * extra UI was just one more thing to fill out. The detail
       * page exposes the full editor for tweaks after creation.
       */}
      {!showOrgPicker && (
        <input type="hidden" name="organizationName" value={defaultOrganization} readOnly />
      )}
      <input type="hidden" name="name" value={defaultContactName} readOnly />
      <input type="hidden" name="invoiceEmails" value={invoiceEmailsHidden} readOnly />

      <div className="divide-border space-y-0 divide-y *:px-5 *:py-5 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0">
        {/*
         * Name first. This is the only piece of identity the dialog
         * actually asks for — it ends up on tables, the detail
         * header, and the breadcrumb, so we don't want it buried
         * after the org picker.
         */}
        <Form.Field
          name="displayName"
          label="Name"
          description="A friendly label for the account."
          required>
          <Form.Input
            type="text"
            placeholder="e.g. Acme production billing"
            autoFocus
            autoComplete="off"
          />
        </Form.Field>

        {showOrgPicker && (
          <Form.Field
            name="organizationName"
            label="Organization"
            description="The org this billing account lives in. Members of the org can see and manage it; usage from any project bound to it rolls up here."
            required>
            <Form.Select placeholder="Select an organization">
              {organizations.map((org) => (
                <Form.SelectItem key={org.name} value={org.name}>
                  {org.displayName}
                </Form.SelectItem>
              ))}
            </Form.Select>
          </Form.Field>
        )}

        {/*
         * Auto-populated preview. Confirms which identity the new
         * account will be created under — without it the dialog
         * looks like "type a name, click Create" with no signal
         * about whose details land on the resulting invoices.
         */}
        <div className="flex flex-col gap-3">
          <div className="text-foreground text-sm font-medium">Account contact</div>
          {hasContactSeed ? (
            <dl className="border-border bg-muted/40 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5 rounded-md border px-4 py-3 text-sm">
              <dt className="text-muted-foreground">Name</dt>
              <dd className="text-foreground">{defaultContactName}</dd>
              <dt className="text-muted-foreground">Invoice email</dt>
              <dd className="text-foreground">{defaultContactEmail}</dd>
            </dl>
          ) : (
            <p className="text-muted-foreground text-sm">
              We could not read a contact name and email from your profile. Update your account
              details first, then try again.
            </p>
          )}
          <p className="text-muted-foreground text-xs">
            Change the contact or add more invoice recipients from the account detail page after the
            account is created.
          </p>
        </div>
      </div>
    </Form.Dialog>
  );
};
