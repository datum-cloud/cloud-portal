import { z } from 'zod'

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

export type AnnotationFormSchema = z.infer<typeof annotationFormSchema>
