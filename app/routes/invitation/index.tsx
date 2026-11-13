import { useJoinInvitation } from '@/features/onboarding/invitations/use-join-invitation';
import BlankLayout from '@/layouts/blank.layout';
import { useApp } from '@/providers/app.provider';
import { createInvitationService } from '@/resources/invitations';
import { useRejectInvitation } from '@/resources/invitations/invitation.queries';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button } from '@datum-cloud/datum-ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { SpinnerIcon, Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Link,
  LoaderFunctionArgs,
  MetaFunction,
  data,
  useLoaderData,
  useNavigate,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Invitation');
});

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  try {
    const { invitationId } = params;

    if (!invitationId) {
      throw new BadRequestError('Invitation ID is required');
    }

    // The app passes the organization. Links in invitation emails don't, but
    // a sent invitation's name is "<organization>-<random>", so take it from
    // there. Email domain offers are never emailed.
    const orgId =
      new URL(request.url).searchParams.get('org') ||
      invitationId.substring(0, invitationId.lastIndexOf('-'));

    // Invitation Section
    // Get invitation
    // Services now use global axios client with AsyncLocalStorage
    const invitationService = createInvitationService();
    const invitation = await invitationService.get(orgId, invitationId);

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
  const navigate = useNavigate();

  const [action, setAction] = useState<'Accepted' | 'Declined'>();
  const { join, isJoining, isSettlingAccess } = useJoinInvitation();

  const rejectMutation = useRejectInvitation({
    onSuccess: () => {
      void navigate(paths.account.organizations.root);
    },
  });

  // Check if invitation email matches current user's email
  const isEmailMatch = useMemo(() => {
    if (!currentUser?.email || !invitation?.email) {
      return false;
    }
    return currentUser.email.toLowerCase() === invitation.email.toLowerCase();
  }, [currentUser?.email, invitation?.email]);

  const handleStateUpdate = async (state: 'Accepted' | 'Declined') => {
    setAction(state);

    if (state === 'Accepted') {
      join(invitation);
    } else {
      rejectMutation.mutate({
        orgId: invitation.organizationName,
        name: invitation.name,
      });
    }
  };

  const isLoading = isJoining || rejectMutation.isPending;
  const orgName = invitation.organization?.displayName || invitation.organizationName;

  return (
    <BlankLayout>
      <Card className="w-full max-w-md py-11">
        <CardHeader className="space-y-3 px-9 pb-6">
          <div className="space-y-2 text-center">
            <CardTitle className="text-xl font-semibold">
              {invitation.emailDomain ? `Join ${orgName}` : "You've been invited!"}
            </CardTitle>
            {!invitation.emailDomain && (
              <CardDescription className="text-sm font-normal">
                Join your team and start collaborating
              </CardDescription>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6 px-9">
          <Text as="p" size="base" weight="normal" className="text-center break-words">
            {invitation.emailDomain ? (
              <>
                Your <strong>{invitation.emailDomain}</strong> email address lets you join this
                organization. No invitation needed.
              </>
            ) : (
              <>
                <strong>
                  {invitation.inviterUser?.displayName || invitation.invitedBy || 'Someone'}
                </strong>{' '}
                has invited you to join <strong>{orgName}</strong> organization
              </>
            )}
          </Text>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 px-9 pt-6">
          {!isEmailMatch ? (
            <Text as="div" className="text-center leading-relaxed">
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
            </Text>
          ) : (
            <>
              <Button
                onClick={() => handleStateUpdate('Accepted')}
                disabled={isLoading}
                className="w-full">
                {isLoading && action === 'Accepted' ? (
                  <>
                    <SpinnerIcon size="sm" aria-hidden="true" />
                    {isSettlingAccess ? 'Setting up your access...' : 'Joining...'}
                  </>
                ) : (
                  <>
                    <Icon icon={Check} className="size-4" />
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
      <Text as="p" textColor="muted" className="mt-12 text-center">
        Need help? Contact{' '}
        <Link to={`mailto:support@datum.net`} className="underline">
          support@datum.net
        </Link>
      </Text>
    </BlankLayout>
  );
}
