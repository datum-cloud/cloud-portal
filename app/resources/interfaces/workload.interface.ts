import { ILabel } from './label.interface'
import {
  ComDatumapisComputeV1AlphaInstance,
  ComDatumapisComputeV1AlphaWorkload,
  ComDatumapisComputeV1AlphaWorkloadDeployment,
} from '@/modules/control-plane/compute'

export interface IWorkloadControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  spec?: ComDatumapisComputeV1AlphaWorkload['spec']
  status?: ComDatumapisComputeV1AlphaWorkload['status']
  labels?: ILabel
  annotations?: ILabel
}

export interface IWorkloadDeploymentControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  spec?: ComDatumapisComputeV1AlphaWorkloadDeployment['spec']
  status?: ComDatumapisComputeV1AlphaWorkloadDeployment['status']
  cityCode?: string
  location?: {
    name?: string
    namespace?: string
  }
  currentReplicas?: number
  desiredReplicas?: number
}

export interface IInstanceControlResponse {
  name?: string
  namespace?: string
  createdAt?: Date
  uid?: string
  resourceVersion?: string
  spec?: ComDatumapisComputeV1AlphaInstance['spec']
  status?: ComDatumapisComputeV1AlphaInstance['status']
  type?: string
  externalIp?: string
  networkIp?: string
}

export enum RuntimeType {
  CONTAINER = 'container',
  VM = 'vm',
}

export enum StorageType {
  BOOT = 'boot',
  FILESYSTEM = 'filesystem',
  REQUEST = 'request',
}

export enum PortProtocol {
  TCP = 'TCP',
  UDP = 'UDP',
  SCTP = 'SCTP',
}

export enum ContainerEnvType {
  TEXT = 'text',
  SECRET = 'secret',
  CONFIG_MAP = 'config-map',
}
