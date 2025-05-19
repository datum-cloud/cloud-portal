import {
  ComDatumapisNetworkingV1AlphaLocation,
  createNetworkingDatumapisComV1AlphaNamespacedLocation,
  deleteNetworkingDatumapisComV1AlphaNamespacedLocation,
  listNetworkingDatumapisComV1AlphaNamespacedLocation,
  readNetworkingDatumapisComV1AlphaNamespacedLocation,
  replaceNetworkingDatumapisComV1AlphaNamespacedLocation,
} from '@/modules/control-plane/networking'
import {
  ILocationControlResponse,
  LocationClass,
} from '@/resources/interfaces/location.interface'
import { NewLocationSchema } from '@/resources/schemas/location.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject, filterLabels } from '@/utils/misc'
import { Client } from '@hey-api/client-axios'

export const createLocationsControl = (client: Client) => {
  const baseUrl = client.instance.defaults.baseURL

  const transformLocation = (
    location: ComDatumapisNetworkingV1AlphaLocation,
  ): ILocationControlResponse => {
    const { metadata, spec } = location
    return {
      name: metadata?.name ?? '',
      displayName: metadata?.annotations?.['app.kubernetes.io/name'] ?? '',
      class: Object.values(LocationClass).includes(
        spec?.locationClassName as LocationClass,
      )
        ? (spec?.locationClassName as LocationClass)
        : LocationClass.DATUM_MANAGED,
      createdAt: metadata?.creationTimestamp ?? new Date(),
      uid: metadata?.uid ?? '',
      resourceVersion: metadata?.resourceVersion ?? '',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider: (spec?.provider as any) ?? {},
      cityCode: spec?.topology?.['topology.datum.net/city-code'] ?? '',
      namespace: metadata?.namespace ?? 'default',
      labels: filterLabels(metadata?.labels ?? {}),
    }
  }

  return {
    list: async (projectId: string) => {
      const response = await listNetworkingDatumapisComV1AlphaNamespacedLocation({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
        },
      })

      return response.data?.items?.map(transformLocation) ?? []
    },
    detail: async (projectId: string, locationName: string) => {
      const response = await readNetworkingDatumapisComV1AlphaNamespacedLocation({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: locationName,
        },
      })

      if (!response.data) {
        throw new CustomError(`Location ${locationName} not found`, 404)
      }

      return transformLocation(response.data)
    },
    create: async (
      projectId: string,
      payload: NewLocationSchema,
      dryRun: boolean = false,
    ) => {
      const response = await createNetworkingDatumapisComV1AlphaNamespacedLocation({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: { namespace: 'default' },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          apiVersion: 'networking.datumapis.com/v1alpha',
          kind: 'Location',
          metadata: {
            name: payload.name,
            /* annotations: {
              'app.kubernetes.io/name': payload.displayName,
            }, */
            labels: convertLabelsToObject(payload.labels ?? []),
          },
          spec: {
            locationClassName: payload.class,
            provider: {
              [payload.provider]: payload.providerConfig,
            },
            topology: {
              'topology.datum.net/city-code': payload.cityCode,
            },
          },
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to create location', 500)
      }

      return dryRun ? response.data : transformLocation(response.data)
    },
    update: async (
      projectId: string,
      locationId: string,
      payload: NewLocationSchema,
      dryRun: boolean = false,
    ) => {
      const response = await replaceNetworkingDatumapisComV1AlphaNamespacedLocation({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: locationId,
        },
        query: {
          dryRun: dryRun ? 'All' : undefined,
        },
        body: {
          apiVersion: 'networking.datumapis.com/v1alpha',
          kind: 'Location',
          metadata: {
            name: payload.name,
            /* annotations: {
              'app.kubernetes.io/name': payload.displayName,
            }, */
            resourceVersion: payload.resourceVersion,
            labels: convertLabelsToObject(payload.labels ?? []),
          },
          spec: {
            locationClassName: payload.class,
            provider: {
              [payload.provider]: payload.providerConfig,
            },
            topology: {
              'topology.datum.net/city-code': payload.cityCode,
            },
          },
        },
      })

      if (!response.data) {
        throw new CustomError('Failed to update location', 500)
      }

      return dryRun ? response.data : transformLocation(response.data)
    },
    delete: async (projectId: string, locationName: string) => {
      const response = await deleteNetworkingDatumapisComV1AlphaNamespacedLocation({
        client,
        baseURL: `${baseUrl}/projects/${projectId}/control-plane`,
        path: {
          namespace: 'default',
          name: locationName,
        },
      })

      if (!response.data) {
        throw new CustomError(`Location ${locationName} not found`, 404)
      }

      return response.data
    },
  }
}

export type LocationsControl = ReturnType<typeof createLocationsControl>
