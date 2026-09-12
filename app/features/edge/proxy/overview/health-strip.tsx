import { summarizeBackends } from './backend-summary';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
} from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CircleCheckIcon,
  LockIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldOffIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';

interface HttpProxyHealthStripProps {
  proxy: HttpProxy;
  /** Whether the viewer can read the TrafficProtectionPolicy at all. */
  canViewWaf: boolean;
  wafPending: boolean;
  wafUnavailable: boolean;
}

type Tone = 'success' | 'warning' | 'danger' | 'muted';

function Chip({
  tone,
  icon,
  children,
  tooltip,
}: {
  tone: Tone;
  icon: typeof ServerIcon;
  children: ReactNode;
  tooltip?: string;
}) {
  const badge = (
    <Badge
      type={tone}
      // Muted/light is near-invisible in light mode; solid muted stays legible.
      theme={tone === 'muted' ? 'solid' : 'light'}
      className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap">
      <Icon icon={icon} size={12} className="shrink-0" />
      {children}
    </Badge>
  );
  return tooltip ? <Tooltip message={tooltip}>{badge}</Tooltip> : badge;
}

/**
 * Full-width status summary for the ALB overview. Everything here is derived
 * from resource status the portal already has; there is no per-target health
 * or incident feed on HTTPProxy yet, so those are deliberately absent.
 */
export function HttpProxyHealthStrip({
  proxy,
  canViewWaf,
  wafPending,
  wafUnavailable,
}: HttpProxyHealthStripProps) {
  const status = useMemo(() => transformControlPlaneStatus(proxy.status), [proxy.status]);
  const certDisplay = useMemo(
    () => getCertificatesReadyDisplay(getCertificatesReadyCondition(proxy.status)),
    [proxy.status]
  );

  const backends = summarizeBackends(proxy);
  const hostnameCount = proxy.hostnames?.length ?? 0;
  const wafMode = proxy.trafficProtectionMode;

  const headline = (() => {
    switch (status.status) {
      case ControlPlaneStatus.Success:
        return {
          icon: <Icon icon={CircleCheckIcon} size={18} className="text-(--color-badge-success)" />,
          title: 'Serving traffic normally',
          detail: [
            backends.count == null
              ? null
              : `${backends.count} ${backends.count === 1 ? 'backend' : 'backends'}`,
            `${hostnameCount} custom ${hostnameCount === 1 ? 'hostname' : 'hostnames'}`,
          ]
            .filter(Boolean)
            .join(' · '),
          ring: 'bg-(--color-badge-success)/10',
        };
      case ControlPlaneStatus.Error:
        return {
          icon: <Icon icon={TriangleAlertIcon} size={18} className="text-(--color-badge-danger)" />,
          title: 'Configuration failed to program',
          detail: status.message || 'Check the Configuration tab for details.',
          ring: 'bg-(--color-badge-danger)/10',
        };
      default:
        return {
          icon: <SpinnerIcon size="sm" aria-hidden="true" />,
          title: 'Programming edge configuration',
          detail: status.message || 'Hostnames, DNS, and certificates are being provisioned.',
          ring: 'bg-(--color-badge-info)/10',
        };
    }
  })();

  const wafChip = (() => {
    if (!canViewWaf) return null;
    if (wafPending) {
      return (
        <Chip tone="muted" icon={ShieldIcon}>
          <SpinnerIcon size="xs" aria-hidden="true" />
          WAF
        </Chip>
      );
    }
    if (wafUnavailable) {
      return (
        <Chip tone="muted" icon={ShieldIcon} tooltip="WAF status could not be loaded">
          WAF unknown
        </Chip>
      );
    }
    if (wafMode === 'Enforce') {
      return (
        <Chip
          tone="success"
          icon={ShieldCheckIcon}
          tooltip="Requests matching OWASP rules are blocked">
          WAF enforced
        </Chip>
      );
    }
    if (wafMode === 'Observe') {
      return (
        <Chip tone="warning" icon={ShieldIcon} tooltip="Matches are logged but not blocked">
          WAF observe
        </Chip>
      );
    }
    return (
      <Chip tone="muted" icon={ShieldOffIcon} tooltip="No traffic protection policy">
        WAF off
      </Chip>
    );
  })();

  const tlsChip = (() => {
    if (certDisplay === 'ready') {
      return (
        <Chip tone="success" icon={LockIcon} tooltip="All hostnames have issued certificates">
          TLS ready
        </Chip>
      );
    }
    if (certDisplay === 'failed') {
      return (
        <Chip tone="danger" icon={LockIcon} tooltip="At least one certificate failed to issue">
          TLS failed
        </Chip>
      );
    }
    if (certDisplay === 'pending') {
      return (
        <Chip tone="warning" icon={LockIcon} tooltip="Certificates are still being issued">
          <SpinnerIcon size="xs" aria-hidden="true" />
          TLS issuing
        </Chip>
      );
    }
    return null;
  })();

  return (
    <Card size="sm" data-e2e="alb-health-strip">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              headline.ring
            )}>
            {headline.icon}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold">{headline.title}</span>
            <span className="text-muted-foreground truncate text-xs">{headline.detail}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {backends.count != null ? (
            <Chip tone="muted" icon={ServerIcon}>
              {backends.count} {backends.count === 1 ? 'backend' : 'backends'}
            </Chip>
          ) : null}
          {wafChip}
          {tlsChip}
        </div>
      </CardContent>
    </Card>
  );
}
