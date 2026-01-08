import { IFlattenedDnsRecord } from '@/resources/dns-records';

// =============================================================================
// DNS Record Setup Validation Helpers
// =============================================================================

export interface IDnsSetupRule {
  id: string;
  label: string;
  description: string;
  isComplete: boolean;
}

export interface IDnsSetupStatus {
  /** All rules are satisfied */
  isFullySetup: boolean;
  /** At least one rule is satisfied */
  isPartiallySetup: boolean;
  /** Any rule is satisfied (alias for isPartiallySetup) */
  hasAnySetup: boolean;
  /** Number of completed rules */
  completedCount: number;
  /** Total number of rules */
  totalCount: number;
  /** Individual rule statuses */
  rules: IDnsSetupRule[];
  /** Records that satisfy the setup rules (www, root, MX) */
  relevantRecords: IFlattenedDnsRecord[];
}

/**
 * Check if name represents root domain
 */
function isRootName(name?: string): boolean {
  return name === '@' || name === '' || !name;
}

/**
 * Get A, AAAA, or CNAME records for the www subdomain
 */
function getWwwRecords(records: IFlattenedDnsRecord[]): IFlattenedDnsRecord[] {
  return records.filter(
    (record) =>
      (record.type === 'A' || record.type === 'AAAA' || record.type === 'CNAME') &&
      record.name?.toLowerCase() === 'www'
  );
}

/**
 * Get A, AAAA, or CNAME records for the root domain
 * Root domain is represented as '@' or empty string in name field
 */
function getRootRecords(records: IFlattenedDnsRecord[]): IFlattenedDnsRecord[] {
  return records.filter(
    (record) =>
      (record.type === 'A' || record.type === 'AAAA' || record.type === 'CNAME') &&
      isRootName(record.name)
  );
}

/**
 * Get MX records for the root domain
 */
function getRootMxRecords(records: IFlattenedDnsRecord[]): IFlattenedDnsRecord[] {
  return records.filter((record) => record.type === 'MX' && isRootName(record.name));
}

/**
 * Analyze DNS record setup status against recommended configuration rules
 *
 * Rules checked:
 * 1. www subdomain has A, AAAA, or CNAME record
 * 2. Root domain has A, AAAA, or CNAME record
 * 3. Root domain has MX record for email
 *
 * @param records - Array of flattened DNS records
 * @param domainName - The domain name (for display purposes)
 * @returns Setup status object with rule details and summary flags
 */
export function getDnsSetupStatus(
  records: IFlattenedDnsRecord[],
  domainName?: string
): IDnsSetupStatus {
  const domain = domainName || 'your domain';

  // Get records matching each rule
  const wwwRecords = getWwwRecords(records);
  const rootRecords = getRootRecords(records);
  const mxRecords = getRootMxRecords(records);

  const rules: IDnsSetupRule[] = [
    {
      id: 'www-record',
      label: 'www subdomain',
      description: `Add an A, AAAA, or CNAME record for www so that www.${domain} will resolve.`,
      isComplete: wwwRecords.length > 0,
    },
    {
      id: 'root-record',
      label: 'Root domain',
      description: `Add an A, AAAA, or CNAME record for your root so that ${domain} will resolve.`,
      isComplete: rootRecords.length > 0,
    },
    {
      id: 'mx-record',
      label: 'MX record',
      description: `Add an MX record for your root domain so that mail can reach @${domain} addresses.`,
      isComplete: mxRecords.length > 0,
    },
  ];

  // Combine all relevant records (deduplicated)
  const relevantRecords = [...wwwRecords, ...rootRecords, ...mxRecords];

  const completedCount = rules.filter((rule) => rule.isComplete).length;
  const totalCount = rules.length;

  return {
    isFullySetup: completedCount === totalCount,
    isPartiallySetup: completedCount > 0 && completedCount < totalCount,
    hasAnySetup: completedCount > 0,
    completedCount,
    totalCount,
    rules,
    relevantRecords,
  };
}
