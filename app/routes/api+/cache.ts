import { ActionFunctionArgs, AppLoadContext } from 'react-router';

export const ROUTE_PATH = '/api/cache' as const;

export async function action({ context }: ActionFunctionArgs) {
  const { cache } = context as AppLoadContext;

  return await cache.clear();
}
