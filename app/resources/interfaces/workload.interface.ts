import { ComDatumapisComputeV1AlphaWorkload } from '@/modules/control-plane/compute'

export interface IWorkloadControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  spec?: ComDatumapisComputeV1AlphaWorkload['spec']
  status?: ComDatumapisComputeV1AlphaWorkload['status']
}
