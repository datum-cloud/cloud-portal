import { BadgeCopy } from '@/components/badge/badge-copy';
import DiscordIcon from '@/components/icon/discord';
import { GitHubLineIcon } from '@/components/icon/github-line';
import { ActionCard } from '@/features/project/dashboard';
import { AIEdgeIllustration } from '@/features/project/illustrations/ai-edge';
import { DnsIllustration } from '@/features/project/illustrations/dns';
import { DomainIllustration } from '@/features/project/illustrations/domain';
import { MetricsIllustration } from '@/features/project/illustrations/metrics';
import { AnalyticsAction, useAnalytics } from '@/modules/fathom';
import { useApp } from '@/providers/app.provider';
import { createDnsZoneService } from '@/resources/dns-zones';
import { createDomainService } from '@/resources/domains';
import { createExportPolicyService } from '@/resources/export-policies';
import { createHttpProxyService } from '@/resources/http-proxies';
import NotFound from '@/routes/not-found';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, Icon, Row } from '@datum-ui/components';
import { CalendarFold } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  data,
  type LoaderFunctionArgs,
  useLoaderData,
  useRouteLoaderData,
  useNavigate,
} from 'react-router';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DashboardCardConfig = {
  key: string;
  isCompleted: boolean;
  illustration: ReactNode;
  completedTitle: string;
  pendingTitle: string;
  buttonLabel: string;
  viewPath: string;
  createPath: string;
  analyticsAction: (typeof AnalyticsAction)[keyof typeof AnalyticsAction];
};

type CommunityLink = {
  href: string;
  icon: ReactNode;
  label: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NEW_USER_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

// ---------------------------------------------------------------------------
// Route config
// ---------------------------------------------------------------------------

export const handle = {
  breadcrumb: () => <span>Home</span>,
  hideBreadcrumb: true,
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;
  if (!projectId) {
    return data({ hasAiEdge: false, hasDomains: false, hasDnsZones: false, hasMetrics: false });
  }

  const [httpProxiesResult, domainsResult, dnsZonesResult, exportPoliciesResult] =
    await Promise.allSettled([
      createHttpProxyService().list(projectId, { limit: 1 }),
      createDomainService().list(projectId, { limit: 1 }),
      createDnsZoneService().list(projectId, { limit: 1 }),
      createExportPolicyService().list(projectId, { limit: 1 }),
    ]);

  return data({
    hasAiEdge: httpProxiesResult.status === 'fulfilled' && httpProxiesResult.value.length > 0,
    hasDomains: domainsResult.status === 'fulfilled' && domainsResult.value.length > 0,
    hasDnsZones: dnsZonesResult.status === 'fulfilled' && dnsZonesResult.value.length > 0,
    hasMetrics:
      exportPoliciesResult.status === 'fulfilled' && exportPoliciesResult.value.length > 0,
  });
};

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function ProjectHomePage() {
  const { project } = useRouteLoaderData('project-detail');
  const { hasAiEdge, hasDomains, hasDnsZones, hasMetrics } = useLoaderData<typeof loader>();
  const { trackAction } = useAnalytics();
  const navigate = useNavigate();
  const { user } = useApp();

  const isNewUser = Boolean(
    user?.createdAt && Date.now() - new Date(user.createdAt).getTime() < NEW_USER_THRESHOLD_MS
  );

  if (!project) {
    return <NotFound />;
  }

  const projectName = project.name;

  const cards: DashboardCardConfig[] = [
    {
      key: 'ai-edge',
      isCompleted: hasAiEdge,
      illustration: <AIEdgeIllustration variant={hasAiEdge ? 'completed' : 'default'} />,
      completedTitle: 'AI Edge deployed',
      pendingTitle: 'Deploy an AI Edge',
      buttonLabel: 'Go to AI Edge',
      viewPath: getPathWithParams(paths.project.detail.proxy.root, { projectId: projectName }),
      createPath: getPathWithParams(
        paths.project.detail.proxy.root,
        { projectId: projectName },
        new URLSearchParams({ action: 'create' })
      ),
      analyticsAction: AnalyticsAction.AddProxy,
    },
    {
      key: 'domains',
      isCompleted: hasDomains,
      illustration: <DomainIllustration variant={hasDomains ? 'completed' : 'default'} />,
      completedTitle: 'Domains added',
      pendingTitle: 'Add a Domain',
      buttonLabel: 'Go to Domains',
      viewPath: getPathWithParams(paths.project.detail.domains.root, { projectId: projectName }),
      createPath: getPathWithParams(
        paths.project.detail.domains.root,
        { projectId: projectName },
        new URLSearchParams({ action: 'create' })
      ),
      analyticsAction: AnalyticsAction.AddDomain,
    },
    {
      key: 'dns',
      isCompleted: hasDnsZones,
      illustration: <DnsIllustration variant={hasDnsZones ? 'completed' : 'default'} />,
      completedTitle: 'DNS migrated',
      pendingTitle: 'Migrate DNS to Datum',
      buttonLabel: 'Go to DNS',
      viewPath: getPathWithParams(paths.project.detail.dnsZones.root, { projectId: projectName }),
      createPath: getPathWithParams(
        paths.project.detail.dnsZones.root,
        { projectId: projectName },
        new URLSearchParams({ action: 'create' })
      ),
      analyticsAction: AnalyticsAction.TransferDnsToDatum,
    },
    {
      key: 'metrics',
      isCompleted: hasMetrics,
      illustration: <MetricsIllustration variant={hasMetrics ? 'completed' : 'default'} />,
      completedTitle: 'Metrics sent to Grafana',
      pendingTitle: 'Send metrics to Grafana',
      buttonLabel: 'Go to Metrics',
      viewPath: getPathWithParams(paths.project.detail.metrics.root, { projectId: projectName }),
      createPath: getPathWithParams(
        paths.project.detail.metrics.exportPolicies.new,
        { projectId: projectName },
        new URLSearchParams({ action: 'create', provider: 'grafana' })
      ),
      analyticsAction: AnalyticsAction.CreateExportPolicy,
    },
  ];

  const handleCardClick = (card: DashboardCardConfig) => {
    if (card.isCompleted) {
      navigate(card.viewPath);
    } else {
      trackAction(card.analyticsAction);
      navigate(card.createPath);
    }
  };

  const communityLinks: CommunityLink[] = [
    {
      href: 'https://link.datum.net/events',
      icon: (
        <Icon icon={CalendarFold} size={20} className="dark:text-icon-tertiary text-icon-primary" />
      ),
      label: 'Huddles & meetups',
    },
    {
      href: 'https://link.datum.net/discord',
      icon: <DiscordIcon className="dark:text-icon-tertiary text-icon-primary size-5" />,
      label: 'Join us on Discord',
    },
    {
      href: 'https://github.com/datum-cloud',
      icon: <GitHubLineIcon className="dark:text-icon-tertiary text-icon-primary size-5" />,
      label: 'Find us on GitHub',
    },
  ];

  return (
    <div className="mx-auto flex w-full flex-col gap-8">
      {/* Header */}
      <Row gutter={[16, 8]}>
        <Col md={12} xs={24}>
          <div className="flex flex-col gap-2">
            <h1 className="text-foreground text-2xl font-semibold">
              {isNewUser
                ? `Hey ${user?.givenName ?? 'there'}, glad to have you!`
                : `Welcome back, ${user?.givenName ?? 'there'}`}
            </h1>
            <p className="dark:text-card-quaternary text-foreground/60 text-sm font-normal">
              {isNewUser
                ? "If you're ready to get going, here are some great places to start..."
                : "Here's an overview of your project."}
            </p>
          </div>
        </Col>
        <Col md={12} xs={24}>
          <div className="flex justify-start sm:justify-end">
            <BadgeCopy
              value={project.name ?? ''}
              text={project.name ?? ''}
              badgeTheme="solid"
              badgeType="muted"
              className="bg-table-accent"
            />
          </div>
        </Col>
      </Row>

      {/* Action cards */}
      <Row
        gutter={[
          { xs: 8, sm: 16, md: 24, xl: 32 },
          { xs: 8, sm: 16, md: 24, xl: 32 },
        ]}>
        {cards.map((card) => (
          <Col key={card.key} xs={24} sm={12} md={12} xl={6} className="h-full max-h-[380px]">
            <ActionCard
              isCompleted={card.isCompleted}
              image={card.illustration}
              className="h-full"
              title={card.isCompleted ? card.completedTitle : card.pendingTitle}
              onClick={() => handleCardClick(card)}
              buttonLabel={card.buttonLabel}
            />
          </Col>
        ))}
      </Row>

      {/* Community */}
      <Row>
        <Col span={24}>
          <div className="dark:border-card relative flex h-auto min-h-[300px] w-full flex-col items-center justify-center rounded-lg bg-white/50 p-9 pb-8 shadow dark:bg-[#18273A]">
            <h2 className="mb-2 text-lg font-medium">Datum community</h2>
            <p className="dark:text-card-quaternary text-foreground/60 text-sm font-normal">
              Looking for some help or share some knowledge? We&apos;d love to see you!
            </p>

            <div className="bg-card border-card-quaternary dark:border-quaternary shadow-tooltip mt-7 flex min-w-[224px] flex-col gap-3.5 rounded-lg border px-6 py-7">
              {communityLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center justify-center gap-3.5">
                  {link.icon}
                  <span className="text-xs transition-all group-hover:underline">{link.label}</span>
                </a>
              ))}
            </div>

            <img
              src="/images/scene-9.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-1/2 h-auto max-w-[70px] -translate-x-[calc(50%+120px)] select-none"
            />
            <img
              src="/images/scene-10.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-1/2 bottom-0 h-auto max-w-[80px] translate-x-[calc(50%+125px)] select-none sm:max-w-[110px] sm:translate-x-[calc(50%+145px)]"
            />
          </div>
        </Col>
      </Row>
    </div>
  );
}
