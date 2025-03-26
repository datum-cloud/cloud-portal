import { routes } from '@/constants/routes'
import { WorkloadUpdateForm } from '@/features/workload/stepper/update-form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { newWorkloadSchema } from '@/resources/schemas/workload.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  useLoaderData,
  useParams,
} from 'react-router'

export const loader = withMiddleware(async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, workloadId } = params

  const { controlPlaneClient } = context as AppLoadContext
  const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)

  if (!projectId || !workloadId) {
    throw new CustomError('Project ID and workload ID are required', 400)
  }

  // TODO: Need Best Way to retrieve workload data from parent layout route
  // Current implementation requires duplicate workload fetch since routes use workloadId parameter instead of uid
  const workload = await workloadsControl.detail(projectId, workloadId)

  if (!workload) {
    throw new CustomError('Workload not found', 404)
  }

  return workload
}, authMiddleware)

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, workloadId, orgId } = params
    const { controlPlaneClient } = context as AppLoadContext
    const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)

    if (!projectId || !workloadId) {
      throw new CustomError('Project ID and workload ID are required', 400)
    }

    const clonedRequest = request.clone()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await clonedRequest.json()

    try {
      // Extract CSRF token from JSON payload
      const csrfToken = payload.csrf
      const resourceVersion = payload.resourceVersion

      // Create FormData to validate CSRF token
      const formData = new FormData()
      formData.append('csrf', csrfToken)

      // Validate the CSRF token against the request headers
      await validateCSRF(formData, request.headers)

      // Validate form data with Zod
      const parsed = newWorkloadSchema.safeParse(payload)

      if (!parsed.success) {
        throw new Error('Invalid form data')
      }

      const dryRunRes = await workloadsControl.update(
        projectId,
        workloadId,
        payload,
        resourceVersion,
        true,
      )

      if (dryRunRes) {
        await workloadsControl.update(
          projectId,
          workloadId,
          payload,
          resourceVersion,
          false,
        )
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

export default function SettingsWorkload() {
  const data = useLoaderData<typeof loader>()
  const { projectId, orgId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <WorkloadUpdateForm projectId={projectId} orgId={orgId} defaultValue={data} />
    </div>
  )
}
