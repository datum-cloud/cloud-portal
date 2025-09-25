import { metadataSchema } from './metadata.schema';
import { LocationClass, LocationProvider } from '@/resources/interfaces/location.interface';
import { z } from 'zod';

export const gcpProviderSchema = z.object({
  provider: z.literal(LocationProvider.GCP),
  projectId: z.string({ error: 'Project ID is required.' }),
  region: z.string({ error: 'Region is required.' }),
  zone: z.string({ error: 'Zone is required.' }),
});

export const baseLocationSchema = z
  .object({
    class: z.enum(Object.values(LocationClass) as [string, ...string[]], {
      error: 'Class is required.',
    }),
    provider: z.enum(Object.values(LocationProvider) as [string, ...string[]], {
      error: 'Provider is required.',
    }),
    cityCode: z.string({ error: 'City code is required.' }),
    resourceVersion: z.string().optional(),
  })
  .and(metadataSchema);

// Combined schema with discriminated union for providerConfig
export const newLocationSchema = baseLocationSchema
  .and(
    z.object({
      providerConfig: z.discriminatedUnion('provider', [gcpProviderSchema]),
    })
  )
  .superRefine((val, ctx) => {
    if (val.provider === LocationProvider.GCP && !val.providerConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'GCP configuration is required when provider is GCP',
        path: ['providerConfig'],
      });
    }
  });

export type BaseLocationSchema = z.infer<typeof baseLocationSchema>;
export type NewLocationSchema = z.infer<typeof newLocationSchema>;
export type GCPProviderSchema = z.infer<typeof gcpProviderSchema>;
