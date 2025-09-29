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
      try {
        const response = await listNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const httpProxies = response.data as ComDatumapisNetworkingV1AlphaHttpProxyList;

        return httpProxies.items.map(transformHttpProxy);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, uid: string) => {
      try {
        const response = await readNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: uid },
        });

        const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

        return transformHttpProxy(httpProxy);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: HttpProxySchema, dryRun: boolean = false) => {
      try {
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

        const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

        return dryRun ? httpProxy : transformHttpProxy(httpProxy);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      uid: string,
      payload: HttpProxySchema,
      dryRun: boolean = false
    ) => {
      try {
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

        const httpProxy = response.data as ComDatumapisNetworkingV1AlphaHttpProxy;

        return dryRun ? httpProxy : transformHttpProxy(httpProxy);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, uid: string) => {
      try {
        const response = await deleteNetworkingDatumapisComV1AlphaNamespacedHttpProxy({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: uid },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
  };
};

export type HttpProxiesControl = ReturnType<typeof createHttpProxiesControl>;
