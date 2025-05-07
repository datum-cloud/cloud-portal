import {
  IoK8sApiCoreV1Secret,
  createCoreV1NamespacedSecret,
  deleteCoreV1NamespacedSecret,
  listCoreV1NamespacedSecret,
  patchCoreV1NamespacedSecret,
  readCoreV1NamespacedSecret,
} from '@/modules/control-plane/api-v1'
import {
  ISecretControlResponse,
  SecretType,
} from '@/resources/interfaces/secret.interface'
import { SecretNewSchema, SecretEditSchema } from '@/resources/schemas/secret.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject, isBase64, toBase64 } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createSecretsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformSecret = (secret: IoK8sApiCoreV1Secret): ISecretControlResponse => {
    const { metadata, type } = secret
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
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listCoreV1NamespacedSecret({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      })

      return response.data?.items?.map(transformSecret) ?? []
    },
    create: async (
      projectId: string,
      payload: SecretNewSchema,
      dryRun: boolean = false,
    ) => {
      const formatted = {
        metadata: {
          name: payload?.name,
          labels: convertLabelsToObject(payload?.labels ?? []),
          annotations: convertLabelsToObject(payload?.annotations ?? []),
        },
        data: (payload?.variables ?? []).reduce(
          (acc, vars) => {
            acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value)
            return acc
          },
          {} as Record<string, string>,
        ),
        type: payload?.type,
      }
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
      })

      if (!response.data) {
        throw new CustomError('Failed to create secret', 500)
      }

      return dryRun ? response.data : transformSecret(response.data)
    },
    detail: async (projectId: string, secretId: string) => {
      const response = await readCoreV1NamespacedSecret({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: secretId },
        // Enable this when you want to get the partial object metadata
        /* headers: {
          Accept:
            'as=PartialObjectMetadata;g=meta.k8s.io;v=v1,application/json;as=PartialObjectMetadata;g=meta.k8s.io;v=v1,application/jso',
        }, */
      })

      if (!response.data) {
        throw new CustomError('Failed to get secret', 500)
      }

      return transformSecret(response.data)
    },
    update: async (
      projectId: string,
      secretId: string,
      payload: SecretEditSchema,
      dryRun: boolean = false,
    ) => {
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
      })

      if (!response.data) {
        throw new CustomError('Failed to update secret', 500)
      }

      return dryRun ? response.data : transformSecret(response.data)
    },
    delete: async (projectId: string, secretId: string) => {
      const response = await deleteCoreV1NamespacedSecret({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default', name: secretId },
      })

      if (!response.data) {
        throw new CustomError('Failed to delete secret', 500)
      }

      return response.data
    },
  }
}
