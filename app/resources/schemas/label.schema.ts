import { z } from 'zod'

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

export type LabelFormSchema = z.infer<typeof labelFormSchema>
