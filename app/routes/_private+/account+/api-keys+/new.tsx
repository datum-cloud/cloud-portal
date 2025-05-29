// /* eslint-disable @typescript-eslint/no-unused-vars */
// import { ApiKeyForm } from '@/features/api-key/form'
// import { validateCSRF } from '@/modules/cookie/csrf.server'
// import { dataWithToast, redirectWithToast } from '@/modules/cookie/toast.server'
// import { getUserSession } from '@/modules/cookie/user.server'
// import { GraphqlClient } from '@/modules/graphql/graphql'
// import { authMiddleware } from '@/modules/middleware/authMiddleware'
// import { withMiddleware } from '@/modules/middleware/middleware'
// import { createUserGql } from '@/resources/gql/user.gql'
// import { NewApiKeySchema, newApiKeySchema } from '@/resources/schemas/api-key.schema'
// import { mergeMeta, metaObject } from '@/utils/meta'
// import { parseWithZod } from '@conform-to/zod'
// import { ActionFunctionArgs, AppLoadContext, MetaFunction } from 'react-router'
// export const meta: MetaFunction = mergeMeta(() => {
//   return metaObject('New API Key')
// })
// export const action = withMiddleware(async ({ request, context }: ActionFunctionArgs) => {
//   const { gqlClient } = context as AppLoadContext
//   const userGql = createUserGql(gqlClient as GraphqlClient)
//   const clonedRequest = request.clone()
//   const formData = await clonedRequest.formData()
//   try {
//     await validateCSRF(formData, clonedRequest.headers)
//     const parsed = parseWithZod(formData, { schema: newApiKeySchema })
//     if (parsed.status !== 'success') {
//       throw new Error('Invalid form data')
//     }
//     const payload = parsed.value as NewApiKeySchema
//     const { user } = await getUserSession(request)
//     // const orgId = session.get('currentOrgId')
//     // const apiKey = await userGql.createApiKey({
//     //   ...payload,
//     //   expiresAt:
//     //     payload.expiresAt === 0
//     //       ? undefined
//     //       : addDays(new Date(), Number(payload.expiresAt)).toISOString(),
//     //   ownerId: user?.sub,
//     //   // TODO: Need more information, because it's array and on the old portal use default org of user
//     //   orgIds: [orgId],
//     // })
//     // session.set('apiKey', apiKey.token)
//     return redirectWithToast('/account/api-keys', {
//       title: 'API Key Created',
//       description: 'API Key created successfully',
//       type: 'success',
//     })
//   } catch (error) {
//     return dataWithToast(null, {
//       title: 'Error',
//       description:
//         error instanceof Error ? error.message : (error as Response).statusText,
//       type: 'error',
//     })
//   }
// }, authMiddleware)
// export default function NewApiKey() {
//   return (
//     <div className="mx-auto w-full max-w-lg py-8">
//       <ApiKeyForm />
//     </div>
//   )
// }
import { ComingSoon } from '@/components/coming-soon/coming-soon';

export default function ApiKeys() {
  return <ComingSoon />;
}
