import type { NotificationBellProps } from './types';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Bell } from 'lucide-react';

/**
 * NotificationBell component - displays a bell icon with a pending count badge
 */
export function NotificationBell({ pendingCount }: NotificationBellProps) {
  const displayCount = pendingCount > 99 ? '99+' : pendingCount;

  return (
    <Tooltip message="Notifications">
      <Button
        type="quaternary"
        theme="borderless"
        size="small"
        className="hover:bg-sidebar-accent relative h-7 w-7 cursor-pointer rounded-lg p-0"
        aria-label={`Notifications${pendingCount > 0 ? ` (${displayCount} pending)` : ''}`}>
        <Icon icon={Bell} className="text-icon-header size-4" />
        {pendingCount > 0 && (
          <Badge
            data-testid="notification-badge"
            type="tertiary"
            theme="solid"
            className="bg-primary text-primary-foreground text-2xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 leading-0">
            {displayCount}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    </Tooltip>
  );
}
