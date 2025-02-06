import { CreateProjectForm } from '@/features/project/create-form'
import { json, ActionFunctionArgs } from '@remix-run/node'
import { getUserSession } from '@/modules/auth/auth.server'
import { routes } from '@/constants/routes'
import { validateCSRF } from '@/utils/csrf.server'
import { checkHoneypot } from '@/utils/honeypot.server'
import { newProjectSchema } from '@/resources/schemas/project.schema'

export async function action({ request }: ActionFunctionArgs) {
  // User Session
  await getUserSession(request, routes.home, true)

  // Validate CSRF token
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()
  console.log(formData)
  try {
    await validateCSRF(formData, clonedRequest.headers)
    checkHoneypot(formData)

    // Validate form data with Zod
    const data = Object.fromEntries(formData)
    const validated = newProjectSchema.parse(data)

    console.log(validated)

    // Process the validated data
    // e.g., save to database, send email, etc.

    return json({ success: true })
  } catch (error) {
    console.log(error)
    if (error instanceof Error) {
      return json({ error: error.message }, { status: 400 })
    }
    return json({ error: 'Something went wrong' }, { status: 500 })
  }
}

export default function OnboardProject() {
  return <CreateProjectForm />
}
