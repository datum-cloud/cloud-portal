import { routes } from '@/constants/routes'
import { GatewayForm } from '@/features/connect/gateway/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createGatewaysControl } from '@/resources/control-plane/gateways.control'
import { gatewaySchema } from '@/resources/schemas/gateway.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Gateway')
})

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { projectId, orgId } = params

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const { controlPlaneClient } = context as AppLoadContext
    const gatewaysControl = createGatewaysControl(controlPlaneClient as Client)

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      const parsed = parseWithZod(formData, { schema: gatewaySchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const dryRunRes = await gatewaysControl.create(projectId, parsed.value, true)

      if (dryRunRes) {
        await gatewaysControl.create(projectId, parsed.value, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.connect.gateways.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Gateway created successfully',
          description: 'You have successfully created a gateway.',
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

export default function ConnectGatewaysNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <GatewayForm />
    </div>
  )
}
