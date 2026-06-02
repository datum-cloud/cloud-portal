import type { DnsZone } from '@/resources/dns-zones';
import { getDnsZoneErrorState, getDnsZoneErrorGuidance } from '@/utils/helpers/dns';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { TriangleAlertIcon } from 'lucide-react';
import { useMemo } from 'react';

interface DnsZoneErrorBannerProps {
  zone?: DnsZone | null;
  className?: string;
}

/**
 * Detail-page banner that surfaces a DNS zone's errored state with actionable
 * guidance.
 *
 * Renders nothing when the zone is healthy. The error detection mirrors the DNS
 * zone list page (Programmed condition = False), and the message is mapped to
 * human-facing remediation guidance via {@link getDnsZoneErrorGuidance}.
 *
 * Addresses issue #1031 — an errored zone now explains itself on the detail view
 * instead of silently sitting on the "Discovering DNS Records" screen.
 */
export function DnsZoneErrorBanner({ zone, className }: DnsZoneErrorBannerProps) {
  const guidance = useMemo(() => {
    const { hasError, reason, message } = getDnsZoneErrorState(zone);
    return hasError ? getDnsZoneErrorGuidance(reason, message) : null;
  }, [zone]);

  if (!guidance) {
    return null;
  }

  return (
    <Alert variant="destructive" className={className} data-e2e="dns-zone-error-banner">
      <Icon icon={TriangleAlertIcon} className="size-4" />
      <AlertTitle className="text-destructive text-sm">{guidance.title}</AlertTitle>
      <AlertDescription>{guidance.description}</AlertDescription>
    </Alert>
  );
}
