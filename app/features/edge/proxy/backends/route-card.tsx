import { BackendsTable } from './backends-table';
import { addBackendBlockedReason, backendLabel, routePathLabel } from './target';
import { TrafficDistribution } from './traffic-distribution';
import { StatusChip } from '@/components/card';
import { useConfirmationDialog } from '@/components/confirmation-dialog/confirmation-dialog.provider';
import { PermissionButton } from '@/modules/rbac';
import type { ProxyBackend, ProxyRoute } from '@/resources/http-proxies';
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { MoreActions } from '@datum-cloud/datum-ui/more-actions';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { PlusIcon, RouteIcon } from 'lucide-react';

export const ProxyRouteCard = ({
  route,
  projectId,
  canEdit,
  /**
   * True when this is the only route and it matches everything — the ordinary
   * single-pool case, which should not be dressed up as routing.
   */
  soleRoute,
  canDeleteRoute,
  onAddBackend,
  onEditBackend,
  onRemoveBackend,
  onEditRoute,
  onDeleteRoute,
}: {
  route: ProxyRoute;
  projectId: string;
  canEdit: boolean;
  soleRoute: boolean;
  canDeleteRoute: boolean;
  onAddBackend: (route: ProxyRoute) => void;
  onEditBackend: (route: ProxyRoute, backend: ProxyBackend) => void;
  onRemoveBackend: (route: ProxyRoute, backend: ProxyBackend) => void;
  onEditRoute: (route: ProxyRoute) => void;
  onDeleteRoute: (route: ProxyRoute) => void;
}) => {
  const { confirm } = useConfirmationDialog();
  const addBlocked = addBackendBlockedReason(route);

  const confirmRemoveBackend = (backend: ProxyBackend) => {
    void confirm({
      title: 'Remove backend',
      description: `${backendLabel(backend)} will stop receiving traffic from this route.`,
      submitText: 'Remove',
      variant: 'destructive',
      onSubmit: async () => onRemoveBackend(route, backend),
    });
  };

  const confirmDeleteRoute = () => {
    void confirm({
      title: 'Delete route',
      description: `Requests matching ${routePathLabel(route)} will no longer be sent to this pool.`,
      submitText: 'Delete',
      variant: 'destructive',
      onSubmit: async () => onDeleteRoute(route),
    });
  };

  const addButton = (
    <PermissionButton
      resource="httpproxies"
      verb="patch"
      group="networking.datumapis.com"
      namespace="default"
      scope="project"
      projectId={projectId}
      deniedReason="You don't have permission to edit this Application Load Balancer"
      type="secondary"
      theme="outline"
      size="xs"
      disabled={!!addBlocked}
      onClick={() => onAddBackend(route)}
      data-e2e="alb-add-backend">
      <Icon icon={PlusIcon} size={12} />
      Add backend
    </PermissionButton>
  );

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-route-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {soleRoute ? (
            'Backends'
          ) : (
            <>
              <Icon icon={RouteIcon} size={16} className="text-secondary" />
              <span className="truncate font-mono">{routePathLabel(route)}</span>
              {route.pathType && route.pathType !== 'PathPrefix' ? (
                <StatusChip tone="muted">{route.pathType}</StatusChip>
              ) : null}
            </>
          )}
          <span className="text-muted-foreground shrink-0 font-normal">
            {route.backends.length} {route.backends.length === 1 ? 'backend' : 'backends'}
          </span>
          {route.readOnly ? (
            <StatusChip
              tone="muted"
              tooltip="This route uses matches or filters the portal cannot represent, so it is shown read-only to avoid a lossy write.">
              Read only
            </StatusChip>
          ) : null}
        </CardTitle>

        {canEdit && !route.readOnly ? (
          <CardAction className="flex items-center gap-1">
            {addBlocked ? <Tooltip message={addBlocked}>{addButton}</Tooltip> : addButton}
            {!soleRoute ? (
              <MoreActions
                actions={[
                  { key: 'edit', label: 'Edit path', onClick: () => onEditRoute(route) },
                  {
                    key: 'delete',
                    label: 'Delete route',
                    variant: 'destructive',
                    disabled: !canDeleteRoute,
                    // An ALB with no backend rule has nowhere to send traffic.
                    tooltip: canDeleteRoute
                      ? undefined
                      : 'A load balancer needs at least one route with backends.',
                    onClick: confirmDeleteRoute,
                  },
                ]}
                data-e2e="alb-route-actions"
              />
            ) : null}
          </CardAction>
        ) : null}
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <TrafficDistribution backends={route.backends} />
        <BackendsTable
          route={route}
          canEdit={canEdit && !route.readOnly}
          onEdit={(backend) => onEditBackend(route, backend)}
          onRemove={confirmRemoveBackend}
        />
      </CardContent>
    </Card>
  );
};
