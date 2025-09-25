import { createNameSchema } from '@/utils/helpers/validation.helper';
import { z } from 'zod';

export const nameSchema = z.object({
  name: createNameSchema(),
});

export const labelFormSchema = z.object({
  key: z
    .string({ error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Key must contain only letters, numbers, underscores, dots, or hyphens'
    ),
  value: z.string({ error: 'Value is required' }).min(1, { message: 'Value is required' }),
});

export const annotationFormSchema = z.object({
  key: z
    .string({ error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .regex(
      /^([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]\/([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]$|^([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]$/,
      'Key must be a valid Kubernetes annotation key (e.g., example.com/key or simple-key)'
    ),
  value: z.string({ error: 'Value is required' }).min(1, { message: 'Value is required' }),
});

export const metadataSchema = z
  .object({
    labels: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
  })
  .and(nameSchema);

// Generic Schemas
export type NameSchema = z.infer<typeof nameSchema>;
export type MetadataSchema = z.infer<typeof metadataSchema>;

// Form Schemas
export type AnnotationFormSchema = z.infer<typeof annotationFormSchema>;
export type LabelFormSchema = z.infer<typeof labelFormSchema>;
