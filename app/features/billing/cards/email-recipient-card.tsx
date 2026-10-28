import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { z } from 'zod';

/**
 * Schema for the invoice email: one address, or empty to use the billing
 * contact's email. Saved as `BillingContactInfo.invoiceEmails`, kept to
 * one entry because Stripe emails each invoice to a single address (see
 * `invoice-email.ts`).
 */
const invoiceEmailSchema = z.object({
  email: z.email('Enter a valid email address').or(z.literal('')).optional(),
});

export type EmailRecipientValues = z.infer<typeof invoiceEmailSchema>;

interface EmailRecipientCardProps {
  /** The current invoice email, when one is set. */
  defaultEmail?: string;
  /** The billing contact's email, used when the invoice email is empty. */
  contactEmail?: string;
  isSubmitting?: boolean;
  onSubmit?: (values: EmailRecipientValues) => void | Promise<void>;
}

export const EmailRecipientCard = ({
  defaultEmail = '',
  contactEmail,
  isSubmitting = false,
  onSubmit,
}: EmailRecipientCardProps) => {
  return (
    <Card size="sm" sectioned>
      <Form.Root
        name="invoice-email"
        id="invoice-email-form"
        schema={invoiceEmailSchema}
        mode="onBlur"
        defaultValues={{ email: defaultEmail }}
        isSubmitting={isSubmitting}
        onSubmit={(values) => onSubmit?.(values)}
        className="flex flex-col space-y-0">
        {({ form }) => (
          <>
            <CardContent>
              <Form.Field
                name="email"
                label="Invoice email"
                description={
                  contactEmail
                    ? `We'll send invoices and receipts here. Leave empty to use your billing contact's email (${contactEmail}).`
                    : "We'll send invoices and receipts here. Leave empty to use your billing contact's email."
                }>
                <Form.Input
                  type="email"
                  placeholder={contactEmail || 'finance@example.com'}
                  autoComplete="email"
                  data-e2e="invoice-email"
                />
              </Form.Field>
            </CardContent>
            <CardFooter bordered className="flex justify-end gap-2">
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
