import { GraphQLClient } from 'graphql-request'

// const requestMiddleware: RequestMiddleware = async (request) => {
//   const session = await getSession(request?.headers?.)
//   const token = session.get('user')?.accessToken
//   return {
//     ...request,
//     headers: { ...request.headers, Authorization: `Bearer ${token}` },
//   }
// }

const client = new GraphQLClient(process.env.GRAPHQL_URL ?? '')

export default client
