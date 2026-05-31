import { PermissionButton } from '@/modules/rbac';
import { useUpdateServiceAccount, type ServiceAccount } from '@/resources/service-accounts';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { PowerIcon, PowerOffIcon } from 'lucide-react';

interface ServiceAccountHeaderActionsProps {
  projectId: string;
  serviceAccountId: string;
  account: ServiceAccount;
}

export function ServiceAccountHeaderActions({
  projectId,
  serviceAccountId,
  account,
}: ServiceAccountHeaderActionsProps) {
  const toggleMutation = useUpdateServiceAccount(projectId, serviceAccountId, {
    onSuccess: () => {
      toast.success('Service account updated');
    },
    onError: (error) => {
      toast.error('Error', { description: error.message });
    },
  });

  const isActive = account.status === 'Active';

  const handleToggle = () => {
    toggleMutation.mutate({
      status: isActive ? 'Disabled' : 'Active',
    });
  };

  return (
    <PermissionButton
      resource="serviceaccounts"
      verb="patch"
      group="iam.miloapis.com"
      scope="project"
      deniedReason={`You don't have permission to ${isActive ? 'disable' : 'enable'} this service account`}
      type="secondary"
      theme="outline"
      size="small"
      loading={toggleMutation.isPending}
      onClick={handleToggle}>
      <Icon icon={isActive ? PowerOffIcon : PowerIcon} size={14} />
      {isActive ? 'Disable' : 'Enable'}
    </PermissionButton>
  );
}
