import { createInvitationsControl } from '@/resources/control-plane';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { isBefore } from 'date-fns';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/team/invitations/update-state' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== 'PATCH') {
    throw new HttpError('Method not allowed', 405);
  }

  try {
    const formData = Object.fromEntries(await request.formData());

    const { orgId, invitationId, state, redirectUri } = formData;

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    if (!invitationId) {
      throw new BadRequestError('Invitation ID is required');
    }

    if (!state) {
      throw new BadRequestError('State is required');
    }

    // Validate state values
    if (!['Accepted', 'Declined'].includes(state as string)) {
      throw new BadRequestError('State must be either "Accepted" or "Declined"');
    }

    const { controlPlaneClient, cache } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

    // Get current invitation to validate
    const currentInvitation = await invitationsControl.detail(
      orgId as string,
      invitationId as string
    );

    // Check if invitation is expired
    if (currentInvitation.expirationDate) {
      const expirationDate = new Date(currentInvitation.expirationDate);
      const now = new Date();

      if (isBefore(expirationDate, now)) {
        throw new BadRequestError('This invitation link is no longer valid.');
      }
    }

    // Validate invitation state
    if (currentInvitation.state !== 'Pending') {
      throw new BadRequestError('This invitation link is no longer valid.');
    }

    // Update invitation state
    await invitationsControl.updateState(
      orgId as string,
      invitationId as string,
      state as 'Accepted' | 'Declined'
    );

    // Invalidate the organizations cache
    await cache.removeItem('organizations');

    if (redirectUri) {
      return redirectWithToast(redirectUri as string, {
        title: `Invitation ${state} successfully`,
        description: `The invitation has been ${state} successfully`,
        type: 'success',
      });
    }

    return data({ success: true, message: `Invitation ${state} successfully` }, { status: 200 });
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
