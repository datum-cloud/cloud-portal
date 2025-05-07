import { routes } from '@/constants/routes'
import { EndpointSliceForm } from '@/features/connect/endpoint-slice/form'
import { validateCSRF } from '@/modules/cookie/csrf.server'
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server'
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control'
import { endpointSliceSchema } from '@/resources/schemas/endpoint-slice.schema'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Endpoint Slice')
})

export const action = async ({ request, context, params }: ActionFunctionArgs) => {
  const { projectId, orgId } = params

  if (!projectId) {
    throw new Error('Project ID is required')
  }

  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    const parsed = parseWithZod(formData, { schema: endpointSliceSchema })

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data')
    }

    const { controlPlaneClient } = context as AppLoadContext
    const endpointSlicesControl = createEndpointSlicesControl(
      controlPlaneClient as Client,
    )

    const dryRunRes = await endpointSlicesControl.create(projectId, parsed.value, true)

    if (dryRunRes) {
      await endpointSlicesControl.create(projectId, parsed.value, false)
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.connect.endpointSlices.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Endpoint Slice created successfully',
        description: 'You have successfully created an endpoint slice.',
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

export default function ConnectEndpointSlicesNewPage() {
  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <EndpointSliceForm />
    </div>
  )
}
