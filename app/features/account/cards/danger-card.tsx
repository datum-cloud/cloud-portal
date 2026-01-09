import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { DangerCard } from '@/components/danger-card/danger-card';
import { useApp } from '@/providers/app.provider';
import { useDeleteUser } from '@/resources/users';
import { paths } from '@/utils/config/paths.config';
import { toast } from '@datum-ui/components';
import { useNavigate } from 'react-router';

export const AccountDangerSettingsCard = () => {
  const { user } = useApp();
  const { confirm } = useConfirmationDialog();
  const userId = user?.sub ?? 'me';
  const navigate = useNavigate();

  const deleteUserMutation = useDeleteUser({
    onSuccess: () => {
      toast.success('Account', {
        description: 'Your account has been deleted successfully',
      });
      navigate(paths.auth.logOut, { replace: true });
    },
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
      confirmValue: user?.email,
      confirmInputLabel: `Type "${user?.email}" to confirm.`,
      onSubmit: async () => {
        deleteUserMutation.mutate(userId);
      },
    });
  };

  return (
    <DangerCard
      title="Request for account deletion"
      description="Deleting your account is permanent and cannot be undone. Your data will be deleted within 30 days, except we may retain some metadata and logs for longer where required or permitted by law."
      deleteText="Delete account"
      loading={deleteUserMutation.isPending}
      onDelete={deleteAccount}
    />
  );
};
