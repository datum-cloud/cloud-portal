import { DangerCard } from '@/components/danger-card/danger-card';
import {
  useDeleteOrganizationConfirmation,
  type DeletedOrganizationState,
} from '@/features/organization/use-delete-organization-confirmation';
import { type Organization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { useNavigate } from 'react-router';

/**
 * Deletes the organization. Only its owners can (`canEdit`, on top of the
 * `organizations:delete` access review); the button is disabled for everyone
 * else.
 */
export const OrganizationDangerCard = ({
  organization,
  canEdit,
}: {
  organization: Organization;
  canEdit: boolean;
}) => {
  const navigate = useNavigate();

  const { canDelete, permLoading, isDeleting, confirmDelete } = useDeleteOrganizationConfirmation({
    orgId: organization?.name ?? '',
    orgDisplayName: organization?.displayName || organization?.name,
    onSuccess: () => {
      void navigate(paths.account.organizations.root, {
        state: { deletedOrgId: organization.name } satisfies DeletedOrganizationState,
      });
    },
  });

  return (
    <DangerCard
      title="Deleting this organization will also remove its projects"
      description={
        canEdit
          ? 'Make sure you have made a backup of your projects if you want to keep your data.'
          : 'Make sure you have made a backup of your projects if you want to keep your data. Only organization owners can delete it.'
      }
      deleteText="Delete organization"
      loading={isDeleting}
      onDelete={() => {
        void confirmDelete();
      }}
      data-e2e="delete-organization-button"
      actionHidden={permLoading}
      disabled={!canEdit || !canDelete}
    />
  );
};
