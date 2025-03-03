import { routes } from '@/constants/routes'
import { WorkloadForm } from '@/features/workload/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { updateWorkloadSchema } from '@/resources/schemas/workload.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { yamlToJson } from '@/utils/editor'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  useLoaderData,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { workloadsControl } = context as AppLoadContext
  const { projectId, workloadId } = params

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  const workload = await workloadsControl.getWorkload(projectId, workloadId)

  return workload
}, authMiddleware)

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, workloadId, orgId } = params
    const { workloadsControl } = context as AppLoadContext

    if (!projectId || !workloadId) {
      throw new CustomError('Project ID and workload ID are required', 400)
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: updateWorkloadSchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const value = parsed.value
      const format = value.format

      // Convert the configuration to JSON for custom resource
      const spec = JSON.parse(
        format === 'yaml' ? yamlToJson(value.configuration) : value.configuration,
      )

      const payload = {
        resourceVersion: value.resourceVersion,
        spec,
      }

      const dryRunRes = await workloadsControl.updateWorkload(
        projectId,
        workloadId,
        payload,
        true,
      )

      if (dryRunRes) {
        await workloadsControl.updateWorkload(projectId, workloadId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.deploy.workloads.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Workload updated',
          description: 'Workload updated successfully',
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

export default function EditWorkload() {
  const data = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <WorkloadForm defaultValue={data} />
    </div>
  )
}
