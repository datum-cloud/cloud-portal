import { LogoFlat } from '@/components/logo/logo-flat';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
import { ROUTE_PATH as INVITATION_UPDATE_STATE_ACTION } from '@/routes/api/team/invitations/update-state';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Check, Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  AppLoadContext,
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useFetcher,
  useLoaderData,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Getting Started');
});

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  try {
    const { controlPlaneClient } = context as AppLoadContext;

    const { invitationId } = params;

    if (!invitationId) {
      throw new BadRequestError('Invitation ID is required');
    }

    // Parse invitation ID to extract organization ID and unique ID
    const lastDashIndex = invitationId.lastIndexOf('-');
    const orgId = invitationId.substring(0, lastDashIndex);

    // Invitation Section
    // Get invitation
    const invitationsControl = createInvitationsControl(controlPlaneClient);
    const invitation = await invitationsControl.detail(orgId, invitationId);

    // Throw error if invitation is expired
    if (invitation.expirationDate && new Date(invitation.expirationDate) < new Date()) {
      throw new BadRequestError('Invitation expired');
    }

    // Throw error if invitation is not pending
    if (invitation.state !== 'Pending') {
      throw new BadRequestError(`Invitation already ${invitation.state}`);
    }

    return data(invitation);
  } catch (error: any) {
    return redirectWithToast(paths.account.organizations.root, {
      title: 'Something went wrong',
      description: error.message,
      type: 'error',
    });
  }
};

export default function GettingStartedPage() {
  const invitation = useLoaderData<typeof loader>();
  const { user: currentUser } = useApp();
  const fetcher = useFetcher();

  // Check if invitation email matches current user's email
  const isEmailMatch = useMemo(() => {
    if (!currentUser?.email || !invitation?.email) {
      return false;
    }
    return currentUser.email.toLowerCase() === invitation.email.toLowerCase();
  }, [currentUser?.email, invitation?.email]);

  const handleStateUpdate = async (state: 'Accepted' | 'Declined') => {
    await fetcher.submit(
      {
        orgId: invitation.organizationName,
        invitationId: invitation.name,
        state,
        redirectUri: paths.account.organizations.root,
      },
      {
        method: 'PATCH',
        action: INVITATION_UPDATE_STATE_ACTION,
      }
    );
  };

  return (
    <div className="m-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center gap-10">
      {/* Logo Section */}
      <LogoFlat height={32} />

      {/* Invitation Card */}
      <div className="bg-card border-border w-full rounded-md border shadow-sm">
        <div className="space-y-2 px-8 py-6 text-center">
          <p className="text-muted-foreground text-sm">You have been invited to join</p>
          <h1 className="text-foreground text-2xl font-semibold">{invitation.organizationName}</h1>
        </div>

        <Separator />
        {/* Action Buttons */}
        <div className="flex items-center justify-center gap-3 px-8 py-4">
          {!isEmailMatch ? (
            <div className="text-center text-sm leading-relaxed">
              <p className="font-semibold">
                Your email address {currentUser?.email} does not match the email address this
                invitation was sent to.
              </p>
              <p className="mt-3 font-normal">
                To accept this invitation, you will need to{' '}
                <Link
                  to={paths.auth.logOut}
                  className="text-orange dark:text-lime-green hover:underline">
                  sign out
                </Link>{' '}
                and then sign in or create a new account using the same email address used in the
                invitation.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              {fetcher.state === 'submitting' || fetcher.state === 'loading' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-border text-foreground hover:bg-secondary flex-1 bg-transparent"
                    onClick={() => handleStateUpdate('Declined')}>
                    Decline
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1"
                    onClick={() => handleStateUpdate('Accepted')}>
                    <Check className="size-4" />
                    Join organization
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
