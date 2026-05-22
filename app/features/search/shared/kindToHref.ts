import type { SearchHit } from '@/resources/search';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';

/**
 * Maps a search hit to its detail-page URL.
 * Returns null when the kind has no navigable detail page — the search
 * result is then filtered out of the UI by SearchResultItem.
 *
 * The hit's tenant.name encodes the parent context:
 * - Organization → tenant is unused (org is the hit itself)
 * - Project → tenant is the org (but project detail route is standalone)
 * - Group → tenant is the org
 * - Domain / DNSZone → tenant is the project
 */
export function kindToHref(hit: SearchHit): string | null {
  switch (hit.kind) {
    case 'Organization':
      return getPathWithParams(paths.org.detail.root, { orgId: hit.name });

    case 'Project':
      return getPathWithParams(paths.project.detail.root, { projectId: hit.name });

    case 'Group':
      return getPathWithParams(paths.org.detail.team.groupDetail, {
        orgId: hit.tenant.name,
        groupId: hit.name,
      });

    case 'Domain':
      return getPathWithParams(paths.project.detail.domains.detail.root, {
        projectId: hit.tenant.name,
        domainId: hit.name,
      });

    case 'DNSZone':
      return getPathWithParams(paths.project.detail.dnsZones.detail.root, {
        projectId: hit.tenant.name,
        dnsZoneId: hit.name,
      });

    case 'HTTPProxy':
      return getPathWithParams(paths.project.detail.proxy.detail.root, {
        projectId: hit.tenant.name,
        proxyId: hit.name,
      });

    case 'ExportPolicy':
      return getPathWithParams(paths.project.detail.metrics.detail.root, {
        projectId: hit.tenant.name,
        exportPolicyId: hit.name,
      });

    default:
      return null;
  }
}
