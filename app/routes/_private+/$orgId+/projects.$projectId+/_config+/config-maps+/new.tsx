import { routes } from '@/constants/routes'
import { ConfigMapForm } from '@/features/config-map/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { configMapSchema } from '@/resources/schemas/config-map.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { getPathWithParams } from '@/utils/path'
import { redirectWithToast, dataWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const action = withMiddleware(
  async ({ request, context, params }: ActionFunctionArgs) => {
    const { coreControl } = context as AppLoadContext
    const { projectId, orgId } = params

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)
      const parsed = parseWithZod(formData, { schema: configMapSchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const dryRunRes = await coreControl.createConfigMap(projectId, parsed.value, true)

      if (dryRunRes) {
        await coreControl.createConfigMap(projectId, parsed.value, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.config.configMaps.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Config Map created successfully',
          description: 'You have successfully created a config map.',
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

export default function NewConfigMap() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <ConfigMapForm />
    </div>
  )
}
