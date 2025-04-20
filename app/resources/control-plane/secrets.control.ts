import {
  IoK8sApiCoreV1Secret,
  createCoreV1NamespacedSecret,
  deleteCoreV1NamespacedSecret,
  listCoreV1NamespacedSecret,
} from '@/modules/control-plane/api-v1'
import {
  ISecretControlResponse,
  SecretType,
} from '@/resources/interfaces/secret.interface'
import { SecretSchema } from '@/resources/schemas/secret.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject, isBase64, toBase64 } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createSecretsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformSecret = (secret: IoK8sApiCoreV1Secret): ISecretControlResponse => {
    return {
      name: secret.metadata?.name,
      namespace: secret.metadata?.namespace,
      createdAt: secret.metadata?.creationTimestamp,
      uid: secret.metadata?.uid,
      resourceVersion: secret.metadata?.resourceVersion,
      // data: secret.data,
      type: secret.type as SecretType,
    }
  }

  const formatSecret = (
    value: SecretSchema,
    resourceVersion?: string,
  ): IoK8sApiCoreV1Secret => {
    const annotations = value?.annotations ?? []
    return {
      metadata: {
        name: value?.name,
        labels: convertLabelsToObject(value?.labels ?? []),
        annotations: convertLabelsToObject(annotations),
        ...(resourceVersion && { resourceVersion }),
      },
      data: value?.variables.reduce(
        (acc, vars) => {
          acc[vars.key] = isBase64(vars.value) ? vars.value : toBase64(vars.value)
          return acc
        },
        {} as Record<string, string>,
      ),
      type: value?.type,
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
    create: async (projectId: string, payload: SecretSchema, dryRun: boolean = false) => {
      const formatted = formatSecret(payload)
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
