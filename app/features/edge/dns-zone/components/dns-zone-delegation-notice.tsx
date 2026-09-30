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
 * Detail-page notice for a healthy zone that cannot serve traffic yet.
 *
 * Two states qualify and neither is an error, so the error banner stays
 * silent while every record sits in "Validating": the platform is waiting for
 * the operator to verify they own the domain, or Datum has assigned
 * nameservers and the domain still points at another DNS host. This says
 * which one applies on whichever tab they land on, and links to where the fix
 * happens (the domain page, or the Nameservers tab with values to copy).
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

  if (delegation.reason === 'domainVerification') {
    const domainHref = getPathWithParams(paths.project.detail.domains.detail.overview, {
      projectId,
      domainId: delegation.domainName ?? '',
    });
    const domainLabel = currentZone?.domainName ?? 'this domain';
    return (
      <Alert variant="info" className={className} data-e2e="dns-zone-verification-notice">
        <Icon icon={InfoIcon} className="size-4" />
        <AlertTitle className="text-sm">Verify domain ownership to activate this zone</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3">
            <span>
              Records stay in Validating until you prove you own {domainLabel}. Datum assigns
              nameservers to the zone once verification passes. The domain page has the verification
              record to add.
            </span>
            <div>
              <LinkButton as={Link} href={domainHref} size="xs" type="secondary" theme="outline">
                Verify domain
              </LinkButton>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

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
