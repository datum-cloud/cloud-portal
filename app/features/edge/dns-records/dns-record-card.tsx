import { DnsRecordTable } from './dns-record-table';
import type { DnsRecordCardProps } from './types';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { useMemo } from 'react';

/**
 * Card wrapper for DNS record table in compact mode
 * Used in overview pages
 */
export const DnsRecordCard = ({
  records,
  projectId,
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
    <Card size="sm" sectioned className="relative overflow-hidden">
      <CardHeader size="sm" bordered>
        <CardTitle className="text-sm">{title}</CardTitle>
        {actions ? <CardAction>{actions}</CardAction> : null}
      </CardHeader>
      <CardContent padding="none">
        <DnsRecordTable projectId={projectId} data={displayData} mode="compact" />
      </CardContent>
    </Card>
  );
};
