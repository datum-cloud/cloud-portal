import { createCodeEditorSchema } from '@/components/code-editor/code-editor.types'
import { z } from 'zod'

export const workloadSchema = createCodeEditorSchema('Workload').transform((data) => {
  return {
    configuration: data.content,
    format: data.format,
  }
})

export const updateWorkloadSchema = z
  .object({
    resourceVersion: z.string({ required_error: 'Resource version is required.' }),
  })
  .and(workloadSchema)
  .transform((data) => {
    return {
      resourceVersion: data.resourceVersion,
      configuration: data.configuration,
      format: data.format,
    }
  })

export type WorkloadSchema = z.infer<typeof workloadSchema>
export type UpdateWorkloadSchema = z.infer<typeof updateWorkloadSchema>
