import {
  listCoreV1NamespacedConfigMap,
  createCoreV1NamespacedConfigMap,
  IoK8sApiCoreV1ConfigMap,
  readCoreV1NamespacedConfigMap,
  replaceCoreV1NamespacedConfigMap,
  deleteCoreV1NamespacedConfigMap,
  IoK8sApiCoreV1ConfigMapList,
} from '@/modules/control-plane/api-v1';
import { IConfigMapControlResponse } from '@/resources/interfaces/config-map.interface';
import { ConfigMapSchema } from '@/resources/schemas/config-map.schema';
import { CustomError } from '@/utils/errorHandle';
import { Client } from '@hey-api/client-axios';

export const createConfigMapsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformConfigMap = (configMap: IoK8sApiCoreV1ConfigMap): IConfigMapControlResponse => {
    return {
      name: configMap.metadata?.name,
      namespace: configMap.metadata?.namespace,
      createdAt: configMap.metadata?.creationTimestamp,
      uid: configMap.metadata?.uid,
      resourceVersion: configMap.metadata?.resourceVersion,
      data: configMap.data,
    };
  };

  return {
    list: async (projectId: string) => {
      const response = await listCoreV1NamespacedConfigMap({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      });

      const configMaps = response.data as IoK8sApiCoreV1ConfigMapList;

      return configMaps.items.map(transformConfigMap);
    },
    detail: async (projectId: string, configId: string) => {
      const response = await readCoreV1NamespacedConfigMap({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: configId },
      });

      if (!response.data) {
        throw new CustomError(`ConfigMap ${configId} not found`, 404);
      }

      const configMap = response.data as IoK8sApiCoreV1ConfigMap;

      return transformConfigMap(configMap);
    },
    create: async (projectId: string, payload: ConfigMapSchema, dryRun: boolean = false) => {
      const response = await createCoreV1NamespacedConfigMap({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type': payload.format === 'yaml' ? 'application/yaml' : 'application/json',
        },
        body: payload.configuration as IoK8sApiCoreV1ConfigMap,
      });

      if (!response.data) {
        throw new CustomError('Failed to create config map', 500);
      }

      const configMap = response.data as IoK8sApiCoreV1ConfigMap;

      return dryRun ? configMap : transformConfigMap(configMap);
    },
    update: async (
      projectId: string,
      configId: string,
      payload: { data: Record<string, string>; resourceVersion: string },
      dryRun: boolean = false
    ) => {
      const response = await replaceCoreV1NamespacedConfigMap({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: configId },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        headers: {
          'Content-Type': 'application/json',
        },
        body: {
          apiVersion: 'v1',
          kind: 'ConfigMap',
          metadata: {
            name: configId,
            resourceVersion: payload.resourceVersion,
          },
          data: payload.data,
        },
      });

      if (!response.data) {
        throw new CustomError('Failed to update config map', 500);
      }

      const configMap = response.data as IoK8sApiCoreV1ConfigMap;

      return dryRun ? configMap : transformConfigMap(configMap);
    },
    delete: async (projectId: string, configId: string) => {
      const response = await deleteCoreV1NamespacedConfigMap({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: configId },
      });

      if (!response.data) {
        throw new CustomError('Failed to delete config map', 500);
      }

      return response.data;
    },
  };
};

export type ConfigMapsControl = ReturnType<typeof createConfigMapsControl>;
