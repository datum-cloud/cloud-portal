import { routes } from '@/constants/routes'
import { ConfigMapForm } from '@/features/config-map/form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { updateConfigMapSchema } from '@/resources/schemas/config-map.schema'
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
  const { coreControl } = context as AppLoadContext
  const { projectId, configId } = params

  if (!projectId || !configId) {
    throw new CustomError('Project ID and config ID are required', 400)
  }

  const configMap = await coreControl.getConfigMap(projectId, configId)

  return configMap
}, authMiddleware)

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, configId, orgId } = params
    const { coreControl } = context as AppLoadContext

    if (!projectId || !configId) {
      throw new CustomError('Project ID and config ID are required', 400)
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: updateConfigMapSchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const value = parsed.value
      const format = value.format

      // Convert the configuration to JSON for custom resource
      const newContent = JSON.parse(
        format === 'yaml' ? yamlToJson(value.configuration) : value.configuration,
      )

      const payload = {
        resourceVersion: value.resourceVersion,
        metadata: {
          name: configId,
        },
        data: newContent,
      }

      const dryRunRes = await coreControl.updateConfigMap(
        projectId,
        configId,
        payload,
        true,
      )

      if (dryRunRes) {
        await coreControl.updateConfigMap(projectId, configId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.config.configMaps.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Config map updated',
          description: 'Config map updated successfully',
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

export default function EditConfigMap() {
  const data = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <ConfigMapForm defaultValue={data} />
    </div>
  )
}
