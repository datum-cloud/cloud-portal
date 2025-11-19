import { DnsRecordTable } from './dns-record-table';
import type { DnsRecordCardProps } from './types';
import { Card, CardContent, CardHeader, CardTitle } from '@datum-ui/components';
import { useMemo } from 'react';

/**
 * Card wrapper for DNS record table in compact mode
 * Used in overview pages
 */
export const DnsRecordCard = ({
  records,
  maxRows = 5,
  title = 'DNS Records',
  actions,
}: DnsRecordCardProps) => {
  // Slice data at card level for better control
  const displayData = useMemo(
    () => (maxRows ? records.slice(0, maxRows) : records),
    [records, maxRows]
  );

  return (
    <Card className="relative gap-6 overflow-hidden rounded-xl px-3 py-8 shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="text-lg font-medium">{title}</span>
          {actions}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DnsRecordTable data={displayData} mode="compact" />
      </CardContent>
    </Card>
  );
};
