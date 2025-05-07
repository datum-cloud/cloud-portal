import { routes } from '@/constants/routes'
import { validateCSRF } from '@/modules/cookie/csrf.server'
import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server'
import { authMiddleware } from '@/modules/middleware/auth.middleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createSecretsControl } from '@/resources/control-plane/secrets.control'
import { secretEditSchema } from '@/resources/schemas/secret.schema'
import { CustomError } from '@/utils/errorHandle'
import { convertLabelsToObject } from '@/utils/misc'
import { getPathWithParams } from '@/utils/path'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router'

export const ROUTE_PATH = '/api/config/secrets/actions' as const

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { controlPlaneClient } = context as AppLoadContext
  const secretControl = createSecretsControl(controlPlaneClient as Client)

  switch (request.method) {
    case 'PATCH': {
      const clonedRequest = request.clone()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = await clonedRequest.json()

      const { projectId, secretId, csrf, action } = payload

      if (!projectId || !secretId) {
        throw new CustomError('Project ID and secret ID are required', 400)
      }

      try {
        // Create FormData to validate CSRF token
        const formData = new FormData()
        formData.append('csrf', csrf)

        // Validate the CSRF token against the request headers
        await validateCSRF(formData, request.headers)

        // // Validate form data with Zod
        const parsed = secretEditSchema.safeParse(payload)

        if (!parsed.success) {
          throw new Error('Invalid form data')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any = parsed.data
        if (action === 'metadata') {
          body = {
            metadata: {
              annotations: convertLabelsToObject(body?.annotations ?? []),
              labels: convertLabelsToObject(body?.labels ?? []),
            },
          }
        }

        // First try with dryRun to validate
        const dryRunRes = await secretControl.update(projectId, secretId, body, true)

        // If dryRun succeeds, update for real
        if (dryRunRes) {
          await secretControl.update(projectId, secretId, body, false)
        }

        return data({ success: true })
      } catch (error) {
        return dataWithToast(null, {
          title: 'Error',
          description:
            error instanceof Error ? error.message : (error as Response).statusText,
          type: 'error',
        })
      }
    }
    case 'DELETE': {
      const formData = Object.fromEntries(await request.formData())
      const { secretId, projectId, orgId } = formData

      await secretControl.delete(projectId as string, secretId as string)

      return redirectWithToast(
        getPathWithParams(routes.projects.config.secrets.root, {
          orgId: orgId as string,
          projectId: projectId as string,
        }),
        {
          title: 'Secret deleted successfully',
          description: 'The secret has been deleted successfully',
          type: 'success',
        },
      )
    }
    default:
      throw new Error('Method not allowed')
  }
}, authMiddleware)
