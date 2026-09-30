import {
  matchesDeleteCriterion,
  mergeRecordSetIntoListCache,
  updateDnsRecordListCache,
} from './dns-record.adapter';
import { createDnsRecordManager, type ImportResult } from './dns-record.manager';
import type {
  DeleteDnsRecordCriterion,
  DnsRecordSet,
  DnsRecordListResult,
  CreateDnsRecordSchema,
} from './dns-record.schema';
import { createDnsRecordService, dnsRecordKeys } from './dns-record.service';
import { useGuardedMutation } from '@/features/project/read-only/use-guarded-mutation';
import { invalidateAllowanceBuckets } from '@/resources/allowance-buckets';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';
import {
  useQuery,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';

export function useDnsRecords(
  projectId: string,
  dnsZoneId?: string,
  options?: Omit<UseQueryOptions<DnsRecordListResult>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    // No limit in query key - the service fetches every page for client-side pagination
    queryKey: dnsRecordKeys.list(projectId, dnsZoneId),
    queryFn: () => createDnsRecordService().list(projectId, dnsZoneId),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsRecord(
  projectId: string,
  recordSetId: string,
  options?: Omit<UseQueryOptions<DnsRecordSet>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: dnsRecordKeys.detail(projectId, recordSetId),
    queryFn: () => createDnsRecordService().get(projectId, recordSetId),
    enabled: !!projectId && !!recordSetId,
    ...options,
  });
}

export function useCreateDnsRecord(
  projectId: string,
  dnsZoneId: string,
  options?: UseMutationOptions<DnsRecordSet, Error, CreateDnsRecordSchema>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: (formData: CreateDnsRecordSchema) =>
      createDnsRecordManager()
        .addRecord(projectId, dnsZoneId, formData)
        .then((result) => result.recordSet),
    ...options,
    onSuccess: (...args) => {
      const [recordSet] = args;
      // Set detail + list cache immediately so the table updates without waiting on watch
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);
      queryClient.setQueryData<DnsRecordListResult>(
        dnsRecordKeys.list(projectId, dnsZoneId),
        (old) =>
          updateDnsRecordListCache(old, (records) =>
            mergeRecordSetIntoListCache(records, recordSet)
          )
      );

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      // This ensures UI updates even if watch connection is stale/dead
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
    },
  });
}

// Input type for the update mutation that includes form data + record identification fields
export type UpdateDnsRecordInput = CreateDnsRecordSchema & {
  recordName?: string;
  oldValue?: string;
  oldTTL?: number | null;
};

export function useUpdateDnsRecord(
  projectId: string,
  dnsZoneId: string,
  recordSetId: string,
  options?: UseMutationOptions<DnsRecordSet, Error, UpdateDnsRecordInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: async (input: UpdateDnsRecordInput) => {
      const { recordName, oldValue, oldTTL, ...formData } = input;

      return createDnsRecordManager().updateRecord(
        projectId,
        recordSetId,
        {
          recordType: formData.recordType,
          name: recordName ?? '',
          oldValue,
          oldTTL: oldTTL === null ? null : oldTTL,
        },
        formData as CreateDnsRecordSchema
      );
    },
    ...options,
    onSuccess: (...args) => {
      const [recordSet] = args;
      // Update detail + list cache with server response (full RecordSet)
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);
      queryClient.setQueryData<DnsRecordListResult>(
        dnsRecordKeys.list(projectId, dnsZoneId),
        (old) =>
          updateDnsRecordListCache(old, (records) =>
            mergeRecordSetIntoListCache(records, recordSet)
          )
      );

      options?.onSuccess?.(...args);
    },
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
    },
  });
}

// Input type for delete mutation - needs record identification
export type DeleteDnsRecordInput = DeleteDnsRecordCriterion & {
  recordSetName: string;
};

export type BulkDeleteDnsRecordsInput = {
  recordSetName: string;
  criteria: DeleteDnsRecordCriterion[];
};

/**
 * Remove several records from one RecordSet in a single write.
 *
 * Bulk delete calls this once per RecordSet. Per-record deletes against the
 * same set would race on the set's record list; see
 * `DnsRecordManager.removeRecords`. Cache handling mirrors `useDeleteDnsRecord`:
 * the matching flattened rows are dropped immediately rather than waiting on
 * a refetch.
 */
export function useBulkDeleteDnsRecords(
  projectId: string,
  dnsZoneId: string,
  options?: UseMutationOptions<void, Error, BulkDeleteDnsRecordsInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (input: BulkDeleteDnsRecordsInput) =>
      createDnsRecordManager()
        .removeRecords(projectId, input.recordSetName, input.criteria)
        .then(() => undefined),
    ...options,
    onMutate: async (...args) => {
      await queryClient.cancelQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
      return options?.onMutate?.(...args);
    },
    onSuccess: async (...args) => {
      const [, input] = args;
      const listKey = dnsRecordKeys.list(projectId, dnsZoneId);
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({
        queryKey: dnsRecordKeys.detail(projectId, input.recordSetName),
      });

      queryClient.setQueryData<DnsRecordListResult>(listKey, (old) => {
        if (!old) return old;
        return updateDnsRecordListCache(old, (records) =>
          records.filter(
            (record) =>
              record.recordSetName !== input.recordSetName ||
              !input.criteria.some((criterion) => matchesDeleteCriterion(record, criterion))
          )
        );
      });

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
  });
}

export function useDeleteDnsRecord(
  projectId: string,
  dnsZoneId: string,
  options?: UseMutationOptions<void, Error, DeleteDnsRecordInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'delete',
    mutationFn: (input: DeleteDnsRecordInput) =>
      createDnsRecordManager()
        .removeRecord(projectId, input)
        .then(() => undefined),
    ...options,
    onMutate: async (...args) => {
      await queryClient.cancelQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
      return options?.onMutate?.(...args);
    },
    onSuccess: async (...args) => {
      const [, input] = args;
      const listKey = dnsRecordKeys.list(projectId, dnsZoneId);
      await queryClient.cancelQueries({ queryKey: listKey });
      await queryClient.cancelQueries({
        queryKey: dnsRecordKeys.detail(projectId, input.recordSetName),
      });

      // Optimistically drop the flattened row so the table updates immediately.
      // removeRecord may PATCH or DELETE the RecordSet; either way the matching
      // flattened row should disappear now rather than waiting on watch/refetch.
      queryClient.setQueryData<DnsRecordListResult>(listKey, (old) => {
        if (!old) return old;
        return updateDnsRecordListCache(old, (records) =>
          records.filter(
            (record) =>
              record.recordSetName !== input.recordSetName || !matchesDeleteCriterion(record, input)
          )
        );
      });

      options?.onSuccess?.(...args);
      void invalidateAllowanceBuckets(queryClient);
    },
  });
}

/**
 * Bulk import options for DNS record import
 */
export interface BulkImportOptions {
  skipDuplicates?: boolean;
  mergeStrategy?: 'append' | 'replace';
}

/**
 * Individual record import detail
 */
export interface ImportRecordDetail {
  recordType: string;
  name: string;
  value: string;
  ttl?: number;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  message?: string;
}

/**
 * Bulk import input
 */
export interface BulkImportInput {
  discoveryRecordSets: IDnsZoneDiscoveryRecordSet[];
  importOptions?: BulkImportOptions;
}

/**
 * Hook for bulk importing DNS records from discovery or file import
 * Handles grouping by type, duplicate detection, and merge strategies
 */
export function useBulkImportDnsRecords(
  projectId: string,
  dnsZoneId: string,
  options?: UseMutationOptions<ImportResult, Error, BulkImportInput>
) {
  const queryClient = useQueryClient();

  return useGuardedMutation({
    operation: 'write',
    mutationFn: ({ discoveryRecordSets, importOptions }: BulkImportInput) =>
      createDnsRecordManager().bulkImport(projectId, dnsZoneId, discoveryRecordSets, importOptions),
    ...options,
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
    },
  });
}
