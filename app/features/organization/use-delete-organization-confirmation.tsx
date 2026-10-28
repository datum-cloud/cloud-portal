import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useAccessReview } from '@/modules/rbac';
import { useDeleteOrganization } from '@/resources/organizations';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useCallback } from 'react';

/**
 * Navigation state for the organizations list after a delete. Milo removes the
 * caller's membership some time after the org, so the list loader can still
 * return the deleted org; the list hides `deletedOrgId` until then.
 */
export interface DeletedOrganizationState {
  deletedOrgId: string;
}

interface UseDeleteOrganizationConfirmationOptions {
  orgId: string;
  orgDisplayName?: string;
  onSuccess?: () => void;
}

export function useDeleteOrganizationConfirmation({
  orgId,
  orgDisplayName,
  onSuccess,
}: UseDeleteOrganizationConfirmationOptions) {
  const { allowed: canDelete, isLoading: permLoading } = useAccessReview(
    'organizations',
    'delete',
    { group: 'resourcemanager.miloapis.com', name: orgId, scope: 'user' }
  );

  const deleteOrganization = useDeleteOrganization({
    onSuccess,
    onError: (error) => {
      toast.error('Organization', {
        description: error.message || 'Failed to delete organization',
      });
    },
  });

  const { confirm } = useConfirmationDialog();

  const confirmDelete = useCallback(async () => {
    const displayLabel = orgDisplayName?.trim() || orgId;

    await confirm({
      title: 'Delete Organization',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{displayLabel}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        deleteOrganization.mutate(orgId);
      },
    });
  }, [confirm, deleteOrganization, orgDisplayName, orgId]);

  return {
    canDelete,
    permLoading,
    isDeleting: deleteOrganization.isPending,
    confirmDelete,
  };
}
