import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import type { Project } from '@/resources/projects';
import { useDeleteProject } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useNavigate } from 'react-router';

export const ProjectDangerCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  const deleteMutation = useDeleteProject({
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.org.detail.projects.root, {
          orgId: project.organizationId,
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
    const displayLabel = project.displayName || project.name;

    await confirm({
      title: 'Delete Project',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>{displayLabel}</strong>?
        </span>
      ),
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        deleteMutation.mutate(project.name);
      },
    });
  };

  return (
    <DangerCard
      title="Warning: This action is irreversible"
      deleteText="Delete project"
      loading={deleteMutation.isPending}
      onDelete={deleteProject}
      data-e2e="delete-project-button"
    />
  );
};
