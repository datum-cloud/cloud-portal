import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry'

export interface IExportPolicyControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  numberOfSources?: number
  numberOfSinks?: number
  status?: ComDatumapisTelemetryV1Alpha1ExportPolicy['status']
  createdAt?: Date
}
