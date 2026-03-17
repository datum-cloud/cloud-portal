import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { forwardRef } from 'react';

interface ToolbarButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  tooltip?: string;
  shortcut?: string;
  children: React.ReactNode;
  className?: string;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ active, disabled, onClick, tooltip, children, className }, ref) => {
    const button = (
      <button
        ref={ref}
        type="button"
        // Use onMouseDown + preventDefault to prevent focus steal from editor.
        // This preserves text selection when clicking toolbar buttons.
        onMouseDown={(e) => {
          e.preventDefault();
          onClick?.();
        }}
        disabled={disabled}
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded',
          'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          'disabled:pointer-events-none disabled:opacity-50',
          'transition-colors',
          active && 'bg-accent text-accent-foreground',
          className
        )}>
        {children}
      </button>
    );

    if (!tooltip) return button;

    return <Tooltip message={tooltip}>{button}</Tooltip>;
  }
);

ToolbarButton.displayName = 'ToolbarButton';
