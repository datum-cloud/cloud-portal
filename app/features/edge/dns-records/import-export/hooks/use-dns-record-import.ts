import { IFlattenedDnsRecord, useBulkImportDnsRecords } from '@/resources/dns-records';
import { readFileAsText } from '@/utils/common';
import {
  deduplicateParsedRecords,
  ImportResult,
  parseBindZoneFile,
  SUPPORTED_DNS_RECORD_TYPES,
  transformApexCnameToAlias,
  transformFlattenedToRecordSets,
  transformParsedToFlattened,
} from '@/utils/helpers/dns';
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

/**
 * Information about apex SOA/NS records that are skipped during import.
 * These records are managed automatically by Datum and should not be imported.
 *
 * TODO: Allow advanced users to override this behavior in the future.
 * @see https://github.com/datum-cloud/cloud-portal/issues/901
 */
export interface SkippedApexRecordsInfo {
  /** SOA records found at zone apex */
  soa: IFlattenedDnsRecord[];
  /** NS records found at zone apex */
  ns: IFlattenedDnsRecord[];
  /** Total count of skipped records */
  totalCount: number;
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
  const [unsupportedRecords, setUnsupportedRecords] = useState<UnsupportedRecordsInfo | null>(null);
  const [duplicateRecords, setDuplicateRecords] = useState<DuplicateRecordsInfo | null>(null);
  const [skippedApexRecords, setSkippedApexRecords] = useState<SkippedApexRecordsInfo | null>(null);

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
    setUnsupportedRecords(null);
    setDuplicateRecords(null);
    setSkippedApexRecords(null);
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

      // =======================================================================
      // Filter out apex SOA and NS records - these are managed by Datum
      // TODO: Allow advanced users to override this behavior in the future.
      // @see https://github.com/datum-cloud/cloud-portal/issues/901
      // =======================================================================
      // Apex can be represented as:
      // - '@' (standard BIND notation)
      // - '' (empty string)
      // - The origin domain name itself (e.g., 'example.com' when $ORIGIN example.com.)
      const originWithoutDot = result.origin?.replace(/\.$/, '') || null;
      const isApexRecord = (name: string) => {
        if (name === '@' || name === '') return true;
        if (originWithoutDot && name === originWithoutDot) return true;
        return false;
      };

      // Identify skipped records BEFORE transformation for accurate reporting
      const skippedParsedSoa = transformedRecords.filter(
        (r) => r.type === 'SOA' && isApexRecord(r.name)
      );
      const skippedParsedNs = transformedRecords.filter(
        (r) => r.type === 'NS' && isApexRecord(r.name)
      );

      // Filter out apex SOA/NS from records to import
      const importableRecords = transformedRecords.filter((r) => {
        if (r.type === 'SOA' && isApexRecord(r.name)) return false;
        if (r.type === 'NS' && isApexRecord(r.name)) return false;
        return true;
      });

      // Update transformedIndices to account for filtered records
      // (indices of transformed CNAME→ALIAS records that are still in importableRecords)
      const importableIndices = new Set<number>();
      let newIndex = 0;
      for (let i = 0; i < transformedRecords.length; i++) {
        const r = transformedRecords[i];
        const isSkipped =
          (r.type === 'SOA' && isApexRecord(r.name)) || (r.type === 'NS' && isApexRecord(r.name));
        if (!isSkipped) {
          if (transformedIndices.has(i)) {
            importableIndices.add(newIndex);
          }
          newIndex++;
        }
      }

      // Transform records for UI display only
      // (recordSets will be built from selected records at import time)
      const flattened = transformParsedToFlattened(importableRecords, dnsZoneId, importableIndices);

      // Convert skipped parsed records to flattened format for display in alert
      const skippedSoaFlattened = transformParsedToFlattened(
        skippedParsedSoa,
        dnsZoneId,
        new Set()
      );
      const skippedNsFlattened = transformParsedToFlattened(skippedParsedNs, dnsZoneId, new Set());

      if (skippedParsedSoa.length > 0 || skippedParsedNs.length > 0) {
        setSkippedApexRecords({
          soa: skippedSoaFlattened,
          ns: skippedNsFlattened,
          totalCount: skippedParsedSoa.length + skippedParsedNs.length,
        });
      } else {
        setSkippedApexRecords(null);
      }

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

  const handleImport = (selectedRecords: IFlattenedDnsRecord[]) => {
    if (selectedRecords.length === 0) return;

    // Transform selected flat records to grouped recordSets format for API
    const selectedRecordSets = transformFlattenedToRecordSets(selectedRecords);

    importMutation.mutate({
      discoveryRecordSets: selectedRecordSets,
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
    skippedApexRecords,

    // Import
    isImporting: importMutation.isPending,
    handleImport,
    importResult,
  };
}
