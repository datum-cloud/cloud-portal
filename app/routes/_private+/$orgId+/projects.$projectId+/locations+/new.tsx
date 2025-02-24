import CreateLocationForm from '@/features/location/form/create-form'
import { NewLocationSchema, newLocationSchema } from '@/resources/schemas/location.schema'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { getPathWithParams } from '@/utils/path'
import { routes } from '@/constants/routes'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { validateCSRF } from '@/utils/csrf.server'
import { parseWithZod } from '@conform-to/zod'

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectId, orgId } = params
    const { locationsControl } = context as AppLoadContext

    if (!projectId) {
      throw new Error('Project ID is required')
    }

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: newLocationSchema })

      const payload = parsed.payload as NewLocationSchema

      // First try with dryRun to validate
      const dryRunRes = await locationsControl.createLocation(projectId, payload, true)

      // If dryRun succeeds, create for real
      if (dryRunRes) {
        await locationsControl.createLocation(projectId, payload, false)
      }

      return redirectWithToast(
        getPathWithParams(routes.projects.locations.edit, {
          orgId,
          projectId,
          locationId: payload?.name,
        }),
        {
          title: 'Location created successfully',
          description: 'You have successfully created a location.',
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

export default function NewLocation() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <CreateLocationForm />
    </div>
  )
}
