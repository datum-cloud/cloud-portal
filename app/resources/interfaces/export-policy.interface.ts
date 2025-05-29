import { ILabel } from './label.interface';
import { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry';

export interface IExportPolicyControlResponse {
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  name?: string;
  sources?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sources'];
  sinks?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sinks'];
  status?: ComDatumapisTelemetryV1Alpha1ExportPolicy['status'];
  createdAt?: Date;
  labels?: ILabel;
  annotations?: ILabel;
}

export enum ExportPolicySourceType {
  METRICS = 'Metrics',
}

export enum ExportPolicySinkType {
  PROMETHEUS = 'Prometheus',
}

export enum ExportPolicyAuthenticationType {
  BASIC_AUTH = 'basic-auth',
}
