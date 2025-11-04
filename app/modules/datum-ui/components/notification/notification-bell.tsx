import type { NotificationBellProps } from './types';
import { Badge } from '@/modules/datum-ui/components/badge';
import { Button } from '@/modules/datum-ui/components/button';
import { Bell } from 'lucide-react';

/**
 * NotificationBell component - displays a bell icon with an unread count badge
 */
export function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Button
      type="quaternary"
      theme="borderless"
      size="small"
      className="relative cursor-pointer"
      aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}>
      <Bell size={18} />
      {unreadCount > 0 && (
        <Badge
          variant="butter"
          className="bg-tuscany text-cream absolute top-[2px] right-[4px] flex size-4 items-center justify-center rounded-full p-0 text-[10px] leading-0">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      <span className="sr-only">Notifications</span>
    </Button>
  );
}
