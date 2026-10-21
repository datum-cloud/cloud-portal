import { isHealthy, newestFirst } from './home.helpers';
import {
  ResourceColumn,
  ResourceColumnAddAction,
  ResourceColumnEmpty,
  ResourceColumnEmptyAction,
} from './resource-column';
import { useCreatedToasts } from './use-created-toasts';
import { AddDomainsDialog } from '@/features/edge/domain/add';
import { DomainStatus } from '@/features/edge/domain/status';
import { useResourcePermissions } from '@/modules/rbac';
import { useDomains } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Globe } from 'lucide-react';
import { useState } from 'react';

export function DomainsColumn({ projectId }: { projectId: string }) {
  const { data: domains = [], isLoading } = useDomains(projectId, {
    staleTime: QUERY_STALE_TIME,
  });
  const { canCreate } = useResourcePermissions({
    resource: 'domains',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  const listHref = getPathWithParams(paths.project.detail.domains.root, { projectId });
  // Add in place and stay on the home page; the toast links to the new domain.
  const [addOpen, setAddOpen] = useState(false);
  const created = useCreatedToasts(projectId);
  const openAdd = () => setAddOpen(true);

  return (
    <>
      <ResourceColumn
        title="Domains"
        href={listHref}
        count={domains.length}
        action={
          canCreate &&
          domains.length > 0 && <ResourceColumnAddAction onClick={openAdd} label="Add domain" />
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
          icon: (
            <Icon icon={Globe} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
          ),
          // Verified is the normal state, so only a problem gets a badge.
          meta: !isHealthy(domain.status) && <DomainStatus domainStatus={domain.status} />,
        }))}
        emptyState={
          <ResourceColumnEmpty
            action={
              canCreate && (
                <ResourceColumnEmptyAction onClick={openAdd}>Add domain</ResourceColumnEmptyAction>
              )
            }>
            No domains yet
          </ResourceColumnEmpty>
        }
      />
      <AddDomainsDialog
        projectId={projectId}
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={created.domainCreated}
      />
    </>
  );
}
