import { getDnssecAlertCopy } from './dnssec-alert-copy';
import { DateTime } from '@/components/date-time';
import { RefreshNameserversButton } from '@/features/edge/dns-zone/components/refresh-nameservers-button';
import { ExternalLink } from '@/features/edge/domain/external-link';
import { type DomainRegistration, registrationCheckedAt } from '@/resources/domains';
import type { DnssecRisk } from '@/utils/helpers/dns';
import { toExternalHref } from '@/utils/helpers/url.helper';
import { Alert, AlertDescription, AlertTitle } from '@datum-cloud/datum-ui/alert';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { ExternalLinkIcon, TriangleAlertIcon } from 'lucide-react';

// The section that walks through removing the DS record, which is what the alert asks for.
const DNSSEC_GUIDE_URL =
  'https://www.datum.net/docs/domain-dns/dns#turn-off-dnssec-before-you-switch-nameservers';

const REFRESH_SUCCESS = {
  title: 'Registration refresh requested',
  description: "We'll update the registration details once the lookup finishes.",
};
const REFRESH_ERROR = {
  title: "Couldn't refresh the registration",
};

export interface DnssecAlertProps {
  risk: DnssecRisk;
  /** spec.domainName, e.g. example.com. */
  domainName: string;
  /** metadata.name of the Domain resource, used for the refresh call. */
  domainResourceName: string;
  projectId: string;
  registration?: DomainRegistration | null;
  /** domain.desiredRegistrationRefreshAttempt, keys the Refresh cooldown. */
  desiredRefreshAttempt?: string;
  className?: string;
}

/**
 * Warns when a registry DS record will break, or already breaks, a domain on
 * Datum's nameservers. Renders nothing for every other DNSSEC state.
 */
export function DnssecAlert({
  risk,
  domainName,
  domainResourceName,
  projectId,
  registration,
  desiredRefreshAttempt,
  className,
}: DnssecAlertProps) {
  const copy = getDnssecAlertCopy(risk, domainName, registration?.registrar?.name);
  if (!copy) return null;

  const registrarHref = toExternalHref(registration?.registrar?.url);
  const lastChecked = registrationCheckedAt(registration);

  const guideButtonClass =
    'border-current text-current hover:bg-black/5 dark:border-current dark:text-current dark:hover:border-current dark:active:border-current';

  return (
    <Alert variant={copy.variant} className={className} data-e2e="domain-dnssec-alert">
      <Icon icon={TriangleAlertIcon} className="size-4" />
      <AlertTitle className="text-sm">{copy.title}</AlertTitle>
      <AlertDescription>
        <div className="flex flex-col gap-3">
          <span>
            {copy.bodyBefore}
            {registrarHref ? (
              <ExternalLink href={registrarHref}>{copy.registrarLabel}</ExternalLink>
            ) : (
              copy.registrarLabel
            )}
            {copy.bodyAfter}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <RefreshNameserversButton
              domainName={domainResourceName}
              projectId={projectId}
              size="xs"
              type="secondary"
              theme="outline"
              className={guideButtonClass}
              label="Refresh"
              successMessage={REFRESH_SUCCESS}
              errorMessage={REFRESH_ERROR}
              lastRefreshAttempt={desiredRefreshAttempt}
            />
            <LinkButton
              href={DNSSEC_GUIDE_URL}
              target="_blank"
              rel="noreferrer"
              size="xs"
              type="secondary"
              theme="outline"
              className={guideButtonClass}>
              DNSSEC guide
              <Icon icon={ExternalLinkIcon} size={12} aria-hidden="true" />
              <span className="sr-only">(opens in new tab)</span>
            </LinkButton>
            {lastChecked && (
              <Text textColor="muted" className="text-3xs leading-none">
                Last checked{' '}
                <DateTime className="text-3xs" variant="relative" addSuffix date={lastChecked} />
              </Text>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
