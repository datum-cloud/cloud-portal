import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { ROUTE_PATH as USER_DELETE_ACTION } from '@/routes/api/user';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button } from '@datum-ui/components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@shadcn/ui/card';
import { CircleAlertIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';

export const AccountDangerSettingsCard = () => {
  const fetcher = useFetcher({ key: 'user-delete' });
  const { confirm } = useConfirmationDialog();

  const deleteAccount = async () => {
    await confirm({
      title: 'Delete Account',
      description: <span>Are you sure you want to delete your account?</span>,
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await fetcher.submit(
          {},
          {
            method: 'DELETE',
            action: USER_DELETE_ACTION,
          }
        );
      },
    });
  };

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (!fetcher.data?.success) {
        toast.error(fetcher.data?.error);
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
            This action cannot be undone. Once deleted, your account and all associated data will be
            permanently removed. You will lose access to all your organizations, projects and
            resources, and this action cannot be reversed.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
        <Button variant="destructive" onClick={() => deleteAccount()}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
