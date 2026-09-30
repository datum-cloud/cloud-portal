import { BadgeCopy } from '@/components/badge/badge-copy';
import { type DnsZone, useDnsZone, useDnsZoneWatch } from '@/resources/dns-zones';
import { paths } from '@/utils/config/paths.config';
import { getDnsZoneDelegationState } from '@/utils/helpers/dns';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InfoIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link } from 'react-router';

interface DnsZoneDelegationNoticeProps {
  /** Zone from the route loader; used as initial data until the live query and watch take over. */
  zone?: DnsZone | null;
  projectId: string;
  className?: string;
}

/**
 * Detail-page notice for a zone whose domain still points at another DNS host.
 *
 * Nothing is broken in this state, so the error banner stays silent, yet every
 * record in the zone sits in "Validating" until the operator changes
 * nameservers at their registrar. This tells them so on whichever tab they
 * land on, with the exact values to copy and a link to the full instructions.
 *
 * Renders nothing once delegation is complete, while the domain's nameservers
 * are still being looked up, or when the zone is errored.
 *
 * The layout's loader data does not revalidate while navigating within a zone,
 * so the notice follows the zone through React Query and the zone watch. That
 * way it clears on its own once the registrar change propagates, in step with
 * the Nameservers tab.
 *
 * Addresses issue #1461.
 */
export function DnsZoneDelegationNotice({
  zone,
  projectId,
  className,
}: DnsZoneDelegationNoticeProps) {
  const zoneName = zone?.name ?? '';
  const { data: liveZone } = useDnsZone(projectId, zoneName, {
    initialData: zone ?? undefined,
    enabled: !!zoneName,
  });
  useDnsZoneWatch(projectId, zoneName, { enabled: !!zoneName });

  const currentZone = liveZone ?? zone;
  const delegation = useMemo(() => getDnsZoneDelegationState(currentZone), [currentZone]);

  if (!delegation.isPending) {
    return null;
  }

  const { setup, datumNameservers } = delegation;
  const nameserversHref = getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
    projectId,
    dnsZoneId: zoneName,
  });

  return (
    <Alert variant="info" className={className} data-e2e="dns-zone-delegation-notice">
      <Icon icon={InfoIcon} className="size-4" />
      <AlertTitle className="text-sm">
        {setup.isPartiallySetup
          ? `Nameserver setup incomplete (${setup.setupCount} of ${setup.totalCount})`
          : 'Point your nameservers at Datum to activate this zone'}
      </AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">
          <span>
            {setup.isPartiallySetup
              ? 'Records stay in Validating until every Datum nameserver is configured. Add the remaining ones at your domain registrar:'
              : 'Records stay in Validating until the domain resolves through Datum. Sign in to your domain registrar and replace the existing nameservers with:'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {datumNameservers.map((nameserver) => (
              <BadgeCopy
                key={nameserver}
                value={nameserver}
                text={nameserver}
                badgeTheme="solid"
                badgeType="quaternary"
              />
            ))}
          </div>
          <div>
            <LinkButton as={Link} href={nameserversHref} size="xs" type="secondary" theme="outline">
              View nameserver instructions
            </LinkButton>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
