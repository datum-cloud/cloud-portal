import { createInvitationsControl } from '@/resources/control-plane';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { BadRequestError, HttpError } from '@/utils/errors';
import { Client } from '@hey-api/client-axios';
import { differenceInMinutes } from 'date-fns';
import { ActionFunctionArgs, AppLoadContext, data } from 'react-router';

export const ROUTE_PATH = '/api/team/invitations/resend' as const;

export const action = async ({ request, context }: ActionFunctionArgs) => {
  if (request.method !== 'POST') {
    throw new HttpError('Method not allowed', 405);
  }

  try {
    const formData = Object.fromEntries(await request.formData());

    const { orgId, id } = formData;

    if (!orgId) {
      throw new BadRequestError('Organization ID is required');
    }

    if (!id) {
      throw new BadRequestError('Invitation ID is required');
    }

    const { controlPlaneClient } = context as AppLoadContext;
    const invitationsControl = createInvitationsControl(controlPlaneClient as Client);

    const currentInvitation: IInvitationControlResponse = await invitationsControl.detail(
      orgId as string,
      id as string
    );

    // Throw error if invitation is not pending
    if (currentInvitation.state !== 'Pending') {
      throw new BadRequestError(`Invitation already ${currentInvitation.state}`);
    }

    // Check rate limiting - invitation must be older than 10 minutes to resend
    if (currentInvitation.createdAt) {
      const createdAt = new Date(currentInvitation.createdAt);
      const now = new Date();
      const minutesSinceCreation = differenceInMinutes(now, createdAt);

      if (minutesSinceCreation < 10) {
        const remainingMinutes = 10 - minutesSinceCreation;
        throw new BadRequestError(
          `Please wait ${remainingMinutes} more minute${remainingMinutes !== 1 ? 's' : ''} before resending this invitation`
        );
      }
    }

    // Delete the invitation
    await invitationsControl.delete(orgId as string, id as string);

    // Create a new invitation
    const newInvitation = await invitationsControl.create(orgId as string, {
      email: currentInvitation.email,
      role: currentInvitation.role,
    });

    // Return the new invitation
    return data(
      {
        success: true,
        message: 'Invitation resent successfully',
        data: newInvitation,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return data(
      { success: false, error: error?.message ?? 'An unexpected error occurred' },
      { status: 500 }
    );
  }
};
