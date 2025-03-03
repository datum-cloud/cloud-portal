import { Label } from '@/components/ui/label'
import { cn } from '@/utils/misc'

interface FieldProps {
  label?: string | React.ReactNode
  children: React.ReactNode
  description?: string | React.ReactNode
  errors?: string[]
  className?: string
  labelClassName?: string
}

export const Field = ({
  label,
  children,
  description,
  errors,
  className,
  labelClassName,
}: FieldProps) => {
  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {label && (
        <Label className={cn(errors && 'text-destructive', labelClassName)}>
          {label}
        </Label>
      )}
      {children}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {errors && (
        <ul
          className={cn(
            'space-y-1 text-sm font-medium text-destructive',
            errors.length > 1 && 'list-disc pl-4',
          )}>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
