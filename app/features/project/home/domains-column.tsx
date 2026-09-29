import { isHealthy, newestFirst } from './home.helpers';
import {
  ResourceColumn,
  ResourceColumnAddAction,
  ResourceColumnEmpty,
  ResourceColumnEmptyAction,
} from './resource-column';
import { DomainStatus } from '@/features/edge/domain/status';
import { useResourcePermissions } from '@/modules/rbac';
import { useDomains } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Globe } from 'lucide-react';

export function DomainsColumn({ projectId }: { projectId: string }) {
  const { data: domains = [], isLoading } = useDomains(projectId, {
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });
  const { canCreate } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  const listHref = getPathWithParams(paths.project.detail.domains.root, { projectId });
  const createHref = getPathWithParams(paths.project.detail.addDomain, { projectId });

  return (
    <ResourceColumn
      title="Domains"
      href={listHref}
      count={domains.length}
      action={
        canCreate &&
        domains.length > 0 && <ResourceColumnAddAction href={createHref} label="Add domain" />
      }
      isLoading={isLoading}
      testId="project-home-domains"
      items={newestFirst(domains).map((domain) => ({
        key: domain.uid,
        label: domain.domainName,
        href: getPathWithParams(paths.project.detail.domains.detail.root, {
          projectId,
          domainId: domain.name,
        }),
        icon: <Icon icon={Globe} size={14} className="text-icon-quaternary shrink-0" aria-hidden />,
        // Verified is the normal state, so only a problem gets a badge.
        meta: !isHealthy(domain.status) && <DomainStatus domainStatus={domain.status} />,
      }))}
      emptyState={
        <ResourceColumnEmpty
          icon={<Icon icon={Globe} size={18} aria-hidden />}
          title="Add your first domain"
          action={
            canCreate && (
              <ResourceColumnEmptyAction href={createHref}>Add domain</ResourceColumnEmptyAction>
            )
          }>
          Verify a domain you own to route traffic and issue certificates for it.
        </ResourceColumnEmpty>
      }
    />
  );
}
