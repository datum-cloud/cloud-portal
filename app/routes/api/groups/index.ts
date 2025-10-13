import { createGroupsControl } from '@/resources/control-plane/iam/groups.control';
import { BadRequestError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { AppLoadContext, LoaderFunctionArgs, data } from 'react-router';

export const ROUTE_PATH = '/api/groups' as const;

export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;
    const groupsControl = createGroupsControl(controlPlaneClient as Client);

    const url = new URL(request.url);
    const orgId = url.searchParams.get('orgId');

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    // Fetch fresh groups from control plane
    const groups = await groupsControl.list(orgId);

    return data({ success: true, data: groups }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
