import { ReadOnlyGuard } from '@/features/project/read-only';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionGate } from '@/modules/rbac';
import {
  formatRefreshCooldown,
  useRefreshCooldown,
  useRefreshDomainRegistration,
} from '@/resources/domains';
import { Button, ButtonProps } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { TimerIcon } from 'lucide-react';

interface ToastMessage {
  title: string;
  description?: string;
}

interface RefreshNameserversButtonProps extends Omit<ButtonProps, 'onClick' | 'loading'> {
  domainName: string;
  projectId: string;
  label?: string;
  successMessage?: ToastMessage;
  errorMessage?: ToastMessage;
  lastRefreshAttempt?: string;
  containerClassName?: string;
}

const defaultSuccessMessage: ToastMessage = {
  title: 'Nameservers refreshed successfully',
  description: 'The nameservers have been refreshed successfully',
};

const defaultErrorMessage: ToastMessage = {
  title: 'Failed to refresh nameservers',
  description: 'Failed to refresh nameservers',
};

export const RefreshNameserversButton = ({
  domainName,
  projectId,
  label = 'Refresh nameservers',
  successMessage = defaultSuccessMessage,
  errorMessage = defaultErrorMessage,
  icon,
  type = 'secondary',
  theme = 'outline',
  size = 'xs',
  disabled,
  lastRefreshAttempt,
  containerClassName,
  ...buttonProps
}: RefreshNameserversButtonProps) => {
  const { remainingSeconds, isOnCooldown } = useRefreshCooldown(lastRefreshAttempt);

  const refreshMutation = useRefreshDomainRegistration(projectId, {
    onSuccess: () => {
      toast.success(successMessage.title, {
        description: successMessage.description,
      });
    },
    onError: (error) => {
      showMutationErrorToast(error, {
        fallbackTitle: errorMessage.title,
        scope: 'project',
        projectId,
      });
    },
  });

  const handleRefresh = () => {
    if (!domainName) return;
    refreshMutation.mutate(domainName);
  };

  return (
    <div className={cn('flex items-center gap-2.5', containerClassName)}>
      {isOnCooldown && (
        <div className="flex items-center gap-1 font-normal">
          <Icon icon={TimerIcon} className="text-ring relative -top-px size-4" />
          <Text className="text-ring leading-none">
            {formatRefreshCooldown(remainingSeconds)} until refresh available
          </Text>
        </div>
      )}
      <PermissionGate
        resource="domains"
        verb="patch"
        group="networking.datumapis.com"
        scope="project"
        mode="disable"
        deniedReason="You don't have permission to refresh nameservers">
        <ReadOnlyGuard>
          <Button
            type={type}
            theme={theme}
            size={size}
            icon={icon}
            onClick={handleRefresh}
            disabled={disabled || refreshMutation.isPending || isOnCooldown}
            loading={refreshMutation.isPending}
            className={cn('font-semibold', buttonProps.className)}
            {...buttonProps}>
            {label}
          </Button>
        </ReadOnlyGuard>
      </PermissionGate>
    </div>
  );
};
