import {
  ComDatumapisNetworkingV1AlphaHttpProxy,
  ComDatumapisNetworkingV1AlphaHttpProxyList,
  createNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  listNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  patchNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
  readNetworkingDatumapisComV1AlphaNamespacedHttpProxy,
} from '@/modules/control-plane/networking';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { HttpProxySchema } from '@/resources/schemas/http-proxy.schema';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createHttpProxiesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformHttpProxy = (
    httpProxy: ComDatumapisNetworkingV1AlphaHttpProxy
  ): IHttpProxyControlResponse => {
    const { metadata, spec, status } = httpProxy;
    return {
      name: metadata?.name ?? '',
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      endpoint: spec?.rules?.[0]?.backends?.[0]?.endpoint ?? '',
      hostnames: spec?.hostnames ?? [],
      status,
      namespace: metadata?.namespace ?? '',
    };
  };

  const formatHttpProxy = (payload: HttpProxySchema): ComDatumapisNetworkingV1AlphaHttpProxy => {
    const { name, endpoint, hostnames } = payload;
    return {
      metadata: {
        name,
      },
      spec: {
        hostnames: (hostnames ?? []) as string[],
        rules: [
          {
            backends: [
              {
                endpoint,
              },
            ],
          },
        ],
      },
    };
  };

  return {
    list: async (projectId: string) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      });

      const httpProxies = response.data as ComDatumapisNetworkingV1AlphaHttpProxyList;

      return httpProxies.items.map(transformHttpProxy);
    },
    detail: async (projectId: string, uid: string) => {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('HTTPProxy not found', 404);
      }

      const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      return transformHttpProxy(httpProxy);
    },
    create: async (projectId: string, payload: HttpProxySchema, dryRun: boolean = false) => {
      const formatted = formatHttpProxy(payload);
      const response = await createNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
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
          ...formatted,
          kind: 'HTTPProxy',
          apiVersion: 'networking.datumapis.com/v1alpha',
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to create HTTPProxy', 500);
      }

      const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      return dryRun ? httpProxy : transformHttpProxy(httpProxy);
    },
    update: async (
      projectId: string,
      uid: string,
      payload: HttpProxySchema,
      dryRun: boolean = false
    ) => {
      const response = await patchNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
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
          kind: 'HTTPProxy',
          apiVersion: 'networking.datumapis.com/v1alpha',
          spec: {
            hostnames: payload.hostnames ?? [],
            rules: [
              {
                backends: [
                  {
                    endpoint: payload.endpoint,
                  },
                ],
              },
            ],
          },
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to update HTTPProxy', 500);
      }

      const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

      return dryRun ? httpProxy : transformHttpProxy(httpProxy);
    },
    delete: async (projectId: string, uid: string) => {
      const response = await deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete HTTPProxy', 500);
      }

      return response.data;
    },
  };
};

export type HttpProxiesControl = ReturnType<typeof createHttpProxiesControl>;
