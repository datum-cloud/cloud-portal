import { Loader2, CircleIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { IProjectStatus } from '@/resources/interfaces/project.interface'
import { cn } from '@/utils/misc'
import { useMemo } from 'react'

export function ProjectStatus({
  status,
  className,
  showTooltip = true,
}: {
  status: IProjectStatus
  className?: string
  showTooltip?: boolean
}) {
  const data = useMemo(() => {
    if (status) {
      const condition = status.conditions[0]
      return {
        isReady: condition.status === 'True',
        message: condition.message,
      }
    }

    return {
      isReady: false,
      message: 'Project is being provisioned...',
    }
  }, [status])

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          (!showTooltip || data.isReady) && 'pointer-events-none',
          'cursor-default',
        )}>
        <div
          className={cn(
            'flex items-center gap-1 rounded-md border bg-muted px-2 py-0.5 text-sm',
            className,
          )}
          role="status"
          aria-label={`Project status: ${data.isReady ? 'Ready' : 'Setting up'}`}>
          {data.isReady ? (
            <CircleIcon
              className="size-2 fill-green-500 text-green-500"
              aria-hidden="true"
            />
          ) : (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          )}
          {data.isReady ? 'Ready' : 'Setting up...'}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{data.message}</p>
      </TooltipContent>
    </Tooltip>
  )
}
