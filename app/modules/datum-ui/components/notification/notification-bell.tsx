import type { NotificationBellProps } from './types';
import { Badge } from '@/modules/datum-ui/components/badge';
import { Button } from '@/modules/datum-ui/components/button';
import { Tooltip } from '@datum-ui/components';
import { Bell } from 'lucide-react';

/**
 * NotificationBell component - displays a bell icon with an unread count badge
 */
export function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Tooltip message="Notifications">
      <Button
        type="quaternary"
        theme="outline"
        size="small"
        className="relative h-8 w-8 cursor-pointer rounded-xl p-0"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
        <Bell size={14} className="text-quaternary-foreground" />
        {unreadCount > 0 && (
          <Badge
            type="tertiary"
            theme="solid"
            className="bg-primary text-primary-foreground text-2xs absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 leading-0">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </Button>
    </Tooltip>
  );
}
