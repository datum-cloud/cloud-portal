import { z } from 'zod'

export const nameSchema = z.object({
  name: z
    .string({ required_error: 'Name is required.' })
    .min(6, { message: 'Name must be at least 6 characters long.' })
    .max(30, { message: 'Name must be less than 30 characters long.' })
    .regex(/^[a-z][a-z0-9-]*[a-z0-9]$/, {
      message:
        'Name must be kebab-case, start with a letter, and end with a letter or number',
    }),
})

export const labelFormSchema = z.object({
  key: z
    .string({ required_error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      'Key must contain only letters, numbers, underscores, dots, or hyphens',
    ),
  value: z
    .string({ required_error: 'Value is required' })
    .min(1, { message: 'Value is required' }),
})

export const annotationFormSchema = z.object({
  key: z
    .string({ required_error: 'Key is required' })
    .min(1, { message: 'Key is required' })
    .regex(
      /^([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]\/([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]$|^([a-z0-9A-Z][-a-z0-9A-Z_.]*)?[a-z0-9A-Z]$/,
      'Key must be a valid Kubernetes annotation key (e.g., example.com/key or simple-key)',
    ),
  value: z
    .string({ required_error: 'Value is required' })
    .min(1, { message: 'Value is required' }),
})

export const metadataSchema = z
  .object({
    labels: z.array(z.string()).optional(),
    annotations: z.array(z.string()).optional(),
  })
  .and(nameSchema)

// Generic Schemas
export type NameSchema = z.infer<typeof nameSchema>
export type MetadataSchema = z.infer<typeof metadataSchema>

// Form Schemas
export type AnnotationFormSchema = z.infer<typeof annotationFormSchema>
export type LabelFormSchema = z.infer<typeof labelFormSchema>
