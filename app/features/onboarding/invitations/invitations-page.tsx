import { CREATE_OWN_ORGANIZATION_PATH } from './joinable-invitations';
import { useJoinInvitation } from './use-join-invitation';
import { OnboardingEntrance } from '@/features/onboarding/components/onboarding-entrance';
import { onboardingCardClassName } from '@/features/onboarding/onboarding-layout';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import { useRejectInvitation } from '@/resources/invitations/invitation.queries';
import type { Invitation } from '@/resources/invitations/invitation.schema';
import { getInitials } from '@/utils/helpers/text.helper';
import { Avatar, AvatarFallback } from '@datum-cloud/datum-ui/avatar';
import { Button, LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { Link, useRevalidator } from 'react-router';

export interface InvitationsPageProps {
  invitations: Invitation[];
}

const organizationName = (invitation: Invitation) =>
  invitation.organization?.displayName || invitation.organizationName;

const inviterName = (invitation: Invitation) =>
  invitation.inviterUser?.displayName || invitation.invitedBy;

export const InvitationsPage = ({ invitations }: InvitationsPageProps) => {
  const { trackAction } = useAnalytics();
  const revalidator = useRevalidator();

  const { join, isJoining, isSettlingAccess, joiningInvitationName } = useJoinInvitation({
    onAccepted: (orgId) => trackAction(AnalyticsAction.OnboardingInvitationAccepted, { orgId }),
    onError: (error) => {
      toast.error('Join organization', {
        description: error.message || 'Failed to accept the invitation',
      });
    },
  });

  const declineMutation = useRejectInvitation({
    // The loader moves the user on to org creation once nothing is left to join.
    onSuccess: () => revalidator.revalidate(),
    onError: (error) => {
      toast.error('Decline invitation', {
        description: error.message || 'Failed to decline the invitation',
      });
    },
  });

  const decliningInvitationName = declineMutation.isPending
    ? declineMutation.variables?.name
    : undefined;
  const isBusy = isJoining || declineMutation.isPending || revalidator.state === 'loading';
  const joiningLabel = isSettlingAccess ? 'Setting up access...' : 'Joining...';

  const [firstInvitation] = invitations;
  const heading =
    invitations.length === 1 && firstInvitation
      ? `Join ${organizationName(firstInvitation)} on Datum`
      : 'Join your team on Datum';

  return (
    <OnboardingEntrance>
      <Card className={cn(onboardingCardClassName, 'z-10')}>
        <CardContent className="flex flex-col gap-8 p-0">
          <div className="flex flex-col gap-2 text-center">
            <Title as="h2" level={3} weight="semibold">
              {heading}
            </Title>
            <Text as="p" size="sm" textColor="muted">
              {invitations.length === 1
                ? "You've been invited to an organization."
                : "You've been invited to these organizations."}{' '}
              Join to start working with your team. You won&apos;t need to add a payment method.
            </Text>
          </div>

          <ul className="flex flex-col gap-3">
            {invitations.map((invitation) => {
              const orgName = organizationName(invitation);
              const inviter = inviterName(invitation);
              const isJoiningThis = joiningInvitationName === invitation.name;
              const isDecliningThis = decliningInvitationName === invitation.name;

              return (
                <li
                  key={invitation.name}
                  className="border-border bg-muted/50 flex flex-col gap-3 rounded-md border px-3 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar className="size-9 shrink-0 rounded-lg">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {getInitials(orgName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col gap-1">
                      <Text as="p" size="sm" weight="medium" ellipsis className="leading-[18px]">
                        {orgName}
                      </Text>
                      {inviter ? (
                        <Text as="p" size="xs" textColor="muted" ellipsis className="leading-4">
                          Invited by {inviter}
                          {invitation.role ? ` as ${invitation.role}` : null}
                        </Text>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2 sm:justify-end">
                    <Button
                      htmlType="button"
                      type="quaternary"
                      theme="borderless"
                      size="small"
                      className="flex-1 sm:flex-none"
                      disabled={isBusy}
                      loading={isDecliningThis}
                      onClick={() =>
                        declineMutation.mutate({
                          orgId: invitation.organizationName,
                          name: invitation.name,
                        })
                      }>
                      {isDecliningThis ? 'Declining...' : 'Decline'}
                    </Button>
                    <Button
                      htmlType="button"
                      type="primary"
                      size="small"
                      className="flex-1 sm:flex-none"
                      disabled={isBusy}
                      loading={isJoiningThis}
                      onClick={() => join(invitation)}>
                      {isJoiningThis ? joiningLabel : 'Join'}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>

          <Text as="p" size="xs" textColor="default" className="leading-4 opacity-60">
            By joining, you agree to Datum&apos;s{' '}
            <Link
              to="https://datum.net/terms-of-service"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link
              to="https://datum.net/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline">
              Privacy Policy
            </Link>
            .
          </Text>

          <div className="border-border flex flex-col items-center gap-1 border-t pt-6">
            <Text as="p" size="xs" textColor="muted">
              Setting up something separate from your team?
            </Text>
            <LinkButton
              as={Link}
              href={CREATE_OWN_ORGANIZATION_PATH}
              type="quaternary"
              theme="borderless"
              size="small"
              aria-disabled={isBusy}
              className={cn(isBusy && 'pointer-events-none opacity-50')}>
              Create my own organization instead
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </OnboardingEntrance>
  );
};
