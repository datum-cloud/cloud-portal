import { routes } from '@/constants/routes'
import { WorkloadForm } from '@/features/workload/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { workloadSchema } from '@/resources/schemas/workload.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { yamlToJson } from '@/utils/editor'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast, dataWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { workloadsControl } = context as AppLoadContext
    const { projectId, orgId } = params

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)
      const parsed = parseWithZod(formData, { schema: workloadSchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const value = parsed.value
      const format = value.format

      // Convert the configuration to JSON for custom resource
      const payload = JSON.parse(
        format === 'yaml' ? yamlToJson(value.configuration) : value.configuration,
      )

      const dryRunRes = await workloadsControl.createWorkload(projectId, payload, true)

      if (dryRunRes) {
        await workloadsControl.createWorkload(projectId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.deploy.workloads.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Workload created successfully',
          description: 'You have successfully created a workload.',
          type: 'success',
        },
      )
    } catch (error) {
      return dataWithToast(null, {
        title: 'Error',
        description:
          error instanceof Error ? error.message : (error as Response).statusText,
        type: 'error',
      })
    }
  },
  authMiddleware,
)

export default function NewWorkload() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <WorkloadForm />
    </div>
  )
}
