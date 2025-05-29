import { IOrganization } from '@/resources/interfaces/organization.inteface'
import { OrganizationSchema } from '@/resources/schemas/organization.schema'
import { convertLabelsToObject, determineOrgId } from '@/utils/misc'
import { AxiosInstance } from 'axios'

export const iamOrganizationsAPI = (client: AxiosInstance) => {
  const transform = (org: IOrganization) => ({
    id: determineOrgId(org),
    ...org,
  })

  return {
    async list(): Promise<IOrganization[]> {
      const response = await client.post('/iam/v1alpha/organizations:search', {})
      return response.data.organizations.map((org: IOrganization) => transform(org))
    },
    async detail(id: string): Promise<IOrganization> {
      const response = await client.get(`/iam/v1alpha/organizations/${id}`)
      return transform(response.data)
    },
    async create(
      payload: OrganizationSchema,
      validate: boolean = false,
    ): Promise<IOrganization> {
      const response = await client.post(
        '/iam/v1alpha/organizations',
        {
          display_name: payload.description,
          spec: {
            description: payload.description,
          },
          annotations: convertLabelsToObject(payload.annotations ?? []),
          labels: convertLabelsToObject(payload.labels ?? []),
          status: {
            internal: true,
          },
        },
        {
          params: {
            validateOnly: validate,
            organizationId: payload.name,
          },
        },
      )
      return validate ? response.data : transform(response.data)
    },
    async update(
      id: string,
      payload: OrganizationSchema,
      validate: boolean = false,
    ): Promise<IOrganization> {
      const response = await client.patch(
        `/iam/v1alpha/organizations/${id}`,
        {
          display_name: payload.description,
          spec: {
            description: payload.description,
          },
          annotations: convertLabelsToObject(payload.annotations ?? []),
          labels: convertLabelsToObject(payload.labels ?? []),
        },
        {
          params: {
            validateOnly: validate,
          },
        },
      )
      return validate ? response.data : transform(response.data.response)
    },
    async delete(
      id: string,
      validate: boolean = false,
    ): Promise<IOrganization | undefined> {
      const response = await client.delete(`/iam/v1alpha/organizations/${id}`, {
        params: {
          validateOnly: validate,
        },
      })

      return validate ? response.data : undefined
    },
  }
}
