import { routes } from '@/constants/routes'
import { CreateLocationForm } from '@/features/location/form/create-form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createLocationsControl } from '@/resources/control-plane/locations.control'
import { NewLocationSchema, newLocationSchema } from '@/resources/schemas/location.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { CustomError } from '@/utils/errorHandle'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import {
  ActionFunctionArgs,
  AppLoadContext,
  LoaderFunctionArgs,
  useLoaderData,
} from 'react-router'

export const loader = withMiddleware(async ({ params, context }: LoaderFunctionArgs) => {
  const { projectId, locationId } = params
  const { controlPlaneClient } = context as AppLoadContext
  const locationsControl = createLocationsControl(controlPlaneClient as Client)

  if (!projectId || !locationId) {
    throw new CustomError('Project ID and location ID are required', 400)
  }

  const location = await locationsControl.getLocation(projectId, locationId)

  return location
}, authMiddleware)

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, locationId, orgId } = params
    const { controlPlaneClient } = context as AppLoadContext
    const locationsControl = createLocationsControl(controlPlaneClient as Client)

    if (!projectId || !locationId) {
      throw new CustomError('Project ID and location ID are required', 400)
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: newLocationSchema })

      const payload = parsed.payload as NewLocationSchema

      // First try with dryRun to validate
      const dryRunRes = await locationsControl.updateLocation(
        projectId,
        locationId,
        payload,
        true,
      )

      // If dryRun succeeds, update for real
      if (dryRunRes) {
        await locationsControl.updateLocation(projectId, locationId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.locations.root, {
          orgId,
          projectId,
        }),
        {
          title: 'Location updated',
          description: 'Location updated successfully',
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

export default function EditLocation() {
  const location = useLoaderData<typeof loader>()

  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <CreateLocationForm defaultValue={location} />
    </div>
  )
}
