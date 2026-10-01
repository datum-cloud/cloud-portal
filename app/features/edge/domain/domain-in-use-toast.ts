import { paths } from '@/utils/config/paths.config';
import { DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE } from '@/utils/errors/domain-in-use-error';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { toast } from '@datum-cloud/datum-ui/toast';
import type { NavigateFunction } from 'react-router';

/**
 * Toast for a domain delete the API refused because a DNS zone still uses the
 * domain. Links to that zone when known, otherwise to the DNS zones list.
 */
export function showDomainInUseToast({
  projectId,
  dnsZoneName,
  navigate,
}: {
  projectId: string;
  dnsZoneName?: string;
  navigate: NavigateFunction;
}): void {
  const href = dnsZoneName
    ? getPathWithParams(paths.project.detail.dnsZones.detail.root, {
        projectId,
        dnsZoneId: dnsZoneName,
      })
    : getPathWithParams(paths.project.detail.dnsZones.root, { projectId });

  toast.error('Domain', {
    description: DOMAIN_IN_USE_BY_DNS_ZONE_MESSAGE,
    action: {
      label: dnsZoneName ? 'View DNS zone' : 'View DNS zones',
      onClick: () => navigate(href),
    },
  });
}
