import {
  toDnsZone,
  toDnsZoneList,
  toCreateDnsZonePayload,
  toUpdateDnsZonePayload,
} from './dns-zone.adapter';
import {
  createDnsZoneSchema,
  type DnsZone,
  type DnsZoneList,
  type CreateDnsZoneInput,
  type UpdateDnsZoneInput,
} from './dns-zone.schema';
import {
  listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone,
  type ComMiloapisNetworkingDnsV1Alpha1DnsZoneList,
} from '@/modules/control-plane/dns-networking';
import { logger } from '@/modules/logger';
import type { PaginationParams } from '@/resources/base/base.schema';
import type { ServiceOptions } from '@/resources/base/types';
import { getProjectScopedBase } from '@/resources/base/utils';
import { parseOrThrow } from '@/utils/errors/error-formatter';
import { mapApiError } from '@/utils/errors/error-mapper';

export const dnsZoneKeys = {
  all: ['dns-zones'] as const,
  lists: () => [...dnsZoneKeys.all, 'list'] as const,
  list: (projectId: string, params?: PaginationParams) =>
    [...dnsZoneKeys.lists(), projectId, params] as const,
  details: () => [...dnsZoneKeys.all, 'detail'] as const,
  detail: (projectId: string, name: string) => [...dnsZoneKeys.details(), projectId, name] as const,
  byDomainRef: (projectId: string, domainRef: string) =>
    [...dnsZoneKeys.all, 'by-domain-ref', projectId, domainRef] as const,
};

const SERVICE_NAME = 'DnsZoneService';

export function createDnsZoneService() {
  return {
    async list(
      projectId: string,
      params?: PaginationParams,
      _options?: ServiceOptions
    ): Promise<DnsZoneList> {
      const startTime = Date.now();

      try {
        const result = await this.fetchList(projectId, params);

        logger.service(SERVICE_NAME, 'list', {
          input: { projectId, params },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.list failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchList(projectId: string, params?: PaginationParams): Promise<DnsZoneList> {
      const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default' },
        query: {
          limit: params?.limit ?? 1000,
          continue: params?.cursor,
        },
      });

      const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneList;
      return toDnsZoneList(data?.items ?? [], data?.metadata?.continue);
    },

    async get(projectId: string, name: string, _options?: ServiceOptions): Promise<DnsZone> {
      const startTime = Date.now();

      try {
        const result = await this.fetchOne(projectId, name);

        logger.service(SERVICE_NAME, 'get', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.get failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async fetchOne(projectId: string, name: string): Promise<DnsZone> {
      const response = await readDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
        baseURL: getProjectScopedBase(projectId),
        path: { namespace: 'default', name },
      });

      if (!response.data) {
        throw new Error(`DNS Zone ${name} not found`);
      }

      return toDnsZone(response.data);
    },

    async create(
      projectId: string,
      input: CreateDnsZoneInput,
      options?: ServiceOptions
    ): Promise<DnsZone> {
      const startTime = Date.now();

      try {
        const validated = parseOrThrow(createDnsZoneSchema, input, {
          message: 'Invalid DNS zone data',
        });

        const payload = toCreateDnsZonePayload(validated);

        const response = await createDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          body: payload,
          query: options?.dryRun ? { dryRun: 'All' } : undefined,
        });

        if (!response.data) {
          throw new Error('Failed to create DNS zone');
        }

        const dnsZone = toDnsZone(response.data);

        logger.service(SERVICE_NAME, 'create', {
          input: { projectId, domainName: input.domainName },
          duration: Date.now() - startTime,
        });

        return dnsZone;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.create failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async update(
      projectId: string,
      name: string,
      input: UpdateDnsZoneInput,
      options?: ServiceOptions
    ): Promise<DnsZone> {
      const startTime = Date.now();

      try {
        const payload = toUpdateDnsZonePayload(input);

        const response = await patchDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
          body: payload,
          query: {
            ...(options?.dryRun ? { dryRun: 'All' } : {}),
            fieldManager: 'datum-cloud-portal',
          },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        });

        if (!response.data) {
          throw new Error('Failed to update DNS zone');
        }

        const dnsZone = toDnsZone(response.data);

        logger.service(SERVICE_NAME, 'update', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });

        return dnsZone;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.update failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async delete(projectId: string, name: string): Promise<void> {
      const startTime = Date.now();

      try {
        await deleteDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default', name },
        });

        logger.service(SERVICE_NAME, 'delete', {
          input: { projectId, name },
          duration: Date.now() - startTime,
        });
      } catch (error) {
        logger.error(`${SERVICE_NAME}.delete failed`, error as Error);
        throw mapApiError(error);
      }
    },

    async listByDomainRef(
      projectId: string,
      domainRef: string,
      limit: number = 1
    ): Promise<DnsZoneList> {
      const startTime = Date.now();

      try {
        const response = await listDnsNetworkingMiloapisComV1Alpha1NamespacedDnsZone({
          baseURL: getProjectScopedBase(projectId),
          path: { namespace: 'default' },
          query: {
            fieldSelector: `status.domainRef.name=${domainRef}`,
            limit,
          },
        });

        const data = response.data as ComMiloapisNetworkingDnsV1Alpha1DnsZoneList;
        const result = toDnsZoneList(data?.items ?? [], data?.metadata?.continue);

        logger.service(SERVICE_NAME, 'listByDomainRef', {
          input: { projectId, domainRef, limit },
          duration: Date.now() - startTime,
        });

        return result;
      } catch (error) {
        logger.error(`${SERVICE_NAME}.listByDomainRef failed`, error as Error);
        throw mapApiError(error);
      }
    },
  };
}

export type DnsZoneService = ReturnType<typeof createDnsZoneService>;
