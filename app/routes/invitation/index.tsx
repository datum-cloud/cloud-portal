import BlankLayout from '@/layouts/blank.layout';
import { useApp } from '@/providers/app.provider';
import { createInvitationsControl } from '@/resources/control-plane';
import { ROUTE_PATH as INVITATION_UPDATE_STATE_ACTION } from '@/routes/api/team/invitations/update-state';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, SpinnerIcon } from '@datum-ui/components';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-ui/components';
import { IconWrapper } from '@datum-ui/components/icons/icon-wrapper';
import { Check } from 'lucide-react';
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
  return metaObject('Invitation');
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

export default function InvitationPage() {
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
    fetcher.submit(
      {
        orgId: invitation.organizationName,
        invitationId: invitation.name,
        state,
        redirectUri:
          state === 'Accepted'
            ? getPathWithParams(paths.org.detail.root, {
                orgId: invitation.organizationName,
              })
            : paths.account.organizations.root,
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
    <BlankLayout>
      <Card className="w-full max-w-md rounded-lg border py-11 shadow-none">
        <CardHeader className="space-y-3 px-9 pb-6">
          <div className="space-y-2 text-center">
            <CardTitle className="text-xl font-semibold">You&apos;ve been invited!</CardTitle>
            <CardDescription className="text-sm font-normal">
              Join your team and start collaborating
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-9">
          <p className="text-center text-base font-normal break-words">
            <strong>
              {invitation.inviterUser?.displayName || invitation.invitedBy || 'Someone'}
            </strong>{' '}
            has invited you to join{' '}
            <strong>{invitation.organization?.displayName || invitation.organizationName}</strong>{' '}
            organization
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-9 pt-6">
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
                className="w-full">
                {isLoading && action === 'Accepted' ? (
                  <>
                    <SpinnerIcon size="sm" aria-hidden="true" />
                    Joining...
                  </>
                ) : (
                  <>
                    <IconWrapper icon={Check} className="size-4" />
                    Join Organization
                  </>
                )}
              </Button>

              <Button
                onClick={() => handleStateUpdate('Declined')}
                disabled={isLoading}
                type="quaternary"
                theme="borderless"
                className="text-destructive hover:text-destructive/80 w-full">
                {isLoading && action === 'Declined' ? (
                  <>
                    <SpinnerIcon size="sm" aria-hidden="true" className="mr-2" />
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
      <p className="text-muted-foreground mt-12 text-center text-sm">
        Need help? Contact{' '}
        <Link to={`mailto:support@datum.net`} className="underline">
          support@datum.net
        </Link>
      </p>
    </BlankLayout>
  );
}
