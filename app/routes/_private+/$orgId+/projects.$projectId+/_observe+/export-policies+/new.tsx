import { routes } from '@/constants/routes'
import { ExportPolicyStepperForm } from '@/features/observe/export-policies/form/stepper-form'
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control'
import { newExportPolicySchema } from '@/resources/schemas/export-policy.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useParams } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Export Policy')
})

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const { projectId, orgId } = params

  const exportPoliciesControl = createExportPoliciesControl(controlPlaneClient as Client)

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

    const parsed = newExportPolicySchema.safeParse(payload)

    if (!parsed.success) {
      throw new Error('Invalid form data')
    }

    const dryRunRes = await exportPoliciesControl.create(projectId, parsed.data, true)

    if (dryRunRes) {
      await exportPoliciesControl.create(projectId, parsed.data, false)
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.observe.exportPolicies.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Export policy created successfully',
        description: 'You have successfully created an export policy.',
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

export default function ObserveExportPoliciesNewPage() {
  const { projectId } = useParams()
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyStepperForm projectId={projectId} />
    </div>
  )
}
