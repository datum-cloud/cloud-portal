import { ChipsOverflow } from '@/components/chips-overflow';
import { IDnsNameserver } from '@/resources/domains';

/**
 * Helper function to extract unique registrant names (DNS host providers)
 * from nameservers or IPs data
 */
const extractRegistrantNames = (
  data: IDnsNameserver[] | IDnsNameserver['ips'] | undefined
): string[] => {
  if (!data?.length) return [];

  // Type guard to determine if data is nameservers or IPs
  const isNameservers = (d: typeof data): d is IDnsNameserver[] => {
    return Array.isArray(d) && d.length > 0 && 'hostname' in d[0];
  };

  const nameMap = new Map<string, boolean>();

  if (isNameservers(data)) {
    // Process full nameservers array
    data.forEach((ns) => {
      ns?.ips?.forEach((ip) => {
        const name = ip?.registrantName?.trim();
        if (name) nameMap.set(name, true);
      });
    });
  } else {
    // Process IPs array directly
    data.forEach((ip) => {
      const name = ip?.registrantName?.trim();
      if (name) nameMap.set(name, true);
    });
  }

  return Array.from(nameMap.keys());
};

export interface DnsHostChipsProps {
  data?: IDnsNameserver[] | IDnsNameserver['ips'];
  maxVisible?: number;
  wrap?: boolean;
  emptyText?: string;
}

/**
 * Display DNS host provider names as chips
 * Extracts registrant names from nameserver or IP data
 */
export const NameserverChips = ({
  data,
  maxVisible = 2,
  wrap = false,
  emptyText = '-',
}: DnsHostChipsProps) => {
  const registrantNames = extractRegistrantNames(data);

  if (registrantNames.length === 0) return <>{emptyText}</>;

  return (
    <ChipsOverflow items={registrantNames} maxVisible={maxVisible} theme="outline" wrap={wrap} />
  );
};
