import { routes } from '@/constants/routes'
import { CreateProjectForm } from '@/features/project/create-form'
import { authMiddleware } from '@/modules/middleware/authMiddleware'
import { withMiddleware } from '@/modules/middleware/middleware'
import { createProjectsControl } from '@/resources/control-plane/projects.control'
import { newProjectSchema, NewProjectSchema } from '@/resources/schemas/project.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { mergeMeta, metaObject } from '@/utils/meta'
import { getPathWithParams } from '@/utils/path'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { Client } from '@hey-api/client-axios'
import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router'

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('New Project')
})

export const action = withMiddleware(
  async ({ request, params, context }: ActionFunctionArgs) => {
    const { controlPlaneClient, cache } = context as AppLoadContext
    const projectsControl = createProjectsControl(controlPlaneClient as Client)

    const clonedRequest = request.clone()
    const formData = await clonedRequest.formData()

    try {
      await validateCSRF(formData, clonedRequest.headers)

      // Validate form data with Zod
      const parsed = parseWithZod(formData, { schema: newProjectSchema })

      if (parsed.status !== 'success') {
        throw new Error('Invalid form data')
      }

      const payload = parsed.value as NewProjectSchema

      // Dry run to validate
      const dryRunRes = await projectsControl.create(payload, true)

      // If dry run succeeds, create for real
      if (dryRunRes) {
        await projectsControl.create(payload, false)
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
      return dataWithToast(null, {
        title: 'Error!',
        description:
          error instanceof Error ? error.message : (error as Response).statusText,
        type: 'error',
      })
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
