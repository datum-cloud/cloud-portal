import { IOrganization } from '@/resources/interfaces/organization.inteface'
import { determineOrgId } from '@/utils/misc'
import { AxiosInstance } from 'axios'

export const iamOrganizationsService = (client: AxiosInstance) => {
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
  }
}
