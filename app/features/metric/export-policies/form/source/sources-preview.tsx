import { List, ListItem } from '@/components/list/list';
import { ExportPolicySourceTypeEnum } from '@/resources/export-policies';
import { ExportPolicySourcesSchema } from '@/resources/export-policies';
import { Badge } from '@datum-ui/components';
import { Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Separator } from '@shadcn/ui/separator';
import { CodeIcon } from 'lucide-react';
import { useMemo } from 'react';

export const SourcesPreview = ({ values }: { values: ExportPolicySourcesSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.sources ?? []).length > 0) {
      return values.sources.map((source) => ({
        label: source.name,
        content: (
          <div className="flex items-center gap-2">
            <Badge theme="outline">{source.type}</Badge>
            <Separator orientation="vertical" className="h-4" />
            {source.type === ExportPolicySourceTypeEnum.METRICS && source.metricQuery && (
              <Tooltip
                message={
                  <p className="font-mono text-xs whitespace-pre-wrap">{source.metricQuery}</p>
                }>
                <Badge
                  type="secondary"
                  className="hover:bg-secondary-hover flex cursor-help items-center gap-1">
                  <Icon icon={CodeIcon} className="h-3 w-3" />
                  <span>MetricsQL Query</span>
                </Badge>
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
