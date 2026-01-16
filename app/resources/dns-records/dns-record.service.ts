import {
  toDnsRecordSet,
  toDnsRecordSetList,
  toFlattenedDnsRecords,
  toCreateDnsRecordSetPayload,
  toUpdateDnsRecordSetPayload,
} from './dns-record.adapter';
import type {
  DnsRecordSet,
  DnsRecordSetList,
  FlattenedDnsRecord,
  CreateDnsRecordSetInput,
  UpdateDnsRecordSetInput,
} from './dns-record.schema';
import {
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus,
  type ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList,
  type ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet,
} from '@/modules/control-plane/dns-networking';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { mapApiError } from '@/utils/errors/error-mapper';

export const dnsRecordKeys = {
  all: ['dns-records'] as const,
  lists: () => [...dnsRecordKeys.all, 'list'] as const,
  list: (projectId: string, dnsZoneId?: string, params?: PaginationParams) =>
    [...dnsRecordKeys.lists(), projectId, dnsZoneId, params] as const,
  details: () => [...dnsRecordKeys.all, 'detail'] as const,
  detail: (projectId: string, recordSetId: string) =>
    [...dnsRecordKeys.details(), projectId, recordSetId] as const,
  byTypeAndZone: (projectId: string, dnsZoneId: string, recordType: string) =>
    [...dnsRecordKeys.all, 'by-type-zone', projectId, dnsZoneId, recordType] as const,
};

const SERVICE_NAME = 'DnsRecordService';

export function createDnsRecordService() {
  return {
    /**
     * List DNS RecordSets (flattened for UI display)
     */
    async list(
      projectId: string,
      dnsZoneId?: string,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<FlattenedDnsRecord[]> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId, dnsZoneId, limit);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, dnsZoneId, limit },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(
      projectId: string,
      dnsZoneId?: string,
      limit?: number
    ): Promise<FlattenedDnsRecord[]> {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default' },
        query: {
          fieldSelector: dnsZoneId ? `spec.dnsZoneRef.name=${dnsZoneId}` : undefined,
          limit: limit ?? 100,
        },
      });

      const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
      const recordSets = toDnsRecordSetList(data?.items ?? [], data?.metadata?.continue);
      return toFlattenedDnsRecords(recordSets.items);
    },

    /**
     * List DNS RecordSets (raw, not flattened)
     */
    async listRaw(
      projectId: string,
      dnsZoneId?: string,
      limit?: number,
      _options?: ServiceOptions
    ): Promise<DnsRecordSetList> {
      const startTime = Date.now();

      try {
        const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          query: {
            fieldSelector: dnsZoneId ? `spec.dnsZoneRef.name=${dnsZoneId}` : undefined,
            limit: limit ?? 100,
          },
        });

        const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
        const result = toDnsRecordSetList(data?.items ?? [], data?.metadata?.continue);

        logger.service(SERVICE_NAME, 'listRaw', {
          input: { projectId, dnsZoneId, limit },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listRaw failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Get a single DNS RecordSet by ID
     */
    async get(
      projectId: string,
      recordSetId: string,
      _options?: ServiceOptions
    ): Promise<DnsRecordSet> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(projectId, recordSetId);

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, recordSetId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(projectId: string, recordSetId: string): Promise<DnsRecordSet> {
      const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name: recordSetId },
      });

      if (!response.data) {
        throw new Error(`DNS RecordSet ${recordSetId} not found`);
      }

      return toDnsRecordSet(response.data);
    },

    /**
     * Create a new DNS RecordSet
     */
    async create(
      projectId: string,
      input: CreateDnsRecordSetInput,
      options?: ServiceOptions
    ): Promise<DnsRecordSet> {
      const startTime = Date.now();
      const dnsZoneId = input.dnsZoneRef.name;

      try {
        const payload = toCreateDnsRecordSetPayload(input, dnsZoneId);

        const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.data) {
          throw new Error('Failed to create DNS RecordSet');
        }

        const recordSet = toDnsRecordSet(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, dnsZoneId, recordType: input.recordType },
          duration: Date.now() - startTime,
        });

        return recordSet;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Update an existing DNS RecordSet
     */
    async update(
      projectId: string,
      recordSetId: string,
      input: UpdateDnsRecordSetInput,
      options?: ServiceOptions
    ): Promise<DnsRecordSet> {
      const startTime = Date.now();

      try {
        const payload = toUpdateDnsRecordSetPayload(input.records);

        const response = await patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name: recordSetId },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to update DNS RecordSet');
        }

        const recordSet = toDnsRecordSet(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, recordSetId },
          duration: Date.now() - startTime,
        });

        return recordSet;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Delete a DNS RecordSet
     */
    async delete(projectId: string, recordSetId: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name: recordSetId },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { projectId, recordSetId },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Find RecordSet by zone and type
     */
    async findByTypeAndZone(
      projectId: string,
      dnsZoneId: string,
      recordType: string
    ): Promise<DnsRecordSet | undefined> {
      const startTime = Date.now();

      try {
        const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          query: {
            fieldSelector: `spec.dnsZoneRef.name=${dnsZoneId},spec.recordType=${recordType}`,
          },
        });

        const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
        const items = (data?.items ?? []).map(toDnsRecordSet);

        logger.service(SERVICE_NAME, 'findByTypeAndZone', {
          input: { projectId, dnsZoneId, recordType },
          duration: Date.now() - startTime,
        });

        return items.length > 0 ? items[0] : undefined;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.findByTypeAndZone failed`, error as Error);
        throw mapApiError(error);
      }
    },

    /**
     * Get status of a DNS RecordSet
     */
    async getStatus(
      projectId: string,
      recordSetId: string
    ): Promise<ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet['status']> {
      const startTime = Date.now();

      try {
        const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSetStatus({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name: recordSetId },
        });

        const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet;

        logger.service(SERVICE_NAME, 'getStatus', {
          input: { projectId, recordSetId },
          duration: Date.now() - startTime,
        });

        return data.status;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.getStatus failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type DnsRecordService = ReturnType<typeof createDnsRecordService>;
