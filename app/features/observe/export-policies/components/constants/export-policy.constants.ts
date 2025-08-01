import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  ExportPolicySourceType,
} from '@/resources/interfaces/export-policy.interface';

export const POLICY_SOURCE_TYPES = {
  [ExportPolicySourceType.METRICS]: {
    label: 'Metrics',
    description: 'A metrics source is a source that is used to export metrics.',
  },
};

export const POLICY_SINK_TYPES = {
  [ExportPolicySinkType.PROMETHEUS]: {
    label: 'Prometheus Remote Write',
    description:
      'A sink used for exporting telemetry data to a Prometheus Remote Write endpoint as part of a Kubernetes export policy.',
  },
};

export const SINK_AUTH_TYPES = {
  [ExportPolicyAuthenticationType.BASIC_AUTH]: {
    label: 'Basic Auth',
    description: 'A basic auth is a secret that is used to store a basic auth.',
  },
};
