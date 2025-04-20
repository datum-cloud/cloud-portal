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
  isRequired?: boolean
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
        <div className="relative flex w-fit items-center gap-2">
          <Label className={cn('gap-0', errors && 'text-destructive', labelClassName)}>
            {label}
            {isRequired && (
              <span className="text-destructive align-super text-sm leading-0">*</span>
            )}
          </Label>
          {tooltipInfo && (
            <Tooltip>
              <TooltipTrigger asChild>
                <InfoIcon className="absolute top-0 -right-5 size-4 cursor-pointer" />
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
