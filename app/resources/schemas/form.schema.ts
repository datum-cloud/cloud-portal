import { z } from 'zod'

export const formSchema = z.object({
  csrf: z.string(),
})
