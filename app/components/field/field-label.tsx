import { Tooltip } from '@datum-ui/components';
import { cn } from '@shadcn/lib/utils';
import { Label } from '@shadcn/ui/label';
import { CircleHelp } from 'lucide-react';
import { useState } from 'react';

export const FieldLabel = ({
  className,
  label,
  isError,
  isRequired,
  tooltipInfo,
}: {
  className?: string;
  label: string | React.ReactNode;
  isError?: boolean;
  isRequired?: boolean;
  tooltipInfo?: string | React.ReactNode;
}) => {
  const [isTooltipVisible, setIsTooltipVisible] = useState<boolean>(false);
  const [isHovering, setIsHovering] = useState<boolean>(false);

  const handleMouseEnter = (): void => setIsHovering(true);
  const handleMouseLeave = (): void => setIsHovering(false);

  const handleTooltipOpenChange = (open: boolean): void => {
    setIsTooltipVisible(open);
  };
  return (
    <div
      className="relative flex w-fit items-center space-x-2"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}>
      <Label className={cn('gap-0', isError && 'text-destructive', className)}>
        {label}
        {isRequired && <span className="text-destructive align-super text-sm leading-0">*</span>}
      </Label>
      {tooltipInfo && (
        <Tooltip
          message={tooltipInfo}
          open={isTooltipVisible}
          onOpenChange={handleTooltipOpenChange}
          side="bottom">
          <CircleHelp
            className={cn(
              'text-muted-foreground absolute -top-0 -right-3 size-3.5 cursor-pointer transition-opacity duration-400',
              isHovering || isTooltipVisible ? 'opacity-100' : 'opacity-0'
            )}
          />
        </Tooltip>
      )}
    </div>
  );
};
