import { isEligibleForProtect } from './utils';
import { QuotaGuard } from '@/modules/quota';
import { PermissionButton } from '@/modules/rbac';
import { IFlattenedDnsRecord } from '@/resources/dns-records';
import { Button } from '@datum-cloud/datum-ui/button';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { EyeIcon, ShieldCheckIcon, ShieldOffIcon } from 'lucide-react';
import { useState } from 'react';

export interface RemoveAlbCallbacks {
  /** Called when the user confirms in the dialog (before the mutation runs). Used to disable the button only after confirm. */
  onMutationStart?: () => void;
}

export interface DnsRecordAlbCellProps {
  record: IFlattenedDnsRecord;
  zoneDomain: string;

  onProtect: (record: IFlattenedDnsRecord) => Promise<void>;
  onRemove: (record: IFlattenedDnsRecord, callbacks?: RemoveAlbCallbacks) => Promise<void>;
  onViewProxy: (proxyId: string) => void;
}

/**
 * Renders the ALB column cell: Protect / Remove / View button or "DNS only".
 * Buttons are disabled (no loading spinner) while the action is in progress to avoid layout shift.
 */
export function DnsRecordAlbCell({
  record,
  zoneDomain: _zoneDomain,
  onProtect,
  onRemove,
  onViewProxy,
}: DnsRecordAlbCellProps) {
  const [isProtecting, setIsProtecting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  const showProtect =
    isEligibleForProtect(record.type) &&
    record.status?.isProgrammed &&
    record.managedByGateway !== true &&
    record.hasProxyForThisRecord !== true;
  const showRemove =
    isEligibleForProtect(record.type) &&
    record.status?.isProgrammed &&
    record.managedByGateway !== true &&
    record.hasProxyForThisRecord === true &&
    record.linkedProxyId;
  const showView = record.managedByGateway === true && record.gatewaySourceName;

  const handleProtect = () => {
    setIsProtecting(true);
    onProtect(record).finally(() => setIsProtecting(false));
  };

  const handleRemove = () => {
    onRemove(record, {
      onMutationStart: () => setIsRemoving(true),
    }).finally(() => setIsRemoving(false));
  };

  if (showProtect) {
    const isIpOrigin = record.type === 'A' || record.type === 'AAAA';
    // Cross-resource action: protecting creates an HTTPProxy, so gate by the
    // CREATED type (httpproxies), not the DNS record the button lives on.
    const protectButton = (
      <QuotaGuard resource="httpproxies" group="networking.datumapis.com" scope="project">
        <PermissionButton
          resource="httpproxies"
          verb="create"
          group="networking.datumapis.com"
          scope="project"
          type="secondary"
          theme="outline"
          size="xs"
          className="shrink-0"
          disabled={isProtecting}
          onClick={handleProtect}
          icon={<Icon icon={ShieldCheckIcon} className="text-primary size-3.5 shrink-0" />}
          iconPosition="left"
          deniedReason="You don't have permission to create an Application Load Balancer">
          Protect with ALB
        </PermissionButton>
      </QuotaGuard>
    );
    if (isIpOrigin) {
      return (
        <Tooltip
          message="IP origins use HTTP to your origin (HTTPS to origin not supported for A/AAAA records)."
          side="top">
          {protectButton}
        </Tooltip>
      );
    }
    return protectButton;
  }

  if (showRemove) {
    return (
      <PermissionButton
        resource="httpproxies"
        verb="patch"
        group="networking.datumapis.com"
        scope="project"
        type="secondary"
        theme="outline"
        size="xs"
        className="shrink-0"
        disabled={isRemoving}
        onClick={handleRemove}
        icon={<Icon icon={ShieldOffIcon} className="size-3.5 shrink-0" />}
        iconPosition="left"
        deniedReason="You don't have permission to edit Application Load Balancer">
        Remove ALB
      </PermissionButton>
    );
  }

  if (showView) {
    return (
      <Button
        type="secondary"
        theme="outline"
        size="xs"
        className="shrink-0"
        onClick={() => onViewProxy(record.gatewaySourceName!)}
        icon={<Icon icon={EyeIcon} className="size-3.5 shrink-0" />}
        iconPosition="left">
        View ALB
      </Button>
    );
  }

  return <span className="text-muted-foreground text-xs">DNS only</span>;
}
