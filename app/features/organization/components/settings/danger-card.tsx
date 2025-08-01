import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useConfirmationDialog } from '@/providers/confirmationDialog.provider';
import { IOrganization } from '@/resources/interfaces/organization.interface';
import { ROUTE_PATH as ORG_ACTION_PATH } from '@/routes/api+/organizations+/$orgId';
import { getPathWithParams } from '@/utils/path';
import { CircleAlertIcon } from 'lucide-react';
import { useFetcher } from 'react-router';

export const OrganizationDangerCard = ({ organization }: { organization: IOrganization }) => {
  const fetcher = useFetcher({ key: 'org-delete' });
  const { confirm } = useConfirmationDialog();

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
            action: getPathWithParams(ORG_ACTION_PATH, { orgId: organization?.name }),
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
