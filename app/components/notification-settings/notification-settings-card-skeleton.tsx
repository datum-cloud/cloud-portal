import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Skeleton } from '@shadcn/ui/skeleton';

export interface NotificationSettingsCardSkeletonProps {
  title: string;
  count?: number;
  showDescription?: boolean;
  className?: string;
}

/**
 * Skeleton loading state for NotificationSettingsCard
 * Matches the exact layout and styling of NotificationSettingsCard + NotificationCheckboxItem
 */
export function NotificationSettingsCardSkeleton({
  title,
  count = 3,
  showDescription = true,
  className,
}: NotificationSettingsCardSkeletonProps) {
  return (
    <Card className={cn('gap-0 rounded-xl py-0 shadow-none', className)}>
      <CardHeader className="border-b px-5 py-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4 px-5 py-4">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="flex items-center justify-between gap-6">
            <div className="flex items-center space-x-3.5">
              <div className="bg-badge-muted dark:bg-background flex size-[34px] items-center justify-center rounded-xl">
                <Skeleton className="size-4 rounded-sm" />
              </div>

              <div className="text-1xs flex flex-col space-y-0.5 text-left">
                <Skeleton className="h-3.5 w-40" />
                {showDescription && <Skeleton className="h-3 w-64" />}
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex justify-end gap-2 border-t px-5 py-4">
        <Skeleton className="h-7 w-20 rounded-lg" />
        <Skeleton className="h-7 w-16 rounded-lg" />
      </CardFooter>
    </Card>
  );
}

NotificationSettingsCardSkeleton.displayName = 'NotificationSettingsCardSkeleton';
