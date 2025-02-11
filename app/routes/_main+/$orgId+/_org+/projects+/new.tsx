import { CreateProjectForm } from '@/features/project/create-form'
import { routes } from '@/constants/routes'
import { ActionFunctionArgs } from 'react-router'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { validateCSRF } from '@/utils/csrf.server'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { redirectWithToast } from '@/utils/toast.server'
import { projectsControl } from '@/resources/control-plane/projects.control'
import { IProjectControlResponse } from '@/resources/interfaces/project.interface'
import { getPathWithParams } from '@/utils/path'

export async function action({ request, params }: ActionFunctionArgs) {
  // User Session
  await isAuthenticated(
    request,
    getPathWithParams(routes.org.root, { orgId: params.orgId }),
    true,
  )

  // Validate CSRF token
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    // Validate form data with Zod
    const entries = Object.fromEntries(formData)
    const validated = newProjectSchema.parse(entries)

    const project: IProjectControlResponse = await projectsControl.createProject(
      validated.orgEntityId,
      validated,
    )

    // TODO: temporary solution for handle delay on new project
    // https://github.com/datum-cloud/cloud-portal/issues/45
    return redirectWithToast(
      getPathWithParams(routes.projects.setup, {
        orgId: params.orgId,
        projectId: project.name,
      }),
      {
        title: 'Project created successfully!',
        description: 'You have successfully created a project.',
      },
    )
  } catch (error) {
    return redirectWithToast(
      getPathWithParams(routes.projects.new, { orgId: params.orgId }),
      {
        title: 'Error!',
        description: error instanceof Error ? error.message : 'Something went wrong',
      },
    )
  }
}

export default function NewProject() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full max-w-2xl flex-col items-center gap-4">
        <CreateProjectForm />
      </div>
    </div>
  )
}
