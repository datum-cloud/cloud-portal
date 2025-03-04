import { ILabel } from './label.interface'
import { ComDatumapisResourcemanagerV1AlphaProject } from '@/modules/control-plane/resource-manager'

export interface IProjectControlResponse {
  name?: string
  description?: string
  createdAt?: string | Date
  organizationId?: string
  resourceVersion?: string
  uid?: string
  status?: ComDatumapisResourcemanagerV1AlphaProject['status']
  labels?: ILabel
}
