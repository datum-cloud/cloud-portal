import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useDeleteOrganizationConfirmation } from '@/features/organization/use-delete-organization-confirmation';
import { type Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { useNavigate } from 'react-router';

export const OrganizationDangerCard = ({ organization }: { organization: Organization }) => {
  const navigate = useNavigate();

  const { canDelete, permLoading, isDeleting, confirmDelete } = useDeleteOrganizationConfirmation({
    orgId: organization?.name ?? '',
    orgDisplayName: organization?.displayName || organization?.name,
    onSuccess: () => {
      navigate(paths.account.organizations.root);
    },
  });

  return (
    <DangerCard
      title="Deleting this organization will also remove its projects"
      description="Make sure you have made a backup of your projects if you want to keep your data."
      deleteText="Delete organization"
      loading={isDeleting}
      onDelete={() => {
        void confirmDelete();
      }}
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
