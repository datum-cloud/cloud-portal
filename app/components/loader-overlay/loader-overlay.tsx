import { cn } from '@shadcn/lib/utils';
import { Loader2 } from 'lucide-react';

export const LoaderOverlay = ({
  message,
  className,
}: {
  message?: string | React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={cn(
        'bg-background/80 absolute inset-0 z-10 flex items-center justify-center gap-2 backdrop-blur-[1px]',
        className
      )}>
      <Loader2 className="size-4 animate-spin" />
      {typeof message === 'string' ? (
        <span className="text-sm font-medium">{message}</span>
      ) : (
        message
      )}
    </div>
  );
};
