import { createDnsRecordManager, type ImportResult } from './dns-record.manager';
import type { DnsRecordSet, FlattenedDnsRecord, CreateDnsRecordSchema } from './dns-record.schema';
import { createDnsRecordService, dnsRecordKeys } from './dns-record.service';
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
  return useQuery({
    // No limit in query key - fetch all records for client-side pagination
    queryKey: dnsRecordKeys.list(projectId, dnsZoneId),
    queryFn: () => createDnsRecordService().list(projectId, dnsZoneId, limit),
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

  return useMutation({
    mutationFn: (formData: CreateDnsRecordSchema) =>
      createDnsRecordManager()
        .addRecord(projectId, dnsZoneId, formData)
        .then((result) => result.recordSet),
    ...options,
    onSuccess: (...args) => {
      const [recordSet] = args;
      // Set detail cache immediately
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);

      options?.onSuccess?.(...args);
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

  return useMutation({
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
      // Update detail cache with server response
      queryClient.setQueryData(dnsRecordKeys.detail(projectId, recordSet.name), recordSet);

      options?.onSuccess?.(...args);
    },
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
    },
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
  dnsZoneId: string,
  options?: UseMutationOptions<void, Error, DeleteDnsRecordInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DeleteDnsRecordInput) =>
      createDnsRecordManager()
        .removeRecord(projectId, input)
        .then(() => undefined),
    ...options,
    onSuccess: async (...args) => {
      const [, input] = args;
      // Cancel in-flight queries for the deleted record
      await queryClient.cancelQueries({
        queryKey: dnsRecordKeys.detail(projectId, input.recordSetName),
      });

      options?.onSuccess?.(...args);
    },
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
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

  return useMutation({
    mutationFn: ({ discoveryRecordSets, importOptions }: BulkImportInput) =>
      createDnsRecordManager().bulkImport(projectId, dnsZoneId, discoveryRecordSets, importOptions),
    ...options,
    onSettled: () => {
      // Fallback: invalidate list cache in case watch doesn't trigger
      queryClient.invalidateQueries({ queryKey: dnsRecordKeys.list(projectId, dnsZoneId) });
    },
  });
}

/**
 * Hydrates React Query cache with SSR data for DNS records list.
 * Uses the same query key as useDnsRecords and useDnsRecordsWatch.
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
      // Use the same query key format as useDnsRecords and useDnsRecordsWatch
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
