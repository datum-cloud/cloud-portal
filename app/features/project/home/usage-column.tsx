import {
  formatCompactCurrency,
  formatCompactUsage,
  HOME_COLUMN_LIMIT,
  topMeters,
} from './home.helpers';
import {
  COLUMN_ROW_CLASS,
  ResourceColumnEmpty,
  ResourceColumnFrame,
  ResourceColumnSkeleton,
} from './resource-column';
import { UsageSparkline } from '@/features/usage/components/usage-sparkline';
import { toUsageView } from '@/features/usage/usage.view';
import { useOrgUsageDashboard } from '@/modules/billing/usage.queries';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { Gauge } from 'lucide-react';

/**
 * This billing period's spend and busiest meters for the project. Shares the
 * Usage page's query, so opening that page afterwards is instant.
 */
export function UsageColumn({
  projectId,
  projectDisplayName,
  orgId,
}: {
  projectId: string;
  projectDisplayName: string;
  orgId: string;
}) {
  const { data, isLoading, isError } = useOrgUsageDashboard(orgId, projectId, 'current');
  const result = data?.usage;

  const emptyIcon = <Icon icon={Gauge} size={18} aria-hidden />;

  function body() {
    if (isLoading) return <ResourceColumnSkeleton label="Usage" />;
    if (isError || !result) {
      return (
        <ResourceColumnEmpty icon={emptyIcon}>
          Usage isn&apos;t available right now.
        </ResourceColumnEmpty>
      );
    }
    if (result.status === 'no-billing-account') {
      return (
        <ResourceColumnEmpty icon={emptyIcon} title="No billing account">
          Link this project to a billing account to start tracking usage.
        </ResourceColumnEmpty>
      );
    }
    if (result.status !== 'ok') {
      return (
        <ResourceColumnEmpty icon={emptyIcon}>
          Usage isn&apos;t available for this project yet.
        </ResourceColumnEmpty>
      );
    }

    const view = toUsageView(result, [{ name: projectId, displayName: projectDisplayName }]);
    if (!view) {
      return (
        <ResourceColumnEmpty icon={emptyIcon} title="No usage yet">
          Metered usage shows here once this project starts using a service.
        </ResourceColumnEmpty>
      );
    }

    // The spend row takes the first slot, so meters get the rest.
    const meters = topMeters(view.summaryRows, HOME_COLUMN_LIMIT - 1);

    return (
      <ul className="flex flex-col">
        <li className={COLUMN_ROW_CLASS}>
          <Text size="sm" textColor="muted" className="min-w-0 flex-1">
            Spend this period
          </Text>
          <Text size="sm" weight="semibold" className="shrink-0 tabular-nums">
            {formatCompactCurrency(result.totalSpend, result.currencyCode)}
          </Text>
        </li>
        {meters.map((meter) => (
          <li key={meter.id} className={COLUMN_ROW_CLASS}>
            <Text size="sm" ellipsis className="min-w-0 flex-1" title={meter.label}>
              {meter.label}
            </Text>
            <UsageSparkline
              apiName={`home-${meter.apiName}`}
              unit={meter.unit}
              series={meter.series}
              className="h-6 w-16 shrink-0"
            />
            <Text size="xs" textColor="muted" className="w-16 shrink-0 text-right tabular-nums">
              {formatCompactUsage(meter.unit, meter.used)}
            </Text>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ResourceColumnFrame
      title="Usage"
      href={getPathWithParams(paths.project.detail.usage, { projectId })}
      isLoading={isLoading}
      testId="project-home-usage">
      {body()}
    </ResourceColumnFrame>
  );
}
