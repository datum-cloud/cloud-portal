// Control Plane Schema
interface ProjectMetadataAnnotations {
  'kubernetes.io/description': string
}

interface ProjectMetadataLabels {
  'resourcemanager.datumapis.com/organization-id': string
}

interface ProjectMetadata {
  annotations: ProjectMetadataAnnotations
  creationTimestamp: string
  generation: number
  labels: ProjectMetadataLabels
  managedFields: Array<unknown>
  name: string
  resourceVersion: string
  uid: string
}

interface ProjectSpecParent {
  external: string
}

interface ProjectSpec {
  parent: ProjectSpecParent
}

interface Project {
  apiVersion: 'resourcemanager.datumapis.com/v1alpha'
  kind: 'Project'
  metadata: ProjectMetadata
  spec: ProjectSpec
  status: IProjectStatus
}

interface ProjectStatusCondition {
  lastTransitionTime: string | Date
  message: string
  observedGeneration?: bigint | number
  reason: string
  status: string
  type: string
}

export interface IProjectStatus {
  conditions?: ProjectStatusCondition[]
}

export type IProjectControl = Project

export interface IProjectControlResponse {
  name?: string
  description?: string
  createdAt?: string | Date
  organizationId?: string
  resourceVersion?: string
  uid?: string
  status?: IProjectStatus
}
