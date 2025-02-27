import {
  LocationClass,
  LocationProvider,
} from '@/resources/interfaces/location.interface'
import { z } from 'zod'

export const gcpProviderSchema = z.object({
  provider: z.literal(LocationProvider.GCP),
  projectId: z.string({ required_error: 'Project ID is required.' }),
  region: z.string({ required_error: 'Region is required.' }),
  zone: z.string({ required_error: 'Zone is required.' }),
})

export const baseLocationSchema = z.object({
  displayName: z
    .string({ required_error: 'Display name is required.' })
    .max(100, { message: 'Display name must be less than 100 characters long.' }),
  name: z
    .string({ required_error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Name must be kebab-case, start with a letter, and end with a letter or number',
    }),
  class: z.enum(Object.values(LocationClass) as [string, ...string[]], {
    required_error: 'Class is required.',
  }),
  provider: z.enum(Object.values(LocationProvider) as [string, ...string[]], {
    required_error: 'Provider is required.',
  }),
  cityCode: z.string({ required_error: 'City code is required.' }),
  resourceVersion: z.string().optional(),
  labels: z.array(z.string()).optional(),
})

// Combined schema with discriminated union for providerConfig
export const newLocationSchema = baseLocationSchema
  .and(
    z.object({
      providerConfig: z.discriminatedUnion('provider', [gcpProviderSchema]),
    }),
  )
  .superRefine((val, ctx) => {
    if (val.provider === LocationProvider.GCP && !val.providerConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GCP configuration is required when provider is GCP',
        path: ['providerConfig'],
      })
    }
  })

export type BaseLocationSchema = z.infer<typeof baseLocationSchema>
export type NewLocationSchema = z.infer<typeof newLocationSchema>
export type GCPProviderSchema = z.infer<typeof gcpProviderSchema>
