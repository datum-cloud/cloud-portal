import { routes } from '@/constants/routes'
import { WorkloadUpdateForm } from '@/features/workload/form/update-form'
import { validateCSRF } from '@/modules/cookie/csrf.server'
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server'
import { createWorkloadsControl } from '@/resources/control-plane/workloads.control'
import { IWorkloadControlResponse } from '@/resources/interfaces/workload.interface'
import { newWorkloadSchema } from '@/resources/schemas/workload.schema'
import { CustomError } from '@/utils/errorHandle'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import {
  ActionFunctionArgs,
  AppLoadContext,
  MetaFunction,
  useParams,
  useRouteLoaderData,
} from 'react-router'

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find(
    (match) =>
      match.id ===
      'routes/_private+/$orgId+/projects.$projectId+/_deploy+/workloads+/$workloadId+/_layout',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any

  const { workload } = match.data
  return metaObject(
    `Manage ${(workload as IWorkloadControlResponse)?.name || 'Workload'}`,
  )
})

export const action = async ({ request, params, context }: ActionFunctionArgs) => {
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
        title: 'Workload updated successfully',
        description: 'You have successfully updated a workload.',
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
}

export default function WorkloadEditPage() {
  const { workload } = useRouteLoaderData(
    'routes/_private+/$orgId+/projects.$projectId+/_deploy+/workloads+/$workloadId+/_layout',
  )
  const { projectId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <WorkloadUpdateForm projectId={projectId} defaultValue={workload} />
    </div>
  )
}
