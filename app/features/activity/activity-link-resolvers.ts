import type { ResourceLinkResolver } from '@datum-cloud/activity-ui';

interface ResourceRouteConfig {
  pathSegment: string;
  defaultTab?: string;
}

/**
 * Maps Kubernetes resource kinds to cloud-portal route segments. Used by
 * activity-ui to render activity items as clickable links to the resource's
 * detail page. Kinds without an entry render as plain text.
 *
 * Keys must be valid `ActivityResourceKind` values (see ./kinds.ts).
 *
 * Sub-resources (DNSRecordSet, ServiceAccountKey) link back to their parent's
 * relevant tab — they don't have their own detail pages in the portal.
 */
const RESOURCE_ROUTES: Record<string, ResourceRouteConfig> = {
  // Project-scoped resources with full detail pages
  DNSZone: { pathSegment: 'dns-zones', defaultTab: '/dns-records' },
  Domain: { pathSegment: 'domains', defaultTab: '/overview' },
  HTTPProxy: { pathSegment: 'edge' },
  ExportPolicy: { pathSegment: 'export-policies', defaultTab: '/overview' },
  Secret: { pathSegment: 'secrets', defaultTab: '/overview' },
  ServiceAccount: { pathSegment: 'service-accounts', defaultTab: '/overview' },

  // Sub-resources — link to parent's relevant tab
  // DNSRecordSet has no detail page; link to the parent zone's records list.
  // The activity record carries the parent zone's name in its ResourceRef
  // chain, but our resolver receives only the leaf resource. We fall back
  // to the dns-zones index page; users can find the specific record from there.
  DNSRecordSet: { pathSegment: 'dns-zones' },

  // ServiceAccountKey — link to parent service-account's keys tab
  // (Same caveat — fallback navigation, not direct deep-link)
  ServiceAccountKey: { pathSegment: 'service-accounts', defaultTab: '/keys' },
};

/**
 * Resolve activity resource references to cloud-portal routes.
 *
 * Returns undefined for unsupported resource kinds.
 * Captures projectId via closure — cloud-portal users are always
 * within a single project context for project-scoped pages.
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
