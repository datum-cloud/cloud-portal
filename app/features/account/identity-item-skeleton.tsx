import { cn } from '@shadcn/lib/utils';
import { Skeleton } from '@shadcn/ui/skeleton';

interface IdentityItemSkeletonProps {
  /**
   * Number of skeleton items to render
   */
  count?: number;

  /**
   * Show skeleton for right action buttons
   */
  showActions?: boolean;

  /**
   * Optional className for custom styling
   */
  className?: string;
}

/**
 * Skeleton loading state for IdentityItem component
 * Matches the exact layout and styling of IdentityItem
 */
export const IdentityItemSkeleton = ({
  count = 1,
  showActions = true,
  className,
}: IdentityItemSkeletonProps) => {
  return (
    <div className="divide-stepper-line flex flex-col divide-y">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={cn('flex items-center justify-between gap-6 px-5 py-4', className)}>
          {/* Left Section */}
          <div className="flex items-center space-x-3.5">
            {/* Icon skeleton - matches: bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl */}
            <div className="bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl">
              <Skeleton className="size-3.5 rounded-sm" />
            </div>

            {/* Label + Sublabel skeleton - matches: text-1xs flex flex-col space-y-0.5 text-left */}
            <div className="text-1xs flex flex-col space-y-0.5 text-left">
              {/* Label skeleton - matches: font-medium */}
              <Skeleton className="h-3.5 w-24" />
              {/* Sublabel skeleton - matches: text-foreground/80 */}
              <Skeleton className="h-3 w-40" />
            </div>
          </div>

          {/* Right Section - matches: flex items-center justify-end gap-10 */}
          {showActions && (
            <div className="flex items-center justify-end gap-10">
              <Skeleton className="h-7 w-20 rounded-lg" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

IdentityItemSkeleton.displayName = 'IdentityItemSkeleton';
