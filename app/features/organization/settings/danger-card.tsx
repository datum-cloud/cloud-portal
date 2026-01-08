import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { type Organization, useDeleteOrganization } from '@/resources/organizations';
import { paths } from '@/utils/config/paths.config';
import { toast } from '@datum-ui/components';
import { useNavigate } from 'react-router';

export const OrganizationDangerCard = ({ organization }: { organization: Organization }) => {
  const navigate = useNavigate();
  const deleteOrganization = useDeleteOrganization({
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
    await confirm({
      title: 'Delete Organization',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {organization?.displayName} ({organization?.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: organization?.name,
      confirmInputLabel: `Type "${organization?.name}" to confirm.`,
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
    />
  );
};
