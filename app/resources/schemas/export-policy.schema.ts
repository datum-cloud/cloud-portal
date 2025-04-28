import { nameSchema, metadataSchema } from './metadata.schema'
import {
  ExportPolicySinkType,
  ExportPolicySourceType,
} from '@/resources/interfaces/policy.interface'
import { z } from 'zod'

// Source Field Schema
export const sourceFieldSchema = z
  .object({
    type: z.enum(Object.values(ExportPolicySourceType) as [string, ...string[]], {
      required_error: 'Source type is required.',
    }),
    metricQuery: z.string({ required_error: 'MetricsQL query is required.' }).optional(),
  })
  .and(nameSchema)
  .refine(
    (data) => {
      if (data?.type === ExportPolicySourceType.METRICS) {
        return !!data?.metricQuery
      }
      return true
    },
    {
      message: 'MetricsQL query is required for metrics source',
      path: ['metricQuery'],
    },
  )

export const exportPolicySourcesSchema = z
  .object({
    sources: z.array(sourceFieldSchema).min(1, {
      message: 'At least one source must be configured.',
    }),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>()

    data.sources.forEach((source, index) => {
      const name = source.name?.trim()

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['sources', index, 'name'],
          })
        } else {
          // Track this name as used
          usedNames.add(name)
        }
      }
    })
  })

// Sinks Field Schema
export const sinkPrometheusSchema = z.object({
  endpoint: z.string({ required_error: 'Endpoint URL is required.' }).url({
    message: 'Please enter a valid URL',
  }),
  batch: z.object({
    maxSize: z.coerce
      .number()
      .min(1, {
        message: 'Batch size must be at least 1.',
      })
      .default(100)
      .transform((val) => Number(val)),
    timeout: z.coerce
      .number()
      .min(5, {
        message: 'Batch timeout must be at least 5s.',
      })
      .default(5)
      .transform((val) => Number(val)),
  }),
  retry: z.object({
    backoffDuration: z.coerce
      .number()
      .min(5, {
        message: 'Backoff duration must be at least 5s.',
      })
      .default(5)
      .transform((val) => Number(val)),
    maxAttempts: z.coerce
      .number()
      .min(1, {
        message: 'Max attempts must be at least 1.',
      })
      .default(3)
      .transform((val) => Number(val)),
  }),
})
export const sinkFieldSchema = z
  .object({
    type: z.enum(Object.values(ExportPolicySinkType) as [string, ...string[]], {
      required_error: 'Sink type is required.',
    }),
    sources: z.array(z.string()).min(1, {
      message: 'At least one source must be selected.',
    }),
    prometheusRemoteWrite: sinkPrometheusSchema.optional(),
  })
  .and(nameSchema)

export const exportPolicySinksSchema = z
  .object({
    sinks: z.array(sinkFieldSchema).min(1, {
      message: 'At least one sink must be configured.',
    }),
  })
  .superRefine((data, ctx) => {
    // Check for duplicate storage names
    const usedNames = new Set<string>()

    data.sinks.forEach((sink, index) => {
      const name = sink.name?.trim()

      if (name) {
        if (usedNames.has(name)) {
          // If name already exists, add validation error
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Name "${name}" is already used`,
            path: ['sinks', index, 'name'],
          })
        } else {
          // Track this name as used
          usedNames.add(name)
        }
      }
    })
  })

export const newExportPolicySchema = z
  .object({
    metadata: metadataSchema,
  })
  .and(exportPolicySourcesSchema)
  .and(exportPolicySinksSchema)

export const updateExportPolicySchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(metadataSchema)
  .and(exportPolicySourcesSchema)
  .and(exportPolicySinksSchema)

export type ExportPolicyMetadataSchema = z.infer<typeof metadataSchema>
export type ExportPolicySourcesSchema = z.infer<typeof exportPolicySourcesSchema>
export type ExportPolicySourceFieldSchema = z.infer<typeof sourceFieldSchema>
export type ExportPolicySinksSchema = z.infer<typeof exportPolicySinksSchema>
export type ExportPolicySinkFieldSchema = z.infer<typeof sinkFieldSchema>
export type ExportPolicySinkPrometheusFieldSchema = z.infer<typeof sinkPrometheusSchema>

export type NewExportPolicySchema = z.infer<typeof newExportPolicySchema>
export type UpdateExportPolicySchema = z.infer<typeof updateExportPolicySchema>
