import { Label } from '@/components/ui/label'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/utils/misc'
import { CircleHelp } from 'lucide-react'
import { useState } from 'react'

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
  const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false)
  const [isHovering, setIsHovering] = useState<boolean>(false)

  const handleMouseEnter = (): void => setIsHovering(true)
  const handleMouseLeave = (): void => setIsHovering(false)

  const handleTooltipOpenChange = (open: boolean): void => {
    setIsTooltipVisible(open)
  }

  return (
    <div className={cn('flex flex-col space-y-2', className)}>
      {label && (
        <div
          className="relative flex w-fit items-center space-x-2"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}>
          <Label className={cn('gap-0', errors && 'text-destructive', labelClassName)}>
            {label}
            {isRequired && (
              <span className="text-destructive align-super text-sm leading-0">*</span>
            )}
          </Label>
          {tooltipInfo && (
            <Tooltip open={isTooltipVisible} onOpenChange={handleTooltipOpenChange}>
              <TooltipTrigger asChild>
                <CircleHelp
                  className={cn(
                    'text-foreground fill-background absolute -top-0 -right-3 size-3.5 cursor-pointer transition-opacity duration-400',
                    isHovering || isTooltipVisible ? 'opacity-100' : 'opacity-0',
                  )}
                />
              </TooltipTrigger>
              <TooltipContent className="z-50" data-side="bottom">
                {tooltipInfo}
              </TooltipContent>
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
