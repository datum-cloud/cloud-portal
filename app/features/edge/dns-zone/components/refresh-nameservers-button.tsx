import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { Button, ButtonProps, toast } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { TimerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

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

const COOLDOWN_SECONDS = 5 * 60; // 5 minutes

const calculateRemainingSeconds = (lastRefreshAttempt?: string): number => {
  if (!lastRefreshAttempt) return 0;

  const lastAttemptTime = new Date(lastRefreshAttempt).getTime();
  if (isNaN(lastAttemptTime)) return 0;

  const now = Date.now();
  const elapsedSeconds = Math.floor((now - lastAttemptTime) / 1000);
  const remaining = COOLDOWN_SECONDS - elapsedSeconds;

  return remaining > 0 ? remaining : 0;
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
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
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    calculateRemainingSeconds(lastRefreshAttempt)
  );

  useEffect(() => {
    // Recalculate when lastRefreshAttempt changes
    setRemainingSeconds(calculateRemainingSeconds(lastRefreshAttempt));
  }, [lastRefreshAttempt]);

  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      const newRemaining = calculateRemainingSeconds(lastRefreshAttempt);
      setRemainingSeconds(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lastRefreshAttempt, remainingSeconds]);

  const isOnCooldown = remainingSeconds > 0;

  const refreshFetcher = useDatumFetcher({
    key: 'refresh-nameservers',
    onSuccess: () => {
      toast.success(successMessage.title, {
        description: successMessage.description,
      });
    },
    onError: (data) => {
      toast.error(errorMessage.title, {
        description: data.error || errorMessage.description,
      });
    },
  });

  const handleRefresh = async () => {
    if (!domainName) return;
    await refreshFetcher.submit(
      {
        id: domainName,
        projectId: projectId,
      },
      {
        method: 'PATCH',
        action: DOMAINS_REFRESH_PATH,
      }
    );
  };

  return (
    <div className={cn('flex items-center gap-2.5', containerClassName)}>
      {isOnCooldown && (
        <div className="flex items-center gap-1 font-normal">
          <TimerIcon className="text-ring relative -top-px size-4" />
          <span className="text-ring text-sm leading-none">
            {formatTime(remainingSeconds)} until refresh available
          </span>
        </div>
      )}
      <Button
        type={type}
        theme={theme}
        size={size}
        icon={icon}
        onClick={handleRefresh}
        disabled={disabled || refreshFetcher.isPending || isOnCooldown}
        loading={refreshFetcher.isPending}
        className={cn('font-semibold', buttonProps.className)}
        {...buttonProps}>
        {label}
      </Button>
    </div>
  );
};
