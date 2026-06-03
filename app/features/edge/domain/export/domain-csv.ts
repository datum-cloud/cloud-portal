import { type Domain, getDnsHostProviders } from '@/resources/domains';

export const DOMAIN_CSV_HEADERS = [
  'domain',
  'registrar',
  'dns_host',
  'expiration_date',
  'verification_status',
  'resource_name',
];

/** ISO timestamp → YYYY-MM-DD (keeps the stored date; no timezone shift). */
function formatExpiresAt(expiresAt?: string): string {
  if (!expiresAt) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(expiresAt);
  return match ? match[1] : '';
}

/** Registrar name, "Private" when registration exists but name is hidden, else blank. */
function formatRegistrar(registration: { registrar?: { name?: string } } | undefined): string {
  if (!registration) return '';
  return registration.registrar?.name ?? 'Private';
}

/** Map a loaded Domain to a CSV row matching DOMAIN_CSV_HEADERS. */
export function domainToCsvRow(domain: Domain): string[] {
  const status = domain.status as
    | {
        verified?: boolean;
        nameservers?: Parameters<typeof getDnsHostProviders>[0];
        registration?: { registrar?: { name?: string }; expiresAt?: string };
      }
    | undefined;

  return [
    domain.domainName ?? '',
    formatRegistrar(status?.registration),
    getDnsHostProviders(status?.nameservers).join(' '),
    formatExpiresAt(status?.registration?.expiresAt),
    status?.verified ? 'Verified' : 'Unverified',
    domain.name ?? '',
  ];
}
