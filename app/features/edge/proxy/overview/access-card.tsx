import { FieldLabel } from '@/components/card/field-label';
import { EditPencil, UnavailableBadge } from '@/components/card/inline-controls';
import {
  ProxyBasicAuthDialog,
  type ProxyBasicAuthDialogRef,
} from '@/features/edge/proxy/proxy-basic-auth-dialog';
import { PermissionGate } from '@/modules/rbac';
import { type HttpProxy } from '@/resources/http-proxies';
import { Badge } from '@datum-cloud/datum-ui/badge';
import {
  Card,
  CardContent,
  CardField,
  CardFieldValue,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { KeyRoundIcon } from 'lucide-react';
import { useRef } from 'react';

/**
 * Who may reach the ALB. Basic Authentication is an Envoy SecurityPolicy
 * plus an htpasswd Secret, edited through its own dialog.
 */
export const HttpProxyAccessCard = ({
  proxy,
  projectId,
}: {
  proxy: HttpProxy;
  projectId?: string;
}) => {
  const basicAuthDialogRef = useRef<ProxyBasicAuthDialogRef>(null);

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-access-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={KeyRoundIcon} size={16} className="text-secondary" />
          Access Control
        </CardTitle>
      </CardHeader>
      <CardContent padding="none">
        <CardField>
          <FieldLabel hint="Require a username and password (HTTP Basic Authentication) before requests reach the origin.">
            Basic Authentication
          </FieldLabel>
          <CardFieldValue>
            {proxy.basicAuthForbidden ? (
              <UnavailableBadge reason="You don't have permission to view Basic Authentication" />
            ) : proxy.basicAuthEnabled === undefined ? (
              <Skeleton className="h-5 w-24 rounded-md" />
            ) : (
              <div className="flex items-center gap-1.5">
                <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                  {proxy.basicAuthEnabled
                    ? proxy.basicAuthUserCount
                      ? `${proxy.basicAuthUserCount} user${proxy.basicAuthUserCount !== 1 ? 's' : ''}`
                      : 'Enabled'
                    : 'Disabled'}
                </Badge>
                {projectId && (
                  <PermissionGate
                    resource="httpproxies"
                    verb="patch"
                    group="networking.datumapis.com"
                    scope="project"
                    mode="disable"
                    deniedReason="You don't have permission to edit this Application Load Balancer">
                    <EditPencil
                      label="Edit Basic Authentication"
                      onClick={() => basicAuthDialogRef.current?.show(proxy)}
                    />
                  </PermissionGate>
                )}
              </div>
            )}
          </CardFieldValue>
        </CardField>
      </CardContent>
      {projectId && <ProxyBasicAuthDialog ref={basicAuthDialogRef} projectId={projectId} />}
    </Card>
  );
};
