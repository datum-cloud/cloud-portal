import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { IProjectControlResponse } from '@/resources/interfaces/project.interface';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shadcn/ui/card';
import { CircleAlertIcon } from 'lucide-react';
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
    <Card className="border-destructive/50 hover:border-destructive border pb-0 transition-colors">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <CircleAlertIcon className="size-5 shrink-0" />
          <AlertTitle className="text-sm font-semibold">Warning: Destructive Action</AlertTitle>
          <AlertDescription>
            This action cannot be undone. Once deleted, this project and all its resources will be
            permanently removed. The project name will be reserved and cannot be reused for future
            projects to prevent deployment conflicts.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
        <Button variant="destructive" onClick={() => deleteProject()}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
