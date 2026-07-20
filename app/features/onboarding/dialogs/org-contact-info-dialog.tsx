import { AddressFields } from '@/features/address/address-fields';
import {
  buildOrgContactDefaults,
  orgContactInfoSchema,
  type OrgContactInfoValues,
} from '@/features/onboarding/schemas/org-contact-info-schema';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { Form } from '@datum-cloud/datum-ui/form';

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-lg">
        <Dialog.Header className="mb-0 border-b" title="Contact information" onClose={onClose} />
        <Form.Root
          name="org-contact-info"
          id="org-contact-info-form"
          schema={orgContactInfoSchema}
          mode="onSubmit"
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
              <Form.Input autoComplete="email" data-e2e="org-contact-email" />
            </Form.Field>

            <Form.Field name="name" label="Contact name" required>
              <Form.Input autoComplete="name" data-e2e="org-contact-name" />
            </Form.Field>

            <Form.Field
              name="businessName"
              label="Business name"
              description="Legal entity or company name. Optional for personal accounts.">
              <Form.Input placeholder="e.g. Acme Corp Ltd" autoComplete="organization" />
            </Form.Field>

            <AddressFields dataE2ePrefix="org-contact" />
          </Dialog.Body>
          <Dialog.Footer className="border-t">
            <Button htmlType="button" type="quaternary" theme="outline" onClick={onClose}>
              Cancel
            </Button>
            <Form.Submit loading={isSaving} loadingText="Saving" data-e2e="org-contact-save">
              Save
            </Form.Submit>
          </Dialog.Footer>
        </Form.Root>
      </Dialog.Content>
    </Dialog>
  );
};
