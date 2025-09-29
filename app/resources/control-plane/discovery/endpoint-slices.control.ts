import {
  createDiscoveryV1NamespacedEndpointSlice,
  deleteDiscoveryV1NamespacedEndpointSlice,
  listDiscoveryV1NamespacedEndpointSlice,
  readDiscoveryV1NamespacedEndpointSlice,
  replaceDiscoveryV1NamespacedEndpointSlice,
} from '@/modules/control-plane/discovery/sdk.gen';
import {
  IoK8sApiDiscoveryV1EndpointConditions,
  IoK8sApiDiscoveryV1EndpointSlice,
  IoK8sApiDiscoveryV1EndpointSliceList,
} from '@/modules/control-plane/discovery/types.gen';
import {
  EndpointSliceCondition,
  EndpointSlicePortPort,
  IEndpointSliceControlResponse,
  IEndpointSliceControlResponseLite,
} from '@/resources/interfaces/endpoint-slice.interface';
import { EndpointSliceSchema } from '@/resources/schemas/endpoint-slice.schema';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { Client } from '@hey-api/client-axios';

export const createEndpointSlicesControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformEndpointSliceLite = (
    endpointSlice: IoK8sApiDiscoveryV1EndpointSlice
  ): IEndpointSliceControlResponseLite => {
    const { metadata, addressType } = endpointSlice;
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      addressType,
      createdAt: metadata?.creationTimestamp,
    };
  };

  const transformEndpointSlice = (
    endpointSlice: IoK8sApiDiscoveryV1EndpointSlice
  ): IEndpointSliceControlResponse => {
    const { metadata, addressType, endpoints, ports } = endpointSlice;
    return {
      uid: metadata?.uid,
      name: metadata?.name,
      addressType,
      createdAt: metadata?.creationTimestamp,
      resourceVersion: metadata?.resourceVersion,
      namespace: metadata?.namespace,
      labels: metadata?.labels,
      annotations: metadata?.annotations,
      endpoints: endpoints.map((endpoint) => ({
        addresses: endpoint?.addresses ?? [],
        conditions: endpoint?.conditions
          ? ((Object.keys(endpoint.conditions).filter(
              (key) =>
                endpoint.conditions?.[key as keyof IoK8sApiDiscoveryV1EndpointConditions] === true
            ) ?? []) as Array<EndpointSliceCondition>)
          : [],
      })),
      ports:
        ports?.map((port) => ({
          appProtocol: port.appProtocol ?? '',
          name: port.name ?? '',
        })) ?? [],
    };
  };

  const formatEndpointSlice = (payload: EndpointSliceSchema): IoK8sApiDiscoveryV1EndpointSlice => {
    return {
      metadata: {
        name: payload?.name,
        labels: convertLabelsToObject(payload?.labels ?? []),
        annotations: convertLabelsToObject(payload?.annotations ?? []),
        ...(payload?.resourceVersion ? { resourceVersion: payload?.resourceVersion } : {}),
      },
      addressType: payload?.addressType as IoK8sApiDiscoveryV1EndpointSlice['addressType'],
      endpoints: payload?.endpoints.map((endpoint) => ({
        addresses: endpoint?.addresses,
        conditions: {
          ready: endpoint.conditions?.includes('ready'),
          reachable: endpoint.conditions?.includes('reachable'),
          terminating: endpoint.conditions?.includes('terminating'),
        },
      })),
      ports: payload?.ports.map((port) => ({
        appProtocol: port.appProtocol,
        name: port.name,
        port: EndpointSlicePortPort[port.appProtocol as keyof typeof EndpointSlicePortPort],
      })),
    };
  };

  return {
    list: async (projectId: string) => {
      try {
        const response = await listDiscoveryV1NamespacedEndpointSlice({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default' },
        });

        const endpointSlices = response.data as IoK8sApiDiscoveryV1EndpointSliceList;

        return endpointSlices.items.map(transformEndpointSliceLite);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, id: string) => {
      try {
        const response = await readDiscoveryV1NamespacedEndpointSlice({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: id },
        });

        const endpointSlice = response.data as IoK8sApiDiscoveryV1EndpointSlice;

        return transformEndpointSlice(endpointSlice);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: EndpointSliceSchema, dryRun: boolean = false) => {
      try {
        const formatted = formatEndpointSlice(payload);
        const response = await createDiscoveryV1NamespacedEndpointSlice({
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
            kind: 'EndpointSlice',
            apiVersion: 'discovery.k8s.io/v1',
          },
        });

        const endpointSlice = response.data as IoK8sApiDiscoveryV1EndpointSlice;

        return dryRun ? endpointSlice : transformEndpointSliceLite(endpointSlice);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, id: string) => {
      try {
        const response = await deleteDiscoveryV1NamespacedEndpointSlice({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: id },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      id: string,
      payload: EndpointSliceSchema,
      dryRun: boolean = false
    ) => {
      try {
        const formatted = formatEndpointSlice(payload);
        const response = await replaceDiscoveryV1NamespacedEndpointSlice({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: id },
          query: {
            dryRun: dryRun ? 'All' : undefined,
          },
          headers: {
            'Content-Type': 'application/json',
          },
          body: {
            ...formatted,
            kind: 'EndpointSlice',
            apiVersion: 'discovery.k8s.io/v1',
          },
        });

        const endpointSlice = response.data as IoK8sApiDiscoveryV1EndpointSlice;

        return dryRun ? endpointSlice : transformEndpointSliceLite(endpointSlice);
      } catch (e) {
        throw e;
      }
    },
  };
};
