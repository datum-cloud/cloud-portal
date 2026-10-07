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
import { CheckIcon, CopyIcon, ListIcon, PlusIcon, RefreshCcwIcon } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
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

/**
 * Full-width copy field. Values wrap rather than truncate: delegation targets
 * run long, and people sometimes have to read them, not just paste them.
 */
function CopyValue({ label, value }: { label: string; value: string }) {
  const [, copy, isCopied] = useCopyToClipboard();
  const copied = isCopied(value);

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <Text size="5xs" weight="medium" textColor="muted" className="tracking-wide uppercase">
        {label}
      </Text>
      <button
        type="button"
        onClick={() => void copy(value, { withToast: true })}
        aria-label={copied ? `Copied ${label.toLowerCase()}` : `Copy ${label.toLowerCase()}`}
        className="flex w-full min-w-0 cursor-pointer items-start gap-2 rounded-md bg-(--color-badge-muted) px-1.5 py-[5px] text-left text-(--color-badge-muted-foreground) transition-colors hover:opacity-90 dark:bg-(--color-badge-muted)/20">
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
          className="text-muted-foreground mt-0.5 size-3 shrink-0"
        />
      </button>
    </div>
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

/**
 * Writes one required record into the hostname's Datum DNS zone, so nobody has
 * to retype it (or pick the wrong type) in the record dialog. When something
 * already holds the name, offers to replace it instead.
 */
function ZoneRecordAction({
  record,
  zone,
}: {
  record: HostnameDnsRecordLike;
  zone: HostnameDnsZone;
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
    try {
      if (plan.kind === 'replace') {
        for (const conflict of plan.conflicts) {
          if (!conflict.recordSetName) continue;
          await deleteRecord.mutateAsync({
            recordSetName: conflict.recordSetName,
            recordType: conflict.type,
            name: conflict.name,
            value: conflict.value,
            ttl: conflict.ttl,
          });
        }
      }
      await createRecord.mutateAsync(input);
      toast.success('DNS record', {
        description: `${record.type} ${plan.name} added. Datum picks it up within a few minutes.`,
      });
    } catch (error) {
      showMutationErrorToast(error, {
        fallbackTitle: 'DNS record',
        fallbackDescription: error instanceof Error ? formatDnsError(error.message) : undefined,
        scope: 'project',
        projectId: zone.projectId,
      });
    } finally {
      setSaving(false);
    }
  };

  switch (plan.kind) {
    case 'present':
      return (
        <Text size="xs" textColor="muted">
          This record is in your zone. Datum will see it once the change reaches public DNS, usually
          within a few minutes.
        </Text>
      );
    case 'blocked':
      return (
        <Text size="xs" textColor="muted">
          A record managed by an Application Load Balancer already uses this name, so this one
          can&apos;t be added here.
        </Text>
      );
    case 'add':
    case 'replace': {
      const conflictTypes =
        plan.kind === 'replace'
          ? [...new Set(plan.conflicts.map((conflict) => conflict.type))].join(' and ')
          : '';
      return (
        <div className="flex flex-col items-start gap-2">
          {plan.kind === 'replace' ? (
            <Text size="xs" className="text-amber-600 dark:text-amber-500">
              Your zone already has a {conflictTypes} record at {plan.name}. A {record.type}{' '}
              can&apos;t share its name, so that record has to be replaced.
            </Text>
          ) : null}
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
        </div>
      );
    }
    default:
      return null;
  }
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
}: {
  records: HostnameDnsRecordLike[];
  zoneRecordsHref?: string;
  zone?: HostnameDnsZone;
}) {
  if (records.length === 0) return null;

  const missing = records.filter((record) => record.state === 'Missing').length;
  const these = missing === 1 ? 'this record' : `these ${missing} records`;
  const destination = zoneRecordsHref ? 'your Datum DNS zone' : 'your DNS provider';

  return (
    <div
      className="border-card-border flex flex-col gap-3 rounded-md border px-3 py-2.5"
      data-e2e="alb-hostname-dns-records">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Text size="xs" weight="medium">
          {missing > 0 ? `Add ${these} to ${destination}` : `DNS records in ${destination}`}
        </Text>
        {zoneRecordsHref ? (
          <LinkButton
            as={Link}
            href={zoneRecordsHref}
            type="secondary"
            theme="outline"
            size="xs"
            className="text-3xs h-6 px-2"
            icon={<Icon icon={ListIcon} size={12} aria-hidden="true" />}>
            Open zone
          </LinkButton>
        ) : null}
      </div>
      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <li
            key={`${record.purpose}:${record.type}:${record.name}`}
            className="border-card-border flex flex-col gap-2 border-t pt-3 first:border-t-0 first:pt-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <Text size="xs" weight="medium">
                {record.purpose}
              </Text>
              <StatusChip
                tone="muted"
                tooltip={
                  record.type === 'ALIAS'
                    ? 'A CNAME at the zone apex. Your DNS provider may call it ALIAS, ANAME or CNAME flattening.'
                    : undefined
                }>
                {record.type}
              </StatusChip>
              {record.state === 'Present' ? (
                <StatusChip tone="success" tooltip="Datum sees this record on the Internet">
                  In place
                </StatusChip>
              ) : (
                <StatusChip
                  tone="warning"
                  tooltip="Datum hasn't seen this record yet. DNS changes can take a few minutes to show up.">
                  Not found yet
                </StatusChip>
              )}
            </div>
            {PURPOSE_HINT[record.purpose] ? (
              <Text size="xs" textColor="muted">
                {PURPOSE_HINT[record.purpose]}
              </Text>
            ) : null}
            <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <CopyValue label="Name" value={record.name} />
              <CopyValue label="Value" value={record.content} />
            </div>
            {zone && record.state === 'Missing' ? (
              <ZoneRecordAction record={record} zone={zone} />
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
