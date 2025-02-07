import { CreateProjectForm } from '@/features/project/create-form'
import { ActionFunctionArgs, data } from 'react-router'
import { isAuthenticated } from '@/modules/auth/auth.server'
import { routes } from '@/constants/routes'
import { validateCSRF } from '@/utils/csrf.server'
import { newProjectSchema } from '@/resources/schemas/project.schema'
import { createToastHeaders } from '@/utils/toast.server'

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

    // Process the validated data
    // e.g., save to database, send email, etc.

    return data(
      { success: true, validated },
      {
        status: 200,
        headers: await createToastHeaders({
          title: 'Success!',
          description: 'Project created successfully.',
        }),
      },
    )
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

export default function OnboardProject() {
  return <CreateProjectForm />
}
