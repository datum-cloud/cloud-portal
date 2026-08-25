/**
 * Build the project sidebar as collapsible service categories (Deliver / Build /
 * Connect / Observe / Project Settings) for enhancement #849.
 *
 * Category parents keep icons; nested children are text-only (plus optional
 * Coming Soon badges) so the expanded rail stays scannable.
 */
import { plannedServicesForSection } from './planned-services';
import { COMING_SOON_BADGE, type ProjectNavSection } from './types';
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
  BoxesIcon,
  ChartSplineIcon,
  GlobeIcon,
  HomeIcon,
  NetworkIcon,
  SettingsIcon,
} from 'lucide-react';

export type BuildProjectNavOptions = {
  /** When false, non-Home links are disabled (project control-plane not Ready). */
  isReady?: boolean;
  /** Optional React Query client for sidebar prefetch. */
  queryClient?: QueryClient;
};

/** Section id on category parents for plugin merge. Not rendered by datum-ui. */
export type SectionNavItem = NavItem & {
  sectionId?: ProjectNavSection;
};

type OrderedChild = NavItem & { order: number };

function plannedChildren(section: ProjectNavSection): OrderedChild[] {
  return plannedServicesForSection(section).map((service) => ({
    title: service.title,
    href: service.roadmapUrl,
    type: 'externalLink' as const,
    muted: true,
    badge: COMING_SOON_BADGE,
    order: service.order,
  }));
}

/** Sort by `order` but keep the field so plugin merge can insert relatively. */
function sortChildren(children: OrderedChild[]): OrderedChild[] {
  return [...children].sort((a, b) => a.order - b.order);
}

function category(
  title: string,
  sectionId: ProjectNavSection,
  icon: NavItem['icon'],
  children: OrderedChild[],
  extras?: Partial<NavItem>
): SectionNavItem {
  return {
    title,
    href: null,
    type: 'collapsible',
    icon,
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
  { isReady = true, queryClient }: BuildProjectNavOptions = {}
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
      GlobeIcon,
      [
        {
          title: 'Domains',
          order: 10,
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
        ...plannedChildren('deliver'),
      ],
      { showSeparatorAbove: true }
    ),
    category('Build', 'build', BoxesIcon, [...plannedChildren('build')]),
    category('Connect', 'connect', NetworkIcon, [
      ...plannedChildren('connect').filter((child) => child.order < 20),
      {
        title: 'Connectors',
        order: 20,
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
      ...plannedChildren('connect').filter((child) => child.order > 20),
    ]),
    category('Observe', 'observe', ChartSplineIcon, [
      {
        title: 'Activity',
        order: 10,
        href: getPathWithParams(paths.project.detail.activity, { projectId }),
        type: 'link',
        disabled: !isReady,
      },
      {
        title: 'Metrics Export',
        order: 20,
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
      ...plannedChildren('observe'),
    ]),
    category(
      'Project Settings',
      'settings',
      SettingsIcon,
      [
        {
          title: 'General',
          order: 10,
          href: settingsGeneral,
          type: 'link',
          disabled: !isReady,
          tabChildLinks: [settingsGeneral, settingsNotifications, settingsQuotas, settingsBilling],
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
      { showSeparatorAbove: true }
    ),
  ];
}
