import type { NotificationItemWrapperProps } from './types';
import { cn } from '@shadcn/lib/utils';

/**
 * NotificationItemWrapper - Minimal base container for all notification items
 *
 * Provides:
 * - Container div with consistent styling
 * - Read/unread opacity
 * - Click handling for navigation
 * - Hover effects
 *
 * Does NOT provide:
 * - Avatar/icon rendering (managed by resource items)
 * - Content rendering (passed via children)
 * - Action handling (managed by resource items)
 */
export function NotificationItemWrapper({ children, onNavigate }: NotificationItemWrapperProps) {
  return (
    <div
      className={cn(
        'border-border hover:bg-accent/30 border-b p-4 transition-colors',
        onNavigate && 'cursor-pointer'
      )}
      onClick={onNavigate}>
      {children}
    </div>
  );
}
