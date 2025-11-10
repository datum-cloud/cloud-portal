import { ChipsOverflow } from '@/components/chips-overflow';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';

export interface DomainDnsHostProps {
  nameservers?: NonNullable<IDomainControlResponse['status']>['nameservers'];
  maxVisible?: number;
  wrap?: boolean;
}

export const DomainDnsHost = ({
  nameservers,
  maxVisible = 2,
  wrap = false,
}: DomainDnsHostProps) => {
  if (!nameservers?.length) return <>-</>;

  const registrantNames = Array.from(
    nameservers
      .reduce((acc, ns) => {
        ns?.ips?.forEach((ip) => {
          const name = ip?.registrantName?.trim();
          if (name) acc.set(name, true);
        });
        return acc;
      }, new Map<string, boolean>())
      .keys()
  );

  if (registrantNames.length === 0) return <>-</>;

  return (
    <ChipsOverflow items={registrantNames} maxVisible={maxVisible} theme="outline" wrap={wrap} />
  );
};
