import {
  createGatewayNetworkingV1NamespacedGateway,
  deleteGatewayNetworkingV1NamespacedGateway,
  listGatewayNetworkingV1NamespacedGateway,
  readGatewayNetworkingV1NamespacedGateway,
  readGatewayNetworkingV1NamespacedGatewayStatus,
  replaceGatewayNetworkingV1NamespacedGateway,
} from '@/modules/control-plane/gateway/sdk.gen';
import { IoK8sNetworkingGatewayV1Gateway } from '@/modules/control-plane/gateway/types.gen';
import {
  GatewayAllowedRoutes,
  GatewayPort,
  GatewayProtocol,
  GatewayTlsMode,
  IGatewayControlResponse,
  IGatewayControlResponseLite,
} from '@/resources/interfaces/gateway.interface';
import { GatewaySchema } from '@/resources/schemas/gateway.schema';
import { CustomError } from '@/utils/errorHandle';
import { convertLabelsToObject, transformControlPlaneStatus } from '@/utils/misc';
import { Client } from '@hey-api/client-axios';
import { omit } from 'es-toolkit/compat';

export const createGatewaysControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL;

  const transformGateway = (gateway: IoK8sNetworkingGatewayV1Gateway): IGatewayControlResponse => {
    const { metadata, spec, status } = gateway;
    return {
      uid: metadata?.uid,
      resourceVersion: metadata?.resourceVersion,
      namespace: metadata?.namespace,
      name: metadata?.name,
      gatewayClass: spec.gatewayClassName,
      listeners: spec.listeners,
      addresses: status?.addresses ?? [],
      status: omit(status, ['addresses']),
      createdAt: metadata?.creationTimestamp,
    };
  };

  const transformGatewayLite = (
    gateway: IoK8sNetworkingGatewayV1Gateway
  ): IGatewayControlResponseLite => {
    const { metadata, spec, status } = gateway;
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      gatewayClass: spec.gatewayClassName,
      numberOfListeners: spec.listeners.length,
      addresses: status?.addresses ?? [],
      status: omit(status, ['addresses']),
      createdAt: metadata?.creationTimestamp,
    };
  };

  const formatGateway = (payload: GatewaySchema): IoK8sNetworkingGatewayV1Gateway => {
    return {
      metadata: {
        name: payload?.name,
        labels: convertLabelsToObject(payload?.labels ?? []),
        annotations: convertLabelsToObject(payload?.annotations ?? []),
        ...(payload?.resourceVersion ? { resourceVersion: payload?.resourceVersion } : {}),
      },
      spec: {
        gatewayClassName: 'datum-external-global-proxy', // TODO: make it configurable.
        listeners: payload?.listeners?.map((listener) => ({
          name: listener?.name,
          port: GatewayPort[listener.protocol as keyof typeof GatewayPort],
          protocol: listener?.protocol,
          allowedRoutes: {
            namespaces: {
              from: (listener?.allowedRoutes ?? GatewayAllowedRoutes.SAME) as any,
              // matchLabels on for selector
              // Enable match labels when allowed routes is selector available
              /* ...(listener?.allowedRoutes === GatewayAllowedRoutes.SELECTOR
                ? {
                    selector: {
                      matchLabels: convertLabelsToObject(listener?.matchLabels ?? []),
                    },
                  }
                : {}), */
            },
          },
          ...(listener?.protocol === GatewayProtocol.HTTPS
            ? {
                tls: {
                  mode: (listener?.tlsConfiguration?.mode ?? GatewayTlsMode.TERMINATE) as any,
                  options: {
                    'gateway.networking.datumapis.com/certificate-issuer': 'auto',
                  },
                },
              }
            : {}),
        })),
      },
    };
  };

  return {
    list: async (projectId: string) => {
      const response = await listGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
      });

      return response.data?.items?.map(transformGatewayLite) ?? [];
    },
    create: async (projectId: string, payload: GatewaySchema, dryRun: boolean = false) => {
      const formatted = formatGateway(payload);
      const response = await createGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          ...formatted,
          apiVersion: 'gateway.networking.k8s.io/v1',
          kind: 'Gateway',
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to create gateway', 500);
      }

      return dryRun ? response.data : transformGateway(response.data);
    },
    delete: async (projectId: string, gatewayId: string) => {
      const response = await deleteGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete gateway', 500);
      }

      return response.data;
    },
    detail: async (projectId: string, gatewayId: string) => {
      const response = await readGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
      });

      if (!response.data) {
        throw new CustomError(`Gateway ${gatewayId} not found`, 404);
      }

      return transformGateway(response.data);
    },
    update: async (
      projectId: string,
      gatewayId: string,
      payload: GatewaySchema,
      dryRun: boolean = false
    ) => {
      const formatted = formatGateway(payload);
      const response = await replaceGatewayNetworkingV1NamespacedGateway({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          ...formatted,
          apiVersion: 'gateway.networking.k8s.io/v1',
          kind: 'Gateway',
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to update gateway', 500);
      }

      return dryRun ? response.data : transformGateway(response.data);
    },
    getStatus: async (projectId: string, gatewayId: string) => {
      const response = await readGatewayNetworkingV1NamespacedGatewayStatus({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { name: gatewayId, namespace: 'default' },
      });

      if (!response.data) {
        throw new CustomError(`Gateway ${gatewayId} not found`, 404);
      }

      return transformControlPlaneStatus(response.data.status);
    },
  };
};

export type GatewaysControl = ReturnType<typeof createGatewaysControl>;
