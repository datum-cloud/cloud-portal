import { isHealthy, newestFirst } from './home.helpers';
import {
  ResourceColumn,
  ResourceColumnAddAction,
  ResourceColumnEmpty,
  ResourceColumnEmptyAction,
} from './resource-column';
import { BadgeStatus } from '@/components/badge/badge-status';
import { ProxySparkline } from '@/features/edge/proxy/metrics/proxy-sparkline';
import { useResourcePermissions } from '@/modules/rbac';
import { useHttpProxies } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Split } from 'lucide-react';

export function AlbsColumn({ projectId }: { projectId: string }) {
  const { data: proxies = [], isLoading } = useHttpProxies(projectId, {
    staleTime: QUERY_STALE_TIME,
    refetchOnMount: false,
  });
  const { canCreate } = useResourcePermissions({
    resource: 'httpproxies',
    group: 'networking.datumapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  const listHref = getPathWithParams(paths.project.detail.proxy.root, { projectId });
  const createHref = getPathWithParams(
    paths.project.detail.proxy.root,
    { projectId },
    new URLSearchParams({ action: 'create' })
  );

  return (
    <ResourceColumn
      title="Load balancers"
      href={listHref}
      count={proxies.length}
      action={
        canCreate &&
        proxies.length > 0 && (
          <ResourceColumnAddAction href={createHref} label="Add load balancer" />
        )
      }
      isLoading={isLoading}
      testId="project-home-albs"
      items={newestFirst(proxies).map((proxy) => {
        // Active is the normal state, so rows show traffic and only a problem gets a badge.
        const status =
          proxy.status && !isHealthy(proxy.status) && transformControlPlaneStatus(proxy.status);
        return {
          key: proxy.uid,
          label: proxy.chosenName || proxy.name,
          href: getPathWithParams(paths.project.detail.proxy.detail.root, {
            projectId,
            proxyId: proxy.name,
          }),
          icon: (
            <Icon icon={Split} size={14} className="text-icon-quaternary shrink-0" aria-hidden />
          ),
          meta: (
            <>
              {status && <BadgeStatus status={status} />}
              <ProxySparkline
                projectId={projectId}
                proxyId={proxy.name}
                className="w-20 min-w-0 shrink-0 px-0"
              />
            </>
          ),
        };
      })}
      emptyState={
        <ResourceColumnEmpty
          icon={<Icon icon={Split} size={18} aria-hidden />}
          title="Put an app on the edge"
          action={
            canCreate && (
              <ResourceColumnEmptyAction href={createHref}>
                Add load balancer
              </ResourceColumnEmptyAction>
            )
          }>
          An Application Load Balancer serves your origin from Datum&apos;s global network.
        </ResourceColumnEmpty>
      }
    />
  );
}
