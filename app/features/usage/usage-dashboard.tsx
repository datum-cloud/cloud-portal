import { MeterCard } from './components/meter-card';
import { UsageDashboardSkeleton } from './components/usage-dashboard-skeleton';
import { UsageSummaryTable } from './components/usage-summary-table';
import { UsageToolbar } from './components/usage-toolbar';
import { formatCurrency } from './usage.format';
import type { UsageProjectOption } from './usage.types';
import { toUsageView } from './usage.view';
import { useOrgUsageDashboard } from '@/modules/billing/usage.queries';
import { useProjects, filterActiveProjects } from '@/resources/projects';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BarChart3Icon } from 'lucide-react';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

function resolveProjectSelection(
  projectParam: string | null,
  projects: UsageProjectOption[]
): string {
  if (!projectParam || projectParam === 'all') return 'all';
  return projects.some((project) => project.name === projectParam) ? projectParam : 'all';
}

function resolveCycleSelection(cycleParam: string | null): 'current' | 'previous' {
  return cycleParam === 'previous' ? 'previous' : 'current';
}

const Section = ({
  title,
  description,
  children,
  layout = 'split',
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  layout?: 'split' | 'grid';
}) => {
  if (layout === 'grid') {
    return (
      <section className="border-border min-w-0 border-b py-8 last:border-b-0 last:pb-0">
        <div className="mb-6 flex max-w-2xl flex-col gap-2">
          <h2 className="text-foreground text-base font-medium">{title}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="border-border grid min-w-0 grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
};

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}

function UsagePageHeader({
  projects,
  billingCycles,
  isLoading,
  isPlaceholder,
  hideProjectSelect,
  totalSpend,
  currencyCode,
}: {
  projects: UsageProjectOption[];
  billingCycles: { value: 'current' | 'previous'; label: string }[];
  isLoading?: boolean;
  isPlaceholder?: boolean;
  hideProjectSelect?: boolean;
  totalSpend?: number;
  currencyCode?: string;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <UsageToolbar
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isLoading}
          isPlaceholder={isPlaceholder}
          hideProjectSelect={hideProjectSelect}
        />
      </div>
      {totalSpend !== undefined ? (
        <div className="shrink-0 text-left lg:text-right">
          <p className="text-muted-foreground text-xs">Total spend this period</p>
          <p className="text-foreground text-xl font-semibold tabular-nums sm:text-2xl">
            {formatCurrency(totalSpend, currencyCode)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export interface UsageDashboardProps {
  orgId: string;
  orgLabel?: string;
  /**
   * When set, usage is locked to this project (no project picker). Used by
   * the project-scoped Observe usage page.
   */
  lockedProject?: UsageProjectOption;
}

/**
 * Org and project usage dashboards share this surface. Org scope keeps the
 * project filter; project scope passes `lockedProject` and hides it.
 */
export function UsageDashboard({ orgId, orgLabel, lockedProject }: UsageDashboardProps) {
  const [searchParams] = useSearchParams();
  const hideProjectSelect = lockedProject != null;

  const projectsQuery = useProjects(orgId, undefined, {
    enabled: !!orgId && !hideProjectSelect,
    staleTime: QUERY_STALE_TIME,
  });

  const projects: UsageProjectOption[] = useMemo(() => {
    if (lockedProject) return [lockedProject];
    return filterActiveProjects(projectsQuery.data?.items ?? []).map((project) => ({
      name: project.name,
      displayName: project.displayName,
    }));
  }, [lockedProject, projectsQuery.data?.items]);

  const selectedProject = lockedProject
    ? lockedProject.name
    : resolveProjectSelection(searchParams.get('project'), projects);
  const selectedBillingCycle = resolveCycleSelection(searchParams.get('cycle'));

  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    error,
  } = useOrgUsageDashboard(orgId, selectedProject, selectedBillingCycle, {
    enabled: !!orgId,
  });

  const result = dashboard?.usage;
  const billingCycles = dashboard?.billingCycles ?? [];
  const isRefetching = isFetching && !isLoading;

  const selectedProjectLabel =
    selectedProject === 'all'
      ? null
      : (projects.find((project) => project.name === selectedProject)?.displayName ??
        selectedProject);

  const scopeDescription =
    selectedProjectLabel != null
      ? `Metered consumption and spend for the ${selectedProjectLabel} project in the selected billing period.`
      : 'Metered consumption and spend across all projects in this organization for the selected billing period.';

  const dashboardKey = `${selectedProject}-${selectedBillingCycle}`;
  const toolbarLoading =
    (!hideProjectSelect && projectsQuery.isLoading) || (isLoading && billingCycles.length === 0);
  const periodSpend = result?.status === 'ok' ? result.totalSpend : undefined;
  const periodCurrency = result?.status === 'ok' ? result.currencyCode : undefined;

  if (isError) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <EmptyState
          title="Usage data not available"
          body={error?.message ?? 'Something went wrong while loading usage data.'}
        />
      </div>
    );
  }

  if (isLoading && !result) {
    return (
      <div className="flex w-full flex-col gap-6">
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isPlaceholder={toolbarLoading}
          hideProjectSelect={hideProjectSelect}
        />
        <UsageDashboardSkeleton scopeDescription={scopeDescription} />
      </div>
    );
  }

  if (!result) {
    return null;
  }

  if (result.status === 'unconfigured') {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <EmptyState
          title="Usage data not available"
          body={
            <>
              Configure{' '}
              <code className="bg-muted rounded px-1 py-0.5 text-xs">AMBERFLO_API_KEY</code> on the
              cloud-portal server to enable this dashboard.
            </>
          }
        />
      </div>
    );
  }

  if (result.status === 'insufficient-permissions') {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <EmptyState
          title="Usage data not available"
          body="Billing permissions are still being provisioned for this organization. Check back soon or contact your admin."
        />
      </div>
    );
  }

  if (result.status === 'no-billing-account') {
    return (
      <div className="flex w-full flex-col gap-6">
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isRefetching}
          hideProjectSelect={hideProjectSelect}
        />
        <EmptyState
          title="No billing account linked"
          body={
            selectedProjectLabel
              ? `"${selectedProjectLabel}" does not have a billing account binding. Assign one from the organization's Billing page to start tracking usage.`
              : `Create a billing account for "${orgLabel ?? orgId}" to start tracking usage. Account-level management lives under your user-level Billing Accounts area.`
          }
        />
      </div>
    );
  }

  const view = toUsageView(result, projects);

  if (!view) {
    return (
      <div className="flex w-full flex-col gap-6">
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isRefetching}
          hideProjectSelect={hideProjectSelect}
          totalSpend={periodSpend}
          currencyCode={periodCurrency}
        />
        <EmptyState
          title="No usage to display"
          body={
            selectedProjectLabel
              ? `Usage data will appear here once "${selectedProjectLabel}" starts consuming resources.`
              : 'Usage data will appear here once this organization starts consuming resources.'
          }
        />
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-6">
      <UsagePageHeader
        projects={projects}
        billingCycles={billingCycles}
        isLoading={isRefetching}
        hideProjectSelect={hideProjectSelect}
        totalSpend={periodSpend}
        currencyCode={periodCurrency}
      />

      <div
        key={dashboardKey}
        className={cn(
          'border-border min-w-0 border-t',
          isRefetching && 'opacity-60 transition-opacity'
        )}>
        <Section title="Usage summary" description={scopeDescription}>
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {view.groups.map((group) => (
          <Section key={group.id} title={group.title} description={group.description} layout="grid">
            {group.meters.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="text-muted-foreground py-12 text-center text-sm">
                  No meters defined yet for this group.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {group.meters.map((meter) => (
                  <MeterCard key={`${dashboardKey}-${meter.id}`} meter={meter} />
                ))}
              </div>
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
