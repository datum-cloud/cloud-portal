import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { useAccessReview } from '@/modules/rbac';
import type { Project } from '@/resources/projects';
import { useDeleteProject } from '@/resources/projects';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useNavigate } from 'react-router';

export const ProjectDangerCard = ({ project }: { project: Project }) => {
  const navigate = useNavigate();
  const { confirm } = useConfirmationDialog();

  // Project is a root resource: its RBAC is evaluated at the user/root control
  // plane against the named instance — same authority the General settings
  // loader uses to gate `projects:patch` (scope:'user' + name). Keep delete
  // consistent with that proven gate; scope:'project' targets the wrong CP.
  const { allowed: canDelete, isLoading: permLoading } = useAccessReview('projects', 'delete', {
    group: 'resourcemanager.miloapis.com',
    name: project.name,
    scope: 'user',
  });

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
      description="Make sure you have made a backup of your projects if you want to keep your data."
      deleteText="Delete project"
      loading={deleteMutation.isPending}
      onDelete={deleteProject}
      data-e2e="delete-project-button"
      actionHidden={permLoading || !canDelete}>
      {permLoading ? (
        <LoaderOverlay />
      ) : (
        !canDelete && (
          <RestrictedOverlay message="You don't have permission to delete this project" />
        )
      )}
    </DangerCard>
  );
};
