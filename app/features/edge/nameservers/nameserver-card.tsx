import { NameserverTable } from './nameserver-table';
import { IDnsNameserver, IDnsRegistration } from '@/resources/domains';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
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
    <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="text-lg font-medium">{title}</span>
          {actions}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <NameserverTable data={displayData} registration={registration} />
      </CardContent>
    </Card>
  );
};
