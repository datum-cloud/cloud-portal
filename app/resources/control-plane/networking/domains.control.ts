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
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
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
      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedDomain({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const domains = response.data as ComDatumapisNetworkingV1AlphaDomainList;

        return domains.items.map(transformDomain);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, uid: string) => {
      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedDomain({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: uid },
        });

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        return transformDomain(domain);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, name: string) => {
      try {
        const response = await deleteNetworkingDatumapisComV1AlphaNamespacedDomain({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: DomainSchema, dryRun: boolean = false) => {
      try {
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

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        return dryRun ? domain : transformDomain(domain);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      name: string,
      payload: DomainSchema,
      dryRun: boolean = false
    ) => {
      try {
        const response = await patchNetworkingDatumapisComV1AlphaNamespacedDomain({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name },
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

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        return dryRun ? domain : transformDomain(domain);
      } catch (e) {
        throw e;
      }
    },
    getStatus: async (projectId: string, name: string) => {
      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedDomainStatus({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name },
        });

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        return transformControlPlaneStatus(domain.status);
      } catch (e) {
        throw e;
      }
    },
    refreshRegistration: async (projectId: string, name: string, dryRun: boolean = false) => {
      try {
        const response = await patchNetworkingDatumapisComV1AlphaNamespacedDomain({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name },
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
              desiredRegistrationRefreshAttempt: new Date().toISOString(), // Set the desired time of the next registration refresh attempt to the current time
            },
          },
        });

        const domain = response.data as ComDatumapisNetworkingV1AlphaDomain;

        return dryRun ? domain : transformDomain(domain);
      } catch (e) {
        throw e;
      }
    },
  };
};

export type DomainsControl = ReturnType<typeof createDomainsControl>;
