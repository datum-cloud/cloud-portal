import { transformControlPlaneStatus } from '@/features/control-plane/utils';
import {
  ComDatumapisNetworkingV1AlphaDomain,
  ComDatumapisNetworkingV1AlphaDomainList,
  createNetworkingDatumapisComV1AlphaNamespacedDomain,
  deleteNetworkingDatumapisComV1AlphaNamespacedDomain,
  listNetworkingDatumapisComV1AlphaNamespacedDomain,
  patchNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedDomain,
  readNetworkingDatumapisComV1AlphaNamespacedDomainStatus,
} from '@/modules/control-plane/networking';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { DomainSchema } from '@/resources/schemas/domain.schema';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createDomainsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformDomain = (domain: ComDatumapisNetworkingV1AlphaDomain): IDomainControlResponse => {
    const { metadata, spec, status } = domain;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      domainName: spec?.domainName ?? '',
      status: status as any,
      namespace: metadata?.namespace ?? '',
    };
  };

  return {
    list: async (projectId: string) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedDomain({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      });

      const domains = response.data as ComDatumapisNetworkingV1AlphaDomainList;

      return domains.items.map(transformDomain);
    },
    detail: async (projectId: string, uid: string) => {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedDomain({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('Domain not found', 404);
      }

      const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

      return transformDomain(domain);
    },
    delete: async (projectId: string, uid: string) => {
      const response = await deleteNetworkingDatumapisComV1AlphaNamespacedDomain({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete domain', 500);
      }

      return response.data;
    },
    create: async (projectId: string, payload: DomainSchema, dryRun: boolean = false) => {
      const response = await createNetworkingDatumapisComV1AlphaNamespacedDomain({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          kind: 'Domain',
          apiVersion: 'networking.datumapis.com/v1alpha',
          metadata: {
            name: payload.name,
          },
          spec: {
            domainName: payload.domain,
          },
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to create Domain', 500);
      }

      const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

      return dryRun ? domain : transformDomain(domain);
    },
    update: async (
      projectId: string,
      uid: string,
      payload: DomainSchema,
      dryRun: boolean = false
    ) => {
      const response = await patchNetworkingDatumapisComV1AlphaNamespacedDomain({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
        query: {
          dryRun: dryRun ? 'All' : undefined,
          fieldManager: 'datum-cloud-portal',
        },
        headers: {
          'Content-Type': 'application/merge-patch+json',
        },
        body: {
          kind: 'Domain',
          apiVersion: 'networking.datumapis.com/v1alpha',
          spec: {
            domainName: payload.domain,
          },
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to update Domain', 500);
      }

      const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

      return dryRun ? domain : transformDomain(domain);
    },
    getStatus: async (projectId: string, uid: string) => {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedDomainStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError(`Domain ${uid} not found`, 404);
      }

      const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

      return transformControlPlaneStatus(domain.status);
    },
  };
};

export type DomainsControl = ReturnType<typeof createDomainsControl>;
