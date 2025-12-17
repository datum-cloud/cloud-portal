import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface';
import { ROUTE_PATH as SECRET_ACTIONS_ROUTE_PATH } from '@/routes/api/secrets';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useParams } from 'react-router';

export const SecretDangerCard = ({ secret }: { secret: ISecretControlResponse }) => {
  const { projectId } = useParams();
  const fetcher = useDatumFetcher({ key: 'secret-delete' });
  const { confirm } = useConfirmationDialog();

  const deleteSecret = async () => {
    await confirm({
      title: 'Delete Secret',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{secret?.name ?? ''}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        await fetcher.submit(
          {
            secretId: secret?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.config.secrets.root, {
              projectId,
            }),
          },
          {
            action: SECRET_ACTIONS_ROUTE_PATH,
            method: 'DELETE',
          }
        );
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      description="Make sure you have made a backup if you want to keep your data."
      deleteText="Delete secret"
      loading={fetcher.isPending}
      onDelete={deleteSecret}
    />
  );
};
