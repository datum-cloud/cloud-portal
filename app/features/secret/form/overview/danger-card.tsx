import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { ISecretControlResponse, useDeleteSecret } from '@/resources/secrets';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useNavigate, useParams } from 'react-router';

export const SecretDangerCard = ({ secret }: { secret: ISecretControlResponse }) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteSecretMutation = useDeleteSecret(projectId ?? '', {
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.project.detail.config.secrets.root, {
          projectId,
        })
      );
    },
  });

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
        await deleteSecretMutation.mutateAsync(secret?.name ?? '');
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      description="Make sure you have made a backup if you want to keep your data."
      deleteText="Delete secret"
      loading={deleteSecretMutation.isPending}
      onDelete={deleteSecret}
    />
  );
};
