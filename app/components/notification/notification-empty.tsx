import type { NotificationEmptyProps } from './types';
import { Bell } from 'lucide-react';

/**
 * NotificationEmpty component - displays an empty state when there are no notifications
 */
export function NotificationEmpty({ message = 'No notifications' }: NotificationEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <Bell className="text-muted-foreground/30 mb-3 h-12 w-12" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}
