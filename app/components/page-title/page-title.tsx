import { cn } from '@/utils/helpers/misc.helper';

export const PageTitle = ({
  title,
  description,
  actions,
  className,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn('flex w-full items-center justify-between', className)}>
      <div className="flex flex-col justify-start gap-1">
        {title && <span className="text-xl leading-none font-bold">{title}</span>}
        {description && <div className="text-muted-foreground text-sm">{description}</div>}
      </div>
      {actions && <div className="flex justify-end gap-1 pl-2">{actions}</div>}
    </div>
  );
};
