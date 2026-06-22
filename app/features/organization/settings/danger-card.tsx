import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useAccessReview } from '@/modules/rbac';
import { type Organization, useDeleteOrganizationGql } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useNavigate } from 'react-router';

export const OrganizationDangerCard = ({ organization }: { organization: Organization }) => {
  const navigate = useNavigate();

  const { allowed: canDelete, isLoading: permLoading } = useAccessReview(
    'organizations',
    'delete',
    { group: 'resourcemanager.miloapis.com', name: organization?.name, scope: 'user' }
  );

  const deleteOrganization = useDeleteOrganizationGql({
    onSuccess: () => {
      navigate(paths.account.organizations.root);
    },
    onError: (error) => {
      toast.error('Organization', {
        description: error.message || 'Failed to delete organization',
      });
    },
  });
  const { confirm } = useConfirmationDialog();

  const handleDeleteOrganization = async () => {
    const displayLabel = organization?.displayName || organization?.name;

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
        deleteOrganization.mutate(organization?.name ?? '');
      },
    });
  };

  return (
    <DangerCard
      title="Deleting this organization will also remove its projects"
      description="Make sure you have made a backup of your projects if you want to keep your data."
      deleteText="Delete organization"
      loading={deleteOrganization.isPending}
      onDelete={handleDeleteOrganization}
      data-e2e="delete-organization-button"
      actionHidden={permLoading || !canDelete}>
      {permLoading ? (
        <LoaderOverlay />
      ) : (
        !canDelete && (
          <RestrictedOverlay message="You don't have permission to delete this organization" />
        )
      )}
    </DangerCard>
  );
};
