import { NotificationItemWrapper } from '../notification-item-wrapper';
import type { ResourceNotificationItemProps } from '../types';
import { DateTime } from '@/components/date-time';
import {
  useAcceptInvitation,
  useRejectInvitation,
} from '@/resources/invitations/invitation.queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getInitials } from '@/utils/helpers/text.helper';
import { Avatar, AvatarFallback, AvatarImage } from '@datum-cloud/datum-ui/avatar';
import { Button } from '@datum-cloud/datum-ui/button';
import { toast } from '@datum-cloud/datum-ui/toast';
import { useState } from 'react';
import { useNavigate } from 'react-router';

/**
 * InvitationNotificationItem - Handles invitation-specific rendering and actions
 *
 * Features:
 * - Uses React Query mutations for Accept/Decline actions
 * - Shows invitation-specific metadata (org name, role)
 * - Independent loading states per button
 * - Toast notifications on success/error
 * - Navigation to team page
 * - Watch stream updates cache automatically on MODIFIED/DELETED events
 */
export function InvitationNotificationItem({ notification }: ResourceNotificationItemProps) {
  const navigate = useNavigate();

  const [action, setAction] = useState<'Accepted' | 'Declined'>();

  // Access the domain invitation data directly
  const invitation = notification.data;

  const acceptMutation = useAcceptInvitation({
    onSuccess: () => {
      navigate(
        getPathWithParams(paths.org.detail.root, {
          orgId: invitation.organizationName,
        })
      );
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to accept invitation');
    },
  });

  const rejectMutation = useRejectInvitation({
    onSuccess: () => {
      // Watch stream removes the invitation from the cache automatically
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to decline invitation');
    },
  });

  const handleStateUpdate = async (e: React.MouseEvent, state: 'Accepted' | 'Declined') => {
    e.stopPropagation();
    setAction(state);

    if (state === 'Accepted') {
      acceptMutation.mutate({
        orgId: invitation.organizationName,
        name: invitation.name,
      });
    } else {
      rejectMutation.mutate({
        orgId: invitation.organizationName,
        name: invitation.name,
      });
    }
  };

  // Handle navigation to invitation accept page
  const handleNavigate = () => {
    navigate(getPathWithParams(paths.invitationAccept, { invitationId: invitation.name }));
  };

  const isLoading = acceptMutation.isPending || rejectMutation.isPending;

  // Generate title from invitation data
  const inviterName = invitation.inviterUser?.displayName || invitation.invitedBy || 'Someone';
  const orgName = invitation.organization?.displayName || invitation.organizationName;

  return (
    <NotificationItemWrapper onNavigate={handleNavigate}>
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="size-10 shrink-0">
          <AvatarImage src={invitation.inviterUser?.avatar} alt="User" />
          <AvatarFallback className="bg-muted">{getInitials(inviterName)}</AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="text-foreground text-sm leading-snug">
            <strong>{inviterName}</strong> has invited you to join <strong>{orgName}</strong>{' '}
            organization
            {invitation.role ? (
              <>
                {' '}
                as <strong>{invitation.role}</strong>
              </>
            ) : null}
          </div>

          {/* Time + Expiry */}
          {invitation.createdAt && (
            <DateTime
              date={invitation.createdAt}
              variant="relative"
              className="text-muted-foreground w-fit text-xs"
            />
          )}

          <div className="flex justify-end gap-1">
            <Button
              className="h-6 text-xs"
              size="small"
              type="quaternary"
              theme="borderless"
              onClick={(e) => handleStateUpdate(e, 'Declined')}
              disabled={isLoading}
              loading={isLoading && action === 'Declined'}>
              {isLoading && action === 'Declined' ? 'Declining...' : 'Decline'}
            </Button>
            <Button
              className="h-6 text-xs"
              size="small"
              onClick={(e) => handleStateUpdate(e, 'Accepted')}
              disabled={isLoading}
              loading={isLoading && action === 'Accepted'}>
              {isLoading && action === 'Accepted' ? 'Joining...' : 'Join Organization'}
            </Button>
          </div>
        </div>
      </div>
    </NotificationItemWrapper>
  );
}
