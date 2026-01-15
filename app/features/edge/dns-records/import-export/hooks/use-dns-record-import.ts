import { IFlattenedDnsRecord, useBulkImportDnsRecords } from '@/resources/dns-records';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';
import { readFileAsText } from '@/utils/common';
import {
  deduplicateParsedRecords,
  ImportResult,
  parseBindZoneFile,
  SUPPORTED_DNS_RECORD_TYPES,
  transformApexCnameToAlias,
  transformParsedToFlattened,
  transformParsedToRecordSets,
} from '@/utils/helpers/dns-record.helper';
import { useState } from 'react';

export type DropzoneState = 'idle' | 'loading' | 'error' | 'success';
export type DialogView = 'preview' | 'result';

export interface UnsupportedRecordsInfo {
  types: string[];
  totalRecords: number;
}

export interface DuplicateRecordsInfo {
  count: number;
}

interface UseDnsRecordImportProps {
  projectId: string;
  dnsZoneId: string;
  onSuccess?: () => void;
}

export function useDnsRecordImport({ projectId, dnsZoneId, onSuccess }: UseDnsRecordImportProps) {
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
  const [duplicateRecords, setDuplicateRecords] = useState<DuplicateRecordsInfo | null>(null);

  // Import state
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const importMutation = useBulkImportDnsRecords(projectId, dnsZoneId, {
    onSuccess: (data) => {
      setImportResult(data);
      setDialogView('result');
      onSuccess?.();
    },
    onError: (error) => {
      // On error, we still show the result view if we have partial results
      // The mutation will throw if completely failed
      setImportResult({
        summary: {
          totalRecordSets: 0,
          totalRecords: 0,
          created: 0,
          updated: 0,
          skipped: 0,
          failed: 1,
        },
        details: [
          {
            recordType: 'Unknown',
            name: 'Import',
            value: '',
            action: 'failed',
            message: error.message || 'Unknown error',
          },
        ],
      });
      setDialogView('result');
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
    setDuplicateRecords(null);
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

      // Deduplicate records within the batch (handles trailing dot normalization)
      const { unique: deduplicatedRecords, duplicateCount } =
        deduplicateParsedRecords(supportedRecords);

      // Track duplicate records info
      if (duplicateCount > 0) {
        setDuplicateRecords({ count: duplicateCount });
      } else {
        setDuplicateRecords(null);
      }

      // Transform apex CNAME records to ALIAS (CNAME not allowed at zone apex)
      const { records: transformedRecords, transformedIndices } =
        transformApexCnameToAlias(deduplicatedRecords);

      // Transform records for API and display
      const recordSets = transformParsedToRecordSets(transformedRecords);
      const flattened = transformParsedToFlattened(
        transformedRecords,
        dnsZoneId,
        transformedIndices
      );

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

    importMutation.mutate({
      discoveryRecordSets: rawRecordSets,
      importOptions: { skipDuplicates: true, mergeStrategy: 'append' },
    });
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
    duplicateRecords,

    // Import
    isImporting: importMutation.isPending,
    handleImport,
    importResult,
  };
}
