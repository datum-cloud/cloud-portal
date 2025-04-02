import { routes } from '@/constants/routes'
import { WorkloadStepper } from '@/features/workload/form/stepper-form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { newWorkloadSchema } from '@/resources/schemas/workload.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { mergeMeta, generateMetaTitle } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useParams } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return [{ title: generateMetaTitle('New Workload') }]
})

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { controlPlaneClient } = context as AppLoadContext
    const { projectId, orgId } = params
    const workloadsControl = createWorkloadsControl(controlPlaneClient as Client)

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await clonedRequest.json()

    try {
      // Extract CSRF token from JSON payload
      const csrfToken = payload.csrf

      // Create FormData to validate CSRF token
      const formData = new FormData()
      formData.append('csrf', csrfToken)

      // Validate the CSRF token against the request headers
      await validateCSRF(formData, request.headers)

      const parsed = newWorkloadSchema.safeParse(payload)

      if (!parsed.success) {
        throw new Error('Invalid form data')
      }

      const dryRunRes = await workloadsControl.create(projectId, parsed.data, true)

      if (dryRunRes) {
        await workloadsControl.create(projectId, parsed.data, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.deploy.workloads.detail.root, {
          orgId,
          projectId,
          workloadId: 'metadata' in dryRunRes ? dryRunRes?.metadata?.name : '',
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
  const { projectId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <WorkloadStepper projectId={projectId} />
    </div>
  )
}
