import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { useApp } from '@/providers/app.provider';
import { useDeleteUser } from '@/resources/users';
import { Alert, AlertDescription, AlertTitle } from '@datum-ui/components';
import { Button, toast } from '@datum-ui/components';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { CircleAlertIcon } from 'lucide-react';

export const AccountDangerSettingsCard = () => {
  const { user } = useApp();
  const { confirm } = useConfirmationDialog();
  const userId = user?.sub ?? 'me';

  const deleteUserMutation = useDeleteUser({
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteAccount = async () => {
    await confirm({
      title: 'Delete Account',
      description: <span>Are you sure you want to delete your account?</span>,
      submitText: 'Delete',
      cancelText: 'Cancel',
      variant: 'destructive',
      showConfirmInput: true,
      onSubmit: async () => {
        await deleteUserMutation.mutateAsync(userId);
      },
    });
  };

  return (
    <Card className="border-destructive/50 hover:border-destructive border pb-0 shadow-none transition-colors">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
      </CardHeader>
      <CardContent>
        <Alert variant="destructive">
          <Icon icon={CircleAlertIcon} className="size-5 shrink-0" />
          <AlertTitle className="text-sm font-semibold">Warning: Destructive Action</AlertTitle>
          <AlertDescription>
            This action cannot be undone. Once deleted, your account and all associated data will be
            permanently removed. You will lose access to all your organizations, projects and
            resources, and this action cannot be reversed.
          </AlertDescription>
        </Alert>
      </CardContent>
      <CardFooter className="border-destructive/50 bg-destructive/10 flex justify-end border-t px-6 py-2">
        <Button type="danger" theme="solid" onClick={() => deleteAccount()}>
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
};
