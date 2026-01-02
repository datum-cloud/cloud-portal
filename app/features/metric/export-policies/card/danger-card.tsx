import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { IExportPolicyControlResponse, useDeleteExportPolicy } from '@/resources/export-policies';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useNavigate, useParams } from 'react-router';

export const ExportPolicyDangerCard = ({
  exportPolicy,
}: {
  exportPolicy: IExportPolicyControlResponse;
}) => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteExportPolicyMutation = useDeleteExportPolicy(projectId ?? '', {
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
          projectId,
        })
      );
    },
  });

  const deleteExportPolicy = async () => {
    await confirm({
      title: 'Delete Policy',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{exportPolicy?.name ?? ''}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: false,
      onSubmit: async () => {
        await deleteExportPolicyMutation.mutateAsync(exportPolicy?.name ?? '');
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      description="Make sure you have made a backup if you want to keep your data."
      deleteText="Delete policy"
      loading={deleteExportPolicyMutation.isPending}
      onDelete={deleteExportPolicy}
    />
  );
};
