import { FieldLabel } from './field-label';
import { cn } from '@shadcn/lib/utils';

interface FieldProps {
  label?: string | React.ReactNode;
  children: React.ReactNode;
  description?: string | React.ReactNode;
  errors?: string[];
  className?: string;
  labelClassName?: string;
  tooltipInfo?: string | React.ReactNode;
  isRequired?: boolean;
}

export const Field = ({
  label,
  children,
  description,
  errors,
  className,
  labelClassName,
  tooltipInfo,
  isRequired = false,
}: FieldProps) => {
  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {label && (
        <FieldLabel
          label={label}
          isError={!!errors}
          isRequired={isRequired}
          tooltipInfo={tooltipInfo}
          className={labelClassName}
        />
      )}
      {children}
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      {errors && (
        <ul
          className={cn(
            'text-destructive space-y-1 text-sm font-medium',
            errors.length > 1 && 'list-disc pl-4'
          )}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
