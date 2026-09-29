import { topDomains } from './home.helpers';
import { ResourceColumn, ResourceColumnEmpty } from './resource-column';
import { DomainStatus } from '@/features/edge/domain/status';
import { useResourcePermissions } from '@/modules/rbac';
import { useDomains } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Globe, Plus } from 'lucide-react';
import { Link } from 'react-router';

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
  const createHref = getPathWithParams(
    paths.project.detail.domains.root,
    { projectId },
    new URLSearchParams({ action: 'create' })
  );

  const addLink = canCreate && (
    <Link
      to={createHref}
      className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 text-xs transition-colors">
      <Icon icon={Plus} size={12} aria-hidden />
      Add domain
    </Link>
  );

  return (
    <ResourceColumn
      title="Domains"
      href={listHref}
      isLoading={isLoading}
      testId="project-home-domains"
      items={topDomains(domains).map((domain) => ({
        key: domain.uid,
        label: domain.domainName,
        href: getPathWithParams(paths.project.detail.domains.detail.root, {
          projectId,
          domainId: domain.name,
        }),
        icon: <Icon icon={Globe} size={14} className="text-icon-quaternary shrink-0" aria-hidden />,
        meta: <DomainStatus domainStatus={domain.status} />,
      }))}
      emptyState={
        <ResourceColumnEmpty action={addLink}>No domains in this project yet.</ResourceColumnEmpty>
      }
      footer={domains.length > 0 && addLink}
    />
  );
}
