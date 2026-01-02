import { createDnsRecordManager, type ImportResult } from './dns-record.manager';
import type { DnsRecordSet, FlattenedDnsRecord, CreateDnsRecordSchema } from './dns-record.schema';
import { createDnsRecordService, dnsRecordKeys } from './dns-record.service';
import { useServiceContext } from '@/providers/service.provider';
import { IDnsZoneDiscoveryRecordSet } from '@/resources/dns-zone-discoveries';
import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

export function useDnsRecords(
  projectId: string,
  dnsZoneId?: string,
  limit?: number,
  options?: Omit<UseQueryOptions<FlattenedDnsRecord[]>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsRecordService(ctx);

  return useQuery({
    queryKey: dnsRecordKeys.list(projectId, dnsZoneId, { limit: limit ?? 20 }),
    queryFn: () => service.list(projectId, dnsZoneId, limit),
    enabled: !!projectId,
    ...options,
  });
}

export function useDnsRecord(
  projectId: string,
  recordSetId: string,
  options?: Omit<UseQueryOptions<DnsRecordSet>, 'queryKey' | 'queryFn'>
) {
  const ctx = useServiceContext();
  const service = createDnsRecordService(ctx);

  return useQuery({
    queryKey: dnsRecordKeys.detail(projectId, recordSetId),
    queryFn: () => service.get(projectId, recordSetId),
    enabled: !!projectId && !!recordSetId,
    ...options,
  });
}

export function useCreateDnsRecord(
  projectId: string,
  dnsZoneId: string,
  options?: UseMutationOptions<DnsRecordSet, Error, CreateDnsRecordSchema>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const manager = createDnsRecordManager(ctx);

  return useMutation({
    mutationFn: (formData: CreateDnsRecordSchema) =>
      manager.addRecord(projectId, dnsZoneId, formData).then((result) => result.recordSet),
    onSuccess: (recordSet) => {
      // Force refetch to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({ queryKey: dnsRecordKeys.lists() });
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);
    },
    ...options,
  });
}

type UpdateDnsRecordContext = { previous: DnsRecordSet | undefined };

// Input type for the update mutation that includes form data + record identification fields
export type UpdateDnsRecordInput = CreateDnsRecordSchema & {
  recordName?: string;
  oldValue?: string;
  oldTTL?: number | null;
};

export function useUpdateDnsRecord(
  projectId: string,
  recordSetId: string,
  options?: UseMutationOptions<DnsRecordSet, Error, UpdateDnsRecordInput, UpdateDnsRecordContext>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const manager = createDnsRecordManager(ctx);

  return useMutation<DnsRecordSet, Error, UpdateDnsRecordInput, UpdateDnsRecordContext>({
    mutationFn: async (input: UpdateDnsRecordInput) => {
      const { recordName, oldValue, oldTTL, ...formData } = input;

      return manager.updateRecord(
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
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: dnsRecordKeys.detail(projectId, recordSetId),
      });

      const previous = queryClient.getQueryData<DnsRecordSet>(
        dnsRecordKeys.detail(projectId, recordSetId)
      );

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSetId), context.previous);
      }
    },
    onSettled: () => {
      // Force refetch to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: dnsRecordKeys.detail(projectId, recordSetId),
      });
      queryClient.refetchQueries({
        queryKey: dnsRecordKeys.lists(),
      });
    },
    ...options,
  });
}

// Input type for delete mutation - needs record identification
export type DeleteDnsRecordInput = {
  recordSetName: string;
  recordType: string;
  name: string; // subdomain/record name
  value: string;
  ttl?: number | null;
};

export function useDeleteDnsRecord(
  projectId: string,
  dnsZoneId?: string,
  options?: UseMutationOptions<void, Error, DeleteDnsRecordInput>
) {
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const manager = createDnsRecordManager(ctx);

  const customCallbacks = {
    onSuccess: options?.onSuccess,
    onError: options?.onError,
    onSettled: options?.onSettled,
  };

  return useMutation({
    mutationFn: (input: DeleteDnsRecordInput) =>
      manager.removeRecord(projectId, input).then(() => undefined),
    onMutate: async (input) => {
      const queryKey = dnsRecordKeys.list(projectId, dnsZoneId, { limit: 20 });

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot previous value
      const previousData = queryClient.getQueryData<FlattenedDnsRecord[]>(queryKey);

      // Optimistically remove the record from cache
      queryClient.setQueryData<FlattenedDnsRecord[]>(
        queryKey,
        (old) =>
          old?.filter(
            (record) =>
              !(
                record.recordSetName === input.recordSetName &&
                record.name === input.name &&
                record.value === input.value
              )
          ) ?? []
      );

      return { previousData, queryKey };
    },
    onError: (error, input, context: any) => {
      // Rollback on error
      if (context?.previousData && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }

      // Call custom onError if provided
      (customCallbacks.onError as any)?.(error, input, undefined, {});
    },
    onSuccess: (data, input) => {
      // Remove the detail query from cache
      queryClient.removeQueries({
        queryKey: dnsRecordKeys.detail(projectId, input.recordSetName),
      });

      // Call custom onSuccess if provided
      (customCallbacks.onSuccess as any)?.(data, input, undefined, {});
    },
    onSettled: (data, error, input) => {
      // Refetch to ensure we're in sync with server (watch will also update)
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.lists() });

      // Call custom onSettled if provided
      (customCallbacks.onSettled as any)?.(data, error, input, undefined, {});
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
  const ctx = useServiceContext();
  const queryClient = useQueryClient();
  const manager = createDnsRecordManager(ctx);

  return useMutation({
    mutationFn: ({ discoveryRecordSets, importOptions }: BulkImportInput) =>
      manager.bulkImport(projectId, dnsZoneId, discoveryRecordSets, importOptions),
    onSuccess: () => {
      // Force refetch to show updates immediately (watch will keep it in sync after)
      queryClient.refetchQueries({
        queryKey: dnsRecordKeys.lists(),
        type: 'active',
      });
    },
    onSettled: () => {
      // Invalidate to mark stale for background refetch
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.lists() });
    },
    ...options,
  });
}

/**
 * Hydrates React Query cache with SSR data for DNS records list.
 */
export function useHydrateDnsRecords(
  projectId: string,
  zoneId: string,
  initialData: FlattenedDnsRecord[]
) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsRecordKeys.list(projectId, zoneId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, zoneId, initialData]);
}

/**
 * Hydrates React Query cache with SSR data for single DNS record.
 */
export function useHydrateDnsRecord(
  projectId: string,
  recordSetId: string,
  initialData: DnsRecordSet
) {
  const queryClient = useQueryClient();
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current && initialData) {
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSetId), initialData);
      hydrated.current = true;
    }
  }, [queryClient, projectId, recordSetId, initialData]);
}
