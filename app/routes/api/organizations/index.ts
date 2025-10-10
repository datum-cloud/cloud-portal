import { createOrganizationsControl } from '@/resources/control-plane';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations' as const;

export const loader = async ({ context, request }: LoaderFunctionArgs) => {
  const { cache, iamResourceClient } = context as AppLoadContext;

  const url = new URL(request.url);
  const noCache = url.searchParams.get('noCache');

  // Try to get cached networks if caching is enabled
  const [isCached, cachedOrganizations] = await Promise.all([
    !noCache && cache.hasItem('organizations'),
    !noCache && cache.getItem('organizations'),
  ]);

  // Return cached networks if available and caching is enabled
  if (isCached && cachedOrganizations) {
    return data({ success: true, data: cachedOrganizations }, { status: 200 });
  }

  try {
    // get default organization
    const orgAPI = createOrganizationsControl(iamResourceClient as Client);
    const organizations = await orgAPI.list();

    await cache.setItem('organizations', organizations);
    return data({ success: true, data: organizations });
  } catch (error) {
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
};
