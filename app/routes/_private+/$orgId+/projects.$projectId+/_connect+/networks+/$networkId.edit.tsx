import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { CustomError } from '@/utils/errorHandle'
import {
  AppLoadContext,
  useLoaderData,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from 'react-router'
import NetworkForm from '@/features/network/form'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { validateCSRF } from '@/utils/csrf.server'
import { parseWithZod } from '@conform-to/zod'
import { getPathWithParams } from '@/utils/path'
import { routes } from '@/constants/routes'
import { updateNetworkSchema } from '@/resources/schemas/network.schema'
export const loader = withMiddleware(async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, networkId } = params
  const { networksControl } = context as AppLoadContext

  if (!projectId || !networkId) {
    throw new CustomError('Project ID and network ID are required', 400)
  }

  const network = await networksControl.getNetwork(projectId, networkId)

  return network
}, authMiddleware)

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, networkId, orgId } = params
    const { networksControl } = context as AppLoadContext

    if (!projectId || !networkId) {
      throw new CustomError('Project ID and network ID are required', 400)
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: updateNetworkSchema })

      if (parsed.status !== 'success') {
        return dataWithToast(
          {},
          {
            title: 'Error',
            description: Array.isArray(parsed.error)
              ? parsed.error[0]
              : (parsed.error ?? 'An error occurred'),
            type: 'error',
          },
        )
      }

      const payload = parsed.value

      // First try with dryRun to validate
      const dryRunRes = await networksControl.updateNetwork(
        projectId,
        networkId,
        payload,
        true,
      )

      // If dryRun succeeds, update for real
      if (dryRunRes) {
        await networksControl.updateNetwork(projectId, networkId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.networks.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Network updated',
          description: 'Network updated successfully',
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

export default function EditNetwork() {
  const network = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <NetworkForm defaultValue={network} />
    </div>
  )
}
