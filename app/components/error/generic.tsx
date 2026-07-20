import { LogoIcon } from '@/components/logo/logo-icon';
import { paths } from '@/utils/config/paths.config';
import { Button, buttonVariants } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BuildingIcon, FolderIcon, RefreshCcwIcon } from 'lucide-react';
// import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

/**
 * When a specific organization or project can't be found, the primary action
 * should drop the user on the relevant list rather than the home page. We infer
 * the resource type from the not-found message (`NotFoundError` renders it as
 * `Organization '…' not found` / `Project '…' not found`).
 */
const resolvePrimaryAction = (
  message: string,
  isNotFound: boolean
): { label: string; to: string; icon: typeof BuildingIcon } => {
  if (isNotFound) {
    if (/^\s*organization\b/i.test(message)) {
      return { label: 'Organizations', to: paths.account.organizations.root, icon: BuildingIcon };
    }
    if (/^\s*project\b/i.test(message)) {
      return { label: 'Projects', to: paths.project.root, icon: FolderIcon };
    }
  }
  return { label: 'Organization', to: paths.home, icon: BuildingIcon };
};

export const GenericError = ({ message, status }: { message: string; status?: number }) => {
  const navigate = useNavigate();
  // const [isDebug, setIsDebug] = useState(false);

  // useEffect(() => {
  //   setIsDebug(window.ENV?.DEBUG || ['localhost', '127.0.0.1'].includes(window.location.hostname));
  // }, []);

  const isNotFound = status === 404;
  const isForbidden = status === 403;
  const primaryAction = resolvePrimaryAction(message, isNotFound);
  const title = isNotFound
    ? "We couldn't find that page."
    : isForbidden
      ? "You don't have access to this."
      : 'Whoops! Something went wrong.';

  return (
    <Card data-e2e="error-page" data-error-status={status ?? ''}>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />
        <div className="flex max-w-xl flex-col gap-2">
          <p data-e2e="error-page-title" className="w-full text-center text-2xl font-bold">
            {title}
          </p>

          <p className="text-muted-foreground text-center text-sm">
            {isNotFound ? (
              <>
                The page or resource you&apos;re looking for doesn&apos;t exist or has been moved.
                Check the URL or head back to your organization. If you think this is a mistake,
                reach out to{' '}
              </>
            ) : isForbidden ? (
              <>
                You don&apos;t have permission to view this resource. If you think you should, ask
                an administrator for access or reach out to{' '}
              </>
            ) : (
              <>
                Something went wrong on our end. Our team has been notified, and we&apos;re working
                to fix it. Please try again later. If the issue persists, reach out to{' '}
              </>
            )}
            <Link to={`mailto:support@datum.net`} className="text-primary underline">
              support@datum.net
            </Link>
            .
          </p>
          {/* {isDebug && ( */}
          <div className="text-muted-foreground rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center text-sm dark:bg-red-950/20">
            {message}
          </div>
          {/* )} */}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={primaryAction.to}
            className={cn(
              buttonVariants({ type: 'primary', theme: 'solid', size: 'small' }),
              'bg-primary hover:bg-primary/90 active:bg-primary/80'
            )}
            data-e2e="error-page-primary-action">
            <Icon icon={primaryAction.icon} className="size-4" />
            {primaryAction.label}
          </a>
          <Button
            type="quaternary"
            theme="outline"
            size="small"
            onClick={() => {
              navigate(0);
            }}>
            <Icon icon={RefreshCcwIcon} className="size-4" />
            Refresh Page
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
