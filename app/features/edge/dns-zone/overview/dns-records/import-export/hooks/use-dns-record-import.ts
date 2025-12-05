import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import {
  IDnsZoneDiscoveryRecordSet,
  IFlattenedDnsRecord,
} from '@/resources/interfaces/dns.interface';
import { ROUTE_PATH as DNS_RECORDS_BULK_IMPORT_PATH } from '@/routes/api/dns-records/bulk-import';
import {
  ImportResult,
  parseBindZoneFile,
  readFileAsText,
  SUPPORTED_DNS_RECORD_TYPES,
  transformParsedToFlattened,
  transformParsedToRecordSets,
} from '@/utils/helpers/dns-record.helper';
import { useState } from 'react';
import { useAuthenticityToken } from 'remix-utils/csrf/react';

export type DropzoneState = 'idle' | 'loading' | 'error' | 'success';
export type DialogView = 'preview' | 'result';

export interface UnsupportedRecordsInfo {
  types: string[];
  totalRecords: number;
}

interface UseDnsRecordImportProps {
  projectId: string;
  dnsZoneId: string;
  onSuccess?: () => void;
}

export function useDnsRecordImport({ projectId, dnsZoneId, onSuccess }: UseDnsRecordImportProps) {
  const csrf = useAuthenticityToken();

  // Dropzone state
  const [files, setFiles] = useState<File[] | undefined>();
  const [dropzoneState, setDropzoneState] = useState<DropzoneState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogView, setDialogView] = useState<DialogView>('preview');

  // Preview state
  const [flattenedRecords, setFlattenedRecords] = useState<IFlattenedDnsRecord[]>([]);
  const [rawRecordSets, setRawRecordSets] = useState<IDnsZoneDiscoveryRecordSet[]>([]);
  const [unsupportedRecords, setUnsupportedRecords] = useState<UnsupportedRecordsInfo | null>(null);

  // Import state
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importFetcher = useDatumFetcher<{
    success: boolean;
    error?: string;
    data?: ImportResult;
  }>({
    key: 'dns-records-bulk-import',
    onSuccess: (data) => {
      setIsImporting(false);
      if (data.data) {
        setImportResult(data.data);
        setDialogView('result');
      }
      onSuccess?.();
    },
    onError: (data) => {
      setIsImporting(false);
      if (data.data) {
        setImportResult(data.data);
        setDialogView('result');
      }
    },
  });

  const resetDropzone = () => {
    setFiles(undefined);
    setDropzoneState('idle');
    setErrorMessage(null);
  };

  const resetDialog = () => {
    setDialogOpen(false);
    // setDialogView('preview');
    setFlattenedRecords([]);
    setRawRecordSets([]);
    setUnsupportedRecords(null);
    setImportResult(null);
  };

  const closeDialog = () => {
    resetDialog();
  };

  const handleDrop = async (droppedFiles: File[]) => {
    const file = droppedFiles[0];
    if (!file) return;

    setFiles(droppedFiles);
    setDropzoneState('loading');
    setErrorMessage(null);

    try {
      const content = await readFileAsText(file);
      const result = parseBindZoneFile(content);

      if (result.errors.length > 0) {
        setDropzoneState('error');
        setErrorMessage(result.errors.join(', '));
        return;
      }

      if (result.records.length === 0) {
        setDropzoneState('error');
        setErrorMessage('No valid DNS records found in the file');
        return;
      }

      // Filter records by supported types
      const supportedRecords = result.records.filter((record) =>
        SUPPORTED_DNS_RECORD_TYPES.includes(
          record.type as (typeof SUPPORTED_DNS_RECORD_TYPES)[number]
        )
      );

      // Track unsupported records
      const unsupportedList = result.records.filter(
        (record) =>
          !SUPPORTED_DNS_RECORD_TYPES.includes(
            record.type as (typeof SUPPORTED_DNS_RECORD_TYPES)[number]
          )
      );

      if (unsupportedList.length > 0) {
        const uniqueTypes = [...new Set(unsupportedList.map((r) => r.type))];
        setUnsupportedRecords({
          types: uniqueTypes,
          totalRecords: unsupportedList.length,
        });
      } else {
        setUnsupportedRecords(null);
      }

      if (supportedRecords.length === 0) {
        setDropzoneState('error');
        setErrorMessage('No supported DNS records found in the file');
        return;
      }

      // Transform records for API and display
      const recordSets = transformParsedToRecordSets(supportedRecords);
      const flattened = transformParsedToFlattened(supportedRecords, dnsZoneId);

      setRawRecordSets(recordSets);
      setFlattenedRecords(flattened);

      // Reset dropzone and open dialog with preview
      resetDropzone();
      setDialogView('preview');
      setDialogOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to read file';
      setDropzoneState('error');
      setErrorMessage(message);
    }
  };

  const handleDropError = (error: Error) => {
    setDropzoneState('error');
    setErrorMessage(error.message);
    setFiles(undefined);
  };

  const handleImport = () => {
    if (rawRecordSets.length === 0) return;

    setIsImporting(true);
    importFetcher.submit(
      JSON.stringify({
        projectId,
        dnsZoneId,
        discoveryRecordSets: rawRecordSets,
        importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
        csrf,
      }),
      {
        method: 'POST',
        action: DNS_RECORDS_BULK_IMPORT_PATH,
        encType: 'application/json',
      }
    );
  };

  return {
    // Dropzone
    files,
    dropzoneState,
    errorMessage,
    handleDrop,
    handleDropError,
    resetDropzone,

    // Dialog
    dialogOpen,
    setDialogOpen,
    dialogView,
    closeDialog,

    // Preview
    flattenedRecords,
    unsupportedRecords,

    // Import
    isImporting,
    handleImport,
    importResult,
  };
}
