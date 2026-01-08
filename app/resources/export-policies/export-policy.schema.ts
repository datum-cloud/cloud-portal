import type { ComDatumapisTelemetryV1Alpha1ExportPolicy } from '@/modules/control-plane/telemetry';
import { nameSchema, metadataSchema } from '@/resources/base';
import { z } from 'zod';

// Export Policy types
export const EXPORT_POLICY_SOURCE_TYPES = ['Metrics'] as const;
export type ExportPolicySourceType = (typeof EXPORT_POLICY_SOURCE_TYPES)[number];

export const EXPORT_POLICY_SINK_TYPES = ['Prometheus'] as const;
export type ExportPolicySinkType = (typeof EXPORT_POLICY_SINK_TYPES)[number];

export const EXPORT_POLICY_AUTH_TYPES = ['basic-auth'] as const;
export type ExportPolicyAuthType = (typeof EXPORT_POLICY_AUTH_TYPES)[number];

// Label schema
export const labelSchema = z.record(z.string(), z.string());
export type Label = z.infer<typeof labelSchema>;

// Export Policy resource schema (from API)
export const exportPolicyResourceSchema = z.object({
  uid: z.string(),
  name: z.string(),
  namespace: z.string().optional(),
  resourceVersion: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  sources: z.any().optional(),
  sinks: z.any().optional(),
  status: z.any().optional(),
  labels: labelSchema.optional(),
  annotations: labelSchema.optional(),
});

export type ExportPolicy = z.infer<typeof exportPolicyResourceSchema>;

// Legacy control response interface
export interface IExportPolicyControlResponse {
  uid?: string;
  resourceVersion?: string;
  namespace?: string;
  name?: string;
  sources?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sources'];
  sinks?: ComDatumapisTelemetryV1Alpha1ExportPolicy['spec']['sinks'];
  status?: ComDatumapisTelemetryV1Alpha1ExportPolicy['status'];
  createdAt?: Date;
  labels?: Record<string, string | null>;
  annotations?: Record<string, string | null>;
}

// Legacy enums - keeping for backward compatibility
export enum ExportPolicySourceTypeEnum {
  METRICS = 'Metrics',
}

export enum ExportPolicySinkTypeEnum {
  PROMETHEUS = 'Prometheus',
}

export enum ExportPolicyAuthenticationType {
  BASIC_AUTH = 'basic-auth',
}

// Export Policy list schema
export const exportPolicyListSchema = z.object({
  items: z.array(exportPolicyResourceSchema),
  nextCursor: z.string().nullish(),
  hasMore: z.boolean(),
});

export type ExportPolicyList = z.infer<typeof exportPolicyListSchema>;

// Input types for service operations
export type CreateExportPolicyInput = {
  metadata: {
    name: string;
    labels?: string[];
    annotations?: string[];
  };
  sources: Array<{
    name: string;
    type: string;
    metricQuery?: string;
  }>;
  sinks: Array<{
    name: string;
    type: string;
    sources: string[];
    prometheusRemoteWrite?: {
      endpoint: string;
      authentication?: {
        authType?: string;
        secretName?: string;
      };
      batch?: {
        maxSize?: number;
        timeout?: number;
      };
      retry?: {
        backoffDuration?: number;
        maxAttempts?: number;
      };
    };
  }>;
};

export type UpdateExportPolicyInput = CreateExportPolicyInput & {
  resourceVersion: string;
};

// Source Field Schema
export const sourceFieldSchema = z
  .object({
    type: z.enum(Object.values(ExportPolicySourceTypeEnum) as [string, ...string[]], {
      error: 'Source type is required.',
    }),
    metricQuery: z.string().optional(),
  })
  .and(nameSchema)
  .refine(
    (data) => {
      if (data?.type === ExportPolicySourceTypeEnum.METRICS) {
        return !!data?.metricQuery;
      }
      return true;
    },
    {
      message: 'MetricsQL query is required for metrics source',
      path: ['metricQuery'],
    }
  );

export const exportPolicySourcesSchema = z
  .object({
    sources: z.array(sourceFieldSchema).min(1, {
      message: 'At least one source must be configured.',
    }),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>();

    data.sources.forEach((source, index) => {
      const name = source.name?.trim();

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: 'custom',
            message: `Name "${name}" is already used`,
            path: ['sources', index, 'name'],
          });
        } else {
          // Track this name as used
          usedNames.add(name);
        }
      }
    });
  });

// Sinks Field Schema

export const sinkAuthenticationSchema = z
  .object({
    authType: z
      .enum(Object.values(ExportPolicyAuthenticationType) as [string, ...string[]])
      .optional(),
    secretName: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data?.authType === ExportPolicyAuthenticationType.BASIC_AUTH) {
        return !!data?.secretName;
      }
      return true;
    },
    {
      message: 'Secret is required for basic auth',
      path: ['secretName'],
    }
  );

export const sinkPrometheusSchema = z.object({
  endpoint: z.string({ error: 'Endpoint URL is required.' }).url({
    message: 'Please enter a valid URL',
  }),
  authentication: sinkAuthenticationSchema.optional(),
  batch: z.object({
    maxSize: z.coerce
      .number({ error: 'Max size is required.' })
      .min(1, {
        message: 'Max size must be at least 1.',
      })
      .transform((val) => Number(val)),
    timeout: z.coerce
      .number({ error: 'Timeout is required.' })
      .min(5, {
        message: 'Timeout must be at least 5s.',
      })
      .transform((val) => Number(val)),
  }),
  retry: z.object({
    backoffDuration: z.coerce
      .number({ error: 'Backoff duration is required.' })
      .min(5, {
        message: 'Backoff duration must be at least 5s.',
      })
      .transform((val) => Number(val)),
    maxAttempts: z.coerce
      .number({ error: 'Max attempts is required.' })
      .min(1, {
        message: 'Max attempts must be at least 1.',
      })
      .transform((val) => Number(val)),
  }),
});

export const sinkFieldSchema = z
  .object({
    type: z.enum(Object.values(ExportPolicySinkTypeEnum) as [string, ...string[]], {
      error: 'Sink type is required.',
    }),
    sources: z.array(z.string()).min(1, {
      message: 'At least one source must be selected.',
    }),
    prometheusRemoteWrite: sinkPrometheusSchema.optional(),
  })
  .and(nameSchema);

export const exportPolicySinksSchema = z
  .object({
    sinks: z.array(sinkFieldSchema).min(1, {
      message: 'At least one sink must be configured.',
    }),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>();

    data.sinks.forEach((sink, index) => {
      const name = sink.name?.trim();

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['sinks', index, 'name'],
          });
        } else {
          // Track this name as used
          usedNames.add(name);
        }
      }
    });
  });

export const newExportPolicySchema = z
  .object({
    metadata: metadataSchema,
  })
  .and(exportPolicySourcesSchema)
  .and(exportPolicySinksSchema);

export const updateExportPolicySchema = z
  .object({
    resourceVersion: z.string({ error: 'Resource version is required.' }),
  })
  .and(metadataSchema)
  .and(exportPolicySourcesSchema)
  .and(exportPolicySinksSchema);

export type ExportPolicyMetadataSchema = z.infer<typeof metadataSchema>;
export type ExportPolicySourcesSchema = z.infer<typeof exportPolicySourcesSchema>;
export type ExportPolicySourceFieldSchema = z.infer<typeof sourceFieldSchema>;
export type ExportPolicySinksSchema = z.infer<typeof exportPolicySinksSchema>;
export type ExportPolicySinkFieldSchema = z.infer<typeof sinkFieldSchema>;
export type ExportPolicySinkPrometheusFieldSchema = z.infer<typeof sinkPrometheusSchema>;
export type ExportPolicySinkAuthenticationSchema = z.infer<typeof sinkAuthenticationSchema>;

export type NewExportPolicySchema = z.infer<typeof newExportPolicySchema>;
export type UpdateExportPolicySchema = z.infer<typeof updateExportPolicySchema>;
