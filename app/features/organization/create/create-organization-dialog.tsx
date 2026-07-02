import type { OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { Dialog } from '@datum-cloud/datum-ui/dialog';

export interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactDefaults: Partial<OrgContactInfoValues>;
  stripePublishableKey?: string;
  onCreated: (result: { orgId: string; contactInfo: OrgContactInfoValues }) => void;
}

export const CreateOrganizationDialog = ({
  open,
  onOpenChange,
  contactDefaults,
  stripePublishableKey,
  onCreated,
}: CreateOrganizationDialogProps) => {
  const onClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-lg">
        <Dialog.Header
          className="mb-0 border-b"
          title="Create organization"
          description="Add contact and billing details to set up a new organization."
          onClose={onClose}
        />
        <Dialog.Body className="mb-0 px-5 py-5">
          {open ? (
            <OrgBillingSetupForm
              key="create-organization"
              contactDefaults={contactDefaults}
              stripePublishableKey={stripePublishableKey}
              submitLabel="Create organization"
              onComplete={(result) => {
                onCreated(result);
                onClose();
              }}
            />
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
};
