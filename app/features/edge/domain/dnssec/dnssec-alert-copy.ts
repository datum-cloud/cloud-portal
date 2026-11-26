import type { DnssecRisk } from '@/utils/helpers/dns';

export interface DnssecAlertCopy {
  variant: 'destructive' | 'warning';
  title: string;
  /** Body text before the registrar link. */
  bodyBefore: string;
  /** Registrar name, or "your registrar". */
  registrarLabel: string;
  /** Body text after the registrar link. */
  bodyAfter: string;
}

/** True when the alert renders for this risk (used to guard its grid column). */
export function isDnssecAlertRisk(risk: DnssecRisk): boolean {
  return risk === 'on-broken' || risk === 'on-before-switch';
}

const FALLBACK_REGISTRAR = 'your registrar';

/**
 * Copy for the DNSSEC alert. Only `on-broken` and `on-before-switch` warn;
 * every other risk returns null. Kept free of JSX so it stays unit-testable.
 */
export function getDnssecAlertCopy(
  risk: DnssecRisk,
  domainName: string,
  registrarName?: string
): DnssecAlertCopy | null {
  const registrarLabel = registrarName?.trim() || FALLBACK_REGISTRAR;

  if (risk === 'on-broken') {
    return {
      variant: 'destructive',
      title: `Most visitors can't reach ${domainName}`,
      bodyBefore:
        "Its registry still has a DNSSEC (DS) record, and Datum doesn't sign DNS answers. Remove the record at ",
      registrarLabel,
      bodyAfter: '. Visitors get back in once resolvers drop the cached record.',
    };
  }

  if (risk === 'on-before-switch') {
    return {
      variant: 'warning',
      title: 'Remove DNSSEC before you switch to Datum',
      bodyBefore: `${domainName} has a DNSSEC (DS) record, and Datum doesn't sign DNS answers. Remove it at `,
      registrarLabel,
      bodyAfter: " before you switch nameservers, or most visitors won't reach your domain.",
    };
  }

  return null;
}
