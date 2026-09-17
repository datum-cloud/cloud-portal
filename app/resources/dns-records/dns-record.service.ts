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
  DnsRecordListResult,
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
import { NotFoundError } from '@/utils/errors';
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

/**
 * RecordSets requested per page. Matches `dns-zone.service.ts`, which already
 * asks this same API for 1000 at a time.
 */
export const DNS_RECORD_PAGE_SIZE = 1000;

/**
 * Ceiling on the paging loop: 10 pages x 1000 = 10,000 RecordSets. The largest
 * zone we have seen holds roughly 2,000, so this leaves room to grow while
 * keeping a recycled or runaway `continue` token from looping forever. Callers
 * learn the listing stopped early from the `truncated` flag.
 */
export const DNS_RECORD_MAX_PAGES = 10;

/**
 * Fetch every page of RecordSets for a zone.
 *
 * The API caps a list response and hands back `metadata.continue`; following
 * that token is the only way to see a zone past the first page (#1466). Both
 * list entry points go through here so a single-page path cannot reappear.
 *
 * Returns the accumulated items plus the cursor still outstanding when the page
 * ceiling was hit — `undefined` once the zone is exhausted.
 */
async function fetchAllRecordSetPages(
  projectId: string,
  dnsZoneId?: string
): Promise<{ items: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet[]; cursor?: string }> {
  const fieldSelector = dnsZoneId ? `spec.dnsZoneRef.name=${dnsZoneId}` : undefined;
  const items: ComMiloapisNetworkingDnsV1Alpha1DnsRecordSet[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < DNS_RECORD_MAX_PAGES; page++) {
    const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsRecordSet({
      baseURL: getProjectScopedBase(projectId),
      path: { namespace: 'default' },
      query: {
        fieldSelector,
        limit: DNS_RECORD_PAGE_SIZE,
        continue: cursor,
      },
    });

    const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsRecordSetList;
    items.push(...(data?.items ?? []));

    // An empty string is the API's "no more pages", same as an absent field.
    cursor = data?.metadata?.continue || undefined;
    if (!cursor) break;
  }

  return { items, cursor };
}

export function createDnsRecordService() {
  return {
    /**
     * List every DNS RecordSet in a zone (flattened for UI display).
     *
     * The table filters, searches and paginates client-side over this array, so
     * it has to be the whole zone — see {@link fetchAllRecordSetPages}.
     */
    async list(
      projectId: string,
      dnsZoneId?: string,
      _options?: ServiceOptions
    ): Promise<DnsRecordListResult> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId, dnsZoneId);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, dnsZoneId },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(projectId: string, dnsZoneId?: string): Promise<DnsRecordListResult> {
      const { items, cursor } = await fetchAllRecordSetPages(projectId, dnsZoneId);
      const recordSets = toDnsRecordSetList(items, cursor);

      return {
        records: toFlattenedDnsRecords(recordSets.items),
        truncated: !!cursor,
      };
    },

    /**
     * List every DNS RecordSet in a zone (raw, not flattened).
     *
     * `hasMore`/`nextCursor` describe the state after the paging loop: they are
     * only set when the page ceiling stopped us with records left behind.
     */
    async listRaw(
      projectId: string,
      dnsZoneId?: string,
      _options?: ServiceOptions
    ): Promise<DnsRecordSetList> {
      const startTime = Date.now();

      try {
        const { items, cursor } = await fetchAllRecordSetPages(projectId, dnsZoneId);
        const result = toDnsRecordSetList(items, cursor);

        logger.service(SERVICE_NAME, 'listRaw', {
          input: { projectId, dnsZoneId },
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
        throw new NotFoundError('DNS Record Set', recordSetId);
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
     * List RecordSets for a zone and record type.
     * Callers must match on owner name — a zone can have multiple RecordSets
     * of the same type (e.g. apex TXT vs subdomain TXT).
     */
    async listByTypeAndZone(
      projectId: string,
      dnsZoneId: string,
      recordType: string
    ): Promise<DnsRecordSet[]> {
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

        logger.service(SERVICE_NAME, 'listByTypeAndZone', {
          input: { projectId, dnsZoneId, recordType },
          duration: Date.now() - startTime,
        });

        return items;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listByTypeAndZone failed`, error as Error);
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
