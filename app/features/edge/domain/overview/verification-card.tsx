import { DateTime } from '@/components/date-time';
import { showMutationErrorToast } from '@/modules/quota';
import { useResourcePermissions } from '@/modules/rbac';
import {
  type Domain,
  getRefreshCooldownMessage,
  useRefreshCooldown,
  useRefreshDomainVerification,
} from '@/resources/domains';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Button } from '@datum-cloud/datum-ui/button';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { useCopyToClipboard } from '@datum-cloud/datum-ui/hooks';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  BookOpenIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  CopyIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useState } from 'react';

/** Verification badge — text truncates, copy button always visible, click anywhere to copy */
function VerificationBadge({ value }: { value: string }) {
  const [_, copy] = useCopyToClipboard();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    if (!value) return;

    copy(value).then((success) => {
      if (!success) return;
      toast.success('Copied to clipboard');
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    });
  };

  return (
    <Tooltip message={copied ? 'Copied!' : 'Copy'}>
      <div
        role="button"
        tabIndex={0}
        onClick={copyToClipboard}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            copyToClipboard();
          }
        }}
        className="flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md border border-transparent bg-[var(--color-badge-muted)] px-1.5 py-[5px] text-[var(--color-badge-muted-foreground)] transition-colors dark:border-[var(--color-badge-muted)]/20 dark:bg-[var(--color-badge-muted)]/20">
        <Text size="xs" ellipsis className="min-w-0 flex-1 font-mono">
          {value}
        </Text>
        <span className="text-muted-foreground flex shrink-0 items-center justify-center transition-colors">
          <Icon icon={CopyIcon} className="size-3" />
        </span>
      </div>
    </Tooltip>
  );
}

/** Copyable value, or a muted placeholder while the controller has not generated it yet */
function VerificationValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <Text size="xs" weight="normal">
        {label}
      </Text>
      {value ? (
        <VerificationBadge value={value} />
      ) : (
        <Text size="xs" textColor="muted" className="animate-pulse px-1.5 py-[5px] font-mono">
          Generating...
        </Text>
      )}
    </div>
  );
}

type Condition = { type?: string; status?: string; message?: string };

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Result of the last check for one method, e.g. "TXT record not found" */
function MethodResult({ condition }: { condition?: Condition }) {
  if (!condition?.message) return null;

  if (condition.status === 'True') {
    return (
      <Text size="xs" className="text-success flex items-center gap-1.5">
        <Icon icon={CircleCheckIcon} className="size-3.5 shrink-0" />
        Verified
      </Text>
    );
  }

  return (
    <Text size="xs" textColor="muted" className="flex items-start gap-1.5">
      <Icon icon={CircleDashedIcon} className="mt-px size-3.5 shrink-0" />
      {capitalize(condition.message)}
    </Text>
  );
}

/** "Last checked 2 minutes ago · next check in 3 minutes", or "checking now" once due */
function CheckSchedule({ last, next }: { last?: string; next?: string }) {
  if (!last && !next) return null;
  const isDue = !!next && new Date(next).getTime() <= Date.now();

  return (
    <Text size="xs" textColor="muted">
      {last && (
        <>
          Last checked <DateTime variant="relative" addSuffix date={last} />
        </>
      )}
      {last && next && ' · '}
      {next &&
        (isDue ? (
          'checking now'
        ) : (
          <>
            next check <DateTime variant="relative" addSuffix date={next} />
          </>
        ))}
    </Text>
  );
}

export const DomainVerificationCard = ({
  domain,
  projectId,
}: {
  domain: Domain;
  projectId: string;
}) => {
  const verification = domain.status?.verification;
  const dnsRecord = verification?.dnsRecord;
  const httpToken = verification?.httpToken;
  const conditions = (domain.status?.conditions ?? []) as Condition[];
  const conditionOf = (type: string) => conditions.find((c) => c.type === type);

  // The controller only generates verification records once the domain passes
  // its ValidDomain gate. Surface that failure instead of waiting forever.
  const invalidDomain = conditions.find((c) => c.type === 'ValidDomain' && c.status === 'False');

  const { canUpdate } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['update'],
  });
  const { remainingSeconds, isOnCooldown } = useRefreshCooldown(
    domain.desiredVerificationRefreshAttempt
  );
  const checkNow = useRefreshDomainVerification(projectId, {
    onSuccess: () => {
      toast.success('Verification check requested', {
        description: 'The result will show here in a minute or two.',
      });
    },
    onError: (error) => {
      showMutationErrorToast(error, { fallbackTitle: 'Domain', scope: 'project', projectId });
    },
  });

  // No border or side inset, so the text lines up with the details table and Activity heading
  return (
    <Card size="sm" className="w-full overflow-hidden border-none [--card-px:0]">
      <CardHeader size="sm">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={BookOpenIcon} size={16} className="text-secondary" />
          Manual Verification
        </CardTitle>
        {canUpdate && verification && (
          <CardAction>
            <Tooltip message={getRefreshCooldownMessage(remainingSeconds)} hidden={!isOnCooldown}>
              <span
                aria-disabled={isOnCooldown}
                className={cn(
                  'inline-block',
                  isOnCooldown && 'cursor-not-allowed [&>*]:pointer-events-none'
                )}>
                <Button
                  type="quaternary"
                  theme="outline"
                  size="xs"
                  icon={<RefreshCcwIcon className="size-3" />}
                  iconPosition="left"
                  disabled={isOnCooldown}
                  loading={checkNow.isPending}
                  onClick={() => checkNow.mutate(domain.name)}>
                  Check now
                </Button>
              </span>
            </Tooltip>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <Text as="p" weight="normal">
            To verify domain ownership, use one of the methods below. Once verified, you may remove
            the record from your DNS system.
          </Text>
          <CheckSchedule
            last={verification?.lastVerificationAttempt}
            next={verification?.nextVerificationAttempt}
          />
        </div>
        {invalidDomain && (
          <Alert variant="destructive">
            <Icon icon={TriangleAlertIcon} className="size-4" />
            <AlertTitle>Verification records can&apos;t be generated</AlertTitle>
            <AlertDescription>{invalidDomain.message}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-stretch">
          <div className="flex w-full min-w-0 flex-col gap-5 sm:flex-1">
            <div className="flex flex-col gap-1">
              <Text as="p" weight="medium">
                Add a TXT DNS Record
              </Text>
              {verification && <MethodResult condition={conditionOf('VerifiedDNS')} />}
            </div>
            <div className="flex min-w-0 flex-col gap-3.5">
              <VerificationValue label="Name" value={dnsRecord?.name} />
              <VerificationValue label="Value" value={dnsRecord?.content} />
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col">
            <div className="bg-border h-px flex-1 sm:h-auto sm:w-px" />
            <Text size="xs" weight="semibold" className="text-tertiary">
              OR
            </Text>
            <div className="bg-border h-px flex-1 sm:h-auto sm:w-px" />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-5 sm:flex-1">
            <div className="flex flex-col gap-1">
              <Text as="p" weight="medium">
                Create a HTTP Token File
              </Text>
              {verification && <MethodResult condition={conditionOf('VerifiedHTTP')} />}
            </div>
            <div className="flex min-w-0 flex-col gap-3.5">
              <VerificationValue label="URL" value={httpToken?.url} />
              <VerificationValue label="Body" value={httpToken?.body} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
