import { List, ListItem } from '@/components/list/list'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ExportPolicySinkType } from '@/resources/interfaces/export-policy.interface'
import { ExportPolicySinksSchema } from '@/resources/schemas/export-policy.schema'
import { LinkIcon } from 'lucide-react'
import { useMemo } from 'react'

export const SinksPreview = ({ values }: { values: ExportPolicySinksSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.sinks ?? []).length > 0) {
      return values.sinks.map((sink) => ({
        label: sink.name,
        className: 'items-start',
        content: (
          <div className="flex flex-col gap-2">
            {/* Top row with name, type and sources */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{sink.type}</Badge>
              <Separator orientation="vertical" className="h-4" />
              {sink.sources && sink.sources.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="hover:bg-secondary-hover flex cursor-help items-center gap-1">
                      <LinkIcon className="h-3 w-3" />
                      <span>Sources ({sink.sources.length})</span>
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="flex flex-col gap-1">
                      {sink.sources.map((source, idx) => (
                        <p key={idx} className="text-xs">
                          {source}
                        </p>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bottom row with sink type specific configuration */}
            {sink.type === ExportPolicySinkType.PROMETHEUS &&
              sink.prometheusRemoteWrite && (
                <div className="text-muted-foreground flex flex-col items-start gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Prometheus Configuration:</span>
                    <div className="flex items-center gap-2">
                      <span>Endpoint:</span>
                      <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                        {sink.prometheusRemoteWrite.endpoint}
                      </code>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs">
                      Batch: Max Size: {sink.prometheusRemoteWrite.batch.maxSize},
                      Timeout: {sink.prometheusRemoteWrite.batch.timeout}s
                    </span>
                    <Separator orientation="vertical" className="h-4" />
                    <span className="text-xs">
                      Retry: Max Attempts: {sink.prometheusRemoteWrite.retry.maxAttempts},
                      Backoff: {sink.prometheusRemoteWrite.retry.backoffDuration}s
                    </span>
                  </div>
                </div>
              )}
          </div>
        ),
      }))
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
