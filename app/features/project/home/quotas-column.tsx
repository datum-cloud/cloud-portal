import { HOME_COLUMN_LIMIT } from './home.helpers';
import {
  COLUMN_ROW_CLASS,
  ResourceColumnEmpty,
  ResourceColumnFrame,
  ResourceColumnSkeleton,
} from './resource-column';
import { useProjectQuotas } from './use-project-quotas';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import { ShieldCheck } from 'lucide-react';

/** Same thresholds as the Quotas page's usage bars. */
function barColor(percentage: number): string {
  if (percentage <= 70) return 'bg-green-500';
  if (percentage <= 90) return 'bg-yellow-500';
  return 'bg-red-500';
}

/** The project's quotas, fullest first, as small usage bars. */
export function QuotasColumn({ projectId }: { projectId: string }) {
  const { quotas, isLoading, isError } = useProjectQuotas(projectId);
  const items = quotas.slice(0, HOME_COLUMN_LIMIT);

  return (
    <ResourceColumnFrame
      title="Quotas"
      href={getPathWithParams(paths.project.detail.quotas, { projectId })}
      isLoading={isLoading}
      testId="project-home-quotas">
      {isLoading ? (
        <ResourceColumnSkeleton label="Quotas" />
      ) : isError ? (
        <ResourceColumnEmpty icon={<Icon icon={ShieldCheck} size={18} aria-hidden />}>
          Quotas aren&apos;t available for this project right now.
        </ResourceColumnEmpty>
      ) : items.length === 0 ? (
        <ResourceColumnEmpty
          icon={<Icon icon={ShieldCheck} size={18} aria-hidden />}
          title="No limits yet">
          Quotas for the services this project uses will show here.
        </ResourceColumnEmpty>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.key} className={COLUMN_ROW_CLASS}>
              <Text size="sm" ellipsis className="min-w-0 flex-1" title={item.label}>
                {item.label}
              </Text>
              <Text size="xs" textColor="muted" className="shrink-0 tabular-nums">
                {item.used.toLocaleString()} / {item.limit.toLocaleString()}
              </Text>
              <div
                className="bg-muted h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                role="img"
                aria-label={`${item.percentage}% used`}>
                <div
                  className={cn('h-full rounded-full', barColor(item.percentage))}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </ResourceColumnFrame>
  );
}
