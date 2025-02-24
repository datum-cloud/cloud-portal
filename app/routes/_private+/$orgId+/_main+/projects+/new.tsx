import { CreateProjectForm } from '@/features/project/create-form'
import { routes } from '@/constants/routes'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'
import { validateCSRF } from '@/utils/csrf.server'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { getPathWithParams } from '@/utils/path'
import { withMiddleware } from '@/modules/middleware/middleware'
import { authMiddleware } from '@/modules/middleware/authMiddleware'

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { projectsControl, cache } = context as AppLoadContext

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const entries = Object.fromEntries(formData)
      const payload = newProjectSchema.parse(entries)

      // Dry run to validate
      const dryRunRes = await projectsControl.createProject(payload, true)

      // If dry run succeeds, create for real
      if (dryRunRes) {
        await projectsControl.createProject(payload, false)
      }

      // Invalidate the projects cache
      await cache.removeItem(`projects:${payload.orgEntityId}`)

      // TODO: temporary solution for handle delay on new project
      // https://github.com/datum-cloud/cloud-portal/issues/45
      return redirectWithToast(
        getPathWithParams(`${routes.org.projects.setup}?projectId=${payload.name}`, {
          orgId: params.orgId,
        }),
        {
          title: 'Project created successfully!',
          description: 'You have successfully created a project.',
          type: 'success',
        },
      )
    } catch (error) {
      return dataWithToast(
        {},
        {
          title: 'Error!',
          description:
            error instanceof Error ? error.message : (error as Response).statusText,
          type: 'error',
        },
      )
    }
  },
  authMiddleware,
)

export default function NewProject() {
  return (
    <div className="mx-auto w-full max-w-2xl py-8">
      <CreateProjectForm />
    </div>
  )
}
