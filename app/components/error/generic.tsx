import { describeErrorPage } from './describe-error-page';
import { LogoIcon } from '@/components/logo/logo-icon';
import { paths } from '@/utils/config/paths.config';
import { Button, buttonVariants } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BuildingIcon, FolderIcon, RefreshCcwIcon } from 'lucide-react';
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

interface StatusCopy {
  title: string;
  /** The advice paragraph, which ends with the support email link. */
  lead: string;
  reloadLabel: string;
}

const DEFAULT_COPY: StatusCopy = {
  title: 'Whoops! Something went wrong.',
  lead: "Something went wrong on our end. Our team has been notified, and we're working to fix it. Please try again later. If the issue persists, reach out to",
  reloadLabel: 'Refresh Page',
};

const STATUS_COPY: Record<number, StatusCopy> = {
  403: {
    title: "You don't have access to this.",
    lead: "You don't have permission to view this resource. If you think you should, ask an administrator for access or reach out to",
    reloadLabel: 'Refresh Page',
  },
  404: {
    title: "We couldn't find that page.",
    lead: "The page or resource you're looking for doesn't exist or has been moved. Check the URL or head back to your organization. If you think this is a mistake, reach out to",
    reloadLabel: 'Refresh Page',
  },
  410: {
    title: 'This page has expired.',
    lead: 'The data you were viewing expired before the page finished loading. Reload this page to start over, or reach out to',
    reloadLabel: 'Reload page',
  },
};

export const GenericError = ({
  message,
  status,
  error,
}: {
  message: string;
  status?: number;
  /** The route error body or thrown error; lets a 403 name the area and show the raw denial. */
  error?: unknown;
}) => {
  const copy = (status !== undefined && STATUS_COPY[status]) || DEFAULT_COPY;
  const description = describeErrorPage(error, status);
  const primaryAction = resolvePrimaryAction(message, status === 404);

  return (
    <Card data-e2e="error-page" data-error-status={status ?? ''}>
      <CardContent className="flex min-h-[500px] flex-col items-center justify-center gap-6">
        <LogoIcon width={64} className="mb-4" />
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-2">
          <Text
            as="p"
            size="2xl"
            weight="bold"
            data-e2e="error-page-title"
            className="w-full text-center">
            {description.title ?? copy.title}
          </Text>
          <Text as="p" textColor="muted" className="text-center">
            {copy.lead}{' '}
            <Link to={`mailto:support@datum.net`} className="text-primary underline">
              support@datum.net
            </Link>
            .
          </Text>
          <ErrorPageMessage message={message} detail={description.detail} />
        </div>
        <ErrorPageActions primaryAction={primaryAction} reloadLabel={copy.reloadLabel} />
      </CardContent>
    </Card>
  );
};

/** The red box: the raw denial under "Error details" when there is one, else the message. */
function ErrorPageMessage({ message, detail }: { message: string; detail?: string }) {
  return (
    <>
      {detail ? (
        <Text as="p" size="sm" weight="medium" textColor="muted" className="mt-2">
          Error details
        </Text>
      ) : null}
      <Text
        as="div"
        textColor="muted"
        data-e2e="error-page-message"
        className="rounded-r-md border-l-4 border-red-500 bg-red-50 p-4 text-center [overflow-wrap:anywhere] dark:bg-red-950/20">
        {detail ?? message}
      </Text>
    </>
  );
}

function ErrorPageActions({
  primaryAction,
  reloadLabel,
}: {
  primaryAction: ReturnType<typeof resolvePrimaryAction>;
  reloadLabel: string;
}) {
  const navigate = useNavigate();
  return (
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
          void navigate(0);
        }}>
        <Icon icon={RefreshCcwIcon} className="size-4" />
        {reloadLabel}
      </Button>
    </div>
  );
}
