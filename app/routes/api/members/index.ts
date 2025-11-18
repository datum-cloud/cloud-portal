import { createMembersControl } from '@/resources/control-plane/resource-manager/members.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/members' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient, cache } = context as AppLoadContext;
    const membersControl = createMembersControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');
    // const noCache = false;

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // const key = `members:${orgId}`;

    // // Try to get cached secrets if caching is enabled
    // const [isCached, cachedMembers] = await Promise.all([
    //   !noCache && cache.hasItem(key),
    //   !noCache && cache.getItem(key),
    // ]);

    // // Return cached secrets if available and caching is enabled
    // if (isCached && cachedMembers) {
    //   return data({ success: true, data: cachedMembers }, { status: 200 });
    // }

    // Fetch fresh members from control plane
    const members = await membersControl.list(orgId);

    // Cache the fresh members if caching is enabled
    // await cache.setItem(key, members).catch((error) => {
    //   console.error('Failed to cache members:', error);
    // });

    return data({ success: true, data: members }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
