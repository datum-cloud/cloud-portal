import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry'

export interface IExportPolicyControlResponse {
  uid?: string
  resourceVersion?: string
  namespace?: string
  name?: string
  sources?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sources']
  sinks?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sinks']
  status?: ComDatumapisTelemetryV1Alpha1ExportPolicy['status']
  createdAt?: Date
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export enum ExportPolicySourceType {
  METRICS = 'Metrics',
}

export enum ExportPolicySinkType {
  PROMETHEUS = 'Prometheus',
}
