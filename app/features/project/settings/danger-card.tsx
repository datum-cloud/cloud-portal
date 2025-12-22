import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { useFetcher } from 'react-router';

export const ProjectDangerCard = ({ project }: { project: IProjectControlResponse }) => {
  const fetcher = useFetcher({ key: 'project-delete' });
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
            projectName: project?.name ?? '',
            orgId: project?.organizationId ?? '',
          },
          {
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
      deleteText="Delete project"
      loading={fetcher.state === 'submitting'}
      onDelete={deleteProject}
    />
  );
};
