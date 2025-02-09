import { CreateProjectForm } from '@/features/project/create-form'
import { routes } from '@/constants/routes'
import { data, ActionFunctionArgs } from 'react-router'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { validateCSRF } from '@/utils/csrf.server'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { createToastHeaders, redirectWithToast } from '@/utils/toast.server'

export async function action({ request }: ActionFunctionArgs) {
  // User Session
  await isAuthenticated(request, routes.home, true)

  // Validate CSRF token
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)

    // Validate form data with Zod
    const entries = Object.fromEntries(formData)
    const validated = newProjectSchema.parse(entries)

    // TODO: Process the validated data
    // e.g., save to database, send email, etc.

    console.log(validated)

    return redirectWithToast(routes.projects.detail('my-project-123'), {
      title: 'Project created successfully!',
      description: 'You have successfully created a project.',
    })
  } catch (error) {
    if (error instanceof Error) {
      return data(
        { error: error.message },
        {
          status: 400,
          headers: await createToastHeaders({
            title: 'Error!',
            description: error.message,
          }),
        },
      )
    }
    return data(
      { error: 'Something went wrong' },
      {
        status: 500,
        headers: await createToastHeaders({
          title: 'Error!',
          description: 'Something went wrong',
        }),
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
