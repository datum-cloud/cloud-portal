import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { ROUTE_PATH as PROJECT_ACTION_PATH } from '@/routes/api/projects/$id';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';

export const ProjectDangerCard = ({ project }: { project: IProjectControlResponse }) => {
  const fetcher = useDatumFetcher({
    key: 'project-delete',
    onError: (data) => {
      toast.error('Project', {
        description: data.error || 'Failed to delete project',
      });
    },
  });
  const { confirm } = useConfirmationDialog();

  const deleteProject = async () => {
    await confirm({
      title: 'Delete Project',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {project.description} ({project.name})
          </strong>
          ?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      confirmValue: project?.name,
      confirmInputLabel: `Type "${project?.name}" to confirm.`,
      onSubmit: async () => {
        await fetcher.submit(
          {
            orgId: project?.organizationId ?? '',
            redirectUri: getPathWithParams(paths.org.detail.projects.root, {
              orgId: project?.organizationId ?? '',
            }),
          },
          {
            method: 'DELETE',
            action: getPathWithParams(PROJECT_ACTION_PATH, { id: project?.name }),
          }
        );
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      description="Make sure you have made a backup if you want to keep your data."
      deleteText="Delete project"
      loading={fetcher.state === 'submitting'}
      onDelete={deleteProject}
    />
  );
};
