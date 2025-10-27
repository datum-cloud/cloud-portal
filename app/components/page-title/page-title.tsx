import { cn } from '@shadcn/lib/utils';

export const PageTitle = ({
  title,
  description,
  actions,
  className,
  titleClassName,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
}) => {
  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <div className="flex flex-col justify-start gap-1">
        {title && (
          <span className={cn('text-2xl leading-none font-bold', titleClassName)}>{title}</span>
        )}
        {description && <div className="text-muted-foreground text-sm">{description}</div>}
      </div>
      {actions && <div className="flex justify-end gap-1 pl-2">{actions}</div>}
    </div>
  );
};
