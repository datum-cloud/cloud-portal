import { List, ListItem } from '@/components/list/list';
import { ExportPolicySinkTypeEnum } from '@/resources/export-policies';
import { ExportPolicySinksSchema } from '@/resources/export-policies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Separator } from '@datum-cloud/datum-ui/separator';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { LinkIcon } from 'lucide-react';
import { useMemo } from 'react';

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
              <Badge theme="outline">{sink.type}</Badge>
              <Separator orientation="vertical" className="h-4" />
              {sink.sources && sink.sources.length > 0 && (
                <Tooltip
                  message={
                    <div className="flex flex-col gap-1">
                      {sink.sources.map((source, idx) => (
                        <Text as="p" size="xs" key={idx}>
                          {source}
                        </Text>
                      ))}
                    </div>
                  }>
                  <Badge
                    type="secondary"
                    className="hover:bg-secondary-hover flex cursor-help items-center gap-1">
                    <Icon icon={LinkIcon} className="h-3 w-3" />
                    <span>Sources ({sink.sources.length})</span>
                  </Badge>
                </Tooltip>
              )}
            </div>

            {/* Bottom row with sink type specific configuration */}
            {sink.type === ExportPolicySinkTypeEnum.PROMETHEUS && sink.prometheusRemoteWrite && (
              <Text as="div" textColor="muted" className="flex flex-col items-start gap-2">
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
                  <Text size="xs">
                    Batch: Max Size: {sink.prometheusRemoteWrite.batch.maxSize}, Timeout:{' '}
                    {sink.prometheusRemoteWrite.batch.timeout}s
                  </Text>
                  <Separator orientation="vertical" className="h-4" />
                  <Text size="xs">
                    Retry: Max Attempts: {sink.prometheusRemoteWrite.retry.maxAttempts}, Backoff:{' '}
                    {sink.prometheusRemoteWrite.retry.backoffDuration}s
                  </Text>
                </div>
              </Text>
            )}
          </div>
        ),
      }));
    }

    return [];
  }, [values]);

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />;
};
