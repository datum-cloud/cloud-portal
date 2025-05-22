import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  ControlPlaneStatus,
  IControlPlaneStatus,
} from '@/resources/interfaces/control-plane.interface'
import { cn } from '@/utils/misc'
import { CircleIcon, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

export const StatusBadge = ({
  status,
  type = 'dot',
  showTooltip = true,
  badgeClassName,
  loadingText = 'Setting up...',
  errorText = 'Failed',
  readyText = 'Ready',
  tooltipText,
}: {
  status?: IControlPlaneStatus
  type?: 'dot' | 'badge'
  showTooltip?: boolean
  badgeClassName?: string
  loadingText?: string
  errorText?: string
  readyText?: string
  tooltipText?: string | React.ReactNode
}) => {
  const [planeStatus, setPlaneStatus] = useState<ControlPlaneStatus>(
    ControlPlaneStatus.Pending,
  )
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (status) {
      setPlaneStatus(status.status)
      setMessage(status.message)
    }
  }, [status])

  const Dot = () => {
    return planeStatus === ControlPlaneStatus.Success ? (
      <CircleIcon
        className="size-3 cursor-default fill-green-500 text-green-500"
        aria-hidden="true"
      />
    ) : planeStatus === ControlPlaneStatus.Error ? (
      <CircleIcon
        className="size-3 cursor-default fill-red-500 text-red-500"
        aria-hidden="true"
      />
    ) : planeStatus === ControlPlaneStatus.Pending ? (
      <Loader2 className="size-3 animate-spin cursor-default" />
    ) : null
  }

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          'w-fit',
          !showTooltip || planeStatus === ControlPlaneStatus.Success
            ? 'pointer-events-none'
            : '',
        )}>
        {type === 'dot' ? (
          <Dot />
        ) : (
          <Badge
            variant="outline"
            className={cn(
              'flex cursor-default items-center gap-1 border-none text-sm font-normal',
              badgeClassName,
            )}>
            <Dot />
            {planeStatus === ControlPlaneStatus.Success
              ? readyText
              : planeStatus === ControlPlaneStatus.Error
                ? errorText
                : loadingText}
          </Badge>
        )}
      </TooltipTrigger>
      <TooltipContent>{tooltipText ?? message}</TooltipContent>
    </Tooltip>
  )
}
