import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { ROUTE_PATH as EXPORT_POLICIES_ACTIONS_ROUTE_PATH } from '@/routes/api/export-policies/';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { useParams } from 'react-router';

export const ExportPolicyDangerCard = ({
  exportPolicy,
}: {
  exportPolicy: IExportPolicyControlResponse;
}) => {
  const { projectId } = useParams();
  const fetcher = useDatumFetcher({ key: 'export-policy-delete' });
  const { confirm } = useConfirmationDialog();

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
        await fetcher.submit(
          {
            id: exportPolicy?.name ?? '',
            projectId: projectId ?? '',
            redirectUri: getPathWithParams(paths.project.detail.metrics.exportPolicies.root, {
              projectId,
            }),
          },
          {
            action: EXPORT_POLICIES_ACTIONS_ROUTE_PATH,
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
      deleteText="Delete policy"
      loading={fetcher.isPending}
      onDelete={deleteExportPolicy}
    />
  );
};
