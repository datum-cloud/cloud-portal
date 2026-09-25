/**
 * Build the project sidebar as service categories (Deliver / Build / Connect /
 * Observe) plus a collapsible Project Settings section, for enhancement #849.
 * Service categories are always-open `group` sections; nested items with
 * children (e.g. a plugin's Compute) stay collapsible.
 *
 * Service category headers are text-only; their items carry the icons.
 * Project Settings is a collapsible parent with an icon and text-only children.
 */
import { comingSoonHref } from './coming-soon';
import { plannedServicesForSection } from './planned-services';
import { COMING_SOON_BADGE, type ProjectNavSection } from './types';
import { fetchOrgUsageDashboard, usageKeys } from '@/modules/billing/usage.queries';
import { connectorKeys, createConnectorService } from '@/resources/connectors';
import { createDnsZoneService, dnsZoneKeys } from '@/resources/dns-zones';
import { createDomainService, domainKeys } from '@/resources/domains';
import { createExportPolicyService, exportPolicyKeys } from '@/resources/export-policies';
import { createHttpProxyService, httpProxyKeys } from '@/resources/http-proxies';
import { createSecretService, secretKeys } from '@/resources/secrets';
import { createServiceAccountService, serviceAccountKeys } from '@/resources/service-accounts';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import type { NavItem } from '@datum-cloud/datum-ui/app-navigation';
import type { QueryClient } from '@tanstack/react-query';
import {
  ActivityIcon,
  ChartSplineIcon,
  GaugeIcon,
  GlobeIcon,
  HomeIcon,
  PlugIcon,
  SettingsIcon,
  SignpostIcon,
  SplitIcon,
} from 'lucide-react';

export type BuildProjectNavOptions = {
  /** When false, non-Home links are disabled (project control-plane not Ready). */
  isReady?: boolean;
  /** Optional React Query client for sidebar prefetch. */
  queryClient?: QueryClient;
  /** Owning org — used to prefetch the project-scoped usage dashboard. */
  orgId?: string;
};

/** Section id on category parents for plugin merge. Not rendered by datum-ui. */
export type SectionNavItem = NavItem & {
  sectionId?: ProjectNavSection;
};

type OrderedChild = NavItem & { order: number };

function plannedChildren(projectId: string, section: ProjectNavSection): OrderedChild[] {
  return plannedServicesForSection(section).map((service) => {
    const roadmapUrl = service.roadmapUrl?.trim() || undefined;
    if (!roadmapUrl) {
      // No destination — Coming Soon badge, but disabled (no click / no pointer).
      return {
        title: service.title,
        href: null,
        type: 'link' as const,
        icon: service.icon,
        muted: true,
        disabled: true,
        badge: COMING_SOON_BADGE,
        order: service.order,
      };
    }
    return {
      title: service.title,
      href: comingSoonHref(projectId, service.id),
      type: 'link' as const,
      icon: service.icon,
      muted: true,
      badge: COMING_SOON_BADGE,
      order: service.order,
    };
  });
}

/** Sort by `order` but keep the field so plugin merge can insert relatively. */
function sortChildren(children: OrderedChild[]): OrderedChild[] {
  return [...children].sort((a, b) => a.order - b.order);
}

function category(
  title: string,
  sectionId: ProjectNavSection,
  children: OrderedChild[],
  extras?: Partial<NavItem>
): SectionNavItem {
  return {
    title,
    href: null,
    // Always open, no toggle, text-only header. Project Settings overrides via `extras`.
    type: 'group',
    sectionId,
    children: sortChildren(children),
    ...extras,
  };
}

/**
 * Built-in nested project nav. Plugin items are merged separately via
 * {@link mergePluginNavIntoTree}.
 */
export function buildProjectNavTree(
  projectId: string,
  { isReady = true, queryClient, orgId }: BuildProjectNavOptions = {}
): SectionNavItem[] {
  const settingsGeneral = getPathWithParams(paths.project.detail.settings.general, {
    projectId,
  });
  const settingsNotifications = getPathWithParams(paths.project.detail.settings.notifications, {
    projectId,
  });
  const settingsQuotas = getPathWithParams(paths.project.detail.settings.quotas, {
    projectId,
  });
  const settingsBilling = getPathWithParams(paths.project.detail.settings.billing, {
    projectId,
  });

  return [
    {
      title: 'Home',
      href: getPathWithParams(paths.project.detail.home, { projectId }),
      type: 'link',
      icon: HomeIcon,
      onPrefetch: queryClient
        ? () => {
            void queryClient.prefetchQuery({
              queryKey: domainKeys.list(projectId),
              queryFn: () => createDomainService().list(projectId),
            });
            void queryClient.prefetchQuery({
              queryKey: exportPolicyKeys.list(projectId),
              queryFn: () => createExportPolicyService().list(projectId),
            });
          }
        : undefined,
    },
    category(
      'Deliver',
      'deliver',
      [
        {
          title: 'Domains',
          order: 10,
          icon: GlobeIcon,
          href: getPathWithParams(paths.project.detail.domains.root, { projectId }),
          type: 'link',
          disabled: !isReady,
          onPrefetch: queryClient
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: domainKeys.list(projectId),
                  queryFn: () => createDomainService().list(projectId),
                });
              }
            : undefined,
        },
        {
          title: 'DNS',
          order: 20,
          icon: SignpostIcon,
          href: getPathWithParams(paths.project.detail.dnsZones.root, { projectId }),
          type: 'link',
          disabled: !isReady,
          onPrefetch: queryClient
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: dnsZoneKeys.list(projectId),
                  queryFn: () => createDnsZoneService().list(projectId),
                });
              }
            : undefined,
        },
        {
          title: 'ALB',
          order: 30,
          icon: SplitIcon,
          href: getPathWithParams(paths.project.detail.proxy.root, { projectId }),
          type: 'link',
          disabled: !isReady,
          onPrefetch: queryClient
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: httpProxyKeys.list(projectId),
                  queryFn: () => createHttpProxyService().list(projectId),
                });
              }
            : undefined,
        },
        ...plannedChildren(projectId, 'deliver'),
      ],
      { showSeparatorAbove: true }
    ),
    category('Build', 'build', [...plannedChildren(projectId, 'build')]),
    category('Connect', 'connect', [
      ...plannedChildren(projectId, 'connect').filter((child) => child.order < 20),
      {
        title: 'Connectors',
        order: 20,
        icon: PlugIcon,
        href: getPathWithParams(paths.project.detail.connectors.root, { projectId }),
        type: 'link',
        disabled: !isReady,
        onPrefetch: queryClient
          ? () => {
              void queryClient.prefetchQuery({
                queryKey: connectorKeys.list(projectId),
                queryFn: () => createConnectorService().list(projectId),
              });
            }
          : undefined,
      },
      ...plannedChildren(projectId, 'connect').filter((child) => child.order > 20),
    ]),
    category('Observe', 'observe', [
      {
        title: 'Activity',
        order: 10,
        icon: ActivityIcon,
        href: getPathWithParams(paths.project.detail.activity, { projectId }),
        type: 'link',
        disabled: !isReady,
      },
      {
        title: 'Usage',
        order: 15,
        icon: GaugeIcon,
        href: getPathWithParams(paths.project.detail.usage, { projectId }),
        type: 'link',
        disabled: !isReady,
        onPrefetch:
          queryClient && orgId
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: usageKeys.dashboard(orgId, projectId, 'current'),
                  queryFn: () =>
                    fetchOrgUsageDashboard({
                      orgId,
                      project: projectId,
                      cycle: 'current',
                    }),
                });
              }
            : undefined,
      },
      {
        title: 'Metrics Export',
        order: 20,
        icon: ChartSplineIcon,
        href: getPathWithParams(paths.project.detail.metrics.root, { projectId }),
        type: 'link',
        disabled: !isReady,
        onPrefetch: queryClient
          ? () => {
              void queryClient.prefetchQuery({
                queryKey: exportPolicyKeys.list(projectId),
                queryFn: () => createExportPolicyService().list(projectId),
              });
            }
          : undefined,
      },
      ...plannedChildren(projectId, 'observe'),
    ]),
    category(
      'Project Settings',
      'settings',
      [
        {
          title: 'General',
          order: 10,
          href: settingsGeneral,
          type: 'link',
          disabled: !isReady,
          tabChildLinks: [settingsGeneral, settingsNotifications, settingsBilling],
        },
        {
          title: 'Quotas',
          order: 15,
          href: settingsQuotas,
          type: 'link',
          disabled: !isReady,
        },
        {
          title: 'Service Accounts',
          order: 20,
          href: getPathWithParams(paths.project.detail.serviceAccounts.root, { projectId }),
          type: 'link',
          disabled: !isReady,
          onPrefetch: queryClient
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: serviceAccountKeys.list(projectId),
                  queryFn: () => createServiceAccountService().list(projectId),
                });
              }
            : undefined,
        },
        {
          title: 'Secrets',
          order: 30,
          href: getPathWithParams(paths.project.detail.secrets.root, { projectId }),
          type: 'link',
          disabled: !isReady,
          onPrefetch: queryClient
            ? () => {
                void queryClient.prefetchQuery({
                  queryKey: secretKeys.list(projectId),
                  queryFn: () => createSecretService().list(projectId),
                });
              }
            : undefined,
        },
      ],
      { showSeparatorAbove: true, type: 'collapsible', icon: SettingsIcon }
    ),
  ];
}
