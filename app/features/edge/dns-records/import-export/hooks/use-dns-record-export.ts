import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { downloadFile } from '@/utils/common';
import { transformRecordsToBindFormat } from '@/utils/helpers/dns-record.helper';
import { toast } from '@datum-ui/components';
import { useState } from 'react';

interface UseDnsRecordExportProps {
  existingRecords: IFlattenedDnsRecord[];
  dnsZoneId: string;
  origin?: string;
}

export function useDnsRecordExport({
  existingRecords,
  dnsZoneId,
  origin,
}: UseDnsRecordExportProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (existingRecords.length === 0) {
      toast.info('No records to export');
      return;
    }

    setIsExporting(true);
    try {
      const content = transformRecordsToBindFormat(existingRecords, origin);
      const filename = `${dnsZoneId}.zone`;
      downloadFile(content, filename);
      toast.success('DNS Records', {
        description: `${existingRecords.length} records exported to ${filename}`,
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to export DNS records', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    handleExport,
  };
}
