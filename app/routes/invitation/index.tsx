import { LogoFlat } from '@/components/logo/logo-flat';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { redirectWithToast } from '@/modules/cookie/toast.server';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
import { ROUTE_PATH as INVITATION_UPDATE_STATE_ACTION } from '@/routes/api/team/invitations/update-state';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Check, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
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
      throw new BadRequestError('This invitation link is no longer valid.');
    }

    // Throw error if invitation is not pending
    if (invitation.state !== 'Pending') {
      throw new BadRequestError('This invitation link is no longer valid.');
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

  const [action, setAction] = useState<'Accepted' | 'Declined'>();

  // Check if invitation email matches current user's email
  const isEmailMatch = useMemo(() => {
    if (!currentUser?.email || !invitation?.email) {
      return false;
    }
    return currentUser.email.toLowerCase() === invitation.email.toLowerCase();
  }, [currentUser?.email, invitation?.email]);

  const handleStateUpdate = async (state: 'Accepted' | 'Declined') => {
    setAction(state);
    await fetcher.submit(
      {
        orgId: invitation.organizationName,
        invitationId: invitation.name,
        state,
        redirectUri: getPathWithParams(paths.org.detail.root, {
          orgId: invitation.organizationName,
        }),
      },
      {
        method: 'PATCH',
        action: INVITATION_UPDATE_STATE_ACTION,
      }
    );
  };

  const isLoading = useMemo(() => {
    return fetcher.state === 'submitting' || fetcher.state === 'loading';
  }, [fetcher.state]);

  return (
    <div className="m-auto flex h-screen w-full max-w-md flex-col items-center justify-center">
      <Card className="w-full border-0 shadow-xl">
        <CardHeader className="space-y-3 pb-6">
          <div className="flex items-center justify-center">
            <LogoFlat height={32} />
          </div>

          <div className="space-y-2 text-center">
            <CardTitle className="text-2xl font-bold text-balance">
              You&apos;ve been invited!
            </CardTitle>
            <CardDescription className="text-base text-pretty">
              Join your team and start collaborating
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-base font-normal break-words">
            <strong>
              {invitation.inviterUser?.displayName || invitation.invitedBy || 'Someone'}
            </strong>{' '}
            has invited you to join{' '}
            <strong>{invitation.organization?.displayName || invitation.organizationName}</strong>{' '}
            organization
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
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
            <>
              <Button
                onClick={() => handleStateUpdate('Accepted')}
                disabled={isLoading}
                className="bg-primary h-11 w-full text-base font-semibold shadow-lg transition-all hover:shadow-xl">
                {isLoading && action === 'Accepted' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-5 w-5" />
                    Join Organization
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleStateUpdate('Declined')}
                disabled={isLoading}
                variant="ghost"
                className="h-11 w-full text-base font-medium">
                {isLoading && action === 'Declined' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Declining...
                  </>
                ) : (
                  <>Decline</>
                )}
              </Button>
            </>
          )}
        </CardFooter>
      </Card>

      {/* Footer Text */}
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Need help? Contact{' '}
        <Link to={`mailto:support@datum.net`} className="text-primary underline">
          support@datum.net
        </Link>
      </p>
    </div>
  );
}
