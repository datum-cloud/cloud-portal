import { SpinnerIcon } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';

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
      <SpinnerIcon size="sm" />
      {typeof message === 'string' ? (
        <span className="text-sm font-medium">{message}</span>
      ) : (
        message
      )}
    </div>
  );
};
