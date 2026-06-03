import { ChipsOverflow } from '@/components/chips-overflow';
import { getDnsHostProviders, IDnsNameserver } from '@/resources/domains';

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
  const registrantNames = getDnsHostProviders(data);

  if (registrantNames.length === 0) return <>{emptyText}</>;

  return (
    <ChipsOverflow items={registrantNames} maxVisible={maxVisible} theme="outline" wrap={wrap} />
  );
};
