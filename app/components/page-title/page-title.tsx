import { cn } from '@shadcn/lib/utils';

export interface PageTitleProps {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  actionsClassName?: string;
  actionsPosition?: 'inline' | 'bottom';
}

export const PageTitle = ({
  title,
  description,
  actions,
  className,
  titleClassName,
  descriptionClassName,
  actionsClassName,
  actionsPosition = 'inline',
}: PageTitleProps) => {
  const isInline = actionsPosition === 'inline';

  return (
    <div
      className={cn(
        'flex w-full',
        isInline ? 'items-center justify-between' : 'flex-col gap-3',
        className
      )}>
      <div
        className={cn('flex', isInline ? 'flex-col justify-start gap-1' : 'w-full flex-col gap-1')}>
        {title && (
          <span className={cn('text-2xl leading-none font-medium', titleClassName)}>{title}</span>
        )}
        {description && (
          <div className={cn('text-muted-foreground text-sm', descriptionClassName)}>
            {description}
          </div>
        )}
      </div>
      {actions && (
        <div
          className={cn('flex gap-1', isInline ? 'justify-end pl-2' : 'w-full', actionsClassName)}>
          {actions}
        </div>
      )}
    </div>
  );
};
