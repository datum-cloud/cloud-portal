import {
  createGatewayNetworkingV1NamespacedHttpRoute,
  deleteGatewayNetworkingV1NamespacedHttpRoute,
  listGatewayNetworkingV1NamespacedHttpRoute,
  readGatewayNetworkingV1NamespacedHttpRoute,
  replaceGatewayNetworkingV1NamespacedHttpRoute,
} from '@/modules/control-plane/gateway/sdk.gen';
import {
  IoK8sNetworkingGatewayV1HttpRoute,
  IoK8sNetworkingGatewayV1HttpRouteList,
} from '@/modules/control-plane/gateway/types.gen';
import {
  HTTPFilterType,
  HTTPPathMatchType,
  HTTPPathRewriteType,
  IHttpRouteControlResponse,
  IHttpRouteControlResponseLite,
} from '@/resources/interfaces/http-route.interface';
import { HttpRouteSchema } from '@/resources/schemas/http-route.schema';
import { convertLabelsToObject } from '@/utils/data';
import { CustomError } from '@/utils/error';
import { Client } from '@hey-api/client-axios';

export const createHttpRoutesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformHttpRouteLite = (
    httpRoute: IoK8sNetworkingGatewayV1HttpRoute
  ): IHttpRouteControlResponseLite => {
    const { metadata } = httpRoute;
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      createdAt: metadata?.creationTimestamp,
    };
  };

  const transformHttpRoute = (
    httpRoute: IoK8sNetworkingGatewayV1HttpRoute
  ): IHttpRouteControlResponse => {
    const { metadata, spec } = httpRoute;
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      createdAt: metadata?.creationTimestamp,
      resourceVersion: metadata?.resourceVersion,
      namespace: metadata?.namespace,
      labels: metadata?.labels,
      annotations: metadata?.annotations,
      parentRefs: (spec?.parentRefs ?? []).map((parentRef) => parentRef.name),
      rules: spec?.rules?.map((rule) => ({
        matches: rule.matches?.map((match) => ({
          path: {
            type: match.path?.type as HTTPPathMatchType,
            value: match.path?.value as string,
          },
        })),
        backendRefs: rule.backendRefs?.map((backendRef) => ({
          name: backendRef.name,
          port: backendRef.port as number,
        })),
        filters: rule.filters?.map((filter) => ({
          type: filter.type as HTTPFilterType,
          ...(filter.type === HTTPFilterType.URL_REWRITE
            ? {
                urlRewrite: {
                  hostname: filter.urlRewrite?.hostname ?? '',
                  path: {
                    type: filter.urlRewrite?.path?.type as HTTPPathRewriteType,
                    ...(filter.urlRewrite?.path?.type === HTTPPathRewriteType.REPLACE_PREFIX_MATCH
                      ? {
                          value: filter.urlRewrite?.path?.replacePrefixMatch as string,
                        }
                      : {
                          value: filter.urlRewrite?.path?.replaceFullPath as string,
                        }),
                  },
                },
              }
            : {}),
        })),
      })),
    };
  };

  const formatHttpRoute = (payload: HttpRouteSchema): IoK8sNetworkingGatewayV1HttpRoute => {
    return {
      metadata: {
        name: payload?.name,
        labels: convertLabelsToObject(payload?.labels ?? []),
        annotations: convertLabelsToObject(payload?.annotations ?? []),
        ...(payload?.resourceVersion ? { resourceVersion: payload?.resourceVersion } : {}),
      },
      spec: {
        parentRefs: payload.parentRefs.map((parentRef) => ({
          name: parentRef,
          kind: 'Gateway',
          group: 'gateway.networking.k8s.io',
        })),
        rules: payload.rules.map((rule) => {
          const { matches, backendRefs, filters } = rule;
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
          };
        }),
      },
    };
  };

  return {
    list: async (projectId: string) => {
      const response = await listGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      });

      const httpRoutes = response.data as IoK8sNetworkingGatewayV1HttpRouteList;

      return httpRoutes.items.map(transformHttpRouteLite);
    },
    create: async (projectId: string, payload: HttpRouteSchema, dryRun: boolean = false) => {
      const formatted = formatHttpRoute(payload);
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
      });

      if (!response.data) {
        throw new CustomError('Failed to create HTTP route', 500);
      }

      const httpRoute = response.data as IoK8sNetworkingGatewayV1HttpRoute;

      return dryRun ? httpRoute : transformHttpRouteLite(httpRoute);
    },
    detail: async (projectId: string, uid: string) => {
      const response = await readGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('HTTP route not found', 404);
      }

      const httpRoute = response.data as IoK8sNetworkingGatewayV1HttpRoute;

      return transformHttpRoute(httpRoute);
    },
    delete: async (projectId: string, uid: string) => {
      const response = await deleteGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete HTTP route', 500);
      }

      return response.data;
    },
    update: async (
      projectId: string,
      uid: string,
      payload: HttpRouteSchema,
      dryRun: boolean = false
    ) => {
      const formatted = formatHttpRoute(payload);
      const response = await replaceGatewayNetworkingV1NamespacedHttpRoute({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: uid },
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
      });

      if (!response.data) {
        throw new CustomError('Failed to update HTTP route', 500);
      }

      const httpRoute = response.data as IoK8sNetworkingGatewayV1HttpRoute;

      return dryRun ? httpRoute : transformHttpRouteLite(httpRoute);
    },
  };
};
