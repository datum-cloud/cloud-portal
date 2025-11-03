import { List, ListItem } from '@/components/list/list';
import { ExportPolicySourceType } from '@/resources/interfaces/export-policy.interface';
import { ExportPolicySourcesSchema } from '@/resources/schemas/export-policy.schema';
import { Badge } from '@datum-ui/components';
import { Separator } from '@shadcn/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/ui/tooltip';
import { CodeIcon } from 'lucide-react';
import { useMemo } from 'react';

export const SourcesPreview = ({ values }: { values: ExportPolicySourcesSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.sources ?? []).length > 0) {
      return values.sources.map((source) => ({
        label: source.name,
        content: (
          <div className="flex items-center gap-2">
            <Badge variant="outline">{source.type}</Badge>
            <Separator orientation="vertical" className="h-4" />
            {source.type === ExportPolicySourceType.METRICS && source.metricQuery && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="secondary"
                    className="hover:bg-secondary-hover flex cursor-help items-center gap-1">
                    <CodeIcon className="h-3 w-3" />
                    <span>MetricsQL Query</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs whitespace-pre-wrap">{source.metricQuery}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        ),
      }));
    }

    return [];
  }, [values]);

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />;
};
