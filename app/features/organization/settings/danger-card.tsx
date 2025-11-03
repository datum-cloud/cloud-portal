import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_ACTION_PATH } from '@/routes/api/organizations/$id';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shadcn/ui/card';
import { CircleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useFetcher, useNavigate } from 'react-router';
import { toast } from 'sonner';

export const OrganizationDangerCard = ({ organization }: { organization: IOrganization }) => {
  const fetcher = useFetcher({ key: 'org-delete' });
  const { confirm } = useConfirmationDialog();
  const navigate = useNavigate();

  const deleteOrganization = async () => {
    await confirm({
      title: 'Delete Organization',
      description: (
        <span>
          Are you sure you want to delete&nbsp;
          <strong>
            {organization?.displayName} ({organization?.name})
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
          {},
          {
            method: 'DELETE',
            action: getPathWithParams(ORG_ACTION_PATH, { id: organization?.name }),
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const { success } = fetcher.data;

      if (success) {
        navigate(paths.account.organizations.root);
        toast.success('Organization deleted successfully', {
          description: 'The organization has been deleted successfully',
        });
      } else {
        toast.error('Failed to delete organization', {
          description: fetcher.data?.error,
        });
      }
    }
  }, [fetcher.data, fetcher.state]);

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
            This action cannot be undone. Once deleted, this organization and all its resources will
            be permanently removed. The organization name will be reserved and cannot be reused for
            future organizations to prevent deployment conflicts.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
        <Button variant="destructive" onClick={() => deleteOrganization()}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
