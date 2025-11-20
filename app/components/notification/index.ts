// Main component
export { NotificationDropdown } from './notification-dropdown';

// Sub-components (for custom implementations)
export { NotificationBell } from './notification-bell';
export { NotificationEmpty } from './notification-empty';
export { NotificationList } from './notification-list';
export { NotificationItemWrapper } from './notification-item-wrapper';

// Resource-specific items
export { InvitationNotificationItem } from './items';

// Hook
export { useNotificationPolling } from './use-notification-polling';

// Types
export type {
  INotification,
  NotificationTab,
  NotificationResponse,
  NotificationSourceType,
  UseNotificationPollingOptions,
  NotificationDropdownProps,
  NotificationBellProps,
  NotificationListProps,
  ResourceNotificationItemProps,
  NotificationItemWrapperProps,
  NotificationEmptyProps,
} from './types';
