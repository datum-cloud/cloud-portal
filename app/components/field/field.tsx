import { cn } from '@/utils/misc'
import { Label } from '../ui/label'

interface FieldProps {
  label?: string | React.ReactNode
  children: React.ReactNode
  description?: string | React.ReactNode
  error?: string | React.ReactNode
  className?: string
  labelClassName?: string
}

export const Field = ({
  label,
  children,
  description,
  error,
  className,
  labelClassName,
}: FieldProps) => {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className={cn(error && 'text-destructive', labelClassName)}>{label}</Label>
      )}
      {children}
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {error && <p className="text-sm font-medium text-destructive">{error}</p>}
    </div>
  )
}
