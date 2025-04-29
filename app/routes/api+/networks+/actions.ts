import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createNetworksControl } from '@/resources/control-plane/networks.control'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import {
  NewNetworkSchema,
  newNetworkSchema,
  UpdateNetworkSchema,
  updateNetworkSchema,
} from '@/resources/schemas/network.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { CustomError } from '@/utils/errorHandle'
import { dataWithToast } from '@/utils/toast.server'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const ROUTE_PATH = '/api/networks/actions' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const networksControl = createNetworksControl(controlPlaneClient as Client)

  try {
    const clonedRequest = request.clone()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = await clonedRequest.json()

    const { projectId } = payload

    if (!projectId) {
      throw new CustomError('Project ID is required', 400)
    }

    // Extract CSRF token from JSON payload
    const csrfToken = payload?.csrf

    // Create FormData to validate CSRF token
    const formData = new FormData()
    formData.append('csrf', csrfToken)

    // Validate the CSRF token against the request headers
    await validateCSRF(formData, request.headers)

    switch (request.method) {
      case 'POST': {
        const parsed = newNetworkSchema.safeParse(payload)

        if (!parsed.success) {
          throw new Error('Invalid form data')
        }

        const formattedPayload = parsed.data as NewNetworkSchema

        const dryRunRes = await networksControl.create(
          projectId as string,
          formattedPayload,
          true,
        )

        let res: INetworkControlResponse | undefined
        if (dryRunRes) {
          res = (await networksControl.create(
            projectId as string,
            formattedPayload,
            false,
          )) as INetworkControlResponse
        }

        return dataWithToast(
          { success: true, data: res },
          {
            title: 'Network created successfully',
            description: 'The network has been created successfully',
            type: 'success',
          },
        )
      }
      case 'PUT': {
        const { networkId } = payload

        if (!networkId) {
          throw new CustomError('Network ID is required', 400)
        }

        const parsed = updateNetworkSchema.safeParse(payload)

        if (!parsed.success) {
          throw new Error('Invalid form data')
        }

        const formattedPayload = parsed.data as UpdateNetworkSchema
        // First try with dryRun to validate
        const dryRunRes = await networksControl.update(
          projectId,
          networkId,
          formattedPayload,
          true,
        )

        // If dryRun succeeds, update for real
        let res: INetworkControlResponse | undefined
        if (dryRunRes) {
          res = (await networksControl.update(
            projectId,
            networkId,
            formattedPayload,
            false,
          )) as INetworkControlResponse
        }

        return dataWithToast(
          { success: true, data: res },
          {
            title: 'Network updated successfully',
            description: 'The network has been updated successfully',
            type: 'success',
          },
        )
      }
      default:
        throw new Error('Method not allowed')
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : (error as Response).statusText
    return dataWithToast(
      { success: false, message },
      {
        title: 'Network creation failed',
        description: message,
        type: 'error',
      },
    )
  }
}, authMiddleware)
