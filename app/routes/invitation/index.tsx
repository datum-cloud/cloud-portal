import {
  getUnusableInvitationReason,
  isUnreachableInvitationError,
  type UnusableInvitationReason,
} from '@/features/onboarding/invitations/invitation-link-status';
import { useJoinInvitation } from '@/features/onboarding/invitations/use-join-invitation';
import { InvitationExpiry } from '@/features/organization/team/invitation-expiry';
import BlankLayout from '@/layouts/blank.layout';
import { useApp } from '@/providers/app.provider';
import { createInvitationService, type Invitation } from '@/resources/invitations';
import { useRejectInvitation } from '@/resources/invitations/invitation.queries';
import { paths } from '@/utils/config/paths.config';
import { redirectWithToast } from '@/utils/cookies';
import { BadRequestError } from '@/utils/errors';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
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

export const loader = async ({ params }: LoaderFunctionArgs) => {
  try {
    const { invitationId } = params;

    if (!invitationId) {
      throw new BadRequestError('Invitation ID is required');
    }

    // Parse invitation ID to extract organization ID and unique ID
    const lastDashIndex = invitationId.lastIndexOf('-');
    const orgId = invitationId.substring(0, lastDashIndex);

    // Services now use global axios client with AsyncLocalStorage
    const invitationService = createInvitationService();

    let invitation: Invitation;
    try {
      invitation = await invitationService.get(orgId, invitationId);
    } catch (error) {
      // Milo refuses to return an invitation that expired before the invitee
      // signed up, or that was replaced. Explain that instead of a bare error.
      if (isUnreachableInvitationError(error)) {
        return data<InvitationLoaderData>({ status: 'unusable', reason: 'unreachable' });
      }
      throw error;
    }

    const reason = getUnusableInvitationReason(invitation);
    if (reason) {
      return data<InvitationLoaderData>({
        status: 'unusable',
        reason,
        inviterName: getInviterName(invitation),
        organizationName: getOrganizationName(invitation),
      });
    }

    return data<InvitationLoaderData>({ status: 'pending', invitation });
  } catch (error: any) {
    return redirectWithToast(paths.account.organizations.root, {
      title: 'Something went wrong',
      description: error.message,
      type: 'error',
    });
  }
};

type InvitationLoaderData =
  | { status: 'pending'; invitation: Invitation }
  | {
      status: 'unusable';
      reason: UnusableInvitationReason;
      inviterName?: string;
      organizationName?: string;
    };

function getInviterName(invitation: Invitation): string | undefined {
  return invitation.inviterUser?.displayName || invitation.invitedBy;
}

function getOrganizationName(invitation: Invitation): string {
  return invitation.organization?.displayName || invitation.organizationName;
}

export default function InvitationPage() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <BlankLayout>
      {loaderData.status === 'pending' ? (
        <PendingInvitation invitation={loaderData.invitation} />
      ) : (
        <UnusableInvitation
          reason={loaderData.reason}
          inviterName={loaderData.inviterName}
          organizationName={loaderData.organizationName}
        />
      )}

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

function PendingInvitation({ invitation }: { invitation: Invitation }) {
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

  return (
    <Card className="w-full max-w-md py-11">
      <CardHeader className="space-y-3 px-9 pb-6">
        <div className="space-y-2 text-center">
          <CardTitle className="text-xl font-semibold">You&apos;ve been invited!</CardTitle>
          <CardDescription className="text-sm font-normal">
            Join your team and start collaborating
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 px-9">
        <Text as="p" size="base" weight="normal" className="text-center break-words">
          <strong>{getInviterName(invitation) || 'Someone'}</strong> has invited you to join{' '}
          <strong>{getOrganizationName(invitation)}</strong> organization
        </Text>
        {invitation.expirationDate ? (
          <Text as="p" size="sm" textColor="muted" className="text-center">
            <InvitationExpiry expirationDate={invitation.expirationDate} />
          </Text>
        ) : null}
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
  );
}

function UnusableInvitation({
  reason,
  inviterName,
  organizationName,
}: {
  reason: UnusableInvitationReason;
  inviterName?: string;
  organizationName?: string;
}) {
  const { user: currentUser } = useApp();
  const inviter = inviterName ?? 'the person who invited you';
  const organization = organizationName ?? 'the organization';

  const copy: Record<UnusableInvitationReason, { title: string; description: string }> = {
    expired: {
      title: 'This invitation has expired',
      description: `Ask ${inviter} to send you a new invitation to join ${organization}.`,
    },
    unreachable: {
      title: 'This invitation has expired',
      description:
        'It may have run out before you finished signing up, or been replaced by a newer one. Ask the person who invited you to send a new invitation.',
    },
    accepted: {
      title: 'You have already accepted this invitation',
      description: `You're a member of ${organization}.`,
    },
    declined: {
      title: 'You declined this invitation',
      description: `To join ${organization} now, ask ${inviter} to send you a new invitation.`,
    },
  };
  const { title, description } = copy[reason];

  return (
    <Card className="w-full max-w-md py-11">
      <CardHeader className="space-y-3 px-9 pb-6">
        <div className="space-y-2 text-center">
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <CardDescription className="text-sm font-normal">{description}</CardDescription>
        </div>
      </CardHeader>

      {reason === 'unreachable' && currentUser?.email ? (
        <CardContent className="px-9">
          <Text as="p" className="text-center leading-relaxed break-words">
            You&apos;re signed in as <strong>{currentUser.email}</strong>. If the invitation was
            sent to a different address,{' '}
            <Link
              to={paths.auth.logOut}
              className="text-orange dark:text-lime-green hover:underline">
              sign out
            </Link>{' '}
            and sign in with that one.
          </Text>
        </CardContent>
      ) : null}

      <CardFooter className="px-9 pt-6">
        <LinkButton as={Link} href={paths.account.organizations.root} block>
          Go to your organizations
        </LinkButton>
      </CardFooter>
    </Card>
  );
}
