import { MeterCard } from './components/meter-card';
import { UsageDashboardSkeleton } from './components/usage-dashboard-skeleton';
import { UsageSummaryTable } from './components/usage-summary-table';
import { UsageToolbar } from './components/usage-toolbar';
import type { UsageProjectOption } from './usage.types';
import { toUsageView } from './usage.view';
import { useOrgUsageDashboard } from '@/modules/billing/usage.queries';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { useProjects } from '@/resources/projects';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { cn } from '@datum-cloud/datum-ui/utils';
import { BarChart3Icon } from 'lucide-react';
import { useMemo } from 'react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  data,
  useParams,
  useSearchParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Usage'));

export const handle = {
  breadcrumb: () => <span>Usage</span>,
};

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

/**
 * Org-wide usage dashboard.
 *
 * The loader only gates the surface behind the `UsageMeteringDashboard`
 * feature flag. Usage data, billing cycle windows, and Amberflo series
 * load client-side via React Query so filter changes don't block the
 * route transition.
 */
export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw data('Organization is required', { status: 400 });
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    throw data('Usage metering is not enabled for this organization', { status: 404 });
  }

  return null;
};

/**
 * Two-column section layout — title + copy on the left, content on the
 * right. Lifted from `routes/account/billing/detail.tsx`. Kept local
 * here so the two consumers can evolve independently until a third
 * page justifies pulling the primitive into `app/components`.
 */
const Section = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => {
  return (
    <section className="border-border grid grid-cols-1 gap-6 border-b py-8 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,22rem)_1fr] md:gap-10 lg:grid-cols-[minmax(0,26rem)_1fr] lg:gap-12">
      <div className="flex flex-col gap-2">
        <h2 className="text-foreground text-base font-medium">{title}</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
};

/** Centered placeholder used by every non-OK loader status. */
function EmptyState({ title, body }: { title: string; body: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <Icon icon={BarChart3Icon} className="text-muted-foreground size-10" />
      <p className="text-lg font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{body}</p>
    </div>
  );
}

export default function OrgUsagePage() {
  const { orgId } = useParams();
  const [searchParams] = useSearchParams();

  const projectsQuery = useProjects(orgId ?? '', undefined, {
    enabled: !!orgId,
    staleTime: QUERY_STALE_TIME,
  });

  const projects: UsageProjectOption[] = useMemo(
    () =>
      (projectsQuery.data?.items ?? []).map((project) => ({
        name: project.name,
        displayName: project.displayName,
      })),
    [projectsQuery.data?.items]
  );

  const selectedProject = resolveProjectSelection(searchParams.get('project'), projects);
  const selectedBillingCycle = resolveCycleSelection(searchParams.get('cycle'));

  const {
    data: dashboard,
    isLoading,
    isFetching,
    isError,
    error,
  } = useOrgUsageDashboard(orgId ?? '', selectedProject, selectedBillingCycle, {
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
      ? `Usage for the ${selectedProjectLabel} project in the current billing period.`
      : 'Usage across all projects in this organization for the current billing period.';

  const dashboardKey = `${selectedProject}-${selectedBillingCycle}`;
  const toolbarLoading = projectsQuery.isLoading || (isLoading && billingCycles.length === 0);

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
        <div className="flex flex-col gap-4">
          <PageTitle title="Usage" titleClassName="text-3xl" />
          <UsageToolbar
            projects={projects}
            billingCycles={billingCycles}
            isPlaceholder={toolbarLoading}
          />
        </div>
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
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />
        <EmptyState
          title="No billing account linked"
          body={
            selectedProjectLabel
              ? `"${selectedProjectLabel}" does not have a billing account binding. Assign one from the organization's Billing page to start tracking usage.`
              : `Create a billing account for "${orgId ?? 'this organization'}" to start tracking usage. Account-level management lives under your user-level Billing Accounts area.`
          }
        />
      </div>
    );
  }

  const view = toUsageView(result, projects);

  if (!view) {
    return (
      <div className="flex w-full flex-col gap-6">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />
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
      <div className="flex flex-col gap-4">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <UsageToolbar projects={projects} billingCycles={billingCycles} isLoading={isRefetching} />
      </div>

      <div
        key={dashboardKey}
        className={cn('border-border border-t', isRefetching && 'opacity-60 transition-opacity')}>
        <Section
          title="Usage summary"
          description={`${scopeDescription} Your plan includes a set allowance for each metered service.`}>
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {view.groups.map((group) => (
          <Section key={group.id} title={group.title} description={`${scopeDescription}`}>
            {group.meters.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="text-muted-foreground py-12 text-center text-sm">
                  No meters defined yet for this group.
                </CardContent>
              </Card>
            ) : (
              group.meters.map((meter) => (
                <MeterCard key={`${dashboardKey}-${meter.apiName}`} meter={meter} />
              ))
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
