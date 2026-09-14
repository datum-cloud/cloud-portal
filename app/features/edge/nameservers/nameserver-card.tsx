import { NameserverTable } from './nameserver-table';
import { IDnsNameserver, IDnsRegistration } from '@/resources/domains';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { useMemo } from 'react';

export interface NameserverCardProps {
  nameservers: IDnsNameserver[];
  registration?: IDnsRegistration;
  maxRows?: number;
  title?: string;
  actions?: React.ReactNode;
}

/**
 * Card wrapper for nameserver table in compact mode
 * Used in overview pages
 */
export const NameserverCard = ({
  nameservers,
  registration,
  maxRows = 5,
  title = 'Nameservers',
  actions,
}: NameserverCardProps) => {
  // Slice data at card level for better control
  const displayData = useMemo(
    () => (maxRows ? nameservers.slice(0, maxRows) : nameservers),
    [nameservers, maxRows]
  );

  return (
    <Card size="sm" sectioned className="relative overflow-hidden">
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">{title}</CardTitle>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      <CardContent padding="none">
        <NameserverTable data={displayData} registration={registration} />
      </CardContent>
    </Card>
  );
};
