import { StatusChip } from '@/components/card/status-chip';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { planZoneRecord } from '@/features/edge/proxy/utils/zone-record-plan';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { showMutationErrorToast } from '@/modules/quota';
import { PermissionButton } from '@/modules/rbac';
import {
  type CreateDnsRecordSchema,
  type IFlattenedDnsRecord,
  useCreateDnsRecord,
  useDeleteDnsRecord,
} from '@/resources/dns-records';
import type { HostnameDnsRecordLike } from '@/resources/http-proxies';
import { formatDnsError } from '@/utils/helpers/dns/error-formatting.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CheckIcon,
  CopyIcon,
  InfoIcon,
  ListIcon,
  PlusIcon,
  RefreshCcwIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Fragment, type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router';

/** The project's Datum DNS zone a hostname sits in, with the records already in it. */
export type HostnameDnsZone = {
  projectId: string;
  /** DNSZone resource name. */
  zoneId: string;
  zoneDomain: string;
  records: IFlattenedDnsRecord[];
};

const PURPOSE_HINT: Record<string, string> = {
  Routing: 'Points the hostname at this load balancer',
  Certificate: 'Lets Datum issue and renew the TLS certificate over DNS',
  Ownership: 'Proves you own the domain; needed once per domain',
};

type RecordParts = { action?: ReactNode; note?: ReactNode };

/**
 * Click-to-copy value. Long values wrap at the dots rather than truncate:
 * delegation targets run long, and people sometimes have to read them.
 */
function CopyValue({ label, value }: { label: string; value: string }) {
  const [, copy, isCopied] = useCopyToClipboard();
  const copied = isCopied(value);

  return (
    <button
      type="button"
      onClick={() => void copy(value, { withToast: true })}
      aria-label={copied ? `Copied ${label.toLowerCase()}` : `Copy ${label.toLowerCase()}`}
      className="group/copy hover:bg-muted flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-md px-1.5 py-1 text-left transition-colors">
      <Text as="span" size="xs" className="min-w-0 flex-1 font-mono wrap-break-word">
        {value.split('.').map((part, index) => (
          // Offer a line break after each dot so long names wrap at label boundaries.
          <Fragment key={index}>
            {index > 0 ? '.' : null}
            {index > 0 ? <wbr /> : null}
            {part}
          </Fragment>
        ))}
      </Text>
      <Icon
        icon={copied ? CheckIcon : CopyIcon}
        className={cn(
          'mt-0.5 size-3 shrink-0 transition-opacity',
          copied
            ? 'text-success opacity-100'
            : 'text-muted-foreground opacity-60 group-hover/copy:opacity-100'
        )}
      />
    </button>
  );
}

function recordInput(
  record: HostnameDnsRecordLike,
  name: string
): CreateDnsRecordSchema | undefined {
  if (record.type === 'CNAME') {
    // Fully qualified, so the zone doesn't append its own name to the target.
    return {
      recordType: 'CNAME',
      name,
      ttl: null,
      cname: { content: `${record.content.replace(/\.$/, '')}.` },
    };
  }
  if (record.type === 'TXT') {
    return { recordType: 'TXT', name, ttl: null, txt: { content: record.content } };
  }
  return undefined;
}

/** Rebuilds a deleted zone record, for rolling back a replacement whose create failed. */
function restoreInput(existing: IFlattenedDnsRecord): CreateDnsRecordSchema | undefined {
  const base = { name: existing.name, ttl: existing.ttl ?? null };
  const content = existing.value.trim();
  switch (existing.type) {
    case 'A':
      return { ...base, recordType: 'A', a: { content } };
    case 'AAAA':
      return { ...base, recordType: 'AAAA', aaaa: { content } };
    case 'CNAME':
      return { ...base, recordType: 'CNAME', cname: { content } };
    case 'ALIAS':
      return { ...base, recordType: 'ALIAS', alias: { content } };
    case 'TXT':
      // The zone hands TXT values back quoted.
      return { ...base, recordType: 'TXT', txt: { content: content.replace(/^"(.*)"$/, '$1') } };
    default:
      return undefined;
  }
}

/**
 * Writes one required record into the hostname's Datum DNS zone, so nobody has
 * to retype it (or pick the wrong type) in the record dialog. When something
 * already holds the name, offers to replace it instead. Hands back the button
 * and any explanation so the record row decides where each goes.
 */
function ZoneRecordAction({
  record,
  zone,
  children,
}: {
  record: HostnameDnsRecordLike;
  zone: HostnameDnsZone;
  children: (parts: RecordParts) => ReactNode;
}) {
  const { confirm } = useConfirmationDialog();
  const createRecord = useCreateDnsRecord(zone.projectId, zone.zoneId);
  const deleteRecord = useDeleteDnsRecord(zone.projectId, zone.zoneId);
  const [saving, setSaving] = useState(false);

  const plan = useMemo(
    () => planZoneRecord(record, zone.zoneDomain, zone.records),
    [record, zone.zoneDomain, zone.records]
  );

  const apply = async () => {
    if (plan.kind !== 'add' && plan.kind !== 'replace') return;
    const input = recordInput(record, plan.name);
    if (!input) return;

    setSaving(true);
    // Records already removed for a replace, so a failed create can put them back.
    const deleted: IFlattenedDnsRecord[] = [];
    try {
      if (plan.kind === 'replace') {
        for (const conflict of plan.conflicts) {
          // The plan only offers a replace when every conflict has a record set.
          await deleteRecord.mutateAsync({
            recordSetName: conflict.recordSetName!,
            recordType: conflict.type,
            name: conflict.name,
            value: conflict.value,
            ttl: conflict.ttl,
          });
          deleted.push(conflict);
        }
      }
      await createRecord.mutateAsync(input);
      toast.success('DNS record', {
        description: `${record.type} ${plan.name} added. Datum picks it up within a few minutes.`,
      });
    } catch (error) {
      const notRestored: string[] = [];
      for (const removed of deleted) {
        const restore = restoreInput(removed);
        try {
          if (!restore) throw new Error('not restorable');
          await createRecord.mutateAsync(restore);
        } catch {
          notRestored.push(`${removed.type} ${removed.name}`);
        }
      }
      const reason = error instanceof Error ? formatDnsError(error.message) : undefined;
      showMutationErrorToast(error, {
        fallbackTitle: 'DNS record',
        fallbackDescription:
          notRestored.length > 0
            ? `${reason ?? 'The new record could not be added'}. The record it replaced could not be put back either: re-add ${notRestored.join(', ')} on the zone page.`
            : deleted.length > 0
              ? `${reason ?? 'The new record could not be added'}. The original record was put back.`
              : reason,
        scope: 'project',
        projectId: zone.projectId,
      });
    } finally {
      setSaving(false);
    }
  };

  switch (plan.kind) {
    case 'present':
      return children({
        note: (
          <Text size="xs" textColor="muted">
            In your zone. Datum sees it once the change reaches public DNS, usually within a few
            minutes.
          </Text>
        ),
      });
    case 'blocked':
      return children({
        note: (
          <Text size="xs" textColor="muted">
            {plan.reason === 'alb'
              ? "A record managed by an Application Load Balancer already uses this name, so this one can't be added here."
              : 'Another record already uses this name. Remove it on the zone page, then add this one.'}
          </Text>
        ),
      });
    case 'add':
    case 'replace': {
      const conflictTypes =
        plan.kind === 'replace'
          ? [...new Set(plan.conflicts.map((conflict) => conflict.type))].join(' and ')
          : '';
      return children({
        note:
          plan.kind === 'replace' ? (
            <Text size="xs" className="text-amber-600 dark:text-amber-500">
              Your zone already has a {conflictTypes} record at {plan.name}. A {record.type}{' '}
              can&apos;t share its name, so that record has to be replaced.
            </Text>
          ) : undefined,
        action: (
          <PermissionButton
            resource="dnsrecordsets"
            verb="create"
            group="dns.networking.miloapis.com"
            scope="project"
            projectId={zone.projectId}
            deniedReason="You don't have permission to add a DNS record"
            type="secondary"
            theme="outline"
            size="xs"
            className="text-3xs h-6 px-2"
            loading={saving}
            onClick={() => {
              if (plan.kind === 'add') {
                void apply();
                return;
              }
              void confirm({
                title: 'Replace DNS record',
                description: (
                  <span>
                    Delete the {conflictTypes} record at <strong>{plan.name}</strong> and add this{' '}
                    {record.type} in its place?
                  </span>
                ),
                submitText: 'Replace',
                cancelText: 'Cancel',
                variant: 'destructive',
                onSubmit: apply,
              });
            }}>
            <Icon icon={plan.kind === 'add' ? PlusIcon : RefreshCcwIcon} size={12} />
            {plan.kind === 'add' ? 'Add to zone' : 'Replace record'}
          </PermissionButton>
        ),
      });
    }
    default:
      return children({});
  }
}

function RecordRow({
  record,
  renewalOnly,
  action,
  note,
}: {
  record: HostnameDnsRecordLike;
  renewalOnly: boolean;
} & RecordParts) {
  return (
    <li className="flex flex-col gap-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <StatusChip
          tone="muted"
          tooltip={
            record.type === 'ALIAS'
              ? 'A CNAME at the zone apex. Your DNS provider may call it ALIAS, ANAME or CNAME flattening.'
              : undefined
          }>
          {record.type}
        </StatusChip>
        <Text size="xs" weight="medium">
          {record.purpose}
        </Text>
        {PURPOSE_HINT[record.purpose] ? (
          <Text size="xs" textColor="muted" className="hidden md:inline">
            {PURPOSE_HINT[record.purpose]}
          </Text>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          {record.state === 'Present' ? (
            <StatusChip tone="success" tooltip="Datum sees this record on the Internet">
              In place
            </StatusChip>
          ) : (
            <StatusChip
              tone={renewalOnly ? 'muted' : 'warning'}
              tooltip={
                renewalOnly
                  ? "Without it, the certificate can't renew before it expires."
                  : "Datum hasn't seen this record yet. DNS changes can take a few minutes to show up."
              }>
              Not found
            </StatusChip>
          )}
          {action}
        </div>
      </div>
      <dl className="grid grid-cols-[2.75rem_minmax(0,1fr)] items-start gap-x-2 gap-y-0.5">
        <dt className="pt-1.5">
          <Text
            as="span"
            size="5xs"
            weight="medium"
            textColor="muted"
            className="tracking-wide uppercase">
            Name
          </Text>
        </dt>
        <dd className="min-w-0">
          <CopyValue label="Name" value={record.name} />
        </dd>
        <dt className="pt-1.5">
          <Text
            as="span"
            size="5xs"
            weight="medium"
            textColor="muted"
            className="tracking-wide uppercase">
            Value
          </Text>
        </dt>
        <dd className="min-w-0">
          <CopyValue label="Value" value={record.content} />
        </dd>
      </dl>
      {note}
    </li>
  );
}

/**
 * The DNS records a custom hostname needs the user to publish, as the operator
 * lists them on `hostnameStatuses[].dnsRecords`. Records Datum publishes
 * itself never appear here.
 *
 * `zoneRecordsHref` is set when the hostname is in one of the project's Datum
 * DNS zones: that zone is where the user adds them, not an outside provider.
 * With `zone` as well, each missing record can be written there in one click.
 */
export function HostnameDnsRecords({
  records,
  zoneRecordsHref,
  zone,
  certificateIssued = false,
}: {
  records: HostnameDnsRecordLike[];
  zoneRecordsHref?: string;
  zone?: HostnameDnsZone;
  /** The certificate is already serving, so a missing Certificate record only matters for renewal. */
  certificateIssued?: boolean;
}) {
  if (records.length === 0) return null;

  const missing = records.filter((record) => record.state === 'Missing');
  const destination = zoneRecordsHref ? 'your Datum DNS zone' : 'your DNS provider';
  const renewalOnly =
    certificateIssued &&
    missing.length > 0 &&
    missing.every((record) => record.purpose === 'Certificate');
  const calm = renewalOnly || missing.length === 0;

  const title = renewalOnly
    ? 'Certificate issued. Keep this record in place so it can renew.'
    : missing.length > 0
      ? `Add ${missing.length === 1 ? 'this record' : `these ${missing.length} records`} to ${destination}`
      : `DNS records in ${destination}`;

  return (
    <div
      className="border-card-border bg-muted/30 overflow-hidden rounded-lg border"
      data-e2e="alb-hostname-dns-records">
      <div className="border-card-border flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <Text size="xs" weight="medium" className="flex items-center gap-1.5">
          <Icon
            icon={calm ? InfoIcon : TriangleAlertIcon}
            size={13}
            aria-hidden="true"
            className={cn(
              'shrink-0',
              calm ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-500'
            )}
          />
          {title}
        </Text>
        {zoneRecordsHref ? (
          <LinkButton
            as={Link}
            href={zoneRecordsHref}
            type="quaternary"
            theme="borderless"
            size="xs"
            className="text-3xs h-6 px-2"
            icon={<Icon icon={ListIcon} size={12} aria-hidden="true" />}>
            Open zone
          </LinkButton>
        ) : null}
      </div>
      <ul className="divide-card-border divide-y">
        {records.map((record) => {
          const key = `${record.purpose}:${record.type}:${record.name}`;
          return zone && record.state === 'Missing' ? (
            <ZoneRecordAction key={key} record={record} zone={zone}>
              {(parts) => <RecordRow record={record} renewalOnly={renewalOnly} {...parts} />}
            </ZoneRecordAction>
          ) : (
            <RecordRow key={key} record={record} renewalOnly={renewalOnly} />
          );
        })}
      </ul>
    </div>
  );
}
