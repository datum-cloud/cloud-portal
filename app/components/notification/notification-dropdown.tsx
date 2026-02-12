import { NotificationBell } from './notification-bell';
import { NotificationEmpty } from './notification-empty';
import { NotificationList } from './notification-list';
import type { NotificationDropdownProps, NotificationSourceType, NotificationTab } from './types';
import { useNotifications } from './use-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/modules/datum-ui/components/dropdown';
import { cn } from '@shadcn/lib/utils';
import { useState } from 'react';

/**
 * NotificationDropdown component - main dropdown with tabs for different notification sources
 */
export function NotificationDropdown({
  defaultTab = 'invitation',
  pollingInterval = 5 * 60 * 1000, // 5 minutes default
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationSourceType>(defaultTab);

  // Use React Query-based notifications hook
  const { notifications, counts, markAsRead, refresh, refreshOnInteraction, error } =
    useNotifications({ interval: pollingInterval });

  // Filter notifications by active tab
  const filteredNotifications = notifications.filter((n) => n.source === activeTab);

  // Tab configuration
  const tabs: NotificationTab[] = [
    {
      id: 'invitation',
      label: 'Invitations',
      enabled: true,
      emptyMessage: 'No pending invitations',
    },
  ];

  // Mark all in current tab as read when opened
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      // Smart refresh when user opens dropdown - ensures latest data
      refreshOnInteraction();

      if (filteredNotifications.length > 0) {
        setTimeout(() => {
          filteredNotifications.forEach((n) => markAsRead(n.id));
        }, 1500);
      }
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      {/* Bell Trigger */}
      <DropdownMenuTrigger asChild>
        <div>
          <NotificationBell unreadCount={counts.unread} />
        </div>
      </DropdownMenuTrigger>

      {/* Dropdown Content */}
      <DropdownMenuContent align="end" className="w-[360px] rounded-lg p-0">
        {/* Custom Button-Style Tabs */}
        <div className="border-border flex items-center justify-between border-b">
          <div className="flex items-center">
            {tabs
              .filter((tab) => tab.enabled)
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'hover:bg-accent/50 relative px-4 py-3 text-sm font-medium transition-colors',
                    activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground'
                  )}>
                  {tab.label}{' '}
                  {counts.bySource[tab.id] > 0 && (
                    <span className="ml-1">{counts.bySource[tab.id]}</span>
                  )}
                  {activeTab === tab.id && (
                    <div className="bg-foreground absolute right-0 bottom-0 left-0 h-0.5" />
                  )}
                </button>
              ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="max-h-[500px] overflow-y-auto">
          {error ? (
            <div className="text-destructive p-4 text-sm">{error}</div>
          ) : filteredNotifications.length === 0 ? (
            <NotificationEmpty message={tabs.find((t) => t.id === activeTab)?.emptyMessage} />
          ) : (
            <NotificationList
              notifications={filteredNotifications}
              onMarkAsRead={markAsRead}
              onRefresh={refresh}
            />
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
