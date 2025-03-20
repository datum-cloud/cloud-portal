import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/utils/misc'
import { InfoIcon } from 'lucide-react'

interface FieldProps {
  label?: string | React.ReactNode
  children: React.ReactNode
  description?: string | React.ReactNode
  errors?: string[]
  className?: string
  labelClassName?: string
  tooltipInfo?: string | React.ReactNode
}

export const Field = ({
  label,
  children,
  description,
  errors,
  className,
  labelClassName,
  tooltipInfo,
}: FieldProps) => {
  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {label && (
        <div className="flex items-center gap-2">
          <Label className={cn(errors && 'text-destructive', labelClassName)}>
            {label}
          </Label>
          {tooltipInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="size-4 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>{tooltipInfo}</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      {children}
      {description && <p className="text-muted-foreground text-sm">{description}</p>}
      {errors && (
        <ul
          className={cn(
            'text-destructive space-y-1 text-sm font-medium',
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
