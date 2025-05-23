import { routes } from '@/constants/routes'
import { EndpointSliceForm } from '@/features/connect/endpoint-slice/form'
import { validateCSRF } from '@/modules/cookie/csrf.server'
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server'
import { createEndpointSlicesControl } from '@/resources/control-plane/endpoint-slices.control'
import { IEndpointSliceControlResponse } from '@/resources/interfaces/endpoint-slice.interface'
import { endpointSliceSchema } from '@/resources/schemas/endpoint-slice.schema'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  MetaFunction,
  useLoaderData,
  useParams,
} from 'react-router'

export const meta: MetaFunction = mergeMeta(({ data }) => {
  return metaObject(
    `Edit ${(data as IEndpointSliceControlResponse)?.name || 'Endpoint Slice'}`,
  )
})

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, endpointId } = params

  if (!projectId || !endpointId) {
    throw new Error('Project ID and endpoint ID are required')
  }

  const { controlPlaneClient } = context as AppLoadContext
  const endpointSlicesControl = createEndpointSlicesControl(controlPlaneClient as Client)

  const endpointSlice = await endpointSlicesControl.detail(projectId, endpointId)

  return endpointSlice
}

export const action = async ({ params, context, request }: ActionFunctionArgs) => {
  const { projectId, endpointId, orgId } = params

  if (!projectId || !endpointId) {
    throw new Error('Project ID and endpoint ID are required')
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

    const dryRunRes = await endpointSlicesControl.update(
      projectId,
      endpointId,
      parsed.value,
      true,
    )

    if (dryRunRes) {
      await endpointSlicesControl.update(projectId, endpointId, parsed.value, false)
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.connect.endpointSlices.root, {
        orgId,
        projectId,
      }),
      {
        title: 'Endpoint Slice updated successfully',
        description: 'You have successfully updated an endpoint slice.',
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

export default function ConnectEndpointSlicesEditPage() {
  const endpointSlice = useLoaderData<typeof loader>()
  const { projectId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <EndpointSliceForm projectId={projectId} defaultValue={endpointSlice} />
    </div>
  )
}
