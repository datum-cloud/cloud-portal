import { type DnsZone, useDnsZone, useDnsZoneWatch } from '@/resources/dns-zones';
import { usePrivateZoneVpcLinks } from '@/resources/private-dns';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { InfoIcon } from 'lucide-react';
import { Link } from 'react-router';

interface PrivateZoneStatusNoticeProps {
  zone?: DnsZone | null;
  projectId: string;
  className?: string;
}

/**
 * Says why a private zone doesn't answer yet. Renders nothing for public
 * zones, ready zones, and failures (the error banner covers those).
 */
export function PrivateZoneStatusNotice({
  zone: loaderZone,
  projectId,
  className,
}: PrivateZoneStatusNoticeProps) {
  // Loader data doesn't revalidate within a zone, so follow the live zone
  // (as the delegation notice does) to clear once the zone is programmed.
  const zoneName = loaderZone?.name ?? '';
  const enabled = !!zoneName && !!loaderZone?.isPrivate;
  const { data: liveZone } = useDnsZone(projectId, zoneName, {
    initialData: loaderZone ?? undefined,
    enabled,
  });
  useDnsZoneWatch(projectId, zoneName, { enabled });
  const zone = liveZone ?? loaderZone;
  const { state, access, isLoading } = usePrivateZoneVpcLinks(projectId, zone);

  if (!zone?.isPrivate || isLoading || access !== 'ok') {
    return null;
  }

  if (state === 'unlinked') {
    const vpcsHref = getPathWithParams(paths.project.detail.dnsZones.detail.vpcs, {
      projectId,
      dnsZoneId: zone.name,
    });
    return (
      <Alert variant="info" className={className} data-e2e="private-zone-unlinked-notice">
        <Icon icon={InfoIcon} className="size-4" />
        <AlertTitle className="text-sm">No VPC can resolve this zone yet</AlertTitle>
        <AlertDescription>
          <div className="flex flex-col gap-3">
            <span>
              Private zones answer only inside the VPCs they are linked to. Records in this zone
              won&apos;t resolve anywhere until at least one VPC is linked.
            </span>
            <div>
              <LinkButton as={Link} href={vpcsHref} size="xs" type="secondary" theme="outline">
                View VPCs
              </LinkButton>
            </div>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (state === 'preparing') {
    return (
      <Alert variant="info" className={className} data-e2e="private-zone-preparing-notice">
        <Icon icon={InfoIcon} className="size-4" />
        <AlertTitle className="text-sm">Preparing this zone</AlertTitle>
        <AlertDescription>
          The latest changes are on their way to the DNS servers for the linked VPCs. Until they
          arrive, lookups from those VPCs may return earlier answers, or none for a new zone.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
