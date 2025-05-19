import { routes } from '@/constants/routes'
import { HttpRouteForm } from '@/features/connect/http-route/form'
import { createHttpRoutesControl } from '@/resources/control-plane/http-routes.control'
import { IHttpRouteControlResponse } from '@/resources/interfaces/http-route.interface'
import { httpRouteSchema } from '@/resources/schemas/http-route.schema'
import { validateCSRF } from '@/utils/csrf'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast'
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
  return metaObject(`Edit ${(data as IHttpRouteControlResponse)?.name || 'HTTP Route'}`)
})

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, httpId } = params

  if (!projectId || !httpId) {
    throw new Error('Project ID and HTTP Route ID are required')
  }

  const { controlPlaneClient } = context as AppLoadContext
  const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client)

  const httpRoute = await httpRoutesControl.detail(projectId, httpId)

  return httpRoute
}

export const action = async ({ params, context, request }: ActionFunctionArgs) => {
  const { projectId, httpId, orgId } = params

  if (!projectId || !httpId) {
    throw new Error('Project ID and HTTP Route ID are required')
  }

  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    const parsed = parseWithZod(formData, { schema: httpRouteSchema })

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data')
    }

    const { controlPlaneClient } = context as AppLoadContext
    const httpRoutesControl = createHttpRoutesControl(controlPlaneClient as Client)

    const dryRunRes = await httpRoutesControl.update(
      projectId,
      httpId,
      parsed.value,
      true,
    )

    if (dryRunRes) {
      await httpRoutesControl.update(projectId, httpId, parsed.value, false)
    }

    return redirectWithToast(
      getPathWithParams(routes.projects.connect.httpRoutes.root, {
        orgId,
        projectId,
      }),
      {
        title: 'HTTP Route updated successfully',
        description: 'You have successfully updated an HTTP route.',
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

export default function ConnectHttpRoutesEditPage() {
  const httpRoute = useLoaderData<typeof loader>()
  const { projectId } = useParams()

  return (
    <div className="mx-auto w-full max-w-3xl py-8">
      <HttpRouteForm projectId={projectId} defaultValue={httpRoute} />
    </div>
  )
}
