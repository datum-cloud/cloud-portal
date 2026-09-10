import { useProxyDnsDeletePreview } from '@/features/edge/proxy/hooks/use-proxy-dns-preview';
import type { ProxyDnsHostnameRow } from '@/features/edge/proxy/utils/delete-dns-preview';
import type { HttpProxy } from '@/resources/http-proxies';
import { SpinnerIcon } from '@datum-cloud/datum-ui/icons';

/** Headline count. Zero is a normal outcome, not a failure, so it reads as plain English. */
const DELETE_SUMMARY = (count: number): string => {
  if (count === 0) return 'No DNS records will be deleted';
  if (count === 1) return '1 DNS record will be deleted';
  return `${count} DNS records will be deleted`;
};

/** Why a hostname has no Datum-managed record to delete. */
const NO_RECORD_HINT = {
  'no-record': 'Not managed by Datum DNS — no record to delete',
  pending: 'No record created yet — nothing to delete',
} as const;

function HostnameGroup({ row }: { row: ProxyDnsHostnameRow }) {
  const { state, type, value } = row.datumRecord;

  return (
    <li className="flex flex-col gap-1 border-t border-current/15 py-2 first:border-t-0 first:pt-0">
      <span className="truncate text-xs font-semibold">{row.hostname}</span>

      <span className="text-[11px]">
        {state === 'will-delete' ? (
          <>
            <span className="font-medium">Deleted:</span>{' '}
            {type && value ? `${type} → ${value}` : 'the record Datum created for this hostname'}
          </>
        ) : (
          <span className="opacity-80">{NO_RECORD_HINT[state]}</span>
        )}
      </span>

      {row.yourRecords.map((record) => (
        <span key={`${record.type}-${record.value}`} className="text-[11px]">
          <span className="font-medium">Kept:</span> {record.type} → {record.value}
        </span>
      ))}
    </li>
  );
}

/**
 * Shows, per hostname, which DNS record deleting an Application Load Balancer removes
 * and which of the user's own records it leaves in place.
 *
 * Rendered inside the delete confirmation's alert, so it runs its own queries and fills
 * in record detail as it arrives. The per-hostname outcome never depends on those
 * queries — it comes from the proxy's hostname conditions and stays correct when the
 * record lookups are slow, denied, or failing.
 */
export function ProxyDeleteDnsPreview({
  projectId,
  proxy,
}: {
  projectId: string;
  proxy: HttpProxy;
}) {
  const { hostnames, deleteCount, keptCount, isLoading } = useProxyDnsDeletePreview(
    projectId,
    proxy
  );

  return (
    <div className="flex flex-col gap-2" data-e2e="proxy-delete-dns-preview">
      <div className="flex items-center gap-1.5 text-xs font-semibold">
        <span data-e2e="dns-preview-summary">
          {DELETE_SUMMARY(deleteCount)}
          {keptCount > 0 && `, ${keptCount} kept`}
        </span>
        {isLoading && <SpinnerIcon size="xs" aria-label="Loading DNS record details" />}
      </div>

      <ul className="flex flex-col" data-e2e="dns-hostname-list">
        {hostnames.map((row) => (
          <HostnameGroup key={row.hostname} row={row} />
        ))}
      </ul>

      {keptCount > 0 && (
        <span className="text-[11px] opacity-80" data-e2e="dns-kept-note">
          Records marked Kept are yours. Deleting the load balancer removes its protection and
          leaves them in place.
        </span>
      )}
    </div>
  );
}
