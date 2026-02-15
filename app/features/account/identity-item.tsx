import { cn } from '@shadcn/lib/utils';
import { ReactNode } from 'react';

export interface IdentityItemProps {
  /**
   * Icon to display in the left section
   * Can be a Lucide icon wrapped in Icon component or custom SVG component
   */
  icon: ReactNode;

  /**
   * Primary label text
   */
  label: string;

  /**
   * Optional secondary label text (typically email, description, etc.)
   */
  sublabel?: string;

  /**
   * Optional content for the middle section
   * Useful for timestamps, status badges, etc.
   */
  middleContent?: ReactNode;

  /**
   * Optional content for the right section
   * Typically buttons, links, or action menus
   */
  rightContent?: ReactNode;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

export const IdentityItem = ({
  icon,
  label,
  sublabel,
  middleContent,
  rightContent,
  className,
}: IdentityItemProps) => {
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-6', className)}>
      {/* Left Section */}
      <div className="flex items-center space-x-3.5">
        <div className="bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl">
          {icon}
        </div>
        <div className="text-1xs flex flex-col text-left">
          <span className="font-medium">{label}</span>
          {sublabel && <span className="text-foreground/80">{sublabel}</span>}
        </div>
      </div>

      {/* Middle Section */}
      {middleContent && <div className="shrink-0">{middleContent}</div>}

      {/* Right Section */}
      {rightContent && <div className="flex items-center justify-end gap-10">{rightContent}</div>}
    </div>
  );
};
