import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createMembersControl } from '@/resources/control-plane/resource-manager/members.control';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/members/remove' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== 'DELETE') {
    throw new HttpError('Method not allowed', 405);
  }

  try {
    const formData = Object.fromEntries(await request.formData());

    const { orgId, id, redirectUri } = formData;

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    if (!id) {
      throw new BadRequestError('Member ID is required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const membersControl = createMembersControl(controlPlaneClient as Client);

    await membersControl.delete(orgId as string, id as string);

    if (redirectUri) {
      return redirectWithToast(redirectUri as string, {
        title: 'Member removed successfully',
        description: 'The member has been removed successfully',
        type: 'success',
      });
    }

    return data({ success: true, message: 'Member removed successfully' }, { status: 200 });
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
