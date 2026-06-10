import { toStringArray } from '@/utils/helpers/form-value.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { TagsInput } from '@datum-cloud/datum-ui/tag-input';
import { z } from 'zod';

/**
 * Schema for the invoice-recipient list. Mirrors
 * `BillingContactInfo.invoiceEmails` on the API (milo-os/billing#37):
 * an empty list is valid — the controller falls back to
 * `contactInfo.email` as a single primary recipient. When the list is
 * non-empty, every entry has to look like an email.
 *
 * `TagsInput` writes back through Conform's form adapter, which
 * JSON-serializes arrays as strings. `toStringArray` un-stringifies so
 * the schema always sees an actual `string[]` (including the empty
 * case where Conform emits the literal `"[]"`).
 */
const emailRecipientsSchema = z.object({
  emails: z
    .unknown()
    .transform(toStringArray)
    .pipe(
      z.array(z.string()).superRefine((emails, ctx) => {
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

export type EmailRecipientValues = z.infer<typeof emailRecipientsSchema>;

interface EmailRecipientCardProps {
  /** Existing recipients. First entry is the primary; rest are CC'd. */
  defaultEmails?: string[];
  isSubmitting?: boolean;
  onSubmit?: (values: EmailRecipientValues) => void | Promise<void>;
}

export const EmailRecipientCard = ({
  defaultEmails = [],
  isSubmitting = false,
  onSubmit,
}: EmailRecipientCardProps) => {
  // Conform's form adapter treats a raw array `defaultValue` as an
  // indexed field array, so only the first entry would bind to the
  // single `emails` field the TagsInput reads — the rest drop on the
  // initial render (which is why a multi-recipient account only showed
  // one address). Seeding a JSON-stringified value keeps the whole
  // list intact; `toStringArray` (here and in the schema transform)
  // expands it back on read and submit. Mirrors the create dialog's
  // hidden-input seed.
  const emailsDefault = JSON.stringify(defaultEmails);

  return (
    <Card className="gap-0 rounded-xl py-0 shadow-none">
      <Form.Root
        name="email-recipients"
        id="email-recipients-form"
        schema={emailRecipientsSchema}
        mode="onBlur"
        defaultValues={{ emails: emailsDefault } as unknown as EmailRecipientValues}
        isSubmitting={isSubmitting}
        onSubmit={(values) => onSubmit?.(values)}
        className="flex flex-col space-y-0">
        {({ form }) => (
          <>
            <CardContent className="px-5 py-4">
              <Form.Field
                name="emails"
                label="Invoice recipients"
                description="We'll send invoices and receipts to every address here. Press Enter, comma, or semicolon to add each email. Leave empty to fall back to the account contact email.">
                {({ control, field }) => (
                  <TagsInput
                    id={field.id}
                    name={field.name}
                    value={toStringArray(control.value)}
                    onValueChange={control.change}
                    placeholder="finance@example.com"
                    delimiters={['Enter', ',', ';', ' ']}
                    normalizer={(val) => val.toLowerCase()}
                    showValidationErrors={false}
                  />
                )}
              </Form.Field>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                size="xs"
                disabled={isSubmitting}
                onClick={() => form.reset()}>
                Cancel
              </Button>
              <Form.Submit size="xs" loadingText="Saving">
                Save
              </Form.Submit>
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
