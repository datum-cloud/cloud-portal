import { NotificationBell } from './notification-bell';
import { NotificationEmpty } from './notification-empty';
import { NotificationList } from './notification-list';
import type { NotificationDropdownProps, NotificationSourceType, NotificationTab } from './types';
import { useNotifications } from './use-notifications';
import { ResponsiveDropdown } from '@datum-cloud/datum-ui/responsive-dropdown';
import { cn } from '@datum-cloud/datum-ui/utils';
import { useState } from 'react';

/**
 * NotificationDropdown component - main dropdown with tabs for different notification sources
 */
export function NotificationDropdown({ defaultTab = 'invitation' }: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationSourceType>(defaultTab);

  const { notifications, pendingCount, error } = useNotifications();

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

  return (
    <ResponsiveDropdown
      open={open}
      onOpenChange={setOpen}
      sheetTitle="Notifications"
      sheetDescription="View your notifications"
      contentClassName="w-[calc(100vw-2rem)] sm:w-[360px]"
      trigger={
        <div>
          <NotificationBell pendingCount={pendingCount} />
        </div>
      }>
      {/* Tabs */}
      <div className="border-border flex items-center border-b px-4">
        {tabs
          .filter((tab) => tab.enabled)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'border-b-2 py-2.5 text-xs font-medium transition-colors',
                activeTab === tab.id
                  ? 'border-primary text-foreground'
                  : 'text-muted-foreground border-transparent'
              )}>
              {tab.label}
            </button>
          ))}
      </div>

      {/* Tab Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {error ? (
          <div className="text-destructive p-4 text-sm">{error}</div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationEmpty message={tabs.find((t) => t.id === activeTab)?.emptyMessage} />
        ) : (
          <NotificationList notifications={filteredNotifications} />
        )}
      </div>
    </ResponsiveDropdown>
  );
}
