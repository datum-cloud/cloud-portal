import { ApiKeyForm } from '@/features/api-key/form'
import { commitSession, getSession } from '@/modules/auth/authSession.server'
import { withMiddleware } from '@/modules/middleware/middleware'
import { NewApiKeySchema, newApiKeySchema } from '@/resources/schemas/api-key.schema'
import { validateCSRF } from '@/utils/csrf.server'
import { dataWithToast, redirectWithToast } from '@/utils/toast.server'
import { parseWithZod } from '@conform-to/zod'
import { addDays } from 'date-fns'
import { ActionFunctionArgs, AppLoadContext } from 'react-router'

export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
  const { userGql } = context as AppLoadContext
  const clonedRequest = request.clone()
  const formData = await clonedRequest.formData()

  try {
    await validateCSRF(formData, clonedRequest.headers)
    const parsed = parseWithZod(formData, { schema: newApiKeySchema })

    if (parsed.status !== 'success') {
      throw new Error('Invalid form data')
    }

    const payload = parsed.value as NewApiKeySchema

    const session = await getSession(request.headers.get('Cookie'))
    const userId = session.get('userId')
    const orgId = session.get('currentOrgId')

    const apiKey = await userGql.createApiKey({
      ...payload,
      expiresAt:
        payload.expiresAt === 0
          ? undefined
          : addDays(new Date(), Number(payload.expiresAt)).toISOString(),
      ownerId: userId,
      // TODO: Need more information, because it's array and on the old portal use default org of user
      orgIds: [orgId],
    })

    session.set('apiKey', apiKey.token)

    return redirectWithToast(
      '/account/api-keys',
      {
        title: 'API Key Created',
        description: 'API Key created successfully',
        type: 'success',
      },
      {
        headers: {
          'Set-Cookie': await commitSession(session),
        },
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
})

export default function NewApiKey() {
  return (
    <div className="mx-auto w-full max-w-lg py-8">
      <ApiKeyForm />
    </div>
  )
}
