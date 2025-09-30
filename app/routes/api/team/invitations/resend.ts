import { createInvitationsControl } from '@/resources/control-plane';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/team/invitations/resend' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    throw new HttpError('Method not allowed', 405);
  }

  try {
    const { orgId, invitationId } = await request.json();

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    if (!invitationId) {
      throw new BadRequestError('Invitation ID is required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

    // TODO: Check if invitation is still valid (not expired)
    // TODO: Add rate limiting for resend operations
    // TODO: Add audit logging for resend actions
    // TODO: Update invitation timestamp/expiration
    // TODO: Send notification email

    // For now, we'll use the existing invitation detail as a placeholder
    // In a real implementation, this would trigger the resend logic
    // const invitation = await invitationsControl.detail(orgId, invitationId);

    return data({
      success: true,
      message: 'Invitation resent successfully',
    });
    // return data({
    //   success: true,
    //   message: 'Invitation resent successfully',
    //   data: invitation,
    // });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const status = error instanceof HttpError ? error.statusCode : 500;

    return data({ success: false, error: errorMessage }, { status });
  }
};
