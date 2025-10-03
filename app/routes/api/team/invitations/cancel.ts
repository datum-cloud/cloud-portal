import { redirectWithToast } from '@/modules/cookie/toast.server';
import { createInvitationsControl } from '@/resources/control-plane';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/team/invitations/cancel' as const;

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
      throw new BadRequestError('Invitation ID is required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

    await invitationsControl.delete(orgId as string, id as string);

    if (redirectUri) {
      return redirectWithToast(redirectUri as string, {
        title: 'Invitation cancelled successfully',
        description: 'The invitation has been cancelled successfully',
        type: 'success',
      });
    }

    return data({ success: true, message: 'Invitation cancelled successfully' }, { status: 200 });
  } catch (error: any) {
    return data({ success: false, error: error.message }, { status: error.status });
  }
};
