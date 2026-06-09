import { MeterCard } from './components/meter-card';
import { UsageSummaryTable } from './components/usage-summary-table';
import { UsageToolbar } from './components/usage-toolbar';
import { USAGE_GROUPS, USAGE_SUMMARY_ROWS } from './usage.mock';
import { toUsageView } from './usage.view';
import { fetchOrgUsage } from '@/modules/billing/usage.server';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { BarChart3Icon } from 'lucide-react';
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  data,
  useLoaderData,
  useParams,
} from 'react-router';

export const meta: MetaFunction = mergeMeta(() => metaObject('Usage'));

export const handle = {
  breadcrumb: () => <span>Usage</span>,
};

/**
 * Org-wide usage dashboard.
 *
 * The loader gates the surface behind the `UsageMeteringDashboard`
 * feature flag and resolves the org's real billing posture so the empty
 * states (`unconfigured` / `insufficient-permissions` / `no-billing-account`)
 * stay accurate. When live usage exists it is rendered directly — meters
 * are grouped by owning service, units come from the MeterDefinition
 * catalog, quota rings from matching AllowanceBuckets, and breakdown tabs
 * from each meter's declared dimensions. The static `usage.mock.ts`
 * dataset is only used as a fallback when the org has no usage yet, so the
 * redesigned dashboard still has something to show.
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

  const result = await fetchOrgUsage(orgId);
  return data(result);
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
  const result = useLoaderData<typeof loader>();
  const { orgId } = useParams();

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
        <EmptyState
          title="No billing accounts yet"
          body={`Create a billing account for "${orgId ?? 'this organization'}" to start tracking usage. Account-level management lives under your user-level Billing Accounts area.`}
        />
      </div>
    );
  }

  // Render live usage when the org has any; otherwise fall back to the
  // mock dataset so the redesigned dashboard still has something to show.
  const view = toUsageView(result) ?? {
    groups: USAGE_GROUPS,
    summaryRows: USAGE_SUMMARY_ROWS,
  };

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageTitle title="Usage" titleClassName="text-3xl" />
        <UsageToolbar />
      </div>

      <div className="border-border border-t">
        <Section
          title="Usage summary"
          description="Your plan includes a set allowance for each metered service. If exceeded, you may experience restrictions, as you are currently not billed for overages. It may take up to 1 hour to refresh.">
          <UsageSummaryTable rows={view.summaryRows} />
        </Section>

        {view.groups.map((group) => (
          <Section key={group.id} title={group.title} description={group.description}>
            {group.meters.length === 0 ? (
              <Card className="shadow-none">
                <CardContent className="text-muted-foreground py-12 text-center text-sm">
                  No meters defined yet for this group.
                </CardContent>
              </Card>
            ) : (
              group.meters.map((meter) => <MeterCard key={meter.apiName} meter={meter} />)
            )}
          </Section>
        ))}
      </div>
    </div>
  );
}
