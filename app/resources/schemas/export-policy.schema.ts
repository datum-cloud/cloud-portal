import { nameSchema, metadataSchema } from './metadata.schema';
import {
  ExportPolicyAuthenticationType,
  ExportPolicySinkType,
  ExportPolicySourceType,
} from '@/resources/interfaces/export-policy.interface';
import { z } from 'zod';

// Source Field Schema
export const sourceFieldSchema = z
  .object({
    type: z.enum(Object.values(ExportPolicySourceType) as [string, ...string[]], {
      error: 'Source type is required.',
    }),
    metricQuery: z.string().optional(),
  })
  .and(nameSchema)
  .refine(
    (data) => {
      if (data?.type === ExportPolicySourceType.METRICS) {
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
    type: z.enum(Object.values(ExportPolicySinkType) as [string, ...string[]], {
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
