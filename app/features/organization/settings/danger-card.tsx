import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_ACTION_PATH } from '@/routes/api/organizations/$id';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';

export const OrganizationDangerCard = ({ organization }: { organization: IOrganization }) => {
  const fetcher = useFetcher({ key: 'org-delete' });
  const { confirm } = useConfirmationDialog();

  const deleteOrganization = async () => {
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
        await fetcher.submit(
          {
            redirectUri: paths.account.organizations.root,
          },
          {
            method: 'DELETE',
            action: getPathWithParams(ORG_ACTION_PATH, { id: organization?.name }),
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (!success) {
        toast.error('Failed to delete organization', {
          description: fetcher.data?.error,
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

  return (
    <DangerCard
      title="Deleting this organization will also remove its projects"
      description="Make sure you have made a backup of your projects if you want to keep your data."
      deleteText="Delete organization"
      loading={fetcher.state === 'submitting'}
      onDelete={deleteOrganization}
    />
  );
};
