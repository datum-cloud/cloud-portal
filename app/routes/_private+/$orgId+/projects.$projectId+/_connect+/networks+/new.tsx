import { routes } from '@/constants/routes'
import NetworkForm from '@/features/network/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { NewNetworkSchema, newNetworkSchema } from '@/resources/schemas/network.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, orgId } = params
    const { networksControl } = context as AppLoadContext

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, request.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: newNetworkSchema })

      if (parsed.status !== 'success') {
        return dataWithToast(
          {},
          {
            title: 'Error',
            description: 'Invalid form data',
            type: 'error',
          },
        )
      }

      const payload = parsed.value as NewNetworkSchema
      const dryRunRes = await networksControl.createNetwork(projectId, payload, true)

      if (dryRunRes) {
        await networksControl.createNetwork(projectId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.networks.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Network created successfully',
          description: 'You have successfully created a network.',
          type: 'success',
        },
      )
    } catch (error) {
      return dataWithToast(
        {},
        {
          title: 'Error',
          description:
            error instanceof Error ? error.message : (error as Response).statusText,
          type: 'error',
        },
      )
    }
  },
  authMiddleware,
)

export default function ProjectConnectNetworksNew() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <NetworkForm />
    </div>
  )
}
