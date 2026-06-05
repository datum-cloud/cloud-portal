import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardContent, CardFooter } from '@datum-cloud/datum-ui/card';
import { Form } from '@datum-cloud/datum-ui/form';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { z } from 'zod';

/**
 * Single-field form for the billing account's display name. Backs
 * the editable "Name" section on the detail page; the page wires the
 * submit handler into `useUpdateBillingAccount` which PATCHes the
 * `kubernetes.io/display-name` annotation.
 *
 * The bound matches the schema on `CreateBillingAccountDialog`
 * (`MaxLength=256` upstream on annotation values) so a name that
 * passes here can't fail the equivalent edit applied via the create
 * flow.
 */
export const displayNameFormSchema = z.object({
  displayName: z
    .string({ error: 'Give this billing account a name' })
    .min(1, 'Give this billing account a name')
    .max(256, 'Name is too long (256 characters max)'),
});

export type DisplayNameFormValues = z.infer<typeof displayNameFormSchema>;

interface DisplayNameFormCardProps {
  /** Current annotation value (or fallback display name). Seeds the input. */
  defaultDisplayName: string;
  /** Drives the Save spinner + disables Cancel while a patch is in-flight. */
  isSubmitting?: boolean;
  /**
   * When `false`, the inputs and submit button are disabled and the
   * Save button shows a permission-denied tooltip. The page passes
   * the result of the `billingaccounts·patch` permission check here;
   * the surrounding `<RestrictedOverlay>` (rendered as a sibling by
   * the page when permission is denied) is what surfaces *why*.
   */
  canEdit?: boolean;
  onSubmit?: (values: DisplayNameFormValues) => void | Promise<void>;
}

export const DisplayNameFormCard = ({
  defaultDisplayName,
  isSubmitting = false,
  canEdit = true,
  onSubmit,
}: DisplayNameFormCardProps) => {
  return (
    <Card className="rounded-xl pt-5 pb-4 shadow-none">
      <Form.Root
        id="billing-account-display-name-form"
        schema={displayNameFormSchema}
        mode="onBlur"
        defaultValues={{ displayName: defaultDisplayName }}
        isSubmitting={isSubmitting}
        onSubmit={(values) => onSubmit?.(values)}
        className="flex flex-col gap-6 space-y-0">
        {({ form }) => (
          <>
            <CardContent>
              <Form.Field
                name="displayName"
                label="Name"
                description="Tables, the breadcrumb trail, and the detail header all read from this. Changes apply immediately to every place the account surfaces.">
                <Form.Input
                  type="text"
                  placeholder="e.g. Acme production billing"
                  disabled={!canEdit}
                  autoComplete="off"
                />
              </Form.Field>
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
              <Button
                htmlType="button"
                type="quaternary"
                theme="outline"
                disabled={isSubmitting || !canEdit}
                size="xs"
                className="w-full sm:w-auto"
                onClick={() => form.reset()}>
                Cancel
              </Button>
              {canEdit ? (
                <Form.Submit size="xs" className="w-full sm:w-auto" loadingText="Saving">
                  Save
                </Form.Submit>
              ) : (
                <Tooltip
                  message="You don't have permission to rename this billing account"
                  side="top">
                  <Form.Submit size="xs" className="w-full sm:w-auto" loadingText="Saving" disabled>
                    Save
                  </Form.Submit>
                </Tooltip>
              )}
            </CardFooter>
          </>
        )}
      </Form.Root>
    </Card>
  );
};
