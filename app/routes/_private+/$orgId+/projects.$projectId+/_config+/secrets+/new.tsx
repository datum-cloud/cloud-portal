import { routes } from '@/constants/routes'
import { SecretForm } from '@/features/secret/form/form'
import { validateCSRF } from '@/modules/cookie/csrf.server'
import { redirectWithToast, dataWithToast } from '@/modules/cookie/toast.server'
import { createSecretsControl } from '@/resources/control-plane/secrets.control'
import { SecretNewSchema, secretNewSchema } from '@/resources/schemas/secret.schema'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Secret')
})

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const { projectId, orgId } = params

  const secretControl = createSecretsControl(controlPlaneClient as Client)

  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    // Validate form data with Zod
    const parsed = parseWithZod(formData, { schema: secretNewSchema })

    const payload = parsed.payload as SecretNewSchema

    const dryRunRes = await secretControl.create(projectId, payload, true)

    if (dryRunRes) {
      await secretControl.create(projectId, payload, false)
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.config.secrets.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Secret created successfully',
        description: 'You have successfully created a secret.',
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

export default function ConfigSecretsNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <SecretForm />
    </div>
  )
}
