import { createOrganizationsControl } from '@/resources/control-plane';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/organizations' as const;

export const loader = async ({ context }: LoaderFunctionArgs) => {
  const { iamResourceClient } = context as AppLoadContext;

  try {
    // get default organization
    const orgAPI = createOrganizationsControl(iamResourceClient as Client);
    const organizations = await orgAPI.list();

    // await cache.setItem('organizations', organizations);
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
