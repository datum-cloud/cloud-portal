import { BillingCycleAlert } from './components/billing-cycle-alert';
import { IdleMeterList } from './components/idle-meter-list';
import { MeterCard } from './components/meter-card';
import { SpendValue } from './components/spend-value';
import { UsageDashboardSkeleton } from './components/usage-dashboard-skeleton';
import { UsageSummaryTable } from './components/usage-summary-table';
import { UsageToolbar } from './components/usage-toolbar';
import type { UsageDisplayNameOption, UsageProjectOption } from './usage.types';
import { toUsageView } from './usage.view';
import { useOrgUsageDashboard } from '@/modules/billing/usage.queries';
import type { UsageSpend } from '@/modules/billing/usage.types';
import { useHttpProxies } from '@/resources/http-proxies';
import { useProjects, filterActiveProjects } from '@/resources/projects';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { Text, Title } from '@datum-cloud/datum-ui/typography';
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
          <Title as="h2" level={6} weight="medium" textColor="default">
            {title}
          </Title>
          <Text as="p" textColor="muted" className="leading-relaxed">
            {description}
          </Text>
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="border-border grid min-w-0 grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-12">
      <div className="flex min-w-0 flex-col gap-2">
        <Title as="h2" level={6} weight="medium" textColor="default">
          {title}
        </Title>
        <Text as="p" textColor="muted" className="leading-relaxed">
          {description}
        </Text>
      </div>
      <div className="flex min-w-0 flex-col gap-4">{children}</div>
    </section>
  );
};

function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <Text as="p" size="lg" weight="medium">
        {title}
      </Text>
      <Text as="p" textColor="muted" className="max-w-sm">
        {body}
      </Text>
    </div>
  );
}

function UsagePageHeader({
  projects,
  billingCycles,
  isLoading,
  isPlaceholder,
  hideProjectSelect,
  spend,
  spendUnavailable,
  billingCycleError,
}: {
  projects: UsageProjectOption[];
  billingCycles: { value: 'current' | 'previous'; label: string }[];
  isLoading?: boolean;
  isPlaceholder?: boolean;
  hideProjectSelect?: boolean;
  spend?: UsageSpend;
  spendUnavailable?: boolean;
  /** The billing account lookup failed, so the cycles are defaults. */
  billingCycleError?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
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
        {spend || spendUnavailable ? (
          <div className="shrink-0 text-left lg:text-right">
            <Text as="p" size="xs" textColor="muted">
              Spend this period
            </Text>
            <Text as="p" size="xl" weight="semibold" textColor="default" className="sm:text-2xl">
              <SpendValue spend={spend} unavailable={spendUnavailable} />
            </Text>
          </div>
        ) : null}
      </div>
      <BillingCycleAlert show={billingCycleError} />
    </div>
  );
}

export interface UsageDashboardProps {
  orgId: string;
  orgLabel?: string;
  /**
   * When set, usage is locked to this project (no project picker) and read
   * in the project's own context. Used by the project-scoped usage page.
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
  } = useOrgUsageDashboard(
    orgId,
    selectedProject,
    selectedBillingCycle,
    hideProjectSelect ? 'project' : 'organization',
    { enabled: !!orgId }
  );

  const albsQuery = useHttpProxies(selectedProject === 'all' ? '' : selectedProject, {
    staleTime: QUERY_STALE_TIME,
  });
  const albs: UsageDisplayNameOption[] = useMemo(
    () =>
      (albsQuery.data ?? []).map((proxy) => ({
        name: proxy.name,
        displayName: proxy.chosenName ?? '',
      })),
    [albsQuery.data]
  );

  const result = dashboard?.usage;
  const billingCycles = dashboard?.billingCycles ?? [];
  const billingCycleError = dashboard?.billingAccountError ?? false;
  const isRefetching = isFetching && !isLoading;

  const selectedProjectLabel =
    selectedProject === 'all'
      ? null
      : (projects.find((project) => project.name === selectedProject)?.displayName ??
        selectedProject);

  const scopeDescription =
    selectedProjectLabel != null
      ? `Metered consumption for the ${selectedProjectLabel} project in the selected billing period.`
      : 'Metered consumption across all projects in this organization for the selected billing period.';

  const dashboardKey = `${selectedProject}-${selectedBillingCycle}`;
  const toolbarLoading =
    (!hideProjectSelect && projectsQuery.isLoading) || (isLoading && billingCycles.length === 0);

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
          billingCycleError={billingCycleError}
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

  const view = toUsageView(result, projects, albs);

  if (!view) {
    return (
      <div className="flex w-full flex-col gap-6">
        <UsagePageHeader
          projects={projects}
          billingCycles={billingCycles}
          isLoading={isRefetching}
          hideProjectSelect={hideProjectSelect}
          billingCycleError={billingCycleError}
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

  // Services with any usage get cards; fully idle ones collapse into one
  // list at the bottom so the page leads with what was actually used.
  const activeGroups = view.groups.filter((group) => group.meters.length > 0);
  const idleGroups = view.groups.filter((group) => group.meters.length === 0);

  return (
    <div className="flex w-full flex-col gap-6">
      <UsagePageHeader
        projects={projects}
        billingCycles={billingCycles}
        isLoading={isRefetching}
        hideProjectSelect={hideProjectSelect}
        billingCycleError={billingCycleError}
        spend={view.spend}
        spendUnavailable={view.spendUnavailable}
      />

      <div
        key={dashboardKey}
        className={cn(
          'border-border min-w-0 border-t',
          isRefetching && 'opacity-60 transition-opacity'
        )}>
        <Section title="Usage summary" layout="grid" description={scopeDescription}>
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {activeGroups.map((group) => (
          <Section key={group.id} title={group.title} description={group.description} layout="grid">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {group.meters.map((meter) => (
                <MeterCard key={`${dashboardKey}-${meter.id}`} meter={meter} />
              ))}
            </div>
            {group.idleMeters.length > 0 ? (
              <IdleMeterList
                className="mt-4"
                groups={[{ id: group.id, meters: group.idleMeters }]}
              />
            ) : null}
          </Section>
        ))}

        {idleGroups.length > 0 ? (
          <Section
            title="No usage this period"
            description="These services have meters but recorded nothing in the selected billing period."
            layout="grid">
            <IdleMeterList
              groups={idleGroups.map((group) => ({
                id: group.id,
                title: group.title,
                meters: group.idleMeters,
              }))}
            />
          </Section>
        ) : null}
      </div>
    </div>
  );
}
