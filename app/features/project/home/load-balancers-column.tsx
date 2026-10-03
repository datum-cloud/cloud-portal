import { isHealthy, newestFirst } from './home.helpers';
import {
  ResourceColumn,
  ResourceColumnAddAction,
  ResourceColumnEmpty,
  ResourceColumnEmptyAction,
} from './resource-column';
import { BadgeStatus } from '@/components/badge/badge-status';
import {
  HttpProxyFormDialog,
  type HttpProxyFormDialogRef,
} from '@/features/edge/proxy/proxy-form-dialog';
import { useResourcePermissions } from '@/modules/rbac';
import { useHttpProxies } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { QUERY_STALE_TIME } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { SplitIcon } from 'lucide-react';
import { useRef } from 'react';

/** The project's Application Load Balancers, newest first. */
export function LoadBalancersColumn({ projectId }: { projectId: string }) {
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
  // Create in place: the dialog navigates to the new ALB once it's created.
  const formRef = useRef<HttpProxyFormDialogRef>(null);
  const openCreate = () => formRef.current?.show();

  return (
    <>
      <ResourceColumn
        title="ALB"
        href={listHref}
        count={proxies.length}
        action={
          canCreate &&
          proxies.length > 0 && <ResourceColumnAddAction onClick={openCreate} label="Add ALB" />
        }
        isLoading={isLoading}
        testId="project-home-alb"
        items={newestFirst(proxies).map((proxy) => ({
          key: proxy.uid,
          label: proxy.chosenName || proxy.name,
          href: getPathWithParams(paths.project.detail.proxy.detail.root, {
            projectId,
            proxyId: proxy.name,
          }),
          icon: (
            <Icon
              icon={SplitIcon}
              size={14}
              className="text-icon-quaternary shrink-0"
              aria-hidden
            />
          ),
          // Active is the normal state, so only a problem gets a badge.
          meta: proxy.status && !isHealthy(proxy.status) && (
            <BadgeStatus status={transformControlPlaneStatus(proxy.status)} />
          ),
        }))}
        emptyState={
          <ResourceColumnEmpty
            icon={<Icon icon={SplitIcon} size={18} aria-hidden />}
            title="Deploy your first load balancer"
            action={
              canCreate && (
                <ResourceColumnEmptyAction onClick={openCreate}>Add ALB</ResourceColumnEmptyAction>
              )
            }>
            Run a proxy at Datum&apos;s edge that routes traffic to your services.
          </ResourceColumnEmpty>
        }
      />
      <HttpProxyFormDialog ref={formRef} projectId={projectId} />
    </>
  );
}
