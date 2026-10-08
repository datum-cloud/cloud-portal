import { StatusChip } from '@/components/card/status-chip';
import type { HostnameState } from '@/features/edge/proxy/utils/hostname-state';
import { requestWildcardHostnames } from '@/features/edge/proxy/utils/request-wildcards';
import { WILDCARD_NOT_ENABLED_MESSAGE } from '@/resources/http-proxies';
import { formatDnsError } from '@/utils/helpers/dns/error-formatting.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** "Wildcards not enabled", optionally a button that asks Datum support to enable them. */
export function WildcardsNotEnabledChip({
  hostname,
  projectId,
  requestable,
}: {
  hostname: string;
  projectId?: string;
  /** Click opens a pre-filled support message. Off where a button sits nearby. */
  requestable?: boolean;
}) {
  if (!requestable) {
    return (
      <StatusChip tone="danger" tooltip={WILDCARD_NOT_ENABLED_MESSAGE}>
        Wildcards not enabled
      </StatusChip>
    );
  }
  return (
    <button
      type="button"
      className="inline-flex cursor-pointer"
      onClick={() => requestWildcardHostnames(projectId, [hostname])}>
      <StatusChip
        tone="danger"
        tooltip={`${WILDCARD_NOT_ENABLED_MESSAGE} Click to message Datum support.`}>
        Wildcards not enabled
      </StatusChip>
    </button>
  );
}

/** Wraps a chip in a link when there's somewhere to send the user. */
function LinkedChip({ href, children }: { href?: string; children: ReactNode }) {
  return href ? (
    <Link to={href} className="inline-flex">
      {children}
    </Link>
  ) : (
    <>{children}</>
  );
}

/**
 * Ownership, DNS and certificate chips for one custom hostname, shared by the
 * Configuration tab's hostname list and the Overview so both read alike.
 *
 * `compact` shortens labels for the Overview and adds a count of DNS records
 * still to add. `detailsHref` is where the records and fixes are listed; when
 * set, chips that need the user to act link there.
 */
export function HostnameStatusChips({
  state,
  projectId,
  compact = false,
  detailsHref,
}: {
  state: HostnameState;
  projectId?: string;
  compact?: boolean;
  detailsHref?: string;
}) {
  const { ownership } = state;

  return (
    <>
      {ownership.state === 'verified' ? (
        <StatusChip tone="success" tooltip="Hostname ownership verified by Datum">
          Verified
        </StatusChip>
      ) : ownership.state === 'verifying' ? (
        <StatusChip
          tone="warning"
          busy
          tooltip={ownership.message || 'Waiting for ownership verification'}>
          Verifying
        </StatusChip>
      ) : (
        <LinkedChip href={detailsHref}>
          <StatusChip tone="danger" tooltip={ownership.message}>
            {ownership.label}
          </StatusChip>
        </LinkedChip>
      )}

      {state.blocked ? (
        <StatusChip
          tone="muted"
          tooltip="Datum programs DNS and issues the TLS certificate once ownership is sorted">
          DNS & TLS on hold
        </StatusChip>
      ) : (
        <>
          {state.dnsIssue ? (
            <StatusChip tone="danger" tooltip={state.dnsIssue.message}>
              <Icon icon={TriangleAlertIcon} size={11} aria-hidden="true" />
              {state.dnsIssue.label}
            </StatusChip>
          ) : state.dns === 'programmed' ? (
            <StatusChip tone="success" tooltip="Datum programmed the DNS record for this hostname">
              {compact ? 'DNS ready' : 'DNS Ready'}
            </StatusChip>
          ) : state.dns === 'not-applicable' ? (
            <StatusChip
              tone="muted"
              tooltip="This hostname isn't in a Datum DNS zone, so you manage its DNS yourself">
              External DNS
            </StatusChip>
          ) : (
            <StatusChip
              tone="warning"
              busy
              tooltip={
                state.dnsMessage
                  ? formatDnsError(state.dnsMessage)
                  : 'Waiting for the DNS record to be programmed'
              }>
              {compact ? 'DNS' : 'Pending DNS'}
            </StatusChip>
          )}

          {state.cert === 'ready' ? (
            <StatusChip tone="success" tooltip="TLS certificate issued and ready">
              {compact ? 'TLS' : 'TLS Ready'}
            </StatusChip>
          ) : state.cert === 'renewal-failing' ? (
            <StatusChip
              tone="warning"
              tooltip={
                state.certMessage || 'The certificate is still valid, but its renewal is failing'
              }>
              TLS renewal failing
            </StatusChip>
          ) : state.cert === 'not-enabled' ? (
            // On the full list a Request wildcards button sits under the row.
            <WildcardsNotEnabledChip
              hostname={state.hostname}
              projectId={projectId}
              requestable={compact}
            />
          ) : state.awaitingCertRecord ? (
            <LinkedChip href={detailsHref}>
              <StatusChip
                tone="warning"
                tooltip={
                  detailsHref
                    ? 'Issued once its Certificate record is in place. Click to see it.'
                    : 'Issued once the Certificate record below is in place'
                }>
                TLS awaiting DNS
              </StatusChip>
            </LinkedChip>
          ) : state.cert === 'failed' ? (
            <StatusChip
              tone="danger"
              tooltip={state.certMessage || 'TLS certificate provisioning failed'}>
              TLS failed
            </StatusChip>
          ) : state.cert === 'challenge' ? (
            <StatusChip
              tone="warning"
              busy
              tooltip={
                state.certMessage || 'Completing ACME challenge with the certificate authority'
              }>
              {compact ? 'TLS' : 'ACME challenge'}
            </StatusChip>
          ) : (
            <StatusChip
              tone="warning"
              busy
              tooltip={state.certMessage || 'Requesting a TLS certificate'}>
              {compact ? 'TLS' : 'Issuing TLS'}
            </StatusChip>
          )}
        </>
      )}

      {compact && state.actionableRecords.length > 0 ? (
        <LinkedChip href={detailsHref}>
          <StatusChip
            tone="warning"
            tooltip={
              detailsHref ? 'Click to see the records and add them' : 'DNS records still to add'
            }>
            {state.actionableRecords.length === 1
              ? '1 DNS record to add'
              : `${state.actionableRecords.length} DNS records to add`}
          </StatusChip>
        </LinkedChip>
      ) : null}
    </>
  );
}
