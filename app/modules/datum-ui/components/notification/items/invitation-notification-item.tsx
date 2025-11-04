import { NotificationItemWrapper } from '../notification-item-wrapper';
import type { ResourceNotificationItemProps } from '../types';
import { DateTime } from '@/components/date-time';
import { IInvitationControlResponse } from '@/resources/interfaces/invitation.interface';
import { ROUTE_PATH as INVITATION_UPDATE_STATE_ACTION } from '@/routes/api/team/invitations/update-state';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { getInitials } from '@/utils/helpers/text.helper';
import { Button } from '@datum-ui/components';
import { Avatar, AvatarFallback, AvatarImage } from '@shadcn/ui/avatar';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useFetcher } from 'react-router';
import { toast } from 'sonner';

/**
 * InvitationNotificationItem - Handles invitation-specific rendering and actions
 *
 * Features:
 * - Manages own useFetcher for Accept/Decline actions
 * - Shows invitation-specific metadata (org name, role)
 * - Independent loading states per button
 * - Toast notifications on success/error
 * - Navigation to team page
 * - Confirmation dialog for Decline
 */
export function InvitationNotificationItem({
  notification,
  onMarkAsRead,
  onRefresh,
}: ResourceNotificationItemProps<IInvitationControlResponse>) {
  const navigate = useNavigate();
  const fetcher = useFetcher({ key: 'invitation-notification-item' });

  const [action, setAction] = useState<'Accepted' | 'Declined'>();

  // Access the control-plane data directly
  const invitation = notification.data;

  const handleStateUpdate = async (e: React.MouseEvent, state: 'Accepted' | 'Declined') => {
    e.stopPropagation();
    setAction(state);
    await fetcher.submit(
      {
        orgId: invitation.organizationName,
        invitationId: invitation.name,
        state,
        redirectUri:
          state === 'Accepted'
            ? getPathWithParams(paths.org.detail.root, {
                orgId: invitation.organizationName,
              })
            : undefined,
      } as unknown as FormData,
      {
        method: 'PATCH',
        action: INVITATION_UPDATE_STATE_ACTION,
      }
    );

    onMarkAsRead(notification.id);
  };

  // Handle navigation to team page
  const handleNavigate = () => {
    navigate(getPathWithParams(paths.invitationAccept, { invitationId: invitation.name }));
  };

  // Show toast on action completion
  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      if (fetcher.data.success) {
        onRefresh();
      } else {
        toast.error(fetcher.data.error || 'Failed to update invitation');
      }
    }
  }, [fetcher.data, fetcher.state]);

  const isLoading = useMemo(() => {
    return fetcher.state === 'submitting' || fetcher.state === 'loading';
  }, [fetcher.state]);

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
