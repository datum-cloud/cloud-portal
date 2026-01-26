import { getGraphqlUrl } from '@/resources/base/utils';
import { ApolloClient, InMemoryCache } from '@apollo/client';
import { HttpLink } from '@apollo/client';

export function createGqlClient(accessToken?: string) {
  return new ApolloClient({
    link: new HttpLink({
      uri: getGraphqlUrl(),
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: 'include', // Include cookies for client-side requests
    }),
    cache: new InMemoryCache(),
  });
}
