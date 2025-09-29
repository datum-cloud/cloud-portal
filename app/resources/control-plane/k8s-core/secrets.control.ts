import {
  IoK8sApiCoreV1Secret,
  IoK8sApiCoreV1SecretList,
  createCoreV1NamespacedSecret,
  deleteCoreV1NamespacedSecret,
  listCoreV1NamespacedSecret,
  patchCoreV1NamespacedSecret,
  readCoreV1NamespacedSecret,
} from '@/modules/control-plane/k8s-core';
import { ISecretControlResponse, SecretType } from '@/resources/interfaces/secret.interface';
import { SecretNewSchema, SecretEditSchema } from '@/resources/schemas/secret.schema';
import { convertLabelsToObject } from '@/utils/helpers/object.helper';
import { isBase64, toBase64 } from '@/utils/helpers/text.helper';
import { Client } from '@hey-api/client-axios';

export const createSecretsControl = (client: Client) => {
  const baseUrl = `${client.instance.defaults.baseURL}/apis/resourcemanager.miloapis.com/v1alpha1`;

  const transformSecret = (secret: IoK8sApiCoreV1Secret): ISecretControlResponse => {
    const { metadata, type } = secret;
    return {
      name: metadata?.name,
      namespace: metadata?.namespace,
      createdAt: metadata?.creationTimestamp,
      uid: metadata?.uid,
      resourceVersion: metadata?.resourceVersion,
      data: Object.keys(secret.data ?? {}),
      type: type as SecretType,
      labels: metadata?.labels ?? {},
      annotations: metadata?.annotations ?? {},
    };
  };

  return {
    list: async (projectId: string) => {
      try {
        const response = await listCoreV1NamespacedSecret({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: {
            namespace: 'default',
          },
        });

        const secrets = response.data as IoK8sApiCoreV1SecretList;

        return secrets.items.map(transformSecret);
      } catch (e) {
        throw e;
      }
    },
    create: async (projectId: string, payload: SecretNewSchema, dryRun: boolean = false) => {
      try {
        const formatted = {
          metadata: {
            name: payload?.name,
            labels: convertLabelsToObject(payload?.labels ?? []),
            annotations: convertLabelsToObject(payload?.annotations ?? []),
          },
          data: (payload?.variables ?? []).reduce(
            (acc, vars) => {
              acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value);
              return acc;
            },
            {} as Record<string, string>
          ),
          type: payload?.type,
        };
        const response = await createCoreV1NamespacedSecret({
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
            apiVersion: 'v1',
            kind: 'Secret',
          },
        });

        const secret = response.data as IoK8sApiCoreV1Secret;

        return dryRun ? secret : transformSecret(secret);
      } catch (e) {
        throw e;
      }
    },
    detail: async (projectId: string, secretId: string) => {
      try {
        const response = await readCoreV1NamespacedSecret({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: secretId },
          // Enable this when you want to get the partial object metadata
          /* headers: {
            Accept:
              'as=PartialObjectMetadata;g=meta.k8s.io;v=v1,application/json;as=PartialObjectMetadata;g=meta.k8s.io;v=v1,application/jso',
          }, */
        });

        const secret = response.data as IoK8sApiCoreV1Secret;

        return transformSecret(secret);
      } catch (e) {
        throw e;
      }
    },
    update: async (
      projectId: string,
      secretId: string,
      payload: SecretEditSchema,
      dryRun: boolean = false
    ) => {
      try {
        const response = await patchCoreV1NamespacedSecret({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: secretId },
          query: {
            dryRun: dryRun ? 'All' : undefined,
            fieldManager: 'datum-cloud-portal',
          },
          headers: {
            'Content-Type': 'application/merge-patch+json',
          },
          body: {
            ...payload,
            apiVersion: 'v1',
            kind: 'Secret',
          },
        });

        const secret = response.data as IoK8sApiCoreV1Secret;

        return dryRun ? secret : transformSecret(secret);
      } catch (e) {
        throw e;
      }
    },
    delete: async (projectId: string, secretId: string) => {
      try {
        const response = await deleteCoreV1NamespacedSecret({
          client,
          baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
          path: { namespace: 'default', name: secretId },
        });

        return response.data;
      } catch (e) {
        throw e;
      }
    },
  };
};
