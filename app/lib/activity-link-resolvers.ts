import type { ResourceLinkResolver } from '@datum-cloud/activity-ui';

interface ResourceRouteConfig {
  pathSegment: string;
  defaultTab?: string;
}

const RESOURCE_ROUTES: Record<string, ResourceRouteConfig> = {
  DNSZone: { pathSegment: 'dns-zones', defaultTab: '/dns-records' },
  Domain: { pathSegment: 'domains', defaultTab: '/overview' },
  HTTPProxy: { pathSegment: 'edge' },
  ExportPolicy: { pathSegment: 'export-policies', defaultTab: '/overview' },
};

/**
 * Resolve activity resource references to cloud-portal routes.
 *
 * Returns undefined for unsupported resource kinds.
 * Captures projectId via closure — cloud-portal users are always
 * within a single project context.
 */
export function createResourceLinkResolver(projectId: string): ResourceLinkResolver {
  return (resource) => {
    const routeConfig = RESOURCE_ROUTES[resource.kind];
    if (!routeConfig) return undefined;

    const suffix = routeConfig.defaultTab ?? '';
    return `/project/${projectId}/${routeConfig.pathSegment}/${resource.name}${suffix}`;
  };
}

/**
 * Resolve org-scoped activity resource references to cloud-portal routes.
 *
 * Only `Project` maps to a linkable detail page. All other org-scoped kinds
 * (Organization, OrganizationMembership, UserInvitation, Group, Role) have no
 * individual detail pages in the portal and return undefined.
 *
 * The orgId parameter is accepted for forward-compatibility: when org-scoped
 * detail pages are added for members, groups, or roles, the resolver signature
 * will not change and existing call sites will not need updating.
 */
export function createOrgResourceLinkResolver(_orgId: string): ResourceLinkResolver {
  return (resource) => {
    if (resource.kind === 'Project') {
      return `/project/${resource.name}`;
    }
    return undefined;
  };
}
