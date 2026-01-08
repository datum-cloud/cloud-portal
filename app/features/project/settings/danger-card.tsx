import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import type { Project } from '@/resources/projects';
import { useDeleteProject } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-ui/components';
import { useNavigate } from 'react-router';

export const ProjectDangerCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      toast.success('Project', {
        description: 'The project has been deleted successfully',
      });
      navigate(
        getPathWithParams(paths.org.detail.projects.root, {
          orgId: project?.organizationId ?? '',
        })
      );
    },
    onError: (error) => {
      toast.error('Project', {
        description: error.message || 'Failed to delete project',
      });
    },
  });

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
        deleteMutation.mutate(project?.name ?? '');
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      description="Make sure you have made a backup if you want to keep your data."
      deleteText="Delete project"
      loading={deleteMutation.isPending}
      onDelete={deleteProject}
    />
  );
};
