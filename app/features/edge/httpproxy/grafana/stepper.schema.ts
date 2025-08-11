import { isValidPrometheusConfig, isValidYaml, yamlToJson } from '@/utils/format';
import { createNameSchema } from '@/utils/validation';
import { z } from 'zod';

export const instanceSchema = z.object({
  instanceUrl: z.string({ required_error: 'Instance URL is required' }).url(),
});

export const deploySchema = z.object({
  prometheusConfig: z
    .string({ required_error: 'YAML content is required' })
    .refine(isValidYaml, { message: 'Invalid YAML format' })
    .refine(
      (value) => {
        try {
          const json = yamlToJson(value);
          return isValidPrometheusConfig(json);
        } catch {
          return false;
        }
      },
      { message: 'Invalid Prometheus configuration format' }
    ),
  secretName: createNameSchema('Secret name'),
  exportPolicyName: createNameSchema('Export policy name'),
});

export type InstanceFormValues = z.infer<typeof instanceSchema>;
export type DeployFormValues = z.infer<typeof deploySchema>;
export type GrafanaTelemetryValues = InstanceFormValues & DeployFormValues;

export interface BasicAuth {
  username: string | number;
  password?: string;
  password_file?: string;
}

export interface RemoteWriteEntry {
  url: string;
  basic_auth?: BasicAuth;
}

export interface PrometheusConfig {
  remote_write: RemoteWriteEntry[];
}
