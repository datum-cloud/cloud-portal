import { paymentTermsPath } from '@/features/onboarding/payment-terms/payment-terms-paths';
import type { OrgContactInfoValues } from '@/features/onboarding/schemas/org-contact-info-schema';
import { OrgBillingSetupForm } from '@/features/organization/billing/org-billing-setup-form';
import { logger } from '@/modules/logger';
import { useDeleteOrganization } from '@/resources/organizations';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

export interface CreateOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactDefaults: Partial<OrgContactInfoValues>;
  stripePublishableKey?: string;
  onCreated: (result: { orgId: string; contactInfo: OrgContactInfoValues }) => void | Promise<void>;
}

export const CreateOrganizationDialog = ({
  open,
  onOpenChange,
  contactDefaults,
  stripePublishableKey,
  onCreated,
}: CreateOrganizationDialogProps) => {
  // The org (+ billing account) is provisioned the moment contact info is
  // saved — several steps before the final "Create organization" button. If
  // the user closes the dialog in that window we'd leave an orphaned,
  // half-finished org behind, so we track it and tear it down on abandon.
  const provisionedOrgIdRef = useRef<string | null>(null);
  const completedRef = useRef(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const navigate = useNavigate();

  const deleteOrganization = useDeleteOrganization();

  const resetLifecycle = () => {
    provisionedOrgIdRef.current = null;
    completedRef.current = false;
  };

  // Applying for payment terms instead of adding a card keeps the new org:
  // it waits for review like an onboarding org, so it mustn't be cleaned up
  // as abandoned when the dialog goes away.
  const handleApplyForPaymentTerms = (orgId: string) => {
    completedRef.current = true;
    setIsFinishing(true);
    navigate(paymentTermsPath({ orgId, entry: 'create' }));
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && isFinishing) {
      return;
    }

    if (!next) {
      const orgId = provisionedOrgIdRef.current;
      // Closed mid-flow after provisioning but before completing → discard the
      // orphaned org. Fire-and-forget: the dialog is going away regardless.
      if (orgId && !completedRef.current) {
        deleteOrganization.mutate(orgId, {
          onError: (error) => {
            logger.error(
              `Failed to clean up abandoned organization ${orgId} after dialog close`,
              error as Error
            );
          },
        });
      }
      resetLifecycle();
    }
    onOpenChange(next);
  };

  const onClose = () => handleOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content className="w-full sm:max-w-lg">
        <Dialog.Header
          className="mb-0 border-b"
          title="Add an Organization"
          description="Add contact and billing details to set up a new organization."
          onClose={onClose}
        />
        <Dialog.Body className="mb-0 px-5 py-5">
          {open ? (
            <OrgBillingSetupForm
              key="create-organization"
              contactDefaults={contactDefaults}
              stripePublishableKey={stripePublishableKey}
              showDisplayNameField
              paymentTerms={{ entry: 'create', onApply: handleApplyForPaymentTerms }}
              submitLabel="Create organization"
              onOrgProvisioned={(setup) => {
                provisionedOrgIdRef.current = setup.orgId;
              }}
              onComplete={async (result) => {
                // Completed successfully — keep the org and skip cleanup.
                // Stay open (with the submit spinner) until navigation unmounts us.
                completedRef.current = true;
                setIsFinishing(true);
                try {
                  await onCreated(result);
                } catch (error) {
                  completedRef.current = false;
                  setIsFinishing(false);
                  throw error;
                }
              }}
            />
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
};
