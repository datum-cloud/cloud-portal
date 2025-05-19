/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createGatewayNetworkingV1NamespacedHttpRoute,
  listGatewayNetworkingV1NamespacedHttpRoute,
} from '@/modules/control-plane/gateway/sdk.gen'
import { IoK8sNetworkingGatewayV1HttpRoute } from '@/modules/control-plane/gateway/types.gen'
import {
  HTTPFilterType,
  HTTPPathMatchType,
  HTTPPathRewriteType,
  IHttpRouteControlResponseLite,
} from '@/resources/interfaces/http-route.interface'
import { HttpRouteSchema } from '@/resources/schemas/http-route.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createHttpRoutesControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformHttpRouteLite = (
    httpRoute: IoK8sNetworkingGatewayV1HttpRoute,
  ): IHttpRouteControlResponseLite => {
    const { metadata } = httpRoute
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      createdAt: metadata?.creationTimestamp,
    }
  }

  const formatHttpRoute = (
    payload: HttpRouteSchema,
  ): IoK8sNetworkingGatewayV1HttpRoute => {
    return {
      metadata: {
        name: payload?.name,
        labels: convertLabelsToObject(payload?.labels ?? []),
        annotations: convertLabelsToObject(payload?.annotations ?? []),
        ...(payload?.resourceVersion
          ? { resourceVersion: payload?.resourceVersion }
          : {}),
      },
      spec: {
        parentRefs: payload.parentRefs.map((parentRef) => ({
          name: parentRef,
          kind: 'Gateway',
          group: 'gateway.networking.k8s.io',
        })),
        rules: payload.rules.map((rule) => {
          const { matches, backendRefs, filters } = rule
          return {
            matches: matches.map((match) => ({
              path: {
                type: (match.path?.type ?? HTTPPathMatchType.PATH_PREFIX) as any,
                value: match.path?.value ?? '/',
              },
            })),
            backendRefs: backendRefs.map((backendRef) => ({
              group: 'discovery.k8s.io',
              kind: 'EndpointSlice',
              name: backendRef.name ?? '',
              port: backendRef.port ?? 80,
            })),
            filters: filters?.map((filter) => ({
              type: (filter.type ?? HTTPFilterType.URL_REWRITE) as any,
              ...(filter.type === HTTPFilterType.URL_REWRITE
                ? {
                    urlRewrite: {
                      hostname: filter.urlRewrite?.hostname ?? '',
                      path: {
                        type: (filter.urlRewrite?.path?.type ??
                          HTTPPathRewriteType.REPLACE_PREFIX_MATCH) as any,
                        ...(filter.urlRewrite?.path?.type ===
                        HTTPPathRewriteType.REPLACE_PREFIX_MATCH
                          ? {
                              replacePrefixMatch: filter.urlRewrite?.path?.value ?? '/',
                            }
                          : {
                              replaceFullPath: filter.urlRewrite?.path?.value ?? '/',
                            }),
                      },
                    },
                  }
                : {}),
            })),
          }
        }),
      },
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      })

      return response.data?.items?.map(transformHttpRouteLite) ?? []
    },
    create: async (
      projectId: string,
      payload: HttpRouteSchema,
      dryRun: boolean = false,
    ) => {
      const formatted = formatHttpRoute(payload)
      const response = await createGatewayNetworkingV1NamespacedHttpRoute({
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
          kind: 'HTTPRoute',
          apiVersion: 'gateway.networking.k8s.io/v1',
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create HTTP route', 500)
      }

      return dryRun ? response.data : transformHttpRouteLite(response.data)
    },
  }
}
