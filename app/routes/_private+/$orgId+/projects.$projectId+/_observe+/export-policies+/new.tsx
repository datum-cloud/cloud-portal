import { routes } from '@/constants/routes'
import { ExportPolicyForm } from '@/features/observe/export-policies/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createExportPoliciesControl } from '@/resources/control-plane/export-policies.control'
import { exportPolicySchema } from '@/resources/schemas/export-policy.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction, useParams } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Export Policy')
})

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { controlPlaneClient } = context as AppLoadContext
    const { projectId, orgId } = params

    const exportPoliciesControl = createExportPoliciesControl(
      controlPlaneClient as Client,
    )

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)
      const parsed = parseWithZod(formData, { schema: exportPolicySchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const dryRunRes = await exportPoliciesControl.create(projectId, parsed.value, true)

      if (dryRunRes) {
        await exportPoliciesControl.create(projectId, parsed.value, false)
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
  },
  authMiddleware,
)

export default function ObserveExportPoliciesNewPage() {
  const { projectId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <ExportPolicyForm projectId={projectId} />
    </div>
  )
}
