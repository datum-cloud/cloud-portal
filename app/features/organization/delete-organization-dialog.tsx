import { ConfirmationDialogProvider } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useDeleteOrganizationConfirmation } from '@/features/organization/use-delete-organization-confirmation';
import { RbacProvider } from '@/modules/rbac';
import { paths } from '@/utils/config/paths.config';
import { Button } from '@datum-cloud/datum-ui/button';
import { Dialog } from '@datum-cloud/datum-ui/dialog';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { useNavigate } from 'react-router';

interface DeleteOrganizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  orgDisplayName?: string;
}

function DeleteOrganizationDialogContent({
  open,
  onOpenChange,
  orgId,
  orgDisplayName,
}: DeleteOrganizationDialogProps) {
  const navigate = useNavigate();
  const onClose = () => onOpenChange(false);

  const { canDelete, permLoading, isDeleting, confirmDelete } = useDeleteOrganizationConfirmation({
    orgId,
    orgDisplayName,
    onSuccess: () => {
      onClose();
      navigate(paths.account.organizations.root);
    },
  });

  const displayLabel = orgDisplayName?.trim() || orgId;
  const deleteDisabled = permLoading || !canDelete || isDeleting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="w-full sm:max-w-lg">
        <Dialog.Header className="mb-0 border-b" title="Delete organization" onClose={onClose} />
        <Dialog.Body className="relative mb-0 px-5 py-4">
          {permLoading ? <LoaderOverlay /> : null}
          {!permLoading && !canDelete ? (
            <RestrictedOverlay message="You don't have permission to delete this organization" />
          ) : null}
          <div className="flex flex-col gap-3">
            <p className="text-foreground text-sm">
              Are you sure you want to delete <strong>{displayLabel}</strong>?
            </p>
            <p className="text-foreground text-sm font-medium">
              Deleting this organization will also remove its projects
            </p>
            <p className="text-muted-foreground text-sm">
              Make sure you have made a backup of your projects if you want to keep your data.
            </p>
          </div>
        </Dialog.Body>
        <Dialog.Footer className="border-t">
          <Button htmlType="button" type="quaternary" theme="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            htmlType="button"
            type="danger"
            theme="solid"
            loading={isDeleting}
            disabled={deleteDisabled}
            data-e2e="delete-organization-dialog-button"
            onClick={() => {
              void confirmDelete();
            }}>
            Delete organization
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  );
}

/**
 * Self-contained delete dialog for contexts without org-scoped RBAC/confirmation
 * providers (e.g. onboarding billing). Org settings pages already inherit both
 * from the private layout.
 */
export const DeleteOrganizationDialog = (props: DeleteOrganizationDialogProps) => (
  <RbacProvider organizationId={props.orgId}>
    <ConfirmationDialogProvider>
      <DeleteOrganizationDialogContent {...props} />
    </ConfirmationDialogProvider>
  </RbacProvider>
);
